import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../lib/db';
import { logAction } from '../../lib/audit';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { toast } from 'sonner';
import { UserIcon, Plus, X, Shield, Star, Phone, Mail, Trash2, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../lib/i18n';

interface Doctor {
  id?: string;
  uid: string;
  name: string;
  email: string;
  specialty: string;
  phone: string;
  role: 'doctor';
  status: 'active' | 'inactive';
  fees: number;
  photoURL?: string;
}

export default function DoctorManager() {
  const { t } = useLanguage();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Doctor | null>(null);

  const [formData, setFormData] = useState<Partial<Doctor>>({
    name: '',
    email: '',
    specialty: '',
    phone: '',
    fees: 500,
    status: 'active'
  });

  const fetchData = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'doctor'));
      const snap = await getDocs(q);
      setDoctors(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doctor)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDoc) {
        await updateDoc(doc(db, 'users', editingDoc.id!), formData);
        await logAction({
          action: 'Update Doctor Details',
          entityType: 'Patient', // Using Patient for generic user management if needed
          entityId: editingDoc.id,
          details: `Updated info for Dr. ${formData.name}`
        });
        toast.success('Consultant details updated');
      } else {
        // In a real app, this would also create a Firebase Auth user
        // For this app, we'll just add the profile to the users collection
        const docRef = await addDoc(collection(db, 'users'), {
          ...formData,
          role: 'doctor',
          createdAt: new Date().toISOString()
        });
        await logAction({
          action: 'Register Consultant',
          entityType: 'Patient',
          entityId: docRef.id,
          details: `Registered Dr. ${formData.name} as a consultant`
        });
        toast.success('New consultant registered');
      }
      setIsAdding(false);
      setEditingDoc(null);
      setFormData({ name: '', email: '', specialty: '', phone: '', fees: 500, status: 'active' });
      fetchData();
    } catch (error) {
       handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  };

  const toggleStatus = async (doctor: Doctor) => {
    try {
      const newStatus = doctor.status === 'active' ? 'inactive' : 'active';
      await updateDoc(doc(db, 'users', doctor.id!), { status: newStatus });
      toast.success(`Consultant marked as ${newStatus}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 leading-tight">Consultant Management</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Multi-doctor practice sync</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-slate-900 text-white px-6 py-3 sm:py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-3 hover:bg-emerald-600 shadow-xl active:scale-95 transition-all"
        >
          <Plus size={18} /> Add Consultant
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {doctors.map((doctor) => (
          <div key={doctor.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative group overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1">
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 overflow-hidden">
                {doctor.photoURL ? (
                  <img src={doctor.photoURL} alt={doctor.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon size={32} />
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => { setEditingDoc(doctor); setFormData(doctor); setIsAdding(true); }}
                  className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-lg hover:bg-indigo-50"
                >
                  <Edit3 size={16} />
                </button>
                <button 
                  onClick={async () => {
                    if(confirm('Revoke consultant access?')) {
                      await deleteDoc(doc(db, 'users', doctor.id!));
                      fetchData();
                    }
                  }}
                  className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 rounded-lg hover:bg-red-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900">Dr. {doctor.name}</h3>
                {doctor.status === 'active' && <Shield size={14} className="text-emerald-500" />}
              </div>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{doctor.specialty || 'General Practitioner'}</p>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <Mail size={14} /> {doctor.email}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <Phone size={14} /> {doctor.phone}
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-slate-900 bg-slate-50 p-2 rounded-xl">
                 <Star size={14} className="text-yellow-500 fill-yellow-500" />
                 Registration Fee: ₹{doctor.fees}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${doctor.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                <span className={`text-[10px] font-bold uppercase ${doctor.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>{doctor.status}</span>
              </div>
              <button 
                onClick={() => toggleStatus(doctor)}
                className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border transition-all ${doctor.status === 'active' ? 'text-red-500 border-red-100 hover:bg-red-50' : 'text-emerald-500 border-emerald-100 hover:bg-emerald-50'}`}
              >
                {doctor.status === 'active' ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 className="text-lg font-bold text-slate-800">{editingDoc ? 'Edit Consultant' : 'Add New Consultant'}</h2>
                <button onClick={() => { setIsAdding(false); setEditingDoc(null); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Consultant Name</label>
                    <input 
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Dr. Full Name"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Specialty</label>
                      <input 
                        required
                        value={formData.specialty}
                        onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                        placeholder="Homeopath"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Fees (₹)</label>
                      <input 
                        type="number"
                        required
                        value={formData.fees}
                        onChange={e => setFormData({ ...formData, fees: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Email Address</label>
                    <input 
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Phone Number</label>
                    <input 
                      required
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm"
                    />
                  </div>
                </div>
                <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-emerald-600 shadow-xl transition-all mt-4 uppercase tracking-wider text-sm active:scale-95">
                  Register Professional
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
