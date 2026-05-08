import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../lib/db';
import { logAction } from '../../lib/audit';
import { collection, addDoc, getDocs, doc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Prescription, Patient, Medication, UserProfile } from '../../types';
import { Plus, X, FileDown, Brain, ListPlus, History, MessageCircle, Search } from 'lucide-react';
import { generatePrescriptionPDF } from '../../lib/pdf';
import { getRepertoryInsights } from '../../lib/gemini';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from '../../lib/i18n';
import { useLocation } from 'react-router-dom';

interface PrescriptionPadProps {
  profile: UserProfile | null;
}

export default function PrescriptionPad({ profile }: PrescriptionPadProps) {
  const { t } = useLanguage();
  const location = useLocation();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(location.state?.patientId || '');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [suggestedMeds, setSuggestedMeds] = useState<string[]>([]);
  const [activeMedIndex, setActiveMedIndex] = useState<number | null>(null);
  
  const [diagnosis, setDiagnosis] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [medications, setMedications] = useState<Medication[]>([{ name: '', potency: '', dosage: '' }]);
  const [advice, setAdvice] = useState('');
  const [followupDate, setFollowupDate] = useState('');
  
  const [aiInsights, setAiInsights] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generateInvoice, setGenerateInvoice] = useState(true);
  const [bufferContent, setBufferContent] = useState<string | null>(null);

  useEffect(() => {
    const buffer = localStorage.getItem('ai_prescription_buffer');
    if (buffer) {
      setBufferContent(buffer);
    }
  }, []);

  const handleImportBuffer = () => {
    if (bufferContent) {
      setAdvice(prev => prev ? `${prev}\n\nAI Insights:\n${bufferContent}` : `AI Insights:\n${bufferContent}`);
      toast.success('AI content imported to Advice section');
      setBufferContent(null);
      localStorage.removeItem('ai_prescription_buffer');
    }
  };

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const snap = await getDocs(collection(db, 'patients'));
        setPatients(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'patients');
      }
    };
    fetchPatients();

    const fetchInventory = async () => {
      try {
        const snap = await getDocs(collection(db, 'inventory'));
        setInventory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Inventory fetch failed", error);
      }
    };
    fetchInventory();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      const p = patients.find(p => p.id === selectedPatientId);
      setSelectedPatient(p || null);
    }
  }, [selectedPatientId, patients]);

  const addMedication = () => {
    setMedications([...medications, { name: '', potency: '', dosage: '' }]);
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleMedChange = (index: number, field: keyof Medication, value: string) => {
    const updated = [...medications];
    updated[index][field] = value;
    setMedications(updated);

    if (field === 'name') {
      if (value.length > 1) {
        const matches = inventory
          .filter(item => item.name.toLowerCase().includes(value.toLowerCase()))
          .map(item => item.name);
        setSuggestedMeds(matches);
        setActiveMedIndex(index);
      } else {
        setSuggestedMeds([]);
        setActiveMedIndex(null);
      }
    }
  };

  const selectSuggestedMed = (index: number, name: string) => {
    const updated = [...medications];
    updated[index].name = name;
    setMedications(updated);
    setSuggestedMeds([]);
    setActiveMedIndex(null);
  };

  const handleAiInsights = async () => {
    if (!symptoms) {
      toast.error('Please enter symptoms first');
      return;
    }
    setIsAiLoading(true);
    const insights = await getRepertoryInsights(symptoms);
    await logAction({
      action: 'Run AI Repertory',
      entityType: 'Patient',
      entityId: selectedPatientId,
      details: `Generated AI insights for symptoms: ${symptoms.substring(0, 100)}...`,
      severity: 'info'
    });
    setAiInsights(insights);
    setIsAiLoading(false);
  };

  const handleSave = async () => {
    if (!selectedPatientId || medications.some(m => !m.name)) {
      toast.error('Please select patient and add medications');
      return;
    }
    setIsSaving(true);
    try {
      const docData: Prescription = {
        patientId: selectedPatientId,
        patientUid: selectedPatient?.uid,
        doctorId: profile?.uid,
        symptoms,
        diagnosis,
        medications,
        advice,
        followupDate: followupDate || null,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'prescriptions'), docData);

      // Auto-generate invoice if enabled
      if (generateInvoice) {
        try {
          await addDoc(collection(db, 'invoices'), {
            patientId: selectedPatientId,
            patientUid: selectedPatient?.uid,
            doctorId: profile?.uid,
            amount: profile?.consultationFee || 500,
            status: 'Pending',
            items: [{ description: 'Consultation & Prescription Fee', price: profile?.consultationFee || 500, quantity: 1 }],
            createdAt: new Date().toISOString()
          });
          toast.success('Billing invoice generated');
        } catch (invError) {
          handleFirestoreError(invError, OperationType.CREATE, 'invoices');
        }
      }

      await logAction({
        action: 'Clinical Decision',
        entityType: 'Prescription',
        entityId: selectedPatientId,
        details: `Saved prescription for ${selectedPatient?.name || 'Unknown'} with ${medications.length} medicines. Diagnosis: ${diagnosis}`,
        severity: 'info'
      });

      // Deduct Stock from Inventory
      try {
        const inventorySnap = await getDocs(collection(db, 'inventory'));
        const inventory = inventorySnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        
        for (const med of medications) {
          const item = inventory.find(i => i.name.toLowerCase().includes(med.name.toLowerCase()));
          if (item && item.stockLevel > 0) {
            try {
              const itemRef = doc(db, 'inventory', item.id);
              await updateDoc(itemRef, {
                stockLevel: item.stockLevel - 1,
                lastUpdated: new Date().toISOString()
              });
              await logAction({
                action: 'Auto Stock Deduction',
                entityType: 'Inventory',
                entityId: item.id,
                details: `Deducted 1 unit for prescription to ${selectedPatient?.name}`
              });
            } catch (updErr) {
               console.error("Stock update for item failed:", updErr);
            }
          }
        }
      } catch (stockError) {
        console.error("Stock fetching failed:", stockError);
      }

      toast.success('Prescription saved and stock adjusted');
      
      // Clear form
      setDiagnosis('');
      setSymptoms('');
      setMedications([{ name: '', potency: '', dosage: '' }]);
      setAdvice('');
      setFollowupDate('');
      setAiInsights('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'prescriptions');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    if (!selectedPatient) {
      toast.error('Select a patient');
      return;
    }
    const prescription: Prescription = {
      patientId: selectedPatientId,
      symptoms,
      diagnosis,
      medications,
      advice,
      followupDate,
      createdAt: new Date().toISOString()
    };
    const pdf = generatePrescriptionPDF(profile, selectedPatient, prescription);
    pdf.save(`Prescription_${selectedPatient.name}_${new Date().toLocaleDateString()}.pdf`);
  };

  const handleWhatsAppShare = () => {
    if (!selectedPatient || medications.length === 0) {
      toast.error('Select patient and medications first');
      return;
    }
    
    let message = `*Kayra Homeo Care - Prescription*\n\n`;
    message += `*Patient:* ${selectedPatient.name}\n`;
    message += `*Diagnosis:* ${diagnosis || 'Not specified'}\n\n`;
    message += `*Medications:*\n`;
    medications.forEach((m, i) => {
      if (m.name) {
        message += `${i + 1}. ${m.name} ${m.potency} - ${m.dosage}\n`;
      }
    });
    if (followupDate) {
      message += `\n*Next Follow-up:* ${new Date(followupDate).toLocaleDateString()}\n`;
    }
    message += `\n*Advice:* ${advice || 'Follow as directed.'}\n\n`;
    message += `Get well soon! 🌿`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${selectedPatient.phone.replace(/\D/g, '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8 h-full overflow-hidden">
      <div className="xl:col-span-2 flex flex-col space-y-6 overflow-y-auto pr-0 lg:pr-2 pb-32 lg:pb-8 custom-scrollbar touch-scroll">
        
        {/* Header Section */}
        <div className="bg-white p-4 lg:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-start gap-4">
            <div className="space-y-4 flex-1 w-full sm:max-w-md">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('select_patient')}</label>
              <div className="relative group">
                <input 
                  type="text"
                  placeholder={t('search_patients') || 'Search patients...'}
                  className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase();
                    if (!val) {
                      setSelectedPatientId('');
                      return;
                    }
                    const found = patients.find(p => 
                      p.name.toLowerCase().includes(val) || 
                      p.phone.includes(val) || 
                      p.patientId?.toLowerCase().includes(val)
                    );
                    if (found) setSelectedPatientId(found.id!);
                  }}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <Search size={18} />
                </div>
              </div>
              <select 
                value={selectedPatientId}
                onChange={e => setSelectedPatientId(e.target.value)}
                className="w-full px-4 py-3 sm:py-2 bg-white border border-slate-100 rounded-lg outline-none text-xs font-bold text-slate-400 appearance-none cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <option value="">{selectedPatientId ? 'Quick Filter Applied' : 'Or select from list...'}</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name} - {p.phone}</option>)}
              </select>
            </div>
            
            {selectedPatient && (
              <div className="text-left sm:text-right bg-indigo-50/50 sm:bg-transparent p-4 sm:p-0 rounded-2xl">
                <p className="text-sm font-bold text-slate-900">{selectedPatient.name}</p>
                <p className="text-xs text-slate-500">{selectedPatient.phone}</p>
                {selectedPatient.medicalHistory && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded">CHRONIC HISTORY</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Clinical Notes */}
        <div className="bg-white p-4 lg:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          {bufferContent && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                  <Brain size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">New AI Insight Detected</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Ready to import to Prescription</p>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => {
                    setBufferContent(null);
                    localStorage.removeItem('ai_prescription_buffer');
                  }}
                  className="flex-1 sm:flex-none px-3 py-2 text-slate-400 hover:text-slate-600 text-[10px] font-bold uppercase transition-all tap-target"
                >
                  Discard
                </button>
                <button 
                  onClick={handleImportBuffer}
                  className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-md hover:bg-slate-900 transition-all flex items-center justify-center gap-2 tap-target"
                >
                  <Plus size={14} /> Import to Advice
                </button>
              </div>
            </motion.div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain size={14} className="text-indigo-500" /> {t('repertory')} / Symptoms
                </div>
                <button 
                  onClick={handleAiInsights}
                  disabled={isAiLoading || !symptoms}
                  className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[9px] font-bold flex items-center gap-1 hover:bg-indigo-100 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Brain size={12} />
                  {isAiLoading ? '...' : 'AI INSIGHTS'}
                </button>
              </label>
              <textarea 
                value={symptoms}
                onChange={e => setSymptoms(e.target.value)}
                rows={3}
                placeholder="Mention primary complaints, modalities..."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Provisional Diagnosis</label>
              <textarea 
                value={diagnosis}
                onChange={e => setDiagnosis(e.target.value)}
                rows={3}
                placeholder="Clinical or pathological diagnosis..."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Prescription Details */}
      <div className="bg-white p-4 lg:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <span className="text-2xl font-serif text-indigo-600">Rx</span> Medications
          </h3>
          <button 
            onClick={addMedication}
            className="p-3 sm:px-3 sm:py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-indigo-100 transition-colors tap-target sm:min-h-0"
          >
            <Plus size={16} /> <span className="hidden sm:inline">Add Medicine</span>
          </button>
        </div>

        <div className="space-y-4">
          {medications.map((med, index) => (
            <motion.div 
              key={index} 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative bg-white sm:bg-slate-50/50 p-4 sm:p-5 pt-12 sm:pt-4 rounded-3xl border border-slate-200 sm:border-dashed shadow-sm sm:shadow-none"
            >
              <div className="absolute top-4 left-4 flex items-center gap-2">
                 <div className="w-6 h-6 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-[10px] font-black border border-indigo-100">
                    {index + 1}
                 </div>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Remedy Plan</span>
              </div>
              <button 
                onClick={() => removeMedication(index)}
                className="absolute top-2 right-2 tap-target text-slate-300 hover:text-red-500 transition-colors bg-white rounded-full shadow-sm sm:shadow-none min-w-[44px] min-h-[44px] flex items-center justify-center border border-slate-100"
              >
                <X size={16} />
              </button>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-end mt-4 sm:mt-0">
                <div className="sm:col-span-12">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-[3] relative">
                      <label className="block text-[9px] sm:text-[10px] font-bold text-slate-400 mb-1 sm:mb-1.5 uppercase tracking-tighter">Remedy Name</label>
                      <input 
                        value={med.name}
                        onChange={e => handleMedChange(index, 'name', e.target.value)}
                        onBlur={() => {
                          // Delay to allow clicking suggestion
                          setTimeout(() => {
                            if (activeMedIndex === index) {
                              setSuggestedMeds([]);
                              setActiveMedIndex(null);
                            }
                          }, 200);
                        }}
                        placeholder="Remedy (e.g. Aconite)"
                        className="w-full px-4 py-3 bg-slate-50 sm:bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-bold text-slate-700"
                      />
                      <AnimatePresence>
                        {activeMedIndex === index && suggestedMeds.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto"
                          >
                            {suggestedMeds.map((s, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => selectSuggestedMed(index, s)}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 font-medium transition-colors border-b border-slate-50 last:border-0"
                              >
                                {s}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-[2]">
                      <div className="w-full sm:w-24">
                        <label className="block text-[9px] sm:text-[10px] font-bold text-slate-400 mb-1 sm:mb-1.5 uppercase tracking-tighter">Potency</label>
                        <input 
                          value={med.potency}
                          onChange={e => handleMedChange(index, 'potency', e.target.value)}
                          placeholder="30C"
                          className="w-full px-4 py-3 bg-slate-50 sm:bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-bold text-slate-700"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[9px] sm:text-[10px] font-bold text-slate-400 mb-1 sm:mb-1.5 uppercase tracking-tighter">Dosage / Instructions</label>
                        <input 
                          value={med.dosage}
                          onChange={e => handleMedChange(index, 'dosage', e.target.value)}
                          placeholder="4 pills HS"
                          className="w-full px-4 py-3 bg-slate-50 sm:bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-bold text-slate-700"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Advice & Instructions</label>
              <textarea 
                value={advice}
                onChange={e => setAdvice(e.target.value)}
                rows={2}
                placeholder="Dietary restrictions, avoid coffee..."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                <span>Follow-up Date</span>
                {followupDate && (
                  <button 
                    onClick={() => setFollowupDate('')}
                    className="text-red-500 hover:text-red-600 text-[10px] font-bold uppercase"
                  >
                    Clear
                  </button>
                )}
              </label>
              <input 
                type="date"
                value={followupDate}
                onChange={e => setFollowupDate(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm"
              />
              <p className="mt-2 text-[9px] text-slate-400 font-medium italic">Setting a follow-up date will alert both you and the patient via the portal.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
             <input 
               type="checkbox" 
               id="genInvoice"
               checked={generateInvoice}
               onChange={(e) => setGenerateInvoice(e.target.checked)}
               className="w-5 h-5 text-emerald-600 rounded border-slate-300"
             />
             <label htmlFor="genInvoice" className="text-xs font-bold text-slate-700 cursor-pointer select-none">Generate Billing Invoice Automatically</label>
          </div>
          <span className="text-[10px] font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100 uppercase tracking-widest">FEE: ₹{profile?.consultationFee || 500}</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            disabled={isSaving}
            onClick={handleSave}
            className="flex-1 py-5 bg-slate-900 text-white rounded-[2rem] font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50 active:scale-[0.98]"
          >
            <ListPlus size={20} /> {isSaving ? 'Saving...' : t('finalize_save') || 'Finalize & Save'}
          </button>
          <button 
            onClick={handleWhatsAppShare}
            className="flex-1 py-5 bg-emerald-600 text-white rounded-[2rem] font-bold flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all shadow-xl active:scale-[0.98]"
          >
            <MessageCircle size={20} /> {t('share_whatsapp')}
          </button>
          <button 
            onClick={handlePrint}
            className="py-5 px-8 border-2 border-slate-200 text-slate-600 rounded-[2rem] font-bold flex items-center justify-center gap-3 hover:bg-slate-50 transition-colors active:scale-[0.98]"
          >
            <FileDown size={20} /> Print
          </button>
        </div>
      </div>

      {/* AI Sidebar */}
      <div className="flex flex-col space-y-6">
        <div className="bg-indigo-900 rounded-3xl p-8 text-white flex flex-col shadow-2xl relative overflow-hidden h-full">
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                <Brain className="text-emerald-400" size={24} />
              </div>
              <div>
                <h4 className="text-lg font-bold leading-none mb-1">AI Repertory Tool</h4>
                <p className="text-[10px] text-indigo-300 uppercase tracking-widest font-bold">Powered by Gemini 1.5</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto mb-6 custom-scrollbar pr-2">
              <AnimatePresence mode="wait">
                {isAiLoading ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <div className="h-4 bg-white/5 rounded animate-pulse w-3/4"></div>
                    <div className="h-4 bg-white/5 rounded animate-pulse"></div>
                    <div className="h-4 bg-white/5 rounded animate-pulse w-5/6"></div>
                    <p className="text-xs text-indigo-300 animate-pulse mt-4">AI is repertorizing the symptoms...</p>
                  </motion.div>
                ) : aiInsights ? (
                  <div className="markdown-body prose prose-invert prose-sm">
                    <ReactMarkdown>{aiInsights}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/10 rounded-2xl opacity-40">
                    <History size={40} className="mb-4" />
                    <p className="text-sm font-medium">Repertory insights will appear here once symptoms are entered.</p>
                  </div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={handleAiInsights}
              disabled={isAiLoading || !symptoms}
              className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-950/20 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-sm flex items-center justify-center gap-2"
            >
              {isAiLoading ? (
                <>Analyzing...</>
              ) : (
                <>Run AI Repertory</>
              )}
            </button>
          </div>
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-20"></div>
        </div>
      </div>
    </div>
  );
}
