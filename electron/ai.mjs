import fs from 'node:fs';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';

const CODEX_VERSION='0.146.0';
const DEFAULT_PROVIDER='codex';
const DEFAULT_MODELS={codex:'gpt-5.4-mini',anthropic:'claude-sonnet-4-6'};
const DEFAULT_REASONING='auto';
const DEFAULT_CONTEXT_SCOPE='all';
const PROVIDERS=new Set(['codex','anthropic']);
const ALLOWED_REASONING=new Set(['auto','low','medium','high','xhigh','max']);
const ALLOWED_SCOPE=new Set(['all','current-month']);
const codexFallback={id:DEFAULT_MODELS.codex,model:DEFAULT_MODELS.codex,displayName:'GPT-5.4 Mini',description:'Fast OpenAI model for everyday finance questions.',supportedReasoningEfforts:['low','medium','high'],defaultReasoningEffort:'low'};
const anthropicFallback={id:DEFAULT_MODELS.anthropic,model:DEFAULT_MODELS.anthropic,displayName:'Claude Sonnet',description:'Anthropic model loaded through the Claude API.',supportedReasoningEfforts:['low','medium','high'],defaultReasoningEffort:'low'};
const IMAGE_MIMES=new Set(['image/png','image/jpeg','image/webp','image/gif']);
const TEXT_EXTENSIONS=new Set(['.txt','.md','.csv','.json','.tsv','.log','.xml']);
const MAX_ATTACHMENT_BYTES=20*1024*1024;
const MAX_ATTACHMENTS=8;

const friendlyModelName=id=>id.split('-').map(part=>/^\d+$/.test(part)?part:part.charAt(0).toUpperCase()+part.slice(1)).join(' ');
const credentialFallback={get:()=>null,set:()=>{throw new Error('Secure credential storage is unavailable on this computer.')},delete:()=>{}};

async function pdfText(bytes){
  const document=await getDocument({data:new Uint8Array(bytes),disableFontFace:true,useSystemFonts:true}).promise;
  const pages=[];
  for(let pageNumber=1;pageNumber<=document.numPages;pageNumber++){
    const page=await document.getPage(pageNumber),content=await page.getTextContent();
    pages.push(content.items.map(item=>item.str||'').join(' '));
  }
  await document.destroy();
  return pages.join('\n\n');
}

async function prepareAttachments(attachments=[]){
  if(!Array.isArray(attachments)||attachments.length>MAX_ATTACHMENTS)throw new Error(`Attach no more than ${MAX_ATTACHMENTS} files at a time.`);
  const images=[],documents=[];
  for(const input of attachments){
    const filePath=path.resolve(String(input?.path||'')),name=path.basename(filePath),stat=fs.statSync(filePath);
    if(!stat.isFile())throw new Error(`${name} is not a file.`);
    if(stat.size>MAX_ATTACHMENT_BYTES)throw new Error(`${name} is larger than 20 MB.`);
    const mime=String(input?.mime||'application/octet-stream').toLowerCase(),extension=path.extname(name).toLowerCase();
    if(IMAGE_MIMES.has(mime)){images.push({name,path:filePath,mime,bytes:fs.readFileSync(filePath)});continue}
    let text;
    if(extension==='.pdf')text=await pdfText(fs.readFileSync(filePath));
    else if(TEXT_EXTENSIONS.has(extension))text=fs.readFileSync(filePath,'utf8');
    else throw new Error(`${name}: supported chat files are images, PDF, text, Markdown, CSV, JSON, TSV, XML, and log files.`);
    documents.push({name,text:text.slice(0,120000)});
  }
  return {images,documents};
}

export class AiManager {
  constructor(dataDir,options={}){
    this.dataDir=dataDir;
    this.settingsPath=path.join(dataDir,'ai-settings.json');
    this.settings=this.readSettings();
    this.openExternal=options.openExternal||(()=>Promise.resolve());
    this.credentials=options.credentials||credentialFallback;
    this.child=null;
    this.buffer='';
    this.nextId=1;
    this.pending=new Map();
    this.account=null;
    this.models={codex:[codexFallback],anthropic:[anthropicFallback]};
    this.threadId=null;
    this.loginWaiters=new Map();
    this.listeners=new Set();
    try{this.anthropicKey=process.env.ANTHROPIC_API_KEY||this.credentials.get('anthropic')||null}catch{this.anthropicKey=process.env.ANTHROPIC_API_KEY||null}
  }

