import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, ShieldCheck, ArrowRight, ArrowLeft, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import Logo from '../Logo';

export default function PatientOTPLogin() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) {
      toast.error('Valid phone number required');
      return;
    }
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setStep('otp');
      toast.success('OTP sent to ' + phone);
    }, 1500);
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otp.join('');
    if (otpValue.length < 4) {
      toast.error('Enter 4-digit OTP');
      return;
    }
    setLoading(true);
    // Simulate verification
    setTimeout(() => {
      setLoading(false);
      toast.success('Verification successful');
      // For now, redirect to profile setup
      navigate('/portal/setup');
    }, 1500);
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
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-emerald-100/30 rounded-full blur-[100px] -mt-48 pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10 bg-white/95 backdrop-blur-xl p-6 sm:p-10 rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/60">
        <div className="flex flex-col items-center mb-10">
          <Logo size="lg" />
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

                <button 
                  type="submit"
                  disabled={loading || phone.length < 10}
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
