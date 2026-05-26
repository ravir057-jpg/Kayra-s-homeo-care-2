import { useState, useRef } from 'react';
import { Brain, BookOpen, Lightbulb, MessageSquare, FileScan, Upload, X, FileText, ImageIcon, Copy, FilePlus, Sparkles, FileBarChart } from 'lucide-react';
import { getRepertoryInsights, getAdvancedRepertoryAnalysis, analyzeCase, analyzeMedicalReport, searchMateriaMedica, synthesizeSymptomAndLabReport } from '../../lib/gemini';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import ReportsAnalytics from './ReportsAnalytics';

import { useLanguage } from '../../lib/i18n';

export default function AITools() {
  const { t } = useLanguage();
  const [currentSuite, setCurrentSuite] = useState<'ai' | 'analytics'>('ai');
  const [activeTab, setActiveTab] = useState<'repertory' | 'analysis' | 'case' | 'mm' | 'report' | 'synthesis'>('repertory');
  const [input, setInput] = useState('');
  const [glassInput, setGlassInput] = useState('');
  const [symptomsInput, setSymptomsInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ data: string; mimeType: string; name: string; preview?: string } | null>(null);
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
        name: file.name,
        preview: base64
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRun = async () => {
    setLoading(true);
    let output = '';
    try {
      if (activeTab === 'synthesis') {
        if (!glassInput || !symptomsInput) {
          toast.error("Please provide both inputs");
          setLoading(false);
          return;
        }
        output = await synthesizeSymptomAndLabReport(glassInput, symptomsInput, "Global Case Synthesis");
      } else if (activeTab === 'repertory') {
        if (!input) return;
        output = await getRepertoryInsights(input, "General Repertory Insights");
      } else if (activeTab === 'analysis') {
        if (!input) return;
        output = await getAdvancedRepertoryAnalysis(input, "Advanced Clinical Analysis");
      } else if (activeTab === 'case') {
        if (!input) return;
        output = await analyzeCase(input, "Clinical Case Study");
      } else if (activeTab === 'report') {
        if (!selectedFile) {
          toast.error("Please upload a report first");
          setLoading(false);
          return;
        }
        output = await analyzeMedicalReport({ data: selectedFile.data, mimeType: selectedFile.mimeType }, input, `Diagnostic Report: ${selectedFile.name}`);
      } else if (activeTab === 'mm') {
        if (!input) return;
        output = await searchMateriaMedica(input, "Materia Medica Research");
      } else {
        output = "Search functionality is coming soon!";
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
    toast.success('Copied to notes!');
  };

  const handleSaveToPrescription = () => {
    localStorage.setItem('ai_prescription_buffer', result);
    toast.success('Saved to prescription buffer! Go to Prescription Pad to import.');
  };

  const clearInput = () => {
    setInput('');
    setGlassInput('');
    setSymptomsInput('');
    setSelectedFile(null);
    setResult('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4 lg:space-y-6 h-full flex flex-col pb-20">
      {/* AI Hub Zone Tab-Switcher */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit border border-slate-200/50 shadow-sm shrink-0">
        <button
          onClick={() => setCurrentSuite('ai')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all duration-300 ${
            currentSuite === 'ai'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Brain size={14} />
          AI Diagnosis & Insights
        </button>
        <button
          onClick={() => setCurrentSuite('analytics')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all duration-300 ${
            currentSuite === 'analytics'
              ? 'bg-slate-905 bg-slate-900 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <FileBarChart size={14} />
          Practice Analytics & Charts
        </button>
      </div>

      {currentSuite === 'analytics' ? (
        <div className="flex-1 overflow-y-auto">
          <ReportsAnalytics />
        </div>
      ) : (
        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 lg:gap-8 h-full pb-20 lg:pb-0">
      <div className="flex flex-row lg:flex-col gap-2 lg:gap-4 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 scrollbar-hide shrink-0">
        <ToolButton 
          active={activeTab === 'synthesis'} 
          onClick={() => { setActiveTab('synthesis'); clearInput(); }} 
          icon={Brain} 
          title="AI Synthesis" 
          desc="Glass AI + Symptoms" 
        />
        <ToolButton 
          active={activeTab === 'repertory'} 
          onClick={() => { setActiveTab('repertory'); clearInput(); }} 
          icon={Brain} 
          title={t('repertory')} 
          desc={t('ai_insights')} 
        />
        <ToolButton 
          active={activeTab === 'analysis'} 
          onClick={() => { setActiveTab('analysis'); clearInput(); }} 
          icon={Sparkles} 
          title="Clinical Analysis" 
          desc="Remedies & Miasms" 
        />
        <ToolButton 
          active={activeTab === 'case'} 
          onClick={() => { setActiveTab('case'); clearInput(); }} 
          icon={MessageSquare} 
          title={t('case_study')} 
          desc="Clinical Analysis" 
        />
        <ToolButton 
          active={activeTab === 'report'} 
          onClick={() => { setActiveTab('report'); clearInput(); }} 
          icon={FileScan} 
          title={t('diagnostics')} 
          desc={t('report_analyzer')} 
        />
        <ToolButton 
          active={activeTab === 'mm'} 
          onClick={() => { setActiveTab('mm'); clearInput(); }} 
          icon={BookOpen} 
          title={t('materia_medica')} 
          desc="6 Master Texts" 
        />
      </div>

      <div className="lg:col-span-3 bg-white rounded-xl lg:rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-[350px] lg:min-h-[600px]">
        <div className="px-4 py-3 lg:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50/50 gap-2">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-xs lg:text-xl font-bold text-slate-800 flex items-center gap-2">
              <Sparkles size={14} className="text-indigo-500 lg:hidden" />
              {activeTab === 'synthesis' ? 'Clinical & Pathology Synthesis' :
               activeTab === 'repertory' ? 'Intelligent Repertory' : 
               activeTab === 'analysis' ? 'Advanced Repertory Analyst' : 
               activeTab === 'case' ? 'Clinical Case Analyzer' : 
               activeTab === 'report' ? `${t('diagnostics')} & ${t('report_analyzer')}` : 
               'Materia Medica Master Search'}
            </h2>
            <p className="hidden sm:block text-[9px] lg:text-sm text-slate-500 leading-tight">
              {activeTab === 'synthesis' ? 'Synthesize Glass AI diagnostics and subjective patient symptoms into a classical homeopathic profile.' :
               activeTab === 'report' ? 'Upload pathology or radiology reports for instant AI analysis.' : 
               activeTab === 'mm' ? 'Searching Allen, Nash, Clarke, Boericke, Kent, and Phatak.' :
               activeTab === 'analysis' ? 'Detailed rubric selection, remedy grading, and miasmatic background.' :
               'Provide symptoms or case details.'}
            </p>
          </div>
          <div className="shrink-0 px-2 py-0.5 lg:px-3 lg:py-1 bg-indigo-50 text-indigo-700 rounded-full text-[7px] lg:text-[10px] font-bold uppercase tracking-widest border border-indigo-100 flex items-center gap-1 shadow-sm w-fit">
             <div className="w-1 h-1 lg:w-1.5 lg:h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
             Gemini 3.5 Flash
          </div>
        </div>

        <div className="flex-1 p-4 lg:p-8 overflow-y-auto space-y-4 lg:space-y-6 scrollbar-hide">
          <AnimatePresence mode="wait">
            {activeTab === 'synthesis' ? (
              <motion.div 
                key="synthesis-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div className="flex flex-col space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    1. GLASS AI Output (Conventional Diagnostics & Lab Report)
                  </label>
                  <textarea 
                    value={glassInput}
                    onChange={(e) => setGlassInput(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 min-h-[160px] lg:min-h-[220px] transition-all text-slate-700 placeholder:text-slate-400 text-xs lg:text-base leading-relaxed"
                    placeholder="Enter conventional diagnostics, lab report values, radiology findings and DDx..."
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    2. Patient Symptoms (Subjective Mentals, Generals, Modalities)
                  </label>
                  <textarea 
                    value={symptomsInput}
                    onChange={(e) => setSymptomsInput(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 min-h-[160px] lg:min-h-[220px] transition-all text-slate-700 placeholder:text-slate-400 text-xs lg:text-base leading-relaxed"
                    placeholder="Enter subjective physical generals, mental-emotional symptoms, modalities, and miasmatic indications..."
                  />
                </div>
              </motion.div>
            ) : activeTab === 'report' ? (
              <motion.div 
                key="report-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                <div className="flex flex-col sm:flex-row gap-2">
                  {!selectedFile ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-white transition-all group shadow-sm"
                    >
                      <div className="p-1.5 bg-indigo-50 rounded-md text-indigo-600 transition-colors shrink-0">
                        <Upload size={14} />
                      </div>
                      <span className="font-bold text-[10px] text-slate-600 truncate leading-none">Upload Report Tab</span>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                        accept="image/*,application/pdf"
                      />
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center px-3 py-2 bg-emerald-50/50 border border-emerald-100 rounded-lg gap-2 overflow-hidden">
                      <div className="w-6 h-6 bg-white rounded flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                        {selectedFile.mimeType.includes('image') ? <ImageIcon size={12} /> : <FileText size={12} />}
                      </div>
                      <p className="flex-1 font-bold text-slate-700 text-[10px] truncate">{selectedFile.name}</p>
                      <button 
                        onClick={() => setSelectedFile(null)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded transition-all shrink-0"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  
                  {selectedFile && (
                    <div className="flex-1 flex items-center gap-2">
                       <input 
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 transition-all text-slate-700 placeholder:text-slate-400 text-[10px]"
                        placeholder="Any specific questions? (optional)"
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="text-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="w-full p-4 lg:p-6 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 min-h-[100px] lg:min-h-[200px] transition-all text-slate-700 placeholder:text-slate-400 text-xs lg:text-base"
                  placeholder={activeTab === 'repertory' ? "Enter patient symptoms..." : 
                               activeTab === 'analysis' ? "Enter symptoms for detailed repertory and miasmatic analysis..." : 
                               activeTab === 'case' ? "Paste clinical notes..." : 
                               "Search Materia Medica..."}
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          <button 
            onClick={handleRun}
            disabled={loading || (activeTab === 'synthesis' ? (!glassInput || !symptomsInput) : activeTab === 'report' ? !selectedFile : !input)}
            className="w-full py-2.5 lg:py-4 bg-indigo-600 text-white rounded-xl lg:rounded-2xl font-bold text-xs lg:text-lg hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 disabled:grayscale active:scale-[0.98] flex items-center justify-center gap-2 lg:gap-3"
          >
            {loading ? (
              <>
                <div className="w-3 h-3 lg:w-5 lg:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Analyzing...
              </>
            ) : (
              <>
                <Brain size={14} className="lg:hidden" />
                <Brain size={20} className="hidden lg:block" />
                {activeTab === 'report' ? 'Run Diagnostics' : 'Consult AI'}
              </>
            )}
          </button>

          {result && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 rounded-xl lg:rounded-2xl p-4 lg:p-6 text-white relative overflow-hidden"
            >
              <div className="relative z-10 markdown-body prose prose-invert max-w-none prose-xs sm:prose-sm lg:prose-base leading-tight">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
              <div className="absolute top-0 right-0 p-3 lg:p-4 opacity-10">
                <Lightbulb size={32} className="text-emerald-500 lg:hidden" />
                <Lightbulb size={48} className="text-emerald-500 hidden lg:block" />
              </div>
              
              <div className="mt-4 lg:mt-6 pt-3 lg:pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-2 lg:gap-3 relative z-10">
                <button 
                  onClick={handleCopyToClipboard}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] lg:text-xs font-bold transition-all border border-white/10"
                >
                  <Copy size={12} className="lg:hidden" />
                  <Copy size={14} className="hidden lg:block" /> Copy to Notes
                </button>
                <button 
                  onClick={handleSaveToPrescription}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-[10px] lg:text-xs font-bold transition-all shadow-lg shadow-emerald-500/20"
                >
                  <FilePlus size={12} className="lg:hidden" />
                  <FilePlus size={14} className="hidden lg:block" /> Save to Prescription
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
    )}
  </div>
  );
}

function ToolButton({ active, onClick, icon: Icon, title, desc }: any) {
  return (
    <button 
      onClick={onClick}
      className={`p-2.5 lg:p-4 rounded-xl lg:rounded-2xl border text-left transition-all group lg:w-full flex-1 lg:flex-none min-w-[100px] sm:min-w-[140px] lg:min-w-0 ${
        active 
          ? 'bg-indigo-900 border-indigo-800 text-white shadow-lg lg:shadow-xl shadow-indigo-100' 
          : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row gap-2 lg:gap-4 items-center sm:items-start lg:items-center">
        <div className={`p-2 lg:p-3 rounded-lg lg:rounded-xl transition-colors shrink-0 ${active ? 'bg-white/10' : 'bg-slate-50 group-hover:bg-indigo-50 text-slate-400 group-hover:text-indigo-600'}`}>
          <Icon size={18} className="lg:hidden" />
          <Icon size={24} className="hidden lg:block" />
        </div>
        <div className="text-center sm:text-left">
          <p className="font-bold text-[10px] sm:text-xs lg:text-base leading-tight">{title}</p>
          <p className={`text-[8px] lg:text-[10px] uppercase font-bold tracking-wider mt-0.5 ${active ? 'text-indigo-300' : 'text-slate-400'}`}>{desc}</p>
        </div>
      </div>
    </button>
  );
}
