import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Calendar, 
  MessageCircle, 
  User, 
  Clock, 
  Download, 
  ExternalLink,
  Search,
  Sparkles,
  Bell,
  CreditCard,
  Phone,
  Smartphone,
  Mail,
  MapPin,
  History,
  Edit2,
  Save,
  X,
  Cake,
  Mic,
  Square,
  Trash2,
  Play,
  Users as GenderIcon,
  Video,
  Home,
  CheckCircle2,
  Stethoscope,
  ShieldCheck,
  Filter,
  ArrowRight,
  Info,
  AlertTriangle,
  AlertCircle,
  BrainCircuit,
  Star,
  LogOut,
  Plus,
  Zap,
  Smile,
  Moon,
  Utensils,
  Droplets,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, handleFirestoreError, OperationType } from '../../lib/db';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, orderBy, getDoc } from 'firebase/firestore';
import { Patient, Appointment, Prescription, UserProfile, Feedback, Invoice, SymptomLog } from '../../types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useLanguage } from '../../lib/i18n';
import { logAction } from '../../lib/audit';
import { generatePrescriptionPDF, generateInvoicePDF } from '../../lib/pdf';
import { generateJitsiUrl } from '../../lib/video';
import VideoMeetingRoom from '../shared/VideoMeetingRoom';
import LoadingScreen from '../shared/LoadingScreen';
import PatientBillingHistory from './PatientBillingHistory';
import Logo from '../Logo';

