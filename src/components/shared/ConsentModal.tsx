import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  FileText, 
  X, 
  Check, 
  Lock, 
  Info, 
  HeartHandshake
} from 'lucide-react';

interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  actionLabel?: string;
  title?: string;
}

export default function ConsentModal({ 
  isOpen, 
  onClose, 
  onAccept, 
  actionLabel = "Proceed to Consultation", 
  title = "Clinical Consent & Disclaimers" 
}: ConsentModalProps) {
  const [agreed, setAgreed] = useState(false);

  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Reset agreement state on open
  useEffect(() => {
    if (isOpen) {
      setAgreed(false);
    }
  }, [isOpen]);

  const handleProceed = () => {
    if (agreed) {
      onAccept();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            id="consent-modal-overlay"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-slate-100 max-h-[90vh]"
            id="consent-modal"
          >
            {/* Top Indicator Accent */}
            <div className="h-2 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 shrink-0" />

            {/* Header */}
            <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100/60 shadow-sm shrink-0">
                  <ShieldCheck size={24} className="animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight leading-tight">
                    {title}
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Kayra’s Homeo Care • Legal Compliance
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-600 active:scale-90 shrink-0"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Contents Box */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 scrollbar-thin scrollbar-thumb-slate-200">
              
              {/* Introduction Notification */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex gap-3 text-left">
                <Info size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-xs text-slate-500 leading-normal font-medium">
                  To ensure adherence to the <span className="font-bold text-slate-700">National Commission for Homoeopathy (NCH)</span> and standard telemedicine practices, all telehealth sessions, diagnosis recommendations, and clinical analysis require explicit registration of patient consent.
                </p>
              </div>

              {/* SECTION 1: MEDICAL DISCLAIMER */}
              <div className="space-y-4 text-left">
                <div className="flex items-center gap-2.5 text-slate-800 border-b border-slate-100 pb-2">
                  <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base uppercase tracking-wider">
                    Medical Disclaimer &amp; Liability
                  </h3>
                </div>
                
                <div className="space-y-4 pl-1">
                  <div className="flex gap-2">
                    <span className="text-xs font-black text-emerald-600 mt-0.5">1.</span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong className="text-slate-800 block">Informational Purposes Only:</strong>
                      All content, information, and tools provided on the Kayra’s Homeo Care application, including but not limited to text, graphics, images, and the Report Analyser (AI/Digital Test Report Analyzer), are for informational and educational purposes only.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <span className="text-xs font-black text-emerald-600 mt-0.5">2.</span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong className="text-slate-800 block">No Medical Advice:</strong>
                      The outputs generated by the Report Analyser or any other automated feature do not constitute medical advice, formal diagnosis, or a binding treatment plan. They are designed solely to assist users in understanding their health parameters. Always seek the advice of a qualified Homeopathic Physician or other licensed healthcare providers with any questions you may have regarding a medical condition.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <span className="text-xs font-black text-emerald-600 mt-0.5">3.</span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong className="text-slate-800 block">Not for Emergency Use:</strong>
                      Kayra’s Homeo Care IS NOT intended for medical emergencies. If you are experiencing a life-threatening medical emergency or severe acute symptoms, please immediately visit the nearest hospital or contact emergency medical services.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <span className="text-xs font-black text-emerald-600 mt-0.5">4.</span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong className="text-slate-800 block">Limitation of Liability:</strong>
                      Kayra’s Homeo Care and its owners shall not be held liable for any direct, indirect, incidental, or consequential damages resulting from the use or misuse of the information or reports provided by this application. Reliance on any information provided through the app is solely at your own risk.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 2: TELEMEDICINE PATIENT CONSENT FORM */}
              <div className="space-y-4 text-left pt-2">
                <div className="flex items-center gap-2.5 text-slate-800 border-b border-slate-100 pb-2">
                  <FileText size={18} className="text-emerald-500 shrink-0" />
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base uppercase tracking-wider">
                    Telemedicine Patient Consent
                  </h3>
                </div>

                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  By clicking "I Agree" or proceeding with the consultation on Kayra’s Homeo Care, I hereby acknowledge, understand, and agree to the following:
                </p>

                <div className="space-y-4 pl-1">
                  <div className="flex items-start gap-2">
                    <div className="p-1 bg-emerald-50 text-emerald-600 rounded-full mt-0.5 shrink-0">
                      <Check size={10} className="stroke-[4]" />
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong className="text-slate-800">Nature of Telemedicine:</strong> I understand that telemedicine involves the electronic transmission of my personal medical data, history, and test reports to a Registered Medical Practitioner (RMP) for diagnosis and treatment.
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <div className="p-1 bg-emerald-50 text-emerald-600 rounded-full mt-0.5 shrink-0">
                      <Check size={10} className="stroke-[4]" />
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong className="text-slate-800">Limitations:</strong> I am aware that an online consultation has inherent limitations compared to an in-person, physical examination, and that the doctor is relying entirely on the information and reports provided by me.
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <div className="p-1 bg-emerald-50 text-emerald-600 rounded-full mt-0.5 shrink-0">
                      <Check size={10} className="stroke-[4]" />
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong className="text-slate-800">Right to Modify:</strong> I understand that if the consulting Homeopathic Physician decides that my condition requires a physical examination or urgent conventional medical care, they have the right to direct me to an in-person clinic or hospital.
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <div className="p-1 bg-emerald-50 text-emerald-600 rounded-full mt-0.5 shrink-0">
                      <Check size={10} className="stroke-[4]" />
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong className="text-slate-800">Data Privacy &amp; ABDM Core:</strong> I consent to the collection, secure storage, and processing of my medical reports and history by Kayra’s Homeo Care for the sole purpose of my treatment, in compliance with applicable data protection laws.
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <div className="p-1 bg-emerald-50 text-emerald-600 rounded-full mt-0.5 shrink-0">
                      <Check size={10} className="stroke-[4]" />
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong className="text-slate-800 font-bold">Voluntary Participation:</strong> I confirm that my participation in this telemedicine consultation is entirely voluntary, and I am authorized to give consent for myself (or on behalf of the patient, if a minor/dependent).
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Actions Frame */}
            <div className="p-6 sm:p-8 bg-slate-50 border-t border-slate-100 flex flex-col gap-6 shrink-0 text-left">
              
              {/* Checkbox Action area */}
              <label 
                htmlFor="clinical-consent-checkbox"
                className="flex items-start gap-3.5 cursor-pointer select-none group"
              >
                <div className="relative mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    id="clinical-consent-checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                    agreed 
                      ? 'bg-emerald-600 border-emerald-600 ring-2 ring-emerald-100' 
                      : 'bg-white border-slate-350 hover:border-slate-400'
                  }`}>
                    {agreed && <Check size={12} className="text-white stroke-[4]" />}
                  </div>
                </div>
                <p className="text-xs font-semibold text-slate-500 leading-normal group-hover:text-slate-700 transition-colors">
                  I have read, understood, and agree to the <span className="text-slate-800 font-bold">Medical Disclaimer</span> and <span className="text-slate-800 font-bold">Telemedicine Patient Consent Form</span>.
                </p>
              </label>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 border border-slate-200 hover:bg-slate-100 text-slate-500 rounded-2xl font-bold tracking-wider text-xs uppercase active:scale-[0.98] transition-all text-center"
                >
                  Decline
                </button>
                <button
                  type="button"
                  disabled={!agreed}
                  onClick={handleProceed}
                  className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black tracking-widest text-xs uppercase shadow-lg shadow-emerald-600/10 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-center flex items-center justify-center gap-2"
                >
                  <HeartHandshake size={14} />
                  <span>{actionLabel}</span>
                </button>
              </div>

            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
