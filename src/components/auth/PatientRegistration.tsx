import React, { useState, useEffect } from 'react';
import { auth, db } from '../../lib/db';
import { doc, setDoc, query, collection, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  ArrowLeft, 
  ArrowRight, 
  Smartphone,
  ShieldCheck, 
  CheckCircle2,
  Calendar as CalendarIcon,
  Users as GenderIcon,
  Heart,
  Clock,
  Video,
  MessagesSquare,
  Stethoscope,
  Info,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Mic,
  Square,
  Play,
  Trash2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format, addDays, startOfDay, isSameDay, isBefore } from 'date-fns';
import Logo from '../Logo';

type RegistrationStep = 'details' | 'booking' | 'complete';

export default function PatientRegistration() {
  const [step, setStep] = useState<RegistrationStep>('details');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // Patient Details
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [mobileNumber, setMobileNumber] = useState('');
  const [assignedPatientId, setAssignedPatientId] = useState('');
  
  // Booking Details
  const [consultationType, setConsultationType] = useState<'in-person' | 'video'>('in-person');
  const [reason, setReason] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointmentTime, setAppointmentTime] = useState('10:00');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
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
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    // Generate some mock slots for simplicity
    const slots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];
    setAvailableSlots(slots);
  }, [appointmentDate]);

  const handleFinalSubmit = async () => {
    if (!name || !mobileNumber) {
      toast.error('Missing required fields');
      return;
    }
    setLoading(true);

    try {
      // 1. Check if patient already exists
      const q = query(
        collection(db, 'patients'), 
        where('mobileNumber', '==', mobileNumber),
        where('dob', '==', dob)
      );
      const querySnapshot = await getDocs(q);
      
      let finalPatientId: string;
      let finalPatientDocId: string;

      if (!querySnapshot.empty) {
        // User already exists, use existing ID
        const existingDoc = querySnapshot.docs[0];
        finalPatientId = existingDoc.data().patientId;
        finalPatientDocId = existingDoc.id;
        
        // Update existing patient doc if needed
        const { updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'patients', finalPatientDocId), {
          lastVisitAttempt: new Date().toISOString()
        });
      } else {
        // Create new patient record
        const patientId = `KHC-${Math.floor(100000 + Math.random() * 900000)}`;
        const profileData = {
          patientId,
          name,
          role: 'patient',
          mobileNumber,
          isMobileVerified: false,
          dob,
          gender,
          source: 'online-booking',
          createdAt: new Date().toISOString()
        };

        const patientRef = await addDoc(collection(db, 'patients'), {
          ...profileData,
          phone: mobileNumber,
        });
        finalPatientId = patientId;
        finalPatientDocId = patientRef.id;
      }

      setAssignedPatientId(finalPatientId);

      // 2. Create Appointment
      await addDoc(collection(db, 'appointments'), {
        patientId: finalPatientDocId,
        patientName: name,
        date: appointmentDate,
        time: appointmentTime,
        type: consultationType,
        reason: reason || 'General Consultation',
        hasVoiceNote: !!audioUrl,
        status: 'scheduled',
        paymentStatus: 'pending',
        createdAt: serverTimestamp()
      });

      // 3. Set portal session automatically
      localStorage.setItem('kayra_patient_session', JSON.stringify({
        patientId: finalPatientDocId,
        name: name,
        mobileNumber: mobileNumber,
        loginType: 'phone-dob'
      }));

      setStep('complete');
      toast.success('Appointment booked successfully!');
    } catch (error: any) {
      console.error('Final Submit Error:', error);
      toast.error(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'details':
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 leading-none">Who are we booking for?</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Basic Patient Information</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Name / पूरा नाम</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none transition-all"
                      placeholder="Enter patient's full name"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Date of Birth / जन्म तिथि</label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    <input 
                      type="date" 
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Gender / लिंग</label>
                  <div className="relative">
                    <GenderIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    <select 
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none transition-all bg-white appearance-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Mobile Number / मोबाइल</label>
                <div className="relative">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="tel" 
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none transition-all"
                    placeholder="9876543210"
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                if (!name || !mobileNumber) {
                   toast.error('Please fill name and mobile number');
                   return;
                }
                setStep('booking');
              }}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 uppercase tracking-widest text-[11px]"
            >
              Next: Select Slot <ArrowRight size={16} />
            </button>
          </motion.div>
        );
      case 'booking':
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="space-y-4">
               <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <CalendarIcon size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 leading-none">Schedule Appointment</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Pick a convenient time</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setConsultationType('in-person')}
                  className={`flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    consultationType === 'in-person' 
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                      : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <Stethoscope size={20} />
                  <span className="text-xs font-bold uppercase tracking-wide">In-Person</span>
                </button>
                <button 
                  onClick={() => setConsultationType('video')}
                  className={`flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    consultationType === 'video' 
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700' 
                      : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <Video size={20} />
                  <span className="text-xs font-bold uppercase tracking-wide">Video Call</span>
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Reason for Visit</label>
                <div className="relative">
                  <MessagesSquare className="absolute left-4 top-4 text-slate-400" size={18} />
                  <textarea 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none transition-all min-h-[80px]"
                    placeholder="Briefly describe your symptoms..."
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Voice Note / आवाज़ में बताएं</label>
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
                    {isRecording ? 'Click to stop' : audioUrl ? 'Recording ready' : 'Describe your health concern via voice'}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Select Date</label>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded">
                      {format(new Date(appointmentDate), 'MMMM yyyy')}
                    </span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar snap-x mask-linear-r">
                    {Array.from({ length: 14 }).map((_, i) => {
                      const date = addDays(startOfDay(new Date()), i);
                      const isSelected = isSameDay(date, new Date(appointmentDate));
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setAppointmentDate(date.toISOString().split('T')[0])}
                          className={`flex-shrink-0 w-16 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all snap-start ${
                            isSelected 
                              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100 scale-105' 
                              : 'bg-white border border-slate-100 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/30'
                          }`}
                        >
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                            {format(date, 'EEE')}
                          </span>
                          <span className="text-xl font-black">
                            {format(date, 'd')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Select Time Slot</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {availableSlots.map((slot, idx) => {
                      const isSelected = appointmentTime === slot;
                      return (
                        <motion.button
                          key={slot}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          type="button"
                          onClick={() => setAppointmentTime(slot)}
                          className={`py-3 rounded-xl text-xs font-bold transition-all border ${
                            isSelected 
                              ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                              : 'bg-white border-slate-100 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/50'
                          }`}
                        >
                          {slot}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setStep('details')}
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-all uppercase tracking-widest text-[11px]"
              >
                Back
              </button>
              <button 
                onClick={handleFinalSubmit}
                disabled={loading}
                className="flex-[2] py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xl shadow-emerald-100 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-[11px]"
              >
                {loading ? 'Processing...' : 'Confirm Appointment'} <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>
        );
      case 'complete':
        return (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4 space-y-6">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto relative shadow-inner">
               <CheckCircle2 size={48} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-slate-800">Booking Confirmed!</h3>
              <p className="text-sm text-slate-500 px-8">We've reserved your slot for a {consultationType} consultation.</p>
            </div>
            
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 text-left space-y-4">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white border border-slate-100 shadow-sm shadow-indigo-100">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registration ID / Login ID</p>
                    <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                       {assignedPatientId}
                       <button 
                         onClick={() => {
                           navigator.clipboard.writeText(assignedPatientId);
                           toast.success('KHC-ID copied!');
                         }}
                         className="p-1 hover:bg-white rounded text-slate-300 hover:text-emerald-500 transition-colors"
                       >
                         <Edit2 size={12} />
                       </button>
                    </p>
                  </div>
               </div>
               <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100/50">
                  <p className="text-[9px] text-indigo-700 font-bold leading-relaxed italic text-center">
                    Note: Use this KHC-ID and your mobile number to access the Patient Portal in the future.
                  </p>
               </div>
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 border border-slate-100 shadow-sm">
                    <CalendarIcon size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Appointment Date</p>
                    <p className="text-sm font-bold text-slate-900">{new Date(appointmentDate).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
                  </div>
               </div>
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 border border-slate-100 shadow-sm">
                    <Clock size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reserved Time</p>
                    <p className="text-sm font-bold text-slate-900">{appointmentTime}</p>
                  </div>
               </div>
               <div className="pt-2">
                  <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg w-fit">
                    <ShieldCheck size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Verified Medical Booking</span>
                  </div>
               </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => navigate('/portal')}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all uppercase tracking-widest text-[11px] shadow-lg flex items-center justify-center gap-2"
              >
                Go to Patient Portal <ArrowRight size={16} />
              </button>
              <button 
                onClick={() => navigate('/')}
                className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-all uppercase tracking-widest text-[11px]"
              >
                Return to Home
              </button>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">A confirmation SMS will be sent to {mobileNumber}</p>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-0 sm:p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute top-0 -left-20 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-0 -right-20 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none"></div>
      
      <div className="w-full max-w-4xl bg-white sm:rounded-[40px] shadow-2xl shadow-slate-200 relative z-10 flex flex-col md:flex-row overflow-hidden border border-white min-h-[100vh] sm:min-h-0">
        <div className="md:w-72 bg-slate-900 p-6 sm:p-8 md:p-10 flex flex-col text-white relative overflow-hidden shrink-0">
           <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
           
           <div className="relative z-10 flex items-center justify-between md:block">
            <Logo size="md" />
            <div className="md:hidden">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full">Step {step === 'details' ? '1' : step === 'booking' ? '2' : '3'}/3</span>
            </div>
           </div>

           <div className="hidden md:flex mt-16 space-y-10 flex-1 relative z-10">
            <StepIndicator stepNumber={1} active={step === 'details'} done={['booking', 'complete'].includes(step)} label="Profile Info" />
            <StepIndicator stepNumber={2} active={step === 'booking'} done={step === 'complete'} label="Schedule visit" />
           </div>
           
           <div className="hidden md:block mt-8 pt-8 border-t border-white/5 relative z-10">
              <div className="flex items-center gap-3 group">
                 <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                    <Heart size={18} className="text-emerald-400 group-hover:text-white" fill="currentColor" />
                 </div>
                 <div>
                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em]">Patient Promise</p>
                    <p className="text-[10px] font-bold tracking-widest">Painless Registration</p>
                 </div>
              </div>
           </div>
        </div>

        <div className="flex-1 p-5 sm:p-8 md:p-14 max-h-[100vh] md:max-h-[85vh] overflow-y-auto custom-scrollbar">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ stepNumber, active, done, label }: { stepNumber: number, active: boolean, done: boolean, label: string }) {
  return (
    <div className="flex items-center gap-5 group">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-500 ${
        done 
          ? 'bg-emerald-500 text-white scale-110' 
          : active 
            ? 'bg-white text-slate-900 ring-4 ring-white/10 scale-110' 
            : 'bg-white/10 text-white/20'
      }`}>
        {done ? <CheckCircle2 size={16} /> : stepNumber}
      </div>
      <div className="flex flex-col">
        <span className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-500 ${active || done ? 'text-white' : 'text-white/20'}`}>
          {label}
        </span>
        {active && (
          <motion.div layoutId="active-indicator" className="h-0.5 w-4 bg-emerald-500 mt-1 rounded-full" />
        )}
      </div>
    </div>
  );
}

