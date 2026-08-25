import {app,BrowserWindow,dialog,ipcMain,session} from 'electron';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {FinanceStore} from './store.mjs';
import {australiaDate} from './calendar.mjs';
import {shouldQuitWhenAllWindowsClosed} from './lifecycle.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const indexPath=path.join(here,'../dist/index.html');
const devUrl=process.env.VITE_DEV_SERVER_URL||'';
const devOrigin=devUrl?new URL(devUrl).origin:'';
let store,startupError,mainWindow;const stagedPreviews=new Map();
function openStore(){try{store?.close();store=new FinanceStore(path.join(process.env.JERRI_DATA_DIR||app.getPath('userData'),'jerri-finance.sqlite'));startupError=null}catch(error){store=null;startupError=new Error(`Could not open the local finance workspace: ${error?.message||String(error)}`)}}
function stagePreview(preview){stagedPreviews.clear();stagedPreviews.set(preview.id,preview);return preview}

function trustedUrl(url){
  try{return devUrl?new URL(url).origin===devOrigin:url===pathToFileURL(indexPath).href}catch{return false}
}
function requireStore(){if(startupError)throw startupError;if(!store)throw new Error('The finance workspace is not ready.');return store}
function createWindow(){
  const win=new BrowserWindow({width:1440,height:920,minWidth:980,minHeight:700,title:'Jerri Finance',backgroundColor:'#f4f1e8',webPreferences:{preload:path.join(here,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,devTools:Boolean(devUrl)}});
  mainWindow=win;
  win.removeMenu();
  mainWindow=win;
  win.on('closed',()=>{if(mainWindow===win)mainWindow=null});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-attach-webview',event=>event.preventDefault());
  win.webContents.on('will-navigate',(event,url)=>{if(!trustedUrl(url))event.preventDefault()});
  if(devUrl)void win.loadURL(devUrl);else void win.loadFile(indexPath);
  return win;
}
const handle=(name,fn)=>ipcMain.handle(name,async(event,...args)=>{try{if(!trustedUrl(event.senderFrame.url))throw new Error('Untrusted renderer request blocked.');return await fn(...args)}catch(error){throw new Error(error?.message||String(error))}});

if(!app.requestSingleInstanceLock())app.quit();
else{
  app.on('second-instance',()=>{if(mainWindow){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.focus()}});
  app.whenReady().then(()=>{
    session.defaultSession.setPermissionRequestHandler((_webContents,_permission,callback)=>callback(false));
    openStore();
    handle('bootstrap',()=>{if(startupError)openStore();return requireStore().bootstrap()});
    handle('choose-import-files',async()=>{const r=await dialog.showOpenDialog({title:'Add finance files',properties:['openFile','multiSelections'],filters:[{name:'Finance reports',extensions:['csv','pdf']}]});return r.canceled?null:stagePreview(await requireStore().preview(r.filePaths))});
    handle('confirm-import',previewId=>{const preview=stagedPreviews.get(previewId);if(!preview)throw new Error('Import preview expired or was not created by Jerri Finance. Please choose the files again.');const result=requireStore().confirm(preview);stagedPreviews.delete(previewId);return result});
    handle('transactions',filters=>requireStore().transactions(filters));
    handle('create-transaction',input=>requireStore().createTransaction(input));
    handle('update-transaction',input=>requireStore().updateTransaction(input));
    handle('review-transactions',ids=>requireStore().reviewTransactions(ids));
    handle('delete-transaction',id=>requireStore().deleteTransaction(id));
    handle('dashboard',month=>requireStore().dashboard(month));
    handle('save-settings',input=>requireStore().saveSettings(input));
    handle('save-snapshot',input=>requireStore().saveSnapshot(input));
    handle('snapshot-for',month=>requireStore().snapshotFor(month));
    handle('allocation-for',month=>requireStore().allocationFor(month));
    handle('undo-import',id=>requireStore().undoImport(id));
    handle('backup',async()=>{const r=await dialog.showSaveDialog({title:'Save Jerri Finance backup',defaultPath:`Jerri-Finance-Backup-${australiaDate()}.sqlite`,filters:[{name:'SQLite backup',extensions:['sqlite']}]});return r.canceled?null:requireStore().backup(r.filePath)});
    handle('restore',async()=>{const r=await dialog.showOpenDialog({title:'Restore Jerri Finance backup',properties:['openFile'],filters:[{name:'SQLite backup',extensions:['sqlite']}]});return r.canceled?null:requireStore().restore(r.filePaths[0])});
    createWindow();
    app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()});
  });
  app.on('before-quit',()=>store?.close());
  app.on('window-all-closed',()=>{if(shouldQuitWhenAllWindowsClosed(process.platform))app.quit()});
}
