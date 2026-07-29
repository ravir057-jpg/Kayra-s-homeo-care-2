import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  FileText,
  FileScan,
  Brain,
  ImageIcon,
  Upload,
  Calendar, 
  MessageCircle, 
  Loader2, 
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
import { collection, query, where, getDocs, doc, updateDoc, addDoc, orderBy, getDoc, onSnapshot } from 'firebase/firestore';
import { Patient, Appointment, Prescription, UserProfile, Feedback, Invoice, SymptomLog } from '../../types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useLanguage } from '../../lib/i18n';
import ReactMarkdown from 'react-markdown';
import { analyzeMedicalReport } from '../../lib/gemini';
import { triggerWebhookStatusUpdate } from '../../lib/webhook';
import { logAction } from '../../lib/audit';
import { generatePrescriptionPDF, generateInvoicePDF } from '../../lib/pdf';
import { generateJitsiUrl } from '../../lib/video';
import VideoMeetingRoom from '../shared/VideoMeetingRoom';
import LoadingScreen from '../shared/LoadingScreen';
import PatientBillingHistory from './PatientBillingHistory';
import DoctorDiscovery from './DoctorDiscovery';
import AppointmentBooking from './AppointmentBooking';
import Logo from '../Logo';

import WhatsAppButton from '../shared/WhatsAppButton';
import ConsentModal from '../shared/ConsentModal';

