import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { db, auth, handleFirestoreError, OperationType } from '../../lib/db';
import { logAction } from '../../lib/audit';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, where } from 'firebase/firestore';
import { toast } from 'sonner';
import { Appointment, Patient } from '../../types';
import { format, parseISO } from 'date-fns';
import { Calendar, Clock, Video, Home, Plus, X, CheckCircle2, PhoneOutgoing, Search, Pencil, ExternalLink, Copy, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useLanguage } from '../../lib/i18n';
import { startVideoCall, generateJitsiUrl } from '../../lib/video';
import VideoMeetingRoom from '../shared/VideoMeetingRoom';

export default function AppointmentManager() {
  const { t } = useLanguage();
  const location = useLocation();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isAdding, setIsAdding] = useState(location.state?.patientId ? true : false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [cancellingAppt, setCancellingAppt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [activeCall, setActiveCall] = useState<Appointment | null>(null);
  const [completingAppt, setCompletingAppt] = useState<Appointment | null>(null);
  const [customFee, setCustomFee] = useState<number>(500);
  const [shouldGenerateInvoice, setShouldGenerateInvoice] = useState(true);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);

  const filteredAppointments = appointments.filter(appt => {
    const statusMatch = statusFilter === 'All' || appt.status === statusFilter;
    const typeMatch = typeFilter === 'All' || appt.type === typeFilter;
    const searchMatch = 
      appt.patientName.toLowerCase().includes(search.toLowerCase()) || 
      appt.reason?.toLowerCase().includes(search.toLowerCase()) ||
      appt.patientId.toLowerCase().includes(search.toLowerCase());
    return statusMatch && typeMatch && searchMatch;
  });

  const [formData, setFormData] = useState<Partial<Appointment>>({
    patientId: location.state?.patientId || '',
    patientName: location.state?.patientName || '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '14:30',
    type: 'Offline',
    status: 'Scheduled',
    reason: ''
  });

  const fetchData = async () => {
    try {
      const apptsQ = query(collection(db, 'appointments'), orderBy('date', 'asc'));
      const apptsSnap = await getDocs(apptsQ);
      setAppointments(apptsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));

      const patientsSnap = await getDocs(collection(db, 'patients'));
      setPatients(patientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'appointments/patients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'appointments';
    try {
      const patient = patients.find(p => p.id === formData.patientId);
      const videoLink = formData.type === 'Online' ? generateJitsiUrl(`${patient?.name || 'Patient'}-${Date.now()}`) : '';
      
      const docRef = await addDoc(collection(db, path), {
        ...formData,
        patientName: patient?.name || 'Unknown',
        patientUid: patient?.uid || '',
        doctorId: auth.currentUser?.uid || '',
        videoLink
      });
      await logAction({
        action: 'Schedule Appointment',
        entityType: 'Appointment',
        entityId: docRef.id,
        details: `Scheduled ${formData.type} visit for ${patient?.name || 'Unknown'} at ${formData.date} ${formData.time}`,
        severity: 'info'
      });
      toast.success('Appointment scheduled');
      setIsAdding(false);
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleEdit = (appt: Appointment) => {
    setEditingAppt(appt);
    setFormData({
      patientId: appt.patientId,
      patientName: appt.patientName,
      date: appt.date,
      time: appt.time,
      type: appt.type,
      status: appt.status,
      reason: appt.reason || ''
    });
    setIsAdding(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppt?.id) return;
    const path = `appointments/${editingAppt.id}`;
    try {
      const patient = patients.find(p => p.id === formData.patientId);
      let videoLink = editingAppt.videoLink || '';
      
      // Generate new link if changed to Online and didn't have one
      if (formData.type === 'Online' && !videoLink) {
        videoLink = generateJitsiUrl(`${patient?.name || formData.patientName}-${Date.now()}`);
      } else if (formData.type === 'Offline') {
        videoLink = '';
      }

      await updateDoc(doc(db, 'appointments', editingAppt.id), {
        ...formData,
        patientName: patient?.name || formData.patientName,
        videoLink
      });
      await logAction({
        action: 'Update Appointment',
        entityType: 'Appointment',
        entityId: editingAppt.id,
        details: `Updated ${formData.type} visit for ${patient?.name || formData.patientName} to ${formData.date} ${formData.time}`
      });
      toast.success('Appointment updated');
      setIsAdding(false);
      setEditingAppt(null);
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleStatusUpdate = async (id: string, status: Appointment['status'], confirmedFee?: number, skipInvoice?: boolean) => {
    const path = `appointments/${id}`;
    try {
      await updateDoc(doc(db, 'appointments', id), { status });
      
      // Auto-create invoice if completed
      if (status === 'Completed' && !skipInvoice) {
        const appt = appointments.find(a => a.id === id);
        if (appt) {
          const user = auth.currentUser;
          const fee = confirmedFee !== undefined ? confirmedFee : 500;

          try {
            await addDoc(collection(db, 'invoices'), {
              patientId: appt.patientId,
              patientUid: appt.patientUid || '',
              doctorId: user?.uid,
              appointmentId: id,
              amount: fee,
              status: 'Pending',
              items: [{ description: 'Consultation Fee', price: fee, quantity: 1 }],
              createdAt: new Date().toISOString()
            });
            toast.success('Invoice generated successfully');
          } catch (invError) {
            handleFirestoreError(invError, OperationType.CREATE, 'invoices');
          }
        }
      }

      await logAction({
        action: 'Update Appointment Status',
        entityType: 'Appointment',
        entityId: id,
        details: `Status changed to ${status}${confirmedFee ? ` with fee ₹${confirmedFee}` : ''}`,
        severity: status === 'Cancelled' ? 'warning' : 'info'
      });
      toast.success(`Marked as ${status}`);
      setCompletingAppt(null);
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const initiateCompletion = async (appt: Appointment) => {
    setCompletingAppt(appt);
    setIsCreatingInvoice(true);
    
    // Predetermine default fee from profile
    let fee = 500;
    const user = auth.currentUser;
    if (user) {
      try {
        const docSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
        if (!docSnap.empty) {
          const profile = docSnap.docs[0].data();
          fee = profile.consultationFee || 500;
        }
      } catch (err) {
        console.error("Error fetching doctor fee:", err);
      }
    }
    setCustomFee(fee);
  };

  const handleStartCall = (appt: Appointment) => {
    setActiveCall(appt);
    logAction({
      action: 'Start Video Consultation',
      entityType: 'Appointment',
      entityId: appt.id!,
      details: `Started Jitsi session for ${appt.patientName}`,
      severity: 'info'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Calendar size={20} className="text-indigo-600" />
          {t('appointments')}
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={3} size={16} />
             <input 
               type="text" 
               placeholder="Search appointments..."
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-medium shadow-sm"
             />
             {search && (
               <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
                 <X size={14} />
               </button>
             )}
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status:</span>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-bold text-slate-600 outline-none bg-transparent cursor-pointer"
            >
              <option value="All">All Status</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mode:</span>
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs font-bold text-slate-600 outline-none bg-transparent cursor-pointer"
            >
              <option value="All">All Modes</option>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>
          </div>
          <button 
            onClick={() => {
              setEditingAppt(null);
              setFormData({
                patientId: '',
                patientName: '',
                date: format(new Date(), 'yyyy-MM-dd'),
                time: '14:30',
                type: 'Offline',
                status: 'Scheduled',
                reason: ''
              });
              setIsAdding(true);
            }}
            className="bg-indigo-600 text-white px-4 py-3 sm:py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-lg active:scale-95 transition-transform"
          >
            <Plus size={16} />
            {t('book_appointment')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 flex-1 overflow-hidden">
        <div className="xl:col-span-3 bg-white sm:bg-transparent rounded-xl border border-slate-200 sm:border-none shadow-sm sm:shadow-none overflow-y-auto custom-scrollbar touch-scroll">
          {/* Mobile View: Cards */}
          <div className="grid grid-cols-1 gap-4 sm:hidden p-4 pb-20">
            {filteredAppointments.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-200 text-center">
                <p className="text-slate-400 text-sm font-medium">No appointments match the criteria.</p>
              </div>
            ) : (
              filteredAppointments.map((appt) => (
                <div key={appt.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 active:scale-[0.98] transition-all">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-base shrink-0">
                        {appt.patientName.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-base leading-tight truncate">{appt.patientName}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full tracking-wider shrink-0 ${
                            appt.status === 'Completed' ? 'bg-emerald-50 text-emerald-500' :
                            appt.status === 'Cancelled' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'
                          }`}>
                            {appt.status}
                          </span>
                          {appt.type === 'Online' ? (
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="flex items-center gap-1 text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                <Video size={10} /> VIDEO
                              </span>
                              {appt.videoLink && (
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(appt.videoLink!);
                                    toast.success('Link copied');
                                  }}
                                  className="tap-target text-slate-400 hover:text-indigo-600"
                                  title="Copy Meeting Link"
                                >
                                  <Copy size={12} />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                              <Home size={10} /> CLINIC
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4 px-1 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-3 pl-3">
                      <Calendar size={18} className="text-indigo-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{format(new Date(appt.date), 'dd MMM')}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{format(new Date(appt.date), 'yyyy')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                      <Clock size={18} className="text-indigo-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{appt.time}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase truncate">TIME SLOT</p>
                      </div>
                    </div>
                  </div>

                    <div className="flex gap-2 pt-2 overflow-x-auto no-scrollbar pb-1">
                      <button 
                        onClick={() => handleEdit(appt)}
                        className="flex-1 min-w-[100px] h-[48px] bg-slate-100 text-slate-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-200 transition-all active:scale-95"
                      >
                        <Pencil size={16} /> EDIT
                      </button>
                      {appt.type === 'Online' && appt.status === 'Scheduled' && (
                      <button 
                        onClick={() => handleStartCall(appt)}
                        className="flex-1 min-w-[120px] h-[48px] bg-indigo-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95"
                      >
                        <PhoneOutgoing size={16} /> START CALL
                      </button>
                    )}
                    {appt.status === 'Scheduled' && (
                      <button 
                        onClick={() => initiateCompletion(appt)}
                        className="flex-1 min-w-[120px] h-[48px] bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95"
                      >
                        <CheckCircle2 size={16} /> COMPLETE
                      </button>
                    )}
                    <button 
                      onClick={() => setCancellingAppt(appt)}
                      className="tap-target text-red-500 bg-red-50 rounded-xl border border-red-100 flex items-center justify-center min-w-[48px] h-[48px] shrink-0"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden sm:block overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4 text-center">Mode</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm font-medium italic">
                      No matching appointments found.
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((appt) => (
                    <tr key={appt.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{appt.patientName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">ID: {appt.patientId.substring(0, 8)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Calendar size={14} className="text-slate-300" />
                            {format(new Date(appt.date), 'dd MMM')}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Clock size={14} className="text-slate-300" />
                            {appt.time}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center flex-col items-center gap-1">
                          {appt.type === 'Online' ? (
                            <>
                              <span className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                                <Video size={10} /> VIDEO
                              </span>
                              {appt.videoLink && (
                                <div className="flex items-center gap-1 scale-90">
                                  <a 
                                    href={appt.videoLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-[9px] text-indigo-500 hover:underline font-medium"
                                  >
                                    Join Link
                                  </a>
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(appt.videoLink!);
                                      toast.success('Link copied');
                                    }}
                                    className="p-1 text-slate-300 hover:text-indigo-400"
                                  >
                                    <Copy size={10} />
                                  </button>
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                              <Home size={10} /> CLINIC
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            appt.status === 'Completed' ? 'bg-emerald-50 text-emerald-500' :
                            appt.status === 'Cancelled' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'
                          }`}>
                            {appt.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          {appt.type === 'Online' && appt.status === 'Scheduled' && (
                            <button 
                              onClick={() => handleStartCall(appt)}
                              className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 lg:bg-transparent rounded-lg"
                              title={t('start_call')}
                            >
                              <PhoneOutgoing size={18} />
                            </button>
                          )}
                          {appt.status === 'Scheduled' && (
                            <button 
                              onClick={() => initiateCompletion(appt)}
                              className="p-2 text-slate-400 hover:text-emerald-600 bg-slate-50 lg:bg-transparent rounded-lg"
                              title="Complete"
                            >
                              <CheckCircle2 size={18} />
                            </button>
                          )}
                          <button 
                            onClick={() => handleEdit(appt)}
                            className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 lg:bg-transparent rounded-lg"
                            title="Edit"
                          >
                            <Pencil size={18} />
                          </button>
                          <button 
                            onClick={() => setCancellingAppt(appt)}
                            className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 lg:bg-transparent rounded-lg"
                            title="Cancel Appointment"
                          >
                            <X size={18} />
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

        <div className="space-y-6">
          <div className="bg-indigo-900 rounded-xl p-6 text-white overflow-hidden relative">
            <h4 className="text-sm font-bold uppercase tracking-widest mb-4 opacity-50">Insights</h4>
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-end border-b border-white/10 pb-4">
                <div>
                  <p className="text-[10px] font-bold text-indigo-300">TODAY'S LOAD</p>
                  <p className="text-2xl font-bold">{appointments.filter(a => a.date === format(new Date(), 'yyyy-MM-dd')).length}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-indigo-300">PEAK TIME</p>
                  <p className="text-lg font-bold">14:00 - 17:00</p>
                </div>
              </div>
              <p className="text-xs text-indigo-200">
                You have {appointments.filter(a => a.type === 'Online').length} video consultations this week.
              </p>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {activeCall && (
          <VideoMeetingRoom 
            appointment={activeCall} 
            role="doctor" 
            onLeave={() => setActiveCall(null)} 
          />
        )}
        {isAdding && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-4 lg:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 overflow-hidden shrink-0">
                <h2 className="text-lg font-bold text-slate-800">{editingAppt ? 'Edit Appointment' : 'Assign Appointment'}</h2>
                <button onClick={() => {
                  setIsAdding(false);
                  setEditingAppt(null);
                }} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={editingAppt ? handleUpdate : handleCreate} className="p-4 lg:p-6 space-y-4 lg:space-y-6 overflow-y-auto custom-scrollbar">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Patient</label>
                    <Link to="/patients" className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1">
                      <Plus size={10} /> NEW PATIENT
                    </Link>
                  </div>
                  <div className="relative">
                    <select 
                      required
                      value={formData.patientId}
                      onChange={e => {
                        const pid = e.target.value;
                        const p = patients.find(patient => patient.id === pid);
                        setFormData({ 
                          ...formData, 
                          patientId: pid, 
                          patientName: p?.name || '' 
                        });
                      }}
                      className="w-full px-4 py-3 lg:py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 appearance-none font-medium pr-10"
                    >
                      <option value="">{patients.length === 0 ? 'No patients found - add one first' : 'Choosing patient...'}</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>)}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <Search size={14} />
                    </div>
                  </div>
                  {formData.patientId && !formData.patientName && (
                    <p className="mt-1.5 text-[10px] font-medium text-red-500 flex items-center gap-1">
                      <X size={10} /> Patient details missing. <Link to="/patients" className="underline font-bold">Add them here.</Link>
                    </p>
                  )}
                  {formData.patientName && (
                    <div className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 animate-in fade-in slide-in-from-top-1">
                      <CheckCircle2 size={12} />
                      <span className="text-[10px] font-bold">Selected: {formData.patientName}</span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Date</label>
                    <div className="relative">
                      <DatePicker
                        selected={formData.date ? parseISO(formData.date) : null}
                        onChange={(date: Date | null) => setFormData({ ...formData, date: date ? format(date, 'yyyy-MM-dd') : '' })}
                        dateFormat="dd MMM yyyy"
                        minDate={new Date()}
                        className="w-full px-4 py-3 lg:py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-medium"
                        calendarClassName="shadow-2xl border-none rounded-2xl overflow-hidden font-sans"
                        placeholderText="Select Date"
                        popperPlacement="bottom-start"
                      />
                      <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Time</label>
                    <input 
                      type="time" 
                      value={formData.time}
                      onChange={e => setFormData({ ...formData, time: e.target.value })}
                      className="w-full px-4 py-3 lg:py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Reason for Visit</label>
                  <textarea 
                    value={formData.reason}
                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-4 py-3 lg:py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm min-h-[80px] resize-none font-medium"
                    placeholder="e.g. Chronic acidity, headache..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('consultation_mode') || 'Mode'}</label>
                  <div className="flex gap-4">
                    {['Offline', 'Online'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: type as any })}
                        className={`flex-1 py-3 lg:py-4 rounded-2xl border-2 transition-all flex flex-col sm:flex-row items-center justify-center gap-2 font-bold text-xs ${
                          formData.type === type ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400 grayscale hover:grayscale-0'
                        }`}
                      >
                        {type === 'Online' ? <Video size={16} /> : <Home size={16} />}
                        {type === 'Online' ? 'VIDEO' : 'IN-CLINIC'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-2 pb-6 sm:pb-0">
                  <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl active:scale-95 uppercase tracking-wider text-sm">
                    {editingAppt ? 'Update Appointment' : (t('finalize_appointment') || 'Finalize Appointment')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {cancellingAppt && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden text-center p-8"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Cancel Appointment?</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                Are you sure you want to cancel the appointment for <strong className="text-slate-800">{cancellingAppt.patientName}</strong>? This action cannot be undone.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setCancellingAppt(null)}
                  className="py-3 px-4 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  No, Keep it
                </button>
                <button 
                  onClick={async () => {
                    const id = cancellingAppt.id!;
                    const path = `appointments/${id}`;
                    try {
                      await updateDoc(doc(db, 'appointments', id), { status: 'Cancelled' });
                      await logAction({
                        action: 'Cancel Appointment',
                        entityType: 'Appointment',
                        entityId: id,
                        details: `Appointment for ${cancellingAppt.patientName} cancelled`,
                        severity: 'warning'
                      });
                      toast.success('Appointment cancelled');
                      setCancellingAppt(null);
                      fetchData();
                    } catch (error) {
                      handleFirestoreError(error, OperationType.UPDATE, path);
                    }
                  }}
                  className="py-3 px-4 bg-red-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-200 transition-all active:scale-95"
                >
                  Yes, Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {completingAppt && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden p-8"
            >
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Finalize Visit</h3>
                <p className="text-sm text-slate-500 mt-2">Set the consultation fee for <strong>{completingAppt.patientName}</strong></p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Consultation Fee (₹)</label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input 
                      type="number"
                      value={customFee}
                      onChange={(e) => setCustomFee(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-500 focus:bg-white text-xl font-black text-slate-900 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                     <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-emerald-500 shadow-sm shrink-0">
                        <Plus size={16} />
                     </div>
                     <div className="min-w-0 flex-1">
                       <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Invoice Generation</p>
                       <p className="text-xs text-slate-700 font-bold">Create billing record automatically</p>
                     </div>
                     <input 
                       type="checkbox"
                       checked={shouldGenerateInvoice}
                       onChange={(e) => setShouldGenerateInvoice(e.target.checked)}
                       className="w-5 h-5 text-emerald-600 rounded-lg border-slate-300 focus:ring-emerald-500 transition-all cursor-pointer"
                     />
                  </div>

                  {shouldGenerateInvoice && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50"
                    >
                      <p className="text-[10px] text-emerald-700 font-bold leading-relaxed px-1">
                        Will generate a 'Pending' invoice of <span className="font-black">₹{customFee}</span> for {completingAppt.patientName}.
                      </p>
                    </motion.div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => handleStatusUpdate(completingAppt.id!, 'Completed', customFee, !shouldGenerateInvoice)}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 shadow-xl active:scale-95 transition-all"
                  >
                    Confirm & Complete
                  </button>
                  <button 
                    onClick={() => {
                      setCompletingAppt(null);
                      setIsCreatingInvoice(false);
                    }}
                    className="w-full py-4 bg-white text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                  >
                    Not Now
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
