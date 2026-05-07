import { useState } from 'react';
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
  Zap
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../../lib/db';
import { collection, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { toast } from 'sonner';
import { format, addDays, startOfDay } from 'date-fns';
import { Patient, UserProfile, Appointment } from '../../types';

interface AppointmentBookingProps {
  doctor: UserProfile;
  patient: Patient;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AppointmentBooking({ doctor, patient, onSuccess, onCancel }: AppointmentBookingProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [bookingData, setBookingData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '10:00',
    type: 'Offline' as 'Online' | 'Offline',
    reason: '',
    paymentMethod: 'Cash' as 'Online' | 'Cash'
  });

  const availableSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'
  ];

  const handleBooking = async () => {
    setLoading(true);
    try {
      const apptData: Omit<Appointment, 'id'> = {
        patientId: patient.id!,
        patientName: patient.name,
        patientUid: auth.currentUser?.uid,
        doctorId: doctor.uid,
        doctorName: doctor.name || 'Specialist',
        date: bookingData.date,
        time: bookingData.time,
        type: bookingData.type,
        status: bookingData.paymentMethod === 'Online' ? 'payment-pending' : 'Scheduled',
        reason: bookingData.reason,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'appointments'), apptData);

      // Create initial invoice if needed
      if (doctor.consultationFee && doctor.consultationFee > 0) {
        await addDoc(collection(db, 'invoices'), {
          patientId: patient.id,
          doctorId: doctor.uid,
          appointmentId: docRef.id,
          amount: doctor.consultationFee,
          status: 'Pending',
          items: [{ description: 'Consultation Fee', price: doctor.consultationFee, quantity: 1 }],
          createdAt: new Date().toISOString()
        });
      }

      toast.success('Appointment Sync Successful');
      
      // WhatsApp Simulation
      const message = `Hello Dr. ${doctor.name}, I have just booked a ${bookingData.type} appointment for ${bookingData.date} at ${bookingData.time}. My KHC-ID is ${patient.patientId}. - Sent via Kayra Holistic`;
      const waUrl = `https://wa.me/${doctor.mobileNumber || '919876543210'}?text=${encodeURIComponent(message)}`;
      
      if (window.confirm('Would you like to send a confirmation to the doctor on WhatsApp?')) {
        window.open(waUrl, '_blank');
      }

      onSuccess();
    } catch (error) {
       handleFirestoreError(error, OperationType.CREATE, 'appointments');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200 overflow-hidden max-w-4xl mx-auto flex flex-col md:flex-row h-full md:h-[600px] font-sans">
      {/* Left side summary */}
      <div className="w-full md:w-80 bg-slate-900 p-8 text-white flex flex-col justify-between">
        <div className="space-y-8">
           <button onClick={onCancel} className="text-white/50 hover:text-white transition-colors">
              <ArrowLeft size={24} />
           </button>
           
           <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                 <Zap size={10} fill="currentColor" /> Holistic Appointment
              </div>
              <h2 className="text-3xl font-bold tracking-tight leading-tight">Secure Your Session</h2>
              <p className="text-slate-400 text-sm">Consultation with India's top holistic specialists.</p>
           </div>
           
           <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <User size={18} />
                 </div>
                 <div>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none mb-1">Specialist</p>
                    <p className="text-xs font-bold text-white italic">Dr. {doctor.name}</p>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <CalendarIcon size={18} />
                 </div>
                 <div>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none mb-1">Date & Time</p>
                    <p className="text-xs font-bold text-white tracking-widest uppercase">{format(new Date(bookingData.date), 'dd MMM')} • {bookingData.time}</p>
                 </div>
              </div>
           </div>
        </div>

        <div className="pt-8 border-t border-white/10 mt-8 md:mt-0">
           <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Total Fees</span>
              <span className="text-xl font-black text-emerald-400">₹{doctor.consultationFee || '500'}</span>
           </div>
           <p className="text-[9px] text-white/20 uppercase tracking-widest text-center">Price Inclusive of Holistic GST</p>
        </div>
      </div>

      {/* Right side flow */}
      <div className="flex-1 p-6 md:p-12 overflow-y-auto no-scrollbar relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                    <CalendarIcon className="text-emerald-500" size={24} /> 1. Select Time Slot
                  </h3>
                </div>

                <div className="space-y-6">
                  {/* Date Scroller */}
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    {[0, 1, 2, 3, 4, 5, 6].map(i => {
                      const d = addDays(new Date(), i);
                      const isSelected = bookingData.date === format(d, 'yyyy-MM-dd');
                      return (
                        <button
                          key={i}
                          onClick={() => setBookingData({...bookingData, date: format(d, 'yyyy-MM-dd')})}
                          className={`flex flex-col items-center justify-center min-w-[70px] py-4 rounded-2xl border transition-all ${isSelected ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}`}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-widest mb-1">{format(d, 'EEE')}</span>
                          <span className="text-xl font-black">{format(d, 'dd')}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Slots Grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {availableSlots.map(slot => (
                      <button
                        key={slot}
                        onClick={() => setBookingData({...bookingData, time: slot})}
                        className={`py-3 rounded-xl text-xs font-black transition-all ${bookingData.time === slot ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-slate-50 text-slate-400 hover:text-slate-600 border border-slate-100'}`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className={`flex-1 p-4 rounded-xl cursor-pointer transition-all border-2 ${bookingData.type === 'Offline' ? 'bg-white border-emerald-500 shadow-sm' : 'bg-transparent border-transparent opacity-60'}`} onClick={() => setBookingData({...bookingData, type: 'Offline'})}>
                      <MapPin size={20} className={bookingData.type === 'Offline' ? 'text-emerald-600' : 'text-slate-400'} />
                      <p className="text-xs font-bold mt-2">At Clinic</p>
                    </div>
                    <div className={`flex-1 p-4 rounded-xl cursor-pointer transition-all border-2 ${bookingData.type === 'Online' ? 'bg-white border-emerald-500 shadow-sm' : 'bg-transparent border-transparent opacity-60'}`} onClick={() => setBookingData({...bookingData, type: 'Online'})}>
                      <Video size={20} className={bookingData.type === 'Online' ? 'text-emerald-600' : 'text-slate-400'} />
                      <p className="text-xs font-bold mt-2">Video Call</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setStep(2)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                >
                  Confirm Slot <ArrowRight size={16} />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                    <Smile className="text-emerald-500" size={24} /> 2. Symptoms & Preferences
                  </h3>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">What's bothering you?</label>
                    <textarea 
                      value={bookingData.reason}
                      onChange={(e) => setBookingData({...bookingData, reason: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-emerald-500 transition-all outline-none font-bold text-slate-800 min-h-[150px] shadow-inner"
                      placeholder="e.g. Chronic headache, fatigue, anxiety issues..."
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3 text-amber-700">
                     <AlertCircle size={20} className="shrink-0" />
                     <p className="text-[11px] font-medium leading-relaxed italic">The doctor will review these symptoms before your arrival for a more focused session.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                   <button onClick={() => setStep(1)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest">Back</button>
                   <button 
                    onClick={() => setStep(3)}
                    disabled={!bookingData.reason}
                    className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-600 transition-all disabled:opacity-50"
                  >
                    Proceed to Sync
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                    <CreditCard className="text-emerald-500" size={24} /> 3. Finalization
                  </h3>
                </div>

                <div className="space-y-6">
                   <div className="bg-white border-2 border-emerald-500 rounded-3xl p-6 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3">
                         <CheckCircle2 className="text-emerald-500" size={24} />
                      </div>
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Payment Summary</h4>
                      <div className="space-y-3">
                         <div className="flex justify-between">
                            <span className="text-xs text-slate-500 font-medium">Session Fee</span>
                            <span className="text-xs font-black text-slate-800">₹{doctor.consultationFee || '500'}</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-xs text-slate-500 font-medium">Digital Service Fee</span>
                            <span className="text-xs font-black text-emerald-500 text-right">FREE</span>
                         </div>
                         <div className="border-t border-slate-100 pt-3 flex justify-between">
                            <span className="text-xs font-black text-slate-900 uppercase">Amount Due</span>
                            <span className="text-lg font-black text-slate-900">₹{doctor.consultationFee || '500'}</span>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Choose Settlement Method</label>
                      <div className="flex gap-4">
                        <button 
                          onClick={() => setBookingData({...bookingData, paymentMethod: 'Cash'})}
                          className={`flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${bookingData.paymentMethod === 'Cash' ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-100'}`}
                        >
                          <Smartphone size={20} className={bookingData.paymentMethod === 'Cash' ? 'text-emerald-600' : 'text-slate-400'} />
                          <span className="text-[10px] font-bold uppercase">Pay at Clinic</span>
                        </button>
                        <button 
                          onClick={() => setBookingData({...bookingData, paymentMethod: 'Online'})}
                          className={`flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${bookingData.paymentMethod === 'Online' ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-100'}`}
                        >
                          <CreditCard size={20} className={bookingData.paymentMethod === 'Online' ? 'text-indigo-600' : 'text-slate-400'} />
                          <span className="text-[10px] font-bold uppercase tracking-tight">Sync Razorpay</span>
                        </button>
                      </div>
                   </div>
                </div>

                <div className="flex gap-4">
                   <button onClick={() => setStep(2)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest">Back</button>
                   <button 
                    onClick={handleBooking}
                    disabled={loading}
                    className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-100 hover:bg-emerald-500 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {loading ? 'Transmitting...' : <>Finalize Booking <CheckCircle2 size={18} /></>}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
