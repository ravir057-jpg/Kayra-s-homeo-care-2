import React from 'react';
import { Invoice } from '../../types';
import { FileText, Download, Clock, CheckCircle2, AlertCircle, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { processPayment } from '../../services/paymentService';
import { auth } from '../../lib/db';
import axios from 'axios';

interface PatientBillingHistoryProps {
  invoices: Invoice[];
  onDownload: (invoice: Invoice) => void;
  onPaymentSuccess?: (invId: string, response: any) => void;
}

export default function PatientBillingHistory({ invoices, onDownload, onPaymentSuccess }: PatientBillingHistoryProps) {
  const handlePayment = async (inv: Invoice) => {
    try {
      if (!inv.id) return;
      
      // Get the doctor's profile to check for custom keys
      let keyId = '';
      try {
        const { data: { key } } = await axios.get('/api/payment/key');
        keyId = key;
      } catch (err) {
        console.error("Failed to get default key", err);
      }

      await processPayment(inv.amount, {
        razorpayKeyId: keyId,
        invoiceId: inv.id,
        doctorId: inv.doctorId,
        patientName: auth.currentUser?.displayName || 'Patient',
        patientEmail: auth.currentUser?.email || '',
        description: `Consultation Fee - INV-${inv.id.substring(0,8)}`
      }).then((response: any) => {
        if (onPaymentSuccess) {
          onPaymentSuccess(inv.id!, response);
        }
      });
    } catch (error) {
      console.error('Payment failed', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-slate-900 p-8 sm:p-14 rounded-[3.5rem] text-white relative overflow-hidden shadow-2xl shadow-indigo-500/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] -mr-48 -mt-48 transition-all"></div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl mb-8 border border-white/10">
            <CreditCard size={16} className="text-indigo-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">Financial Integrity</span>
          </div>
          <h3 className="text-3xl sm:text-5xl font-black mb-6 tracking-tight leading-[1.1]">Clinical Accounts & Settlements</h3>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl leading-relaxed font-medium">Monitor your health investments and manage invoices with absolute transparency. Each statement is cryptographically verified for your security.</p>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-10 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div>
            <h4 className="text-xl font-black text-slate-800 tracking-tight">Ledger Summary</h4>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Real-time Transactional mapping</p>
          </div>
          <div className="flex gap-4">
             <div className="px-6 py-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col items-center">
                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Settled</span>
                <span className="text-lg font-black text-slate-800 leading-none">₹{invoices.filter(i => i.status === 'Paid').reduce((acc, i) => acc + i.amount, 0)}</span>
             </div>
             <div className="px-6 py-3 bg-amber-50 rounded-2xl border border-amber-100 flex flex-col items-center">
                <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest leading-none mb-1">Outstanding</span>
                <span className="text-lg font-black text-slate-800 leading-none">₹{invoices.filter(i => i.status === 'Pending').reduce((acc, i) => acc + i.amount, 0)}</span>
             </div>
          </div>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Statement Date</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Reference ID</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Net Amount</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Audit Status</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-10 py-32 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6 border border-slate-100">
                        <AlertCircle size={32} strokeWidth={1} />
                      </div>
                      <p className="text-slate-800 font-black uppercase tracking-widest text-[10px] mb-1">Financial Records Null</p>
                      <p className="text-slate-400 text-xs font-medium">No transactional data has been archived for this Health ID.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-10 py-8">
                      <span className="text-sm font-black text-slate-700 tracking-tight">
                        {format(new Date(inv.createdAt), 'dd MMM yyyy')}
                      </span>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white border border-slate-200 shadow-sm rounded-lg flex items-center justify-center text-slate-400">
                          <FileText size={14} />
                        </div>
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">#{inv.id?.slice(-8).toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <span className="text-lg font-black text-slate-900 leading-none tracking-tight">₹{inv.amount}</span>
                    </td>
                    <td className="px-10 py-8">
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest ${
                        inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                        inv.status === 'Pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-red-50 text-red-600 border border-red-100'
                      }`}>
                        {inv.status === 'Paid' ? <CheckCircle2 size={12} fill="currentColor" className="text-emerald-500/20" /> : <Clock size={12} className="text-amber-500" />}
                        {inv.status}
                      </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                      <div className="flex justify-end gap-3">
                        {inv.status === 'Pending' && (
                          <button 
                            onClick={() => handlePayment(inv)}
                            className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-xl shadow-emerald-500/10 active:scale-95"
                          >
                            <CreditCard size={14} />
                            Settle Now
                          </button>
                        )}
                        <button 
                          onClick={() => onDownload(inv)}
                          className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                          title="Download Statement"
                        >
                          <Download size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
