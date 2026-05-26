import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll } from 'motion/react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Stethoscope, 
  User,
  UserPlus,
  Plus,
  ChevronRight,
  ShieldCheck, 
  Heart,
  Leaf,
  Sparkles,
  Smartphone,
  Clock,
  Menu,
  Zap,
  Check,
  ArrowUp,
  ArrowRight,
  BrainCircuit,
  FileSearch,
  UserCircle,
  Home,
  ChevronDown,
  X as CloseIcon
} from 'lucide-react';

const PLANS = [
  {
    id: 'basic',
    name: 'Basic Clinic',
    price: '₹200',
    period: 'month',
    description: 'Essential digital tools for small homeopathy clinics.',
    features: ['Digital Prescriptions', 'Up to 500 Patients', 'WhatsApp Notifications', 'Cloud Data Backup', 'Basic Billing'],
    color: 'emerald'
  },
  {
    id: 'pro',
    name: 'Pro Practice',
    price: '₹1,000',
    period: '6 months',
    popular: true,
    description: 'Advanced features including inventory and analytics.',
    features: ['Everything in Basic', 'Unlimited Patients', 'Inventory Management', 'Advanced AI Insights', 'Clinical Analytics', 'Video Consultations'],
    color: 'emerald'
  },
  {
    id: 'yearly',
    name: 'Elite Yearly',
    price: '₹2,500',
    period: 'year',
    benefit: '2 Months Free',
    description: 'Best value for established practitioners with full support.',
    features: ['Everything in Pro', 'Priority 24/7 Support', 'Custom Clinic Branding', 'Advanced Data Export', 'Dedicated Account Manager', 'Annual Savings'],
    color: 'emerald'
  }
];
import { auth, db } from '../lib/db';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import Logo from './Logo';
import Footer from './Footer';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

