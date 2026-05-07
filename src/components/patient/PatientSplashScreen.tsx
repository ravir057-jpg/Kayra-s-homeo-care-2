import { useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Heart, Stethoscope, ShieldCheck, Zap } from 'lucide-react';
import Logo from '../Logo';

export default function PatientSplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    // Show splash for 3 seconds then go to login
    const timer = setTimeout(() => {
      navigate('/login/patient/otp');
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="h-screen w-full bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated background elements */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1]
        }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute top-1/4 -right-20 w-96 h-96 bg-emerald-500 rounded-full blur-[120px] pointer-events-none"
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.15, 0.1]
        }}
        transition={{ duration: 10, repeat: Infinity, delay: 1 }}
        className="absolute bottom-1/4 -left-20 w-80 h-80 bg-indigo-500 rounded-full blur-[100px] pointer-events-none"
      />

      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <Logo size="lg" theme="light" />
        </motion.div>

        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-4">
            <FeatureIcon icon={Heart} delay={0.2} color="text-red-400" />
            <FeatureIcon icon={Stethoscope} delay={0.4} color="text-emerald-400" />
            <FeatureIcon icon={ShieldCheck} delay={0.6} color="text-blue-400" />
          </div>
          
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: 200 }}
            transition={{ duration: 2.5, ease: "easeInOut" }}
            className="h-1 bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-full mt-8 overflow-hidden"
          >
            <motion.div 
              animate={{ x: [-200, 200] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1/2 h-full bg-white/40"
            />
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-6"
          >
            Digital Health Sanctuary
          </motion.p>
        </div>
      </div>

      <div className="absolute bottom-12 flex flex-col items-center gap-1">
        <div className="flex items-center gap-2 text-white/40 text-[9px] font-black uppercase tracking-widest">
            <Zap size={10} fill="currentColor" /> Holistic Intelligence Sync
        </div>
        <p className="text-white/20 text-[8px] font-medium tracking-tight">Version 2.0.4 • Powered by Antigravity</p>
      </div>
    </div>
  );
}

function FeatureIcon({ icon: Icon, delay, color }: { icon: any, delay: number, color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5, type: 'spring' }}
      className={`w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center ${color} backdrop-blur-xl border border-white/10`}
    >
      <Icon size={20} />
    </motion.div>
  );
}
