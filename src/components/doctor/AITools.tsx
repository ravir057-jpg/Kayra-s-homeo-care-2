import { useState, useRef } from 'react';
import { Brain, BookOpen, Lightbulb, MessageSquare, FileScan, Upload, X, FileText, ImageIcon, Copy, FilePlus, Sparkles } from 'lucide-react';
import { getRepertoryInsights, getAdvancedRepertoryAnalysis, analyzeCase, analyzeMedicalReport, searchMateriaMedica } from '../../lib/gemini';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

import { useLanguage } from '../../lib/i18n';

export default function AITools() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'repertory' | 'analysis' | 'case' | 'mm' | 'report'>('repertory');
  const [input, setInput] = useState('');
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
      if (activeTab === 'repertory') {
        if (!input) return;
        output = await getRepertoryInsights(input);
      } else if (activeTab === 'analysis') {
        if (!input) return;
        output = await getAdvancedRepertoryAnalysis(input);
      } else if (activeTab === 'case') {
        if (!input) return;
        output = await analyzeCase(input);
      } else if (activeTab === 'report') {
        if (!selectedFile) {
          toast.error("Please upload a report first");
          setLoading(false);
          return;
        }
        output = await analyzeMedicalReport({ data: selectedFile.data, mimeType: selectedFile.mimeType }, input);
      } else if (activeTab === 'mm') {
        if (!input) return;
        output = await searchMateriaMedica(input);
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
    setSelectedFile(null);
    setResult('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 lg:gap-8 h-full pb-20 lg:pb-0">
      <div className="flex flex-row lg:flex-col gap-3 lg:gap-4 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-hide shrink-0 mask-linear-r lg:mask-none">
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

      <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-[600px]">
        <div className="p-5 lg:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50/50 gap-4">
          <div>
            <h2 className="text-lg lg:text-xl font-bold text-slate-800">
              {activeTab === 'repertory' ? 'Intelligent Repertory' : 
               activeTab === 'analysis' ? 'Advanced Repertory Analyst' : 
               activeTab === 'case' ? 'Clinical Case Analyzer' : 
               activeTab === 'report' ? `${t('diagnostics')} & ${t('report_analyzer')}` : 
               'Materia Medica Master Search'}
            </h2>
            <p className="text-xs lg:text-sm text-slate-500">
              {activeTab === 'report' ? 'Upload pathology or radiology reports for instant AI analysis.' : 
               activeTab === 'mm' ? 'Searching Allen, Nash, Clarke, Boericke, Kent, and Phatak.' :
               activeTab === 'analysis' ? 'Detailed rubric selection, remedy grading, and miasmatic background.' :
               'Provide symptoms or case details.'}
            </p>
          </div>
          <div className="w-fit px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold uppercase tracking-widest border border-indigo-100 flex items-center gap-1 shadow-sm">
             <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
             Gemini 2.0 Flash AI
          </div>
        </div>

        <div className="flex-1 p-5 lg:p-8 overflow-y-auto space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === 'report' ? (
              <motion.div 
                key="report-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                {!selectedFile ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-3xl p-10 lg:p-16 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-400 hover:bg-slate-50 transition-all group"
                  >
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                      <Upload size={32} />
                    </div>
                    <h3 className="font-bold text-slate-700">{t('upload_report')}</h3>
                    <p className="text-xs text-slate-400 mt-2 max-w-[240px]">Support for JPG, PNG, or PDF up to 10MB (Blood tests, MRI, CT, X-Ray)</p>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="hidden" 
                      accept="image/*,application/pdf"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-white border border-slate-200 rounded-[2rem] p-6 relative group shadow-sm transition-all hover:shadow-md">
                      {selectedFile.mimeType.includes('image') ? (
                        <div className="w-full aspect-video rounded-2xl overflow-hidden mb-4 bg-slate-100 border border-slate-100 relative group-hover:border-indigo-200 transition-all">
                          <img src={selectedFile.preview} className="w-full h-full object-contain" alt="Medical Report Preview" />
                          <div className="absolute inset-0 bg-indigo-900/0 group-hover:bg-indigo-900/5 transition-all" />
                        </div>
                      ) : (
                        <div className="w-full aspect-video rounded-2xl bg-indigo-50 border border-indigo-100/50 flex flex-col items-center justify-center mb-4 transition-all group-hover:bg-indigo-100/50">
                          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-indigo-600 mb-3">
                            <FileText size={32} />
                          </div>
                          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">PDF Document</span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 border border-slate-200 shadow-sm">
                            {selectedFile.mimeType.includes('image') ? <ImageIcon size={20} /> : <FileText size={20} />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-700 text-sm truncate max-w-[150px] sm:max-w-md">{selectedFile.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                              <p className="text-[10px] text-emerald-600 uppercase tracking-widest font-black">Ready for AI Analysis</p>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => setSelectedFile(null)}
                          className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-95"
                          title="Remove file"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {selectedFile && !result && (
                   <textarea 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="w-full p-4 lg:p-6 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 min-h-[80px] transition-all text-slate-700 placeholder:text-slate-300 text-sm"
                    placeholder="Add specific questions or notes for the AI (optional)..."
                  />
                )}
              </motion.div>
            ) : (
              <motion.div
                key="text-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="w-full p-4 lg:p-6 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 min-h-[150px] lg:min-h-[200px] transition-all text-slate-700 placeholder:text-slate-300 text-sm lg:text-base"
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
            disabled={loading || (activeTab === 'report' ? !selectedFile : !input)}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-base lg:text-lg hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 disabled:grayscale active:scale-[0.98] flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                AI is processing...
              </>
            ) : (
              <>
                <Brain size={20} />
                {activeTab === 'report' ? t('analyze_report') : t('consult_ai')}
              </>
            )}
          </button>

          {result && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 rounded-3xl p-6 lg:p-8 text-white relative overflow-hidden"
            >
              <div className="relative z-10 markdown-body prose prose-invert max-w-none prose-sm lg:prose-base leading-relaxed">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Lightbulb size={60} className="text-emerald-500" />
              </div>
              
              <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-4 relative z-10">
                <button 
                  onClick={handleCopyToClipboard}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/10"
                >
                  <Copy size={16} /> Copy to Notes
                </button>
                <button 
                  onClick={handleSaveToPrescription}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/20"
                >
                  <FilePlus size={16} /> Save to Prescription
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToolButton({ active, onClick, icon: Icon, title, desc }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full p-4 rounded-2xl border text-left transition-all group shrink-0 ${
        active 
          ? 'bg-indigo-900 border-indigo-800 text-white shadow-xl shadow-indigo-100' 
          : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200'
      }`}
    >
      <div className="flex gap-4 items-center">
        <div className={`p-3 rounded-xl transition-colors ${active ? 'bg-white/10' : 'bg-slate-50 group-hover:bg-indigo-50 text-slate-400 group-hover:text-indigo-600'}`}>
          <Icon size={24} />
        </div>
        <div className="hidden sm:block">
          <p className="font-bold text-sm lg:text-base">{title}</p>
          <p className={`text-[10px] uppercase font-bold tracking-wider ${active ? 'text-indigo-300' : 'text-slate-400'}`}>{desc}</p>
        </div>
      </div>
    </button>
  );
}