export default function PatientPortal() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentTab = (searchParams.get('tab') as string) || 'appointments';
  const [recordsSubTab, setRecordsSubTab] = useState<'prescriptions' | 'reports'>('prescriptions');
  
  const [patientData, setPatientData] = useState<Patient | null>(null);
  const [clinicInfo, setClinicInfo] = useState<any>(null);
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
  const [isUploadingReport, setIsUploadingReport] = useState(false);
  const [analyzingReportId, setAnalyzingReportId] = useState<string | null>(null);
  const [selectedReportForView, setSelectedReportForView] = useState<any | null>(null);
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
  const [activity, setActivity] = useState<{ id: string, type: 'booking' | 'prescription' | 'update' | 'symptom', title: string, time: any, status?: string, details?: string }[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isGrievanceOpen, setIsGrievanceOpen] = useState(false);
  const [isBookingDoctor, setIsBookingDoctor] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [reportCategory, setReportCategory] = useState<'All' | 'Radiology' | 'Pathology' | 'Others'>('All');
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

  const [hasAcceptedConsent, setHasAcceptedConsent] = useState(() => {
    return localStorage.getItem('kayra_legal_consent_accepted') === 'true';
  });
  const [consentModalConfig, setConsentModalConfig] = useState<{
    isOpen: boolean;
    actionLabel: string;
    onAccept: () => void;
  } | null>(null);

  const executeWithConsent = (actionLabel: string, onAccept: () => void) => {
    if (localStorage.getItem('kayra_legal_consent_accepted') === 'true' || hasAcceptedConsent) {
      onAccept();
    } else {
      setConsentModalConfig({
        isOpen: true,
        actionLabel,
        onAccept
      });
    }
  };

  const triggerBooking = (doctor: UserProfile | null) => {
    executeWithConsent('Book Clinical Consult', () => {
      setSelectedDoctor(doctor || doctors[0] || null);
      setIsBooking(true);
    });
  };

  const triggerDoctorBooking = (dr: UserProfile) => {
    executeWithConsent('Confirm Booking', () => {
      setSelectedDoctor(dr);
      setIsBookingDoctor(true);
    });
  };

  const triggerActiveCall = (appt: Appointment) => {
    executeWithConsent('Proceed to Consultation', () => {
      setActiveCall(appt);
    });
  };

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const user = auth.currentUser;
    if (!file || !user || !patientData?.id) return;

    if (!hasAcceptedConsent && localStorage.getItem('kayra_legal_consent_accepted') !== 'true') {
      e.target.value = '';
      executeWithConsent('Proceed to Upload & Analysis', () => {
        toast.info("Clinical consent received. Please click 'Add to Vault' again to choose and upload your file.");
      });
      return;
    }

    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      toast.error("Security Alert: Only safe file formats (.pdf, .jpg, .jpeg, .png) are permitted.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Security Alert: Maximum file size is strictly limited to 5MB.");
      return;
    }

    try {
      setIsUploadingReport(true);
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const data = base64.split(',')[1];
        
        const reportData = {
          patientId: patientData.id,
          patientUid: user.uid,
          patientName: patientData.name,
          title: file.name,
          fileName: file.name,
          fileType: file.type,
          fileData: data, 
          status: 'Pending Analysis',
          createdAt: new Date().toISOString(),
          category: file.type.includes('image') ? 'Radiology' : 'Pathology',
          doctorId: appointments[0]?.doctorId || '', 
        };

        const path = 'medical_reports';
        try {
          const docRef = await addDoc(collection(db, path), reportData);
          toast.success("Report uploaded to vault successfully! Triggering Kayra AI Analyzer...");
          fetchData();
          
          // Trigger the AI analysis automatically with the persistent doc reference
          const uploadedReportObj = { id: docRef.id, ...reportData };
          handleAIAnalysis(uploadedReportObj);
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, path);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Upload failed");
    } finally {
      setIsUploadingReport(false);
    }
  };

  const handleAIAnalysis = async (report: any) => {
    if (!report.fileData) {
      toast.error("Report data missing");
      return;
    }

    executeWithConsent('Analyze Report', async () => {
      try {
        setAnalyzingReportId(report.id);
        const analysis = await analyzeMedicalReport(
          { data: report.fileData, mimeType: report.fileType },
          `This is a report for ${patientData?.name}. Analyze abnormal values and map them to Homeopathic Generalities/Rubrics.`,
          `Patient: ${patientData?.name}`
        );

        const path = 'medical_reports';
        try {
          await updateDoc(doc(db, path, report.id), {
            summary: analysis.split('\n').find(l => l.length > 20) || 'Analysis complete.',
            fullAnalysis: analysis,
            status: 'Analyzed',
            analyzedAt: new Date().toISOString()
          });

          // Trigger automatic webhook status trigger
          await triggerWebhookStatusUpdate(
            'MEDICAL_REPORT_STATE',
            'Analyzed',
            report.id,
            {
              patientName: patientData?.name || 'Patient',
              title: report.title || report.fileName || 'Report',
              summary: analysis.substring(0, 300) + '...'
            }
          );
          
          toast.success("AI Analysis complete and synced to clinic");
          if (selectedReportForView?.id === report.id) {
            setSelectedReportForView(prev => ({ ...prev, status: 'Analyzed', fullAnalysis: analysis }));
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, path);
        }
      } catch (error) {
        toast.error("AI Analysis failed");
      } finally {
        setAnalyzingReportId(null);
      }
    });
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
      if (user) {
        const uidQ = query(collection(db, 'patients'), where('uid', '==', user.uid));
        const uidSnap = await getDocs(uidQ);
        if (!uidSnap.empty) {
          patient = { id: uidSnap.docs[0].id, ...uidSnap.docs[0].data() } as Patient;
        }
      }
      
      if (!patient && session?.patientId) {
        const docRef = doc(db, 'patients', session.patientId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          patient = { id: docSnap.id, ...docSnap.data() } as Patient;
        }
      }

      if (patient) {
        setPatientData(patient);
        setFormData(patient);

        // Fetch Clinic Info for White-labeling
        if (patient.clinicId) {
          const clinicSnap = await getDoc(doc(db, 'clinics', patient.clinicId));
          if (clinicSnap.exists()) {
            setClinicInfo(clinicSnap.data());
          }
        }

        const targetPatientUid = patient.uid || user?.uid || '';

        if (targetPatientUid) {
          // REAL-TIME SYNC for Appointments
          const apptQuery = patient.clinicId 
            ? query(collection(db, 'appointments'), where('patientUid', '==', targetPatientUid), where('clinicId', '==', patient.clinicId))
            : query(collection(db, 'appointments'), where('patientUid', '==', targetPatientUid));
          
          onSnapshot(apptQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
            setAppointments(data.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            
            // Generate real-time activity feed
            const activityLog = data.slice(0, 5).map(a => ({
              id: a.id || Math.random().toString(),
              type: 'booking' as const,
              title: `${a.type} Visit`,
              time: a.createdAt || new Date().toISOString(),
              status: a.status,
              details: `Appointment with ${a.doctorName}`
            }));
            setActivity(activityLog);
          });

          // REAL-TIME SYNC for Prescriptions
          const rxQuery = patient.clinicId
            ? query(collection(db, 'prescriptions'), where('patientUid', '==', targetPatientUid), where('clinicId', '==', patient.clinicId))
            : query(collection(db, 'prescriptions'), where('patientUid', '==', targetPatientUid));
          
          onSnapshot(rxQuery, (snapshot) => {
            setPrescriptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prescription)));
          });

          // REAL-TIME SYNC for Invoices
          const invQuery = patient.clinicId
            ? query(collection(db, 'invoices'), where('patientUid', '==', targetPatientUid), where('clinicId', '==', patient.clinicId))
            : query(collection(db, 'invoices'), where('patientUid', '==', targetPatientUid));
          
          onSnapshot(invQuery, (snapshot) => {
            setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice)));
          });

          // REAL-TIME SYNC for Symptom Logs
          const logsQuery = patient.clinicId
            ? query(collection(db, 'symptom_logs'), where('patientUid', '==', targetPatientUid), where('clinicId', '==', patient.clinicId))
            : query(collection(db, 'symptom_logs'), where('patientUid', '==', targetPatientUid));
          
          onSnapshot(logsQuery, (snapshot) => {
            setSymptomLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SymptomLog)).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
          });

          // REAL-TIME SYNC for Reports
          const reportsQuery = patient.clinicId
            ? query(collection(db, 'medical_reports'), where('patientUid', '==', targetPatientUid), where('clinicId', '==', patient.clinicId))
            : query(collection(db, 'medical_reports'), where('patientUid', '==', targetPatientUid));
          
          onSnapshot(reportsQuery, (snapshot) => {
            setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          });
        }
      }

      // REAL-TIME SYNC for Doctors
      const drQuery = query(collection(db, 'users'), where('role', '==', 'doctor'));
      onSnapshot(drQuery, (snapshot) => {
        const docsList = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        setDoctors(docsList);
      });
    } catch (error) {
      console.error("Data fetch error:", error);
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
    const unsubscribe = auth.onAuthStateChanged((user) => {
      fetchData();
    });
    return () => unsubscribe();
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
      
      const docFee = selectedDoctor?.consultationFee || 500; // Default if not set
      const commRate = selectedDoctor?.commissionRate || 10; // Default 10%
      const commAmt = (docFee * commRate) / 100;
      const netShare = docFee - commAmt;

      const apptData = {
        ...bookingData,
        patientId: patientData.id,
        patientName: patientData.name,
        patientUid: auth.currentUser?.uid,
        doctorId: selectedDoctor?.uid || reschedulingAppt?.doctorId || '',
        doctorName: selectedDoctor?.name || reschedulingAppt?.doctorName || 'Dr. Ravi',
        status: 'pending',
        fee: docFee,
        commissionAmount: commAmt,
        doctorNetShare: netShare,
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
        createdAt: new Date().toISOString(),
        clinicId: patientData.clinicId || (targetAppointment as any).clinicId || ''
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

  const handlePaymentSuccess = async (invId: string, response: any) => {
    try {
      await updateDoc(doc(db, 'invoices', invId), {
        status: 'Paid',
        paidAt: new Date().toISOString(),
        razorpayPaymentId: response.razorpay_payment_id,
        razorpayOrderId: response.razorpay_order_id,
        razorpaySignature: response.razorpay_signature,
        updatedAt: new Date().toISOString()
      });
      
      await logAction({
        action: 'Payment Successful',
        entityType: 'Invoice',
        entityId: invId,
        details: `Patient ${patientData?.name} successfully paid invoice`
      });
      
      toast.success('Payment settled successfully');
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `invoices/${invId}`);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing Health Data</p>
        </div>
      </div>
    );
  }

  const specializations = ['All', ...new Set(doctors.map(d => d.specialization).filter(Boolean))];

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-24 lg:pb-10 px-0 sm:px-4">
      {/* Floating Action Buttons for Elderly Accessibility */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 sm:hidden">
        <button 
          onClick={() => {
            const waNumber = clinicInfo?.whatsappLink || doctors[0]?.mobileNumber || '919153000000';
            const cleanNumber = waNumber.replace(/\D/g, '');
            window.open(`https://wa.me/${cleanNumber}?text=Hello Doctor, I need assistance.`, '_blank');
          }}
          className="w-14 h-14 bg-emerald-500 text-white rounded-full shadow-2xl flex items-center justify-center animate-bounce group"
          aria-label="WhatsApp Support"
        >
          <MessageCircle size={24} />
        </button>
        <button 
          onClick={() => {
            const upcoming = appointments.find(a => a.status === 'Scheduled' && a.type === 'Online');
            if (upcoming) setActiveCall(upcoming);
            else toast.info("No scheduled video call found. Please book one first.");
          }}
          className="w-14 h-14 bg-brand-600 text-white rounded-full shadow-2xl flex items-center justify-center"
          aria-label="Video Call"
        >
          <Video size={24} />
        </button>
      </div>

      {/* Main Header - Redesigned to be Minimalist and Teal */}
      <div className="bg-white border-b border-slate-100 sm:rounded-[2rem] sm:border p-3 sm:p-8 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-6 shadow-sm relative overflow-hidden">
        {/* Abstract Art Background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/30 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
        
        <div className="flex items-center gap-3 sm:gap-5 w-full sm:w-auto relative z-10">
          <button 
            onClick={() => setActiveTab('profile')}
            className="w-12 h-12 sm:w-16 sm:h-16 bg-brand-50 rounded-xl sm:rounded-2xl flex items-center justify-center text-brand-600 shadow-sm border border-brand-100 shrink-0 hover:bg-brand-100 transition-colors"
          >
            {clinicInfo?.logoUrl ? <img src={clinicInfo.logoUrl} alt="Clinic Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" /> : <User size={24} className="sm:size-8" />}
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[8px] sm:text-[10px] font-black text-brand-600 uppercase tracking-[0.3em] mb-0.5">Sanctuary</p>
            <h1 className="text-lg sm:text-3xl font-black text-slate-800 tracking-tight truncate leading-tight">Hi, {patientData?.name?.split(' ')[0]}</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-0.5">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <p className="text-[10px] sm:text-xs text-slate-400 font-medium tracking-wide truncate">Your profile is ready.</p>
              </div>
              {patientData?.khcId && (
                <div className="flex items-center gap-1.5 sm:border-l sm:border-slate-200 sm:pl-3">
                  <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID:</span>
                  <span className="text-[9px] sm:text-xs font-black text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md px-1.5 py-0.5 rounded-md">{patientData.khcId}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto relative z-10">
          <button 
            onClick={() => {
              const waNumber = clinicInfo?.whatsappLink || doctors[0]?.mobileNumber || '919153000000';
              const cleanNumber = waNumber.replace(/\D/g, '');
              window.open(`https://wa.me/${cleanNumber}?text=Hello Doctor, I need assistance.`, '_blank');
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-6 py-2.5 sm:py-4 bg-emerald-50 text-emerald-700 rounded-lg sm:rounded-2xl text-[9px] sm:text-xs font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100"
          >
            <MessageCircle size={14} />
            <span className="xs:inline">Support</span>
          </button>
          <button 
             onClick={() => {
              const upcoming = appointments.find(a => a.status === 'Scheduled' && a.type === 'Online');
              if (upcoming) setActiveCall(upcoming);
              else toast.info("No scheduled video call found. Please book one first.");
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-6 py-2.5 sm:py-4 bg-brand-600 text-white rounded-lg sm:rounded-2xl text-[9px] sm:text-xs font-bold uppercase tracking-widest hover:bg-brand-700 transition-all shadow-lg shadow-brand-200"
          >
            <Video size={14} />
            <span className="xs:inline text-nowrap">Call Dr.</span>
          </button>
          <button 
            onClick={handleSignOut}
            className="p-2.5 sm:p-4 bg-slate-50 text-slate-400 hover:text-red-500 rounded-lg sm:rounded-2xl transition-all border border-slate-100"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 px-4 sm:px-0">
        {/* Main Content Area */}
        <div className="flex-1 space-y-6 sm:space-y-8 min-w-0">
          {/* Responsive Navigation Tabs - Conforming to the strictly declared three-tab UX layout */}
          <div className="flex gap-2.5 p-2 bg-white border border-slate-100 rounded-3xl w-full sm:w-fit shadow-xl shadow-slate-100/50 sticky top-[72px] sm:static z-30 mb-8 font-medium overflow-x-auto no-scrollbar flex-nowrap shrink-0">
            <TabButton 
              id="tab-my-appointments"
              active={currentTab === 'appointments'} 
              onClick={() => setActiveTab('appointments')}
              label="📅 My Appointments"
              icon={<Calendar size={18} className="text-teal-600" />}
              hasBadge={appointments.some(a => a.status === 'Scheduled')}
            />
            <TabButton 
              id="tab-my-records"
              active={currentTab === 'records'} 
              onClick={() => setActiveTab('records')}
              label="📊 My Health Records"
              icon={<FileText size={18} className="text-teal-600" />}
            />
            <TabButton 
              id="tab-my-billing"
              active={currentTab === 'billing'} 
              onClick={() => setActiveTab('billing')}
              label="💳 Quick Bill Pay"
              icon={<CreditCard size={18} className="text-teal-600" />}
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
                      className="bg-brand-600 p-6 sm:p-8 rounded-[2.5rem] text-white overflow-hidden relative group shadow-2xl shadow-brand-200"
                    >
                      <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                      <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
                        <div className="w-16 h-16 bg-white/20 text-white rounded-3xl flex items-center justify-center shrink-0">
                          <Star size={32} fill="white" className="animate-pulse" />
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                          <h4 className="text-xl font-black tracking-tight mb-2 italic">How was your last visit?</h4>
                          <p className="text-sm font-medium text-brand-50 leading-relaxed max-w-md">
                            Your feedback helps Dr. {pendingReview.doctorName} improve and assists other patients in choosing the right care.
                          </p>
                        </div>
                        <button 
                          onClick={() => {
                            setTargetAppointment(pendingReview);
                            setReviewData({ rating: 5, comment: '' });
                            setIsReviewing(true);
                          }}
                          className="px-8 py-4 bg-white text-brand-600 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-brand-50 transition-all active:scale-95 shadow-xl shadow-brand-900/10 flex items-center gap-2"
                        >
                          Leave Feedback <ArrowRight size={14} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })()}

                {/* AI Insights Summary Grid */}
                {reports.some(r => r.status === 'Analyzed') && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 shadow-sm">
                        <Sparkles size={20} />
                      </div>
                      <h4 className="text-xl font-black text-slate-800 tracking-tight">AI Diagnostic Insights</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {reports.filter(r => r.status === 'Analyzed').slice(0, 2).map((report) => (
                        <motion.div 
                          key={report.id}
                          whileHover={{ scale: 1.02 }}
                          className="bg-white p-6 rounded-[2rem] border border-brand-100 shadow-sm relative overflow-hidden group cursor-pointer"
                          onClick={() => setSelectedReportForView(report)}
                        >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
                          <div className="relative z-10">
                            <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-2">{report.title}</p>
                            <p className="text-xs font-semibold text-slate-700 leading-relaxed italic line-clamp-3">
                              "{report.summary}"
                            </p>
                            <div className="mt-4 flex items-center justify-between">
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{format(new Date(report.createdAt), 'dd MMM yyyy')}</span>
                              <button className="text-[10px] font-black text-brand-600 uppercase tracking-widest flex items-center gap-1 group-hover:gap-2 transition-all">
                                View Details <ArrowRight size={12} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats Grid - High Visual Impact, Low Space */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
                  <div className="bg-white p-3 sm:p-6 rounded-xl sm:rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-2.5 sm:gap-5">
                    <div className="w-9 h-9 sm:w-12 sm:h-12 bg-brand-50 text-brand-600 rounded-lg sm:rounded-2xl flex items-center justify-center shrink-0">
                      <Calendar size={18} className="sm:size-6" />
                    </div>
                    <div>
                      <p className="text-[7px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none">Visits</p>
                      <p className="text-sm sm:text-lg font-bold text-slate-900 mt-1">{appointments.length}</p>
                    </div>
                  </div>
                  <div className="bg-white p-3 sm:p-6 rounded-xl sm:rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-2.5 sm:gap-5">
                    <div className="w-9 h-9 sm:w-12 sm:h-12 bg-indigo-50 text-indigo-600 rounded-lg sm:rounded-2xl flex items-center justify-center shrink-0">
                      <FileText size={18} className="sm:size-6" />
                    </div>
                    <div>
                      <p className="text-[7px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none">Files</p>
                      <p className="text-sm sm:text-lg font-bold text-slate-900 mt-1">{reports.length}</p>
                    </div>
                  </div>
                  <div className="md:flex bg-white p-3 sm:p-6 rounded-xl sm:rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-2.5 sm:gap-5 hidden sm:flex">
                    <div className="w-9 h-9 sm:w-12 sm:h-12 bg-amber-50 text-amber-600 rounded-lg sm:rounded-2xl flex items-center justify-center shrink-0">
                      <CreditCard size={18} className="sm:size-6" />
                    </div>
                    <div>
                      <p className="text-[7px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none">Due</p>
                      <p className="text-sm sm:text-lg font-bold text-red-600 mt-1">₹{invoices.filter(i => i.status === 'Pending').reduce((acc, c) => acc + c.amount, 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Health Metrics Snapshot */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                   <div className="md:col-span-1 space-y-6">
                      <div className="bg-white p-5 sm:p-6 rounded-xl sm:rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-16 h-16 bg-brand-50 rounded-full blur-xl -mr-8 -mt-8 opacity-40"></div>
                         <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 relative z-10">Vitals</h5>
                         <div className="space-y-3 relative z-10">
                            <div className="flex justify-between items-center">
                               <span className="text-[11px] text-slate-500 font-medium">Group</span>
                               <span className="text-[10px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded-lg">{patientData?.bloodGroup || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                               <span className="text-[11px] text-slate-500 font-medium">Gender</span>
                               <span className="text-[11px] font-bold text-slate-800">{patientData?.gender || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                               <span className="text-[11px] text-slate-500 font-medium">Age</span>
                               <span className="text-[11px] font-bold text-slate-800">
                                  {patientData?.dob ? new Date().getFullYear() - new Date(patientData.dob).getFullYear() : 'N/A'}
                               </span>
                            </div>
                         </div>
                         <button onClick={() => setActiveTab('profile')} className="w-full mt-6 py-2.5 bg-slate-50 border border-slate-100 text-[9px] font-bold text-slate-500 uppercase tracking-widest rounded-xl hover:bg-brand-50 hover:text-brand-600 transition-all relative z-10">
                            Edit Profile
                         </button>
                      </div>
                   </div>

                   <div className="md:col-span-3">
                      {/* Activity Feed - Minimalist for Mobile */}
                      <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-[2.5rem] border border-slate-200 shadow-sm h-full">
                        <div className="flex items-center justify-between mb-5 sm:mb-8">
                          <h4 className="text-sm sm:text-lg font-bold text-slate-800 tracking-tight">Recent Journey</h4>
                          <span className="text-[8px] sm:text-[10px] font-bold text-brand-600 uppercase tracking-widest bg-brand-50 px-2 py-1 rounded-lg">Updates</span>
                        </div>

                        <div className="space-y-4 sm:space-y-6">
                          {activity.length === 0 ? (
                            <div className="text-center py-6 sm:py-10">
                              <History size={24} className="mx-auto text-slate-200 mb-2" />
                              <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">No recent data</p>
                            </div>
                          ) : (
                            activity.slice(0, 4).map((item, idx) => (
                              <div key={idx} className="flex gap-3 sm:gap-4 group">
                                <div className="flex flex-col items-center gap-1">
                                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-white ${
                                    item.type === 'booking' ? 'bg-indigo-50 text-indigo-600' : 
                                    item.type === 'prescription' ? 'bg-brand-50 text-brand-600' : 'bg-slate-50 text-slate-600'
                                  }`}>
                                    {item.type === 'booking' ? <Calendar size={14} className="sm:size-[18px]" /> : 
                                     item.type === 'prescription' ? <FileText size={14} className="sm:size-[18px]" /> : <User size={14} className="sm:size-[18px]" />}
                                  </div>
                                  {idx !== activity.length - 1 && <div className="w-0.5 h-full bg-slate-100 group-last:hidden"></div>}
                                </div>
                                <div className="flex-1 pb-4 sm:pb-6">
                                  <div className="flex justify-between items-start mb-0.5">
                                    <h5 className="text-[13px] sm:text-sm font-bold text-slate-800 leading-tight truncate max-w-[140px] sm:max-w-none">{item.title}</h5>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                                      {(() => {
                                        try {
                                          const time = item.time;
                                          if (!time) return '--:--';
                                          const date = (typeof time === 'object' && time !== null && 'toDate' in time) 
                                            ? (time as any).toDate() 
                                            : new Date(time as string);
                                          return format(date, 'dd MMM');
                                        } catch (e) { return '--:--'; }
                                      })()}
                                    </span>
                                  </div>
                                  <p className="text-[10px] sm:text-xs text-slate-400 font-medium line-clamp-1">{item.details || item.status}</p>
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
                        <ShieldCheck size={16} className="text-brand-500" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">L3 Verified</span>
                      </div>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-3xl mb-8">
                       <div className="flex justify-between items-center mb-4">
                          <p className="text-xs font-bold text-slate-700">Digital ID Completion</p>
                          <p className="text-xs font-bold text-brand-600">92%</p>
                       </div>
                       <div className="h-2 bg-white rounded-full overflow-hidden border border-slate-100">
                          <div className="h-full bg-brand-600 w-[92%] rounded-full shadow-[0_0_12px_rgba(0,128,128,0.4)]"></div>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <p className="text-xs text-slate-500 font-medium leading-relaxed">Your digital health records are secured with end-to-end encryption. Every booking reflection is auditable.</p>
                       <div className="grid grid-cols-1 gap-3">
                          <div className="p-4 bg-brand-50 rounded-2xl border border-brand-100">
                             <div className="flex items-center gap-3 mb-2">
                                <MessageCircle size={16} className="text-brand-600" />
                                <p className="text-[10px] font-bold text-brand-600 uppercase tracking-widest">Direct Support</p>
                             </div>
                             <p className="text-xs font-bold text-slate-800 mb-3">Instant clinical assistance via WhatsApp</p>
                             <button 
                               onClick={() => window.open(`https://wa.me/919153000000?text=Hello Doctor, I need assistance with my clinical case.`, '_blank')}
                               className="w-full py-3 bg-brand-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand-500 transition-all flex items-center justify-center gap-2"
                             >
                               <MessageCircle size={14} /> Open WhatsApp
                             </button>
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Next Appointment Card */}
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
                    <div className="flex items-center justify-between mb-8 relative z-10">
                      <h4 className="text-lg font-bold text-slate-800">Upcoming Visit</h4>
                      <button onClick={() => setActiveTab('appointments')} className="text-[10px] font-bold text-brand-600 uppercase tracking-widest hover:underline">View All</button>
                    </div>
                    
                    {appointments.find(a => a.status === 'Scheduled') ? (
                      (() => {
                        const nextA = appointments.find(a => a.status === 'Scheduled')!;
                        return (
                          <div className="relative z-10 space-y-6">
                            <div className="flex items-center gap-5 p-5 bg-slate-50 rounded-3xl border border-slate-100">
                              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-brand-600 shadow-sm">
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
                               <span className="text-[10px] font-bold text-brand-500 bg-brand-50 px-3 py-1 rounded-lg uppercase tracking-widest">Confimed</span>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-center py-10">
                        <Calendar size={48} strokeWidth={1} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No visits scheduled</p>
                        <button onClick={() => setActiveTab('doctors')} className="mt-4 text-brand-600 text-xs font-bold uppercase tracking-widest flex items-center gap-2 mx-auto">
                          Book Now <ArrowRight size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Highly Recommended Doctors */}
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                       <h4 className="text-lg font-bold text-slate-800 tracking-tight">Recommended Near You</h4>
                       <button onClick={() => setActiveTab('doctors')} className="text-[10px] font-bold text-brand-600 uppercase tracking-widest hover:underline">See All</button>
                    </div>
                    <div className="space-y-4">
                       {doctors.slice(0, 3).map((dr) => (
                         <div key={dr.uid} className="flex items-center justify-between p-5 bg-slate-50/50 rounded-3xl border border-slate-100 group hover:border-brand-200 transition-all">
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 bg-white rounded-2xl border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-brand-500 transition-colors overflow-hidden">
                                  {dr.photoURL ? <img src={dr.photoURL} alt={dr.name} className="w-full h-full object-cover" /> : <Stethoscope size={20} />}
                               </div>
                               <div>
                                  <h6 className="font-bold text-slate-800 text-sm">Dr. {dr.name}</h6>
                                  <p className="text-[10px] font-bold text-brand-600 uppercase tracking-widest">{dr.specialization || 'Clinical Expert'}</p>
                               </div>
                            </div>
                            <button 
                              onClick={() => {
                                triggerDoctorBooking(dr);
                              }}
                              className="px-4 py-2 bg-white border border-slate-200 text-slate-900 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand-600 hover:text-white hover:border-brand-600 transition-all shadow-sm"
                            >
                               Quick Book
                            </button>
                         </div>
                       ))}
                       {doctors.length === 0 && (
                          <div className="text-center py-6">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Finding specialists...</p>
                          </div>
                       )}
                    </div>
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

                       <button onClick={() => setActiveTab('prescriptions')} className="w-full p-6 bg-slate-50 rounded-3xl flex items-center justify-between hover:bg-brand-50 transition-all group">
                          <div className="flex items-center gap-4 text-left">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-brand-500 shadow-sm group-hover:scale-110 transition-transform">
                              <FileText size={24} />
                            </div>
                            <div>
                               <p className="font-bold text-slate-800">My Prescriptions</p>
                               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Download Reports</p>
                            </div>
                          </div>
                          <ArrowRight size={18} className="text-slate-300 group-hover:text-brand-500 transition-colors" />
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
                   <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                   <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                     <div className="max-w-md">
                        <div className="inline-flex items-center gap-2 bg-brand-500/20 text-brand-400 px-4 py-2 rounded-full mb-6">
                           <History size={16} />
                           <span className="text-[10px] font-bold uppercase tracking-widest">Treatment Journey</span>
                        </div>
                        <h4 className="text-3xl font-bold mb-4 tracking-tight leading-tight">Monitor your recovery progress in real-time.</h4>
                        <p className="text-slate-400 text-sm leading-relaxed mb-8">All your follow-up visits and clinical reports are synced directly with your doctor's prescriptions for precision care.</p>
                        <button onClick={() => setActiveTab('appointments')} className="px-10 py-5 bg-white text-slate-900 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-brand-500 hover:text-white transition-all shadow-2xl shadow-brand-500/10">
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
                             <div className="text-brand-400 mb-3">{feat.icon}</div>
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
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-12"
              >
                <div className="bg-slate-900 p-8 sm:p-14 rounded-[3.5rem] text-white relative overflow-hidden shadow-2xl shadow-slate-200">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/20 rounded-full blur-[120px] -mr-48 -mt-48 transition-all"></div>
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] -ml-32 -mb-32"></div>
                  <div className="relative z-10">
                    <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl mb-8 border border-white/10">
                      <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse"></div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-400">Master Health Vault</span>
                    </div>
                    <h3 className="text-3xl sm:text-5xl font-black mb-6 tracking-tight leading-[1.1]">The Narrative of Your Health Journey</h3>
                    <p className="text-slate-400 text-sm sm:text-base max-w-2xl leading-relaxed font-medium opacity-80">Every consultation, every remedy, and every diagnostic insight is meticulously recorded here. Your medical past informs a healthier, more predictable future.</p>
                  </div>
                </div>

                {appointments.length === 0 ? (
                  <div className="bg-white p-16 sm:p-24 rounded-[4rem] border-2 border-dashed border-slate-100 text-center flex flex-col items-center justify-center">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-8 border border-slate-100">
                      <History size={48} strokeWidth={1} />
                    </div>
                    <p className="text-slate-800 font-black uppercase tracking-widest text-[10px] mb-2">Vault is Currently Empty</p>
                    <p className="text-slate-400 text-xs font-medium max-w-xs">Your medical history will materialize as you engage with our healthcare ecosystem.</p>
                  </div>
                ) : (
                  <div className="relative space-y-16 pl-4 sm:pl-12 before:absolute before:left-4 sm:before:left-[3rem] before:top-4 before:bottom-4 before:w-1 before:bg-gradient-to-b before:from-emerald-500 before:via-slate-200 before:to-slate-100">
                    {appointments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((appt, idx) => {
                      const relatedPrescriptions = prescriptions.filter(p => p.appointmentId === appt.id || (p.createdAt?.split('T')[0] === appt.date));
                      return (
                        <div key={appt.id} className="relative group">
                          {/* Timeline Dot */}
                          <div className={`absolute -left-12 sm:-left-[3.75rem] w-8 h-8 rounded-full border-4 border-white shadow-lg transition-all z-10 flex items-center justify-center ${
                            appt.status === 'Completed' ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}>
                            {appt.status === 'Completed' ? <CheckCircle2 size={14} className="text-white" /> : <Clock size={14} className="text-white" />}
                          </div>

                          <div className="bg-white p-1 sm:p-2 pr-6 rounded-[2.5rem] border border-slate-200 hover:border-emerald-200 transition-all shadow-sm hover:shadow-2xl hover:shadow-emerald-500/5 overflow-hidden">
                            <div className="flex flex-col lg:flex-row gap-8">
                              <div className="w-full lg:w-48 bg-slate-50 p-6 rounded-[2rem] flex flex-col items-center justify-center text-center shrink-0 border border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Consult Date</span>
                                <p className="text-2xl font-black text-slate-800 leading-none">{format(new Date(appt.date), 'dd')}</p>
                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mt-1">{format(new Date(appt.date), 'MMM yyyy')}</p>
                                <div className="mt-4 px-3 py-1 bg-white rounded-full border border-slate-200 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                  {appt.time}
                                </div>
                              </div>
                              <div className="flex-1 py-4 sm:py-6 pl-4 sm:pl-0">
                                <div className="flex flex-wrap items-center gap-3 mb-4">
                                  <h5 className="text-xl font-black text-slate-800 tracking-tight">Clinical Assessment</h5>
                                  <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${
                                    appt.status === 'Completed' ? 'bg-emerald-500 text-white' : 'bg-slate-400 text-white'
                                  }`}>
                                    {appt.status}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                  <div className="space-y-4">
                                    <div className="space-y-1">
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Primary Practitioner</p>
                                      <p className="text-sm font-bold text-slate-800">Dr. {appt.doctorName}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Clinical Reasoning</p>
                                      <p className="text-sm font-medium text-slate-500 italic leading-relaxed">
                                        "{appt.reason || 'Routine follow-up for health maintenance'}"
                                      </p>
                                    </div>
                                  </div>

                                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                    <div className="flex items-center justify-between mb-4">
                                      <p className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Related Findings</p>
                                      <Zap size={14} className="text-amber-400" />
                                    </div>
                                    {relatedPrescriptions.length > 0 ? (
                                      <div className="space-y-3">
                                        {relatedPrescriptions.map(p => (
                                          <div key={p.id} className="flex items-center justify-between gap-4 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                                            <div className="flex items-center gap-3 min-w-0">
                                              <FileText size={16} className="text-emerald-500 shrink-0" />
                                              <p className="text-[10px] font-bold text-slate-700 truncate">{p.diagnosis}</p>
                                            </div>
                                            <button 
                                              onClick={() => downloadPrescriptionList(p)}
                                              className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-all shrink-0"
                                            >
                                              <Download size={14} />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No documents attached</p>
                                    )}
                                  </div>
                                </div>
                              </div>
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
                className="space-y-8"
              >
                <div className="bg-emerald-500 p-8 sm:p-14 rounded-[3.5rem] text-white relative overflow-hidden shadow-2xl shadow-emerald-500/20">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 rounded-full blur-[120px] -mr-48 -mt-48 transition-all"></div>
                  <div className="relative z-10">
                    <div className="inline-flex items-center gap-3 bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl mb-8 border border-white/20">
                      <Sparkles size={16} className="text-white" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Clinical Compliance</span>
                    </div>
                    <h3 className="text-3xl sm:text-5xl font-black mb-6 tracking-tight leading-[1.1]">Active Health Redemptions</h3>
                    <p className="text-emerald-50 text-sm sm:text-base max-w-2xl leading-relaxed font-medium opacity-90">Your therapeutic regimen is detailed below. Each plan is chemically optimized for your specific physiology. Follow the dosage instructions strictly for maximum biological efficacy.</p>
                  </div>
                </div>

                {prescriptions.length === 0 ? (
                  <div className="bg-white p-16 sm:p-24 rounded-[4rem] border-2 border-dashed border-slate-100 text-center flex flex-col items-center justify-center">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-8 border border-slate-100">
                      <FileText size={48} strokeWidth={1} />
                    </div>
                    <p className="text-slate-800 font-black uppercase tracking-widest text-[10px] mb-2">Plan Repository Clean</p>
                    <p className="text-slate-400 text-xs font-medium max-w-xs">No pharmaceutical plans have been issued to your Health ID at this time.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {prescriptions.map((rx) => {
                      const dr = doctors.find(d => d.uid === rx.doctorId);
                      return (
                        <div key={rx.id} className="bg-white p-1 pr-6 rounded-[2.5rem] border border-slate-200 hover:border-emerald-200 transition-all shadow-sm hover:shadow-2xl hover:shadow-emerald-500/5 group">
                          <div className="flex flex-col lg:flex-row gap-8">
                            <div className="w-full lg:w-64 bg-emerald-50 p-8 rounded-[2rem] flex flex-col items-center justify-center text-center shrink-0 border border-emerald-100">
                              <FileText size={36} className="text-emerald-500 mb-6" />
                              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Vault Registry</span>
                              <p className="text-xs font-black text-slate-800 tracking-tighter">DRX-{rx.id?.substring(0,8)?.toUpperCase()}</p>
                              <div className="mt-8 pt-6 border-t border-emerald-100 w-full space-y-2">
                                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Date Issued</p>
                                <p className="text-sm font-black text-slate-800">{format(new Date(rx.createdAt), 'dd MMM yyyy')}</p>
                              </div>
                            </div>

                            <div className="flex-1 py-8 pl-4 sm:pl-0">
                              <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                                <h5 className="text-2xl font-black text-slate-800 tracking-tight">{rx.diagnosis}</h5>
                                <button 
                                  onClick={() => downloadPrescriptionList(rx)}
                                  className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all active:scale-95 shadow-xl shadow-slate-200"
                                >
                                  Export as PDF
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                <div className="space-y-4">
                                  <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Issuing Specialist</p>
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-500">DR</div>
                                      <p className="text-sm font-bold text-slate-800">Dr. {dr?.name || 'Practitioner'}</p>
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Clinical Status</p>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-wider">
                                      <Zap size={10} fill="currentColor" /> Active Regimen
                                    </span>
                                  </div>
                                </div>

                                <div className="col-span-1 lg:col-span-2 bg-slate-50 p-8 rounded-3xl border border-slate-100">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">Medication Inventory</p>
                                  <div className="flex flex-wrap gap-3">
                                    {rx.medications.map((m, mIdx) => (
                                      <div key={mIdx} className="px-5 py-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                                        <div>
                                          <p className="text-[11px] font-black text-slate-800 tracking-tight leading-none">{m.name}</p>
                                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{m.dosage}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
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
                className="space-y-8"
              >
                {/* Critical Alerts / Pending Payments nested here for immediate action */}
                {invoices.filter(i => i.status === 'Pending').length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, x: -25 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-red-50 border border-red-100 p-6 sm:p-8 rounded-[2.5rem] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-red-500 shadow-sm shrink-0 border border-red-100">
                        <AlertCircle size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest pl-0.5 mb-1">Financial Clearance Required</p>
                        <h4 className="font-bold text-slate-800 tracking-tight">You have {invoices.filter(i => i.status === 'Pending').length} pending payment(s)</h4>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">Please clear outstanding consultation dues via our secure gateway to keep records active.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveTab('billing')}
                      className="w-full sm:w-auto px-8 py-4 bg-red-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-xl shadow-red-200 cursor-pointer text-center shrink-0"
                    >
                      Pay Now
                    </button>
                  </motion.div>
                )}

                {/* Feedback Prompt nested here */}
                {(() => {
                  const pendingReview = appointments.find(a => a.status === 'Completed' && !feedbacks.some(f => f.appointmentId === a.id));
                  if (!pendingReview) return null;
                  
                  return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-brand-600 p-8 rounded-[3.5rem] text-white overflow-hidden relative group shadow-2xl shadow-brand-100"
                    >
                      <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                      <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-2">Patient Feedback</p>
                          <h4 className="text-2xl font-black mb-1 tracking-tight leading-none">Consultation Completed</h4>
                          <p className="text-brand-100 text-xs font-semibold leading-relaxed max-w-md mt-2">Help us enhance clinical outcomes! Share your treatment feedback of your session with Dr. {pendingReview.doctorName} instantly.</p>
                        </div>
                        <button 
                          onClick={() => {
                            setTargetAppointment(pendingReview);
                            setIsReviewing(true);
                          }}
                          className="px-8 py-4.5 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-slate-950/10 cursor-pointer shrink-0"
                        >
                          Submit Review
                        </button>
                      </div>
                    </motion.div>
                  );
                })()}

                {/* Hero Booking CTA Card */}
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 sm:p-12 rounded-[3.5rem] text-white relative overflow-hidden shadow-2xl shadow-emerald-500/20">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-white/15 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none" />
                  <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                      <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl mb-4 border border-white/25 text-[10px] font-black uppercase tracking-widest leading-none">
                        <Calendar size={12} />
                        Bihar's Sanctuary Care
                      </span>
                      <h3 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight mb-2">Book Clinical Consult</h3>
                      <p className="text-emerald-50 text-xs sm:text-sm font-medium opacity-90 max-w-xl">
                        Schedule a customized evaluation with Dr. Ravi Raj or other verified homeopathic physicians securely.
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        triggerBooking(doctors[0] || null);
                      }}
                      className="px-10 py-5 bg-white text-emerald-700 hover:bg-slate-50 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-emerald-950/10 cursor-pointer shrink-0"
                    >
                      New Appointment
                    </button>
                  </div>
                </div>

                <div className="bg-white p-2 rounded-2xl border border-slate-200 w-fit flex gap-1 shadow-sm">
                  <button 
                    onClick={() => setSearchParams({ tab: 'appointments', filter: 'upcoming' })}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                      (searchParams.get('filter') || 'upcoming') === 'upcoming' 
                        ? 'bg-slate-900 text-white shadow-lg' 
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    Upcoming
                  </button>
                  <button 
                    onClick={() => setSearchParams({ tab: 'appointments', filter: 'past' })}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                      searchParams.get('filter') === 'past' 
                        ? 'bg-slate-900 text-white shadow-lg' 
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    Past Visits
                  </button>
                </div>

                {(() => {
                  const filter = searchParams.get('filter') || 'upcoming';
                  const filteredAppts = appointments.filter(a => 
                    filter === 'upcoming' 
                      ? (a.status === 'scheduled' || a.status === 'Scheduled' || a.status === 'in-progress' || a.status === 'pending')
                      : (a.status === 'completed' || a.status === 'Completed' || a.status === 'cancelled' || a.status === 'Cancelled')
                  );

                  if (filteredAppts.length === 0) {
                    return (
                      <div className="bg-white p-12 lg:p-20 rounded-[3rem] border border-dashed border-slate-200 text-center">
                        <Clock size={64} strokeWidth={1} className="mx-auto text-slate-300 mb-6" />
                        <h5 className="font-bold text-slate-800 uppercase tracking-widest text-xs">No {filter} Consultations</h5>
                        <p className="text-slate-400 text-xs mt-3 max-w-xs mx-auto font-medium leading-relaxed">
                          {filter === 'upcoming' ? 'Your schedule is currently clear. Keeping up with regular clinical assessments ensures your health journey stays on the right track.' : 'No previous visit records found in your health vault.'}
                        </p>
                        {filter === 'upcoming' && (
                          <button 
                            onClick={() => setActiveTab('doctors')}
                            className="mt-8 px-10 py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-bold hover:bg-emerald-600 transition-all active:scale-95 uppercase tracking-widest shadow-xl shadow-emerald-500/20"
                          >
                            Browse Specialists
                          </button>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 gap-6">
                      {filteredAppts.map((appt) => (
                        <div key={appt.id} className="bg-white p-1 pr-6 rounded-[2.5rem] border border-slate-200 hover:border-emerald-200 transition-all flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm overflow-hidden group">
                          <div className="flex items-center gap-6 w-full sm:w-auto">
                            <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-[2rem] flex items-center justify-center shrink-0 relative overflow-hidden ${
                              appt.type === 'Online' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                            }`}>
                              <div className="absolute inset-0 bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              {appt.type === 'Online' ? <Video size={36} className="relative z-10" /> : <Home size={36} className="relative z-10" />}
                            </div>
                            <div className="flex-1 py-4 px-4 sm:px-0">
                              <div className="flex flex-wrap items-center gap-3 mb-3">
                                <h5 className="font-black text-slate-800 text-lg sm:text-xl tracking-tight leading-none">
                                  {appt.type === 'Online' ? 'Video Telehealth' : 'In-Clinic Visit'}
                                </h5>
                                <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full shadow-sm ${
                                  appt.status === 'Completed' ? 'bg-emerald-500 text-white' :
                                  appt.status === 'Cancelled' ? 'bg-red-500 text-white' : 
                                  appt.status === 'Scheduled' ? 'bg-amber-400 text-white' : 
                                  appt.status === 'pending' ? 'bg-indigo-500 text-white animate-pulse' : 'bg-indigo-600 text-white'
                                }`}>
                                  {appt.status === 'pending' ? 'Request Sent' : appt.status}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                                <div className="space-y-1">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Session Details</p>
                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                    <Calendar size={14} className="text-slate-300" />
                                    {format(new Date(appt.date), 'EEEE, do MMM yyyy')}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Consultation Time</p>
                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                    <Clock size={14} className="text-slate-300" />
                                    {appt.time}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Practitioner</p>
                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                    <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[8px] text-slate-400">Dr</div>
                                    Dr. {appt.doctorName}
                                  </div>
                                </div>
                                {patientData?.khcId && (
                                  <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Your Reg. No</p>
                                    <div className="flex items-center gap-2 text-xs font-black text-brand-600">
                                      <ShieldCheck size={14} className="text-brand-500" />
                                      {patientData.khcId}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full sm:w-auto p-4 sm:p-0">
                            {appt.status === 'Completed' && !feedbacks.find(f => f.appointmentId === appt.id) && (
                              <button 
                                onClick={() => {
                                  setTargetAppointment(appt);
                                  setIsReviewing(true);
                                }}
                                className="flex-1 sm:flex-none px-6 py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-emerald-500/10 flex items-center gap-2"
                              >
                                <Star size={14} fill="currentColor" />
                                Review
                              </button>
                            )}
                            {appt.status === 'Scheduled' && (
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => {
                                    executeWithConsent('Proceed to Rescheduling', () => {
                                      setReschedulingAppt(appt);
                                      const dr = doctors.find(d => d.uid === appt.doctorId) || doctors[0];
                                      setSelectedDoctor(dr || null);
                                      setIsRescheduling(true);
                                      setIsBookingDoctor(true);
                                    });
                                  }}
                                  className="flex-1 sm:flex-none px-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200 cursor-pointer text-center"
                                >
                                  Reschedule
                                </button>
                                <button 
                                  onClick={() => handleCancelAppointment(appt)}
                                  className="flex-1 sm:flex-none px-6 py-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-100 transition-all active:scale-95"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                            {appt.status === 'Scheduled' && appt.type === 'Online' && (
                              <button 
                                onClick={() => triggerActiveCall(appt)}
                                className="flex-1 sm:flex-none px-6 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100"
                              >
                                Join Consult
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </motion.div>
            )}

            {currentTab === 'records' && (
              <motion.div 
                key="records"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-8"
              >
                {/* Sub-tab selection */}
                <div className="flex items-center gap-2 p-1.5 sm:p-2 bg-white border border-slate-100 rounded-[1.75rem] sm:rounded-3xl w-full sm:w-fit shadow-xl shadow-slate-100/50">
                  <button 
                    onClick={() => setRecordsSubTab('prescriptions')}
                    className={`flex-1 sm:flex-none px-4 sm:px-8 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${
                      recordsSubTab === 'prescriptions' 
                        ? 'bg-slate-900 text-white shadow-xl shadow-slate-300' 
                        : 'text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    Dosage Prescriptions
                  </button>
                  <button 
                    onClick={() => setRecordsSubTab('reports')}
                    className={`flex-1 sm:flex-none px-4 sm:px-8 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${
                      recordsSubTab === 'reports' 
                        ? 'bg-slate-900 text-white shadow-xl shadow-slate-300' 
                        : 'text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    Diagnostic Reports
                  </button>
                </div>

                {recordsSubTab === 'prescriptions' ? (
                  <div className="space-y-8">
                    <div className="bg-emerald-500 p-8 sm:p-14 rounded-[3.5rem] text-white relative overflow-hidden shadow-2xl shadow-emerald-500/20">
                      <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 rounded-full blur-[120px] -mr-48 -mt-48 transition-all pointer-events-none"></div>
                      <div className="relative z-10 font-sans">
                        <div className="inline-flex items-center gap-3 bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl mb-8 border border-white/20 text-[10px] font-black uppercase tracking-[0.2em]">
                          <Sparkles size={16} />
                          Clinical Compliance
                        </div>
                        <h3 className="text-3xl sm:text-5xl font-black mb-6 tracking-tight leading-[1.1]">Active Health Prescriptions</h3>
                        <p className="text-emerald-50 text-sm sm:text-base max-w-2xl leading-relaxed font-medium opacity-90">Your therapeutic treatment plan is detailed below. Each remedy is chemically optimized for your physiological symptoms according to Materia Medica.</p>
                      </div>
                    </div>

                    {prescriptions.length === 0 ? (
                      <div className="bg-white p-16 sm:p-24 rounded-[4rem] border-2 border-dashed border-slate-100 text-center flex flex-col items-center justify-center">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-8 border border-slate-100">
                          <FileText size={48} strokeWidth={1} />
                        </div>
                        <p className="text-slate-800 font-black uppercase tracking-widest text-[10px] mb-2 font-bold select-none">Vault Clean</p>
                        <p className="text-slate-400 text-xs font-medium max-w-xs">No pharmaceutical plans have been issued to your Health ID at this time.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-6">
                        {prescriptions.map((rx) => {
                          const dr = doctors.find(d => d.uid === rx.doctorId);
                          return (
                            <div key={rx.id} className="bg-white p-1 pr-6 rounded-[2.5rem] border border-slate-200 hover:border-emerald-200 transition-all shadow-sm hover:shadow-2xl hover:shadow-emerald-500/5 group">
                              <div className="flex flex-col lg:flex-row gap-8">
                                <div className="w-full lg:w-64 bg-emerald-50 p-8 rounded-[2rem] flex flex-col items-center justify-center text-center shrink-0 border border-emerald-100">
                                  <FileText size={36} className="text-emerald-500 mb-6" />
                                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Vault Registry</span>
                                  <p className="text-xs font-black text-slate-800 tracking-tighter">DRX-{rx.id?.substring(0,8)?.toUpperCase()}</p>
                                  <div className="mt-8 pt-6 border-t border-emerald-100 w-full space-y-2">
                                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest leading-none">Date Issued</p>
                                    <p className="text-sm font-black text-slate-800">{format(new Date(rx.createdAt), 'dd MMM yyyy')}</p>
                                  </div>
                                </div>

                                <div className="flex-1 py-8 pl-4 sm:pl-0">
                                  <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                                    <h5 className="text-2xl font-black text-slate-800 tracking-tight">{rx.diagnosis}</h5>
                                    <button 
                                      onClick={() => downloadPrescriptionList(rx)}
                                      className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all active:scale-95 shadow-xl shadow-slate-200 cursor-pointer"
                                    >
                                      Export as PDF
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                    <div className="space-y-4">
                                      <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Issuing Specialist</p>
                                        <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-500">DR</div>
                                          <p className="text-sm font-bold text-slate-800">Dr. {dr?.name || 'Practitioner'}</p>
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Clinical Status</p>
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-wider">
                                          <Zap size={10} fill="currentColor" /> Active Regimen
                                        </span>
                                      </div>
                                    </div>

                                    <div className="col-span-1 lg:col-span-2 bg-slate-50 p-8 rounded-3xl border border-slate-100">
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6 leading-none animate-pulse">Medication Inventory</p>
                                      <div className="flex flex-wrap gap-3">
                                        {rx.medications.map((m, mIdx) => (
                                          <div key={mIdx} className="px-5 py-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                                            <div>
                                              <p className="text-[11px] font-black text-slate-800 tracking-tight leading-none">{m.name}</p>
                                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 leading-none">{m.dosage}</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="bg-brand-600 p-8 sm:p-14 rounded-[3.5rem] text-white relative overflow-hidden shadow-2xl shadow-brand-100">
                       <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[120px] -mr-48 -mt-48 transition-all pointer-events-none"></div>
                       <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
                          <div className="max-w-xl">
                            <div className="inline-flex items-center gap-2 bg-white/20 text-white px-5 py-2.5 rounded-2xl mb-6 border border-white/20 backdrop-blur-md text-xs font-black uppercase tracking-[0.2em] leading-none">
                              <ShieldCheck size={20} />
                              Encrypted Medical Vault
                            </div>
                            <h3 className="text-4xl sm:text-5xl font-black mb-6 tracking-tight leading-tight">Patient Diagnostic Reports</h3>
                            <p className="text-brand-50 text-sm sm:text-base font-medium leading-relaxed opacity-90">Centralized storage for your medical journey. Upload and analyze your diagnostic documents instantly with India's most powerful Homeopathic AI analytics system.</p>
                          </div>
                          <div className="shrink-0 w-full md:w-auto">
                            <label className="cursor-pointer flex items-center justify-center gap-3 px-12 py-6 bg-white text-brand-600 hover:bg-brand-50 rounded-3xl font-black text-sm uppercase tracking-widest transition-all shadow-2xl active:scale-95">
                              <Upload size={24} />
                              <span>{isUploadingReport ? 'Uploading...' : 'Add to Vault'}</span>
                              <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" disabled={isUploadingReport} />
                            </label>
                          </div>
                       </div>
                    </div>

                    {/* Medical Vault Categorization Filter */}
                    <div className="flex items-center gap-2 p-2 bg-white border border-slate-100 rounded-[2rem] w-fit shadow-sm overflow-x-auto no-scrollbar">
                      {(['All', 'Radiology', 'Pathology', 'Others'] as const).map((cat) => (
                        <button 
                          key={cat}
                          onClick={() => setReportCategory(cat)}
                          className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                            reportCategory === cat 
                              ? 'bg-brand-600 text-white shadow-lg shadow-brand-100/50' 
                              : 'text-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {reports.filter(r => reportCategory === 'All' || r.category === reportCategory).length === 0 ? (
                      <div className="bg-white p-24 rounded-[4rem] border-2 border-dashed border-slate-100 text-center flex flex-col items-center justify-center">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-8 border border-slate-100">
                          <FileScan size={48} strokeWidth={1} />
                        </div>
                        <p className="text-slate-800 font-black uppercase tracking-widest text-[11px] mb-2 leading-none">Vault Segment Empty</p>
                        <p className="text-slate-400 text-sm font-medium max-w-xs">Upload your clinical reports to enable AI-powered diagnostic correlation.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {reports
                          .filter(r => reportCategory === 'All' || r.category === reportCategory)
                          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                          .map((report) => (
                          <div key={report.id} className="bg-white p-2 rounded-[3rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:border-brand-500 transition-all group relative overflow-hidden flex flex-col min-h-[500px]">
                             <div className="p-8 pb-0 flex items-center justify-between">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm border ${
                                  report.category === 'Radiology' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-brand-50 text-brand-600 border-brand-100'
                                }`}>
                                   {report.category === 'Radiology' ? <ImageIcon size={32} /> : <FileText size={32} />}
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-full mb-2 shadow-sm ${
                                    report.status === 'Analyzed' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white'
                                  }`}>
                                    {report.status}
                                  </span>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none bg-slate-50 px-2 py-1 rounded-md">{report.category}</span>
                                </div>
                             </div>
                             
                             <div className="p-8 flex-1 flex flex-col">
                                <h4 className="text-xl font-black text-slate-800 mb-1 line-clamp-2 leading-tight">{report.title}</h4>
                                <div className="flex items-center gap-2 mb-8">
                                  <Calendar size={14} className="text-slate-300" />
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{format(new Date(report.createdAt), 'dd MMM yyyy')}</p>
                                </div>
                                
                                <div className="flex-1 p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 flex flex-col relative overflow-hidden">
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
                                     <Brain size={16} className={report.status === 'Analyzed' ? 'text-brand-600' : 'text-slate-300'} />
                                     Clinical Assessment
                                   </p>
                                   {report.status === 'Analyzed' ? (
                                     <div className="relative z-10 flex-1 flex flex-col justify-between">
                                       <p className="text-xs font-semibold text-slate-600 leading-relaxed italic line-clamp-5">
                                         "{report.summary || 'Findings analyzed.'}"
                                       </p>
                                       <button 
                                         onClick={() => setSelectedReportForView(report)}
                                         className="mt-4 text-[10px] font-black text-brand-600 uppercase tracking-widest hover:underline text-left cursor-pointer animate-pulse"
                                       >
                                         View Full Analysis
                                       </button>
                                     </div>
                                   ) : (
                                     <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
                                       <Loader2 size={24} className="text-amber-400 animate-spin" />
                                       <p className="text-[10px] font-extrabold text-amber-500 uppercase tracking-wider">AI Analysis in Progress</p>
                                     </div>
                                   )}
                               </div>
                             </div>
                          </div>
                        ))}
                      </div>
                    )}
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
              <DoctorDiscovery 
                onSelect={(dr) => {
                  triggerDoctorBooking(dr);
                }} 
              />
            )}

            {currentTab === 'reports' && (
              <motion.div
                key="reports"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="bg-brand-600 p-8 sm:p-14 rounded-[3.5rem] text-white relative overflow-hidden shadow-2xl shadow-brand-100">
                   <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[120px] -mr-48 -mt-48"></div>
                   <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
                      <div className="max-w-xl">
                        <div className="inline-flex items-center gap-2 bg-white/20 text-white px-5 py-2.5 rounded-2xl mb-6 border border-white/20 backdrop-blur-md">
                          <ShieldCheck size={20} />
                          <span className="text-xs font-black uppercase tracking-[0.2em]">Encrypted Medical Vault</span>
                        </div>
                        <h3 className="text-4xl sm:text-5xl font-black mb-6 tracking-tight leading-tight">Patient Diagnostic Records</h3>
                        <p className="text-brand-50 text-sm sm:text-base font-medium leading-relaxed opacity-90">Centralized storage for your medical journey. Upload, categorize, and analyze your reports using Kayra AI Clinical Intelligence.</p>
                      </div>
                      <div className="shrink-0 w-full md:w-auto">
                        <label className="cursor-pointer flex items-center justify-center gap-3 px-12 py-6 bg-white text-brand-600 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-brand-50 transition-all shadow-2xl active:scale-95">
                          <Upload size={24} />
                          <span>{isUploadingReport ? 'Uploading...' : 'Add to Vault'}</span>
                          <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" disabled={isUploadingReport} />
                        </label>
                      </div>
                   </div>
                </div>

                {/* Medical Vault Categorization Filter */}
                <div className="flex items-center gap-2 p-2 bg-white border border-slate-100 rounded-[2rem] w-fit shadow-sm overflow-x-auto no-scrollbar">
                  {(['All', 'Radiology', 'Pathology', 'Others'] as const).map((cat) => (
                    <button 
                      key={cat}
                      onClick={() => setReportCategory(cat)}
                      className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                        reportCategory === cat 
                          ? 'bg-brand-600 text-white shadow-lg' 
                          : 'text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {reports.filter(r => reportCategory === 'All' || r.category === reportCategory).length === 0 ? (
                  <div className="bg-white p-24 rounded-[4rem] border-2 border-dashed border-slate-100 text-center flex flex-col items-center justify-center">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-8 border border-slate-100">
                      <FileScan size={48} strokeWidth={1} />
                    </div>
                    <p className="text-slate-800 font-black uppercase tracking-widest text-[11px] mb-2">Vault segment Empty</p>
                    <p className="text-slate-400 text-sm font-medium max-w-xs">Upload your clinical reports to enable AI-powered diagnostic correlation.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {reports
                      .filter(r => reportCategory === 'All' || r.category === reportCategory)
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((report) => (
                      <div key={report.id} className="bg-white p-2 rounded-[3rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:border-brand-500 transition-all group relative overflow-hidden flex flex-col min-h-[500px]">
                         <div className="p-8 pb-0 flex items-center justify-between">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm border ${
                              report.category === 'Radiology' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-brand-50 text-brand-600 border-brand-100'
                            }`}>
                               {report.category === 'Radiology' ? <ImageIcon size={32} /> : <FileText size={32} />}
                            </div>
                            <div className="flex flex-col items-end">
                              <span className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-full mb-2 shadow-sm ${
                                report.status === 'Analyzed' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white'
                              }`}>
                                {report.status}
                              </span>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none bg-slate-50 px-2 py-1 rounded-md">{report.category}</span>
                            </div>
                         </div>
                         
                         <div className="p-8 flex-1 flex flex-col">
                            <h4 className="text-xl font-black text-slate-800 mb-1 line-clamp-2 leading-tight">{report.title}</h4>
                            <div className="flex items-center gap-2 mb-8">
                              <Calendar size={14} className="text-slate-300" />
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{format(new Date(report.createdAt), 'dd MMM yyyy')}</p>
                            </div>
                            
                            <div className="flex-1 p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 flex flex-col relative overflow-hidden">
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
                                 <Brain size={16} className={report.status === 'Analyzed' ? 'text-brand-600' : 'text-slate-300'} />
                                 Clinical Assessment
                               </p>
                               {report.status === 'Analyzed' ? (
                                 <div className="relative z-10">
                                   <p className="text-xs font-semibold text-slate-600 leading-relaxed italic line-clamp-5">
                                     "{report.summary || 'Findings summarized by AI engine.'}"
                                   </p>
                                   <button 
                                     onClick={() => setSelectedReportForView(report)}
                                     className="mt-4 text-[10px] font-black text-brand-600 uppercase tracking-widest hover:underline"
                                   >
                                     Read Full Analysis
                                   </button>
                                 </div>
                               ) : (
                                 <div className="flex-1 flex flex-col items-center justify-center py-6 relative z-10">
                                    {analyzingReportId === report.id ? (
                                      <div className="flex flex-col items-center gap-4">
                                        <div className="w-10 h-10 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin"></div>
                                        <p className="text-xs font-black text-brand-600 animate-pulse uppercase tracking-widest text-center">Processing<br/>Medical Intelligence</p>
                                      </div>
                                    ) : (
                                      <>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">Unanalyzed Record</p>
                                        <button 
                                          onClick={() => handleAIAnalysis(report)}
                                          className="w-full py-4 bg-white border border-brand-100 text-brand-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-600 hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
                                        >
                                          <Sparkles size={16} /> Run AI Engine
                                        </button>
                                      </>
                                    )}
                                 </div>
                                )}
                            </div>

                            <div className="mt-8 flex items-center gap-3">
                               <button 
                                 onClick={() => setSelectedReportForView(report)}
                                 className="flex-1 py-5 bg-slate-900 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest hover:bg-brand-700 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl shadow-slate-200"
                               >
                                  <FileScan size={18} /> View Vault Entry
                               </button>
                               <button className="p-5 bg-white text-slate-400 hover:text-red-500 rounded-[1.5rem] border border-slate-200 transition-all hover:bg-red-50 hover:border-red-100 shadow-sm">
                                  <Trash2 size={20} />
                               </button>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
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
                    invoices={invoices} 
                    onDownload={(inv) => generateInvoicePDF(doctors.find(dr => dr.uid === inv.doctorId) || null, patientData, inv)} 
                    onPaymentSuccess={handlePaymentSuccess}
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

        {isBookingDoctor && selectedDoctor && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
             <AppointmentBooking 
               doctor={selectedDoctor as any} 
               patient={patientData as any}
               apptToReschedule={reschedulingAppt || undefined}
               onSuccess={() => {
                  setIsRescheduling(false);
                  setReschedulingAppt(null);
                  fetchData();
                 setIsBookingDoctor(false);
                 setSelectedDoctor(null);
               }} 
               onCancel={() => {
                  setIsRescheduling(false);
                  setReschedulingAppt(null);
                 setIsBookingDoctor(false);
                 setSelectedDoctor(null);
               }} 
             />
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

        {/* Report View Modal */}
        <AnimatePresence>
          {selectedReportForView && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
              >
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                      <FileScan size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">{selectedReportForView.title}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {format(new Date(selectedReportForView.createdAt), 'PPPP')}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedReportForView(null)}
                    className="p-3 text-slate-400 hover:text-slate-600 rounded-2xl transition-colors border border-slate-100 bg-white shadow-sm"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                  {/* Summary Section */}
                  <div className="bg-brand-50 p-8 rounded-[2rem] border border-brand-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                      <Brain size={120} className="text-brand-600" />
                    </div>
                    <h4 className="text-[10px] font-black text-brand-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                       <Sparkles size={14} /> AI Clinical Summary
                    </h4>
                    <p className="text-sm font-bold text-slate-700 leading-relaxed italic">
                      {selectedReportForView.summary || 'Summary pending clinical AI analysis.'}
                    </p>
                  </div>

                  {/* Full Analysis Content */}
                  {selectedReportForView.fullAnalysis ? (
                    <div className="space-y-8">
                      <div className="markdown-body shadow-sm p-8 sm:p-12 rounded-[2.5rem] border border-slate-100 bg-white prose prose-slate max-w-none">
                        <ReactMarkdown>{selectedReportForView.fullAnalysis}</ReactMarkdown>
                      </div>
                      
                      {/* Legal Guard */}
                      <div className="p-8 bg-amber-50 border border-amber-100 rounded-[2rem]">
                        <div className="flex items-center gap-3 mb-4 text-amber-700">
                          <AlertTriangle size={20} />
                          <h5 className="font-black text-xs uppercase tracking-widest">Medical Disclaimer & Legal Safeguard</h5>
                        </div>
                        <ul className="space-y-2 text-[11px] text-amber-800 font-medium list-disc pl-5 opacity-80">
                          <li>This analysis is purely generated by Clinical AI for informational assistance only.</li>
                          <li>It does NOT constitute a final medical diagnosis or therapeutic prescription.</li>
                          <li>All clinical interpretations must be verified by your attending physician (Dr. {doctors.find(d => d.uid === selectedReportForView.doctorId)?.name || 'In-Charge'}).</li>
                          <li>In case of acute discomfort or findings flagged as "Critical", please visit the clinic immediately or seek emergency care.</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                      <Brain size={48} className="mx-auto text-slate-200 mb-4 animate-pulse" />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Run analysis for detailed clinical breakdown</p>
                      <button 
                        onClick={() => handleAIAnalysis(selectedReportForView)}
                        className="mt-6 px-10 py-5 bg-brand-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-100 active:scale-95 transition-all text-center flex items-center justify-center mx-auto"
                      >
                         Initiate AI Analysis
                      </button>
                    </div>
                  )}

                  <div className="p-8 bg-slate-900 rounded-[2rem] text-white">
                    <h5 className="text-[10px] font-black text-brand-400 uppercase tracking-widest mb-4">Vault Information Security</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Vault Status</p>
                        <p className="text-xs font-bold">{selectedReportForView.status}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Encrypted ID</p>
                        <p className="text-xs font-mono">#RX-{selectedReportForView.id?.substring(0,6).toUpperCase()}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Security</p>
                        <p className="text-xs font-bold text-emerald-400">L3 Secure</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Synced</p>
                        <p className="text-xs font-bold">Instantly</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
                  <button className="px-8 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-slate-100 transition-all">
                    <Download size={16} /> Download PDF
                  </button>
                  <button 
                    onClick={() => setSelectedReportForView(null)}
                    className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand-600 transition-all"
                  >
                    Close Vault
                  </button>
                </div>
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
                      onChange={e => setSymptomFormData({...symptomFormData, severity: parseInt(e.target.value) || 1})}
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

      {consentModalConfig && (
        <ConsentModal
          isOpen={consentModalConfig.isOpen}
          onClose={() => setConsentModalConfig(null)}
          onAccept={() => {
            localStorage.setItem('kayra_legal_consent_accepted', 'true');
            setHasAcceptedConsent(true);
            consentModalConfig.onAccept();
          }}
          actionLabel={consentModalConfig.actionLabel}
        />
      )}

      <ElderlyCareBar 
        clinicInfo={clinicInfo} 
        appointments={appointments} 
        executeWithConsent={executeWithConsent}
        setActiveCall={setActiveCall}
      />
    </div>
  );
}

function ElderlyCareBar({ clinicInfo, appointments, executeWithConsent, setActiveCall }: { 
  clinicInfo: any, 
  appointments: any[], 
  executeWithConsent: (actionLabel: string, onAccept: () => void) => void,
  setActiveCall: (appt: Appointment | null) => void 
}) {
  const nextAppt = appointments.find(a => a.status === 'Scheduled');
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 lg:p-6 flex flex-col items-center pointer-events-none">
      <div className="w-full max-w-4xl bg-white/90 backdrop-blur-2xl border border-slate-200 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] rounded-[2.5rem] p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-3 sm:gap-6 pointer-events-auto">
        
        {/* Next Appointment Alert (Small) */}
        {nextAppt && (
          <div className="hidden sm:flex flex-1 items-center gap-4 pl-4 border-r border-slate-100">
             <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                <Calendar size={20} />
             </div>
             <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Next Visit</p>
                <p className="text-xs font-bold text-slate-800">{nextAppt.date} at {nextAppt.time}</p>
             </div>
          </div>
        )}

        <div className="flex w-full sm:w-auto gap-2 sm:gap-4 flex-1 sm:flex-none justify-end">
          <a 
            href={`https://wa.me/${clinicInfo?.phone || '919570183111'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none px-6 sm:px-10 py-4 sm:py-5 bg-emerald-600 text-white rounded-[1.8rem] text-xs sm:text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20 active:scale-95 border-b-4 border-emerald-800"
          >
            <MessageCircle size={20} />
            <span className="hidden xs:inline">WhatsApp</span>
            <span className="xs:hidden">Chat</span>
          </a>
          
          <button 
            type="button"
            onClick={() => {
              const upcoming = appointments.find(a => a.status === 'Scheduled' && a.type === 'Online');
              if (upcoming) {
                executeWithConsent('Proceed to Consultation', () => {
                  setActiveCall(upcoming);
                });
              } else {
                toast.info("No scheduled digital visit found. Please book one first.");
              }
            }}
            className="flex-1 sm:flex-none px-6 sm:px-10 py-4 sm:py-5 bg-slate-900 text-white rounded-[1.8rem] text-xs sm:text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl shadow-slate-900/20 active:scale-95 border-b-4 border-slate-950"
          >
            <Video size={20} className="text-brand-400" />
            <span className="hidden xs:inline">Video Call</span>
            <span className="xs:hidden">Call</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function TabButton({ id, active, onClick, label, icon, hasBadge }: { id?: string, active: boolean, onClick: () => void, label: string, icon: React.ReactNode, hasBadge?: boolean }) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={`px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl text-[10px] sm:text-[11px] font-black transition-all flex items-center gap-2 sm:gap-2.5 uppercase tracking-widest leading-none whitespace-nowrap shrink-0 relative ${
        active ? 'bg-brand-600 text-white shadow-[0_10px_30px_-10px_rgba(20,184,166,0.3)]' : 'text-slate-400 hover:text-brand-600 hover:bg-brand-50'
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
