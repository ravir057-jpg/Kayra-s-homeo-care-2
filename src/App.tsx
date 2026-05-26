import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Calendar, 
  FileText, 
  Database, 
  LayoutDashboard, 
  Package, 
  BrainCircuit, 
  Settings, 
  History,
  Home,
  Bell, 
  LogOut,
  Plus,
  Play,
  Video,
  BarChart3,
  Clock,
  UserCircle,
  User as UserIcon,
  Menu,
  X,
  Shield,
  MessageCircle,
  CircleDollarSign as IndianRupee,
  ArrowUp,
  CreditCard,
  Stethoscope
} from 'lucide-react';
import { auth, db } from './lib/db';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, getDocFromServer, onSnapshot, query, collection, where, getDocs } from 'firebase/firestore';

// Components
import Logo from './components/Logo';
import LandingPage from './components/LandingPage';
import DoctorDashboard from './components/doctor/DoctorDashboard';
import PatientManager from './components/doctor/PatientManager';
import AppointmentManager from './components/doctor/AppointmentManager';
import PrescriptionPad from './components/doctor/PrescriptionPad';
import InventoryManager from './components/doctor/InventoryManager';
import BillingManager from './components/doctor/BillingManager';
import AITools from './components/doctor/AITools';
import VideoConsultation from './components/doctor/VideoConsultation';
import FollowUpManager from './components/doctor/FollowUpManager';
import ReportsAnalytics from './components/doctor/ReportsAnalytics';
import DoctorSettings from './components/doctor/DoctorSettings';
import QuickBillModal from './components/doctor/QuickBillModal';
import PatientPortal from './components/patient/PatientPortal';
import PatientSplashScreen from './components/patient/PatientSplashScreen';
import PatientOTPLogin from './components/patient/PatientOTPLogin';
import PatientProfileSetup from './components/patient/PatientProfileSetup';
import DoctorManager from './components/doctor/DoctorManager';
import ComplaintsManager from './components/doctor/ComplaintsManager';
import AuditLogs from './components/doctor/AuditLogs';
import SupabaseDashboard from './components/doctor/SupabaseDashboard';
import LegalPage from './components/LegalPage';
import DoctorLogin from './components/auth/DoctorLogin';
import PatientLogin from './components/auth/PatientLogin';
import PatientRegistration from './components/auth/PatientRegistration';
import ClinicRegistration from './components/auth/ClinicRegistration';
import SuperAdminDashboard from './components/admin/SuperAdminDashboard';
import ClinicAdminDashboard from './components/admin/ClinicAdminDashboard';
import DoctorOnboarding from './components/doctor/DoctorOnboarding';
import { UserProfile as GlobalUserProfile } from './types';

// Helper Components for Role-based Routing
function DoctorRoute({ profile, children }: { profile: GlobalUserProfile | null, children: React.ReactNode }) {
  if (!profile) return <Navigate to="/login" />;
  if (profile.role !== 'doctor' && profile.role !== 'clinic_admin' && profile.role !== 'super_admin') return <Navigate to="/portal" />;
  return <>{children}</>;
}

function AdminRoute({ profile, children, requiredRole }: { profile: GlobalUserProfile | null, children: React.ReactNode, requiredRole?: 'clinic_admin' | 'super_admin' }) {
  if (!profile) return <Navigate to="/login" />;
  if (requiredRole && profile.role !== requiredRole) return <Navigate to="/" />;
  if (profile.role !== 'clinic_admin' && profile.role !== 'super_admin') return <Navigate to="/" />;
  return <>{children}</>;
}

function PatientRoute({ profile, children }: { profile: GlobalUserProfile | null, children: React.ReactNode }) {
  if (!profile) return <Navigate to="/login" />;
  if (profile.role !== 'patient') return <Navigate to="/dashboard" />;
  return <>{children}</>;
}

import { LanguageProvider, useLanguage } from './lib/i18n';

function ScrollRestoration() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

