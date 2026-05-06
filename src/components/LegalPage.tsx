import { motion } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Shield, FileText, Lock, Eye, Scale, Send, MessageSquare } from 'lucide-react';
import Logo from './Logo';
import { toast } from 'sonner';

export default function LegalPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const type = location.pathname.includes('privacy') ? 'privacy' : 'terms';

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Your message has been sent to support. We will get back to you shortly.');
    (e.target as HTMLFormElement).reset();
  };

  const content = type === 'privacy' ? {
    title: 'Privacy Policy',
    lastUpdated: 'May 2026',
    icon: Shield,
    color: 'emerald' as const,
    sections: [
      {
        title: '1. Patient Consent & NCH Compliance',
        icon: Eye,
        text: 'In accordance with NCH Telemedicine Practice Guidelines, initiating a tele-consultation implies explicit patient consent for data processing. We collect clinical history, symptoms, and vitals strictly for homeopathic repertorization and clinical care.'
      },
      {
        title: '2. Health Data Protection (ABDM)',
        icon: Scale,
        text: 'We adhere to the Ayushman Bharat Digital Mission (ABDM) standards and the IT Act 2000. Your Electronic Health Records (EHR) are encrypted and stored in a manner that ensures integrity and confidentiality.'
      },
      {
        title: '3. Data Retention & Secrecy',
        icon: Lock,
        text: 'Clinical records are maintained for a minimum of 3 years as per NCH regulations. Practitioners are bound by professional secrecy under the Homoeopathy Central Council (Professional Conduct) Regulations.'
      }
    ]
  } : {
    title: 'Terms & Conditions',
    lastUpdated: 'May 2026',
    icon: FileText,
    color: 'indigo' as const,
    sections: [
      {
        title: '1. Registered Practitioners (RMP)',
        icon: Scale,
        text: 'Only Registered Medical Practitioners (RMPs) listed in the National Register of Homoeopathy are authorized to use this platform for clinical prescriptions. Users must verify their credentials during registration.'
      },
      {
        title: '2. Tele-Consultation Scope',
        icon: Shield,
        text: 'Telemedicine is intended for non-emergency consultations. In life-threatening situations, patients are advised to seek immediate in-person clinical assistance at the nearest medical facility.'
      },
      {
        title: '3. Clinical Responsibility',
        icon: Lock,
        text: 'The RMP maintains ultimate responsibility for the diagnosis and treatment provided. AI-based repertory suggestions are supportive tools and must be validated by the practitioner\'s clinical judgment.'
      }
    ]
  };

  const themeColors = {
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
    },
    indigo: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-600',
    }
  }[content.color as 'emerald' | 'indigo'];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <nav className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-50">
        <Logo size="sm" />
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold transition-colors"
        >
          <ArrowLeft size={20} /> Back to Home
        </button>
      </nav>

      <div className="flex-1 max-w-4xl mx-auto w-full py-6 sm:py-12 px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2rem] sm:rounded-[3rem] border border-slate-200 p-6 sm:p-16 shadow-2xl shadow-slate-200/50"
        >
          <div className="flex flex-col items-center mb-10 sm:mb-12">
            <div className={`w-16 h-16 sm:w-20 sm:h-20 ${themeColors.bg} ${themeColors.text} rounded-2xl sm:rounded-[2rem] flex items-center justify-center mb-4 sm:mb-6`}>
              <content.icon size={32} className="sm:size-10" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-4 text-center">{content.title}</h1>
            <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Last Updated: {content.lastUpdated}</p>
          </div>

          <div className="space-y-10 sm:space-y-12">
            {content.sections.map((section, idx) => (
              <section key={idx} className="space-y-3 sm:space-y-4">
                <h3 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-3">
                  <div className={`p-2 ${themeColors.bg} ${themeColors.text} rounded-xl shrink-0`}>
                    <section.icon size={18} className="sm:size-5" />
                  </div>
                  {section.title}
                </h3>
                <p className="text-slate-600 leading-relaxed font-normal ml-0 sm:ml-11 text-sm sm:text-base">
                  {section.text}
                </p>
              </section>
            ))}
          </div>

          <div className="mt-16 sm:mt-20 pt-12 sm:pt-16 border-t border-slate-100">
            <div className="flex flex-col items-center mb-8 sm:mb-10">
              <div className={`p-3 ${themeColors.bg} ${themeColors.text} rounded-2xl mb-4`}>
                <MessageSquare size={24} />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight text-center">Need further clarification?</h3>
              <p className="text-sm text-slate-500 font-medium mt-2 text-center">Our legal team is here to help you understand your rights.</p>
            </div>

            <form onSubmit={handleContactSubmit} className="max-w-2xl mx-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Your Email</label>
                  <input 
                    required
                    type="email" 
                    placeholder="name@example.com"
                    className="w-full px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Topic</label>
                  <select className="w-full px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none transition-all text-sm font-medium appearance-none">
                    <option>Data Correction</option>
                    <option>Account Deletion</option>
                    <option>Policy Inquiry</option>
                    <option>Compliance Issues</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Detailed Message</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="How can we help you with your privacy or terms today?"
                  className="w-full px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 outline-none transition-all text-sm font-medium resize-none"
                ></textarea>
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-slate-900 text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 active:scale-[0.98] shadow-xl shadow-slate-200"
              >
                Send Support Inquiry <Send size={16} />
              </button>
            </form>
          </div>

          <div className="mt-20 pt-10 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              For any questions regarding our {content.title}, please contact us at <br />
              <span className="font-bold text-slate-600">support@kayrashomoeo.care</span>
            </p>
          </div>
        </motion.div>
      </div>

      <footer className="py-12 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest border-t border-slate-100 bg-white">
        © 2026 Kayra's Homoeo. Care • All Rights Reserved
      </footer>
    </div>
  );
}
