import { useState, useEffect, useRef } from 'react';
import { db, handleFirestoreError, OperationType } from '../../lib/db';
import { logAction } from '../../lib/audit';
import { collection, addDoc, onSnapshot, doc, updateDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { toast } from 'sonner';
import { Prescription, Patient, Medication, UserProfile, InventoryItem } from '../../types';
import { Plus, X, FileDown, Brain, ListPlus, History, MessageCircle, Search, AlertCircle, Mic, MicOff } from 'lucide-react';
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

  // Web Speech API - Voice Dictation States
  const [isListening, setIsListening] = useState(false);
  const [activeDictationTarget, setActiveDictationTarget] = useState<'symptoms' | 'advice' | 'diagnosis' | null>(null);
  const recognitionRef = useRef<any>(null);

  const toggleDictation = (target: 'symptoms' | 'advice' | 'diagnosis') => {
    if (isListening && activeDictationTarget === target) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      setActiveDictationTarget(null);
      toast.info('Voice dictation stopped.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice dictation is not supported by your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setActiveDictationTarget(target);
        const targetLabel = target === 'symptoms' ? 'Symptoms / Observations' : target === 'advice' ? 'Advice' : 'Diagnosis';
        toast.success(`Dictation active for ${targetLabel}. Speak into microphone...`);
      };

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            if (target === 'symptoms') {
              setSymptoms(prev => (prev ? `${prev} ${transcript}`.trim() : transcript.trim()));
            } else if (target === 'advice') {
              setAdvice(prev => (prev ? `${prev} ${transcript}`.trim() : transcript.trim()));
            } else if (target === 'diagnosis') {
              setDiagnosis(prev => (prev ? `${prev} ${transcript}`.trim() : transcript.trim()));
            }
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error !== 'no-speech') {
          toast.error(`Dictation error: ${event.error}`);
        }
        setIsListening(false);
        setActiveDictationTarget(null);
      };

      recognition.onend = () => {
        setIsListening(false);
        setActiveDictationTarget(null);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      toast.error('Could not access microphone for dictation.');
      setIsListening(false);
      setActiveDictationTarget(null);
    }
  };

  // States for Patient History EHR Timeline
  const [patientHistory, setPatientHistory] = useState<Prescription[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!selectedPatientId) {
      setPatientHistory([]);
      return;
    }
    const fetchPatientHistory = async () => {
      try {
        setLoadingHistory(true);
        const q = query(
          collection(db, 'prescriptions'),
          where('patientId', '==', selectedPatientId),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prescription));
        setPatientHistory(data);
      } catch (err) {
        console.warn("Failed to fetch patient clinical history:", err);
        // Fallback query if indexing is not built
        try {
          const fallbackQ = query(
            collection(db, 'prescriptions'),
            where('patientId', '==', selectedPatientId)
          );
          const snap = await getDocs(fallbackQ);
          const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prescription))
            .sort((a,b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setPatientHistory(data);
        } catch (e) {
          console.error("Historical fetch fallback failed", e);
        }
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchPatientHistory();
  }, [selectedPatientId]);

  // Load draft on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem('kayra_prescription_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.selectedPatientId) setSelectedPatientId(parsed.selectedPatientId);
        if (parsed.diagnosis) setDiagnosis(parsed.diagnosis);
        if (parsed.symptoms) setSymptoms(parsed.symptoms);
        if (Array.isArray(parsed.medications)) setMedications(parsed.medications);
        if (parsed.advice) setAdvice(parsed.advice);
        if (parsed.followupDate) setFollowupDate(parsed.followupDate);
        
        setTimeout(() => {
          toast.success('Autorecovered prescription draft.');
        }, 600);
      }
    } catch (e) {
      console.warn("Failed recovery of prescription draft:", e);
    }

    const buffer = localStorage.getItem('ai_prescription_buffer');
    if (buffer) {
      setBufferContent(buffer);
    }
  }, []);

  // Save changes
  useEffect(() => {
    const hasMedicationData = medications.some(m => m.name || m.potency || m.dosage);
    if (diagnosis || symptoms || advice || followupDate || hasMedicationData) {
      const draft = {
        selectedPatientId,
        diagnosis,
        symptoms,
        medications,
        advice,
        followupDate
      };
      localStorage.setItem('kayra_prescription_draft', JSON.stringify(draft));
    }
  }, [selectedPatientId, diagnosis, symptoms, medications, advice, followupDate]);

  const handleImportBuffer = () => {
    if (bufferContent) {
      setAdvice(prev => prev ? `${prev}\n\nAI Insights:\n${bufferContent}` : `AI Insights:\n${bufferContent}`);
      toast.success('AI content imported to Advice section');
      setBufferContent(null);
      localStorage.removeItem('ai_prescription_buffer');
    }
  };

  useEffect(() => {
    if (!profile?.clinicId) return;

    const qPatients = query(
      collection(db, 'patients'), 
      where('clinicId', '==', profile.clinicId)
    );
    const unsubscribePatients = onSnapshot(qPatients, (snap) => {
      setPatients(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'patients');
    });

    const qInv = query(
      collection(db, 'inventory'), 
      where('clinicId', '==', profile.clinicId)
    );
    const unsubscribeInv = onSnapshot(qInv, (snap) => {
      setInventory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
    }, (error) => {
      console.error("Inventory fetch failed", error);
    });

    return () => {
      unsubscribePatients();
      unsubscribeInv();
    };
  }, [profile?.clinicId]);

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
          .map(item => ({ name: item.name, stock: item.stockLevel, unit: item.unit }));
        setSuggestedMeds(matches as any);
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
    const doctorContext = profile ? `Dr. ${profile.name}` : undefined;
    const insights = await getRepertoryInsights(symptoms, doctorContext);
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
        clinicId: profile?.clinicId,
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
            clinicId: profile?.clinicId,
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
        const q = query(
          collection(db, 'inventory'),
          where('clinicId', '==', profile?.clinicId)
        );
        const inventorySnap = await getDocs(q);
        const inventoryItems = inventorySnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        
        for (const med of medications) {
          const item = inventoryItems.find(i => i.name.toLowerCase().includes(med.name.toLowerCase()));
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
      
      // Clear draft cache
      localStorage.removeItem('kayra_prescription_draft');
      
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
      clinicId: profile?.clinicId || '',
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
                <div className="flex items-center gap-1.5">
                  <button 
                    type="button"
                    onClick={() => toggleDictation('symptoms')}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                      isListening && activeDictationTarget === 'symptoms'
                        ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-200'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                    title="Dictate clinical observations using microphone"
                  >
                    {isListening && activeDictationTarget === 'symptoms' ? (
                      <>
                        <MicOff size={12} /> Stop Dictating
                      </>
                    ) : (
                      <>
                        <Mic size={12} /> Dictate Notes
                      </>
                    )}
                  </button>
                  <button 
                    onClick={handleAiInsights}
                    disabled={isAiLoading || !symptoms}
                    className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[9px] font-bold flex items-center gap-1 hover:bg-indigo-100 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Brain size={12} />
                    {isAiLoading ? '...' : 'AI INSIGHTS'}
                  </button>
                </div>
              </label>
              <div className="relative">
                <textarea 
                  value={symptoms}
                  onChange={e => setSymptoms(e.target.value)}
                  rows={3}
                  placeholder="Mention primary complaints, modalities, or speak to dictate notes..."
                  className={`w-full p-4 bg-slate-50 border rounded-xl outline-none focus:border-indigo-500 text-sm transition-all ${
                    isListening && activeDictationTarget === 'symptoms'
                      ? 'border-red-400 bg-red-50/20 ring-2 ring-red-400/20'
                      : 'border-slate-200'
                  }`}
                />
                {isListening && activeDictationTarget === 'symptoms' && (
                  <div className="absolute right-3 bottom-3 flex items-center gap-1.5 px-2 py-1 bg-red-100 text-red-700 rounded-md text-[10px] font-bold animate-pulse">
                    <Mic size={12} className="animate-bounce" /> Live Dictating...
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                <span>Provisional Diagnosis</span>
                <button 
                  type="button"
                  onClick={() => toggleDictation('diagnosis')}
                  className={`px-2 py-1 rounded-lg text-[9px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer ${
                    isListening && activeDictationTarget === 'diagnosis'
                      ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                  title="Dictate diagnosis"
                >
                  {isListening && activeDictationTarget === 'diagnosis' ? (
                    <><MicOff size={11} /> Stop</>
                  ) : (
                    <><Mic size={11} /> Dictate</>
                  )}
                </button>
              </label>
              <div className="relative">
                <textarea 
                  value={diagnosis}
                  onChange={e => setDiagnosis(e.target.value)}
                  rows={3}
                  placeholder="Clinical or pathological diagnosis..."
                  className={`w-full p-4 bg-slate-50 border rounded-xl outline-none focus:border-indigo-500 text-sm transition-all ${
                    isListening && activeDictationTarget === 'diagnosis'
                      ? 'border-red-400 bg-red-50/20 ring-2 ring-red-400/20'
                      : 'border-slate-200'
                  }`}
                />
                {isListening && activeDictationTarget === 'diagnosis' && (
                  <div className="absolute right-3 bottom-3 flex items-center gap-1.5 px-2 py-1 bg-red-100 text-red-700 rounded-md text-[10px] font-bold animate-pulse">
                    <Mic size={12} className="animate-bounce" /> Live Dictating...
                  </div>
                )}
              </div>
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
          {medications.map((med, index) => {
            const COMMON_REMEDIES = ['Aconite', 'Arnica', 'Nux Vomica', 'Belladonna', 'Bryonia', 'Pulsatilla', 'Lycopodium', 'Thuja', 'Sulphur', 'Arsenicum Album'];
            const POTENCY_OPTIONS = ['Q', '6C', '30C', '200C', '1M', '10M', 'LM1'];
            const DOSAGE_INTERVAL_OPTIONS = ['OD', 'BD', 'TDS', 'QDS', 'HS', 'Weekly', 'SOS'];

            return (
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
                    <div className="flex flex-col xl:flex-row gap-3 sm:gap-4">
                      {/* Remedy Name and Suggestions */}
                      <div className="flex-[3] relative">
                        <label className="block text-[9px] sm:text-[10px] font-bold text-slate-400 mb-1 sm:mb-1.5 uppercase tracking-tighter">Remedy Name & Quick Pick</label>
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
                          placeholder="Remedy (e.g. Nux Vomica)"
                          className="w-full px-4 py-3 bg-slate-50 sm:bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-bold text-slate-700"
                        />
                        
                        {/* Quick Pick Badge Row */}
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {COMMON_REMEDIES.map(rem => (
                            <button
                              key={rem}
                              type="button"
                              onClick={() => handleMedChange(index, 'name', rem)}
                              className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter transition-all ${
                                med.name === rem ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              {rem}
                            </button>
                          ))}
                        </div>

                        <AnimatePresence>
                          {activeMedIndex === index && suggestedMeds.length > 0 && (
                            <motion.div 
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto"
                            >
                              {suggestedMeds.map((s: any, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => selectSuggestedMed(index, s.name)}
                                  className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 flex items-center justify-between group"
                                >
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600">{s.name}</span>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${s.stock < 5 ? 'text-red-500' : 'text-slate-400'}`}>
                                      {s.stock <= 0 ? 'Out of Stock' : `Stock: ${s.stock} ${s.unit}`}
                                    </span>
                                  </div>
                                  {s.stock < 5 && <AlertCircle size={14} className="text-red-500" />}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Potency Selection */}
                      <div className="flex-[1] min-w-[120px]">
                        <label className="block text-[9px] sm:text-[10px] font-bold text-slate-400 mb-1 sm:mb-1.5 uppercase tracking-tighter">Potency</label>
                        <select
                          value={POTENCY_OPTIONS.includes(med.potency) ? med.potency : med.potency ? 'custom' : ''}
                          onChange={e => {
                            const val = e.target.value;
                            if (val !== 'custom') {
                              handleMedChange(index, 'potency', val);
                            }
                          }}
                          className="w-full px-4 py-3 bg-slate-50 sm:bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold text-slate-700"
                        >
                          <option value="">Select Potency</option>
                          {POTENCY_OPTIONS.map(pot => (
                            <option key={pot} value={pot}>{pot}</option>
                          ))}
                          <option value="custom">Custom...</option>
                        </select>
                        {(med.potency === '' || !POTENCY_OPTIONS.includes(med.potency)) && (
                          <input 
                            value={med.potency}
                            onChange={e => handleMedChange(index, 'potency', e.target.value)}
                            placeholder="e.g. 30C"
                            className="w-full mt-1 px-3 py-2 bg-slate-50 sm:bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold text-slate-700"
                          />
                        )}
                      </div>

                      {/* Dosage Selection */}
                      <div className="flex-[2] min-w-[180px]">
                        <label className="block text-[9px] sm:text-[10px] font-bold text-slate-400 mb-1 sm:mb-1.5 uppercase tracking-tighter">Dosage / Interval</label>
                        <select 
                          value={DOSAGE_INTERVAL_OPTIONS.includes(med.dosage) ? med.dosage : med.dosage ? 'custom' : ''}
                          onChange={e => {
                            const val = e.target.value;
                            if (val !== 'custom') {
                              handleMedChange(index, 'dosage', val);
                            }
                          }}
                          className="w-full px-4 py-3 bg-slate-50 sm:bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold text-slate-700"
                        >
                          <option value="">Select Interval</option>
                          {DOSAGE_INTERVAL_OPTIONS.map(dos => (
                            <option key={dos} value={dos}>{dos}</option>
                          ))}
                          <option value="custom">Custom...</option>
                        </select>
                        {(med.dosage === '' || !DOSAGE_INTERVAL_OPTIONS.includes(med.dosage)) && (
                          <input 
                            value={med.dosage}
                            onChange={e => handleMedChange(index, 'dosage', e.target.value)}
                            placeholder="e.g. 4 pills nocte"
                            className="w-full mt-1 px-3 py-2 bg-slate-50 sm:bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold text-slate-700"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                <span>Advice & Instructions</span>
                <button 
                  type="button"
                  onClick={() => toggleDictation('advice')}
                  className={`px-2 py-1 rounded-lg text-[9px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer ${
                    isListening && activeDictationTarget === 'advice'
                      ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                  title="Dictate advice"
                >
                  {isListening && activeDictationTarget === 'advice' ? (
                    <><MicOff size={11} /> Stop</>
                  ) : (
                    <><Mic size={11} /> Dictate</>
                  )}
                </button>
              </label>
              <div className="relative">
                <textarea 
                  value={advice}
                  onChange={e => setAdvice(e.target.value)}
                  rows={2}
                  placeholder="Dietary restrictions, avoid coffee..."
                  className={`w-full p-4 bg-slate-50 border rounded-xl outline-none focus:border-indigo-500 text-sm transition-all ${
                    isListening && activeDictationTarget === 'advice'
                      ? 'border-red-400 bg-red-50/20 ring-2 ring-red-400/20'
                      : 'border-slate-200'
                  }`}
                />
                {isListening && activeDictationTarget === 'advice' && (
                  <div className="absolute right-3 bottom-3 flex items-center gap-1.5 px-2 py-1 bg-red-100 text-red-700 rounded-md text-[10px] font-bold animate-pulse">
                    <Mic size={12} className="animate-bounce" /> Live Dictating...
                  </div>
                )}
              </div>
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

        {/* Patient History EHR Timeline Block */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <History size={16} className="text-indigo-600 animate-spin-slow animate-pulse" />
              Patient EHR History Timeline
            </h4>
            <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              {patientHistory.length} Sessions
            </span>
          </div>

          {loadingHistory ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest animate-pulse">Loading Clinical timeline...</p>
            </div>
          ) : !selectedPatientId ? (
            <div className="py-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic opacity-50 bg-slate-50 rounded-xl">
              Please select an active patient to view their clinical history timeline.
            </div>
          ) : patientHistory.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic opacity-50 bg-slate-50 rounded-xl">
              No historical sessions recorded for this patient. Take their first case to populate their electronic health records.
            </div>
          ) : (
            <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 before:border-dashed">
              {patientHistory.map((pastSession, sIdx) => {
                const sessionDate = pastSession.createdAt 
                  ? new Date(pastSession.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                  : 'Prior Consult';

                return (
                  <div key={pastSession.id || sIdx} className="relative group">
                    {/* Circle Node indicator */}
                    <div className="absolute -left-[23px] top-1 w-3.5 h-3.5 bg-indigo-50 border border-indigo-600 rounded-full flex items-center justify-center transition-all group-hover:scale-110">
                      <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
                    </div>

                    <div className="bg-slate-50/50 hover:bg-slate-50 p-5 rounded-2xl border border-slate-100 transition-all shadow-sm">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-3">
                        <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">{sessionDate}</span>
                        {pastSession.diagnosis && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-lg border border-indigo-100 uppercase">
                            Dx: {pastSession.diagnosis}
                          </span>
                        )}
                      </div>

                      {pastSession.symptoms && (
                        <p className="text-xs text-slate-600 mb-2 font-medium">
                          <strong className="text-slate-800 font-bold uppercase text-[9px] tracking-wider block mb-0.5">Reported Symptoms:</strong>
                          {pastSession.symptoms}
                        </p>
                      )}

                      {pastSession.medications && pastSession.medications.length > 0 && (
                        <div className="mb-2">
                          <strong className="text-slate-800 font-bold uppercase text-[9px] tracking-wider block mb-1">Prescribed Remedies (Rx):</strong>
                          <div className="flex flex-wrap gap-1.5">
                            {pastSession.medications.map((m, mIdx) => (
                              <span key={mIdx} className="inline-block px-2 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold">
                                🌿 {m.name} {m.potency} &bull; {m.dosage}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {pastSession.advice && (
                        <p className="text-xs text-slate-500 italic">
                          <strong className="text-slate-800 font-bold uppercase text-[9px] tracking-wider block not-italic mb-0.5">Clinical Advice:</strong>
                          "{pastSession.advice}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

        {/* PDF Prescription Live Print Preview & Skeleton Box */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <FileDown size={16} className="text-emerald-500 animate-pulse" />
              Prescription Print Desk
            </h4>
            <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Ready
            </span>
          </div>

          <p className="text-slate-500 text-xs font-medium">
            Review the real-time visual alignment skeleton of the digital prescription model below before downloading or printing the PDF.
          </p>

          {/* Miniature Rx Letterhead Draft preview */}
          <div className="bg-slate-50/50 border border-slate-200 p-6 rounded-2xl font-mono text-[10px] text-slate-600 relative overflow-hidden shadow-inner space-y-4">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 border-b border-l border-indigo-100 rounded-bl-full flex items-center justify-center font-serif text-slate-300 font-black text-3xl select-none">
              Rx
            </div>

            <div className="border-b border-slate-200 pb-3 text-center">
              <h5 className="font-sans font-bold text-slate-800 text-[11px] uppercase tracking-wide">KAYRA'S HOMEO CARE</h5>
              <p className="text-[8px] text-slate-400 uppercase tracking-widest leading-smooth">Multi-Doctor Homeopathic Tele-clinic</p>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span>PATIENT:</span>
                <span className="font-bold text-slate-800">{selectedPatient?.name || '----------------'}</span>
              </div>
              <div className="flex justify-between">
                <span>DIAGNOSIS:</span>
                <span className="font-bold text-slate-850 uppercase">{diagnosis || 'Pending case details'}</span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <span className="font-sans font-bold text-slate-700 uppercase tracking-tighter block mb-2">🌿 Remedies Prescribed (Rx):</span>
              {medications.some(m => m.name) ? (
                <div className="space-y-1.5">
                  {medications.map((m, idx) => m.name && (
                    <div key={idx} className="flex justify-between text-[9px] font-bold text-slate-850">
                      <span>{idx+1}. {m.name} &bull; {m.potency || '30C'}</span>
                      <span>{m.dosage || 'QD'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1 animate-pulse">
                  <div className="h-2 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-2 bg-slate-200 rounded w-1/2"></div>
                </div>
              )}
            </div>

            {advice && (
              <div className="border-t border-slate-200 pt-3 text-[9px] italic">
                <span className="font-sans font-black text-slate-700 uppercase tracking-tighter not-italic block mb-1">Diet / Modalities / Advice:</span>
                "{advice}"
              </div>
            )}

            <div className="border-t border-slate-200 pt-4 flex flex-col justify-end items-end space-y-1 text-right text-[8px] text-slate-400">
              <span className="font-bold text-slate-500 font-sans uppercase">Dr. {profile?.name || 'Registered Homeopath'}</span>
              <span>Reg. No: {profile?.nchRegistrationNumber || profile?.stateBoardRegistrationNumber || 'BHMS-PENDING'}</span>
            </div>
          </div>

          <button 
            type="button"
            onClick={handlePrint}
            disabled={!selectedPatient}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <FileDown size={14} /> Download PDF Prescription
          </button>
        </div>
      </div>
    </div>
  );
}