// Helpers and Types for Hardened Firestore Error Tracking conforming to Security guidelines
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
  LISTEN = 'listen',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<GlobalUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Basic connection test helper
    const testConnection = async () => {
      try {
        console.log("Testing Firestore connectivity...");
        // Use getDocFromServer to force a network check
        const testRef = doc(db, '_health', 'connection');
        await getDocFromServer(testRef);
        console.log("Firestore is online.");
      } catch (error: any) {
        console.warn("Firestore connection attempt failed:", error.message);
        if (error?.message?.includes('offline') || error?.message?.includes('unavailable')) {
          console.error("Firestore is offline or unreachable. Check Firebase configuration and database ID.");
          toast.error("Cloud synchronization is limited. The system will operate in local mode.");
        }
      }
    };
    testConnection();

    let activeUnsubscribe: (() => void) | null = null;
    let retryTimeoutId: any = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      // Clean up previous user subscriptions/timers immediately
      if (activeUnsubscribe) {
        activeUnsubscribe();
        activeUnsubscribe = null;
      }
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
        retryTimeoutId = null;
      }

      if (currentUser) {
        let attempt = 0;
        const maxAttempts = 6;
        const baseDelay = 1000; // start at 1s

        const startSubscriptionWatch = () => {
          const userRef = doc(db, 'users', currentUser.uid);
          
          activeUnsubscribe = onSnapshot(userRef, async (docSnap) => {
            // Success: Reset attempt count upon receiving a valid snap
            attempt = 0;
            
            if (docSnap.exists()) {
              setProfile(docSnap.data() as GlobalUserProfile);
              setLoading(false);
            } else {
              // If not in users, check patients collection (for patients logged in via KHC-ID)
              try {
                const patientQ = query(collection(db, 'patients'), where('uid', '==', currentUser.uid));
                const patientSnap = await getDocs(patientQ);
                
                if (!patientSnap.empty) {
                  const pData = patientSnap.docs[0].data();
                  setProfile({
                    uid: currentUser.uid,
                    email: pData.email || null,
                    name: pData.name,
                    role: 'patient',
                    createdAt: pData.createdAt
                  } as GlobalUserProfile);
                } else {
                  setProfile(null);
                }
                setLoading(false);
              } catch (patientError: any) {
                console.error("Failed to query patient catalog:", patientError);
                handleFirestoreError(patientError, OperationType.LIST, 'patients');
                
                // If query fails with permission-denied, let the retry handler kick in if bounds permit
                if (patientError?.code === 'permission-denied' && attempt < maxAttempts) {
                  scheduleRetry();
                } else {
                  setProfile(null);
                  setLoading(false);
                }
              }
            }
          }, (snapError: any) => {
            handleFirestoreError(snapError, OperationType.LISTEN, `users/${currentUser.uid}`);
            
            const isPermissionError = snapError?.code === 'permission-denied' || 
                                      snapError?.message?.toLowerCase().includes('permission') ||
                                      snapError?.message?.toLowerCase().includes('insufficient');

            if (isPermissionError && attempt < maxAttempts) {
              scheduleRetry();
            } else {
              console.error("Exhausted retries or experienced severe profile registration check error.");
              toast.error("Profile authorization pending. If this persists, please contact support.");
              setLoading(false);
            }
          });
        };

        const scheduleRetry = () => {
          attempt++;
          const nextInterval = Math.min(baseDelay * Math.pow(2, attempt), 15000) + Math.random() * 300;
          console.warn(`[Profile Subscription Retry ${attempt}/${maxAttempts}] Propagation delay or authorization lapse. Attempting recovery in ${Math.round(nextInterval)}ms...`);
          
          if (activeUnsubscribe) {
            activeUnsubscribe();
            activeUnsubscribe = null;
          }

          retryTimeoutId = setTimeout(() => {
            // Verify current active user session matches
            if (auth.currentUser?.uid === currentUser.uid) {
              startSubscriptionWatch();
            }
          }, nextInterval);
        };

        // Initialize connection
        startSubscriptionWatch();

      } else {
        // Even if no Firebase User, check for local patient session (KHC-ID login)
        const sessionStr = localStorage.getItem('kayra_patient_session');
        if (sessionStr) {
          try {
            const session = JSON.parse(sessionStr);
            setProfile({
              uid: 'session-' + session.patientId,
              email: null,
              name: session.name,
              role: 'patient'
            } as GlobalUserProfile);
          } catch (e) {
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (activeUnsubscribe) {
        activeUnsubscribe();
      }
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
      }
    };
  }, []);

  const isMfaVerified = sessionStorage.getItem('doctor_mfa_verified') === 'true';

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-6">
          <Logo size="lg" />
          <div className="w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="w-1/2 h-full bg-emerald-600 animate-pulse"></div>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] animate-pulse">Healing Sanctuary Initializing</p>
        </div>
      </div>
    );
  }

  // Redirect logic helper to avoid repetition and loops
  const getRedirectPath = () => {
    if (!user) return null;
    if (!profile) return null; // Wait for profile or stay on current page if it handles null profile
    if (profile.role === 'super_admin') return '/super-admin';
    if (profile.role === 'clinic_admin') return '/clinic-admin';
    return profile.role === 'doctor' ? '/dashboard' : '/portal';
  };

  const redirectPath = getRedirectPath();

  if (user && profile && profile.role === 'doctor' && !profile.isOnboarded) {
    return <DoctorOnboarding user={profile} onComplete={() => window.location.reload()} />;
  }

  return (
    <Router>
      <ScrollRestoration />
      <Toaster position="top-right" />
      <div className="h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
        <Routes>
          <Route path="/" element={!user ? <LandingPage /> : (redirectPath ? <Navigate to={redirectPath} /> : <LandingPage />)} />
          <Route path="/legal/privacy" element={<LegalPage />} />
          <Route path="/legal/terms" element={<LegalPage />} />
          <Route path="/login/doctor" element={!user ? <DoctorLogin /> : (redirectPath ? <Navigate to={redirectPath} /> : <Navigate to="/dashboard" />)} />
          <Route path="/register-clinic" element={!user ? <ClinicRegistration /> : (redirectPath ? <Navigate to={redirectPath} /> : <Navigate to="/dashboard" />)} />
          <Route path="/book-appointment" element={!user ? <PatientRegistration /> : (redirectPath ? <Navigate to={redirectPath} /> : <Navigate to="/portal" />)} />
          <Route path="/login/patient" element={!user ? <PatientLogin /> : (redirectPath ? <Navigate to={redirectPath} /> : <Navigate to="/portal" />)} />
          <Route path="/login/patient/otp" element={<PatientOTPLogin />} />
          <Route path="/portal/setup" element={<PatientProfileSetup />} />
          <Route path="/splash" element={<PatientSplashScreen />} />
          <Route path="/login" element={!user ? <Navigate to="/" /> : (redirectPath ? <Navigate to={redirectPath} /> : <LandingPage />)} />
          <Route path="/*" element={
            user ? (
              <Layout user={user} profile={profile}>
                <Routes>
                  <Route path="/super-admin" element={<AdminRoute profile={profile} requiredRole="super_admin"><SuperAdminDashboard /></AdminRoute>} />
                  <Route path="/clinic-admin" element={<AdminRoute profile={profile} requiredRole="clinic_admin"><ClinicAdminDashboard profile={profile} /></AdminRoute>} />
                  <Route path="/dashboard" element={<DoctorRoute profile={profile}><DoctorDashboard profile={profile} /></DoctorRoute>} />
                  <Route path="/patients" element={<DoctorRoute profile={profile}><PatientManager profile={profile} /></DoctorRoute>} />
                  <Route path="/appointments" element={<DoctorRoute profile={profile}><AppointmentManager profile={profile} /></DoctorRoute>} />
                  <Route path="/prescriptions" element={<DoctorRoute profile={profile}><PrescriptionPad profile={profile} /></DoctorRoute>} />
                  <Route path="/inventory" element={<DoctorRoute profile={profile}><InventoryManager profile={profile} /></DoctorRoute>} />
                  <Route path="/billing" element={<DoctorRoute profile={profile}><BillingManager profile={profile} /></DoctorRoute>} />
                  <Route path="/doctors" element={<DoctorRoute profile={profile}><DoctorManager profile={profile} /></DoctorRoute>} />
                  <Route path="/ai-tools" element={<DoctorRoute profile={profile}><AITools /></DoctorRoute>} />
                  <Route path="/video" element={<DoctorRoute profile={profile}><VideoConsultation /></DoctorRoute>} />
                  <Route path="/follow-up" element={<DoctorRoute profile={profile}><FollowUpManager profile={profile} /></DoctorRoute>} />
                  <Route path="/reports" element={<DoctorRoute profile={profile}><ReportsAnalytics /></DoctorRoute>} />
                  <Route path="/complaints" element={<DoctorRoute profile={profile}><ComplaintsManager /></DoctorRoute>} />
                  <Route path="/logs" element={<DoctorRoute profile={profile}><AuditLogs profile={profile} /></DoctorRoute>} />
                  <Route path="/supabase" element={<DoctorRoute profile={profile}><SupabaseDashboard /></DoctorRoute>} />
                  <Route path="/settings" element={<DoctorRoute profile={profile}><DoctorSettings profile={profile} /></DoctorRoute>} />
                  <Route path="/portal" element={<PatientRoute profile={profile}><PatientPortal /></PatientRoute>} />
                  <Route path="*" element={profile?.role === 'doctor' ? <Navigate to="/dashboard" /> : (profile?.role === 'patient' ? <Navigate to="/portal" /> : <Navigate to="/" />)} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/" />
            )
          } />
        </Routes>
      </div>
    </Router>
  );
}