  readSettings(){
    try{
      const value=JSON.parse(fs.readFileSync(this.settingsPath,'utf8'));
      const providerId=PROVIDERS.has(value.providerId)?value.providerId:DEFAULT_PROVIDER;
      const modelIds={...DEFAULT_MODELS,...value.modelIds};
      if(value.modelId&&!value.modelIds)modelIds.codex=value.modelId;
      return {providerId,modelIds,reasoningEffort:ALLOWED_REASONING.has(value.reasoningEffort)?value.reasoningEffort:DEFAULT_REASONING,contextScope:ALLOWED_SCOPE.has(value.contextScope)?value.contextScope:DEFAULT_CONTEXT_SCOPE};
    }catch{return {providerId:DEFAULT_PROVIDER,modelIds:{...DEFAULT_MODELS},reasoningEffort:DEFAULT_REASONING,contextScope:DEFAULT_CONTEXT_SCOPE}}
  }

  saveSettings(){
    fs.mkdirSync(this.dataDir,{recursive:true});
    const temp=`${this.settingsPath}.tmp-${process.pid}`;
    fs.writeFileSync(temp,JSON.stringify(this.settings,null,2)+'\n',{mode:0o600});
    fs.renameSync(temp,this.settingsPath);
  }

  normalizedModels(providerId){
    const selectedId=this.settings.modelIds[providerId];
    return (this.models[providerId]||[]).map(model=>{
      const id=model.model||model.id;
      const efforts=(model.supportedReasoningEfforts||['low','medium','high']).map(item=>typeof item==='string'?item:item.reasoningEffort).filter(Boolean);
      return {id,name:model.displayName||model.name||friendlyModelName(id),variant:id,tag:id===selectedId?'Selected':'Available',description:model.description||`${providerId==='codex'?'OpenAI':'Anthropic'} model available through your connected account.`,source:providerId==='codex'?'OpenAI Codex':'Anthropic API',license:providerId==='codex'?'ChatGPT account':'Anthropic account',supportedReasoningEfforts:efforts.length?efforts:['low','medium','high'],defaultReasoningEffort:model.defaultReasoningEffort||'medium'};
    });
  }

  state(){
    const providerId=this.settings.providerId;
    const models=this.normalizedModels(providerId);
    const selected=models.find(model=>model.id===this.settings.modelIds[providerId])||models[0]||null;
    const authenticated=providerId==='codex'?Boolean(this.account):Boolean(this.anthropicKey);
    return {
      providerId,
      provider:providerId==='codex'?'ChatGPT / Codex':'Anthropic',
      providers:[
        {id:'codex',name:'ChatGPT / Codex',description:'Official ChatGPT browser login through the Codex app server.',authType:'oauth',connected:Boolean(this.account)},
        {id:'anthropic',name:'Anthropic',description:'Claude API access using a key stored with Windows encryption.',authType:'api-key',connected:Boolean(this.anthropicKey)}
      ],
      version:providerId==='codex'?CODEX_VERSION:null,
      authenticated,
      account:providerId==='codex'?this.account:null,
      ready:authenticated,
      models,
      model:selected,
      selectedModelId:selected?.id||this.settings.modelIds[providerId],
      reasoningEffort:this.settings.reasoningEffort,
      contextScope:this.settings.contextScope
    };
  }

  async initialize(){
    if(this.settings.providerId==='codex')await this.ensureCodexServer();
    else if(this.anthropicKey)await this.refreshAnthropicModels(this.anthropicKey);
    return this.state();
  }

  async ensureCodexServer(){
    if(this.child)return;
    const root=path.dirname(fileURLToPath(import.meta.url));
    const relative=process.platform==='win32'?path.join('node_modules','@openai','codex-win32-x64','vendor','x86_64-pc-windows-msvc','bin','codex.exe'):null;
    if(!relative)throw new Error('ChatGPT/Codex login is currently supported in the Windows build only.');
    const command=path.join(root,'..',relative).replace('app.asar','app.asar.unpacked');
    this.child=spawn(command,['app-server','--stdio'],{stdio:['pipe','pipe','pipe'],windowsHide:true});
    this.child.stdout.on('data',data=>this.receive(data));
    this.child.stderr.on('data',()=>{});
    this.child.on('error',error=>this.failAll(error));
    this.child.on('exit',()=>{this.child=null;this.threadId=null;this.failAll(new Error('Codex app server stopped.'))});
    await this.request('initialize',{clientInfo:{name:'jerri_finance',title:'Jerri Finance',version:'1.3.0'},capabilities:{experimentalApi:true}});
    this.notify('initialized');
    const result=await this.request('account/read',{refreshToken:false});
    this.account=result.account||null;
    try{
      const listed=await this.request('model/list',{});
      if(Array.isArray(listed.data)&&listed.data.length)this.models.codex=listed.data.filter(model=>!model.hidden);
    }catch{}
    if(!this.models.codex.length)this.models.codex=[codexFallback];
    this.ensureSelectedModel('codex');
  }

