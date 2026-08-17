import React, { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

export const QuickReportUpload: React.FC = () => {
  const { uploadImport, setActiveTab } = useFinance();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const stageFiles = async (files: FileList | File[]) => {
    if (!files.length) return;
    setBusy(true); setMessage('Detecting and validating reports…');
    try {
      for (const file of Array.from(files)) await uploadImport(file, 'auto');
      setMessage('Reports staged. Review the preview before confirming import.');
      setActiveTab('imports');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to stage this report.'); }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = ''; }
  };

  return <div className="space-y-2">
    <input ref={inputRef} type="file" accept=".csv,.pdf,application/pdf,text/csv" multiple className="hidden" onChange={(event) => void stageFiles(event.target.files ?? [])} />
    <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void stageFiles(event.dataTransfer.files); }} className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-center hover:border-slate-500 hover:bg-white transition-colors">
      <button disabled={busy} onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"><UploadCloud className="h-4 w-4" />{busy ? 'Processing…' : 'Upload Reports'}</button>
      <p className="mt-1 text-[11px] text-slate-500">Drop Stripe, Xero, or ING CSV/PDF reports here. Source detection is automatic.</p>
    </div>
    {message && <p role="status" className="text-[11px] text-slate-600">{message}</p>}
  </div>;
};