export default function PatientPortal() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentTab = (searchParams.get('tab') as 'overview' | 'prescriptions' | 'appointments' | 'profile' | 'doctors' | 'history' | 'billing' | 'logs') || 'overview';
  
  const [patientData, setPatientData] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);
  const [doctors, setDoctors] = useState<UserProfile[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [isLoggingSymptom, setIsLoggingSymptom] = useState(false);
  const [symptomFormData, setSymptomFormData] = useState({
    symptoms: '',
    severity: 5,
    mood: 'Good',
    energyLevel: 'Normal',
    sleepQuality: 'Good',
    appetite: 'Normal',
    thirst: 'Normal',
    notes: ''
  });
  const [activity, setActivity] = useState<{ id: string, type: 'booking' | 'prescription' | 'update' | 'symptom', title: string, time: any, status?: string }[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isGrievanceOpen, setIsGrievanceOpen] = useState(false);
  const [grievanceData, setGrievanceData] = useState({
    doctorId: '',
    doctorName: '',
    subject: '',
    description: '',
    severity: 'info' as 'info' | 'warning' | 'critical'
  });
  const [reschedulingAppt, setReschedulingAppt] = useState<Appointment | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [activeCall, setActiveCall] = useState<Appointment | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<UserProfile | null>(null);
  const [targetAppointment, setTargetAppointment] = useState<Appointment | null>(null);
  const [formData, setFormData] = useState<Partial<Patient>>({});
  
  const [bookingData, setBookingData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '11:00',
    type: 'Offline' as 'Online' | 'Offline',
    reason: '',
    hasVoiceNote: false
  });

  const [isRecording, setIsRecording] = useState(false);
  const [cancellingAppt, setCancellingAppt] = useState<Appointment | null>(null);

  const handleLogSymptom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientData?.id) return;
    
    try {
      const logData: Omit<SymptomLog, 'id'> = {
        ...symptomFormData,
        patientId: patientData.id,
        patientUid: auth.currentUser?.uid,
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'symptom_logs'), logData);
      
      await logAction({
        action: 'Logged Symptoms',
        entityType: 'Patient',
        entityId: patientData.id,
        details: `Patient logged symptoms: ${symptomFormData.symptoms.substring(0, 50)}...`,
      });
      
      toast.success('Symptoms logged successfully');
      setSymptomFormData({
        symptoms: '',
        severity: 5,
        mood: 'Good',
        energyLevel: 'Normal',
        sleepQuality: 'Good',
        appetite: 'Normal',
        thirst: 'Normal',
        notes: ''
      });
      setIsLoggingSymptom(false);
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'symptom_logs');
    }
  };

  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioUrl(URL.createObjectURL(blob));
        setBookingData(prev => ({ ...prev, hasVoiceNote: true }));
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      
      setRecordingDuration(0);
      const interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      recorder.addEventListener('stop', () => clearInterval(interval));

    } catch (err) {
      console.error("Mic access denied:", err);
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  };

  const deleteRecording = () => {
    setAudioUrl(null);
    setBookingData(prev => ({ ...prev, hasVoiceNote: false }));
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const [reviewData, setReviewData] = useState({
    rating: 5,
    comment: ''
  });

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const fetchData = async () => {
    const user = auth.currentUser;
    const sessionStr = localStorage.getItem('kayra_patient_session');
    const session = sessionStr ? JSON.parse(sessionStr) : null;

    if (!user && !session) {
      setLoading(false);
      return;
    }

    try {
      let patient: Patient | null = null;

      // 1. Try to find by UID (Primary for claimed records or Google login)
      if (user) {
        const uidQ = query(collection(db, 'patients'), where('uid', '==', user.uid));
        const uidSnap = await getDocs(uidQ);
        if (!uidSnap.empty) {
          patient = { id: uidSnap.docs[0].id, ...uidSnap.docs[0].data() } as Patient;
        } else if (user.email) {
          // Fallback for Google login users who might not have UID in patient doc yet
          const emailQ = query(collection(db, 'patients'), where('email', '==', user.email));
          const emailSnap = await getDocs(emailQ);
          if (!emailSnap.empty) {
            patient = { id: emailSnap.docs[0].id, ...emailSnap.docs[0].data() } as Patient;
          }
        }
      }

      // 2. Try to find by session (if UID lookup failed)
      if (!patient && session?.patientId) {
        const docRef = doc(db, 'patients', session.patientId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          patient = { id: docSnap.id, ...docSnap.data() } as Patient;
        }
      }
      
      // 3. Fallback to mobile number (Legacy or partial sessions)
      if (!patient && session?.mobileNumber) {
        const mobileQ = query(collection(db, 'patients'), where('mobileNumber', '==', session.mobileNumber));
        const mobileSnap = await getDocs(mobileQ);
        if (!mobileSnap.empty) {
          patient = { id: mobileSnap.docs[0].id, ...mobileSnap.docs[0].data() } as Patient;
        }
      }
      
      if (patient) {
        setPatientData(patient);
        setFormData(patient);

        // Fetch appointments
        const apptQ = query(
          collection(db, 'appointments'), 
          where('patientId', '==', patient.id),
          orderBy('date', 'desc')
        );
        const apptSnap = await getDocs(apptQ);
        setAppointments(apptSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));

        // Fetch prescriptions
        const rxQ = query(
          collection(db, 'prescriptions'),
          where('patientId', '==', patient.id),
          orderBy('createdAt', 'desc')
        );
        const rxSnap = await getDocs(rxQ);
        setPrescriptions(rxSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prescription)));

        // Fetch feedbacks
        const feedbackQ = query(
          collection(db, 'feedbacks'),
          where('patientId', '==', patient.id)
        );
        const feedbackSnap = await getDocs(feedbackQ);
        const fbData = feedbackSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feedback));
        setFeedbacks(fbData);

        // Fetch invoices
        const invoiceQ = query(
          collection(db, 'invoices'),
          where('patientId', '==', patient.id),
          orderBy('createdAt', 'desc')
        );
        const invoiceSnap = await getDocs(invoiceQ);
        setInvoices(invoiceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice)));

        // Fetch symptom logs
        const logsQ = query(
          collection(db, 'symptom_logs'),
          where('patientId', '==', patient.id),
          orderBy('createdAt', 'desc')
        );
        const logsSnap = await getDocs(logsQ);
        const logsData = logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SymptomLog));
        setSymptomLogs(logsData);

        // Generate Recent Activity
        const recentActivity: any[] = [];
        apptSnap.docs.slice(0, 3).forEach(doc => {
          const d = doc.data();
          recentActivity.push({
            id: doc.id,
            type: 'booking',
            title: `${d.type} Consultation with Dr. ${d.doctorName}`,
            time: d.createdAt || d.updatedAt || new Date().toISOString(),
            status: d.status
          });
        });
        rxSnap.docs.slice(0, 2).forEach(doc => {
          const d = doc.data();
          recentActivity.push({
            id: doc.id,
            type: 'prescription',
            title: `New Prescription for ${d.diagnosis}`,
            time: d.createdAt || new Date().toISOString(),
          });
        });
        logsSnap.docs.slice(0, 2).forEach(doc => {
          const d = doc.data();
          recentActivity.push({
            id: doc.id,
            type: 'symptom',
            title: `Logged Symptoms: ${d.symptoms.substring(0, 20)}...`,
            time: d.createdAt || new Date().toISOString(),
          });
        });
        setActivity(recentActivity.sort((a, b) => {
          const timeA = a.time?.toDate ? a.time.toDate() : new Date(a.time);
          const timeB = b.time?.toDate ? b.time.toDate() : new Date(b.time);
          return timeB.getTime() - timeA.getTime();
        }));
      }

      // Fetch doctors
      const doctorQ = query(collection(db, 'users'), where('role', '==', 'doctor'));
      const doctorSnap = await getDocs(doctorQ);
      const docsList = doctorSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setDoctors(docsList);
      setFilteredDoctors(docsList);

    } catch (error) {
       console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem('kayra_patient_session');
      toast.success('Signed out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Error signing out');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const filtered = doctors.filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           doc.specialization?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSpec = specializationFilter === 'All' || doc.specialization === specializationFilter;
      return matchesSearch && matchesSpec;
    });
    setFilteredDoctors(filtered);
  }, [searchQuery, specializationFilter, doctors]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientData?.id) return;

    try {
      const docRef = doc(db, 'patients', patientData.id);
      await updateDoc(docRef, formData);
      setPatientData({ ...patientData, ...formData } as Patient);
      setIsEditing(false);
      toast.success('Health profile updated successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `patients/${patientData.id}`);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientData?.id) return;

    try {
      const videoLink = bookingData.type === 'Online' ? generateJitsiUrl(`${patientData.name}-${Date.now()}`) : '';
      
      const apptData = {
        ...bookingData,
        patientId: patientData.id,
        patientName: patientData.name,
        patientUid: auth.currentUser?.uid,
        doctorId: selectedDoctor?.uid || reschedulingAppt?.doctorId || '',
        doctorName: selectedDoctor?.name || reschedulingAppt?.doctorName || 'Dr. Ravi',
        status: 'Scheduled',
        videoLink,
        updatedAt: new Date().toISOString(),
        ...(isRescheduling ? {} : { createdAt: new Date().toISOString() })
      };

      if (isRescheduling && reschedulingAppt?.id) {
        await updateDoc(doc(db, 'appointments', reschedulingAppt.id), apptData);
        await logAction({
          action: 'Patient Rescheduled Appointment',
          entityType: 'Appointment',
          details: `Patient ${patientData.name} rescheduled visit to ${bookingData.date} at ${bookingData.time}`
        });
        toast.success('Appointment rescheduled successfully!');
      } else {
        await addDoc(collection(db, 'appointments'), apptData);
        await logAction({
          action: 'Patient Booked Appointment',
          entityType: 'Appointment',
          details: `Patient ${patientData.name} booked a ${bookingData.type} visit with ${apptData.doctorName}`
        });
        toast.success('Appointment booked successfully!');
      }

      setIsBooking(false);
      setIsRescheduling(false);
      setReschedulingAppt(null);
      fetchData();
      setActiveTab('appointments');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'appointments');
    }
  };

  const handleCancelAppointment = async (appt: Appointment) => {
    if (!appt.id) return;
    setCancellingAppt(appt);
  };

  const confirmCancellation = async () => {
    if (!cancellingAppt?.id) return;
    const apptId = cancellingAppt.id;
    try {
      await updateDoc(doc(db, 'appointments', apptId), { 
        status: 'Cancelled',
        updatedAt: new Date().toISOString()
      });
      toast.success('Appointment cancelled');
      setCancellingAppt(null);
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `appointments/${apptId}`);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientData?.id || !targetAppointment?.id) return;

    try {
      const fbData: Omit<Feedback, 'id'> = {
        appointmentId: targetAppointment.id,
        doctorId: targetAppointment.doctorId || '',
        patientId: patientData.id,
        patientUid: auth.currentUser?.uid,
        patientName: patientData.name,
        rating: reviewData.rating,
        comment: reviewData.comment,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'feedbacks'), fbData);
      
      // Automatic Reconsideration Logic: If rating <= 2, flag for specialization review
      if (reviewData.rating <= 2) {
        await logAction({
          action: 'Critical Feedback Received',
          entityType: 'Feedback',
          details: `Patient ${patientData.name} gave poor rating to Dr. ${targetAppointment.doctorName}. Suggested specialization reconsideration.`,
          severity: 'warning'
        });
        toast.info("We've noted your concerns. You might want to explore experts in other specializations.");
      }

      await logAction({
        action: 'Patient Submitted Feedback',
        entityType: 'Feedback',
        details: `Patient ${patientData.name} gave ${reviewData.rating} stars for appointment ${targetAppointment.id}`,
        severity: 'info'
      });

      toast.success('Thank you for your feedback!');
      setIsReviewing(false);
      setTargetAppointment(null);
      setReviewData({ rating: 5, comment: '' });
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'feedbacks');
    }
  };

  const downloadPrescriptionList = (rx: Prescription) => {
    if (!patientData) return;
    const doctor = doctors.find(d => d.uid === rx.doctorId) || null;
    const pdf = generatePrescriptionPDF(doctor, patientData, rx);
    pdf.save(`Prescription_${rx.diagnosis}_${format(new Date(rx.createdAt), 'ddMMyy')}.pdf`);
  };

  const handleSubmitGrievance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientData?.id) return;

    try {
      await addDoc(collection(db, 'complaints'), {
        ...grievanceData,
        userId: patientData.id,
        userEmail: patientData.email,
        userName: patientData.name,
        status: 'Pending',
        createdAt: new Date().toISOString()
      });

      await logAction({
        action: 'Grievance Filed',
        entityType: 'Feedback',
        details: `Patient ${patientData.name} filed a ${grievanceData.severity} complaint against Dr. ${grievanceData.doctorName}`,
        severity: grievanceData.severity
      });

      toast.success('Your complaint has been submitted to the medical board.');
      setIsGrievanceOpen(false);
      setGrievanceData({ doctorId: '', doctorName: '', subject: '', description: '', severity: 'info' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'complaints');
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing Health Data</p>
        </div>
      </div>
    );
  }

  const specializations = ['All', ...new Set(doctors.map(d => d.specialization).filter(Boolean))];

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-24 lg:pb-10 px-0 sm:px-4">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-slate-900 p-6 sm:p-10 lg:p-12 rounded-none sm:rounded-[3rem] text-white shadow-2xl shadow-slate-200 relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] -ml-32 -mb-32 pointer-events-none"></div>
        
        <div className="flex gap-4 sm:gap-6 items-center relative z-10 w-full lg:w-auto">
          <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/20 shrink-0 transform -rotate-3">
            <User size={20} className="sm:size-8 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold tracking-tight mb-1 leading-tight truncate">
              {patientData?.name?.split(' ')[0] || 'Member'}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 rounded-lg border border-slate-700 shadow-inner">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">KHC-ID</span>
                <span className="text-[10px] font-black text-emerald-400 tracking-tighter">KHC-{patientData?.id?.substring(0, 8).toUpperCase() || 'SYNCING'}</span>
              </div>
              {patientData?.isVerified && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                  <ShieldCheck size={10} />
                  <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest leading-none">Verified</span>
                </div>
              )}
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all"
          >
            <LogOut size={18} />
          </button>
        </div>

        <div className="flex flex-row sm:flex-row gap-2 w-full lg:w-auto relative z-10">
          <button 
            onClick={() => setActiveTab('doctors')}
            className="flex-1 lg:flex-none px-4 sm:px-8 py-3 sm:py-4 bg-white text-slate-900 rounded-xl sm:rounded-2xl text-[9px] sm:text-xs font-bold shadow-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 uppercase tracking-widest active:scale-95"
          >
            <Stethoscope size={14} className="text-emerald-500 sm:size-4.5" />
            <span className="inline">Specialist</span>
          </button>
          <button 
            onClick={() => {
              setSelectedDoctor(null);
              setIsBooking(true);
            }}
            className="flex-1 lg:flex-none px-4 sm:px-8 py-3 sm:py-4 bg-emerald-500 text-white rounded-xl sm:rounded-2xl text-[9px] sm:text-xs font-bold shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 uppercase tracking-widest active:scale-95"
          >
            <Calendar size={14} className="sm:size-4.5" />
            <span className="inline">Book Now</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 px-4 sm:px-0">
        {/* Main Content Area */}
        <div className="flex-1 space-y-6 sm:space-y-8 min-w-0">
          {/* Responsive Navigation Tabs */}
          <div className="flex lg:flex gap-1 p-1 bg-white border border-slate-200 rounded-xl sm:rounded-2xl w-full sm:w-fit shadow-sm overflow-x-auto no-scrollbar mask-linear-r">
            <TabButton 
              active={currentTab === 'overview'} 
              onClick={() => setActiveTab('overview')}
              label="Overview"
              icon={<Home size={16} />}
            />
            <TabButton 
              active={currentTab === 'history'} 
              onClick={() => setActiveTab('history')}
              label="Medical History"
              icon={<History size={16} />}
            />
            <TabButton 
              active={currentTab === 'logs'} 
              onClick={() => setActiveTab('logs')}
              label="Symptom Log"
              icon={<Activity size={16} />}
            />
            <TabButton 
              active={currentTab === 'prescriptions'} 
              onClick={() => setActiveTab('prescriptions')}
              label="Prescriptions"
              icon={<FileText size={16} />}
            />
            <TabButton 
              active={currentTab === 'appointments'} 
              onClick={() => setActiveTab('appointments')}
              label="My Visits"
              icon={<Calendar size={16} />}
            />
            <TabButton 
              active={currentTab === 'doctors'} 
              onClick={() => setActiveTab('doctors')}
              label="Find Doctors"
              icon={<Stethoscope size={16} />}
            />
            <TabButton 
              active={currentTab === 'profile'} 
              onClick={() => setActiveTab('profile')}
              label="Health Profile"
              icon={<User size={16} />}
            />
            <TabButton 
              active={currentTab === 'billing'} 
              onClick={() => setActiveTab('billing')}
              label="Payments"
              icon={<CreditCard size={16} />}
              hasBadge={invoices.some(i => i.status === 'Pending')}
            />
          </div>

          <AnimatePresence mode="wait">
            {currentTab === 'overview' && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Critical Alerts / Pending Payments */}
                {invoices.filter(i => i.status === 'Pending').length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-red-50 border border-red-100 p-6 rounded-[2rem] flex items-center justify-between gap-6 shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-red-500 shadow-sm">
                        <AlertCircle size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Action Required</p>
                        <h4 className="font-bold text-slate-800">You have {invoices.filter(i => i.status === 'Pending').length} pending payment(s)</h4>
                        <p className="text-xs text-slate-500 font-medium">Please settle your dues to avoid service interruption.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveTab('billing')}
                      className="px-6 py-3 bg-red-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all shadow-lg"
                    >
                      Pay Now
                    </button>
                  </motion.div>
                )}
                {/* Feedback Prompt */}
                {(() => {
                  const pendingReview = appointments.find(a => a.status === 'Completed' && !feedbacks.some(f => f.appointmentId === a.id));
                  if (!pendingReview) return null;
                  
                  return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-emerald-600 p-6 sm:p-8 rounded-[2.5rem] text-white overflow-hidden relative group shadow-2xl shadow-emerald-200"
                    >
                      <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                      <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
                        <div className="w-16 h-16 bg-white/20 text-white rounded-3xl flex items-center justify-center shrink-0">
                          <Star size={32} fill="white" className="animate-pulse" />
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                          <h4 className="text-xl font-black tracking-tight mb-2 italic">How was your last visit?</h4>
                          <p className="text-sm font-medium text-emerald-50 leading-relaxed max-w-md">
                            Your feedback helps Dr. {pendingReview.doctorName} improve and assists other patients in choosing the right care.
                          </p>
                        </div>
                        <button 
                          onClick={() => {
                            setTargetAppointment(pendingReview);
                            setReviewData({ rating: 5, comment: '' });
                            setIsReviewing(true);
                          }}
                          className="px-8 py-4 bg-white text-emerald-600 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-50 transition-all active:scale-95 shadow-xl shadow-emerald-900/10 flex items-center gap-2"
                        >
                          Leave Feedback <ArrowRight size={14} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })()}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
                  <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-3 sm:gap-5">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 text-emerald-600 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
                      <Calendar size={20} className="sm:size-6" />
                    </div>
                    <div>
                      <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Visits</p>
                      <p className="text-base sm:text-lg font-bold text-slate-900 mt-1">{appointments.length}</p>
                    </div>
                  </div>
                  <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-3 sm:gap-5">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 text-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
                      <FileText size={20} className="sm:size-6" />
                    </div>
                    <div>
                      <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Reports</p>
                      <p className="text-base sm:text-lg font-bold text-slate-900 mt-1">{prescriptions.length}</p>
                    </div>
                  </div>
                  <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-3 sm:gap-5">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-50 text-amber-600 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
                      <CreditCard size={20} className="sm:size-6" />
                    </div>
                    <div>
                      <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Outstanding</p>
                      <p className="text-base sm:text-lg font-bold text-red-600 mt-1">₹{invoices.filter(i => i.status === 'Pending').reduce((acc, c) => acc + c.amount, 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Health Metrics Snapshot */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                   <div className="md:col-span-1 space-y-6">
                      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                         <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Vitals Snapshot</h5>
                         <div className="space-y-4">
                            <div className="flex justify-between items-center">
                               <span className="text-xs text-slate-500 font-medium">Blood Group</span>
                               <span className="text-xs font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">{patientData?.bloodGroup || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                               <span className="text-xs text-slate-500 font-medium">Gender</span>
                               <span className="text-xs font-bold text-slate-800">{patientData?.gender || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                               <span className="text-xs text-slate-500 font-medium">Age</span>
                               <span className="text-xs font-bold text-slate-800">
                                  {patientData?.dob ? new Date().getFullYear() - new Date(patientData.dob).getFullYear() : 'N/A'}
                               </span>
                            </div>
                         </div>
                         <button onClick={() => setActiveTab('profile')} className="w-full mt-6 py-3 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all">
                            Manage Health Profile
                         </button>
                      </div>
                   </div>

                   <div className="md:col-span-3">
                      {/* Activity Feed */}
                      <div className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 shadow-sm h-full">
                        <div className="flex items-center justify-between mb-6 sm:mb-8">
                          <h4 className="text-base sm:text-lg font-bold text-slate-800">Health Journey</h4>
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 sm:px-3 py-1 rounded-lg">Last 30 Days</span>
                        </div>

                        <div className="space-y-6">
                          {activity.length === 0 ? (
                            <div className="text-center py-10">
                              <History size={32} className="mx-auto text-slate-200 mb-3" />
                              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">No recent updates</p>
                            </div>
                          ) : (
                            activity.slice(0, 4).map((item, idx) => (
                              <div key={idx} className="flex gap-4 group">
                                <div className="flex flex-col items-center gap-1">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                                    item.type === 'booking' ? 'bg-indigo-50 text-indigo-600' : 
                                    item.type === 'prescription' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'
                                  }`}>
                                    {item.type === 'booking' ? <Calendar size={18} /> : 
                                     item.type === 'prescription' ? <FileText size={18} /> : <User size={18} />}
                                  </div>
                                  {idx !== activity.length - 1 && <div className="w-0.5 h-full bg-slate-100 group-last:hidden"></div>}
                                </div>
                                <div className="flex-1 pb-6">
                                  <div className="flex justify-between items-start mb-1">
                                    <h5 className="text-sm font-bold text-slate-800 leading-tight">{item.title}</h5>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                                      {(() => {
                                        try {
                                          const time = item.time;
                                          if (!time) return '--:--';
                                          const date = (typeof time === 'object' && time !== null && 'toDate' in time) 
                                            ? (time as any).toDate() 
                                            : new Date(time as string);
                                          return format(date, 'HH:mm');
                                        } catch (e) {
                                          return '--:--';
                                        }
                                      })()}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                    {(() => {
                                      try {
                                        const time = item.time;
                                        if (!time) return 'Recent';
                                        const date = (typeof time === 'object' && time !== null && 'toDate' in time) 
                                          ? (time as any).toDate() 
                                          : new Date(time as string);
                                        return format(date, 'MMM dd, yyyy');
                                      } catch (e) {
                                        return 'Recent';
                                      }
                                    })()} • {item.status || 'Synced'}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                   </div>
                </div>

                  {/* Profile Completion */}
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <h4 className="text-lg font-bold text-slate-800">Health Vault Security</h4>
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className="text-emerald-500" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">L3 Verified</span>
                      </div>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-3xl mb-8">
                       <div className="flex justify-between items-center mb-4">
                          <p className="text-xs font-bold text-slate-700">Digital ID Completion</p>
                          <p className="text-xs font-bold text-emerald-600">85%</p>
                       </div>
                       <div className="h-2 bg-white rounded-full overflow-hidden border border-slate-100">
                          <div className="h-full bg-emerald-500 w-[85%] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]"></div>
                       </div>
                    </div>

                    <div className="space-y-4">
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">Your digital health records are secured with end-to-end encryption. Every booking reflection is auditable.</p>
                      <div className="grid grid-cols-2 gap-3">
                         <div className="p-4 bg-white rounded-2xl border border-slate-100">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Encryption</p>
                            <p className="text-xs font-bold text-slate-800">AES-256</p>
                         </div>
                         <div className="p-4 bg-white rounded-2xl border border-slate-100">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Backup</p>
                            <p className="text-xs font-bold text-emerald-600">Daily Sync</p>
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* Next Appointment Card */}
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
                    <div className="flex items-center justify-between mb-8 relative z-10">
                      <h4 className="text-lg font-bold text-slate-800">Upcoming Visit</h4>
                      <button onClick={() => setActiveTab('appointments')} className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest hover:underline">View All</button>
                    </div>
                    
                    {appointments.find(a => a.status === 'Scheduled') ? (
                      (() => {
                        const nextA = appointments.find(a => a.status === 'Scheduled')!;
                        return (
                          <div className="relative z-10 space-y-6">
                            <div className="flex items-center gap-5 p-5 bg-slate-50 rounded-3xl border border-slate-100">
                              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                                <Calendar size={28} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">{format(new Date(nextA.date), 'EEEE, do MMM')}</p>
                                <p className="text-xs text-slate-500 font-medium">at {nextA.time}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                               <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                    {nextA.type === 'Online' ? <Video size={20} /> : <Home size={20} />}
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Consultation Mode</p>
                                    <p className="text-sm font-bold text-slate-800">{nextA.type} Visit</p>
                                  </div>
                               </div>
                               <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-3 py-1 rounded-lg uppercase tracking-widest">Confimed</span>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-center py-10">
                        <Calendar size={48} strokeWidth={1} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No visits scheduled</p>
                        <button onClick={() => setActiveTab('doctors')} className="mt-4 text-emerald-600 text-xs font-bold uppercase tracking-widest flex items-center gap-2 mx-auto">
                          Book Now <ArrowRight size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Recent Activity / Follow-ups */}
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                      <h4 className="text-lg font-bold text-slate-800">Quick Actions</h4>
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-lg">Real-time Sync</span>
                    </div>

                    <div className="flex-1 space-y-4">
                       <button onClick={() => setActiveTab('history')} className="w-full p-6 bg-slate-50 rounded-3xl flex items-center justify-between hover:bg-amber-50 transition-all group">
                          <div className="flex items-center gap-4 text-left">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm group-hover:scale-110 transition-transform">
                              <History size={24} />
                            </div>
                            <div>
                               <p className="font-bold text-slate-800">Medical History</p>
                               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Timeline View</p>
                            </div>
                          </div>
                          <ArrowRight size={18} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
                       </button>

                       <button onClick={() => setActiveTab('prescriptions')} className="w-full p-6 bg-slate-50 rounded-3xl flex items-center justify-between hover:bg-emerald-50 transition-all group">
                          <div className="flex items-center gap-4 text-left">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm group-hover:scale-110 transition-transform">
                              <FileText size={24} />
                            </div>
                            <div>
                               <p className="font-bold text-slate-800">My Prescriptions</p>
                               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Download Reports</p>
                            </div>
                          </div>
                          <ArrowRight size={18} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                       </button>

                       <button onClick={() => setActiveTab('doctors')} className="w-full p-6 bg-slate-50 rounded-3xl flex items-center justify-between hover:bg-indigo-50 transition-all group">
                          <div className="flex items-center gap-4 text-left">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm group-hover:scale-110 transition-transform">
                              <Search size={24} />
                            </div>
                            <div>
                               <p className="font-bold text-slate-800">Consult Specialist</p>
                               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Instant Booking</p>
                            </div>
                          </div>
                          <ArrowRight size={18} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                       </button>

                       <button onClick={() => setActiveTab('profile')} className="w-full p-6 bg-slate-50 rounded-3xl flex items-center justify-between hover:bg-slate-100 transition-all group border border-dashed border-slate-200">
                          <div className="flex items-center gap-4 text-left">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm group-hover:scale-110 transition-transform">
                              <Edit2 size={24} />
                            </div>
                            <div>
                               <p className="font-bold text-slate-800">Update Health ID</p>
                               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Profile Settings</p>
                            </div>
                          </div>
                          <ArrowRight size={18} className="text-slate-300 group-hover:text-slate-900 transition-colors" />
                       </button>
                    </div>
                  </div>

                {/* Follow-up / Recent Consultations */}
                <div className="bg-slate-900 p-8 lg:p-12 rounded-[3.5rem] text-white relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                   <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                     <div className="max-w-md">
                        <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full mb-6">
                           <History size={16} />
                           <span className="text-[10px] font-bold uppercase tracking-widest">Treatment Journey</span>
                        </div>
                        <h4 className="text-3xl font-bold mb-4 tracking-tight leading-tight">Monitor your recovery progress in real-time.</h4>
                        <p className="text-slate-400 text-sm leading-relaxed mb-8">All your follow-up visits and clinical reports are synced directly with your doctor's prescriptions for precision care.</p>
                        <button onClick={() => setActiveTab('appointments')} className="px-10 py-5 bg-white text-slate-900 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-emerald-500 hover:text-white transition-all shadow-2xl shadow-emerald-500/10">
                           Check Follow-ups
                        </button>
                     </div>
                     <div className="hidden md:grid grid-cols-2 gap-4 w-full md:w-auto">
                        {[
                          { icon: <CheckCircle2 size={24} />, label: "Verified Slots", desc: "Real-time doctor availability" },
                          { icon: <Clock size={24} />, label: "Smart Reminders", desc: "Never miss a follow-up" },
                          { icon: <ShieldCheck size={24} />, label: "Encrypted Data", desc: "Private health portal" },
                          { icon: <Sparkles size={24} />, label: "AI Insights", desc: "Preliminary mapping" }
                        ].map((feat, idx) => (
                          <div key={idx} className="bg-white/5 p-6 rounded-3xl border border-white/5 backdrop-blur-sm">
                             <div className="text-emerald-400 mb-3">{feat.icon}</div>
                             <p className="font-bold text-sm mb-1">{feat.label}</p>
                             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{feat.desc}</p>
                          </div>
                        ))}
                     </div>
                   </div>
                </div>
              </motion.div>
            )}

            {currentTab === 'history' && (
              <motion.div 
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 sm:space-y-8"
              >
                <div className="bg-slate-900 p-6 sm:p-8 lg:p-12 rounded-[2rem] sm:rounded-[3rem] text-white relative overflow-hidden mb-4 sm:mb-8">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                  <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full mb-4 sm:mb-6">
                      <History size={14} className="sm:size-4" />
                      <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest">Complete Record</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 tracking-tight">Your Medical Timeline</h3>
                    <p className="text-slate-400 text-xs sm:text-sm max-w-xl leading-relaxed">A chronological journey of your health consultations, prescriptions, and recoveries. All your clinical data is encrypted and synced in real-time.</p>
                  </div>
                </div>

                {appointments.length === 0 ? (
                  <div className="bg-white p-12 sm:p-16 rounded-[2rem] sm:rounded-[2.5rem] border border-dashed border-slate-200 text-center">
                    <History size={48} className="sm:size-16 mx-auto text-slate-200 mb-6" strokeWidth={1} />
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">No medical history found yet</p>
                  </div>
                ) : (
                  <div className="relative space-y-8 sm:space-y-12 before:absolute before:left-6 sm:before:left-[1.85rem] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                    {appointments.map((appt, idx) => {
                      const relatedPrescriptions = prescriptions.filter(p => p.appointmentId === appt.id || (p.createdAt.split('T')[0] === appt.date));
                      return (
                        <div key={appt.id} className="relative pl-12 sm:pl-16">
                          {/* Timeline Dot */}
                          <div className={`absolute left-0 top-2 w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center border-4 border-white shadow-xl z-10 transition-transform hover:scale-110 ${
                            appt.status === 'Completed' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {appt.status === 'Completed' ? <CheckCircle2 size={18} className="sm:size-6" /> : <Clock size={18} className="sm:size-6" />}
                          </div>

                          <div className="bg-white p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all flex flex-col lg:flex-row gap-6 sm:gap-8">
                            <div className="flex-1 space-y-4">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(new Date(appt.date), 'MMMM do, yyyy')}</span>
                                <div className="w-1.5 h-1.5 bg-slate-200 rounded-full"></div>
                                <span className={`text-[8px] sm:text-[10px] font-bold uppercase px-2 sm:px-3 py-1 rounded-lg ${
                                  appt.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                                }`}>
                                  {appt.status}
                                </span>
                              </div>
                              
                              <div>
                                <h4 className="text-lg sm:text-xl font-bold text-slate-800 mb-1 leading-tight">{appt.type === 'Online' ? 'Telehealth Consultation' : 'In-Clinic Assessment'}</h4>
                                <p className="text-xs sm:text-sm text-slate-500 font-medium italic">Reason: {appt.reason || 'General Health Check'}</p>
                              </div>

                              <div className="flex items-center gap-3 sm:gap-4 pt-2">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-50 rounded-lg sm:rounded-xl flex items-center justify-center text-emerald-600">
                                  <Stethoscope size={16} className="sm:size-5" />
                                </div>
                                <div>
                                  <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Attending Physician</p>
                                  <p className="text-xs sm:text-sm font-bold text-slate-800">Dr. {appt.doctorName}</p>
                                </div>
                              </div>
                            </div>

                            <div className="lg:w-80 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-slate-100 pt-5 sm:pt-6 lg:pt-0 lg:pl-8 space-y-4">
                              {relatedPrescriptions.length > 0 ? (
                                <div className="space-y-4">
                                  <p className="text-[8px] sm:text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em] mb-2 sm:mb-4">Treatment Issued</p>
                                  {relatedPrescriptions.map(rx => (
                                    <div key={rx.id} className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <p className="text-xs sm:text-sm font-bold text-slate-800">{rx.diagnosis}</p>
                                        <button 
                                          onClick={() => downloadPrescriptionList(rx)}
                                          className="p-1.5 sm:p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                          title="Download PDF"
                                        >
                                          <Download size={14} className="sm:size-4" />
                                        </button>
                                      </div>
                                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                        {rx.medications.map((m, mIdx) => (
                                          <span key={mIdx} className="text-[8px] sm:text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md uppercase tracking-wider">
                                            {m.name}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : appt.status === 'Completed' ? (
                                <div className="text-center py-2 sm:py-4">
                                  <div className="inline-flex items-center gap-2 text-slate-400 text-[8px] sm:text-[10px] font-bold uppercase tracking-widest bg-slate-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
                                    <Info size={12} className="sm:size-3.5" />
                                    No Prescription Issued
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-2 sm:py-4">
                                  <div className="inline-flex items-center gap-2 text-indigo-400 text-[8px] sm:text-[10px] font-bold uppercase tracking-widest bg-indigo-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
                                    <Clock size={12} className="sm:size-3.5" />
                                    Upcoming Visit
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {currentTab === 'prescriptions' && (
              <motion.div 
                key="prescriptions"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-4"
              >
                <div className="bg-emerald-50 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-emerald-100 flex items-start sm:items-center gap-4 sm:gap-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm shrink-0 border border-emerald-50">
                    <Sparkles size={24} className="sm:size-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base sm:text-lg mb-1 leading-none">Your Healing Plan</h4>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-xl">Your practitioner has prescribed personalized remedies. Adhering to the specified schedule ensures optimal therapeutic results.</p>
                  </div>
                </div>

                {prescriptions.length === 0 ? (
                  <div className="bg-white p-12 lg:p-20 rounded-2xl sm:rounded-3xl border border-dashed border-slate-200 text-center">
                    <FileText size={48} className="sm:size-16 mx-auto text-slate-300 mb-6" strokeWidth={1} />
                    <h5 className="text-slate-800 font-bold uppercase tracking-widest text-[10px] sm:text-xs">Awaiting First Prescription</h5>
                    <p className="text-slate-400 text-[10px] sm:text-xs mt-3 max-w-xs mx-auto font-medium">Once your doctor issues a remedy plan, it will appear here for viewing and download.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {prescriptions.map((rx) => {
                      const dr = doctors.find(d => d.uid === rx.doctorId);
                      return (
                        <div key={rx.id} className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 hover:border-emerald-200 transition-all group flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-6 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 text-center sm:text-left">
                          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 w-full sm:w-auto items-center sm:items-start text-center sm:text-left">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-50 rounded-xl sm:rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-all shrink-0 border border-slate-100">
                              <FileText size={24} className="sm:size-7" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 mb-2">
                                <h5 className="font-bold text-slate-800 text-base truncate">{rx.diagnosis}</h5>
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-bold tracking-widest">DRX-{rx.id?.substring(0,4)?.toUpperCase()}</span>
                              </div>
                              <div className="flex flex-wrap justify-center sm:justify-start gap-x-4 sm:gap-x-6 gap-y-2">
                                <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-500 font-bold">
                                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-100 flex items-center justify-center text-[8px] sm:text-[10px] text-slate-600">
                                    {(dr?.name || 'DR').substring(0,2).toUpperCase()}
                                  </div>
                                  {dr?.name || 'Practitioner'}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-500 font-medium">
                                  <Calendar size={12} className="text-slate-300 sm:size-3.5" />
                                  {format(new Date(rx.createdAt), 'dd MMM yyyy')}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] sm:text-xs text-emerald-600 font-bold bg-emerald-50 px-2 sm:px-3 py-1 rounded-lg">
                                  {rx.medications.length} Active Remedies
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-3 w-full sm:w-auto">
                            <button 
                              onClick={() => downloadPrescriptionList(rx)}
                              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 sm:py-4 bg-slate-900 text-white hover:bg-slate-800 rounded-xl sm:rounded-2xl text-[10px] sm:text-[11px] font-bold uppercase tracking-widest transition-all active:scale-95"
                            >
                              <Download size={16} />
                              Download Plan
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {currentTab === 'appointments' && (
              <motion.div 
                key="appointments"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-4"
              >
                {appointments.length === 0 ? (
                  <div className="bg-white p-12 lg:p-20 rounded-3xl border border-slate-200 text-center">
                    <Clock size={64} strokeWidth={1} className="mx-auto text-slate-300 mb-6" />
                    <h5 className="font-bold text-slate-800 uppercase tracking-widest text-xs">No Upcoming Consultations</h5>
                    <p className="text-slate-400 text-xs mt-3 max-w-xs mx-auto font-medium">Your schedule is currently clear. Book a check-up to keep your health on track.</p>
                    <button 
                      onClick={() => setActiveTab('doctors')}
                      className="mt-8 px-10 py-4 bg-emerald-500 text-white rounded-2xl text-xs font-bold hover:bg-emerald-600 transition-all active:scale-95 uppercase tracking-widest shadow-xl shadow-emerald-500/20"
                    >
                      Browse Doctors
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {appointments.map((appt) => (
                      <div key={appt.id} className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-emerald-200 transition-all flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
                        <div className="flex items-center gap-6 w-full sm:w-auto">
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${
                            appt.type === 'Online' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {appt.type === 'Online' ? <Video size={32} /> : <Home size={32} />}
                          </div>
                             <div className="flex-1">
                             <div className="flex items-center gap-3 mb-2">
                               <h5 className="font-bold text-slate-800 text-lg">{appt.type === 'Online' ? 'Video Telehealth' : 'Clinical Visit'}</h5>
                               <div className="flex gap-2">
                                 <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full ${
                                   appt.status === 'Completed' ? 'bg-emerald-50 text-emerald-500' :
                                   appt.status === 'Cancelled' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'
                                 }`}>
                                   {appt.status}
                                 </span>
                                 {appt.hasVoiceNote && (
                                   <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-500 rounded-full border border-red-100 text-[10px] font-bold uppercase" title="Includes voice symptoms">
                                     <Mic size={12} fill="currentColor" />
                                     Voice Note
                                   </div>
                                 )}
                                 {(appt.reason?.toLowerCase().includes('follow-up') || appt.reason?.toLowerCase().includes('review')) && (
                                   <span className="text-[10px] font-bold uppercase px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 italic">
                                     Follow-up
                                   </span>
                                 )}
                               </div>
                             </div>
                            <div className="flex flex-wrap gap-x-6 gap-y-2">
                              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                <Calendar size={14} className="text-slate-300" />
                                {format(new Date(appt.date), 'dd MMM yyyy')}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                <Clock size={14} className="text-slate-300" />
                                {appt.time}
                              </div>
                              {appt.videoLink && (
                                <div className="flex items-center gap-2 text-[10px] text-indigo-500 font-bold bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                                  <Video size={10} />
                                  <a href={appt.videoLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                    Room ID: {appt.videoLink.split('/').pop()?.substring(0, 10)}...
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                           {appt.status === 'Completed' && !feedbacks.find(f => f.appointmentId === appt.id) && (
                              <button 
                                onClick={() => {
                                  setTargetAppointment(appt);
                                  setIsReviewing(true);
                                }}
                                className="flex-1 sm:flex-none px-6 py-4 bg-emerald-500 text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-emerald-500/10 flex items-center gap-2"
                              >
                                <Star size={16} fill="currentColor" />
                                Share Feedback
                              </button>
                           )}
                           {appt.status === 'Scheduled' && (
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => {
                                    setReschedulingAppt(appt);
                                    setBookingData({
                                      date: appt.date,
                                      time: appt.time,
                                      type: appt.type as any,
                                      reason: appt.reason || '',
                                      hasVoiceNote: !!appt.hasVoiceNote
                                    });
                                    setIsRescheduling(true);
                                    setIsBooking(true);
                                  }}
                                  className="flex-1 sm:flex-none px-6 py-4 bg-emerald-50 text-emerald-600 rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all active:scale-95"
                                >
                                  Reschedule
                                </button>
                                <button 
                                  onClick={() => handleCancelAppointment(appt)}
                                  className="flex-1 sm:flex-none px-6 py-4 bg-slate-50 text-slate-600 rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all active:scale-95"
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => {
                                    setGrievanceData({
                                      doctorId: appt.doctorId || '',
                                      doctorName: appt.doctorName || '',
                                      subject: `Report regarding appointment on ${appt.date}`,
                                      description: '',
                                      severity: 'warning'
                                    });
                                    setIsGrievanceOpen(true);
                                  }}
                                  className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all border border-slate-100"
                                  title="Clinical Complaint"
                                >
                                  <AlertTriangle size={18} />
                                </button>
                              </div>
                           )}
                           {appt.status === 'Scheduled' && appt.type === 'Online' && (
                            <button 
                              onClick={() => setActiveCall(appt)}
                              className="flex-1 sm:flex-none px-6 py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-slate-900 transition-all active:scale-95 shadow-lg shadow-indigo-100"
                            >
                              Join Consult
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {currentTab === 'logs' && (
              <motion.div 
                key="logs"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Your Health Journey</h3>
                    <p className="text-slate-500 text-xs mt-1 font-medium italic">Tracking your daily symptoms helps us personalize your homeopathic care.</p>
                  </div>
                  <button 
                    onClick={() => setIsLoggingSymptom(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl active:scale-95"
                  >
                    <Plus size={18} />
                    Log Symptoms
                  </button>
                </div>

                {symptomLogs.length === 0 ? (
                  <div className="bg-white p-12 lg:p-20 rounded-[3rem] border border-slate-200 text-center shadow-sm">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-200">
                      <Activity size={48} strokeWidth={1} />
                    </div>
                    <h5 className="font-bold text-slate-800 uppercase tracking-widest text-xs">No Logs Found</h5>
                    <p className="text-slate-400 text-xs mt-4 max-w-xs mx-auto font-medium leading-relaxed">Start tracking your vitality and symptoms to build a comprehensive health record.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {symptomLogs.map((log) => (
                      <div key={log.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 hover:border-indigo-200 transition-all group shadow-sm flex flex-col gap-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm border border-indigo-100">
                              <Activity size={18} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Vital Record</p>
                              <p className="text-sm font-bold text-slate-800">{format(new Date(log.createdAt), 'dd MMM yyyy')}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Severity</p>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              log.severity > 7 ? 'bg-red-50 text-red-500' : 
                              log.severity > 4 ? 'bg-orange-50 text-orange-500' : 'bg-emerald-50 text-emerald-500'
                            }`}>
                              {log.severity}/10
                            </span>
                          </div>
                        </div>

                        <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-3">
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                              <AlertCircle size={10} /> Core Symptoms
                            </p>
                            <p className="text-xs text-slate-700 font-bold leading-relaxed">{log.symptoms}</p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                              <div>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Vitality</p>
                                <p className="text-[10px] text-slate-600 font-black flex items-center gap-1">
                                  <Zap size={10} className="text-amber-500" /> {log.energyLevel}
                                </p>
                              </div>
                              <div>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Mood</p>
                                <p className="text-[10px] text-slate-600 font-black flex items-center gap-1">
                                  <Smile size={10} className="text-indigo-500" /> {log.mood}
                                </p>
                              </div>
                          </div>
                        </div>

                        {log.notes && (
                          <div className="mt-auto">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Personal Observations</p>
                            <p className="text-xs text-slate-500 italic bg-slate-50/30 p-3 rounded-xl border border-dashed border-slate-200">"{log.notes}"</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
            
            {currentTab === 'doctors' && (
              <motion.div 
                key="doctors"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-8"
              >
                {/* Prominent Search Bar */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-3xl sm:rounded-[2.5rem] blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
                  <div className="relative bg-white p-1 sm:p-2 rounded-2xl sm:rounded-[2.2rem] border border-slate-200 shadow-2xl shadow-slate-200/50 flex items-center">
                    <div className="pl-4 sm:pl-6 text-slate-400">
                      <Search size={20} className="sm:size-6" strokeWidth={2.5} />
                    </div>
                    <input 
                      type="text"
                      placeholder="Search for doctors, specializations..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-3 sm:pl-4 pr-4 sm:pr-6 py-4 sm:py-6 bg-transparent outline-none text-sm sm:text-lg font-bold text-slate-800 placeholder:text-slate-300"
                    />
                    <div className="hidden sm:flex items-center gap-2 pr-4">
                      <div className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        ⌘K
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Specialization Filters */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h5 className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Quick Specialty Filter</h5>
                    <div className="flex items-center gap-1 text-[8px] sm:text-[10px] font-bold text-emerald-600 uppercase tracking-widest cursor-pointer hover:underline" onClick={() => setSpecializationFilter('All')}>
                      Clear
                    </div>
                  </div>
                  
                  <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-4 no-scrollbar -mx-4 sm:-mx-2 px-4 sm:px-2 mask-linear-r">
                    {specializations.map((spec) => (
                      <motion.button
                        key={spec}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSpecializationFilter(spec)}
                        className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-[9px] sm:text-[11px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border shadow-sm ${
                          specializationFilter === spec 
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-200' 
                            : 'bg-white text-slate-500 border-slate-100 hover:border-emerald-200 hover:bg-emerald-50'
                        }`}
                      >
                        {spec}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredDoctors.map((dr) => (
                    <motion.div 
                      layout
                      key={dr.uid}
                      className="bg-white p-6 rounded-[2rem] border border-slate-200 hover:border-emerald-200 transition-all group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:scale-150 transition-transform duration-1000"></div>
                      
                      <div className="flex items-start gap-6 relative z-10">
                        <div className="w-16 h-16 lg:w-20 lg:h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-all shrink-0 border border-slate-200 group-hover:border-emerald-100 overflow-hidden">
                          {dr.photoURL ? (
                            <img src={dr.photoURL} alt={dr.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Stethoscope size={32} />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-bold text-slate-800 text-lg">Dr. {dr.name}</h5>
                            {dr.isVerified ? (
                              <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 ring-4 ring-emerald-50/50">
                                <ShieldCheck size={12} className="fill-emerald-600/10" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Verified Expert</span>
                              </div>
                            ) : (
                              <CheckCircle2 size={16} className="text-slate-300" />
                            )}
                          </div>
                          <p className="text-emerald-600 font-bold text-xs uppercase tracking-widest mb-4">
                            {dr.specialization || 'Homeopath Specialist'}
                          </p>
                          
                          <div className="grid grid-cols-2 gap-4 mb-6 text-slate-600">
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Experience</span>
                              <p className="text-sm font-bold">{dr.experience || '8'}+ Years</p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Status</span>
                              <p className="text-sm font-bold text-emerald-600 flex items-center gap-1.5 leading-none">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                Available
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                             <button 
                              onClick={() => {
                                setSelectedDoctor(dr);
                                setIsBooking(true);
                              }}
                              className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                             >
                               Book Visit <ArrowRight size={14} />
                             </button>
                             <button 
                               onClick={() => {
                                 setGrievanceData({
                                   doctorId: dr.uid || '',
                                   doctorName: dr.name || '',
                                   subject: '',
                                   description: '',
                                   severity: 'info'
                                 });
                                 setIsGrievanceOpen(true);
                               }}
                               className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all border border-slate-100"
                               title="Report Issue"
                             >
                               <AlertCircle size={18} />
                             </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {currentTab === 'profile' && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-8"
              >
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm relative">
                  <div className="h-32 bg-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                  </div>
                  
                  <div className="px-8 pb-8">
                    <div className="flex flex-col sm:flex-row justify-between items-end -mt-12 mb-8 gap-6 relative z-10">
                      <div className="w-24 h-24 lg:w-32 lg:h-32 bg-white rounded-[2.5rem] p-1 shadow-2xl border border-slate-100">
                        <div className="w-full h-full bg-emerald-50 rounded-[2.2rem] flex items-center justify-center text-emerald-600 text-3xl lg:text-4xl font-bold border-4 border-white">
                          {(patientData?.name || 'P').substring(0,1).toUpperCase()}
                        </div>
                      </div>
                      
                      {!isEditing ? (
                        <button 
                          onClick={() => setIsEditing(true)}
                          className="px-8 py-4 bg-white border border-slate-200 text-slate-800 rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-2 h-14 shadow-sm"
                        >
                          <Edit2 size={16} className="text-emerald-500" />
                          Update Vault
                        </button>
                      ) : (
                        <div className="flex gap-3 h-14">
                          <button 
                            onClick={() => setIsEditing(false)}
                            className="px-6 py-4 text-slate-400 text-[11px] font-bold uppercase tracking-widest hover:text-red-500 transition-colors"
                          >
                            Discard
                          </button>
                          <button 
                            onClick={handleUpdateProfile}
                            className="px-8 py-4 bg-emerald-500 text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center gap-2"
                          >
                            <Save size={16} />
                            Save Profile
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                      <div className="lg:col-span-8 space-y-10">
                        {isEditing ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="space-y-2">
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                               <input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-emerald-500 outline-none text-sm font-bold" />
                             </div>
                             <div className="space-y-2">
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                               <input value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-emerald-500 outline-none text-sm font-bold" />
                             </div>
                             <div className="space-y-2">
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Birthday</label>
                               <input type="date" value={formData.dob || ''} onChange={e => setFormData({...formData, dob: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-emerald-500 outline-none text-sm font-bold" />
                             </div>
                             <div className="space-y-2">
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Gender</label>
                               <select value={formData.gender || ''} onChange={e => setFormData({...formData, gender: e.target.value as any})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-emerald-500 outline-none text-sm font-bold">
                                 <option value="Male">Male</option>
                                 <option value="Female">Female</option>
                                 <option value="Other">Other</option>
                               </select>
                             </div>
                             <div className="space-y-2">
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Blood Group</label>
                               <select value={formData.bloodGroup || ''} onChange={e => setFormData({...formData, bloodGroup: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-emerald-500 outline-none text-sm font-bold">
                                 <option value="">Select</option>
                                 <option value="A+">A+</option>
                                 <option value="A-">A-</option>
                                 <option value="B+">B+</option>
                                 <option value="B-">B-</option>
                                 <option value="O+">O+</option>
                                 <option value="O-">O-</option>
                                 <option value="AB+">AB+</option>
                                 <option value="AB-">AB-</option>
                               </select>
                             </div>
                             <div className="space-y-2">
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Emergency Contact Name</label>
                               <input value={formData.emergencyContactName || ''} onChange={e => setFormData({...formData, emergencyContactName: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-emerald-500 outline-none text-sm font-bold" placeholder="Contact Name" />
                             </div>
                             <div className="space-y-2">
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Emergency Contact Phone</label>
                               <input value={formData.emergencyContactPhone || ''} onChange={e => setFormData({...formData, emergencyContactPhone: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-emerald-500 outline-none text-sm font-bold" placeholder="Phone Number" />
                             </div>
                             <div className="md:col-span-2 space-y-2">
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Address</label>
                               <textarea value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-emerald-500 outline-none text-sm font-bold" />
                             </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-slate-700">
                             <div className="space-y-4">
                               <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vital Bio</h6>
                               <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 flex items-center gap-4">
                                 <Phone className="text-emerald-500" size={18} />
                                 <span className="font-bold text-sm">{patientData?.phone || 'Not added'}</span>
                               </div>
                               <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 flex items-center gap-4">
                                 <Mail className="text-emerald-500" size={18} />
                                 <span className="font-bold text-sm">{patientData?.email || 'N/A'}</span>
                               </div>
                             </div>
                             <div className="space-y-4">
                               <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Holistic Metadata</h6>
                               <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 flex items-center gap-4">
                                 <Cake className="text-emerald-500" size={18} />
                                 <span className="font-bold text-sm">{patientData?.dob ? format(new Date(patientData.dob), 'dd MMM yyyy') : 'No DOB'}</span>
                               </div>
                               <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 flex items-center gap-4">
                                 <GenderIcon className="text-emerald-500" size={18} />
                                 <span className="font-bold text-sm">{patientData?.gender || 'Not specified'}</span>
                               </div>
                               <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
                                 <div className="flex items-center gap-4">
                                   <div className="w-5 h-5 bg-red-100 text-red-600 rounded flex items-center justify-center text-[10px] font-bold">B</div>
                                   <span className="font-bold text-sm">{patientData?.bloodGroup || 'Not set'}</span>
                                 </div>
                                 <span className="text-[9px] font-bold text-slate-400 uppercase">Blood Group</span>
                               </div>
                               <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
                                 <div className="flex items-center gap-4">
                                   <ShieldCheck className="text-emerald-500" size={18} />
                                   <div className="flex flex-col">
                                     <span className="font-bold text-sm">{patientData?.emergencyContactName || 'None listed'}</span>
                                     <span className="text-[10px] text-slate-400 font-medium">{patientData?.emergencyContactPhone || ''}</span>
                                   </div>
                                 </div>
                                 <span className="text-[9px] font-bold text-slate-400 uppercase">Emergency</span>
                               </div>
                             </div>
                          </div>
                        )}
                      </div>
                      <div className="lg:col-span-4 space-y-8">
                        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-200">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl"></div>
                           <Logo size="sm" theme="light" />
                           <div className="my-10 space-y-4">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Patient Digital ID</p>
                              <div className="space-y-1">
                                 <h4 className="text-lg font-bold tracking-tight uppercase leading-none">{patientData?.name}</h4>
                                 <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">{patientData?.phone}</p>
                              </div>
                              <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                                 <div>
                                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mb-1">Clinic ID</p>
                                    <p className="text-xs font-mono font-bold tracking-tighter">KHC-{patientData?.id?.substring(0,8).toUpperCase()}</p>
                                 </div>
                                 <div className="w-12 h-12 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center">
                                    <Sparkles size={20} className="text-emerald-400" />
                                 </div>
                              </div>
                           </div>
                           <button className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10">
                              <Download size={16} />
                              Generate Card
                           </button>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200">
                           <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Profile Status</h5>
                           <div className="space-y-4">
                              {patientData?.isVerified ? (
                                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-4">
                                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-emerald-600 shadow-sm">
                                    <ShieldCheck size={20} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-slate-800">Verified Identity</p>
                                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Medical Grade Trust</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-4">
                                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-amber-600 shadow-sm">
                                    <AlertTriangle size={20} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-slate-800">Pending Verification</p>
                                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">Limited Access</p>
                                  </div>
                                </div>
                              )}
                              <p className="text-[10px] text-slate-500 font-medium leading-relaxed px-2">
                                Verified profiles have priority booking and can access advanced tele-health features. Contact your doctor to verify your records.
                              </p>
                           </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200">
                           <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Security & Access</h5>
                           <div className="space-y-4">
                              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                                 <div className="flex items-center gap-3">
                                   <Smartphone size={18} className="text-emerald-500" />
                                   <div className="flex flex-col">
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Primary Access</span>
                                      <span className="text-[11px] font-bold text-slate-800">{patientData?.mobileNumber || patientData?.phone}</span>
                                   </div>
                                 </div>
                                 <div className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[8px] font-black uppercase tracking-widest">Linked</div>
                              </div>
                              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                                 <div className="flex items-center gap-3">
                                   <ShieldCheck size={18} className="text-indigo-500" />
                                   <div className="flex flex-col">
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Registration ID</span>
                                      <span className="text-[11px] font-bold text-slate-800">KHC-{patientData?.id?.substring(0,8).toUpperCase()}</span>
                                   </div>
                                 </div>
                                 <button 
                                   onClick={() => {
                                      navigator.clipboard.writeText(`KHC-${patientData?.id?.substring(0,8).toUpperCase()}`);
                                      toast.success('KHC-ID copied to clipboard');
                                   }}
                                   className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-indigo-500"
                                 >
                                    <Edit2 size={14} />
                                 </button>
                              </div>
                           </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200">
                           <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Security Context</h5>
                           <div className="space-y-4">
                              <div className="flex items-center gap-3">
                                 <ShieldCheck size={18} className="text-emerald-500" />
                                 <span className="text-[11px] font-bold text-slate-800">Two-Factor Enabled</span>
                              </div>
                              <div className="flex items-center gap-3">
                                 <ShieldCheck size={18} className="text-emerald-500" />
                                 <span className="text-[11px] font-bold text-slate-800">Biometric Sync Ready</span>
                              </div>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            {currentTab === 'billing' && (
              <motion.div 
                key="billing"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-center px-2">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Health Wallet</h3>
                    <p className="text-xs text-slate-400 font-medium italic">Track your consultations and financial footprint</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-3">
                    <div className="text-right">
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Razorpay Verified</p>
                       <p className="text-[10px] font-bold text-emerald-600">SECURE GATEWAY</p>
                    </div>
                    <ShieldCheck className="text-emerald-500" size={24} />
                  </div>
                </div>

                {patientData && (
                  <PatientBillingHistory 
                    patient={patientData} 
                    doctor={doctors.length > 0 ? doctors[0] : null} 
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Holistic Side Dashboard */}
        <div className="w-full lg:w-96 space-y-6 sm:space-y-8">
            <div className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-100/40 relative overflow-hidden flex flex-col items-center text-center">
               <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-50 text-emerald-600 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-4">
                  <CreditCard size={28} className="sm:size-8" />
               </div>
               <h5 className="font-bold text-slate-800 mb-2">Health Wallet</h5>
               <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4 sm:mb-6">Pending Clearance</p>
               <p className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6 sm:mb-8">
                ₹{invoices.filter(i => i.status === 'Pending').reduce((acc, c) => acc + c.amount, 0).toLocaleString()}
               </p>
               <button 
                onClick={() => setActiveTab('billing')}
                className="w-full py-4 sm:py-5 bg-slate-900 text-white rounded-xl sm:rounded-2xl text-[10px] sm:text-[11px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
               >
                 Pay Now
               </button>
            </div>

           <div className="bg-slate-900 p-8 sm:p-10 rounded-[2rem] sm:rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/10 rounded-xl sm:rounded-2xl flex items-center justify-center mb-6">
                <BrainCircuit size={24} className="text-emerald-400 sm:size-7" />
              </div>
              <h4 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 tracking-tight">Wellness AI</h4>
              <p className="text-[10px] sm:text-xs text-slate-400 mb-6 sm:mb-8 leading-relaxed">Describe your symptoms to our specialist AI for initial mapping.</p>
              <button className="w-full py-4 bg-emerald-500 text-white rounded-xl sm:rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-400 transition-all">
                Talk to AI
              </button>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {isReviewing && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden relative"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <Star size={20} fill="currentColor" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-xl tracking-tight">Your Health Feedback</h3>
                </div>
                <button 
                  onClick={() => setIsReviewing(false)}
                  className="p-3 text-slate-400 hover:text-slate-600 rounded-2xl transition-colors border border-slate-100 bg-white"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmitReview} className="p-10 space-y-8">
                <div className="space-y-4">
                  <p className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest leading-loose">
                    How was your consultation with<br/>
                    <span className="text-slate-800 text-sm">{targetAppointment?.doctorName}?</span>
                  </p>
                  
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewData({...reviewData, rating: star})}
                        className={`p-2 transition-all transform hover:scale-110 ${star <= reviewData.rating ? 'text-amber-400' : 'text-slate-200'}`}
                      >
                        <Star size={40} fill={star <= reviewData.rating ? 'currentColor' : 'none'} strokeWidth={2} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Additional Observations (Optional)</label>
                   <textarea 
                    value={reviewData.comment} 
                    onChange={e => setReviewData({...reviewData, comment: e.target.value})} 
                    placeholder="Share your experience or any positive outcomes..."
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-emerald-500 outline-none text-sm font-bold resize-none leading-relaxed" 
                    rows={4} 
                  />
                </div>

                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsReviewing(false)}
                    className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-3xl font-bold uppercase tracking-widest text-xs hover:bg-slate-100 transition-all"
                  >
                    Skip
                  </button>
                  <button type="submit" className="flex-[2] py-5 bg-emerald-600 text-white rounded-3xl font-bold uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200">
                    Submit Review
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isBooking && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden relative"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-800 text-xl tracking-tight">
                  {isRescheduling ? 'Reschedule Visit' : 'Schedule Journey'}
                </h3>
                <button 
                  onClick={() => {
                    setIsBooking(false);
                    setIsRescheduling(false);
                    setReschedulingAppt(null);
                  }}
                  className="p-3 text-slate-400 hover:text-slate-600 rounded-2xl transition-colors border border-slate-100 bg-white"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleBookAppointment} className="p-10 space-y-8">
                {selectedDoctor || reschedulingAppt ? (
                   <div className="p-4 bg-emerald-50 rounded-2xl flex items-center gap-4">
                     <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600">
                       <User size={20} />
                     </div>
                     <p className="text-sm font-bold text-slate-700">Dr. {selectedDoctor?.name || reschedulingAppt?.doctorName}</p>
                   </div>
                ) : null}

                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Consultation Mode</label>
                   <div className="grid grid-cols-2 gap-4">
                     <button 
                       type="button"
                       onClick={() => setBookingData({...bookingData, type: 'Offline'})}
                       className={`py-4 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${bookingData.type === 'Offline' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-200'}`}
                     >
                       In-Clinic
                     </button>
                     <button 
                       type="button"
                       onClick={() => setBookingData({...bookingData, type: 'Online'})}
                       className={`py-4 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${bookingData.type === 'Online' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200'}`}
                     >
                       Video
                     </button>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Visit Date</label>
                    <input type="date" required value={bookingData.date} onChange={e => setBookingData({...bookingData, date: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-emerald-500 outline-none text-sm font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Visit Time</label>
                    <input type="time" required value={bookingData.time} onChange={e => setBookingData({...bookingData, time: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-emerald-500 outline-none text-sm font-bold" />
                  </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Main Concern</label>
                   <textarea value={bookingData.reason} onChange={e => setBookingData({...bookingData, reason: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-emerald-500 outline-none text-sm font-bold resize-none" rows={2} />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Voice Recording / आवाज़ रिकॉर्ड करें</label>
                    {isRecording && (
                      <span className="flex items-center gap-1.5 text-red-500 text-[10px] font-bold uppercase animate-pulse">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        Recording {formatDuration(recordingDuration)}
                      </span>
                    )}
                  </div>
                  
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center gap-4">
                    {!audioUrl ? (
                      <button 
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                          isRecording 
                            ? 'bg-red-500 text-white shadow-lg shadow-red-200 scale-110' 
                            : 'bg-white text-emerald-600 shadow-sm border border-slate-100 hover:border-emerald-200 hover:scale-105'
                        }`}
                      >
                        {isRecording ? <Square size={24} fill="currentColor" /> : <Mic size={24} />}
                      </button>
                    ) : (
                      <div className="w-full space-y-4">
                        <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                          <button 
                            type="button"
                            onClick={() => {
                              const audio = new Audio(audioUrl);
                              audio.play();
                            }}
                            className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center hover:bg-emerald-100 transition-all"
                          >
                            <Play size={18} fill="currentColor" />
                          </button>
                          <div className="flex-1 h-1 bg-slate-100 rounded-full relative overflow-hidden">
                            <div className="absolute inset-y-0 left-0 bg-emerald-500 w-full animate-progress-mock"></div>
                          </div>
                          <button 
                            type="button"
                            onClick={deleteRecording}
                            className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-100 transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
                      {isRecording ? 'Click to stop' : audioUrl ? 'Review your recording' : 'Click to explain your symptoms via voice'}
                    </p>
                  </div>
                </div>

                <button type="submit" className="w-full py-5 bg-emerald-600 text-white rounded-3xl font-bold uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200">
                   {isRescheduling ? 'Confirm Changes' : 'Confirm Assessment'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isGrievanceOpen && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden relative"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-red-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
                    <AlertTriangle size={20} />
                  </div>
                  <h3 className="font-bold text-slate-800 text-xl tracking-tight">Clinical Grievance</h3>
                </div>
                <button 
                  onClick={() => setIsGrievanceOpen(false)}
                  className="p-3 text-slate-400 hover:text-slate-600 rounded-2xl transition-colors border border-slate-100 bg-white"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmitGrievance} className="p-10 space-y-8">
                <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-loose">
                  Please describe the issue regarding your experience with<br/>
                  <span className="text-slate-800 text-sm italic">Dr. {grievanceData.doctorName || 'Selected Specialist'}</span>
                </p>

                <div className="space-y-4">
                   <div className="space-y-2">
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Issue Subject</label>
                     <input 
                      required
                      value={grievanceData.subject} 
                      onChange={e => setGrievanceData({...grievanceData, subject: e.target.value})} 
                      placeholder="e.g., Clinical Misconduct, Delayed Care..."
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-red-500 outline-none text-sm font-bold" 
                    />
                   </div>

                   <div className="space-y-2">
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Severity Level</label>
                     <div className="grid grid-cols-3 gap-2">
                        {['info', 'warning', 'critical'].map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setGrievanceData({...grievanceData, severity: s as any})}
                            className={`py-2 px-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${
                              grievanceData.severity === s 
                                ? s === 'critical' ? 'bg-red-600 text-white border-red-600' :
                                  s === 'warning' ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-400 border-slate-200'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                     </div>
                   </div>

                   <div className="space-y-2">
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Detailed Description</label>
                     <textarea 
                      required
                      value={grievanceData.description} 
                      onChange={e => setGrievanceData({...grievanceData, description: e.target.value})} 
                      placeholder="Provide specific details about your concern..."
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-red-500 outline-none text-sm font-bold resize-none leading-relaxed" 
                      rows={4} 
                    />
                   </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsGrievanceOpen(false)}
                    className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-3xl font-bold uppercase tracking-widest text-xs hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="flex-[2] py-5 bg-red-600 text-white rounded-3xl font-bold uppercase tracking-widest text-xs hover:bg-red-700 transition-all shadow-xl shadow-red-200">
                    File Complaint
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeCall && (
          <VideoMeetingRoom 
            appointment={activeCall} 
            role="patient" 
            onLeave={() => setActiveCall(null)} 
          />
        )}
        {cancellingAppt && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[70] flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden text-center p-10"
            >
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                <Info size={40} className="animate-pulse" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3 tracking-tight">Cancel Visit?</h3>
              <p className="text-sm text-slate-500 mb-10 leading-relaxed font-medium">
                Are you sure you want to cancel your appointment on <strong className="text-slate-900">{format(new Date(cancellingAppt.date), 'dd MMM yyyy')}</strong> at <strong className="text-slate-900">{cancellingAppt.time}</strong>?
              </p>
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={confirmCancellation}
                  className="w-full py-5 bg-red-600 text-white rounded-2xl font-bold text-[11px] uppercase tracking-widest hover:bg-red-700 shadow-xl shadow-red-100 transition-all active:scale-95"
                >
                  Confirm Cancellation
                </button>
                <button 
                  onClick={() => setCancellingAppt(null)}
                  className="w-full py-5 bg-slate-100 text-slate-500 rounded-2xl font-bold text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Keep Appointment
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isLoggingSymptom && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm border border-indigo-100">
                    <Activity size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-xl tracking-tight">Health Vital Logging</h3>
                    <p className="text-xs text-slate-400 font-medium tracking-tight">Detailed symptom tracking for clinical precision</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsLoggingSymptom(false)}
                  className="p-3 text-slate-400 hover:text-slate-600 rounded-2xl transition-colors border border-slate-100 bg-white"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleLogSymptom} className="p-10 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Current Symptoms / वर्तमान लक्षण</label>
                    <textarea 
                      required
                      value={symptomFormData.symptoms} 
                      onChange={e => setSymptomFormData({...symptomFormData, symptoms: e.target.value})} 
                      placeholder="e.g., Mild headache in evening, improved by rest..."
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-indigo-500 outline-none text-sm font-bold resize-none leading-relaxed" 
                      rows={3} 
                    />
                  </div>

                  <div className="space-y-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Overall Severity / गंभीरता</label>
                      <span className="text-sm font-black text-indigo-600 bg-white px-3 py-1 rounded-full shadow-sm ring-1 ring-indigo-50">{symptomFormData.severity}/10</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      step="1"
                      value={symptomFormData.severity}
                      onChange={e => setSymptomFormData({...symptomFormData, severity: parseInt(e.target.value)})}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase font-mono px-1">
                      <span>1 (Mild)</span>
                      <span>5 (Moderate)</span>
                      <span>10 (Severe)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <Smile size={12} className="text-indigo-500" /> Mood / मन की स्थिति
                      </label>
                      <select 
                        value={symptomFormData.mood} 
                        onChange={e => setSymptomFormData({...symptomFormData, mood: e.target.value})}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-indigo-500 outline-none text-sm font-bold"
                      >
                        <option>Excellent</option>
                        <option>Good</option>
                        <option>Normal</option>
                        <option>Irritable</option>
                        <option>Sad/Anxious</option>
                        <option>Angry</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <Zap size={12} className="text-amber-500" /> Energy / ऊर्जा
                      </label>
                      <select 
                        value={symptomFormData.energyLevel} 
                        onChange={e => setSymptomFormData({...symptomFormData, energyLevel: e.target.value})}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-indigo-500 outline-none text-sm font-bold"
                      >
                        <option>High</option>
                        <option>Normal</option>
                        <option>Low</option>
                        <option>Exhausted</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <Moon size={12} className="text-indigo-400" /> Sleep / नींद
                      </label>
                      <select 
                        value={symptomFormData.sleepQuality} 
                        onChange={e => setSymptomFormData({...symptomFormData, sleepQuality: e.target.value})}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-indigo-500 outline-none text-sm font-bold"
                      >
                        <option>Refreshing</option>
                        <option>Normal</option>
                        <option>Disturbed</option>
                        <option>Insomnia</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <Utensils size={12} className="text-emerald-500" /> Appetite / भूख
                      </label>
                      <select 
                        value={symptomFormData.appetite} 
                        onChange={e => setSymptomFormData({...symptomFormData, appetite: e.target.value})}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-indigo-500 outline-none text-sm font-bold"
                      >
                        <option>Increased</option>
                        <option>Normal</option>
                        <option>Decreased</option>
                        <option>No Appetite</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Droplets size={12} className="text-blue-500" /> Thirst / प्यास
                    </label>
                    <select 
                      value={symptomFormData.thirst} 
                      onChange={e => setSymptomFormData({...symptomFormData, thirst: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-indigo-500 outline-none text-sm font-bold"
                    >
                      <option>High (Thirsty)</option>
                      <option>Normal</option>
                      <option>Low (Thirstless)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Additional Observations / अन्य टिप्पणियाँ</label>
                    <textarea 
                      value={symptomFormData.notes} 
                      onChange={e => setSymptomFormData({...symptomFormData, notes: e.target.value})} 
                      placeholder="Any other details like cravings, dreams, or lifestyle changes..."
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-indigo-500 outline-none text-sm font-bold resize-none leading-relaxed" 
                      rows={2} 
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsLoggingSymptom(false)}
                    className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-[2rem] font-bold uppercase tracking-widest text-xs hover:bg-slate-100 transition-all border border-slate-100"
                  >
                    Discard Log
                  </button>
                  <button 
                    type="submit" 
                    className="flex-[2] py-5 bg-indigo-600 text-white rounded-[2rem] font-bold uppercase tracking-widest text-xs hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100"
                  >
                    Securely Save Log
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, onClick, label, icon, hasBadge }: { active: boolean, onClick: () => void, label: string, icon: React.ReactNode, hasBadge?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all flex items-center gap-2 sm:gap-2.5 uppercase tracking-widest leading-none whitespace-nowrap shrink-0 relative ${
        active ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
      }`}
    >
      {icon}
      <span className={active ? 'block' : 'hidden sm:block'}>{label}</span>
      {hasBadge && (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
      )}
    </button>
  );
}
