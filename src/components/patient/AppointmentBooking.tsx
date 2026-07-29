import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MessageCircle, 
  User, 
  Stethoscope, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2,
  Video,
  MapPin,
  Smile,
  AlertCircle,
  CreditCard,
  Smartphone,
  Zap,
  Upload,
  FileText,
  X,
  Phone,
  Sparkles,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../../lib/db';
import { collection, addDoc, doc, query, where, getDocs, updateDoc, setDoc } from 'firebase/firestore';
import { triggerWebhookStatusUpdate } from '../../lib/webhook';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { Patient, UserProfile, Appointment } from '../../types';

interface AppointmentBookingProps {
  doctor: UserProfile;
  patient?: Patient;
  onSuccess: () => void;
  onCancel: () => void;
  apptToReschedule?: Appointment;
}

export default function AppointmentBooking({ doctor, patient, onSuccess, onCancel, apptToReschedule }: AppointmentBookingProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<any | null>(null);

  // Form State
  const [patientDetails, setPatientDetails] = useState({
    name: patient?.name || '',
    phone: patient?.phone || patient?.mobileNumber || '',
    age: (patient as any)?.age || '',
    gender: ((patient as any)?.gender as 'Male' | 'Female' | 'Other') || 'Male',
    reason: apptToReschedule?.reason || ''
  });

  const [telemedicineConsent, setTelemedicineConsent] = useState(true);

  const [bookingData, setBookingData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '',
    type: 'Offline' as 'Online' | 'Offline',
    paymentMethod: 'Cash' as 'Online' | 'Cash'
  });

  const [uploadedReport, setUploadedReport] = useState<{
    fileName: string;
    fileType: string;
    fileData: string;
    size: number;
  } | null>(null);

  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [isFetchingSlots, setIsFetchingSlots] = useState(false);

  const ALL_SLOTS = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'
  ];

  useEffect(() => {
    if (doctor?.uid) {
      fetchBookedSlots();
    }
  }, [bookingData.date, doctor?.uid]);

  const fetchBookedSlots = async () => {
    if (!doctor?.uid) return;
    setIsFetchingSlots(true);
    try {
      const q = query(
        collection(db, 'appointments'),
        where('doctorId', '==', doctor.uid),
        where('date', '==', bookingData.date),
        where('status', 'in', ['Scheduled', 'Confirmed', 'pending', 'payment-pending'])
      );
      const querySnapshot = await getDocs(q);
      const slots = querySnapshot.docs.map(doc => doc.data().time);
      setBookedSlots(slots);
    } catch (error) {
      console.error("Error fetching slots:", error);
    } finally {
      setIsFetchingSlots(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Maximum file size is 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setUploadedReport({
        fileName: file.name,
        fileType: file.type,
        fileData: base64,
        size: file.size
      });
      toast.success(`Attached ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const handleBookingSubmit = async () => {
    if (!bookingData.time) {
      toast.error('Please select a time slot in Step 1');
      return;
    }
    if (!patientDetails.name.trim()) {
      toast.error('Please enter patient name');
      return;
    }
    if (!patientDetails.phone.trim() || patientDetails.phone.length < 10) {
      toast.error('Please enter a valid 10-digit WhatsApp / Phone number');
      return;
    }
    if (!patientDetails.reason.trim()) {
      toast.error('Please describe your primary symptom / health condition');
      return;
    }
    if (!telemedicineConsent) {
      toast.error('Please accept the Telemedicine Practice & Patient Data Privacy Consent to proceed');
      return;
    }

    setLoading(true);
    try {
      // 1. Conflict Check
      const conflictQ = query(
        collection(db, 'appointments'),
        where('doctorId', '==', doctor.uid),
        where('date', '==', bookingData.date),
        where('time', '==', bookingData.time),
        where('status', 'in', ['Scheduled', 'Confirmed', 'pending', 'payment-pending'])
      );
      const conflictSnap = await getDocs(conflictQ);
      const isConflicting = conflictSnap.docs.some(docSnap => docSnap.id !== apptToReschedule?.id);
      
      if (isConflicting) {
        toast.error('This time slot was just taken. Please choose another slot.');
        setLoading(false);
        setStep(1);
        return;
      }

      // Handle Reschedule
      if (apptToReschedule?.id) {
        await updateDoc(doc(db, 'appointments', apptToReschedule.id), {
          date: bookingData.date,
          time: bookingData.time,
          type: bookingData.type,
          reason: patientDetails.reason,
          patientName: patientDetails.name,
          updatedAt: new Date().toISOString()
        });

        toast.success('Appointment rescheduled successfully!');

        const khcRef = `KHC-${apptToReschedule.id.substring(0, 6).toUpperCase()}`;
        setConfirmedBooking({
          id: apptToReschedule.id,
          khcRef,
          patientName: patientDetails.name,
          patientPhone: patientDetails.phone,
          patientAge: patientDetails.age,
          patientGender: patientDetails.gender,
          date: bookingData.date,
          time: bookingData.time,
          type: bookingData.type,
          reason: patientDetails.reason,
          doctorName: doctor.name,
          fee: doctor.consultationFee || 500,
          hasReport: !!uploadedReport
        });
        setStep(3);
        setLoading(false);
        return;
      }

      // Safe Patient ID resolution
      let targetPatientId = patient?.id || '';
      let targetPatientUid = auth.currentUser?.uid || '';

      if (!targetPatientId) {
        // Create or locate patient profile by phone number
        const pQ = query(collection(db, 'patients'), where('mobileNumber', '==', patientDetails.phone));
        const pSnap = await getDocs(pQ);

        if (!pSnap.empty) {
          targetPatientId = pSnap.docs[0].id;
        } else {
          const newPatRef = await addDoc(collection(db, 'patients'), {
            name: patientDetails.name,
            phone: patientDetails.phone,
            mobileNumber: patientDetails.phone,
            age: patientDetails.age,
            gender: patientDetails.gender,
            uid: targetPatientUid,
            clinicId: (doctor as any).clinicId || '',
            createdAt: new Date().toISOString()
          });
          targetPatientId = newPatRef.id;
        }
      }

      const docFee = doctor.consultationFee || 500;
      const commRate = doctor.commissionRate || 10;
      const commAmt = (docFee * commRate) / 100;
      const netShare = docFee - commAmt;

      const apptData: Omit<Appointment, 'id'> = {
        patientId: targetPatientId,
        patientName: patientDetails.name,
        patientUid: targetPatientUid,
        doctorId: doctor.uid,
        doctorName: doctor.name || 'Specialist Doctor',
        clinicId: (doctor as any).clinicId || '',
        date: bookingData.date,
        time: bookingData.time,
        type: bookingData.type,
        status: 'pending',
        fee: docFee,
        commissionAmount: commAmt,
        doctorNetShare: netShare,
        reason: patientDetails.reason,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'appointments'), apptData);

      // Save uploaded medical report if attached
      if (uploadedReport) {
        try {
          await addDoc(collection(db, 'medical_reports'), {
            patientId: targetPatientId,
            patientUid: targetPatientUid,
            patientName: patientDetails.name,
            appointmentId: docRef.id,
            doctorId: doctor.uid,
            title: uploadedReport.fileName,
            fileName: uploadedReport.fileName,
            fileType: uploadedReport.fileType,
            fileData: uploadedReport.fileData,
            status: 'Pending Analysis',
            createdAt: new Date().toISOString(),
            category: uploadedReport.fileType.includes('image') ? 'Radiology' : 'Pathology'
          });
        } catch (repErr) {
          console.error("Report attachment error:", repErr);
        }
      }

      // Trigger automatic webhook
      await triggerWebhookStatusUpdate(
        'APPOINTMENT_STATE',
        'pending',
        docRef.id,
        {
          doctorName: apptData.doctorName,
          patientName: apptData.patientName,
          date: apptData.date,
          time: apptData.time,
          type: apptData.type
        }
      );

      // Create invoice record
      await addDoc(collection(db, 'invoices'), {
        patientId: targetPatientId,
        patientUid: targetPatientUid,
        doctorId: doctor.uid,
        clinicId: (doctor as any).clinicId || '',
        appointmentId: docRef.id,
        amount: docFee,
        fee: docFee,
        commissionAmount: commAmt,
        doctorNetShare: netShare,
        status: bookingData.paymentMethod === 'Online' ? 'Pending' : 'Paid',
        paymentMethod: bookingData.paymentMethod,
        items: [{ description: 'Homeopathic Consultation', price: docFee, quantity: 1 }],
        createdAt: new Date().toISOString()
      });

      const khcRef = `KHC-${docRef.id.substring(0, 6).toUpperCase()}`;

      setConfirmedBooking({
        id: docRef.id,
        khcRef,
        patientName: patientDetails.name,
        patientPhone: patientDetails.phone,
        patientAge: patientDetails.age,
        patientGender: patientDetails.gender,
        date: bookingData.date,
        time: bookingData.time,
        type: bookingData.type,
        reason: patientDetails.reason,
        doctorName: doctor.name,
        fee: docFee,
        hasReport: !!uploadedReport
      });

      toast.success('Appointment Reserved Successfully!');
      setStep(3);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'appointments');
    } finally {
      setLoading(false);
    }
  };

  const getWhatsAppUrl = () => {
    if (!confirmedBooking) return '#';

    const message = `Namaste Kayra's Homeo Care! I have booked an appointment:

📌 *Ref ID:* ${confirmedBooking.khcRef}
👤 *Patient Name:* ${confirmedBooking.patientName}
📱 *Phone:* ${confirmedBooking.patientPhone}
🎂 *Age/Gender:* ${confirmedBooking.patientAge ? `${confirmedBooking.patientAge} yrs, ` : ''}${confirmedBooking.patientGender}
🩺 *Doctor:* Dr. ${confirmedBooking.doctorName}
📅 *Date & Time:* ${format(new Date(confirmedBooking.date), 'dd MMM yyyy')} at ${confirmedBooking.time}
🏥 *Consultation Mode:* ${confirmedBooking.type === 'Online' ? 'Video Call' : 'In-Clinic Visit'}
💬 *Primary Problem:* ${confirmedBooking.reason}${confirmedBooking.hasReport ? '\n📎 *Document:* Medical Report Attached' : ''}

Please confirm my appointment slot. Thank you!`;

    const waNumber = (doctor as any).whatsappLink || doctor.mobileNumber || '919153000000';
    const cleanNumber = waNumber.replace(/\D/g, '');
    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/60 overflow-hidden max-w-4xl mx-auto flex flex-col md:flex-row font-sans my-4">
      {/* Left side summary panel */}
      <div className="w-full md:w-80 bg-teal-800 p-8 text-white flex flex-col justify-between relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="space-y-6 relative z-10">
          <button onClick={onCancel} className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-all">
            <ArrowLeft size={20} />
          </button>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-300 text-[10px] font-black uppercase tracking-widest bg-white/10 w-fit px-3 py-1 rounded-lg">
              <Zap size={10} fill="currentColor" /> Kayra Homeo Care
            </div>
            <h2 className="text-2xl font-black tracking-tight leading-tight">Book Consultation</h2>
            <p className="text-teal-100 text-xs font-medium opacity-90 leading-relaxed">Personalized Homeopathic Treatment & Holistic Care.</p>
          </div>
          
          <div className="p-4 bg-white/10 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-emerald-300">
                <Stethoscope size={18} />
              </div>
              <div>
                <p className="text-[9px] font-bold text-teal-200 uppercase tracking-widest leading-none mb-1">Doctor</p>
                <p className="text-xs font-bold text-white">Dr. {doctor.name}</p>
              </div>
            </div>
            {bookingData.time && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-emerald-300">
                  <CalendarIcon size={18} />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-teal-200 uppercase tracking-widest leading-none mb-1">Slot</p>
                  <p className="text-xs font-bold text-white tracking-widest uppercase">{format(new Date(bookingData.date), 'dd MMM')} • {bookingData.time}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 mt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold text-teal-200 uppercase tracking-widest">Consultation Fee</span>
            <span className="text-xl font-black text-emerald-300">₹{doctor.consultationFee || '500'}</span>
          </div>
          <p className="text-[9px] text-teal-200/70 uppercase tracking-widest text-center">No Hidden Charges • Direct WhatsApp Support</p>
        </div>
      </div>

      {/* Right side 3-step wizard */}
      <div className="flex-1 p-6 sm:p-10 overflow-y-auto relative bg-slate-50/50">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
          {[
            { num: 1, title: 'Date & Slot' },
            { num: 2, title: 'Patient Details' },
            { num: 3, title: 'Confirmation' }
          ].map(s => (
            <div key={s.num} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                step === s.num 
                  ? 'bg-teal-700 text-white shadow-lg shadow-teal-200' 
                  : step > s.num 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-slate-100 text-slate-400'
              }`}>
                {step > s.num ? <CheckCircle2 size={16} /> : s.num}
              </div>
              <span className={`text-xs font-bold hidden sm:inline ${step === s.num ? 'text-slate-900' : 'text-slate-400'}`}>
                {s.title}
              </span>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: Select Date & Time Slot */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <CalendarIcon className="text-teal-600" size={20} /> Select Date & Available Slot
                </h3>
                <p className="text-slate-400 text-xs font-medium mt-1">Choose a convenient time for your consultation.</p>
              </div>

              {/* Date Scroller */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Date</label>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                  {[0, 1, 2, 3, 4, 5, 6].map(i => {
                    const d = addDays(new Date(), i);
                    const isSelected = bookingData.date === format(d, 'yyyy-MM-dd');
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setBookingData({...bookingData, date: format(d, 'yyyy-MM-dd'), time: ''})}
                        className={`flex flex-col items-center justify-center min-w-[68px] py-3.5 px-3 rounded-2xl border transition-all ${
                          isSelected 
                            ? 'bg-teal-800 border-teal-800 text-white shadow-lg shadow-teal-200' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-[9px] font-bold uppercase tracking-widest mb-0.5">{format(d, 'EEE')}</span>
                        <span className="text-lg font-black">{format(d, 'dd')}</span>
                        <span className="text-[8px] font-medium opacity-80">{format(d, 'MMM')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Consultation Type Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultation Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBookingData({...bookingData, type: 'Offline'})}
                    className={`p-4 rounded-2xl border transition-all flex items-center gap-3 ${
                      bookingData.type === 'Offline' 
                        ? 'bg-white border-teal-600 ring-2 ring-teal-600/20 text-teal-800 shadow-sm' 
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bookingData.type === 'Offline' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-400'}`}>
                      <MapPin size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold leading-none">In-Clinic Visit</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">Visit Kayra Clinic</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBookingData({...bookingData, type: 'Online'})}
                    className={`p-4 rounded-2xl border transition-all flex items-center gap-3 ${
                      bookingData.type === 'Online' 
                        ? 'bg-white border-teal-600 ring-2 ring-teal-600/20 text-teal-800 shadow-sm' 
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bookingData.type === 'Online' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-400'}`}>
                      <Video size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold leading-none">Video Call</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">Online Tele-health</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Time Slots Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Slots</label>
                  {isFetchingSlots && <span className="text-[10px] text-teal-600 font-bold animate-pulse">Checking live availability...</span>}
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {ALL_SLOTS.map(slot => {
                    const isBooked = bookedSlots.includes(slot);
                    const isSelected = bookingData.time === slot;

                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={isBooked}
                        onClick={() => setBookingData({...bookingData, time: slot})}
                        className={`py-3 px-2 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 ${
                          isBooked 
                            ? 'bg-slate-100 text-slate-300 border border-slate-100 cursor-not-allowed line-through' 
                            : isSelected 
                              ? 'bg-teal-700 text-white shadow-md shadow-teal-200 ring-2 ring-teal-700' 
                              : 'bg-white text-slate-700 border border-slate-200 hover:border-teal-500 hover:text-teal-700'
                        }`}
                      >
                        <span>{slot}</span>
                        {isBooked ? (
                          <span className="text-[8px] font-medium opacity-60">Booked</span>
                        ) : (
                          <span className="text-[8px] font-medium opacity-70">{parseInt(slot) < 12 ? 'AM' : 'PM'}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button 
                type="button"
                onClick={() => {
                  if (!bookingData.time) {
                    toast.error('Please select a time slot to continue');
                    return;
                  }
                  setStep(2);
                }}
                disabled={!bookingData.time}
                className="w-full py-4 bg-teal-800 text-white rounded-2xl font-black text-xs uppercase tracking-[0.15em] shadow-xl shadow-teal-100 hover:bg-teal-900 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
              >
                Next: Enter Patient Details <ArrowRight size={16} />
              </button>
            </motion.div>
          )}

          {/* STEP 2: Enter Patient Details & Medical Reports */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Smile className="text-teal-600" size={20} /> Patient Details & Symptom
                </h3>
                <p className="text-slate-400 text-xs font-medium mt-1">Provide basic information for the medical record.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={patientDetails.name}
                    onChange={(e) => setPatientDetails({ ...patientDetails, name: e.target.value })}
                    placeholder="e.g. Ananya Sharma"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-800 focus:border-teal-600 outline-none"
                  />
                </div>

                {/* WhatsApp / Phone Number */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WhatsApp / Phone *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">+91</span>
                    <input
                      type="tel"
                      required
                      value={patientDetails.phone}
                      onChange={(e) => setPatientDetails({ ...patientDetails, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      placeholder="98765 43210"
                      className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-800 focus:border-teal-600 outline-none"
                    />
                  </div>
                </div>

                {/* Age */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Age (Years)</label>
                  <input
                    type="number"
                    value={patientDetails.age}
                    onChange={(e) => setPatientDetails({ ...patientDetails, age: e.target.value })}
                    placeholder="e.g. 34"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-800 focus:border-teal-600 outline-none"
                  />
                </div>

                {/* Gender */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gender</label>
                  <select
                    value={patientDetails.gender}
                    onChange={(e) => setPatientDetails({ ...patientDetails, gender: e.target.value as 'Male' | 'Female' | 'Other' })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-800 focus:border-teal-600 outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Primary Problem / Symptom */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Health Concern / Symptom *</label>
                <textarea
                  rows={3}
                  required
                  value={patientDetails.reason}
                  onChange={(e) => setPatientDetails({ ...patientDetails, reason: e.target.value })}
                  placeholder="Describe what's bothering you (e.g. Chronic eczema flare up, severe headache, sleep issues, anxiety...)"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-medium text-sm text-slate-800 focus:border-teal-600 outline-none"
                />
              </div>

              {/* Optional Report Upload */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upload Lab Report / Previous Prescription (Optional)</label>
                {uploadedReport ? (
                  <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <FileText size={18} className="text-emerald-700" />
                      <div>
                        <p className="text-xs font-bold text-emerald-900 truncate max-w-[200px]">{uploadedReport.fileName}</p>
                        <p className="text-[10px] text-emerald-600 font-medium">Ready for doctor review</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadedReport(null)}
                      className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-700 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 bg-white border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-teal-500 transition-all">
                    <Upload size={20} className="text-slate-400 mb-1" />
                    <span className="text-xs font-bold text-slate-600">Click to upload report (PDF or Image, max 5MB)</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Telemedicine & Data Privacy Consent */}
              <div className="p-3.5 bg-teal-50/60 border border-teal-100 rounded-xl flex items-start gap-3">
                <input
                  type="checkbox"
                  id="telemedicineConsent"
                  checked={telemedicineConsent}
                  onChange={(e) => setTelemedicineConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-teal-300 text-teal-700 focus:ring-teal-500 cursor-pointer"
                />
                <label htmlFor="telemedicineConsent" className="text-[11px] text-slate-600 leading-snug cursor-pointer font-medium">
                  I agree to the <span className="font-bold text-teal-800">Telemedicine Practice Guidelines</span> & consent to processing patient health data for consultation & clinical records under Kayra's Homeo Care data privacy standards.
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setStep(1)} 
                  className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-200 transition-all"
                >
                  Back
                </button>
                <button 
                  type="button"
                  onClick={handleBookingSubmit}
                  disabled={loading}
                  className="flex-[2] py-3.5 bg-teal-800 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-teal-100 hover:bg-teal-900 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? 'Confirming...' : <>Confirm & Reserve Slot <CheckCircle2 size={16} /></>}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Instant Confirmation Screen */}
          {step === 3 && confirmedBooking && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6 text-center py-2"
            >
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase tracking-widest">
                  Appointment Reserved
                </span>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-2">See You Soon!</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Your slot is reserved. Click below to notify the clinic directly on WhatsApp.</p>
              </div>

              {/* Confirmation Ticket Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-left space-y-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-teal-700 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                  Ref: {confirmedBooking.khcRef}
                </div>

                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Patient Name</p>
                    <p className="text-sm font-bold text-slate-800">{confirmedBooking.patientName}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Phone / WhatsApp</p>
                    <p className="text-sm font-bold text-slate-800">+91 {confirmedBooking.patientPhone}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Doctor</p>
                    <p className="text-sm font-bold text-teal-800">Dr. {confirmedBooking.doctorName}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Date & Slot</p>
                    <p className="text-sm font-bold text-slate-800">{format(new Date(confirmedBooking.date), 'dd MMM yyyy')} • {confirmedBooking.time}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Mode & Health Problem</p>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">
                    <span className="font-bold text-teal-700">[{confirmedBooking.type === 'Online' ? 'Video Call' : 'In-Clinic Visit'}]</span> {confirmedBooking.reason}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <a
                  href={getWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-200 transition-all flex items-center justify-center gap-2 group"
                >
                  <MessageCircle size={18} />
                  Send WhatsApp Confirmation to Clinic
                  <ExternalLink size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </a>

                <button
                  type="button"
                  onClick={onSuccess}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Go to Patient Portal
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
