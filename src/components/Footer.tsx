import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageCircle, 
  MapPin, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Sparkles, 
  AlertTriangle,
  ExternalLink,
  Lock,
  FileText,
  X,
  Scale,
  Eye,
  Info,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import Logo from './Logo';

type LegalTab = 'privacy' | 'terms' | 'disclaimer';

export default function Footer() {
  const [activeTab, setActiveTab] = useState<LegalTab>('privacy');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Prevent parent scroll when modal is active
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  const openLegalModal = (tab: LegalTab) => {
    setActiveTab(tab);
    setIsModalOpen(true);
  };

  // Direct WhatsApp support link helper
  const whatsAppNumber = "919153000000"; // Clinic registered contact
  const waMessage = encodeURIComponent("Namaste Support Team, I am visiting the Kayra's Care portal and need assistance.");
  const whatsAppUrl = `https://wa.me/${whatsAppNumber}?text=${waMessage}`;

  return (
    <footer className="relative bg-slate-950 text-slate-300 border-t border-slate-900 overflow-hidden pt-16 pb-8 md:pb-12" id="site-footer">
      {/* Decorative premium ambient glow */}
      <div className="absolute top-0 right-1/4 -translate-y-1/2 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 translate-y-1/2 w-80 h-80 bg-brand-600/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Core 4-Column Responsive Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 pb-12 border-b border-slate-900 w-full">
          
          {/* Column 1: Brand Logo, Tagline, & WhatsApp Support */}
          <div className="space-y-6 flex flex-col items-start w-full flex-wrap" id="footer-branding-col">
            <Logo size="md" theme="light" />
            <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-sm mt-2">
              Bihar's leading digital sanctuary for classical, holistic homeopathy. Empowering physicians with advanced clinical automation and providing patients with direct AI-supported therapeutic coordination.
            </p>
            {/* WhatsApp Direct Integration Button */}
            <a 
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all shadow-lg hover:shadow-emerald-950/20 active:scale-95 group shrink-0"
              id="footer-whatsapp-cta"
            >
              <MessageCircle size={16} className="fill-current animate-pulse" />
              <span>Direct WhatsApp Support</span>
            </a>
          </div>

          {/* Column 2: Clinic Quick Navigation */}
          <div className="space-y-4 w-full flex flex-col flex-wrap" id="footer-quicklinks-col">
            <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500 relative inline-block">
              Quick Links
              <span className="absolute -bottom-1 left-0 w-8 h-0.5 bg-emerald-500 rounded-full"></span>
            </h4>
            <nav className="flex flex-col space-y-3 pt-2">
              <Link to="/portal" className="text-xs text-slate-400 hover:text-white font-medium transition-colors flex items-center gap-2 group">
                <span className="w-1 h-1 bg-slate-800 group-hover:bg-emerald-400 rounded-full transition-colors"></span>
                Patient Portal Home
              </Link>
              <Link to="/portal?tab=records" className="text-xs text-slate-400 hover:text-white font-medium transition-colors flex items-center gap-2 group">
                <span className="w-1 h-1 bg-slate-800 group-hover:bg-emerald-400 rounded-full transition-colors"></span>
                AI Report Analyser
              </Link>
              <Link to="/portal?tab=appointments" className="text-xs text-slate-400 hover:text-white font-medium transition-colors flex items-center gap-2 group">
                <span className="w-1 h-1 bg-slate-800 group-hover:bg-emerald-400 rounded-full transition-colors"></span>
                Patient Reschedule Hub
              </Link>
              <Link to="/portal?tab=billing" className="text-xs text-slate-400 hover:text-white font-medium transition-colors flex items-center gap-2 group">
                <span className="w-1 h-1 bg-slate-800 group-hover:bg-emerald-400 rounded-full transition-colors"></span>
                Counter Billing Portal
              </Link>
              <Link to="/login/doctor" className="text-xs text-slate-400 hover:text-white font-medium transition-colors flex items-center gap-2 group border-t border-slate-900 pt-3 mt-1">
                <span className="w-1.5 h-1.5 bg-brand-500 rounded-full"></span>
                Doctor Login Desk <ExternalLink size={10} className="opacity-50" />
              </Link>
            </nav>
          </div>

          {/* Column 3: Legal & Regulatory Framework */}
          <div className="space-y-4 w-full flex flex-col flex-wrap" id="footer-legal-col">
            <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500 relative inline-block">
              Legal Compliance
              <span className="absolute -bottom-1 left-0 w-8 h-0.5 bg-emerald-500 rounded-full"></span>
            </h4>
            <nav className="flex flex-col space-y-3 pt-2 flex-wrap">
              <button 
                onClick={() => openLegalModal('privacy')}
                className="text-xs text-slate-400 hover:text-white font-medium transition-colors flex items-center gap-2 group text-left cursor-pointer"
                id="footer-link-privacy"
              >
                <span className="w-1 h-1 bg-slate-800 group-hover:bg-emerald-400 rounded-full transition-colors"></span>
                Privacy Policy
              </button>
              <button 
                onClick={() => openLegalModal('terms')}
                className="text-xs text-slate-400 hover:text-white font-medium transition-colors flex items-center gap-2 group text-left cursor-pointer"
                id="footer-link-terms"
              >
                <span className="w-1 h-1 bg-slate-800 group-hover:bg-emerald-400 rounded-full transition-colors"></span>
                Terms of Service
              </button>
              <button 
                onClick={() => openLegalModal('disclaimer')}
                className="text-xs text-slate-400 hover:text-white font-medium transition-colors flex items-center gap-2 group text-left cursor-pointer"
                id="footer-link-disclaimer"
              >
                <span className="w-1 h-1 bg-slate-800 group-hover:bg-emerald-450 rounded-full transition-colors"></span>
                Disclaimer
              </button>

              <div className="pt-2 text-[10px] text-slate-500 leading-relaxed font-semibold">
                <p className="font-bold text-slate-400">Trademark Statement:</p>
                <p className="mt-1">
                  Kayra’s Care® and Bihar's Sanctuary Logo are registered trademarks of Kayra's Homeo Care Pvt. Ltd. All rights reserved globally.
                </p>
              </div>
            </nav>
          </div>

          {/* Column 4: Location, Contact & Badges */}
          <div className="space-y-5 w-full flex flex-col flex-wrap" id="footer-contact-col">
            <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500 relative inline-block">
              Corporate Office
              <span className="absolute -bottom-1 left-0 w-8 h-0.5 bg-emerald-500 rounded-full"></span>
            </h4>
            
            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-start gap-2.5 text-slate-400">
                <MapPin size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>Patna, Bihar, 800001, India</span>
              </div>
              <a href="tel:+919153000000" className="flex items-center gap-2.5 text-slate-400 hover:text-white transition-colors">
                <Phone size={16} className="text-emerald-500 shrink-0" />
                <span>+91 91530 00000</span>
              </a>
              <a href="mailto:support@kayrascare.in" className="flex items-center gap-2.5 text-slate-400 hover:text-white transition-colors">
                <Mail size={16} className="text-emerald-500 shrink-0" />
                <span>support@kayrascare.in</span>
              </a>
            </div>

            {/* Compliance badges */}
            <div className="pt-2 flex flex-col sm:flex-row flex-wrap gap-2 space-y-0">
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-850 px-3.5 py-1.5 rounded-xl w-fit">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Telehealth Guidelines Compliant</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-850 px-3.5 py-1.5 rounded-xl w-fit">
                <Lock size={14} className="text-emerald-500" />
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">HIPAA Protected Records</span>
              </div>
            </div>
          </div>

        </div>

        {/* Strict Emergency Disclaimer Section - Premium, light-shaded box on top of copyright */}
        <div className="mt-10 mb-8 p-6 sm:p-8 bg-slate-900/50 border border-slate-850 rounded-[2rem] relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-2 h-full bg-emerald-600 rounded-l-[2rem]" />
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="w-10 h-10 bg-slate-800 border border-slate-750 text-amber-500 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
              <AlertTriangle size={20} className="animate-pulse" />
            </div>
            <div className="space-y-1">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-200">Strict Emergency Medical Disclaimer • Legal &amp; Clinical compliance</h5>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                <strong>Disclaimer:</strong> Kayra’s Care AI modules, diagnostic report analyzers, and therapeutic suggestions are intended solely as clinical decision support tools. They do not formulate legal prescriptions, operate autonomously, or substitute professional, in-person clinical consultations. In the event of a medical emergency, acute relapse, or severe state, please immediately contact your state emergency services or visit the nearest physical hospital. Patient consent is mandatory for all digital health summaries, adhering fully to the Telemedicine Practice Guidelines of India.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom copyright and certification notes */}
        <div className="pt-6 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
            © 2026 Kayra's Care • Bihar Digital Health Sanctuary
          </p>
          <div className="flex items-center gap-3 bg-emerald-950/40 border border-emerald-900/50 px-4 py-2 rounded-full text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] select-none">
            <Sparkles size={12} className="animate-spin text-emerald-400" style={{ animationDuration: '4s' }} />
            <span>ISO 27001 Certified Vault Platform</span>
          </div>
        </div>

      </div>

      {/* IMMERSIVE UNIFIED LEGAL PAPERS POP-UP MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            {/* Backdrop with elegant micro-blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-955/80 backdrop-blur-md"
              id="unified-legal-backdrop"
            />

            {/* Modal Body container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
              className="relative w-full max-w-3xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-slate-100 max-h-[85vh] text-left"
              id="unified-legal-modal"
            >
              <div className="h-2 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 shrink-0" />
              
              {/* Header section with Clinic Identity */}
              <div className="p-6 sm:p-8 bg-slate-50 border-b border-indigo-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl shadow-sm border border-emerald-100/60 transition-transform duration-300 hover:scale-105 shrink-0">
                    <Scale size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight leading-none">
                      Legal Compliance Hub
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
                      Kayra’s Homeo Care • Verified Digital Sanctuary
                    </p>
                  </div>
                </div>

                {/* Close Button right corner */}
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="absolute sm:relative top-6 right-6 sm:top-0 sm:right-0 p-2.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-700 transition-all cursor-pointer active:scale-90 select-none shrink-0"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Dynamic Action Tabs selection */}
              <div className="px-6 sm:px-8 pt-4 pb-2 border-b border-slate-150 flex gap-2 overflow-x-auto shrink-0 bg-slate-50/20 scrollbar-none">
                <button
                  onClick={() => setActiveTab('privacy')}
                  className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                    activeTab === 'privacy' 
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/15' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <ShieldCheck size={14} />
                  <span>Privacy Policy</span>
                </button>
                <button
                  onClick={() => setActiveTab('terms')}
                  className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                    activeTab === 'terms' 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/15'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <FileText size={14} />
                  <span>Terms of Service</span>
                </button>
                <button
                  onClick={() => setActiveTab('disclaimer')}
                  className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                    activeTab === 'disclaimer' 
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-500/15'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <AlertTriangle size={14} />
                  <span>Clinical Disclaimer</span>
                </button>
              </div>

              {/* Content Scroll Basin */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
                
                {/* TAB 1: PRIVACY POLICY - Compliant with Indian DPDP Act 2023 */}
                {activeTab === 'privacy' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-5"
                  >
                    <div className="p-4 bg-emerald-50/60 border border-emerald-100/60 rounded-2xl flex gap-3 text-emerald-800">
                      <ShieldCheck size={20} className="shrink-0 mt-0.5 text-emerald-600" />
                      <p className="text-xs font-semibold leading-relaxed">
                        This Privacy Protection Policy is fully compliant with the <span className="font-bold underline">Digital Personal Data Protection (DPDP) Act of India, 2023</span>. User health records are strictly siloed, encrypted, and isolated to ensure clinical confidentiality.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-1">1. Scope of Clinical Data Handled</h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          We collect core patient information including legal naming, 10-digit WhatsApp contacts, secure medical histories, symptom log declarations, and diagnostic medical test files (e.g. hematology reports, imaging files). Uploaded clinical material parameters are handled as highly sensitive individual health information assets.
                        </p>
                      </div>

                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-1">2. Lead Capture &amp; secure WhatsApp routing</h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          Patient information forms submitted via our lead collection interfaces use encrypted <strong className="text-slate-800">Formspree API</strong> integrations. Initial telehealth registration requests are validated strictly through our isolated WhatsApp double-layer OTP gateway system. Direct practitioner notifications are distributed solely through secure clinical chat API relays.
                        </p>
                      </div>

                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-1">3. Right to Erase, Access &amp; Revoke Consent</h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          Per DPDP Act statutes, you retain supreme administrative control over your medical identity. You possess the sovereign legal right to verify registered records, request data rectifications, nominate healthcare representantes, or revoke consent entirely. Data deletion requests are completed in our Firestore backups within 15 working days.
                        </p>
                      </div>

                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-1">4. Zero Commercial Data-Sharing Pledge</h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          Kayra’s Homeo Care explicitly guarantees that under no circumstance is your personally identifiable clinical information sold, monetized, shared, or leaked to third-party marketing services, analytics agencies, or pharmaceutical companies. Clinical details remain isolated between the patient and the validated consulting homeopathic physician.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* TAB 2: TERMS OF SERVICE - Multidoctor Subscription terms included */}
                {activeTab === 'terms' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-5"
                  >
                    <div className="p-4 bg-indigo-50/60 border border-indigo-100/60 rounded-2xl flex gap-3 text-indigo-850">
                      <Lock size={20} className="shrink-0 mt-0.5 text-indigo-600" />
                      <p className="text-xs font-semibold leading-relaxed">
                        These terms establish a binding legal agreement governing telehealth operations, practitioner subscriptions, licensing verification, and patient registration criteria.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider mb-1">1. Doctor Onboarding &amp; Verification Mandates</h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          Every homeopathic physician participating on the Kayra’s Homeo Care multi-doctor infrastructure is legally required to complete strict professional onboarding verification. This includes uploading their verified <strong className="text-slate-800">Medical Council Registration Certificate</strong> and active national/state Council Registration numbers. Unverified profiles are immediately restricted from hosting digital consultations.
                        </p>
                      </div>

                      <div>
                        <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider mb-1">2. Single-Clinic to Multi-Doctor Subscription Models</h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          Our clinical platform operates under a flexible scaling model, hosting dedicated spaces for individual clinics and a multi-doctor subscription-based directory list. Subscribed doctors undergo periodic audits to ensure strict compliance with standard homeopathy regulations. Subscription payments are handled via certified payment gateways, governed by individual licensing SLAs.
                        </p>
                      </div>

                      <div>
                        <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider mb-1">3. Telehealth Guidelines compliance rules</h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          Consultations conducted across this platform are strictly subject to the Telemedicine Practice Guidelines issued under the National Commission for Homoeopathy Act. Digital prescriptions generated require electronic signatures and fully declared clinical details. Consulting doctors reserve the full clinical authority to request a physical transition if your condition is deemed inappropriate for a virtual consultation.
                        </p>
                      </div>

                      <div>
                        <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider mb-1">4. Appointment Cancellations &amp; Modifications</h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          Consultations are allocated specific scheduled windows. If a patient or practitioner requires rescheduling, they must commit requests a minimum of 4 hours prior to the scheduled slot. Refund rules for practitioner absences are settled within 7 operational business days.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* TAB 3: MEDICAL DISCLAIMER - Strict AI boundaries */}
                {activeTab === 'disclaimer' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-5"
                  >
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 text-amber-850">
                      <AlertTriangle size={20} className="shrink-0 mt-0.5 text-amber-600" />
                      <p className="text-xs font-semibold leading-relaxed">
                        Please review this clinical liability waiver carefully. Adherence to these strict therapeutic boundaries is required before using any digital medical tools.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-black text-rose-950 uppercase tracking-wider mb-1">1. Informational Purposes Only</h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          All content, material information, calculated parameters, and software tools provided on the Kayra’s Homeo Care ecosystem, including but not limited to medical summaries, charts, text representations, and the Report Analyser, are for educational and informational purposes only. No clinical warranty of absolute cure is expressed or implied.
                        </p>
                      </div>

                      <div>
                        <h4 className="text-xs font-black text-rose-950 uppercase tracking-wider mb-1">2. Standard Report Analyser AI limitation boundaries</h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          The **Report Analyser** is an AI-powered assistant designed purely as a supplementary clinical decision support tool. It extracts text parameters utilizing Google Gemini Vision technology and maps findings to standard Materia Medica guides. The automatically formulated notes and summaries and/or matching rubrics are NOT official diagnoses, binding clinical evaluations, or prescription treatments. Every output must be manually audited and validated by a licensed homeopathic physician before adopting.
                        </p>
                      </div>

                      <div>
                        <h4 className="text-xs font-black text-rose-950 uppercase tracking-wider mb-1">3. Life-Threatening Emergency Exclusion</h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          This system IS NOT structured, licensed, or capable of addressing acute clinical crises, trauma, or emergency situations. If you are experiencing a life-threatening medical emergency, respiratory relapse, acute poison ingestion, or severe physiological trauma, you must immediately contact your regional emergency response services or visit the nearest physical hospital.
                        </p>
                      </div>

                      <div>
                        <h4 className="text-xs font-black text-rose-950 uppercase tracking-wider mb-1">4. Absolute Limitation of Liability</h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          Kayra’s Homeo Care, its legal owners, developers, and practitioners bear zero direct, indirect, or consecutive liability for self-prescribing actions, therapeutic setbacks, or misinterpretations derived from rely-on actions on automated logs or diagnostic tool sheets. All users utilize this informational layout strictly at their own discretion and personal risk.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

              </div>

              {/* Bottom Quick-Action Panel */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <span>Kayra’s Safeguard Active</span>
                </div>
                
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto px-10 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer hover:shadow-lg active:scale-95 shadow-sm text-center flex items-center justify-center gap-1.5"
                >
                  <X size={14} />
                  <span>Close &amp; Back to Clinic</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </footer>
  );
}