import WhatsAppButton from './shared/WhatsAppButton';

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const [mobileNumber, setMobileNumber] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Mobile OTP States
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpStep, setOtpStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [authIntent, setAuthIntent] = useState<'book' | 'manage'>('book');

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAuthModal = (intent: 'book' | 'manage') => {
    setAuthIntent(intent);
    setPhoneNumber('');
    setOtpCode('');
    setOtpStep('phone');
    setIsOtpModalOpen(true);
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase.auth.signInWithOtp({
          phone: `+91${cleanPhone}`,
        });
        if (error) {
          throw new Error(error.message);
        }
        toast.success(`Secure 6-Digit code requested via Supabase for +91 ${cleanPhone}`);
      } else {
        toast.success(`[DEMO MODE] Code sent to +91 ${cleanPhone}. Enter code 123456 to log in.`);
      }
      setOtpStep('otp');
    } catch (error: any) {
      toast.error(error.message || 'OTP delivery error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (otpCode.length < 6) {
      toast.error('Please enter the 6-digit confirmation code');
      return;
    }
    setLoading(true);
    try {
      let isVerified = false;
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase.auth.verifyOtp({
          phone: `+91${cleanPhone}`,
          token: otpCode,
          type: 'sms'
        });
        if (error) {
          throw new Error(error.message);
        }
        isVerified = !!data.session;
      } else {
        if (otpCode === '123456' || otpCode === '654321') {
          isVerified = true;
        } else {
          throw new Error('Invalid code. For testing, please use verification code: 123456');
        }
      }

      if (isVerified) {
        // Authenticate anonymously in Firebase (to satisfy Firestore rules & schema seamlessly)
        if (!auth.currentUser) {
          const { signInAnonymously } = await import('firebase/auth');
          await signInAnonymously(auth);
        }

        // Search or bootstrap patient profile
        const { query, collection, where, getDocs, addDoc } = await import('firebase/firestore');
        const q = query(
          collection(db, 'patients'),
          where('mobileNumber', '==', cleanPhone)
        );
        const querySnapshot = await getDocs(q);

        let patientDocId = '';
        let patientName = `Patient ${cleanPhone.slice(-4)}`;

        if (!querySnapshot.empty) {
          const firstDoc = querySnapshot.docs[0];
          patientDocId = firstDoc.id;
          patientName = firstDoc.data().name;
        } else {
          // Dynamic generation for new patient on-the-fly
          const khcId = `KHC-${Math.floor(100000 + Math.random() * 900000)}`;
          const docRef = await addDoc(collection(db, 'patients'), {
            patientId: khcId,
            khcId: khcId,
            name: patientName,
            mobileNumber: cleanPhone,
            phone: cleanPhone,
            role: 'patient',
            isMobileVerified: true,
            createdAt: new Date().toISOString()
          });
          patientDocId = docRef.id;
        }

        // Set patient sessions
        localStorage.setItem('kayra_patient_session', JSON.stringify({
          patientId: patientDocId,
          name: patientName,
          mobileNumber: cleanPhone,
          loginType: 'phone-otp'
        }));

        toast.success(`Verification Successful! Welcome ${patientName}`);
        setIsOtpModalOpen(false);
        
        // Redirect to portal with correct tab based on action
        if (authIntent === 'book') {
          navigate('/portal?tab=appointments');
        } else {
          navigate('/portal?tab=appointments');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        await setDoc(docRef, {
          uid: user.uid,
          email: user.email,
          role: 'patient',
          name: user.displayName || 'Patient'
        });
      }
      toast.success('Patient Portal accessed');
      navigate('/portal');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileNumber || !registrationNumber) {
      toast.error('Please enter both mobile number and registration number (KHC-ID)');
      return;
    }

    setLoading(true);
    try {
      const { query, collection, where, getDocs } = await import('firebase/firestore');
      const q = query(
        collection(db, 'patients'), 
        where('mobileNumber', '==', mobileNumber),
        where('khcId', '==', registrationNumber.toUpperCase())
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const patientDoc = querySnapshot.docs[0];
        const patientData = patientDoc.data();
        
        const { signInAnonymously } = await import('firebase/auth');
        const userCredential = await signInAnonymously(auth);
        const uid = userCredential.user.uid;

        if (!patientData.uid) {
          const { doc, updateDoc } = await import('firebase/firestore');
          await updateDoc(doc(db, 'patients', patientDoc.id), {
            uid: uid,
            lastLoginAt: new Date().toISOString()
          });
        }
        
        localStorage.setItem('kayra_patient_session', JSON.stringify({
          patientId: patientDoc.id,
          name: patientData.name,
          mobileNumber: patientData.mobileNumber,
          loginType: 'phone-dob'
        }));
        
        toast.success(`Welcome back, ${patientData.name}`);
        navigate('/portal');
      } else {
        toast.error('No record found matching these details.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col scroll-smooth">
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[3px] bg-emerald-500 origin-left z-[100]"
        style={{ scaleX: scrollYProgress }}
      />

      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <Link to="/">
            <Logo size="md" />
          </Link>
          <div className="hidden lg:flex items-center gap-8 text-sm font-bold text-slate-500 uppercase tracking-widest">
            <a href="#" onClick={(e) => { e.preventDefault(); scrollToTop(); }} className="hover:text-emerald-600 transition-colors flex items-center gap-1">
              <Home size={14} /> Home
            </a>
            <a href="#features" className="hover:text-emerald-600 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-emerald-600 transition-colors">Plans</a>
            <a href="#patient-login" className="hover:text-emerald-600 transition-colors">Patient Portal</a>
            <a href="#contact" className="hover:text-emerald-600 transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/register-clinic" className="hidden lg:flex premium-3d-button-green text-xs font-bold uppercase tracking-widest text-white px-6 py-3 !rounded-xl">Doctor Registration</Link>
            <button 
              onClick={() => handleOpenAuthModal('book')}
              className="hidden sm:flex premium-glass-button text-xs font-bold uppercase tracking-widest px-6 py-3 !rounded-xl cursor-pointer"
            >
              Book Appointment
            </button>
            <Link to="/login/doctor" className="hidden sm:flex bg-slate-900 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95">Practitioner Access</Link>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-3 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
            >
              {isMenuOpen ? <CloseIcon size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white border-b border-slate-100 overflow-hidden"
            >
              <div className="px-6 py-8 flex flex-col gap-6">
                <a href="#" onClick={(e) => { e.preventDefault(); scrollToTop(); setIsMenuOpen(false); }} className="text-lg font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Home size={20} /> Home
                </a>
                <a href="#features" className="text-lg font-bold text-slate-900 uppercase tracking-widest">Features</a>
                <a href="#pricing" className="text-lg font-bold text-slate-900 uppercase tracking-widest">Plans</a>
                <a href="#patient-login" className="text-lg font-bold text-slate-900 uppercase tracking-widest">Patient Portal</a>
                <a href="#contact" className="text-lg font-bold text-slate-900 uppercase tracking-widest">Contact</a>
                <div className="h-[1px] bg-slate-100 w-full mt-2"></div>
                <Link to="/register-clinic" className="w-full premium-3d-button-green text-white py-4 !rounded-2xl text-center font-bold uppercase tracking-widest text-xs mb-2">Doctor Registration</Link>
                <button 
                  onClick={() => { setIsMenuOpen(false); handleOpenAuthModal('book'); }}
                  className="w-full premium-glass-button py-4 !rounded-2xl text-center font-bold uppercase tracking-widest text-xs mb-2 cursor-pointer"
                >
                  Book Appointment
                </button>
                <Link to="/login/doctor" className="w-full bg-slate-900 text-white py-4 rounded-2xl text-center font-bold uppercase tracking-widest text-xs">Practitioner Access</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 sm:pt-40 pb-16 sm:pb-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full opacity-10 pointer-events-none">
          <div className="absolute top-20 left-10 w-64 h-64 bg-emerald-400 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-20 right-10 w-64 h-64 bg-lime-400 rounded-full blur-[100px]"></div>
        </div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10 font-sans">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] mb-8"
          >
            <Leaf size={14} /> 
            <span>Natural Healing • Precision Homeopathy • HIPAA Secure</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-slate-900 tracking-tighter leading-[1.1] sm:leading-[1] mb-6 sm:mb-8 lg:mb-12 font-heading"
          >
            Digital Sanctuary for <br className="hidden md:block" />
            <span className="text-brand-600">Holistic Recovery</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xs sm:text-lg text-slate-500 max-w-2xl mx-auto mb-10 sm:mb-12 leading-relaxed font-semibold px-4 sm:px-0"
          >
            Welcome to Kayra's Homoeo. Care – where legacy homeopathic wisdom meets advanced AI diagnostics. Experience a clinical ecosystem designed for your total well-being.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 px-6 sm:px-0"
          >
            <Link 
              to="/register-clinic"
              className="premium-3d-button-green text-white !rounded-2xl px-6 sm:px-8 py-4 sm:py-5 font-bold uppercase tracking-widest text-[10px] sm:text-xs flex items-center justify-center gap-3 group"
            >
              Doctor Registration <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <button 
              onClick={() => handleOpenAuthModal('book')}
              className="premium-glass-button !rounded-2xl px-6 sm:px-8 py-4 sm:py-5 font-bold uppercase tracking-widest text-[10px] sm:text-xs flex items-center justify-center gap-3 group cursor-pointer"
            >
              Book Appointment <UserCircle size={18} className="text-emerald-500" />
            </button>
            <Link 
              to="/login/doctor"
              className="px-6 sm:px-8 py-4 sm:py-5 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] sm:text-xs flex items-center justify-center gap-3 shadow-2xl shadow-slate-300 hover:bg-slate-800 transition-all active:scale-95 group"
            >
              Start Practice <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {/* Manage Reschedule Existing Appointment subtle secondary action */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 flex flex-col items-center justify-center"
          >
            <button
              onClick={() => handleOpenAuthModal('manage')}
              className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-all underline decoration-dotted underline-offset-4 cursor-pointer"
            >
              Manage/Reschedule Existing Appointment
            </button>
          </motion.div>
        </div>

        {/* Scroll Down Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 hidden lg:flex flex-col items-center gap-2"
        >
          <button 
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex flex-col items-center gap-2 text-slate-400 hover:text-emerald-600 transition-all group"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] ml-1">Discover</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="w-10 h-10 border border-slate-200 rounded-full flex items-center justify-center bg-white shadow-sm group-hover:border-emerald-200 group-hover:shadow-md transition-all"
            >
              <ChevronDown size={18} />
            </motion.div>
          </button>
        </motion.div>
      </section>

      {/* Quick Stats/Features */}
      <section id="features" className="py-16 md:py-24 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          <FeatureCard 
            icon={BrainCircuit}
            title="AI Repertory"
            desc="Advanced symptom matching for precision remedy selection."
          />
          <FeatureCard 
            icon={ShieldCheck}
            title="Secure Vault"
            desc="HIPAA-compliant encrypted health record storage."
          />
          <FeatureCard 
            icon={Leaf}
            title="Holistic Focus"
            desc="Constitutional analysis for deep-acting healing."
          />
          <FeatureCard 
            icon={FileSearch}
            title="Digital Reports"
            desc="Instant access to clinical records and prescriptions."
          />
        </div>
      </section>

      {/* Patient Login Section */}
      <section id="patient-login" className="py-16 md:py-32 px-6 relative overflow-hidden bg-slate-50">
        <div className="absolute top-0 right-0 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-emerald-100/30 rounded-full blur-[120px] -mr-20 sm:-mr-40 -mt-20 sm:-mt-40 pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto flex flex-col lg:grid lg:grid-cols-2 gap-8 sm:gap-20 items-center">
          <div className="relative z-10 text-center lg:text-left order-2 lg:order-1">
            <div className="hidden lg:inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4">
              <Sparkles size={14} />
              <span>Digital Oasis</span>
            </div>
            <h2 className="text-3xl md:text-6xl font-bold text-slate-900 tracking-tight leading-tight mb-4 md:mb-6">
              Your Healing <br className="hidden sm:block" />
              <span className="text-emerald-600 italic">Sanctuary</span>
            </h2>
            <p className="text-sm md:text-lg text-slate-500 mb-6 md:mb-10 leading-relaxed max-w-lg mx-auto lg:mx-0 font-medium">
              Secure digital care. Track your healing journey with intelligence.
            </p>
            
            <div className="flex flex-row lg:flex-col justify-center lg:justify-start gap-4 md:gap-6 text-left max-w-md mx-auto lg:mx-0">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-9 h-9 bg-white rounded-xl shadow-sm flex items-center justify-center text-emerald-600 shrink-0 border border-slate-100">
                  <FileSearch size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 uppercase tracking-wide text-[9px] sm:text-[10px]">Vault</h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium leading-none">Instant records.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-9 h-9 bg-white rounded-xl shadow-sm flex items-center justify-center text-emerald-600 shrink-0 border border-slate-100">
                  <Clock size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 uppercase tracking-wide text-[9px] sm:text-[10px]">Booking</h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium leading-none">Easy visits.</p>
                </div>
              </div>
            </div>
          </div>

          <motion.div 
            id="patient-login"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="w-full order-1 lg:order-2 bg-gradient-to-br from-emerald-50 to-white rounded-[2rem] sm:rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(30,41,59,0.06)] p-6 sm:p-12 border border-emerald-100/50 relative z-10 text-center"
          >
            <div className="flex flex-col items-center mb-8">
              <Logo size="md" showTagline={true} />
              <div className="h-[1px] w-12 bg-emerald-200/50 my-5 sm:my-6"></div>
              <h3 className="text-sm font-black text-slate-900 tracking-wider uppercase">Patient Access</h3>
              <p className="text-xs text-slate-500 mt-2 max-w-sm">
                Access your appointments, health prescriptions, and active bills cleanly using seamless login confirmation. No passwords required.
              </p>
            </div>

            <div className="space-y-3.5">
              <button 
                onClick={() => handleOpenAuthModal('manage')}
                className="w-full py-4.5 sm:py-5 bg-emerald-600 text-white rounded-xl sm:rounded-2xl font-bold shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3 uppercase tracking-widest text-[10px] cursor-pointer group"
              >
                Access My Profile
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={() => handleOpenAuthModal('book')}
                className="w-full py-4.5 sm:py-5 bg-white text-slate-700 rounded-xl sm:rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 transition-all active:scale-[0.98] flex items-center justify-center gap-3 uppercase tracking-widest text-[10px] cursor-pointer"
              >
                <Plus size={14} className="text-emerald-500" />
                Book Appointment
              </button>
            </div>

            <div className="relative my-6 text-center text-slate-300">
              <div className="absolute top-1/2 left-0 w-full h-[1px] bg-slate-100"></div>
              <span className="text-[8px] uppercase tracking-[0.3em] font-bold bg-white px-4 relative z-10 text-slate-400">Secure Area</span>
            </div>

            <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">
              Protected by HIPAA Compliance • Encrypted Sessions
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 md:py-32 px-4 sm:px-6 bg-white overflow-hidden relative">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-12 md:mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight mb-4 md:mb-6">Choose Your Practice Growth</h2>
            <p className="text-sm md:text-slate-500 max-w-2xl mx-auto font-medium">Flexible plans designed for homeopathic practitioners of all sizes. Scale your clinic with advanced AI tools and secure record management.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {PLANS.map((plan) => (
              <motion.div 
                key={plan.id}
                whileHover={{ y: -10 }}
                className={`bg-white rounded-[2rem] sm:rounded-[3rem] border-2 p-6 sm:p-10 flex flex-col relative overflow-hidden transition-all ${
                  plan.popular ? 'border-emerald-500 shadow-[0_32px_64px_-16px_rgba(16,185,129,0.1)]' : 'border-slate-100'
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-6 py-2 rounded-bl-3xl uppercase tracking-widest">
                    Best Value
                  </div>
                )}
                
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                <p className="text-sm text-slate-500 mb-8 leading-relaxed font-medium">{plan.description}</p>
                
                <div className="mb-10 flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-slate-900 tracking-tighter">{plan.price}</span>
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">/ {plan.period}</span>
                </div>

                <div className="space-y-4 mb-10 flex-grow">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="mt-1 w-5 h-5 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 shrink-0">
                        <Check size={12} strokeWidth={4} />
                      </div>
                      <span className="text-sm text-slate-600 font-bold leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>

                <Link 
                  to="/login/doctor" 
                  className={`w-full py-5 rounded-[2rem] font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all active:scale-95 ${
                    plan.popular 
                      ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-100 hover:bg-emerald-700' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Start Practice <ArrowRight size={18} />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Role Selection Blocks */}
      <section className="py-16 md:py-32 px-4 sm:px-6 bg-slate-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] -mr-40 -mt-40 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
            <motion.div 
              whileHover={{ y: -10 }}
              className="bg-white/5 border border-white/10 p-8 sm:p-12 rounded-[2rem] sm:rounded-[2.5rem] group backdrop-blur-sm"
            >
              <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mb-6 md:mb-8 group-hover:scale-110 transition-transform">
                <Stethoscope size={32} />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-5 tracking-tight">Practitioner Portal</h2>
              <p className="text-sm md:text-base text-slate-400 mb-8 md:mb-10 leading-relaxed font-medium">
                Modernize your homeopathic practice with digital case picking, repertory tools, and secure telemedicine capabilities.
              </p>
              <Link to="/login/doctor" className="inline-flex items-center gap-3 text-emerald-400 font-bold uppercase tracking-widest text-[10px] hover:gap-5 transition-all">
                Enter Digital Clinic <ArrowRight size={18} />
              </Link>
            </motion.div>

            <motion.div 
              whileHover={{ y: -10 }}
              className="bg-white/5 border border-white/10 p-8 sm:p-12 rounded-[2rem] sm:rounded-[2.5rem] group backdrop-blur-sm"
            >
              <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mb-6 md:mb-8 group-hover:scale-110 transition-transform">
                <UserCircle size={32} />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-5 tracking-tight">Global Network</h2>
              <p className="text-sm md:text-base text-slate-400 mb-8 md:mb-10 leading-relaxed font-medium">
                Join our collective of certified practitioners. Collaborative clinical management with global reach and localized care.
              </p>
              <Link to="/login/doctor" className="inline-flex items-center gap-3 text-emerald-400 font-bold uppercase tracking-widest text-[10px] hover:gap-5 transition-all">
                Registry Link <ArrowRight size={18} />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 md:py-32 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-400 rounded-full blur-[100px]"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6">
                Connect With Us
              </div>
              <h2 className="text-4xl md:text-6xl font-bold text-slate-900 tracking-tight leading-tight mb-8">
                Start Your <span className="text-emerald-600 italic">Healing Conversion</span> Today
              </h2>
              <p className="text-lg text-slate-500 mb-12 leading-relaxed font-medium">
                Have questions about our digital clinic solutions or need support with your homeopathic journey? Our team of holistic experts is here to assist you.
              </p>

              <div className="space-y-8">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-slate-100 shadow-sm">
                    <Smartphone size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Emergency Support</p>
                    <p className="text-lg font-bold text-slate-900">+91 91530 00000</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-slate-100 shadow-sm">
                    <BrainCircuit size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Inquiry</p>
                    <p className="text-lg font-bold text-slate-900">care@kayrashomoeo.com</p>
                  </div>
                </div>
              </div>
            </div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="bg-slate-50 p-8 sm:p-12 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/50"
            >
              <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); toast.success('Inquiry sent! We will contact you soon.'); }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 focus:border-emerald-500 outline-none transition-all text-sm font-bold shadow-sm"
                      placeholder="Dr. John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                    <input 
                      required
                      type="email" 
                      className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 focus:border-emerald-500 outline-none transition-all text-sm font-bold shadow-sm"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Subject</label>
                  <select className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 focus:border-emerald-500 outline-none transition-all text-sm font-bold shadow-sm appearance-none">
                    <option>Clinic Digitization</option>
                    <option>Patient Support</option>
                    <option>Technical Issue</option>
                    <option>Marketing / Partnership</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Message</label>
                  <textarea 
                    rows={4}
                    className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-200 focus:border-emerald-500 outline-none transition-all text-sm font-bold shadow-sm resize-none"
                    placeholder="How can we help you today?"
                  ></textarea>
                </div>
                <button 
                  type="submit"
                  className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-xl shadow-slate-200 hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 group"
                >
                  Send Inquiry <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Premium, clean, and ultra-scannable Web/App Footer */}
      <Footer />

      <WhatsAppButton />

      {/* Global Scroll To Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-8 right-6 w-14 h-14 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center z-[60] hover:bg-emerald-600 transition-all active:scale-90 border-4 border-white"
          >
            <ArrowUp size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Phone OTP Modal conforming to Clinical guidelines */}
      <AnimatePresence>
        {isOtpModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop Blur */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOtpModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden"
            >
              {/* Top aesthetics line */}
              <div className="h-1.5 w-full bg-emerald-500"></div>

              {/* Close Button */}
              <button 
                onClick={() => setIsOtpModalOpen(false)}
                className="absolute top-5 right-5 px-3 py-1.5 text-slate-400 hover:text-slate-600 rounded-lg bg-slate-50 border border-slate-100 transition-all text-[10px] font-bold uppercase cursor-pointer"
              >
                Close
              </button>

              <div className="p-8 sm:p-10">
                <div className="flex flex-col items-center text-center mb-8">
                  <span className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                    <Smartphone size={24} />
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-none mb-2">
                    {authIntent === 'book' ? 'Book Appointment' : 'Sign In Portal'}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {otpStep === 'phone' 
                      ? 'Confirm your 10-digit mobile number to generate a secure login session.' 
                      : `Enter the 6-digit confirmation code code sent to +91 ${phoneNumber}`}
                  </p>
                </div>

                {otpStep === 'phone' ? (
                  <form onSubmit={handleSendOTP} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 leading-none">Enter Mobile Number</label>
                      <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs tracking-wider">+91</span>
                        <input 
                          required
                          type="tel"
                          maxLength={10}
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                          placeholder="9153000000"
                          className="w-full pl-16 pr-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 outline-none transition-all text-sm font-bold tracking-widest"
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full py-4.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? 'Sending...' : 'Send OTP'}
                      <ArrowRight size={14} />
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOTP} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 leading-none">Confirm Verification Code</label>
                      <input 
                        required
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="w-full py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 outline-none transition-all text-center text-lg font-bold tracking-[0.5em]"
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full py-4.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? 'Verifying...' : 'Verify Code'}
                    </button>

                    <div className="text-center mt-4">
                      <button 
                        type="button"
                        onClick={() => setOtpStep('phone')}
                        className="text-[10px] font-bold text-slate-400 hover:text-emerald-600 transition-all uppercase tracking-wider underline decoration-dotted"
                      >
                        Change Phone Number
                      </button>
                    </div>
                  </form>
                )}

                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-2.5 text-slate-400 justify-center">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Materia Medica Compliance</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="space-y-5 group">
      <div className="w-16 h-16 bg-emerald-50 rounded-[1.5rem] flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 shadow-sm">
        <Icon size={28} />
      </div>
      <div>
        <h3 className="font-bold text-slate-900 uppercase tracking-wider text-sm mb-2">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed font-medium">{desc}</p>
      </div>
    </div>
  );
}
