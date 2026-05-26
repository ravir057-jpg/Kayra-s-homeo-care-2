import { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/db';
import { logAction } from '../../lib/audit';
import { collection, getDocs, doc, updateDoc, addDoc, query, orderBy, where } from 'firebase/firestore';
import { toast } from 'sonner';
import { Invoice, Patient, UserProfile } from '../../types';
import { 
  CreditCard, 
  Download, 
  ExternalLink, 
  Filter, 
  Search, 
  ShieldCheck, 
  Plus, 
  X, 
  ChevronRight, 
  FileText,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  Package
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { processPayment } from '../../services/paymentService';
import axios from 'axios';
import InventoryManager from './InventoryManager';

import { useLanguage } from '../../lib/i18n';

interface BillingManagerProps {
  profile: UserProfile | null;
}

export default function BillingManager({ profile }: BillingManagerProps) {
  const { t } = useLanguage();
  const [activeBillingTab, setActiveBillingTab] = useState<'billing' | 'inventory'>('billing');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showConfig, setShowConfig] = useState(false);
  const [gatewayConfig, setGatewayConfig] = useState({
    keyId: profile?.razorpayKeyId || '',
    keySecret: profile?.razorpayKeySecret || ''
  });

  const [newInvoice, setNewInvoice] = useState({
    patientId: '',
    amount: profile?.consultationFee || 500,
    description: 'Consultation Fee',
    items: [{ description: 'Consultation Fee', price: profile?.consultationFee || 500, quantity: 1 }]
  });

  useEffect(() => {
    if (profile?.consultationFee) {
      setNewInvoice(prev => ({ ...prev, amount: profile.consultationFee }));
    }
  }, [profile]);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.clinicId) return;
      try {
        const invQ = query(
          collection(db, 'invoices'), 
          where('clinicId', '==', profile.clinicId),
          orderBy('createdAt', 'desc')
        );
        const invSnap = await getDocs(invQ);
        setInvoices(invSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice)));

        const patQ = query(
          collection(db, 'patients'),
          where('clinicId', '==', profile.clinicId)
        );
        const patSnap = await getDocs(patQ);
        setPatients(patSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
      } catch (e) {
        console.error("Error fetching billing data:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile?.clinicId]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const patient = patients.find(p => p.id === inv.patientId);
      const matchesSearch = 
        patient?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.items.some(item => item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter, patients]);

  const exportInvoiceToPDF = (invoice: Invoice) => {
    const patient = patients.find(p => p.id === invoice.patientId);
    if (!patient) return;

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(16, 185, 129); // emerald-600
    doc.text(profile?.clinicName || "Kayra Homeo Care", 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(profile?.clinicAddress || "Healthcare Sanctuary", 105, 27, { align: 'center' });
    doc.text(`GSTIN: 27AAAAA0000A1Z5`, 105, 32, { align: 'center' });

    // Divider
    doc.setDrawColor(230);
    doc.line(20, 38, 190, 38);

    // Invoice Details
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("INVOICE", 20, 50);
    doc.setFontSize(10);
    doc.text(`Invoice #: ${invoice.id?.substring(0, 8).toUpperCase()}`, 20, 57);
    doc.text(`Date: ${format(new Date(invoice.createdAt), 'dd MMM yyyy')}`, 20, 62);
    doc.text(`Status: ${invoice.status.toUpperCase()}`, 20, 67);

    // Patient Details
    doc.text("BILLED TO:", 140, 50);
    doc.text(patient.name, 140, 57);
    doc.text(patient.phone, 140, 62);
    if (patient.email) doc.text(patient.email, 140, 67);

    // Table
    const tableData = invoice.items.map(item => [
      item.description,
      item.quantity || 1,
      `INR ${item.price.toFixed(2)}`,
      `INR ${(item.price * (item.quantity || 1)).toFixed(2)}`
    ]);

    (doc as any).autoTable({
      startY: 80,
      head: [['Description', 'Qty', 'Unit Price', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
      foot: [['', '', 'Grand Total', `INR ${invoice.amount.toFixed(2)}`]],
      footStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("Thank you for choosing Kayra Homeo Care.", 105, finalY + 20, { align: 'center' });
    doc.text("This is a computer generated invoice.", 105, finalY + 25, { align: 'center' });

    doc.save(`Invoice_${invoice.id?.substring(0, 8)}.pdf`);
    toast.success("Invoice downloaded successfully");
  };

  const handleUpdateStatus = async (invId: string, newStatus: Invoice['status']) => {
    try {
      const invoice = invoices.find(i => i.id === invId);
      if (!invoice) return;
      
      await updateDoc(doc(db, 'invoices', invId), { 
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      
      await logAction({
        action: 'Update Status',
        entityType: 'Invoice',
        entityId: invId,
        details: `Manual status update from ${invoice.status} to ${newStatus}`
      });
      
      setInvoices(prev => prev.map(inv => inv.id === invId ? { ...inv, status: newStatus } : inv));
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handlePayment = async (invId: string, amount: number) => {
    try {
      const invoice = invoices.find(i => i.id === invId);
      const patient = patients.find(p => p.id === invoice?.patientId);
      
      let keyId = profile?.razorpayKeyId || '';
      if (!keyId) {
        const { data: { key } } = await axios.get('/api/payment/key');
        keyId = key;
      }

      const response: any = await processPayment(amount, {
        razorpayKeyId: keyId,
        invoiceId: invId,
        doctorId: invoice?.doctorId || profile?.uid,
        patientName: patient?.name,
        patientEmail: patient?.email,
        patientPhone: patient?.phone,
        clinicName: profile?.clinicName || "Kayra Homeo Care",
        description: `Consultation Fee - INV-${invId.substring(0,8)}`
      });

      await updateDoc(doc(db, 'invoices', invId), { 
        status: 'Paid',
        paidAt: new Date().toISOString(),
        razorpayPaymentId: response.razorpay_payment_id,
        razorpayOrderId: response.razorpay_order_id,
        razorpaySignature: response.razorpay_signature,
        updatedAt: new Date().toISOString()
      });
      
      setInvoices(prev => prev.map(inv => inv.id === invId ? { 
        ...inv, 
        status: 'Paid', 
        razorpayPaymentId: response.razorpay_payment_id 
      } : inv));
      toast.success('Payment settled successfully');
    } catch (error) {
      console.error('Payment failed', error);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvoice.patientId) {
      toast.error('Please select a patient');
      return;
    }
    
    try {
      const commRate = profile?.commissionRate || 10;
      const commAmt = (newInvoice.amount * commRate) / 100;
      const netShare = newInvoice.amount - commAmt;

      // For demo, we simulate the razorpay order creation
      const razorpayOrderId = `order_${Math.random().toString(36).substring(7)}`;
      
      const docRef = await addDoc(collection(db, 'invoices'), {
        patientId: newInvoice.patientId,
        doctorId: profile?.uid,
        clinicId: profile?.clinicId,
        amount: newInvoice.amount,
        fee: newInvoice.amount,
        commissionAmount: commAmt,
        doctorNetShare: netShare,
        status: 'Pending',
        razorpayOrderId: razorpayOrderId,
        items: [{ description: newInvoice.description, price: newInvoice.amount, quantity: 1 }],
        createdAt: new Date().toISOString()
      });
      
      await logAction({
        action: 'Create Invoice',
        entityType: 'Invoice',
        entityId: docRef.id,
        clinicId: profile?.clinicId,
        details: `Created invoice for ₹${newInvoice.amount}`
      });
      
      toast.success('Invoice created');
      const freshInv: Invoice = {
        id: docRef.id,
        patientId: newInvoice.patientId,
        doctorId: profile?.uid || '',
        clinicId: profile?.clinicId || '',
        amount: newInvoice.amount,
        fee: newInvoice.amount,
        commissionAmount: commAmt,
        doctorNetShare: netShare,
        status: 'Pending',
        razorpayOrderId: razorpayOrderId,
        items: [{ description: newInvoice.description, price: newInvoice.amount, quantity: 1 }],
        createdAt: new Date().toISOString()
      };
      setInvoices([freshInv, ...invoices]);
      setIsAdding(false);
    } catch (error) {
      toast.error('Failed to create invoice');
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6 h-full flex flex-col pb-20">
      {/* Billing & Inventory Tab-Switcher */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit border border-slate-200/50 shadow-sm shrink-0">
        <button
          onClick={() => setActiveBillingTab('billing')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all duration-300 ${
            activeBillingTab === 'billing'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <CreditCard size={14} />
          Counter Billing & Invoices
        </button>
        <button
          onClick={() => setActiveBillingTab('inventory')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all duration-300 ${
            activeBillingTab === 'inventory'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Package size={14} />
          Medicine Inventory & Stores
        </button>
      </div>

      {activeBillingTab === 'inventory' ? (
        <div className="flex-1 overflow-y-auto">
          <InventoryManager profile={profile} />
        </div>
      ) : (
        <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white p-4 lg:p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full">
             <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100 shrink-0">
               <ShieldCheck size={24} />
             </div>
             <div>
               <h3 className="font-bold text-slate-800 text-sm sm:text-base">Secure Gateway</h3>
               <p className="text-[10px] sm:text-sm text-slate-500">Collect consultation fees via Razorpay.</p>
             </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button 
              onClick={() => setShowConfig(true)}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <CreditCard size={14} />
              API Settings
            </button>
            <a 
              href="https://dashboard.razorpay.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all flex items-center gap-2"
            >
              <ExternalLink size={14} />
              Razorpay Dashboard
            </a>
            <button 
              onClick={() => setIsAdding(true)}
              className="flex-1 sm:flex-none px-6 py-3 sm:py-2 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap">
              <Plus size={18} />
              Create Invoice
            </button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Revenue</p>
          <p className="text-xl font-black text-slate-900">₹{invoices.filter(i => i.status === 'Paid').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Net Earnings</p>
          <p className="text-xl font-black text-emerald-600">₹{invoices.filter(i => i.status === 'Paid').reduce((acc, curr) => acc + (curr.doctorNetShare || curr.amount), 0).toLocaleString()}</p>
        </div>
      </div>

      <AnimatePresence>
        {showConfig && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Gateway Settings</h2>
                    <p className="text-xs text-slate-500 font-medium">Razorpay Configuration</p>
                  </div>
                </div>
                <button onClick={() => setShowConfig(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
                  <AlertCircle className="text-amber-600 shrink-0" size={18} />
                  <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                    Credentials are saved to your profile and used for generating UPI links and processed via our secure backend proxy.
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Key ID</label>
                    <input 
                      type="text"
                      placeholder="rzp_live_..."
                      value={gatewayConfig.keyId}
                      onChange={e => setGatewayConfig(prev => ({ ...prev, keyId: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Key Secret</label>
                    <input 
                      type="password"
                      placeholder="••••••••••••••••"
                      value={gatewayConfig.keySecret}
                      onChange={e => setGatewayConfig(prev => ({ ...prev, keySecret: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-mono text-sm"
                    />
                  </div>
                </div>
                <button 
                  onClick={async () => {
                    try {
                      if (!profile?.uid) return;
                      await updateDoc(doc(db, 'users', profile.uid), {
                        razorpayKeyId: gatewayConfig.keyId,
                        razorpayKeySecret: gatewayConfig.keySecret
                      });
                      toast.success('Gateway credentials saved securely');
                      setShowConfig(false);
                    } catch (e) {
                      toast.error('Failed to save settings');
                    }
                  }}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 uppercase tracking-widest text-xs"
                >
                  Save Configuration
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isAdding && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">New Invoice</h2>
                    <p className="text-xs text-slate-500 font-medium">Generate billing request</p>
                  </div>
                </div>
                <button onClick={() => setIsAdding(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreateOrder} className="p-6 space-y-6 overflow-y-auto">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Select Patient</label>
                  <select 
                    required
                    value={newInvoice.patientId}
                    onChange={e => setNewInvoice({ ...newInvoice, patientId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-emerald-500 font-bold text-slate-800 appearance-none"
                  >
                    <option value="">Choosing patient...</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>)}
                  </select>
                </div>
                
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Line Items</p>
                    <button type="button" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">+ Add Item</button>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-7">
                        <input 
                          type="text"
                          required
                          placeholder="Description"
                          value={newInvoice.description}
                          onChange={e => setNewInvoice({ ...newInvoice, description: e.target.value })}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none text-sm font-medium"
                        />
                      </div>
                      <div className="col-span-5">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                          <input 
                            type="number"
                            required
                            value={newInvoice.amount}
                            onChange={e => setNewInvoice({ ...newInvoice, amount: Number(e.target.value) })}
                            className="w-full pl-7 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-xl active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} />
                    Generate & Notify Patient
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {viewingInvoice && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Invoice #{viewingInvoice.id?.substring(0, 8).toUpperCase()}</h2>
                    <p className="text-xs text-slate-500 font-medium">Billed on {format(new Date(viewingInvoice.createdAt), 'dd MMM yyyy')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => exportInvoiceToPDF(viewingInvoice)}
                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                    title="Print/Download"
                  >
                    <Printer size={20} />
                  </button>
                  <button onClick={() => setViewingInvoice(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="p-8 space-y-8">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Patient Details</p>
                    <h3 className="text-xl font-bold text-slate-900">{patients.find(p => p.id === viewingInvoice.patientId)?.name}</h3>
                    <p className="text-sm text-slate-500">{patients.find(p => p.id === viewingInvoice.patientId)?.phone}</p>
                  </div>
                    <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                    <select 
                      value={viewingInvoice.status}
                      onChange={(e) => handleUpdateStatus(viewingInvoice.id!, e.target.value as Invoice['status'])}
                      className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest outline-none border-none cursor-pointer appearance-none ${
                        viewingInvoice.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 
                        viewingInvoice.status === 'Failed' ? 'bg-red-50 text-red-600' :
                        'bg-orange-50 text-orange-600'
                      }`}
                    >
                      <option value="Paid">Paid</option>
                      <option value="Pending">Pending</option>
                      <option value="Partially Paid">Partially Paid</option>
                      <option value="Failed">Failed</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="Refunded">Refunded</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-100">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {viewingInvoice.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-6 py-4 text-sm font-bold text-slate-700">{item.description}</td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">₹{item.price.toFixed(2)}</td>
                        </tr>
                      ))}
                      {viewingInvoice.commissionAmount && (
                        <tr>
                          <td className="px-6 py-4 text-xs font-medium text-red-500">Platform Commission ({((viewingInvoice.commissionAmount / viewingInvoice.amount) * 100).toFixed(0)}%)</td>
                          <td className="px-6 py-4 text-xs font-medium text-red-500 text-right">-₹{viewingInvoice.commissionAmount.toFixed(2)}</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-emerald-50/50">
                      <tr>
                        <td className="px-6 py-4 text-sm font-bold text-slate-500">Net Your Share</td>
                        <td className="px-6 py-4 text-xl font-black text-emerald-600 text-right">₹{(viewingInvoice.doctorNetShare || viewingInvoice.amount).toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {viewingInvoice.razorpayPaymentId && (
                  <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="text-emerald-500" size={20} />
                      <div>
                        <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest">Payment ID</p>
                        <p className="text-sm font-mono text-emerald-600">{viewingInvoice.razorpayPaymentId}</p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                      <CheckCircle2 size={16} />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
                <button 
                  onClick={() => exportInvoiceToPDF(viewingInvoice)}
                  className="flex-1 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl"
                >
                  <Download size={18} />
                  Download PDF
                </button>
                {viewingInvoice.status === 'Pending' && (
                  <button 
                    onClick={() => {
                      handlePayment(viewingInvoice.id!, viewingInvoice.amount);
                      setViewingInvoice(null);
                    }}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-xl"
                  >
                    <CreditCard size={18} />
                    Collect Now
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-4 lg:px-8 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <h3 className="font-bold text-slate-800 text-sm hidden lg:block">Transactions</h3>
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-3 sm:py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm font-medium"
              />
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-4 sm:pb-0 scrollbar-hide shrink-0">
            {['All', 'Paid', 'Pending', 'Partially Paid', 'Failed'].map(status => (
              <button 
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2.5 sm:py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all tap-target sm:min-h-0 ${
                  statusFilter === status 
                  ? 'bg-slate-900 text-white shadow-lg' 
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[400px] touch-scroll">
          {/* Mobile View: High-End Cards */}
          <div className="grid grid-cols-1 gap-4 sm:hidden p-4 pb-20">
            {filteredInvoices.map((inv) => {
              const patient = patients.find(p => p.id === inv.patientId);
              return (
                <div 
                  key={inv.id} 
                  onClick={() => setViewingInvoice(inv)}
                  className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm space-y-4 active:scale-[0.98] transition-transform relative overflow-hidden"
                >
                    <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full blur-3xl opacity-10 ${
                      inv.status === 'Paid' ? 'bg-emerald-500' : 
                      inv.status === 'Failed' ? 'bg-red-500' :
                      'bg-orange-500'
                    }`} />
                  
                  <div className="flex justify-between items-start relative">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shadow-inner shrink-0">
                        <FileText size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-[9px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">#{inv.id?.substring(0, 8).toUpperCase()}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 leading-tight truncate">{patient?.name || 'Loading...'}</h4>
                      </div>
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 
                      inv.status === 'Failed' ? 'bg-red-50 text-red-600' :
                      'bg-orange-50 text-orange-600'
                    }`}>
                      {inv.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Amount</p>
                      <p className="text-xl font-black text-slate-900">₹{inv.amount.toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                       {inv.status === 'Pending' ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePayment(inv.id!, inv.amount);
                          }}
                          className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-200 active:scale-95 transition-transform tap-target"
                        >
                          PAY
                        </button>
                      ) : (
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full shadow-sm">
                          <CheckCircle2 size={24} />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold bg-slate-50/50 p-2 rounded-lg w-fit">
                    <Clock size={12} />
                    {format(new Date(inv.createdAt), 'dd MMM yyyy, hh:mm a')}
                  </div>
                </div>
              );
            })}
            {filteredInvoices.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 bg-white rounded-[2rem] border border-slate-100 italic">
                <AlertCircle size={48} className="opacity-10 mb-4" />
                <p className="text-sm font-bold text-slate-900">No transactions found</p>
              </div>
            )}
          </div>

          {/* Desktop View: Polished Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 lg:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Invoice</th>
                <th className="px-6 lg:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Patient</th>
                <th className="px-6 lg:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Amount</th>
                <th className="px-6 lg:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-6 lg:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                <th className="px-6 lg:px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredInvoices.map((inv) => {
                const patient = patients.find(p => p.id === inv.patientId);
                return (
                  <tr key={inv.id} className="hover:bg-slate-50/30 transition-all group">
                    <td className="px-6 lg:px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center font-bold text-xs ring-4 ring-white group-hover:ring-slate-100 transition-all shadow-sm">
                          <FileText size={16} />
                        </div>
                        <span className="font-mono text-[10px] text-slate-500 font-bold">#{inv.id?.substring(0, 8).toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="px-6 lg:px-8 py-5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{patient?.name || 'Loading...'}</span>
                        <ChevronRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </td>
                    <td className="px-6 lg:px-8 py-5">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 text-base">₹{inv.amount.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-400 font-medium">INR</span>
                      </div>
                    </td>
                    <td className="px-6 lg:px-8 py-5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        inv.status === 'Paid' 
                        ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200' 
                        : inv.status === 'Failed'
                        ? 'bg-red-50 text-red-600 ring-1 ring-red-200'
                        : 'bg-orange-50 text-orange-600 ring-1 ring-orange-200'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          inv.status === 'Paid' ? 'bg-emerald-500' : 
                          inv.status === 'Failed' ? 'bg-red-500' :
                          'bg-orange-500'
                        }`} />
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 lg:px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">{format(new Date(inv.createdAt), 'dd MMM, yyyy')}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{format(new Date(inv.createdAt), 'hh:mm a')}</span>
                      </div>
                    </td>
                    <td className="px-6 lg:px-8 py-5 text-right">
                      <div className="flex justify-end gap-1.5 lg:opacity-0 lg:group-hover:opacity-100 transition-all transform lg:translate-x-4 lg:group-hover:translate-x-0">
                        {inv.status === 'Pending' && (
                          <button 
                            onClick={() => handlePayment(inv.id!, inv.amount)}
                            className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100"
                          >
                            Pay
                          </button>
                        )}
                        <button 
                          onClick={() => exportInvoiceToPDF(inv)}
                          className="p-2 text-slate-400 hover:text-indigo-600 bg-white border border-slate-100 rounded-xl shadow-sm transition-all" 
                          title="Download Invoice"
                        >
                          <Download size={16} />
                        </button>
                        <button 
                          onClick={() => setViewingInvoice(inv)}
                          className="p-2 text-slate-400 hover:text-slate-900 bg-white border border-slate-100 rounded-xl shadow-sm transition-all" 
                          title="View Details"
                        >
                          <ExternalLink size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <AlertCircle size={48} className="opacity-10 mb-4" />
                      <p className="text-base font-bold text-slate-900">No transactions found</p>
                      <p className="text-sm text-slate-500 mt-1">Try adjusting your filters or search query.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </div>
    )}
  </div>
  );
}
