import React, { useState } from 'react';
import { Search, User, Phone, ArrowUpRight, ArrowDownLeft, X, Check, Trash2, Send, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Customer, Transaction } from './types';
import { format } from 'date-fns';

export function Card({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  const hasBg = className.includes('bg-');
  return (
    <div className={`${hasBg ? '' : 'bg-white dark:bg-[#1e132b]'} border border-slate-100 dark:border-[#2d1b41] shadow-[0_4px_24px_rgb(0,0,0,0.04)] dark:shadow-[0_4px_32px_rgb(0,0,0,0.3)] rounded-[1.25rem] overflow-hidden transition-all p-4 ${className}`}>
      {children}
    </div>
  );
}

export function NumericKeypad({ value, onChange }: { value: string, onChange: (v: string) => void }) {
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'delete'];

  const handleDigit = (digit: string) => {
    if (digit === 'delete') {
      onChange(value.length > 0 ? value.slice(0, -1) : "");
    } else if (digit === '.') {
      if (!value.includes('.')) {
        onChange((value || "0") + digit);
      }
    } else {
      // Prevent multiple leading zeros
      if (value === "0" && digit === "0") return;
      // Replace single leading zero
      if (value === "0" && digit !== ".") {
        onChange(digit);
        return;
      }
      
      // Limit to 2 decimal places
      if (value.includes('.')) {
        const [, decimal] = value.split('.');
        if (decimal && decimal.length >= 2) return;
      }
      
      // Limit total length
      if (value.length > 8) return;
      
      onChange(value + digit);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      {digits.map((digit) => (
        <button
          key={digit}
          type="button"
          id={`numpad-${digit}`}
          onClick={() => handleDigit(digit)}
          className="numpad-btn h-16 sm:h-20"
        >
          {digit === 'delete' ? <Trash2 className="w-6 h-6 text-red-500" /> : digit}
        </button>
      ))}
    </div>
  );
}

export function CustomerList({ customers, onSelect, onAdd, onEdit }: { 
  customers: Customer[], 
  onSelect: (c: Customer) => void,
  onAdd: () => void,
  onEdit: (c: Customer) => void
}) {
  const [search, setSearch] = useState("");

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.phone && c.phone.includes(search))
  );

  const getInitialsColor = (index: number) => {
    const colors = [
      'bg-primary-50 text-primary-600', 
      'bg-blue-50 text-blue-600', 
      'bg-accent-gold/10 text-primary-800', 
      'bg-emerald-50 text-emerald-600'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4 bg-white dark:bg-[#1e132b] px-5 py-4 rounded-2xl border border-slate-200 dark:border-[#2d1b41] shadow-lg shadow-slate-100/40 dark:shadow-none focus-within:ring-2 focus-within:ring-primary-500/20 transition-all">
        <Search className="text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search Customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-sm outline-none font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600"
        />
      </div>

      <div className="flex flex-col gap-3 py-1">
        {filtered.map((customer, index) => (
          <div
            key={customer.id}
            className={`group relative flex items-center justify-between p-5 bg-white dark:bg-[#1e132b] border ${customer.totalDue > 0 ? 'border-primary-100 dark:border-primary-900/50' : 'border-slate-100 dark:border-[#2d1b41]'} rounded-[1.5rem] active:scale-[0.98] transition-all text-left shadow-xl shadow-slate-100/50 dark:shadow-none hover:border-primary-500/30 dark:hover:border-primary-500/50`}
          >
            <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => onSelect(customer)}>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm ${getInitialsColor(index)}`}>
                {customer.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-slate-900 dark:text-white tracking-tight leading-tight truncate text-lg pr-4">{customer.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${customer.totalDue > 0 ? 'bg-primary-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                  <div className="text-[9px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500">
                    {customer.lastTransactionDate ? `Active ${format(customer.lastTransactionDate.toDate(), 'dd MMM')}` : 'New Customer'}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-1">
              <div className={`text-xl font-black tabular-nums tracking-tighter ${customer.totalDue > 0 ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-slate-600'}`}>
                ₹{customer.totalDue}
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(customer); }}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-primary-900/30 text-slate-400 dark:text-slate-600 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/50 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && search && (
          <div className="text-center py-10">
            <p className="text-slate-400 font-medium">No results found</p>
            <button onClick={onAdd} className="text-primary-500 font-bold text-sm mt-1 uppercase tracking-wider">Add New</button>
          </div>
        )}
      </div>

      <button 
        onClick={onAdd}
        className="btn-primary flex items-center justify-center gap-2 mt-2 shadow-lg shadow-primary-100"
      >
        Add New Customer
      </button>
    </div>
  );
}

export function TransactionList({ transactions, customers }: { transactions: Transaction[], customers: Customer[] }) {
  return (
    <div className="flex flex-col gap-4">
      {transactions.map(t => {
        const customer = customers.find(c => c.id === t.customerId);
        return (
          <div key={t.id} className="flex items-center justify-between p-5 bg-white dark:bg-[#1e132b] border border-slate-100 dark:border-[#2d1b41] rounded-[1.5rem] shadow-lg shadow-slate-100/50 dark:shadow-none transition-all hover:border-slate-200 dark:hover:border-primary-900/50">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${t.type === 'credit' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
                {t.type === 'credit' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownLeft className="w-6 h-6" />}
              </div>
              <div>
                <div className="font-black text-slate-900 dark:text-white tracking-tight">{customer?.name || 'Unknown'}</div>
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                  {t.timestamp ? format(t.timestamp.toDate(), 'hh:mm a • dd MMM') : 'Just now'}
                </div>
              </div>
            </div>
            <div className={`text-lg font-black tabular-nums tracking-tighter ${t.type === 'credit' ? 'text-primary-600 dark:text-primary-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {t.type === 'credit' ? '-' : '+'} ₹{t.amount}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function WhatsAppReminder({ customer, businessName, template = "" }: { customer: Customer, businessName: string, template?: string }) {
  const sendReminder = () => {
    if (!customer.phone) return;
    
    let message = "";
    if (template) {
      message = template
        .replace('{customer}', customer.name)
        .replace('{business}', businessName)
        .replace('{amount}', customer.totalDue.toString());
    }
    
    if (!message) {
      message = `Hello ${customer.name}, this is a reminder from ${businessName}. Your pending due is ₹${customer.totalDue}. Thank you!`;
    }
    
    const cleanPhone = customer.phone.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    // Using a named window attempts to reuse the same external tab/app instance
    window.open(url, 'whatsapp');
  };

  if (!customer.phone || customer.totalDue <= 0) return null;

  return (
    <button 
      onClick={sendReminder}
      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#25D366] text-white rounded-2xl font-bold active:scale-95 transition-all shadow-lg shadow-green-100"
    >
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.438 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.89 4.44-9.892 9.886 0 2.125.597 3.856 1.634 5.53l-.991 3.618 3.849-.941z"/></svg>
      Send WhatsApp Reminder
    </button>
  );
}