function Layout({ children, user, profile }: { children: React.ReactNode, user: User, profile: GlobalUserProfile | null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isQuickBillOpen, setIsQuickBillOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsQuickBillOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setShowScrollTop(scrollTop > 400);
  };

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const allNavItems = [
    { name: 'Super Intelligence', icon: Shield, path: '/super-admin', role: 'super_admin' },
    { name: 'Management', icon: LayoutDashboard, path: '/clinic-admin', role: 'clinic_admin' },
    
    // Doctor Route Group (Consolidated 7 Categories)
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', role: 'doctor' },
    { name: 'Patients Hub', icon: Users, path: '/patients', role: 'doctor' },
    { name: 'Appointments', icon: Calendar, path: '/appointments', role: 'doctor' },
    { name: 'AI Report Analyser', icon: BrainCircuit, path: '/ai-tools', role: 'doctor' },
    { name: 'Billing & Inventory', icon: IndianRupee, path: '/billing', role: 'doctor' },
    { name: 'Clinic Management', icon: Stethoscope, path: '/doctors', role: 'doctor' },
    { name: 'Settings', icon: Settings, path: '/settings', role: 'doctor' },

    // Patient Route Group
    { name: t('portal'), icon: UserCircle, path: '/portal', role: 'patient' },
    { name: 'Find Doctors', icon: Stethoscope, path: '/portal?tab=doctors', role: 'patient' },
    { name: 'Clinic Settings', icon: Settings, path: '/settings', role: 'clinic_admin' },
  ];

  const navItems = allNavItems.filter(item => {
    if (profile?.role === 'clinic_admin') {
      return item.role === 'clinic_admin' || item.role === 'doctor';
    }
    return item.role === profile?.role;
  });

  const handleLogout = () => {
    signOut(auth);
  };

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="flex h-screen w-full bg-slate-100 overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSidebar}
            className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white flex flex-col border-r border-slate-200 transition-transform duration-300 lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex items-center justify-between border-b border-slate-100">
          <Link to={profile?.role === 'doctor' ? '/dashboard' : (profile?.role === 'patient' ? '/portal' : '/')} onClick={closeSidebar}>
            <Logo size="sm" />
          </Link>
          <button onClick={closeSidebar} className="lg:hidden text-slate-400 hover:text-slate-600 p-1">
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                location.pathname === item.path 
                  ? 'bg-brand-50 text-brand-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <item.icon size={20} className={location.pathname === item.path ? 'text-brand-700' : 'text-slate-400'} />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-center">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex flex-col items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm ring-4 ring-brand-50 overflow-hidden">
                {profile?.photoURL ? (
                  <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  profile?.name?.substring(0, 2).toUpperCase() || 'DR'
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {profile?.role === 'doctor' ? `Dr. ${profile?.name || 'Doctor'}` : profile?.name || 'Patient'}
                </p>
                <p className="text-[9px] font-bold text-brand-500 uppercase tracking-widest mt-1">
                  {profile?.role === 'doctor' ? 'Clinical Expert' : 'Wellness Member'}
                </p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 px-3 bg-slate-900 text-white rounded-xl text-[10px] font-bold hover:bg-slate-800 transition-all uppercase tracking-widest active:scale-95 shadow-lg shadow-slate-200"
            >
              <LogOut size={14} /> {t('logout')}
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden relative">
        {/* Desktop Header */}
        <header className="hidden lg:flex h-20 bg-white border-b border-slate-200 px-8 items-center justify-between z-30 sticky top-0 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Peace be with you, {profile?.name?.split(' ')[0]}</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 leading-none">
              {profile?.role === 'doctor' ? 'Healing Sanctuary • Clinical Excellence' : 'Wellness Journey • Holistic Recovery'}
            </p>
          </div>
          <div className="flex items-center gap-6">
            {profile?.role === 'doctor' && (
              <button 
                onClick={() => setIsQuickBillOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all active:scale-95 duration-200 border border-emerald-500/10"
                title="Global Shortcut: Ctrl + B"
              >
                <CreditCard size={14} className="animate-pulse" />
                ⚡ Quick Bill
              </button>
            )}

            {/* Language Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              {[
                { code: 'en', label: 'EN' },
                { code: 'hi', label: 'हिंदी' },
                { code: 'mr', label: 'मराठी' },
                { code: 'bn', label: 'বাংলা' },
                { code: 'te', label: 'తెలుగు' }
              ].map((lang) => (
                <button 
                  key={lang.code}
                  onClick={() => setLanguage(lang.code as any)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all tap-target ${language === lang.code ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            <button 
              className="relative p-2 text-slate-400 hover:text-brand-600 transition-colors tap-target"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell size={22} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-brand-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="w-px h-8 bg-slate-100"></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Presence</p>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="lg:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-40 sticky top-0 shadow-sm shrink-0 pt-safe">
          <Link to={profile?.role === 'doctor' ? '/dashboard' : (profile?.role === 'patient' ? '/portal' : '/')}>
            <Logo size="sm" showTagline={false} />
          </Link>
          <div className="flex items-center gap-2">
            {profile?.role === 'doctor' && (
              <button 
                onClick={() => setIsQuickBillOpen(true)}
                className="px-2 py-1.5 bg-emerald-600 text-white rounded-lg text-[9px] font-bold uppercase flex items-center gap-1 active:scale-95 transition-all"
              >
                <CreditCard size={10} className="animate-pulse" />
                Quick Bill
              </button>
            )}
             <button 
              onClick={() => {
                const langs: any[] = ['en', 'hi', 'mr', 'bn', 'te'];
                const currentIndex = langs.indexOf(language);
                const nextIndex = (currentIndex + 1) % langs.length;
                setLanguage(langs[nextIndex]);
              }}
              className="px-3 py-2 bg-slate-100 rounded-xl text-[10px] font-black text-slate-600 uppercase tap-target"
             >
                {language === 'en' ? 'EN' : language.toUpperCase()}
             </button>
             <button className="p-2 text-slate-400 tap-target">
               <Bell size={20} />
             </button>
             <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-3 bg-brand-50 text-brand-600 rounded-xl active:scale-95 transition-transform tap-target"
             >
                <Menu size={24} />
             </button>
          </div>
        </header>

        {/* Content Wrapper */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 bg-slate-50 relative pb-32 lg:pb-10 custom-scrollbar touch-scroll"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto h-full flex flex-col"
            >
              <div className="lg:hidden mb-6">
                <h2 className="text-2xl font-bold text-slate-900 leading-tight">
                  {navItems.find(i => i.path === location.pathname)?.name || 'Dashboard'}
                </h2>
                <div className="w-12 h-1 bg-brand-600 rounded-full mt-2"></div>
              </div>
              {children}
            </motion.div>
          </AnimatePresence>

          {/* Scroll To Top Button */}
          <AnimatePresence>
            {showScrollTop && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                onClick={scrollToTop}
                className="fixed bottom-24 lg:bottom-10 right-6 lg:right-10 w-12 h-12 bg-brand-600 text-white rounded-full shadow-xl shadow-brand-200 flex items-center justify-center z-50 hover:bg-slate-900 transition-all active:scale-90 border-4 border-white"
              >
                <ArrowUp size={24} strokeWidth={2.5} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Bottom Tab Bar */}
        {profile?.role === 'doctor' && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-200 flex items-center justify-around px-2 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] backdrop-blur-md bg-white/95 pb-safe">
            <MobileNavItem 
              to="/dashboard" 
              icon={LayoutDashboard} 
              label="Dash" 
              active={location.pathname === '/dashboard'} 
              activeColor="text-brand-600"
            />
            <MobileNavItem 
              to="/patients" 
              icon={Users} 
              label="Patients" 
              active={location.pathname === '/patients'} 
              activeColor="text-brand-600"
            />
            <div className="relative -mt-10">
              <button 
                onClick={() => navigate('/appointments')}
                className="w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-xl shadow-slate-200 border-4 border-white active:scale-90 transition-transform"
              >
                <Plus size={24} />
              </button>
            </div>
            <MobileNavItem 
              to="/appointments" 
              icon={Calendar} 
              label="Visits" 
              active={location.pathname === '/appointments'} 
              activeColor="text-brand-600"
            />
            <MobileNavItem 
              to="/settings" 
              icon={Settings} 
              label="Settings" 
              active={location.pathname === '/settings'} 
              activeColor="text-brand-600"
            />
          </div>
        )}

        {profile?.role === 'patient' && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-200 flex items-center justify-around px-2 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] backdrop-blur-md bg-white/95 pb-safe">
            <MobileNavItem 
              to="/portal" 
              icon={Home} 
              label="Home" 
              active={location.pathname === '/portal' && (!location.search.includes('tab=') || location.search.includes('tab=overview'))} 
              activeColor="text-brand-600"
            />
            <MobileNavItem 
              to="/portal?tab=prescriptions" 
              icon={FileText} 
              label="Meds" 
              active={location.search.includes('tab=prescriptions')} 
              activeColor="text-brand-600"
            />
            <div className="relative -mt-10">
              <Link 
                to="/portal?tab=doctors"
                className="w-14 h-14 bg-brand-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-brand-200 border-4 border-white active:scale-90 transition-transform"
              >
                <Plus size={24} />
              </Link>
            </div>
            <MobileNavItem 
              to="/portal?tab=appointments" 
              icon={Calendar} 
              label="Visits" 
              active={location.search.includes('tab=appointments')} 
              activeColor="text-brand-600"
            />
            <MobileNavItem 
              to="/portal?tab=profile" 
              icon={UserIcon} 
              label="Account" 
              active={location.search.includes('tab=profile')} 
              activeColor="text-brand-600"
            />
          </div>
        )}
        {profile?.role === 'doctor' && (
          <QuickBillModal 
            isOpen={isQuickBillOpen} 
            onClose={() => setIsQuickBillOpen(false)} 
            profile={profile as any} 
          />
        )}
      </div>
    </div>
  );
}

function MobileNavItem({ to, icon: Icon, label, active, activeColor }: { to: string, icon: any, label: string, active: boolean, activeColor: string }) {
  return (
    <Link 
      to={to} 
      className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[64px] transition-all ${active ? activeColor : 'text-slate-400'}`}
    >
      <Icon size={20} className={active ? 'scale-110' : ''} />
      <span className="text-[10px] font-bold uppercase tracking-tight leading-none">{label}</span>
    </Link>
  );
}