  receive(data){
    this.buffer+=data.toString();
    let index;
    while((index=this.buffer.indexOf('\n'))>=0){
      const line=this.buffer.slice(0,index).trim();
      this.buffer=this.buffer.slice(index+1);
      if(!line)continue;
      try{this.handle(JSON.parse(line))}catch{}
    }
  }

  handle(message){
    for(const listener of this.listeners)listener(message);
    if(message.id!==undefined&&this.pending.has(String(message.id))){
      const waiter=this.pending.get(String(message.id));
      this.pending.delete(String(message.id));
      message.error?waiter.reject(new Error(message.error.message||'Codex request failed.')):waiter.resolve(message.result);
      return;
    }
    if(message.method==='account/login/completed'){
      const waiter=this.loginWaiters.get(message.params?.loginId);
      if(waiter){
        this.loginWaiters.delete(message.params.loginId);
        message.params.success?waiter.resolve():waiter.reject(new Error(message.params.error||'ChatGPT login failed.'));
      }
    }
  }

  request(method,params){return new Promise((resolve,reject)=>{const id=String(this.nextId++);this.pending.set(id,{resolve,reject});this.child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n')})}
  notify(method,params=null){this.child?.stdin.write(JSON.stringify({jsonrpc:'2.0',method,params})+'\n')}
  failAll(error){for(const waiter of this.pending.values())waiter.reject(error);this.pending.clear();for(const waiter of this.loginWaiters.values())waiter.reject(error);this.loginWaiters.clear()}

  ensureSelectedModel(providerId){
    const list=this.models[providerId]||[];
    if(!list.some(model=>(model.model||model.id)===this.settings.modelIds[providerId])&&list.length)this.settings.modelIds[providerId]=list[0].model||list[0].id;
  }

  configure(input={}){
    if(PROVIDERS.has(input.providerId))this.settings.providerId=input.providerId;
    const providerId=this.settings.providerId;
    const selected=input.modelId||this.settings.modelIds[providerId];
    const model=(this.models[providerId]||[]).find(item=>(item.model||item.id)===selected);
    if(model)this.settings.modelIds[providerId]=selected;
    if(ALLOWED_REASONING.has(input.reasoningEffort))this.settings.reasoningEffort=input.reasoningEffort;
    if(ALLOWED_SCOPE.has(input.contextScope))this.settings.contextScope=input.contextScope;
    this.saveSettings();
    this.threadId=null;
    return this.state();
  }

  async setup(input={}){
    this.configure(input);
    if(this.settings.providerId==='codex'){
      await this.ensureCodexServer();
      if(!this.account){
        const started=await this.request('account/login/start',{type:'chatgpt'});
        if(started.authUrl)await this.openExternal(started.authUrl);
        await new Promise((resolve,reject)=>this.loginWaiters.set(started.loginId,{resolve,reject}));
        const result=await this.request('account/read',{refreshToken:false});
        this.account=result.account||null;
        if(!this.account)throw new Error('ChatGPT login completed but no account was returned.');
      }
    }else{
      const key=String(input.apiKey||this.anthropicKey||'').trim();
      if(!key)throw new Error('Enter an Anthropic API key before connecting.');
      await this.refreshAnthropicModels(key);
      this.credentials.set('anthropic',key);
      this.anthropicKey=key;
    }
    this.ensureSelectedModel(this.settings.providerId);
    this.saveSettings();
    return this.state();
  }

  async refreshAnthropicModels(key){
    const response=await fetch('https://api.anthropic.com/v1/models?limit=1000',{headers:{'x-api-key':key,'anthropic-version':'2023-06-01'}});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload?.error?.message||`Anthropic authentication failed (${response.status}).`);
    if(Array.isArray(payload.data)&&payload.data.length){
      this.models.anthropic=payload.data.filter(model=>String(model.id||'').startsWith('claude-')).map(model=>({id:model.id,model:model.id,displayName:model.display_name||friendlyModelName(model.id),description:'Claude model available through your Anthropic account.',supportedReasoningEfforts:['low','medium','high'],defaultReasoningEffort:'medium'}));
    }
    if(!this.models.anthropic.length)this.models.anthropic=[anthropicFallback];
    this.ensureSelectedModel('anthropic');
  }

  prompt(message,context,providerName){return `You are Ask Jerri, the finance assistant inside Jerri Finance.\n\nOPERATING GUIDE:\n- Use only the supplied deterministic ledger context.\n- Explain calculations and cite dates, categories, amounts, and review status from the context.\n- Never invent missing values. Say when information is unavailable.\n- Transfers are not income or expense; credit-card repayments are transfers. Interest and late fees remain expenses.\n- Never mutate data, call tools, or give tax, legal, or investment advice.\n- Format every answer as clean GitHub Flavored Markdown. Use short headings, lists, emphasis, and tables only when they improve clarity. Never wrap the whole answer in a code block.\n- The customer explicitly chose ${providerName}; the approved financial context below is sent to that provider for this answer.\n\nFINANCE KNOWLEDGE:\n${JSON.stringify(context)}\n\nUSER QUESTION:\n${message}`}

  async chat(message,context,attachmentRefs=[]){
    const attachments=await prepareAttachments(attachmentRefs);
    if(this.settings.providerId==='anthropic')return this.chatAnthropic(message,context,attachments);
    return this.chatCodex(message,context,attachments);
  }

  async chatCodex(message,context,attachments){
    await this.ensureCodexServer();
    if(!this.account)throw new Error('Connect your ChatGPT account before asking Jerri.');
    const selected=this.models.codex.find(model=>(model.model||model.id)===this.settings.modelIds.codex)||codexFallback;
    const modelId=selected.model||selected.id;
    const effort=this.settings.reasoningEffort==='auto'?(selected.defaultReasoningEffort||'medium'):this.settings.reasoningEffort;
    if(!this.threadId){const started=await this.request('thread/start',{model:modelId,ephemeral:true,approvalPolicy:'never',sandbox:'read-only'});this.threadId=started.thread.id}
    const documentContext=attachments.documents.map(file=>`\n\nATTACHED FILE: ${file.name}\n${file.text}`).join('');
    const input=[{type:'text',text:this.prompt(message+documentContext,context,'OpenAI'),text_elements:[]},...attachments.images.map(image=>({type:'localImage',path:image.path}))];
    const started=await this.request('turn/start',{threadId:this.threadId,input,model:modelId,effort,approvalPolicy:'never',sandbox:'read-only'});
    const turnId=started.turn.id;
    let text='';
    return await new Promise((resolve,reject)=>{
      const finish=(error,value)=>{this.listeners.delete(onData);error?reject(error):resolve(value)};
      const onData=event=>{
        const p=event.params||{},eventTurnId=p.turnId||p.turn?.id||p.error?.turnId;
        if(eventTurnId!==turnId)return;
        if(event.method==='item/agentMessage/delta')text+=p.delta||'';
        if(event.method==='error')finish(new Error(p.error?.message||'Codex request failed.'));
        if(event.method==='turn/completed')p.turn?.status==='failed'?finish(new Error(p.turn.error?.message||'Codex turn failed.')):finish(null,text.trim()||'The Codex model returned no answer.');
      };
      this.listeners.add(onData);
    });
  }

  async chatAnthropic(message,context,attachments){
    const key=this.anthropicKey;
    if(!key)throw new Error('Connect your Anthropic account before asking Jerri.');
    const selected=this.models.anthropic.find(model=>(model.model||model.id)===this.settings.modelIds.anthropic)||this.models.anthropic[0]||anthropicFallback;
    const modelId=selected.model||selected.id;
    const documentContext=attachments.documents.map(file=>`\n\nATTACHED FILE: ${file.name}\n${file.text}`).join('');
    const content=[...attachments.images.map(image=>({type:'image',source:{type:'base64',media_type:image.mime,data:image.bytes.toString('base64')}})),{type:'text',text:this.prompt(message+documentContext,context,'Anthropic')}];
    const body={model:modelId,max_tokens:4096,messages:[{role:'user',content}]};
    if(/claude-(?:opus|sonnet)-(?:4-[6-9]|[5-9])/.test(modelId)){
      body.thinking={type:'adaptive'};
      if(this.settings.reasoningEffort!=='auto')body.output_config={effort:this.settings.reasoningEffort==='xhigh'||this.settings.reasoningEffort==='max'?'high':this.settings.reasoningEffort};
    }
    const response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},body:JSON.stringify(body)});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload?.error?.message||`Anthropic request failed (${response.status}).`);
    const text=(payload.content||[]).filter(block=>block.type==='text').map(block=>block.text).join('\n').trim();
    return text||'Anthropic returned no answer.';
  }

  async logout(providerId=this.settings.providerId){
    if(providerId==='anthropic'){
      this.credentials.delete('anthropic');
      this.anthropicKey=null;
    }else{
      await this.ensureCodexServer();
      if(this.account)await this.request('account/logout',{});
      this.account=null;
      this.threadId=null;
    }
    return this.state();
  }

  close(){this.child?.kill();this.child=null;this.threadId=null;this.failAll(new Error('Codex app server closed.'))}
}
