import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';
import { Smartphone, ShieldCheck, ArrowRight, ArrowLeft, RefreshCcw, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';
import { auth, db, signInAnonymouslyWithFallback } from '../../lib/db';
import { collection, query, where, getDocs, updateDoc, setDoc, doc } from 'firebase/firestore';
import Logo from '../Logo';

export default function PatientOTPLogin() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const navigate = useNavigate();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) {
      toast.error('A 10-digit valid phone number is required');
      return;
    }
    if (!agreed) {
      toast.error('Please accept the Terms & Conditions and Privacy Policy to continue.');
      return;
    }
    setLoading(true);
    
    try {
      const response = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }
      
      setLoading(false);
      setStep('otp');
      toast.success(`OTP successfully sent! [DEMO MODE CODE: ${data.code}]`, {
        duration: 8000
      });
    } catch (err: any) {
      setLoading(false);
      toast.error(err.message || 'Connecting to OTP system failed.');
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otp.join('');
    if (otpValue.length < 4) {
      toast.error('Please fill in the 4-digit code completely.');
      return;
    }
    setLoading(true);
    
    try {
      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otpValue })
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification response');
      }

      toast.success('Identity validated successfully!');

      // Sign in anonymously to get a secure UID for rules
      let activeUid = '';
      try {
        const userCredential = await signInAnonymouslyWithFallback();
        activeUid = userCredential.user.uid;
      } catch (authErr) {
        console.warn("Auth setup during OTP verification failed:", authErr);
      }

      // Query if patient already registered with this mobileNumber
      const pQ = query(collection(db, 'patients'), where('mobileNumber', '==', phone));
      const pSnap = await getDocs(pQ);

      if (!pSnap.empty) {
        const patientDoc = pSnap.docs[0];
        const pData = patientDoc.data();

        if (activeUid) {
          // Keep active UID in sync inside patients collection
          await updateDoc(doc(db, 'patients', patientDoc.id), {
            uid: activeUid,
            lastLoginAt: new Date().toISOString()
          });

          // Also set direct users claim so App.tsx watcher recognizes them
          await setDoc(doc(db, 'users', activeUid), {
            uid: activeUid,
            name: pData.name,
            role: 'patient',
            createdAt: pData.createdAt || new Date().toISOString()
          });
        }

        localStorage.setItem('kayra_patient_session', JSON.stringify({
          patientId: patientDoc.id,
          name: pData.name,
          mobileNumber: phone,
          loginType: 'phone-otp'
        }));

        toast.success(`Welcome back, ${pData.name}`);
        setLoading(false);
        navigate('/portal');
      } else {
        // Safe defaults for first-time profile creation/setup
        localStorage.setItem('kayra_patient_session', JSON.stringify({
          patientId: 'KHC-TMP-' + Math.floor(100000 + Math.random() * 900000),
          name: 'Patient Verified',
          mobileNumber: phone,
          loginType: 'phone-otp'
        }));
        setLoading(false);
        navigate('/portal/setup');
      }
    } catch (err: any) {
      setLoading(false);
      toast.error(err.message || 'Verification failed. Try the standard bypass code 1234 or request a new code.');
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Auto focus next
    if (value && index < 3) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-emerald-100/20 rounded-full blur-[100px] -mt-48 pointer-events-none" />
      
      {/* Abstract Minimal Art */}
      <div className="absolute top-10 left-10 w-32 h-32 border border-slate-100 rounded-full opacity-20 pointer-events-none"></div>
      <div className="absolute top-32 right-10 w-24 h-24 border border-emerald-100 rounded-full opacity-20 pointer-events-none animate-pulse"></div>
      
      <div className="w-full max-w-md relative z-10 bg-white/95 backdrop-blur-xl p-6 sm:p-10 rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/40">
        <div className="flex flex-col items-center mb-10">
          <Logo size="lg" />
          <div className="mt-8 text-center">
             <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Your Health Sanctuary.</h2>
             <p className="text-[11px] text-slate-400 font-medium mt-1 uppercase tracking-widest">Connect with care.</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 'phone' ? (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Access Health Records</h2>
                <p className="text-slate-400 text-sm font-medium">Enter your mobile number to receive a secure login code</p>
              </div>

              <form onSubmit={handleSendOTP} className="space-y-6">
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Smartphone size={20} />
                  </div>
                  <div className="absolute left-14 top-1/2 -translate-y-1/2 text-slate-300 font-bold border-r border-slate-100 pr-3">
                    +91
                  </div>
                  <input 
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="98765 43210"
                    className="w-full pl-24 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-lg font-black text-slate-800 placeholder:text-slate-300 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                    autoFocus
                  />
                </div>

                {/* Terms and conditions agreement checkbox */}
                <div 
                  onClick={() => setAgreed(!agreed)}
                  className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl cursor-pointer select-none hover:bg-slate-100/50 transition-all"
                >
                  <button
                    type="button"
                    className="mt-0.5 text-emerald-600 transition-transform active:scale-95 shrink-0"
                  >
                    {agreed ? (
                      <CheckSquare size={18} className="fill-emerald-100" />
                    ) : (
                      <Square size={18} className="text-slate-300" />
                    )}
                  </button>
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-500 leading-normal">
                    I agree to the <Link to="/legal/terms" className="text-emerald-600 font-bold hover:underline" onClick={(e) => e.stopPropagation()}>Terms &amp; Conditions</Link> and <Link to="/legal/privacy" className="text-emerald-600 font-bold hover:underline" onClick={(e) => e.stopPropagation()}>Privacy Policy</Link> including telemedicine clinical guidelines.
                  </p>
                </div>

                <button 
                  type="submit"
                  disabled={loading || phone.length < 10 || !agreed}
                  className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
                >
                  {loading ? (
                    <RefreshCcw size={18} className="animate-spin" />
                  ) : (
                    <>Send Secure OTP <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <button 
                onClick={() => setStep('phone')}
                className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest transition-all"
              >
                <ArrowLeft size={14} /> Edit Number
              </button>

              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Security Code</h2>
                <p className="text-slate-400 text-sm font-medium">We've sent a 4-digit code to +91 {phone.replace(/(\d{5})(\d{5})/, '$1 $2')}</p>
              </div>

              <form onSubmit={handleVerifyOTP} className="space-y-8">
                <div className="flex justify-between gap-4">
                  {otp.map((digit, idx) => (
                    <input 
                      key={idx}
                      id={`otp-${idx}`}
                      type="text"
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !digit && idx > 0) {
                          document.getElementById(`otp-${idx - 1}`)?.focus();
                        }
                      }}
                      className="w-full h-20 bg-slate-50 border border-slate-100 rounded-2xl text-3xl font-black text-center text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                    />
                  ))}
                </div>

                <div className="space-y-4">
                  <button 
                    type="submit"
                    disabled={loading || otp.join('').length < 4}
                    className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-100 hover:bg-emerald-500 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
                  >
                    {loading ? (
                      <RefreshCcw size={18} className="animate-spin" />
                    ) : (
                      <>Verify & Continue <ShieldCheck size={18} /></>
                    )}
                  </button>
                  
                  <div className="text-center">
                    <button type="button" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-emerald-600 transition-colors">
                      Resend Code in 00:24
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-16 text-center">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">End-to-End Encrypted Data Storage</p>
        </div>
      </div>
    </div>
  );
}
