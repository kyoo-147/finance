import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const MIME={'.pdf':'application/pdf','.csv':'text/csv','.tsv':'text/tab-separated-values','.txt':'text/plain','.md':'text/markdown','.json':'application/json','.xml':'application/xml','.log':'text/plain','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif'};
const MAX_BYTES=20*1024*1024;
const hashFile=filePath=>crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
const atomicJson=(filePath,value)=>{fs.mkdirSync(path.dirname(filePath),{recursive:true});const temporary=`${filePath}.tmp-${process.pid}`;fs.writeFileSync(temporary,JSON.stringify(value,null,2)+'\n',{mode:0o600});fs.renameSync(temporary,filePath)};

export class DocumentVault{
  constructor(dataDir){this.root=path.join(dataDir,'documents');this.indexPath=path.join(this.root,'index.json');this.index=this.readIndex()}
  readIndex(){try{const value=JSON.parse(fs.readFileSync(this.indexPath,'utf8'));return value&&typeof value==='object'?value:{}}catch{return {}}}
  save(){atomicJson(this.indexPath,this.index)}
  ingest(filePath,options={}){
    const resolved=path.resolve(String(filePath||'')),stat=fs.statSync(resolved);
    if(!stat.isFile())throw new Error('The selected document is not a file.');
    if(stat.size>MAX_BYTES)throw new Error(`${path.basename(resolved)} is larger than 20 MB.`);
    const extension=path.extname(resolved).toLowerCase(),mime=MIME[extension];
    if(!mime)throw new Error(`${path.basename(resolved)} is not a supported document type.`);
    const digest=hashFile(resolved),id=String(options.id||digest);
    if(!/^[a-f0-9-]{32,64}$/i.test(id))throw new Error('Document identity is invalid.');
    if(/^[a-f0-9]{64}$/i.test(id)&&id.toLowerCase()!==digest)throw new Error('The selected file does not match the document originally imported into Jerri Finance.');
    fs.mkdirSync(this.root,{recursive:true});
    const storedName=`${id}${extension}`,storedPath=path.join(this.root,storedName);
    if(!fs.existsSync(storedPath))fs.copyFileSync(resolved,storedPath);
    const entry={id,name:path.basename(resolved),mime,size:stat.size,kind:mime.startsWith('image/')?'image':extension==='.pdf'?'pdf':extension==='.csv'||extension==='.tsv'?'table':'text',storedName,source:options.source||'selected',addedAt:this.index[id]?.addedAt||new Date().toISOString()};
    this.index[id]=entry;this.save();return {...entry};
  }
  metadata(id){const entry=this.index[String(id)];if(!entry)throw new Error('This document is no longer available in Jerri Finance.');const filePath=path.join(this.root,entry.storedName);if(!fs.existsSync(filePath))throw new Error('The stored document file is missing.');return {...entry}}
  read(id){const entry=this.metadata(id),filePath=path.join(this.root,entry.storedName),bytes=fs.readFileSync(filePath);return {metadata:entry,data:bytes}}
  pathFor(id){const entry=this.metadata(id);return path.join(this.root,entry.storedName)}
}
