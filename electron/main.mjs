import {app,BrowserWindow,dialog,ipcMain,safeStorage,session,shell} from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {FinanceStore} from './store.mjs';
import {australiaDate} from './calendar.mjs';
import {shouldQuitWhenAllWindowsClosed} from './lifecycle.mjs';
import {AiManager} from './ai.mjs';
import {DocumentVault} from './documents.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const indexPath=path.join(here,'../dist/index.html');
const devUrl=process.env.VITE_DEV_SERVER_URL||'';
const devOrigin=devUrl?new URL(devUrl).origin:'';
let store,ai,documents,startupError,mainWindow;const stagedPreviews=new Map(),stagedChatAttachments=new Map();
function openStore(){try{store?.close();store=new FinanceStore(path.join(process.env.JERRI_DATA_DIR||app.getPath('userData'),'jerri-finance.sqlite'));startupError=null}catch(error){store=null;startupError=new Error(`Could not open the local finance workspace: ${error?.message||String(error)}`)}}
function stagePreview(preview){stagedPreviews.clear();stagedPreviews.set(preview.id,preview);return preview}
function requireStoreFile(filePath){return fs.readFileSync(filePath,'utf8')}
function recoverKnownDocuments(){
  for(const item of store?.imports?.()||[]){
    if(!item.fileHash)continue;
    try{documents.metadata(item.fileHash);continue}catch{}
    const candidates=[app.getPath('downloads'),app.getPath('documents'),app.getPath('desktop')].map(root=>path.join(root,item.fileName));
    for(const candidate of candidates){try{if(fs.statSync(candidate).isFile()){documents.ingest(candidate,{id:item.fileHash,source:'legacy-import-recovery'});break}}catch{}}
  }
}
function credentialStore(dataDir){
  const credentialsPath=path.join(dataDir,'ai-credentials.json');
  const read=()=>{try{return JSON.parse(requireStoreFile(credentialsPath))}catch{return {}}};
  const write=value=>{fs.mkdirSync(dataDir,{recursive:true});const temporary=`${credentialsPath}.tmp-${process.pid}`;fs.writeFileSync(temporary,JSON.stringify(value,null,2)+'\n',{mode:0o600});fs.renameSync(temporary,credentialsPath)};
  return {get(name){const encrypted=read()[name];if(!encrypted)return null;if(!safeStorage.isEncryptionAvailable())throw new Error('Windows secure credential storage is unavailable.');return safeStorage.decryptString(Buffer.from(encrypted,'base64'))},set(name,value){if(!safeStorage.isEncryptionAvailable())throw new Error('Windows secure credential storage is unavailable.');const credentials=read();credentials[name]=safeStorage.encryptString(value).toString('base64');write(credentials)},delete(name){const credentials=read();delete credentials[name];write(credentials)}};
}
function trustedUrl(url){
  try{return devUrl?new URL(url).origin===devOrigin:url===pathToFileURL(indexPath).href}catch{return false}
}
function requireStore(){if(startupError)throw startupError;if(!store)throw new Error('The finance workspace is not ready.');return store}
function createWindow(){
  const win=new BrowserWindow({width:1440,height:920,minWidth:360,minHeight:600,title:'Jerri Finance',frame:false,show:false,backgroundColor:'#f4f1e8',webPreferences:{preload:path.join(here,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,devTools:Boolean(devUrl)}});
  mainWindow=win;
  win.removeMenu();
  mainWindow=win;
  win.on('closed',()=>{if(mainWindow===win)mainWindow=null});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-attach-webview',event=>event.preventDefault());
  win.webContents.on('will-navigate',(event,url)=>{if(!trustedUrl(url))event.preventDefault()});
  win.once('ready-to-show',()=>win.show());
  win.webContents.on('did-fail-load',(_event,errorCode,errorDescription)=>{if(errorCode!==-3)dialog.showErrorBox('Jerri Finance could not start',`${errorDescription} (${errorCode})`)});
  if(devUrl)void win.loadURL(devUrl);else void win.loadFile(indexPath);
  return win;
}
const handle=(name,fn)=>ipcMain.handle(name,async(event,...args)=>{try{if(!trustedUrl(event.senderFrame.url))throw new Error('Untrusted renderer request blocked.');return await fn(...args)}catch(error){throw new Error(error?.message||String(error))}});

if(!app.requestSingleInstanceLock())app.quit();
else{
  app.on('second-instance',()=>{if(mainWindow){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.focus()}});
  app.whenReady().then(()=>{
    session.defaultSession.setPermissionRequestHandler((_webContents,_permission,callback)=>callback(false));
    const dataDir=process.env.JERRI_DATA_DIR||app.getPath('userData');
    openStore();documents=new DocumentVault(dataDir);recoverKnownDocuments();ai=new AiManager(dataDir,{openExternal:url=>shell.openExternal(url),credentials:credentialStore(dataDir)});
    ipcMain.handle('window-control',(event,action)=>{if(!trustedUrl(event.senderFrame.url))throw new Error('Untrusted renderer request blocked.');const win=BrowserWindow.fromWebContents(event.sender);if(!win)throw new Error('Window is not available.');if(action==='minimize')win.minimize();else if(action==='toggle-maximize')win.isMaximized()?win.unmaximize():win.maximize();else if(action==='close')win.close();else if(action!=='state')throw new Error('Unknown window action.');return win.isMaximized()});
    handle('open-external',url=>{const parsed=new URL(String(url));if(!['https:','http:'].includes(parsed.protocol))throw new Error('Only web links can be opened.');return shell.openExternal(parsed.href).then(()=>true)});
    handle('bootstrap',()=>{if(startupError)openStore();return {...requireStore().bootstrap(),appVersion:app.getVersion()}});
    handle('choose-import-files',async()=>{const r=await dialog.showOpenDialog({title:'Add finance files',properties:['openFile','multiSelections'],filters:[{name:'Finance reports',extensions:['csv','pdf']}]});if(r.canceled)return null;const preview=await requireStore().preview(r.filePaths);for(const file of preview.files){const document=documents.ingest(file.filePath,{id:file.fileHash,source:'finance-import'});file.documentId=document.id}return stagePreview(preview)});
    handle('choose-chat-files',async()=>{const r=await dialog.showOpenDialog({title:'Attach files to Ask Jerri',properties:['openFile','multiSelections'],filters:[{name:'Supported files',extensions:['png','jpg','jpeg','webp','gif','pdf','txt','md','csv','json','tsv','xml','log']},{name:'Images',extensions:['png','jpg','jpeg','webp','gif']},{name:'Documents',extensions:['pdf','txt','md','csv','json','tsv','xml','log']}]});if(r.canceled)return [];return r.filePaths.map(filePath=>{const document=documents.ingest(filePath,{source:'ask-jerri'}),attachment={id:document.id,name:document.name,mime:document.mime,size:document.size,kind:document.kind==='image'?'image':'document'};stagedChatAttachments.set(document.id,{...attachment,path:documents.pathFor(document.id)});return attachment})});
    handle('confirm-import',previewId=>{const preview=stagedPreviews.get(previewId);if(!preview)throw new Error('Import preview expired or was not created by Jerri Finance. Please choose the files again.');const result=requireStore().confirm(preview);stagedPreviews.delete(previewId);return result});
    handle('document-read',id=>documents.read(id));
    handle('document-recover',async input=>{const id=String(input?.id||''),name=path.basename(String(input?.name||'document')),extension=path.extname(name).replace(/^\./,'');const result=await dialog.showOpenDialog({title:`Locate ${name}`,defaultPath:path.join(app.getPath('downloads'),name),properties:['openFile'],filters:extension?[{name:'Matching document',extensions:[extension]}]:undefined});if(result.canceled)return null;documents.ingest(result.filePaths[0],{id,source:'manual-recovery'});return documents.read(id)});
    handle('transactions',filters=>requireStore().transactions(filters));
    handle('create-transaction',input=>requireStore().createTransaction(input));
    handle('update-transaction',input=>requireStore().updateTransaction(input));
    handle('review-transactions',ids=>requireStore().reviewTransactions(ids));
    handle('delete-transaction',id=>requireStore().deleteTransaction(id));
    handle('dashboard',month=>requireStore().dashboard(month));
    handle('save-settings',input=>requireStore().saveSettings(input));
    handle('add-category',name=>requireStore().addCategory(name));
    handle('delete-category',name=>requireStore().deleteCategory(name));
    handle('insights',month=>requireStore().insights(month));
    handle('goals',()=>requireStore().goals());
    handle('create-goal',input=>requireStore().createGoal(input));
    handle('update-goal',input=>requireStore().updateGoal(input));
    handle('delete-goal',id=>requireStore().deleteGoal(id));
    handle('ai-state',()=>ai.state());
    handle('ai-refresh',()=>process.env.JERRI_DISABLE_AI_REFRESH==='1'?ai.state():ai.initialize());
    handle('ai-configure',input=>ai.configure(input));
    handle('ai-logout',providerId=>ai.logout(providerId));
    handle('ai-chat',async input=>{const finance=requireStore(),settings=ai.state(),month=finance.dashboard().month,ids=(input.attachments||[]).map(item=>item.id),attachments=ids.map(id=>stagedChatAttachments.get(id));if(attachments.some(item=>!item))throw new Error('One or more attachments expired. Choose the files again.');try{return await ai.chat(input.message,finance.aiContext(settings.contextScope==='current-month'?month:'all',settings.contextScope),attachments)}finally{for(const id of ids)stagedChatAttachments.delete(id)}});
    handle('ai-setup',input=>ai.setup(input));
    handle('save-snapshot',input=>requireStore().saveSnapshot(input));
    handle('snapshot-for',month=>requireStore().snapshotFor(month));
    handle('allocation-for',month=>requireStore().allocationFor(month));
    handle('undo-import',id=>requireStore().undoImport(id));
    handle('backup',async()=>{const r=await dialog.showSaveDialog({title:'Save Jerri Finance backup',defaultPath:`Jerri-Finance-Backup-${australiaDate()}.sqlite`,filters:[{name:'SQLite backup',extensions:['sqlite']}]});return r.canceled?null:requireStore().backup(r.filePath)});
    handle('restore',async()=>{const r=await dialog.showOpenDialog({title:'Restore Jerri Finance backup',properties:['openFile'],filters:[{name:'SQLite backup',extensions:['sqlite']}]});return r.canceled?null:requireStore().restore(r.filePaths[0])});
    createWindow();
    app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()});
  });
  app.on('before-quit',()=>{ai?.close();store?.close()});
  app.on('window-all-closed',()=>{if(shouldQuitWhenAllWindowsClosed(process.platform))app.quit()});
}
