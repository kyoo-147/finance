import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { ApiError } from '../api/client';
import { useFinance } from '../context/FinanceContext';
import { HeroBanner } from '../components/common/HeroBanner';
import { formatDateTime } from '../domain/formatters';

export const ImportsPage: React.FC = () => {
  const { importJobs, connectedAccounts, uploadImport, setActiveTab } = useFinance();
  const [selectedAccount, setSelectedAccount] = useState('stripe');
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeJob = importJobs.find(
    (j) =>
      j.status === 'validating' ||
      j.status === 'mapping' ||
      j.status === 'normalizing' ||
      j.status === 'deduplicating' ||
      j.status === 'categorizing' ||
      j.status === 'uploaded'
  );

  const pendingReviewJobs = importJobs.filter((j) => j.issuesCount && j.issuesCount > 0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadError(null);
      try { await uploadImport(files[0], selectedAccount); } catch (error) { setUploadError(error instanceof ApiError && error.status === 409 ? 'This file was already imported; no new transactions were created.' : error instanceof ApiError ? error.message : 'Unable to process this file. Check the CSV format and try again.'); }
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Light & Purposeful Hero Banner */}
      <HeroBanner
        title="Import Statements & Data Feeds"
        subtitle="Upload Stripe CSV, Xero payslip PDF/CSV, or ING statement PDF/CSV to import locally."
        compact
      >
        <div className="flex items-center gap-3">
          {pendingReviewJobs.length > 0 && (
            <button
              onClick={() => setActiveTab('transactions')}
              className="bg-amber-50 border border-amber-200 text-amber-900 font-semibold text-[11.5px] px-3.5 py-1.5 rounded-[6px] hover:bg-amber-100 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              Review Pending Items →
            </button>
          )}
        </div>
      </HeroBanner>
      {uploadError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{uploadError}</div>}

      {/* Workflow Stepper: Upload -> Processing -> Review -> Complete */}
      <div className="bg-white rounded-[14px] border border-slate-200/80 p-3.5 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[12px]">
          <div className="p-2 rounded-lg bg-slate-900 text-white font-semibold flex items-center justify-center gap-2">
            <span className="w-4.5 h-4.5 rounded-full bg-slate-800 text-[10.5px] flex items-center justify-center">1</span>
            <span>Upload File</span>
          </div>
          <div className={`p-2 rounded-lg font-semibold flex items-center justify-center gap-2 ${
            activeJob ? 'bg-amber-50 border border-amber-200 text-amber-900' : 'bg-slate-50 text-slate-500'
          }`}>
            <span className="w-4.5 h-4.5 rounded-full bg-slate-200 text-slate-600 text-[10.5px] flex items-center justify-center">2</span>
            <span>Process & Map</span>
          </div>
          <div className={`p-2 rounded-lg font-semibold flex items-center justify-center gap-2 ${
            pendingReviewJobs.length > 0 ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-slate-50 text-slate-500'
          }`}>
            <span className="w-4.5 h-4.5 rounded-full bg-slate-200 text-slate-600 text-[10.5px] flex items-center justify-center">3</span>
            <span>Review Items</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 text-slate-500 font-semibold flex items-center justify-center gap-2">
            <span className="w-4.5 h-4.5 rounded-full bg-slate-200 text-slate-600 text-[10.5px] flex items-center justify-center">4</span>
            <span>Complete</span>
          </div>
        </div>
      </div>

      {/* Main Upload Zone & Progress Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Upload Dropzone (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-[16px] border border-slate-200/90 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-[15px] text-slate-900">Upload Statement</h3>
              <p className="text-[12px] text-slate-500 mt-0.5">Select target feed account and drag file to import.</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">Target Account:</span>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg text-[12px] font-semibold text-slate-800 px-2.5 py-1 outline-none"
              >
                {connectedAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Clean Dropzone */}
          <div className="border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50 rounded-[14px] p-8 flex flex-col items-center justify-center text-center transition-all group">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.pdf,application/pdf,text/csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="w-10 h-10 rounded-full bg-slate-200/80 text-slate-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div className="font-bold text-[14px] text-slate-900">
              Choose a supported CSV or PDF to import.
            </div>
            <div className="text-[11.5px] text-slate-500 mt-1 max-w-sm">
              Stripe: Itemised Payouts CSV. Xero: payslip CSV or PDF. ING: statement CSV or PDF, up to 10 MB.
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-[12px] font-semibold text-white hover:bg-slate-800"
            >
              Browse files
            </button>
          </div>

          <div className="pt-2 text-[11.5px] text-slate-500">
            Automatic header and date structure mapping. Files are validated and committed in one local step; there is no simulated processing action.
          </div>
        </div>

        {/* Processing Tracker (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-[16px] border border-slate-200/90 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-[15px] text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              Processing Status
            </h3>

          </div>

          {activeJob ? (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-[12px] border border-slate-200/80">
                <div className="flex items-center justify-between text-[12px] font-bold text-slate-900 mb-1.5">
                  <span className="truncate max-w-[200px]">{activeJob.fileName}</span>
                  <span className="text-slate-900 font-bold tabular-nums">{activeJob.progress}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-1">
                  <div
                    className="bg-slate-900 h-full transition-all duration-300"
                    style={{ width: `${activeJob.progress}%` }}
                  />
                </div>
              </div>

              {/* Functional Steps */}
              <div className="space-y-2 text-[12px]">
                <div className={`flex items-center gap-2.5 ${activeJob.progress >= 20 ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>File syntax validation</span>
                </div>
                <div className={`flex items-center gap-2.5 ${activeJob.progress >= 40 ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Column layout mapping</span>
                </div>
                <div className={`flex items-center gap-2.5 ${activeJob.progress >= 60 ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Duplicate row check</span>
                </div>
                <div className={`flex items-center gap-2.5 ${activeJob.progress >= 80 ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Category rule application</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 px-4 bg-slate-50 rounded-[12px] border border-slate-100 text-slate-500 text-[12px]">
              No file currently processing. Drop a file on the left to begin staging.
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11.5px]">
            <span className="text-slate-500">Staged rows flow into ledger</span>
            <button
              onClick={() => setActiveTab('transactions')}
              className="text-slate-900 font-semibold hover:underline cursor-pointer"
            >
              Open Ledger →
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Collapsible Guidelines */}
      <div className="bg-white rounded-[16px] border border-slate-200/80 p-4 shadow-2xs">
        <button
          onClick={() => setShowGuidelines(!showGuidelines)}
          className="w-full flex items-center justify-between text-[13px] font-bold text-slate-800 cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Download className="w-4 h-4 text-slate-500" />
            CSV Guidelines & Duplicate Prevention Rules
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showGuidelines ? 'rotate-180' : ''}`} />
        </button>

        {showGuidelines && (
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-[12px] text-slate-600 animate-in fade-in duration-150">
            <div>
              <div className="font-semibold text-slate-900 mb-1">Required Columns</div>
              <p className="leading-relaxed">
                Ensure CSV files include <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">Date</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">Description</code>, and <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">Amount</code>.
              </p>
            </div>
            <div>
              <div className="font-semibold text-slate-900 mb-1">Smart Deduplication</div>
              <p className="leading-relaxed">
                System prevents duplicate entries by hashing date, merchant name, and exact amount.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Compact Clean Import History Table */}
      <div className="bg-white rounded-[16px] border border-slate-200/90 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-[15px] text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-slate-500" />
            Import Log & History
          </h3>
          <span className="text-[11.5px] text-slate-400 font-medium">Recent Files</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                <th className="py-2 px-3">File Name</th>
                <th className="py-2 px-3">Source Account</th>
                <th className="py-2 px-3">Uploaded</th>
                <th className="py-2 px-3">Rows</th>
                <th className="py-2 px-3">Duplicates</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {importJobs.map((job) => {
                const acctName = connectedAccounts.find((a) => a.id === job.sourceAccountId)?.displayName || 'Bank';
                const hasIssues = job.issuesCount && job.issuesCount > 0;
                return (
                  <tr key={job.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {job.fileName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{acctName}</td>
                    <td className="py-2.5 px-3 text-slate-400">{formatDateTime(job.uploadedAt)}</td>
                    <td className="py-2.5 px-3 font-medium tabular-nums text-slate-900">{job.rowCount || '-'}</td>
                    <td className="py-2.5 px-3 font-medium tabular-nums text-slate-500">{job.duplicateRows || 0}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                          job.status === 'committed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : job.status === 'failed'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {job.status === 'committed' ? 'Completed' : job.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {hasIssues ? (
                        <button
                          onClick={() => setActiveTab('transactions')}
                          className="text-[11.5px] font-bold text-amber-700 hover:underline cursor-pointer"
                        >
                          Review Items ({job.issuesCount}) →
                        </button>
                      ) : (
                        <button
                          onClick={() => setActiveTab('transactions')}
                          className="text-[11.5px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          View Ledger
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
