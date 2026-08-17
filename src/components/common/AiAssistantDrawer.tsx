import React, { useState, useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import Markdown from 'react-markdown';
import { useFinance } from '../../context/FinanceContext';
import { selectTotalBusinessIncome, selectBusinessExpenses, selectNetProfit } from '../../domain/selectors';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export const AiAssistantDrawer: React.FC = () => {
  const { isAiAssistantOpen, setIsAiAssistantOpen, transactions, allocationRules } = useFinance();

  const totalIncome = selectTotalBusinessIncome(transactions) / 100;
  const totalExpenses = selectBusinessExpenses(transactions) / 100;
  const netProfit = selectNetProfit(transactions) / 100;
  const taxRuleBps = allocationRules.find((r) => r.name.toLowerCase().includes('tax'))?.percentageBps || 2500;
  const taxReserve = (netProfit * (taxRuleBps / 10000));

  const formatMoney = (val: number) =>
    `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg_initial',
      sender: 'ai',
      text: `Local financial analysis for the data currently stored on this computer:

• **Total Income**: ${formatMoney(totalIncome)}
• **Business Expenses**: ${formatMoney(totalExpenses)}
• **Net Profit**: ${formatMoney(netProfit)}
• **Tax Reserve**: ${formatMoney(taxReserve)}

This assistant only explains the current local ledger; it does not provide financial advice or invent external data.`,
      timestamp: 'Just now',
    },
  ]);

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    'Explain Net Profit calculation',
    'Suggest categorization rules',
    'Analyze Cash Flow runway',
    'How is Tax Reserve calculated?',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isAiAssistantOpen) {
      scrollToBottom();
    }
  }, [messages, isAiAssistantOpen]);

  if (!isAiAssistantOpen) return null;

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text) return;

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputValue('');
    let aiResponseText = '';
      const lower = text.toLowerCase();

      if (lower.includes('net profit') || lower.includes('explain') || lower.includes('calculation')) {
        aiResponseText = `Your Net Profit of **${formatMoney(netProfit)}** is derived as follows:\n\n1. **Total Income**: ${formatMoney(totalIncome)}\n2. **Business Expenses**: -${formatMoney(totalExpenses)}\n3. **Formula**: Income (${formatMoney(totalIncome)}) - Expenses (${formatMoney(totalExpenses)}) = Net Profit ${formatMoney(netProfit)}.\n\nYour Profit Allocation rules reserve ${(taxRuleBps / 100).toFixed(1)}% (${formatMoney(taxReserve)}) for tax compliance.`;
      } else if (lower.includes('rule') || lower.includes('categor')) {
        aiResponseText = `The local ledger has **${transactions.filter((transaction) => transaction.categoryId === 'uncategorized').length}** uncategorised transaction(s). Open Transactions to review a real description and create a rule. This assistant does not invent merchant recommendations or apply rules automatically.`;
      } else if (lower.includes('runway') || lower.includes('cash flow') || lower.includes('cash')) {
        aiResponseText = `A runway figure is unavailable because the local ledger has no verified liquid-balance history. Current verified business net profit is **${formatMoney(netProfit)}**; open Cash Flow for recorded cash movements.`;
      } else if (lower.includes('tax') || lower.includes('reserve')) {
        aiResponseText = `Tax Reserve is derived directly from your **Profit Allocation Rules**:\n\n• **Tax Allocation**: **${(taxRuleBps / 100).toFixed(1)}%**\n• **Net Profit**: ${formatMoney(netProfit)}\n• **Calculated Reserve**: **${formatMoney(taxReserve)}**\n\nThis amount is isolated from operational funds to ensure tax lodgements are fully covered.`;
      } else {
        aiResponseText = `Checked books for **"${text}"**:\n\n• **Current Net Margin**: ${((netProfit / (totalIncome || 1)) * 100).toFixed(1)}%\n• **Reviewed Transactions**: ${transactions.filter((t) => t.reviewStatus === 'reviewed').length} / ${transactions.length}\n• **Tax Vault Reserve**: ${formatMoney(taxReserve)}\n\nIs there a specific category or transaction breakdown you need?`;
      }

      const aiMsg: Message = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: aiResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-900/30 backdrop-blur-xs transition-all">
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={() => setIsAiAssistantOpen(false)} />

      {/* Drawer Body */}
      <div className="relative w-full max-w-[420px] bg-white h-full shadow-xl flex flex-col z-10 border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Drawer Header (Clean, no bot icons or AI sparkle glow) */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between sticky top-0 z-20">
          <div>
            <h2 className="font-semibold text-[15px] text-slate-900">
              Jerri AI
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Financial Assistant
            </p>
          </div>

          <button
            onClick={() => setIsAiAssistantOpen(false)}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            aria-label="Close Assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-[10px] px-3.5 py-3 text-[12.5px] leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-900 border border-slate-200/90 shadow-2xs'
                }`}
              >
                {msg.sender === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                ) : (
                  <div className="space-y-1.5 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_strong]:font-semibold [&_strong]:text-slate-900">
                    <Markdown>{msg.text}</Markdown>
                  </div>
                )}
                <div
                  className={`text-[10px] mt-1.5 text-right ${
                    msg.sender === 'user' ? 'text-slate-300' : 'text-slate-400'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions Bar */}
        <div className="p-3.5 bg-white border-t border-slate-200/80 space-y-2">
          <div className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">
            Suggested Queries
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="text-[11.5px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/70 px-2.5 py-1 rounded-[6px] border border-slate-200/60 transition-all cursor-pointer text-left"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input Footer Form */}
        <div className="p-3.5 bg-white border-t border-slate-200 sticky bottom-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask Jerri AI about your finances..."
              className="flex-1 bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white text-[12.5px] text-slate-900 px-3 py-2 rounded-[8px] outline-none transition-all placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="p-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-[8px] transition-all cursor-pointer flex-shrink-0"
              aria-label="Send query"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

