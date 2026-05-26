import { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/db';
import { logAction } from '../../lib/audit';
import { collection, getDocs, addDoc, updateDoc, doc, query, where, orderBy, writeBatch } from 'firebase/firestore';
import { toast } from 'sonner';
import { Patient, InventoryItem, UserProfile } from '../../types';
import { X, Search, Plus, Trash2, ShieldCheck, CreditCard, Sparkles, ShoppingBag, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QuickBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
}

export default function QuickBillModal({ isOpen, onClose, profile }: QuickBillModalProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Quick Bill Form State
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [searchPatient, setSearchPatient] = useState('');
  const [searchMedicine, setSearchMedicine] = useState('');
  const [billItems, setBillItems] = useState<{ description: string; price: number; quantity: number; inventoryItemId?: string }[]>([]);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState(0);
  const [customItemQty, setCustomItemQty] = useState(1);
  const [isCash, setIsCash] = useState(true); // Default payment mode Cash / Direct
  const [status, setStatus] = useState<'Paid' | 'Pending'>('Paid');
  const [consultationFee, setConsultationFee] = useState(profile?.consultationFee || 500);
  const [includeConsultation, setIncludeConsultation] = useState(true);

  // Fetch Patients and Inventory
  useEffect(() => {
    if (!isOpen || !profile?.clinicId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Patients
        const patSnap = await getDocs(
          query(collection(db, 'patients'), where('clinicId', '==', profile.clinicId))
        );
        setPatients(patSnap.docs.map(d => ({ id: d.id, ...d.data() } as Patient)));

        // Fetch Inventory
        const invSnap = await getDocs(
          query(collection(db, 'inventory'), where('clinicId', '==', profile.clinicId), orderBy('name', 'asc'))
        );
        setInventory(invSnap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem)));
      } catch (err) {
        console.error("Error fetching Quick Bill resources:", err);
        toast.error("Failed to load inventory or patients");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, profile?.clinicId, profile?.consultationFee]);

  // Filter Patients
  const filteredPatients = useMemo(() => {
    if (!searchPatient.trim()) return [];
    return patients.filter(p => 
      p.name.toLowerCase().includes(searchPatient.toLowerCase()) || 
      p.phone.includes(searchPatient) ||
      (p.khcId && p.khcId.toLowerCase().includes(searchPatient.toLowerCase()))
    ).slice(0, 5);
  }, [patients, searchPatient]);

  // Filter Inventory Remedies
  const filteredInventory = useMemo(() => {
    if (!searchMedicine.trim()) return [];
    return inventory.filter(item => 
      item.name.toLowerCase().includes(searchMedicine.toLowerCase()) ||
      item.category.toLowerCase().includes(searchMedicine.toLowerCase())
    ).slice(0, 5);
  }, [inventory, searchMedicine]);

  // Select Patient
  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatientId(patient.id || '');
    setSearchPatient(`${patient.name} (${patient.khcId || patient.phone})`);
  };

  // Add Item to Bill
  const handleAddInventoryItem = (item: InventoryItem) => {
    if (item.stockLevel <= 0) {
      toast.warning(`${item.name} is out of stock!`);
    }

    const existingIndex = billItems.findIndex(bi => bi.inventoryItemId === item.id);
    if (existingIndex > -1) {
      const updated = [...billItems];
      if (updated[existingIndex].quantity >= item.stockLevel) {
        toast.warning(`Cannot add more than available stock (${item.stockLevel})`);
        return;
      }
      updated[existingIndex].quantity += 1;
      setBillItems(updated);
    } else {
      setBillItems([...billItems, {
        description: `${item.name} (${item.category})`,
        price: item.price || 150,
        quantity: 1,
        inventoryItemId: item.id
      }]);
    }
    setSearchMedicine('');
    toast.success(`Added ${item.name}`);
  };

  const handleAddCustomItem = () => {
    if (!customItemName.trim() || customItemPrice <= 0) {
      toast.error("Enter valid item details");
      return;
    }
    setBillItems([...billItems, {
      description: customItemName,
      price: Number(customItemPrice),
      quantity: Number(customItemQty)
    }]);
    setCustomItemName('');
    setCustomItemPrice(0);
    setCustomItemQty(1);
    toast.success("Added item to list");
  };

  const handleRemoveItem = (index: number) => {
    setBillItems(billItems.filter((_, i) => i !== index));
  };

  // Calculate Subtotals
  const itemsTotal = useMemo(() => {
    return billItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }, [billItems]);

  const finalTotal = useMemo(() => {
    let tot = itemsTotal;
    if (includeConsultation) {
      tot += Number(consultationFee);
    }
    return tot;
  }, [itemsTotal, includeConsultation, consultationFee]);

  // Write Invoice and update stocks
  const handleCreateCounterBill = async () => {
    if (!selectedPatientId) {
      toast.error('Please search and select a patient first');
      return;
    }

    if (finalTotal <= 0) {
      toast.error('Bill total must be greater than zero');
      return;
    }

    // Verify stock levels before attempting deduction
    for (const item of billItems) {
      if (item.inventoryItemId) {
        const invItem = inventory.find(i => i.id === item.inventoryItemId);
        if (invItem && invItem.stockLevel < item.quantity) {
          toast.error(`Insufficient stock for ${invItem.name}. Available: ${invItem.stockLevel}`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      const dbBatch = writeBatch(db);
      
      // 1. Prepare invoice items array
      const finalItems = [];
      if (includeConsultation) {
        finalItems.push({
          description: "Consultation Fee",
          price: Number(consultationFee),
          quantity: 1
        });
      }
      
      billItems.forEach(item => {
        finalItems.push({
          description: item.description,
          price: item.price,
          quantity: item.quantity
        });
      });

      // 2. Add Invoice document
      const commRate = profile?.commissionRate || 10;
      const commAmt = (finalTotal * commRate) / 100;
      const netShare = finalTotal - commAmt;
      
      const invoiceData = {
        patientId: selectedPatientId,
        doctorId: profile?.uid || '',
        clinicId: profile?.clinicId || '',
        amount: finalTotal,
        fee: finalTotal,
        commissionAmount: commAmt,
        doctorNetShare: netShare,
        status: status, // Paid or Pending
        paymentMode: isCash ? 'Cash/Counter' : 'Razorpay/Online',
        items: finalItems,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'invoices'), invoiceData);

      // 3. Update stock levels in batch
      for (const item of billItems) {
        if (item.inventoryItemId) {
          const itemDocRef = doc(db, 'inventory', item.inventoryItemId);
          const currentStock = inventory.find(i => i.id === item.inventoryItemId)?.stockLevel || 0;
          const newStock = Math.max(0, currentStock - item.quantity);
          
          await updateDoc(itemDocRef, {
            stockLevel: newStock,
            lastUpdated: new Date().toISOString()
          });
        }
      }

      // Log action
      await logAction({
        action: 'Direct Counter Bill',
        entityType: 'Invoice',
        entityId: docRef.id,
        clinicId: profile?.clinicId,
        details: `Generated counter invoice for ₹${finalTotal} with stock deduction`
      });

      toast.success('Counter bill generated & stocks updated!');
      
      // Clear forms
      setSelectedPatientId('');
      setSearchPatient('');
      setBillItems([]);
      onClose();
    } catch (err: any) {
      console.error("Quick Billing Error:", err);
      toast.error(err.message || 'Error executing direct counter bill');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <ShoppingBag size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Direct Counter Billing Window</h2>
                <p className="text-xs text-emerald-100 font-medium">Lightning-Fast Ticket Generation & Stocks Deduction</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Selection Form */}
            <div className="space-y-6">
              {/* Patient Selector */}
              <div className="space-y-2 relative">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Patients Search
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400">
                    <Search size={18} />
                  </span>
                  <input
                    type="text"
                    value={searchPatient}
                    onChange={(e) => {
                      setSearchPatient(e.target.value);
                      if (selectedPatientId) setSelectedPatientId('');
                    }}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-emerald-500 font-medium text-slate-700 text-sm transition-all shadow-sm"
                    placeholder="Type name, phone or KHC code..."
                  />
                  {selectedPatientId && (
                    <span className="absolute right-4 top-4 w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  )}
                </div>

                {/* Dropdown patients selection */}
                {filteredPatients.length > 0 && !selectedPatientId && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {filteredPatients.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPatient(p)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between text-sm transition-all"
                      >
                        <span className="font-bold text-slate-800">{p.name}</span>
                        <span className="text-xs font-bold font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          {p.khcId || p.phone}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Consultation Option */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="incCons"
                      checked={includeConsultation} 
                      onChange={(e) => setIncludeConsultation(e.target.checked)}
                      className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                    />
                    <label htmlFor="incCons" className="text-sm font-bold text-slate-700 cursor-pointer">
                      Include Consultation Fee
                    </label>
                  </div>
                  {includeConsultation && (
                    <input 
                      type="number"
                      value={consultationFee}
                      onChange={(e) => setConsultationFee(Number(e.target.value))}
                      className="w-24 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-right font-bold text-sm text-slate-800"
                    />
                  )}
                </div>
              </div>

              {/* Medicine Pharmacy Search */}
              <div className="space-y-2 relative">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Search active pharmacy inventory
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400">
                    <Search size={18} />
                  </span>
                  <input
                    type="text"
                    value={searchMedicine}
                    onChange={(e) => setSearchMedicine(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-emerald-500 font-medium text-slate-700 text-sm transition-all shadow-sm"
                    placeholder="Search medicine, tincture..."
                  />
                </div>

                {filteredInventory.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {filteredInventory.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleAddInventoryItem(item)}
                        disabled={item.stockLevel <= 0}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between text-sm transition-all disabled:opacity-50"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{item.name}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{item.category} • {item.stockLevel} units remaining</p>
                        </div>
                        <span className="text-xs font-bold text-emerald-600 font-mono bg-emerald-50 px-2 py-0.5 rounded-full">
                          ₹{item.price}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Item Form */}
              <div className="p-4 border border-dashed border-slate-200 rounded-2xl space-y-3">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Custom Entry</p>
                <div className="grid grid-cols-3 gap-2">
                  <input 
                    type="text" 
                    placeholder="Item Name" 
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    className="col-span-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-700 font-medium"
                  />
                  <input 
                    type="number" 
                    placeholder="Price (₹)" 
                    value={customItemPrice || ''}
                    onChange={(e) => setCustomItemPrice(Number(e.target.value))}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-700 font-bold"
                  />
                </div>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    placeholder="Qty" 
                    value={customItemQty}
                    onChange={(e) => setCustomItemQty(Number(e.target.value))}
                    className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    min="1"
                  />
                  <button 
                    type="button"
                    onClick={handleAddCustomItem}
                    className="flex-1 py-2 bg-slate-900 leading-none text-white font-bold rounded-lg text-xs tracking-wider uppercase hover:bg-slate-800 transition-all flex items-center justify-center gap-1"
                  >
                    <Plus size={14} /> Add Item
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Ticket Summary & Check-out */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/60 flex flex-col justify-between max-h-[60vh] md:max-h-full overflow-y-auto">
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">COUNTER BILL SUMMARY</h3>
                
                {/* Invoice Items list */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {includeConsultation && (
                    <div className="flex items-center justify-between text-sm py-2 px-3 bg-white rounded-xl border border-slate-200">
                      <div>
                        <p className="font-bold text-slate-800">Consultation Fee</p>
                        <p className="text-[10px] text-slate-400">Regular clinical visit</p>
                      </div>
                      <span className="font-bold text-slate-800">₹{consultationFee}</span>
                    </div>
                  )}

                  {billItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm py-2 px-3 bg-white rounded-xl border border-slate-200 relative group">
                      <div>
                        <p className="font-bold text-slate-800">{item.description}</p>
                        <p className="text-[10px] text-slate-400">Qty: {item.quantity} × ₹{item.price}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">₹{item.price * item.quantity}</span>
                        <button 
                          onClick={() => handleRemoveItem(index)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {!includeConsultation && billItems.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                      <p className="text-xs font-bold uppercase tracking-wider">No Items Selected</p>
                      <p className="text-[10px] text-slate-400 mt-1">Start by searching a patient and adding remedies.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Total & Check-out settings */}
              <div className="border-t border-slate-200 mt-6 pt-6 space-y-4">
                <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Estimated Total Due</span>
                  <span className="text-2xl font-black text-emerald-800">₹{finalTotal}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Payment Mode</label>
                    <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl">
                      <button 
                        type="button" 
                        onClick={() => setIsCash(true)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${isCash ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                        Cash
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setIsCash(false)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${!isCash ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                        Online
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Invoice Status</label>
                    <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl">
                      <button 
                        type="button" 
                        onClick={() => setStatus('Paid')}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${status === 'Paid' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                        Paid
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setStatus('Pending')}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${status === 'Pending' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                        Pending
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCreateCounterBill}
                  disabled={loading || !selectedPatientId || finalTotal <= 0}
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Deducting Stock & Syncing...' : 'Generate Invoice & Deduct stock'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
