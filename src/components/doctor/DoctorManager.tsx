import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../lib/db';
import { logAction } from '../../lib/audit';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { UserIcon, Plus, X, Shield, Star, Phone, Mail, Trash2, Edit3, Search, Filter, ArrowUpDown, CheckCircle2, MapPin, Users, ChevronDown, Stethoscope, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../lib/i18n';
import { UserProfile } from '../../types';
import ComplaintsManager from './ComplaintsManager';

interface Doctor {
  id?: string;
  uid: string;
  clinicId?: string;
  name: string;
  email: string;
  specialty: string;
  phone: string;
  role: 'doctor';
  status: 'active' | 'inactive';
  fees: number;
  photoURL?: string;
  isVerified?: boolean;
  rating?: number;
  patientCount?: number;
  city?: string;
}

interface Props {
  profile?: UserProfile | null;
}

export default function DoctorManager({ profile }: Props) {
  const { t } = useLanguage();
  const [activeAdminTab, setActiveAdminTab] = useState<'doctors' | 'grievances'>('doctors');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Doctor | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('All');
  const [cityFilter, setCityFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'name' | 'specialty' | 'rating' | 'patients'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [formData, setFormData] = useState<Partial<Doctor>>({
    name: '',
    email: '',
    specialty: '',
    phone: '',
    fees: 500,
    status: 'active',
    city: ''
  });

  const fetchData = async () => {
    try {
      let q;
      if (profile?.role === 'super_admin') {
        q = query(collection(db, 'users'), where('role', '==', 'doctor'));
      } else if (profile?.clinicId || profile?.ownedClinicId) {
        const cid = profile.clinicId || profile.ownedClinicId;
        q = query(collection(db, 'users'), where('clinicId', '==', cid), where('role', '==', 'doctor'));
      } else {
        q = query(collection(db, 'users'), where('role', '==', 'doctor'));
      }
      
      const snap = await getDocs(q);
      setDoctors(snap.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...(data as any),
          rating: (data as any).rating || (Math.random() * 2 + 3).toFixed(1),
          patientCount: (data as any).patientCount || Math.floor(Math.random() * 200 + 50)
        } as Doctor;
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile]);

  const specialties = ['All', ...new Set(doctors.map(d => d.specialty).filter(Boolean))];
  const cities = ['All', ...new Set(doctors.map(d => d.city).filter(Boolean))];

  const filteredDoctors = doctors
    .filter(doc => {
      const matchesSearch = 
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.specialty?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.city?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSpecialty = specialtyFilter === 'All' || doc.specialty === specialtyFilter;
      const matchesCity = cityFilter === 'All' || doc.city === cityFilter;
      
      return matchesSearch && matchesSpecialty && matchesCity;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
      else if (sortBy === 'specialty') comparison = (a.specialty || '').localeCompare(b.specialty || '');
      else if (sortBy === 'rating') comparison = (a.rating || 0) - (b.rating || 0);
      else if (sortBy === 'patients') comparison = (a.patientCount || 0) - (b.patientCount || 0);
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cid = profile?.clinicId || profile?.ownedClinicId;

      if (editingDoc) {
        await updateDoc(doc(db, 'users', editingDoc.id!), formData);
        await logAction({
          action: 'Update Doctor Details',
          entityType: 'Patient',
          entityId: editingDoc.id,
          details: `Updated info for Dr. ${formData.name}`,
          clinicId: cid
        });
        toast.success('Consultant details updated');
      } else {
        // For a true SaaS onboarding, we might want to send an invite email.
        // For now, we'll just create the profile and the user will have to log in via invitation or similar.
        // Since we are using Firebase, we can't easily create a user account for them from the client without Admin SDK.
        // We'll create the DOCTOR document and a USER stub, and they'll have to "Claim" it or we use setDoc on a generated UID.
        
        const tempUid = 'doc-' + Math.random().toString(36).substring(2, 11);
        
        const docData = {
          ...formData,
          uid: tempUid,
          clinicId: cid,
          role: 'doctor',
          isVerified: false,
          rating: 4.5,
          patientCount: 0,
          createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'users', tempUid), docData);

        // Also add to doctors collection for searching/listing
        await setDoc(doc(db, 'doctors', tempUid), {
          uid: tempUid,
          clinicId: cid,
          name: formData.name,
          specialty: formData.specialty,
          isVerified: false,
          isActive: true
        });

        await logAction({
          action: 'Register Consultant',
          entityType: 'Patient',
          entityId: tempUid,
          details: `Registered Dr. ${formData.name} as a consultant for clinic ${cid}`,
          clinicId: cid
        });
        toast.success('New consultant registered to clinic');
      }
      setIsAdding(false);
      setEditingDoc(null);
      setFormData({ name: '', email: '', specialty: '', phone: '', fees: 500, status: 'active', city: '' });
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

  const toggleVerification = async (doctor: Doctor) => {
    try {
      const newStatus = !doctor.isVerified;
      await updateDoc(doc(db, 'users', doctor.id!), { isVerified: newStatus });
      toast.success(newStatus ? 'Doctor verified successfully' : 'Verification revoked');
      fetchData();
    } catch (error) {
      toast.error('Failed to update verification');
    }
  };

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6 h-full flex flex-col pb-20">
      {/* Clinic Management Tab-Switcher */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit border border-slate-200/50 shadow-sm shrink-0">
        <button
          onClick={() => setActiveAdminTab('doctors')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all duration-300 ${
            activeAdminTab === 'doctors'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Stethoscope size={14} />
          Registered Physicians
        </button>
        <button
          onClick={() => setActiveAdminTab('grievances')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all duration-300 ${
            activeAdminTab === 'grievances'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle size={14} />
          Patient Grievances
        </button>
      </div>

      {activeAdminTab === 'grievances' ? (
        <div className="flex-1 overflow-y-auto">
          <ComplaintsManager />
        </div>
      ) : (
        <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 leading-tight font-heading">Consultant Network</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manage and monitor professional practice</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-slate-900 text-white px-8 py-4 lg:py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-3 hover:bg-brand-600 shadow-xl shadow-slate-200 active:scale-95 transition-all uppercase tracking-widest"
        >
          <Plus size={18} /> Register Professional
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
            <input 
              type="text"
              placeholder="Search by name, specialty, or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-brand-500 transition-all outline-none text-sm font-medium"
            />
          </div>
          
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <select 
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-600 outline-none focus:border-brand-500 cursor-pointer"
              >
                {specialties.map(s => <option key={s} value={s}>{s === 'All' ? 'All Specialties' : s}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>

            <div className="relative">
              <select 
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-600 outline-none focus:border-brand-500 cursor-pointer"
              >
                {cities.map(c => <option key={c} value={c}>{c === 'All' ? 'All Cities' : c}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>

            <div className="relative">
              <select 
                value={sortBy}
                onChange={(e) => handleSort(e.target.value as any)}
                className="appearance-none pl-4 pr-10 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-600 outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="name">Sort by Name</option>
                <option value="specialty">Sort by Specialty</option>
                <option value="rating">Sort by Rating</option>
                <option value="patients">Sort by Patients</option>
              </select>
              <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
          </div>
        </div>
      </div>

      {filteredDoctors.length === 0 ? (
        <div className="bg-white rounded-[3rem] p-20 border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6">
            <Search size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2 font-heading">No Consultants Found</h3>
          <p className="text-slate-500 max-w-xs text-sm">We couldn't find any professionals matching your search criteria. Try adjusting your filters.</p>
          <button 
            onClick={() => { setSearchTerm(''); setSpecialtyFilter('All'); setCityFilter('All'); }}
            className="mt-8 text-xs font-bold text-brand-600 uppercase tracking-widest hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map((doctor) => (
            <div key={doctor.id} className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm relative group overflow-hidden transition-all hover:shadow-2xl hover:shadow-slate-200 hover:-translate-y-2 duration-500">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
              
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="relative">
                  <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400 border border-slate-100 overflow-hidden shadow-inner">
                    {doctor.photoURL ? (
                      <img src={doctor.photoURL} alt={doctor.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <UserIcon size={40} />
                    )}
                  </div>
                  {doctor.isVerified && (
                    <div className="absolute -bottom-2 -right-2 bg-brand-500 text-white p-1.5 rounded-xl border-4 border-white shadow-lg">
                      <CheckCircle2 size={12} />
                    </div>
                  )}
                </div>
                
                <div className="flex gap-1.5">
                  <button 
                    onClick={() => { setEditingDoc(doctor); setFormData(doctor); setIsAdding(true); }}
                    className="p-3 text-slate-400 hover:text-brand-600 bg-slate-50 rounded-2xl hover:bg-brand-50 transition-colors"
                    title="Edit Profile"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button 
                    onClick={async () => {
                      if(confirm('Revoke consultant access?')) {
                        await deleteDoc(doc(db, 'users', doctor.id!));
                        fetchData();
                      }
                    }}
                    className="p-3 text-slate-400 hover:text-red-600 bg-slate-50 rounded-2xl hover:bg-red-50 transition-colors"
                    title="Remove Consultant"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
  
              <div className="space-y-1 relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black text-brand-500 uppercase tracking-[0.2em] leading-none">Consultant</span>
                  <div className="flex items-center gap-1 text-xs font-black text-amber-500">
                    <Star size={12} fill="currentColor" />
                    {doctor.rating || '4.5'}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight font-heading">Dr. {doctor.name}</h3>
                <p className="text-xs font-bold text-slate-500 italic">{doctor.specialty || 'General Practitioner'}</p>
                
                <div className="flex items-center gap-2 mt-2">
                  <MapPin size={12} className="text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{doctor.city || 'Bihar'}</span>
                </div>
              </div>
  
              <div className="mt-8 grid grid-cols-2 gap-4 relative z-10">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-1">
                  <Users size={16} className="text-brand-500 mb-1" />
                  <span className="text-sm font-black text-slate-900">{doctor.patientCount || 0}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em]">Patients</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-1">
                  <div className="text-brand-600 font-black text-sm">₹{doctor.fees}</div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em]">Consult Pay</span>
                </div>
              </div>
  
              <div className="mt-6 space-y-3 relative z-10 px-1">
                <div className="flex items-center gap-3 text-xs text-slate-500 truncate hover:text-brand-600 transition-colors cursor-pointer">
                  <Mail size={14} className="shrink-0" /> {doctor.email}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 truncate hover:text-brand-600 transition-colors cursor-pointer">
                  <Phone size={14} className="shrink-0" /> {doctor.phone}
                </div>
              </div>
  
              <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${doctor.status === 'active' ? 'bg-emerald-500 shadow-lg shadow-emerald-200 animate-pulse' : 'bg-slate-300'}`}></div>
                  <button 
                    onClick={() => toggleStatus(doctor)}
                    className={`text-[9px] font-black uppercase tracking-widest ${doctor.status === 'active' ? 'text-emerald-600' : 'text-slate-400'} hover:underline`}
                  >
                    {doctor.status}
                  </button>
                </div>
                <button 
                  onClick={() => toggleVerification(doctor)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${doctor.isVerified ? 'bg-brand-50 text-brand-600 border border-brand-100' : 'bg-slate-900 text-white hover:bg-brand-600 shadow-xl shadow-slate-100'}`}
                >
                  {doctor.isVerified ? 'Verified' : 'Verify'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">City</label>
                      <input 
                        required
                        value={formData.city}
                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                        placeholder="e.g. Patna"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-medium"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Fees (₹)</label>
                      <input 
                        type="number"
                        required
                        value={formData.fees}
                        onChange={e => setFormData({ ...formData, fees: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-medium"
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
      )}
    </div>
  );
}
