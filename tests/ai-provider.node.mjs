import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {AiManager} from '../electron/ai.mjs';

const tempManager=()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jerri-provider-test-'));const manager=new AiManager(dir,{credentials:{get:()=>null,set:()=>{},delete:()=>{}}});return {dir,manager,close(){manager.close();fs.rmSync(dir,{recursive:true,force:true})}}};

test('provider state is fail-closed until an account is connected',()=>{const item=tempManager();try{const state=item.manager.state();assert.equal(state.ready,false);assert.equal(state.providerId,'codex');assert.equal(state.reasoningEffort,'auto');assert.deepEqual(state.providers.map(provider=>provider.id),['codex','anthropic']);assert.equal(state.models[0].id,'gpt-5.4-mini');assert.equal(item.manager.configure({reasoningEffort:'high'}).reasoningEffort,'high');assert.equal(item.manager.configure({reasoningEffort:'auto'}).reasoningEffort,'auto')}finally{item.close()}});

test('chat attachments load text and image bytes before provider dispatch',async()=>{const item=tempManager();try{const textPath=path.join(item.dir,'notes.txt'),imagePath=path.join(item.dir,'pixel.png');fs.writeFileSync(textPath,'attachment text');fs.writeFileSync(imagePath,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64'));item.manager.chatCodex=async(_message,_context,attachments)=>attachments;const result=await item.manager.chat('review',{},[{path:textPath,mime:'text/plain'},{path:imagePath,mime:'image/png'}]);assert.deepEqual(result.documents.map(file=>[file.name,file.text]),[['notes.txt','attachment text']]);assert.deepEqual(result.images.map(file=>[file.name,file.mime,file.bytes.length]),[['pixel.png','image/png',68]])}finally{item.close()}});

test('unsupported chat files fail before provider dispatch',async()=>{const item=tempManager();try{const filePath=path.join(item.dir,'archive.zip');fs.writeFileSync(filePath,'not a supported chat document');item.manager.chatCodex=async()=>assert.fail('provider must not be called');await assert.rejects(()=>item.manager.chat('review',{},[{path:filePath,mime:'application/zip'}]),/supported chat files/)}finally{item.close()}});
