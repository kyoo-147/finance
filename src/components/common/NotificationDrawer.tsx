import React from 'react';
import { X, Bell, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatRelativeTime } from '../../domain/formatters';

export const NotificationDrawer: React.FC = () => {
  const { isNotificationsOpen, setIsNotificationsOpen, activityEvents, setActiveTab } = useFinance();

  if (!isNotificationsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-[#08123D]/40 backdrop-blur-xs transition-opacity"
        onClick={() => setIsNotificationsOpen(false)}
      />
      <div className="relative bg-white w-full max-w-sm h-full shadow-2xl flex flex-col z-10 p-4 border-l border-[#E7EBF3]">
        <div className="flex items-center justify-between pb-3 border-b border-[#E7EBF3] mb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#1547F5]" />
            <h3 className="font-bold text-[14px] text-[#08123D]">Activity & Alerts</h3>
          </div>
          <button
            onClick={() => setIsNotificationsOpen(false)}
            className="p-1 rounded-lg text-[#7E8AA8] hover:bg-[#F5F7FB]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {activityEvents.map((act) => (
            <div
              key={act.id}
              className="p-3 rounded-[12px] bg-[#F8FAFD] border border-[#E7EBF3] hover:border-[#1547F5]/30 transition-all text-[12px]"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-[#08123D] flex items-center gap-1.5">
                  {act.type === 'import' && <CheckCircle2 className="w-3.5 h-3.5 text-[#16A35A]" />}
                  {act.type === 'transaction' && <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />}
                  {act.type === 'allocation' && <CheckCircle2 className="w-3.5 h-3.5 text-[#1547F5]" />}
                  {act.title}
                </span>
                <span className="text-[10px] text-[#7E8AA8]">{formatRelativeTime(act.timestamp)}</span>
              </div>
              <p className="text-[#4C5B82] leading-snug">{act.description}</p>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-[#E7EBF3] mt-2">
          <button
            onClick={() => {
              setIsNotificationsOpen(false);
              setActiveTab('overview');
            }}
            className="w-full bg-[#EEF3FF] text-[#1547F5] hover:bg-[#1547F5] hover:text-white font-semibold text-[12px] py-2.5 rounded-[10px] transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            View Dashboard Overview <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
