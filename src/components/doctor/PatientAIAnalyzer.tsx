import { useState, useRef } from 'react';
import { Brain, FileScan, Upload, X, FileText, ImageIcon, Copy, FilePlus, Sparkles, BookOpen, MessageSquare, Info } from 'lucide-react';
import { analyzeSpecificCase, analyzeMedicalReport, searchMateriaMedica, getAdvancedRepertoryAnalysis } from '../../lib/gemini';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Patient } from '../../types';
import { useLanguage } from '../../lib/i18n';

interface PatientAIAnalyzerProps {
  patient: Patient;
  onClose: () => void;
}

export default function PatientAIAnalyzer({ patient, onClose }: PatientAIAnalyzerProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'case' | 'report' | 'mm' | 'repertory'>('case');
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ data: string; mimeType: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const data = base64.split(',')[1];
      setSelectedFile({
        data,
        mimeType: file.type,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRun = async () => {
    setLoading(true);
    let output = '';
    try {
      if (activeTab === 'case') {
        const context = `Patient: ${patient.name}, Age: ${patient.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : 'N/A'}, Gender: ${patient.gender}, Medical History: ${patient.medicalHistory || 'None'}`;
        output = await analyzeSpecificCase(context, input || 'Perform general case analysis based on history.');
      } else if (activeTab === 'report') {
        if (!selectedFile) {
          toast.error("Please upload a report first");
          setLoading(false);
          return;
        }
        output = await analyzeMedicalReport({ data: selectedFile.data, mimeType: selectedFile.mimeType });
      } else if (activeTab === 'mm') {
        if (!input) return;
        output = await searchMateriaMedica(input);
      } else if (activeTab === 'repertory') {
        if (!input) return;
        output = await getAdvancedRepertoryAnalysis(input);
      }
      setResult(output);
    } catch (error) {
      toast.error("Error processing request");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(result);
    toast.success('Copied to summary!');
  };

  const handleSaveToContext = () => {
    localStorage.setItem('ai_prescription_buffer', result);
    toast.success('Saved to AI Buffer. You can import this in the Prescription Pad.');
  };

  const clearInput = () => {
    setInput('');
    setSelectedFile(null);
    setResult('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 lg:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
              <Brain size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Advanced Clinical AI Analyzer</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{patient.name}</span>
                <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter shadow-sm border border-emerald-100">Patient-Aware Mode</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 text-slate-400 hover:text-slate-600 rounded-2xl transition-colors border border-slate-100 bg-white shadow-sm"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-full lg:w-72 border-r border-slate-100 p-4 lg:p-6 space-y-2 shrink-0 bg-slate-50/30 overflow-x-auto lg:overflow-y-auto no-scrollbar flex flex-row lg:flex-col">
            <TabButton 
              active={activeTab === 'case'} 
              onClick={() => { setActiveTab('case'); clearInput(); }} 
              icon={MessageSquare} 
              title="Clinical Totality" 
              desc="Case Analysis" 
            />
            <TabButton 
              active={activeTab === 'report'} 
              onClick={() => { setActiveTab('report'); clearInput(); }} 
              icon={FileScan} 
              title="Record Scan" 
              desc="Clinical Records" 
            />
            <TabButton 
              active={activeTab === 'repertory'} 
              onClick={() => { setActiveTab('repertory'); clearInput(); }} 
              icon={Sparkles} 
              title="AI Diagnosis" 
              desc="Kent & Boericke" 
            />
            <TabButton 
              active={activeTab === 'mm'} 
              onClick={() => { setActiveTab('mm'); clearInput(); }} 
              icon={BookOpen} 
              title="Materia Medica" 
              desc="8 Master Texts" 
            />
          </div>

          {/* Main content area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 p-6 lg:p-8 overflow-y-auto custom-scrollbar space-y-6">
              {/* Input Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                    {activeTab === 'case' && 'Enter Presenting Symptoms'}
                    {activeTab === 'report' && 'Upload Medical Records'}
                    {activeTab === 'mm' && 'Search Remedy / Condition'}
                    {activeTab === 'repertory' && 'Intelligent Repertorization'}
                    <Info size={14} className="text-slate-300" />
                  </h4>
                  <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={12} className="animate-pulse" />
                    Powered by Gemini 3
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {activeTab === 'report' ? (
                    <motion.div 
                      key="report-upload"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                      {!selectedFile ? (
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-400 hover:bg-slate-50 transition-all group"
                        >
                          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                            <Upload size={32} />
                          </div>
                          <h3 className="font-bold text-slate-700">Drop clinical reports here</h3>
                          <p className="text-xs text-slate-400 mt-2 max-w-[240px]">JPG, PNG, PDF (Pathology, MRI, CT Scans, X-rays)</p>
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            className="hidden" 
                            accept="image/*,application/pdf"
                          />
                        </div>
                      ) : (
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center justify-between text-white shadow-xl">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white border border-white/10 shadow-sm">
                              {selectedFile.mimeType.includes('image') ? <ImageIcon size={24} /> : <FileText size={24} />}
                            </div>
                            <div>
                              <p className="font-bold text-sm truncate max-w-[200px] sm:max-w-md">{selectedFile.name}</p>
                              <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-black">Encrypted & Ready</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setSelectedFile(null)}
                            className="p-2 text-white/40 hover:text-red-400 transition-colors"
                          >
                            <X size={24} />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="text-input"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <textarea 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="w-full p-6 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 min-h-[160px] transition-all text-slate-700 placeholder:text-slate-300 text-sm font-medium leading-relaxed"
                        placeholder={activeTab === 'case' ? "Enter current symptoms (mentals, physical generals, particulars)..." : 
                                     activeTab === 'repertory' ? "Paste symptomatology for deep repertory and miasmatic analysis..." : 
                                     "Search for a remedy or a clinical condition in Master texts..."}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  onClick={handleRun}
                  disabled={loading || (activeTab === 'report' ? !selectedFile : !input)}
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 disabled:grayscale active:scale-[0.98] flex items-center justify-center gap-3 text-center"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Processing Clinical Totality...
                    </>
                  ) : (
                    <>
                      <Brain size={18} />
                      {activeTab === 'report' ? 'Initiate Report Analysis' : 'Consult Gemini Specialist AI'}
                    </>
                  )}
                </button>
              </div>

              {/* Result Section */}
              {result && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-slate-200 rounded-[2.5rem] p-10 text-slate-900 relative overflow-hidden shadow-xl"
                >
                  <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
                    <Brain size={240} className="text-indigo-600" />
                  </div>
                  
                  {/* Report Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-10 border-b border-slate-100 pb-8">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Confidential AI Analysis</span>
                      </div>
                      <h2 className="text-2xl font-black text-slate-800 tracking-tight">Clinical Consultation Summary</h2>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reference ID</p>
                      <p className="text-xs font-mono font-bold text-slate-600">#AI-{Math.random().toString(36).substring(7).toUpperCase()}</p>
                    </div>
                  </div>

                  <div className="relative z-10 markdown-body prose prose-slate max-w-none prose-sm lg:prose-base leading-loose font-medium">
                    <ReactMarkdown>{result}</ReactMarkdown>
                  </div>
                  
                  <div className="mt-12 pt-8 border-t border-slate-100 flex flex-wrap gap-4 relative z-10">
                    <button 
                      onClick={handleCopyToClipboard}
                      className="flex items-center gap-3 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 group"
                    >
                      <Copy size={18} className="group-hover:rotate-12 transition-transform" /> 
                      Copy Analysis to Clipboard
                    </button>
                    <button 
                      onClick={handleSaveToContext}
                      className="flex items-center gap-4 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
                    >
                      <FilePlus size={18} /> 
                      Import to Prescription Pad
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer Patient Info Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
               <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Blood</span>
                     <span className="text-xs font-black text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">{patient.bloodGroup || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Miasm Hint</span>
                     <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">Undetermined</span>
                  </div>
               </div>
               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] italic">
                  Kayra Homeo Care • Clinical Intelligence Engine
               </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, title, desc }: any) {
  return (
    <button 
      onClick={onClick}
      className={`lg:w-full p-4 rounded-2xl border text-left transition-all group shrink-0 ${
        active 
          ? 'bg-indigo-900 border-indigo-800 text-white shadow-xl shadow-indigo-100' 
          : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200'
      }`}
    >
      <div className="flex gap-4 items-center">
        <div className={`p-3 rounded-xl transition-colors ${active ? 'bg-white/10' : 'bg-slate-50 group-hover:bg-indigo-50 text-slate-400 group-hover:text-indigo-600'}`}>
          <Icon size={20} />
        </div>
        <div className="hidden lg:block overflow-hidden">
          <p className="font-bold text-xs truncate uppercase tracking-widest">{title}</p>
          <p className={`text-[9px] uppercase font-black tracking-tighter mt-0.5 truncate ${active ? 'text-indigo-300' : 'text-slate-400'}`}>{desc}</p>
        </div>
      </div>
    </button>
  );
}
