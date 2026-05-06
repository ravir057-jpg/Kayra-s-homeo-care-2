import { useState, useEffect } from 'react';
import { db } from '../../lib/db';
import { collection, query, where, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Invoice, Patient, UserProfile } from '../../types';
import { 
  CreditCard, 
  Download, 
  Clock, 
  CheckCircle2, 
  FileText,
  Search,
  ArrowRight,
  TrendingUp,
  CreditCard as PaymentIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { generateInvoicePDF } from '../../lib/pdf';
import { processPayment } from '../../services/paymentService';
import axios from 'axios';
import { toast } from 'sonner';

interface PatientBillingHistoryProps {
  patient: Patient;
  doctor?: UserProfile | null;
}

export default function PatientBillingHistory({ patient, doctor }: PatientBillingHistoryProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, [patient.id]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'invoices'),
        where('patientId', '==', patient.id),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setInvoices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice)));
    } catch (error) {
      console.error("Error fetching patient invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (invoice: Invoice) => {
    try {
      setProcessingId(invoice.id || null);
      
      // 1. Determine which Key ID to use
      let keyId = '';
      if (invoice.doctorId) {
          const docRef = doc(db, 'users', invoice.doctorId);
          const docSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', invoice.doctorId)));
          if (!docSnap.empty) {
              const docData = docSnap.docs[0].data();
              keyId = docData.razorpayKeyId;
          }
      }
      
      if (!keyId) {
          const { data: { key } } = await axios.get('/api/payment/key');
          keyId = key;
      }
      
      if (!keyId) {
        toast.error('Payment gateway not configured');
        return;
      }

      // 2. Process payment
      await processPayment(invoice.amount, {
        razorpayKeyId: keyId,
        invoiceId: invoice.id,
        doctorId: invoice.doctorId,
        patientName: patient.name,
        patientEmail: patient.email,
        patientPhone: patient.phone,
        clinicName: doctor?.clinicName || "Kayra Homeo Care",
        description: `Consultation Fee - INV-${invoice.id?.substring(0,8)}`
      });

      // 3. Update Firestore status
      if (invoice.id) {
        await updateDoc(doc(db, 'invoices', invoice.id), {
          status: 'Paid',
          paidAt: new Date().toISOString()
        });
        toast.success('Invoice marked as Paid');
        fetchInvoices();
      }
    } catch (err) {
      console.error('Payment failed', err);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading && invoices.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const stats = {
    totalPaid: invoices.filter(i => i.status === 'Paid').reduce((acc, curr) => acc + curr.amount, 0),
    pending: invoices.filter(i => i.status === 'Pending').reduce((acc, curr) => acc + curr.amount, 0),
    count: invoices.length
  };

  return (
    <div className="space-y-6">
      {/* Mini Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Total Paid</p>
            <p className="text-sm font-bold text-slate-800">₹{stats.totalPaid.toLocaleString()}</p>
          </div>
        </div>
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-600 shadow-sm">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Pending</p>
            <p className="text-sm font-bold text-slate-800">₹{stats.pending.toLocaleString()}</p>
          </div>
        </div>
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-600 shadow-sm">
            <FileText size={20} />
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Invoices</p>
            <p className="text-sm font-bold text-slate-800">{stats.count}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date & ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 italic">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                    No payment records found
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">{format(new Date(inv.createdAt), 'dd MMM yyyy')}</span>
                        <span className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter">#{inv.id?.substring(0,8)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-600 truncate max-w-[150px]">
                        {inv.items[0]?.description || 'Consultation Services'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-900 leading-none">₹{inv.amount.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                        inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' :
                        inv.status === 'Pending' ? 'bg-amber-50 text-amber-600' :
                        inv.status === 'Failed' ? 'bg-red-50 text-red-600' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                         {inv.status}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {inv.status === 'Pending' && (
                          <button 
                            onClick={() => handlePayment(inv)}
                            disabled={processingId === inv.id}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border border-transparent hover:border-indigo-100 flex items-center gap-1"
                            title="Pay Now"
                          >
                            <PaymentIcon size={16} className={processingId === inv.id ? 'animate-pulse' : ''} />
                            <span className="text-[10px] font-bold uppercase hidden sm:inline">Pay</span>
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            const doc = generateInvoicePDF(doctor || null, patient, inv);
                            doc.save(`Invoice_${inv.id?.substring(0,8)}.pdf`);
                          }}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        >
                          <Download size={16} />
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
