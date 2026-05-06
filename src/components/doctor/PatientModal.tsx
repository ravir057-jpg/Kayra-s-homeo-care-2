import { X, Brain, Plus, Info, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Patient } from '../../types';
import { useLanguage } from '../../lib/i18n';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Patient>) => Promise<void>;
  editingPatient: Patient | null;
  formData: Partial<Patient>;
  setFormData: (data: Partial<Patient>) => void;
}

export default function PatientModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  editingPatient, 
  formData, 
  setFormData 
}: PatientModalProps) {
  const { t } = useLanguage();
  const [bufferContent, setBufferContent] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const buffer = localStorage.getItem('ai_prescription_buffer');
      if (buffer) {
        setBufferContent(buffer);
      }
    }
  }, [isOpen]);

  const handleImportBuffer = () => {
    if (bufferContent) {
      setFormData({ 
        ...formData, 
        medicalHistory: formData.medicalHistory ? `${formData.medicalHistory}\n\nAI Insights:\n${bufferContent}` : `AI Insights:\n${bufferContent}` 
      });
      toast.success('AI content imported to Medical History');
      setBufferContent(null);
      localStorage.removeItem('ai_prescription_buffer');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const isDataComplete = !!(formData.name?.trim() && formData.phone?.trim() && formData.dob && formData.address?.trim());

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <motion.div 
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="p-4 lg:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-800">
                    {editingPatient ? (t('edit_patient') || 'Edit Patient') : (t('new_patient') || 'New Patient')}
                  </h2>
                  {isDataComplete && !editingPatient?.isVerified && (
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[8px] font-black uppercase tracking-widest border border-indigo-100 flex items-center gap-1"
                    >
                      <ShieldCheck size={10} /> Ready to Verify
                    </motion.div>
                  )}
                </div>
                {editingPatient?.patientId && (
                  <span className="text-[10px] font-mono text-slate-400 -mt-1 uppercase tracking-wider">
                    {editingPatient.patientId}
                  </span>
                )}
              </div>
              <button 
                onClick={onClose} 
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="p-4 lg:p-8 space-y-4 lg:space-y-6 overflow-y-auto custom-scrollbar touch-scroll">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                {/* Patient ID (Read-only) */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">
                    {t('patient_id') || 'Patient ID'}
                  </label>
                  <div className="relative group">
                    <input 
                      type="text" 
                      placeholder="e.g. KHC-123456"
                      value={formData.patientId || ''}
                      onChange={e => setFormData({ ...formData, patientId: e.target.value })}
                      className="w-full px-4 py-3 lg:py-2 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 bg-slate-50/50 font-mono text-xs font-bold text-slate-700 transition-all focus:bg-white"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-[8px] font-black uppercase tracking-tighter text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      {editingPatient ? 'Permanent ID' : 'Auto-generated'}
                    </div>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">
                    {t('full_name') || 'Full Name'}
                    <span className="w-1 h-1 bg-indigo-500 rounded-full" title="Essential for verification"></span>
                  </label>
                  <input 
                    required
                    type="text" 
                    placeholder="Enter full name"
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 lg:py-2 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 bg-slate-50/50 transition-all focus:bg-white"
                  />
                </div>

                {/* Contact (Phone) */}
                <div>
                  <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">
                    {t('phone_number') || 'Contact Number'}
                    <span className="w-1 h-1 bg-indigo-500 rounded-full" title="Essential for verification"></span>
                  </label>
                  <input 
                    required
                    type="tel" 
                    placeholder="Enter contact number"
                    value={formData.phone || ''}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 lg:py-2 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 bg-slate-50/50 transition-all focus:bg-white"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">
                    {t('email') || 'Email Address'} <span className="text-slate-400 lowercase italic">({t('optional') || 'optional'})</span>
                  </label>
                  <input 
                    type="email" 
                    placeholder="email@example.com"
                    value={formData.email || ''}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 lg:py-2 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 bg-slate-50/50 transition-all focus:bg-white"
                  />
                </div>

                {/* DOB & Gender */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">
                      {t('dob') || 'Date of Birth'}
                      <span className="w-1 h-1 bg-indigo-500 rounded-full" title="Essential for verification"></span>
                    </label>
                    <input 
                      type="date" 
                      value={formData.dob || ''}
                      onChange={e => setFormData({ ...formData, dob: e.target.value })}
                      className="w-full px-4 py-3 lg:py-2 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 bg-slate-50/50 transition-all focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">
                      {t('gender') || 'Gender'}
                    </label>
                    <select 
                      value={formData.gender || 'Male'}
                      onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                      className="w-full px-4 py-3 lg:py-2 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 bg-slate-50/50 appearance-none transition-all focus:bg-white"
                    >
                      <option value="Male">{t('male') || 'Male'}</option>
                      <option value="Female">{t('female') || 'Female'}</option>
                      <option value="Other">{t('other') || 'Other'}</option>
                    </select>
                  </div>
                </div>

                {/* Blood Group */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">
                    {t('blood_group') || 'Blood Group'}
                  </label>
                  <select 
                    value={formData.bloodGroup || ''}
                    onChange={e => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="w-full px-4 py-3 lg:py-2 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 bg-slate-50/50 appearance-none transition-all focus:bg-white"
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-50/50 p-4 lg:p-6 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 bg-red-400 rounded-full"></div>
                  <span className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">
                    {t('emergency_info') || 'Emergency Information'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">
                      {t('emergency_contact_name') || 'Emergency Contact Name'}
                    </label>
                    <input 
                      type="text" 
                      placeholder="Full name of contact"
                      value={formData.emergencyContactName || ''}
                      onChange={e => setFormData({ ...formData, emergencyContactName: e.target.value })}
                      className="w-full px-4 py-3 lg:py-2 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">
                      {t('emergency_contact_phone') || 'Emergency Contact Number'}
                    </label>
                    <input 
                      type="tel" 
                      placeholder="Contact number"
                      value={formData.emergencyContactPhone || ''}
                      onChange={e => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                      className="w-full px-4 py-3 lg:py-2 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/50 p-4 lg:p-6 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 bg-indigo-400 rounded-full"></div>
                  <span className="text-[10px] font-bold text-slate-800 uppercase tracking-widest">
                    {t('medical_background') || 'Medical Background'}
                  </span>
                </div>
                <div className="space-y-4">
                  {/* Address */}
                  <div>
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">
                      {t('address') || 'Home Address'}
                      <span className="w-1 h-1 bg-indigo-500 rounded-full" title="Essential for verification"></span>
                    </label>
                    <textarea 
                      value={formData.address || ''}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      rows={2}
                      placeholder="Street, City, State, ZIP..."
                      className="w-full px-4 py-3 lg:py-2 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 bg-white text-sm"
                    />
                  </div>
                  {/* Medical History */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {t('detailed_medical_history') || 'Medical History'}
                      </label>
                      {bufferContent && (
                        <button 
                          type="button"
                          onClick={handleImportBuffer}
                          className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100"
                        >
                          <Brain size={12} /> Import AI Insight
                        </button>
                      )}
                    </div>
                    <textarea 
                      value={formData.medicalHistory || ''}
                      onChange={e => setFormData({ ...formData, medicalHistory: e.target.value })}
                      rows={5}
                      placeholder="Chronic conditions, allergies, surgical history, family history, etc..."
                      className="w-full px-4 py-3 lg:py-2 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 bg-white text-sm leading-relaxed"
                    />
                    <p className="mt-2 text-[9px] text-slate-400 font-medium italic">
                      All health information is securely stored and encrypted.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 lg:gap-4 pt-4 pb-8 sm:pb-0">
                <button 
                  type="button"
                  onClick={onClose}
                  className="order-2 sm:order-1 px-6 py-3 sm:py-2 text-slate-500 font-bold hover:text-slate-800 bg-slate-100 sm:bg-transparent rounded-xl transition-colors"
                >
                  {t('cancel') || 'Cancel'}
                </button>
                <button 
                  type="submit"
                  className="order-1 sm:order-2 px-8 py-3 sm:py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 active:scale-[0.98] transition-all"
                >
                  {editingPatient ? (t('update_patient') || 'Update Patient') : (t('save_patient') || 'Register Patient')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
