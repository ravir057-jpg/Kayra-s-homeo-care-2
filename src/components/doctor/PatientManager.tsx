import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  UserPlus, 
  Users,
  Phone, 
  Mail, 
  Edit2,
  Trash2,
  X,
  Calendar,
  User as UserIcon,
  Filter,
  CreditCard,
  History,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Activity,
  Brain,
  FilePlus,
  CalendarPlus
} from 'lucide-react';
import { db, handleFirestoreError, OperationType, auth } from '../../lib/db';
import { logAction } from '../../lib/audit';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Patient, UserProfile } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../lib/i18n';
import PatientModal from './PatientModal';
import PatientBillingHistory from './PatientBillingHistory';
import PatientActivityLog from './PatientActivityLog';
import SymptomViewer from './SymptomViewer';
import PatientAIAnalyzer from './PatientAIAnalyzer';

export default function PatientManager() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [viewingBilling, setViewingBilling] = useState<Patient | null>(null);
  const [viewingLog, setViewingLog] = useState<Patient | null>(null);
  const [viewingSymptom, setViewingSymptom] = useState<Patient | null>(null);
  const [analyzingPatient, setAnalyzingPatient] = useState<Patient | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<UserProfile | null>(null);
  
  const [formData, setFormData] = useState<Partial<Patient>>({
    patientId: '',
    name: '',
    phone: '',
    email: '',
    dob: '',
    gender: 'Male',
    address: '',
    medicalHistory: ''
  });

  const generatePatientId = () => {
    const characters = '0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return `KHC-${result}`;
  };

  const fetchPatients = async () => {
    try {
      const q = query(collection(db, 'patients'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
      setPatients(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'patients');
    }
  };

  useEffect(() => {
    fetchPatients();
    const fetchDocProfile = async () => {
      if (auth.currentUser) {
        const d = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (d.exists()) setDoctorProfile(d.data() as UserProfile);
      }
    };
    fetchDocProfile();
  }, []);

  const handleOpenAddModal = () => {
    setFormData({
      patientId: generatePatientId(),
      name: '',
      phone: '',
      email: '',
      dob: '',
      gender: 'Male',
      address: '',
      medicalHistory: ''
    });
    setIsAdding(true);
  };

  const handleSubmitForm = async (data: Partial<Patient>) => {
    try {
      if (editingPatient) {
        const docRef = doc(db, 'patients', editingPatient.id!);
        await updateDoc(docRef, data);
        await logAction({
          action: 'Update Patient',
          entityType: 'Patient',
          entityId: editingPatient.id,
          details: `Updated info for ${data.name}`
        });
        toast.success(t('patient_updated') || 'Patient updated');
      } else {
        const docRef = await addDoc(collection(db, 'patients'), {
          ...data,
          createdAt: new Date().toISOString()
        });
        await logAction({
          action: 'Create Patient',
          entityType: 'Patient',
          entityId: docRef.id,
          details: `Registered new patient: ${data.name} (ID: ${data.patientId})`
        });
        toast.success(t('patient_registered') || 'Patient registered');
      }
      setIsAdding(false);
      setEditingPatient(null);
      setFormData({ patientId: '', name: '', phone: '', email: '', dob: '', gender: 'Male', address: '', medicalHistory: '' });
      fetchPatients();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'patients');
    }
  };

  const isDataVerified = (p: Patient) => {
    // Essential fields: name, phone, DOB, address
    return !!(p.name?.trim() && p.phone?.trim() && p.dob && p.address?.trim());
  };

  const handleToggleVerification = async (p: Patient) => {
    if (!isDataVerified(p)) {
      toast.error('Essential data missing. Please complete name, phone, DOB and address.');
      return;
    }

    try {
      const newStatus = !p.isVerified;
      await updateDoc(doc(db, 'patients', p.id!), { 
        isVerified: newStatus,
        verifiedAt: newStatus ? new Date().toISOString() : null
      });
      
      await logAction({
        action: newStatus ? 'Verified Patient' : 'Revoked Verification',
        entityType: 'Patient',
        entityId: p.id,
        details: newStatus 
          ? `Identity verified for ${p.name}. Essential fields validated.` 
          : `Verification revoked for ${p.name}.`,
        severity: newStatus ? 'info' : 'warning'
      });
      
      if (newStatus) {
        toast.success(`Success! ${p.name}'s record is now verified.`, {
          icon: <ShieldCheck className="text-emerald-500" size={18} />,
          duration: 3000
        });
      } else {
        toast.message('Verification revoked');
      }
      
      fetchPatients();
    } catch (error) {
      toast.error('Failed to update verification status');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'patients', id));
      await logAction({
        action: 'Permanent Deletion',
        entityType: 'Patient',
        entityId: id,
        details: `Deleted patient with ID: ${id}. IRREVERSIBLE ACTION.`,
        severity: 'critical'
      });
      toast.success('Patient record permanently deleted');
      setPatientToDelete(null);
      fetchPatients();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `patients/${id}`);
    }
  };

  const filteredPatients = patients.filter(p => {
    const s = search.toLowerCase();
    return (
      (p.name?.toLowerCase().includes(s)) || 
      (p.phone?.includes(s)) ||
      (p.mobileNumber?.includes(s)) ||
      (p.patientId?.toLowerCase().includes(s)) ||
      (p.id?.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-4 lg:space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder={t('search_patients') || 'Search patients...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-3 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 px-6 py-3 sm:py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-lg active:scale-95"
        >
          <UserPlus size={16} />
          <span>{t('add_patient')}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar touch-scroll -mx-4 sm:mx-0">
        {/* Mobile View: High-End Cards */}
        <div className="grid grid-cols-1 gap-4 sm:hidden p-4 pb-20">
          <AnimatePresence mode="popLayout">
            {filteredPatients.map((p, index) => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                key={p.id} 
                className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm active:scale-[0.98] transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg shadow-inner shrink-0">
                      {p.name.substring(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 text-base leading-tight truncate">{p.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-400 font-mono tracking-tight">{p.patientId || 'No ID'}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black tracking-widest uppercase shrink-0">Active</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button 
                      onClick={() => setAnalyzingPatient(p)}
                      className="tap-target text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                      title="AI clinical Diagnosis"
                    >
                      <Brain size={18} />
                    </button>
                    <button 
                      onClick={() => setViewingSymptom(p)}
                      className="tap-target text-slate-400 hover:text-indigo-600 active:bg-indigo-50 rounded-xl transition-colors"
                      title="Symptom Tracker"
                    >
                      <Activity size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
                  {p.isVerified ? (
                    <motion.div 
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[9px] font-black uppercase tracking-widest shadow-sm shrink-0"
                    >
                      <ShieldCheck size={10} /> Verified
                    </motion.div>
                  ) : (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleToggleVerification(p); }}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest cursor-pointer transition-all active:scale-95 shrink-0 ${
                        isDataVerified(p) 
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-200 hover:bg-indigo-700 animate-pulse-subtle' 
                          : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}
                    >
                      {isDataVerified(p) ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                      {isDataVerified(p) ? 'Ready to Verify' : 'Data Missing'}
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 shadow-sm shrink-0">
                      <Phone size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Contact</p>
                      <p className="text-sm text-slate-700 font-bold truncate">{p.phone}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 shadow-sm shrink-0">
                        <Calendar size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">DOB</p>
                        <p className="text-xs text-slate-700 font-bold truncate">
                          {p.dob ? format(new Date(p.dob), 'dd MMM yy') : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 shadow-sm shrink-0">
                        <UserIcon size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Gender</p>
                        <p className="text-xs text-slate-700 font-bold truncate">{p.gender}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end gap-2">
                   <button 
                      onClick={() => navigate('/prescriptions', { state: { patientId: p.id } })}
                      className="tap-target text-indigo-600 bg-indigo-50 px-3 py-2 rounded-xl flex items-center justify-center"
                      title="New Prescription"
                    >
                      <FilePlus size={18} />
                    </button>
                    <button 
                      onClick={() => navigate('/appointments', { state: { patientId: p.id, patientName: p.name } })}
                      className="tap-target text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl flex items-center justify-center"
                      title="Book Appointment"
                    >
                      <CalendarPlus size={18} />
                    </button>
                   <button 
                      onClick={() => setViewingLog(p)}
                      className="tap-target text-slate-400 hover:text-emerald-600 active:bg-emerald-50 rounded-xl transition-colors"
                      title="Activity Log"
                    >
                      <History size={18} />
                    </button>
                    <button 
                      onClick={() => { setEditingPatient(p); setFormData(p); setIsAdding(true); }}
                      className="tap-target text-slate-400 hover:text-indigo-600 active:bg-indigo-50 rounded-xl transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => setPatientToDelete(p)}
                      className="tap-target text-slate-400 hover:text-red-600 active:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {filteredPatients.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 text-center px-6">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                <Users size={32} className="opacity-20" />
              </div>
              <p className="text-lg font-bold text-slate-900 mb-2">No matches found</p>
              <p className="text-sm text-slate-500">Try adjusting your search terms or register a new patient to get started.</p>
            </div>
          )}
        </div>

        {/* Desktop View: Polished Data Grid */}
        <div className="hidden sm:block">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4">
                    <div className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      <UserIcon size={14} className="text-slate-300" />
                      {t('patient_profile')}
                    </div>
                  </th>
                  <th className="px-6 py-4">
                    <div className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      <Phone size={14} className="text-slate-300" />
                      {t('contact')}
                    </div>
                  </th>
                  <th className="px-6 py-4">
                    <div className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      <Calendar size={14} className="text-slate-300" />
                      {t('gender_age')}
                    </div>
                  </th>
                  <th className="px-6 py-4">
                    <div className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      <Filter size={14} className="text-slate-300" />
                      {t('status')}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t('actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence mode="popLayout">
                  {filteredPatients.map((p, index) => (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: index * 0.03 }}
                      key={p.id} 
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shadow-sm ring-4 ring-white">
                            {p.name.substring(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{p.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.patientId || p.id?.substring(0, 8).toUpperCase()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                            <span className="py-0.5 px-2 bg-slate-100 rounded text-[10px] text-slate-500 font-bold tracking-tight">PH</span>
                            {p.phone}
                          </div>
                          {p.email && (
                            <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                              <Mail size={12} className="text-slate-300" />
                              {p.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700">
                            {p.gender}
                          </span>
                          <span className="text-xs text-slate-400">
                            {p.dob ? format(new Date(p.dob), 'dd MMM yyyy') : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5">
                          {p.isVerified ? (
                            <motion.span 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest ring-1 ring-emerald-200/50 w-fit shadow-sm shadow-emerald-50"
                            >
                              <ShieldCheck size={12} />
                              Verified
                            </motion.span>
                          ) : (
                            <button 
                              onClick={() => handleToggleVerification(p)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ring-1 w-fit transition-all active:scale-95 duration-300 ${
                                isDataVerified(p) 
                                ? 'bg-indigo-600 text-white ring-indigo-500 shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:shadow-indigo-200' 
                                : 'bg-slate-50 text-slate-400 ring-slate-200/50 border border-dashed border-slate-200'
                              }`}
                            >
                              {isDataVerified(p) ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                              {isDataVerified(p) ? 'Verify Record' : 'Incomplete'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => navigate('/prescriptions', { state: { patientId: p.id } })}
                            className="p-2 text-indigo-600 hover:bg-white rounded-xl hover:shadow-sm border border-transparent hover:border-slate-200 transition-all font-bold"
                            title="Quick Prescription"
                          >
                            <FilePlus size={16} />
                          </button>
                          <button 
                            onClick={() => navigate('/appointments', { state: { patientId: p.id, patientName: p.name } })}
                            className="p-2 text-emerald-600 hover:bg-white rounded-xl hover:shadow-sm border border-transparent hover:border-slate-200 transition-all font-bold"
                            title="Book Appointment"
                          >
                            <CalendarPlus size={16} />
                          </button>
                          <button 
                            onClick={() => setAnalyzingPatient(p)}
                            className="p-2 text-indigo-600 hover:bg-white rounded-xl hover:shadow-sm border border-transparent hover:border-slate-200 transition-all font-bold"
                            title="AI Clinical Diagnosis"
                          >
                            <Brain size={16} />
                          </button>
                          <button 
                            onClick={() => setViewingSymptom(p)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl hover:shadow-sm border border-transparent hover:border-slate-200 transition-all font-bold"
                            title="Symptom Tracker"
                          >
                            <Activity size={16} />
                          </button>
                          <button 
                            onClick={() => setViewingLog(p)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl hover:shadow-sm border border-transparent hover:border-slate-200 transition-all font-bold"
                            title="Activity Log"
                          >
                            <History size={16} />
                          </button>
                          <button 
                            onClick={() => setViewingBilling(p)}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-white rounded-xl hover:shadow-sm border border-transparent hover:border-slate-200 transition-all"
                            title="Billing History"
                          >
                            <CreditCard size={16} />
                          </button>
                          <button 
                            onClick={() => { setEditingPatient(p); setFormData(p); setIsAdding(true); }}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl hover:shadow-sm border border-transparent hover:border-slate-200 transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => setPatientToDelete(p)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl hover:shadow-sm border border-transparent hover:border-slate-200 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {filteredPatients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-24 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Users size={48} className="opacity-10 mb-4" />
                        <p className="text-base font-bold text-slate-900">No patients registered yet</p>
                        <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Start by clicking the "Add Patient" button above to register your first patient.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <PatientModal
        isOpen={isAdding}
        onClose={() => { setIsAdding(false); setEditingPatient(null); }}
        onSubmit={handleSubmitForm}
        editingPatient={editingPatient}
        formData={formData}
        setFormData={setFormData}
      />

      <AnimatePresence>
        {analyzingPatient && (
          <PatientAIAnalyzer 
            patient={analyzingPatient} 
            onClose={() => setAnalyzingPatient(null)} 
          />
        )}
        {viewingBilling && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-[1.25rem] flex items-center justify-center shadow-sm border border-emerald-100">
                    <CreditCard size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-xl tracking-tight">Financial Footprint: {viewingBilling.name}</h3>
                    <p className="text-xs text-slate-400 font-medium italic">Comprehensive billing and payment history</p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingBilling(null)}
                  className="p-3 text-slate-400 hover:text-slate-600 rounded-2xl transition-colors border border-slate-100 bg-white"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto">
                <PatientBillingHistory patient={viewingBilling} doctor={doctorProfile} />
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-loose">
                   Razorpay Transaction Logs <br/>
                   <span className="text-emerald-500">End-to-End Encrypted</span>
                 </p>
                 <button 
                   onClick={() => setViewingBilling(null)}
                   className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg active:scale-95"
                 >
                   Done Viewing
                 </button>
              </div>
            </motion.div>
          </div>
        )}

        {viewingLog && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm border border-indigo-100">
                    <History size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-xl tracking-tight">Activity Log: {viewingLog.name}</h3>
                    <p className="text-xs text-slate-400 font-medium tracking-tight">Full clinical audit trail for this patient</p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingLog(null)}
                  className="p-3 text-slate-400 hover:text-slate-600 rounded-2xl transition-colors border border-slate-100 bg-white"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto">
                <PatientActivityLog patientId={viewingLog.id!} />
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                 <button 
                   onClick={() => setViewingLog(null)}
                   className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95"
                 >
                   Close Logs
                 </button>
              </div>
            </motion.div>
          </div>
        )}

        {viewingSymptom && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm border border-indigo-100">
                    <Activity size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-xl tracking-tight">Symptom Tracker: {viewingSymptom.name}</h3>
                    <p className="text-xs text-slate-400 font-medium tracking-tight">Visualizing patient-led health progression</p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingSymptom(null)}
                  className="p-3 text-slate-400 hover:text-slate-600 rounded-2xl transition-colors border border-slate-100 bg-white"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto">
                <SymptomViewer patientId={viewingSymptom.id!} />
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                 <button 
                   onClick={() => setViewingSymptom(null)}
                   className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95"
                 >
                   Done Reviewing
                 </button>
              </div>
            </motion.div>
          </div>
        )}

        {patientToDelete && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-red-50">
                <Trash2 size={36} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Delete Record?</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                You are about to delete <span className="text-slate-900 font-bold">{patientToDelete.name}</span>. This action cannot be undone and will remove all clinical history.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setPatientToDelete(null)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDelete(patientToDelete.id!)}
                  className="flex-1 py-4 bg-red-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
