import { Link } from 'react-router-dom';
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
  FileText
} from 'lucide-react';
import Logo from './Logo';

export default function Footer() {
  // Direct WhatsApp support link helper
  const whatsAppNumber = "919153000000"; // Clinic registered contact
  const waMessage = encodeURIComponent("Namaste Support Team, I am visiting the Kayra's Care portal and need assistance.");
  const whatsAppUrl = `https://wa.me/${whatsAppNumber}?text=${waMessage}`;

  return (
    <footer className="relative bg-slate-950 text-slate-300 border-t border-slate-900 overflow-hidden pt-16 pb-8 md:pb-12">
      {/* Decorative premium ambient glow */}
      <div className="absolute top-0 right-1/4 -translate-y-1/2 w-96 h-96 bg-brand-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 translate-y-1/2 w-80 h-80 bg-emerald-600/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Core 4-Column Responsive Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 pb-12 border-b border-slate-900 w-full">
          
          {/* Column 1: Brand Logo, Tagline, & WhatsApp Support */}
          <div className="space-y-6 flex flex-col items-start w-full flex-wrap">
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
          <div className="space-y-4 w-full flex flex-col flex-wrap">
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
          <div className="space-y-4 w-full flex flex-col flex-wrap">
            <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500 relative inline-block">
              Legal Compliance
              <span className="absolute -bottom-1 left-0 w-8 h-0.5 bg-emerald-500 rounded-full"></span>
            </h4>
            <nav className="flex flex-col space-y-3 pt-2 flex-wrap">
              <Link to="/legal/terms" className="text-xs text-slate-400 hover:text-white font-medium transition-colors flex items-center gap-2 group">
                <span className="w-1 h-1 bg-slate-800 group-hover:bg-emerald-400 rounded-full transition-colors"></span>
                Terms &amp; Conditions
              </Link>
              <Link to="/legal/privacy" className="text-xs text-slate-400 hover:text-white font-medium transition-colors flex items-center gap-2 group">
                <span className="w-1 h-1 bg-slate-800 group-hover:bg-emerald-400 rounded-full transition-colors"></span>
                Privacy Protection Policy
              </Link>
              <div className="pt-2 text-[10px] text-slate-500 leading-relaxed font-semibold">
                <p className="font-bold text-slate-400">Trademark Statement:</p>
                <p className="mt-1">
                  Kayra’s Care® and Bihar's Sanctuary Logo are registered trademarks of Kayra's Homeo Care Pvt. Ltd. All rights reserved globally.
                </p>
              </div>
            </nav>
          </div>

          {/* Column 4: Location, Contact & Badges */}
          <div className="space-y-5 w-full flex flex-col flex-wrap">
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
    </footer>
  );
}
