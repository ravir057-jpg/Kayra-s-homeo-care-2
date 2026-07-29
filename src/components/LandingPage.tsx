import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Stethoscope, 
  User,
  Heart,
  Leaf,
  Sparkles,
  Clock,
  Check,
  ArrowRight,
  BrainCircuit,
  FileSearch,
  UserCircle,
  Home as HomeIcon,
  MessageCircle,
  AlertTriangle,
  Upload,
  Info,
  ChevronRight,
  Phone,
  ShieldCheck,
  Menu,
  X,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import Logo from './Logo';
import SkeletalLoader from './shared/SkeletalLoader';

// Predefined Clinical Test Reports for OCR Analyzer Demonstration
const DEMO_REPORTS = [
  {
    id: 'kidney_panel',
    name: 'Kidney Profile (Creatinine High)',
    patientName: 'Karan Sharma',
    date: '2026-05-12',
    markers: [
      { name: 'Serum Creatinine', value: '2.4 mg/dL', status: 'Abnormal High', reference: '0.6 - 1.2 mg/dL', severity: 'critical' },
      { name: 'Blood Urea Nitrogen', value: '45 mg/dL', status: 'Abnormal High', reference: '7 - 20 mg/dL', severity: 'alert' },
      { name: 'eGFR', value: '38 mL/min/1.73m²', status: 'Abnormal Low', reference: '> 90 mL/min/1.73m²', severity: 'critical' }
    ],
    rubrics: 'Renal congestion, reduced filtration, urinary retention rubrics.',
    homeoSuggestions: [
      { name: 'Serum Anguillae (Eel Serum)', details: 'Highly specific for acute renal distress, albuminuria, and elevated creatinine without cardiac compensation.' },
      { name: 'Apis Mellifica', details: 'Indicated for renal dropsy, puffiness, suppressed urination, and clinical kidney inflammation symptoms.' },
      { name: 'Lycopodium Clavatum', details: 'Suited for chronic high urea/creatinine with heavy brick-dust red sand sediment in urine, flatulence, and right-sided complaints.' }
    ]
  },
  {
    id: 'thyroid_profile',
    name: 'Thyroid Panel (TSH Elevated)',
    patientName: 'Meera Deshmukh',
    date: '2026-05-18',
    markers: [
      { name: 'TSH (Thyroid Stimulating Hormone)', value: '8.7 uIU/mL', status: 'Abnormal High', reference: '0.45 - 4.5 uIU/mL', severity: 'critical' },
      { name: 'Free T3', value: '2.1 pg/mL', status: 'Abnormal Low', reference: '2.3 - 4.2 pg/mL', severity: 'alert' },
      { name: 'Free T4', value: '0.7 ng/dL', status: 'Abnormal Low', reference: '0.8 - 1.8 ng/dL', severity: 'alert' }
    ],
    rubrics: 'Glandular hypofunction, sluggish metabolism, dynamic weight gain rubrics.',
    homeoSuggestions: [
      { name: 'Thyroidinum', details: 'A powerful organopathic remedy for hypothyroid states, muscular weakness, cold sensitivity, and metabolic sluggishness.' },
      { name: 'Calcarea Carbonica', details: 'Indicated for sluggish patient constitution of a fair, fatty, flabby nature, cold clammy extremities, and chronic fatigue.' },
      { name: 'Sepia Officinalis', details: 'Outstanding remedy for metabolic lethargy, emotional indifference, hormonal imbalances, and pelvic congestion.' }
    ]
  },
  {
    id: 'allergy_panel',
    name: 'Allergy Panel (IgE Elevated)',
    patientName: 'Aditya Patil',
    date: '2026-05-24',
    markers: [
      { name: 'Total Serum IgE', value: '480 IU/mL', status: 'Abnormal High', reference: '< 100 IU/mL', severity: 'critical' },
      { name: 'Eosinophils Absolute', value: '750 cells/mcL', status: 'Abnormal High', reference: '30 - 350 cells/mcL', severity: 'critical' },
      { name: 'Hemoglobin', value: '14.2 g/dL', status: 'Normal', reference: '13.0 - 17.0 g/dL', severity: 'normal' }
    ],
    rubrics: 'Acarid/pollen hypersensitivity, allergic rhinitis, cutaneous eruption rubrics.',
    homeoSuggestions: [
      { name: 'Histaminum Hydrochloricum', details: 'Acts as an immediate constitutional shield against acute histamine releases, hives, and respiratory allergies.' },
      { name: 'Arsenicum Album', details: 'Suited for thin mucosal discharge, burning eyes and throat relieved by hot drinks, combined with marked anxiety and restlessness.' },
      { name: 'Sabadilla', details: 'Highly useful for explosive sneezing cascades, coryza, lachrymation in open air, and allergic hypersensitivities.' }
    ]
  }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'home' | 'analyser' | 'consult'>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [time, setTime] = useState('');
  
  // Custom states for Legal Modals
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | 'disclaimer' | null>(null);

  // File Upload states for Report Analyser
  const [isDragging, setIsDragging] = useState(false);
  const [analyzingFile, setAnalyzingFile] = useState(false);
  const [analyzedReport, setAnalyzedReport] = useState<any>(null);
  const [selectedDemoId, setSelectedDemoId] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Consultation Submission Forms states
  const [leadForm, setLeadForm] = useState({
    name: '',
    phone: '',
    message: '',
    consent: false
  });
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Simple clock effect
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle Drag Events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      triggerFileAnalysis(files[0].name);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      triggerFileAnalysis(files[0].name);
    }
  };

  const triggerFileAnalysis = (fileName: string) => {
    setAnalyzingFile(true);
    setAnalyzedReport(null);
    setSelectedDemoId('');
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 15;
      });
    }, 250);

    // Trigger elegant simulation representing OCR calculation
    setTimeout(() => {
      clearInterval(interval);
      setUploadProgress(100);
      setAnalyzingFile(false);
      // Fallback response: dynamically formulate a realistic diagnostic result based on file keywords
      const upperName = fileName.toUpperCase();
      let matchedReport = DEMO_REPORTS[0]; // default Kidney
      if (upperName.includes('ALLERGY') || upperName.includes('IGE') || upperName.includes('BLOOD')) {
        matchedReport = DEMO_REPORTS[2];
      } else if (upperName.includes('THYROID') || upperName.includes('TSH')) {
        matchedReport = DEMO_REPORTS[1];
      }

      setAnalyzedReport({
        ...matchedReport,
        name: `Extracted: ${fileName}`,
        patientName: 'Uploaded Document Record'
      });
      toast.success('Medical report analyzed seamlessly using OCR simulation.');
    }, 2200);
  };

  const handleSelectDemo = (reportId: string) => {
    if (!reportId) return;
    setSelectedDemoId(reportId);
    setAnalyzingFile(true);
    setAnalyzedReport(null);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 25;
      });
    }, 150);
    
    setTimeout(() => {
      clearInterval(interval);
      setUploadProgress(100);
      setAnalyzingFile(false);
      const selected = DEMO_REPORTS.find(r => r.id === reportId);
      setAnalyzedReport(selected);
      toast.success(`Loaded clinical summary for: ${selected?.name}`);
    }, 1200);
  };

  // WhatsApp helper
  const handleWhatsAppChat = () => {
    const text = encodeURIComponent("Hello Kayra's Homeo Care, I would like to book a clinical consultation.");
    window.open(`https://wa.me/919153000000?text=${text}`, '_blank');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.consent) {
      toast.error('Clinical practice guidelines require your explicit Telemedicine consent to register inquiry.');
      return;
    }
    
    // Simulating Formspree submission or routing dynamically based on state
    setFormSubmitted(true);
    toast.success('Inquiry processed successfully. Lead routed through Kayra’s lead collection gateway!');
  };

  return (
    <div className="min-h-screen bg-[#fcfdfe] relative flex flex-col font-sans antialiased text-slate-800 overflow-x-hidden">
      
      {/* Absolute Soft Clinical Radial Glowing mists like the screenshot */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#f8fcf9] via-white to-[#f4fbf7] pointer-events-none" />
      <div className="absolute top-[10%] left-[10%] w-[320px] sm:w-[600px] h-[320px] sm:h-[600px] bg-emerald-500/5 rounded-full blur-[100px] sm:blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[280px] sm:w-[500px] h-[280px] sm:h-[500px] bg-teal-500/5 rounded-full blur-[80px] sm:blur-[130px] pointer-events-none" />
      
      {/* Persistent Responsive Header */}
      <header className="sticky top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-4 sm:px-8 py-4 z-40 shadow-xs shrink-0">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
          
          {/* Logo on Left */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('home')}>
            <Logo size="md" showTagline={true} theme="dark" />
          </div>
          
          {/* Nav options on Right */}
          <div className="flex items-center gap-3">
            
            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-6 mr-6 text-xs font-bold uppercase tracking-widest text-slate-500">
              <button 
                onClick={() => setActiveTab('home')} 
                className={`hover:text-[#009663] transition-colors cursor-pointer ${activeTab === 'home' ? 'text-[#009663] font-black' : ''}`}
              >
                Home
              </button>
              <button 
                onClick={() => setActiveTab('analyser')} 
                className={`hover:text-[#009663] transition-colors cursor-pointer ${activeTab === 'analyser' ? 'text-[#009663] font-black' : ''}`}
              >
                AI Analyser
              </button>
              <button 
                onClick={() => setActiveTab('consult')} 
                className={`hover:text-[#009663] transition-colors cursor-pointer ${activeTab === 'consult' ? 'text-[#009663] font-black' : ''}`}
              >
                Contact Clinic
              </button>
              <button 
                onClick={() => navigate('/login/doctor')} 
                className="hover:text-[#009663] transition-colors cursor-pointer"
              >
                Doctor Portal
              </button>
            </div>

            {/* Verification Status Pill */}
            <div className="flex items-center px-3 py-1.5 rounded-full bg-[#eefcf7] border border-emerald-100 text-[#009663] text-[9px] font-extrabold tracking-wider uppercase shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#009663] mr-1.5 animate-pulse" />
              RMP Active
            </div>

            {/* Main menu toggle */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              className="p-2 text-slate-600 hover:text-slate-900 active:scale-95 transition-transform rounded-lg border border-slate-200 bg-white shadow-xs cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Floating Menu Popover */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden md:absolute md:inset-auto md:top-20 md:right-8">
            {/* Backdrop on mobile */}
            <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-xs md:hidden" onClick={() => setIsMenuOpen(false)} />
            
            <motion.div 
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="absolute top-16 right-4 left-4 md:left-auto md:w-80 bg-white rounded-3xl border border-slate-200/90 shadow-2xl z-50 p-5 font-sans"
            >
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Portal Options</span>
                <button onClick={() => setIsMenuOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <button 
                  onClick={() => { setActiveTab('home'); setIsMenuOpen(false); }} 
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${activeTab === 'home' ? 'bg-[#eefcf7] text-[#009663]' : 'hover:bg-slate-50 text-slate-600'}`}
                >
                  <span className="flex items-center gap-2.5"><HomeIcon size={16} /> Dashboard Home</span>
                  <ChevronRight size={14} />
                </button>
                <button 
                  onClick={() => { setActiveTab('analyser'); setIsMenuOpen(false); }} 
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${activeTab === 'analyser' ? 'bg-[#eefcf7] text-[#009663]' : 'hover:bg-slate-50 text-slate-600'}`}
                >
                  <span className="flex items-center gap-2.5"><BrainCircuit size={16} /> AI Report Analyser</span>
                  <ChevronRight size={14} />
                </button>
                <button 
                  onClick={() => { setActiveTab('consult'); setIsMenuOpen(false); }} 
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${activeTab === 'consult' ? 'bg-[#eefcf7] text-[#009663]' : 'hover:bg-slate-50 text-slate-600'}`}
                >
                  <span className="flex items-center gap-2.5"><Stethoscope size={16} /> Telehealth Consultation</span>
                  <ChevronRight size={14} />
                </button>
                <div className="h-[1px] bg-slate-100 my-2" />
                <button 
                  onClick={() => { navigate('/login/doctor'); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 p-3 text-xs font-extrabold text-slate-750 hover:bg-slate-50 rounded-xl text-left cursor-pointer transition-all"
                >
                  <User size={16} className="text-slate-500" /> Practitioner Access Login
                </button>
                <button 
                  onClick={() => { navigate('/login/patient'); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 p-3 text-xs font-extrabold text-slate-750 hover:bg-slate-50 rounded-xl text-left cursor-pointer transition-all"
                >
                  <UserCircle size={16} className="text-[#009663]" /> Patient Record Login
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Scrollable Middle Canvas */}
      <main className="flex-1 w-full relative z-10 pb-20">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: HOME (Redesigned with pixel perfect alignment to user screenshot) */}
          {activeTab === 'home' && (
            <motion.div
              key="home-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center justify-center py-10 sm:py-20 md:py-28 max-w-4xl mx-auto px-5 text-center space-y-6 sm:space-y-8"
            >
              
              {/* Natural Healing Capsule Badge */}
              <div className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full bg-[#eefcf7] border border-emerald-100/50 text-[#009663] text-[9px] sm:text-xs font-bold uppercase tracking-[0.08em] sm:tracking-[0.12em] animate-pulse-subtle">
                <Leaf size={14} className="text-[#009663] shrink-0" />
                <span>Natural Healing • Precision Homeopathy • HIPAA Secure</span>
              </div>

              {/* Title Section */}
              <div className="space-y-2 font-heading">
                <h2 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-[#0e1220] tracking-tight leading-[1.1]">
                  Digital Sanctuary for
                </h2>
                <h3 className="text-4.5xl sm:text-6xl md:text-7xl font-extrabold text-[#00a36c] tracking-tight leading-[1.1] pt-1">
                  Holistic Recovery
                </h3>
              </div>

              {/* Emotive Subtitle Description */}
              <p className="text-sm sm:text-base md:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed font-semibold">
                Welcome to Kayra's Homoeo. Care – where legacy homeopathic wisdom meets advanced AI diagnostics. Experience a clinical ecosystem designed for your total well-being.
              </p>

              {/* Vertical Stack of Action Buttons directly mimicking screenshot spacing */}
              <div className="flex flex-col w-full max-w-sm sm:max-w-md mx-auto pt-6 sm:pt-8 gap-4">
                
                {/* 1. DOCTOR REGISTRATION BUTTON -> SOLID VIBRANT GREEN */}
                <button 
                  onClick={() => navigate('/register-clinic')}
                  className="w-full h-14 bg-[#009663] hover:bg-[#008054] text-white hover:shadow-lg hover:shadow-emerald-600/15 inline-flex items-center justify-center gap-2 px-8 rounded-full font-black uppercase tracking-widest text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  <span>Doctor Registration</span>
                  <ArrowRight size={16} />
                </button>

                {/* 2. BOOK APPOINTMENT BUTTON -> WHITE BACKGROUND, THIN GRAY BORDER WITH GREEN USER LOGO */}
                <button 
                  onClick={() => navigate('/book-appointment')}
                  className="w-full h-14 bg-white border border-slate-200 hover:border-slate-300 text-slate-800 hover:bg-slate-50 inline-flex items-center justify-center gap-2 px-8 rounded-full font-black uppercase tracking-widest text-xs sm:text-sm shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                >
                  <span className="flex-1 text-center">Book Appointment</span>
                  <div className="w-5 h-5 rounded-full bg-[#eefcf7] border border-emerald-100 flex items-center justify-center text-[#009663] shrink-0">
                    <User size={11} className="stroke-[3]" />
                  </div>
                </button>

                {/* 3. START PRACTICE BUTTON -> SOLID COBALT / VERY DARK NAVY */}
                <button 
                  onClick={() => navigate('/login/doctor')}
                  className="w-full h-14 bg-[#0b101d] hover:bg-slate-900 text-white hover:shadow-lg inline-flex items-center justify-center gap-2 px-8 rounded-full font-black uppercase tracking-widest text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  <span>Start Practice</span>
                  <ArrowRight size={16} />
                </button>

                {/* Reschedule Underlying Link */}
                <div className="pt-2">
                  <button 
                    onClick={() => navigate('/login/patient')}
                    className="text-[10px] sm:text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest underline underline-offset-4 decoration-slate-300 decoration-1 hover:decoration-slate-500 transition-all cursor-pointer"
                  >
                    Manage/Reschedule Existing Appointment
                  </button>
                </div>
              </div>

              {/* Secondary widgets displayed elegantly below the primary hero space */}
              <div className="w-full border-t border-slate-100 pt-12 sm:pt-16 mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                
                {/* Helpline section */}
                <div className="p-5 bg-[#eefcf7]/60 border border-emerald-100/40 rounded-3xl flex flex-col justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#009663]/10 border border-[#009663]/20 flex items-center justify-center text-[#009663] shrink-0">
                      <Phone size={18} className="animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Direct WhatsApp Helpline</h3>
                      <p className="text-[11px] text-slate-500 font-semibold leading-normal mt-0.5">Need immediate coordinator assistance? Connect directly to patient support.</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleWhatsAppChat}
                    className="w-full flex items-center justify-center gap-1.5 py-3 px-4 bg-[#009663] hover:bg-[#008054] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <MessageCircle size={14} /> Start Consultation Chat
                  </button>
                </div>

                {/* Patient Portal Link Card */}
                <div className="p-5 bg-white border border-slate-200/60 rounded-3xl flex flex-col justify-between gap-4 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100">
                      <UserCircle size={22} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Patient Record Vault</h4>
                      <p className="text-[11px] text-slate-400 font-semibold">Access report findings, digital prescriptions & KHC-ID code with high privacy.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate('/login/patient')}
                    className="w-full py-3 bg-[#0b101d] hover:bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform"
                  >
                    Access Patient Portal
                  </button>
                </div>

                {/* Full-width legal compliance block */}
                <div className="md:col-span-2 bg-[#0b101d] text-white rounded-3xl p-6 space-y-2 relative overflow-hidden">
                  <h3 className="text-[10px] font-black text-[#00a36c] uppercase tracking-widest flex items-center gap-1.5 leading-none">
                    <ShieldCheck size={13} /> Legal Compliance & Practice Advisory Notice
                  </h3>
                  <p className="text-[11px] text-slate-350 leading-relaxed font-semibold">
                    Kayra’s Homeo Care operates under the National Commission for Homoeopathy (NCH) Telemedicine practice guidelines. Every digital prescription and wellness repertorization is formulated strictly by a licensed Registered Medical Practitioner (RMP). Patient consents are collected securely with hashed EHR protocols.
                  </p>
                </div>
              </div>

              {/* Small Legal Links Footer */}
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-6 border-t border-slate-150 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <button onClick={() => setLegalModalType('privacy')} className="hover:text-slate-600 transition-colors cursor-pointer">Privacy & Consent</button>
                <span>•</span>
                <button onClick={() => setLegalModalType('terms')} className="hover:text-slate-600 transition-colors cursor-pointer">Terms of Practice</button>
                <span>•</span>
                <button onClick={() => setLegalModalType('disclaimer')} className="hover:text-slate-600 transition-colors cursor-pointer">Clinical Disclaimer</button>
              </div>

            </motion.div>
          )}

          {/* TAB 2: REPORT ANALYSER (upgraded to elegant full screen card width layouts) */}
          {activeTab === 'analyser' && (
            <motion.div
              key="analyser-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="max-w-4xl mx-auto px-5 py-6 sm:py-14 space-y-6"
            >
              {/* Header Title segment */}
              <div className="space-y-1.5 text-center md:text-left">
                <span className="text-[10px] font-black text-[#009663] uppercase tracking-widest">Advanced Technology</span>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  AI Diagnostic Report Analyser
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 max-w-2xl font-bold leading-normal">
                  Drop a pathology document (blood, kidney panels, or thyroid panels) below or select from standard presets to witness instant OCR extraction and Materia Medica homeopathic alignment guides.
                </p>
              </div>

              {/* Sample Document Section & Drag Upload Area */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                
                {/* Left panel Selection list */}
                <div className="md:col-span-2 space-y-3 bg-white p-5 rounded-3xl border border-slate-200">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Choose Demo Sample Case</span>
                  <div className="flex flex-col gap-2">
                    {DEMO_REPORTS.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleSelectDemo(r.id)}
                        className={`w-full p-3.5 rounded-2xl text-left transition-all ${selectedDemoId === r.id ? 'bg-[#eefcf7] border-2 border-[#009663] text-[#009663]' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-2 border-transparent'}`}
                      >
                        <h4 className="text-xs font-extrabold pb-0.5 leading-tight">{r.name}</h4>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Patient: {r.patientName}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right panel Drag Upload area */}
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`md:col-span-3 border-2 border-dashed rounded-3xl p-8 text-center flex flex-col justify-center items-center transition-all relative min-h-[220px] ${isDragging ? 'bg-emerald-50/50 border-[#009663] scale-[0.99]' : 'bg-white hover:bg-slate-50 border-slate-200'}`}
                >
                  <input 
                    type="file" 
                    id="doc-upload" 
                    accept="image/*,.pdf" 
                    onChange={handleFileSelect} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 animate-pulse"
                  />
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#eefcf7] border border-emerald-100 flex items-center justify-center text-[#009663]">
                      <Upload size={22} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">Upload Lab Document</h4>
                      <p className="text-[10px] sm:text-xs text-slate-400 font-bold leading-normal">
                        Drag & Drop or Tap to browse blood tests, urinalysis, or radiology PDFs
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Simulation loading spinner info */}
              {analyzingFile && (
                <div className="space-y-4">
                  <SkeletalLoader 
                    variant="progress" 
                    progressVal={uploadProgress} 
                    label="Gemini Vision OCR Extraction In Progress..." 
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <SkeletalLoader variant="card" className="opacity-60" />
                    <SkeletalLoader variant="card" className="opacity-40" />
                    <SkeletalLoader variant="card" className="opacity-20" />
                  </div>
                </div>
              )}

              {/* Extraction outcomes display */}
              {analyzedReport && !analyzingFile && (
                <motion.div 
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-5 bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm"
                >
                  {/* Metadata display */}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-4">
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest leading-tight">{analyzedReport.name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Assigned Patient Name: {analyzedReport.patientName}</p>
                    </div>
                    <span className="self-start sm:self-auto text-[9px] font-black text-indigo-700 bg-indigo-50 border border-indigo-150 uppercase tracking-widest px-2.5 py-1 rounded-lg">
                      Extraction Date: {analyzedReport.date}
                    </span>
                  </div>

                  {/* Visual Markers grids */}
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Extracted Biological Indicators</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {analyzedReport.markers.map((m: any, idx: number) => {
                        const isAbnormal = m.status.includes('Abnormal');
                        return (
                          <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between gap-2">
                            <div>
                              <p className="text-xs font-extrabold text-slate-700 leading-tight">{m.name}</p>
                              <p className="text-[9px] text-slate-400 font-bold mt-1">Normal Range: {m.reference}</p>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs font-black text-slate-900 leading-none">{m.value}</span>
                              <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                isAbnormal ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              }`}>
                                {m.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Rubric formulation banner */}
                  <div className="p-4 bg-[#eefcf7] border border-emerald-150/40 rounded-2xl space-y-1">
                    <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 leading-none">
                      <BrainCircuit size={13} /> Repertorization Rubric Mappings
                    </h4>
                    <p className="text-xs text-emerald-950 font-bold leading-relaxed">
                      {analyzedReport.rubrics}
                    </p>
                  </div>

                  {/* Suggested organic remedies list */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Suggested Organic Constitutional Remedies</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {analyzedReport.homeoSuggestions.map((hs: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-2xl border border-slate-150 bg-slate-50/20 flex flex-col gap-1.5">
                          <h5 className="text-xs font-extrabold text-emerald-700">{hs.name}</h5>
                          <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">{hs.details}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Telemedicine constraints warn box */}
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-2.5">
                    <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] sm:text-xs text-amber-900 leading-relaxed font-semibold">
                      <strong>Clinical Practice Limitation:</strong> Highly specific homeopathic repertorizations are based under direct holistic symptoms verification. These automated diagnostic overlays serve exclusively for physical education benchmarks and does NOT replace licensed counseling checks.
                    </p>
                  </div>

                </motion.div>
              )}

              {/* General compliant layout protection footnotes */}
              <div className="p-4 bg-slate-50 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                All patient uploads are strictly hashed and processed within secure endpoints in complete compliance under ABDM & HIPAA frameworks.
              </div>

            </motion.div>
          )}

          {/* TAB 3: CONSULTATION LAYOUT (beautiful full screen container spacing) */}
          {activeTab === 'consult' && (
            <motion.div
              key="consult-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="max-w-xl mx-auto px-5 py-6 sm:py-14 space-y-6"
            >
              <div className="space-y-1.5 text-center">
                <span className="text-[10px] font-black text-[#009663] uppercase tracking-widest">Direct Patient Intake</span>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Consultation Case Form</h2>
                <p className="text-xs sm:text-sm text-slate-500 font-bold leading-normal">
                  Dispatch your primary constitutional symptoms safely through our Lead collection database gateway or initiate direct live coordinator consulting.
                </p>
              </div>

              {formSubmitted ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-8 bg-white border border-slate-200 rounded-3xl text-center space-y-4 shadow-xl"
                >
                  <div className="w-14 h-14 rounded-full bg-[#eefcf7] text-[#009663] flex items-center justify-center mx-auto border border-emerald-100">
                    <Check size={26} className="stroke-[3]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Symptoms Dispatched</h4>
                    <p className="text-xs sm:text-sm text-slate-450 leading-relaxed font-semibold mt-2">
                      Inquiry logged successfully. Our clinical administrative desks will issue your official KHC-ID reference text to verify history.
                    </p>
                  </div>
                  <button 
                    onClick={() => { setFormSubmitted(false); setLeadForm({ name: '', phone: '', message: '', consent: false }); }}
                    className="px-5 py-2.5 bg-[#0b101d] text-white rounded-xl text-xs font-black uppercase tracking-widest"
                  >
                    Submit Another Case
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-md">
                  
                  {/* Name Input */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Your Full Name</label>
                    <input 
                      required
                      type="text" 
                      value={leadForm.name}
                      onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                      placeholder="e.g. Johnathan Doe"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-xs font-bold text-slate-800 focus:bg-white focus:border-[#009663] transition-all"
                    />
                  </div>

                  {/* Phone Input */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">WhatsApp Mobile Contacts</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-400">+91</span>
                      <input 
                        required
                        type="tel" 
                        maxLength={10}
                        value={leadForm.phone}
                        onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value.replace(/\D/g, '') })}
                        placeholder="91530 00000"
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-xs font-bold text-slate-800 focus:bg-white focus:border-[#009663] tracking-wider transition-all"
                      />
                    </div>
                  </div>

                  {/* Message Input */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Clinical Signs & Concerns</label>
                    <textarea 
                      required
                      rows={4}
                      value={leadForm.message}
                      onChange={(e) => setLeadForm({ ...leadForm, message: e.target.value })}
                      placeholder="Specify your chronic issues, symptom depth (modalities, time of aggravation), or current conventional drugs..."
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-xs font-bold text-slate-850 focus:bg-white focus:border-[#009663] resize-none leading-relaxed transition-all"
                    />
                  </div>

                  {/* Mandatory Telemedicine NCH Consent */}
                  <div className="flex items-start gap-2.5 py-3 border-t border-slate-100 mt-2">
                    <input 
                      type="checkbox"
                      id="consent-trigger"
                      checked={leadForm.consent}
                      onChange={(e) => setLeadForm({ ...leadForm, consent: e.target.checked })}
                      className="mt-0.5 rounded text-[#009663] border-slate-200 focus:ring-[#009663] cursor-pointer"
                    />
                    <label htmlFor="consent-trigger" className="text-[10px] text-slate-500 leading-normal font-bold cursor-pointer select-none">
                      I submit this consultation inquiry with my explicit patient consent to process clinical assets under active Telemedicine practice rules.
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button 
                    type="submit"
                    className="w-full py-4 bg-[#009663] hover:bg-[#008054] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Process Case Intake Profile
                  </button>

                  <div className="text-center pt-2 border-t border-slate-100 mt-2">
                    <span className="text-[8px] font-black text-slate-350 uppercase tracking-widest">Connect Immediately with Practitioner Desk</span>
                    <button 
                      type="button" 
                      onClick={handleWhatsAppChat}
                      className="w-full mt-2 flex items-center justify-center gap-1.5 border border-[#009663] text-[#009663] hover:bg-[#eefcf7] rounded-xl py-3 px-4 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                    >
                      <MessageCircle size={15} /> Send WhatsApp Request
                    </button>
                  </div>

                </form>
              )}

              {/* Disclaimer guidelines */}
              <div className="p-4 bg-[#0b101d] text-white rounded-3xl space-y-1.5">
                <h4 className="text-[9px] font-black text-[#00a36c] uppercase tracking-widest flex items-center gap-1.5">
                  <Info size={11} /> NCH Advisory Restrictions & Limits
                </h4>
                <p className="text-[10px] text-slate-300 leading-relaxed font-semibold">
                  Constitutional homeopathy maps are best evaluated face to face. Digital tele-care prescriptions serve for non-emergent general conditions. Do NOT utilize this interface for real-time acute emergency services.
                </p>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Persistent Beautiful Responsive Fluid Footer */}
      <footer className="w-full bg-[#0b101d] text-slate-450 border-t border-slate-900 py-8 px-6 mt-auto text-xs z-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Kayra’s Homeo Care</h3>
            <p className="text-[10px] text-slate-500 font-bold">© 2026 Kayra's Care. All Trademark rights reserved. Bihar's Sanctuary clinic partners.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-[10px] font-black uppercase tracking-widest text-[#00a36c]">
            <button onClick={() => setLegalModalType('privacy')} className="hover:text-emerald-400 transition-colors cursor-pointer">Privacy Policy</button>
            <button onClick={() => setLegalModalType('terms')} className="hover:text-emerald-400 transition-colors cursor-pointer">Terms & Conditions</button>
            <button onClick={() => setLegalModalType('disclaimer')} className="hover:text-emerald-400 transition-colors cursor-pointer">Clinical Disclaimer</button>
          </div>
        </div>
      </footer>

      {/* Sticky Bottom Segment Navigation Option (Elegant compact float panel for mobile views) */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md border-t border-slate-200/60 flex items-center justify-around px-2 z-40 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pt-safe">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[50px] transition-all cursor-pointer ${activeTab === 'home' ? 'text-[#009663] scale-105 font-black' : 'text-slate-400 font-bold'}`}
        >
          <HomeIcon size={18} />
          <span className="text-[9px] uppercase tracking-wider font-extrabold">Home</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('analyser')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[50px] transition-all cursor-pointer ${activeTab === 'analyser' ? 'text-[#009663] scale-105 font-black' : 'text-slate-400 font-bold'}`}
        >
          <BrainCircuit size={18} />
          <span className="text-[9px] uppercase tracking-wider font-extrabold">Analyser</span>
        </button>

        <button 
          onClick={() => setActiveTab('consult')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[50px] transition-all cursor-pointer ${activeTab === 'consult' ? 'text-[#009663] scale-105 font-black' : 'text-slate-400 font-bold'}`}
        >
          <Stethoscope size={18} />
          <span className="text-[9px] uppercase tracking-wider font-extrabold">Consult</span>
        </button>
      </nav>

      {/* FLOATING ACTION CHAT DESIGN PERSISTENT OVERLAY with Pink dot notification badge */}
      <button 
        onClick={handleWhatsAppChat}
        className="fixed bottom-20 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-[#009663] text-white rounded-full flex items-center justify-center shadow-xl hover:bg-[#008054] active:scale-95 transition-all z-40 hover:scale-105 tooltip floating-chat-icon"
        aria-label="Contact patient support on WhatsApp"
      >
        <div className="relative">
          <MessageCircle size={26} className="text-white fill-white/10" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
        </div>
      </button>

      {/* RENDER DYNAMIC LEGAL MODALS */}
      <AnimatePresence>
        {legalModalType && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLegalModalType(null)}
              className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm"
            />
            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200 font-sans"
            >
              <div className="h-2 w-full bg-[#009663]" />
              <button 
                onClick={() => setLegalModalType(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 p-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-black uppercase cursor-pointer"
              >
                Close
              </button>
              
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <div className="p-2 rounded-xl bg-[#eefcf7] text-[#009663]">
                    {legalModalType === 'privacy' && <ShieldCheck size={20} />}
                    {legalModalType === 'terms' && <FileSearch size={20} />}
                    {legalModalType === 'disclaimer' && <AlertTriangle size={20} />}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 uppercase">
                      {legalModalType === 'privacy' && 'Privacy & Consent'}
                      {legalModalType === 'terms' && 'Terms of Practice'}
                      {legalModalType === 'disclaimer' && 'Clinical Disclaimer'}
                    </h3>
                    <p className="text-[9px] text-slate-430 font-bold uppercase tracking-widest">Official Clinic Notice</p>
                  </div>
                </div>

                <div className="max-h-[250px] overflow-y-auto pr-1 text-slate-600 text-xs leading-relaxed space-y-3 font-semibold text-justify">
                  {legalModalType === 'privacy' && (
                    <>
                      <p>At Kayra’s Homeo Care, we protect health records according to strict HIPAA and ABDM standards.</p>
                      <p><strong>1. Clinical History Consent:</strong> Booking a telehealth session implies explicit consent to process vitals and symptoms for repertorization guides.</p>
                      <p><strong>2. EHR Safety:</strong> Patient dossiers are completely encrypted and restricted from third-party advertising or public profiling networks.</p>
                    </>
                  )}
                  {legalModalType === 'terms' && (
                    <>
                      <p>Only Registered Medical Practitioners (RMPs) with valid licenses listed in the National Register of Homoeopathy process virtual cases.</p>
                      <p><strong>3. Scope of Consultation:</strong> Telemedicine serves as an efficient support portal for chronic constitutions but does NOT manage acute life-threatening emergencies.</p>
                      <p><strong>4. Practitioner Accountability:</strong> Treating physicians retain complete clinical responsibility for final prescriptions.</p>
                    </>
                  )}
                  {legalModalType === 'disclaimer' && (
                    <>
                      <p><strong>Important Health Warning:</strong> All materials, metrics, or suggestions displayed on the Report Analyser are automatic supportive educational reference mappings.</p>
                      <p>They do NOT translate directly into official medical diagnoses, drug lists, or therapeutic interventions. Always seek direct validation with a qualified practitioner before consumption.</p>
                    </>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-3 flex justify-end">
                  <button 
                    onClick={() => setLegalModalType(null)}
                    className="px-4 py-2 bg-[#0b101d] text-white rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer"
                  >
                    Acknowledged
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
