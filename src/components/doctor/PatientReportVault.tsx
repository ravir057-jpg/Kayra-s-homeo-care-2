import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { 
  FileText, 
  Search, 
  Filter, 
  Calendar, 
  Brain, 
  ShieldCheck, 
  ChevronRight, 
  FileSearch,
  Zap,
  Info,
  Clock,
  ExternalLink,
  ChevronLeft,
  Loader2,
  AlertTriangle,
  Beaker
} from 'lucide-react';
import { db } from '../../lib/db';
import { collection, query, where, getDocs, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Report, Patient } from '../../types';
import { ReportAnalyzerService } from '../../services/reportAnalyzerService';

interface PatientReportVaultProps {
  patient: Patient;
  onClose: () => void;
}

export default function PatientReportVault({ patient, onClose }: PatientReportVaultProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Radiology' | 'Pathology' | 'Others'>('All');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'glass' | 'amboss' | 'homeo'>('glass');

  useEffect(() => {
    if (!patient.id) return;
    
    const q = query(
      collection(db, 'medical_reports'), 
      where('patientId', '==', patient.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
      setReports(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [patient.id]);

  const filteredReports = reports.filter(r => filter === 'All' || r.category === filter);

  useEffect(() => {
    if (selectedReport) {
      const updated = reports.find(r => r.id === selectedReport.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedReport)) {
        setSelectedReport(updated);
      }
    }
  }, [reports, selectedReport]);

  const handleAnalyze = async () => {
    if (!selectedReport?.id || !selectedReport.reportUrl) return;
    
    setAnalyzing(true);
    try {
      const result = await ReportAnalyzerService.analyzeReport(selectedReport.reportUrl, selectedReport.category);
      
      const reportRef = doc(db, 'medical_reports', selectedReport.id);
      await updateDoc(reportRef, {
        summary: result.summary,
        findings: result.findings,
        clinicalGuidance: result.clinicalGuidance,
        rubricsSuggested: result.rubricsSuggested,
        ambossVerified: result.ambossVerified || '',
        glassInsights: result.glassInsights || '',
        homeopathicMatches: result.homeopathicMatches || '',
        synthesisRubrics: result.synthesisRubrics || [],
        status: 'Analyzed',
        analyzedAt: new Date().toISOString()
      });

      // Update local state is handled by onSnapshot
    } catch (err) {
      console.error("AI Analysis failed:", err);
      alert("AI Analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[3rem] shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-brand-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-100">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Medical Vault: {patient.name}</h3>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Clinical Diagnostic Repository</span>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest leading-none">{reports.length} Documents Archived</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-4 text-slate-400 hover:text-slate-600 rounded-2xl transition-all border border-slate-100 bg-slate-50 hover:bg-white shadow-sm"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* List Sidebar */}
          <div className={`w-full lg:w-[400px] border-r border-slate-100 flex flex-col bg-slate-50/30 ${selectedReport ? 'hidden lg:flex' : 'flex'}`}>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto no-scrollbar">
                {(['All', 'Radiology', 'Pathology'] as const).map((cat) => (
                  <button 
                    key={cat}
                    onClick={() => setFilter(cat)}
                    className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      filter === cat ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 pt-0 custom-scrollbar">
              {loading ? (
                [1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-3xl animate-pulse border border-slate-200" />)
              ) : filteredReports.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 p-8">
                  <FileSearch size={40} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No matching records</p>
                </div>
              ) : (
                filteredReports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className={`w-full text-left p-5 rounded-[2rem] border transition-all relative overflow-hidden group ${
                      selectedReport?.id === report.id 
                        ? 'bg-brand-600 border-brand-500 text-white shadow-xl shadow-brand-100' 
                        : 'bg-white border-slate-200 text-slate-800 hover:border-brand-300 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
                        selectedReport?.id === report.id ? 'bg-white/20' : 'bg-slate-50 text-slate-400'
                      }`}>
                        <FileText size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            selectedReport?.id === report.id ? 'bg-white/20 text-white' : 'bg-brand-50 text-brand-600'
                          }`}>
                            {report.category}
                          </span>
                          <span className={`text-[9px] font-bold ${selectedReport?.id === report.id ? 'text-white/60' : 'text-slate-400'}`}>
                            {format(new Date(report.createdAt), 'dd MMM')}
                          </span>
                        </div>
                        <h4 className="text-sm font-black truncate tracking-tight">{report.title}</h4>
                        {report.status === 'Analyzed' && (
                          <div className={`flex items-center gap-1.5 mt-2 ${selectedReport?.id === report.id ? 'text-white/80' : 'text-brand-600'}`}>
                            <Zap size={10} fill="currentColor" />
                            <span className="text-[9px] font-black uppercase tracking-widest">AI Analyzed</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Details Content */}
          <div className={`flex-1 flex flex-col bg-white overflow-hidden ${!selectedReport ? 'hidden lg:flex' : 'flex'}`}>
            {selectedReport ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-6 lg:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-100 bg-slate-50/30 overflow-y-auto lg:overflow-visible no-scrollbar">
                  <div className="flex items-center gap-6">
                    <button onClick={() => setSelectedReport(null)} className="lg:hidden p-3 bg-white border border-slate-200 rounded-xl">
                      <ChevronLeft size={20} />
                    </button>
                    <div>
                      <h4 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight leading-tight">{selectedReport.title}</h4>
                      <div className="flex items-center gap-4 mt-2">
                         <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                            <Calendar size={14} />
                            {format(new Date(selectedReport.createdAt), 'EEEE, do MMM yyyy')}
                         </div>
                         <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                         <div className="flex items-center gap-2 text-brand-600 font-black text-xs uppercase tracking-widest">
                            <ShieldCheck size={14} />
                            Audit Verified
                         </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <a 
                      href={selectedReport.reportUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-brand-600 transition-all shadow-xl shadow-slate-200"
                    >
                      <ExternalLink size={18} />
                      Open Full Document
                    </a>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 lg:p-12 space-y-10 custom-scrollbar">
                  {/* AI Insight Section */}
                  <div className="relative">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                      <Brain size={160} className="text-brand-600" />
                    </div>
                    
                    <div className="p-8 lg:p-12 bg-white border-2 border-brand-100 rounded-[3rem] shadow-2xl shadow-brand-50 relative overflow-hidden">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 bg-brand-600 text-white rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-brand-100">
                          <Brain size={28} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-brand-600 uppercase tracking-[0.2em] mb-1">Kayra AI Intelligence</p>
                          <h5 className="text-xl font-black text-slate-800 tracking-tight">Clinical Assessment Summary</h5>
                        </div>
                      </div>

                      {selectedReport.status === 'Analyzed' ? (
                        <div className="space-y-8">
                          <p className="text-lg font-medium text-slate-600 leading-relaxed italic border-l-4 border-brand-500 pl-8 bg-brand-50/30 py-4 rounded-r-2xl">
                            "{selectedReport.summary}"
                          </p>
                          
                          {/* Parameter Table */}
                          <div className="overflow-hidden border border-slate-100 rounded-3xl shadow-sm">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Parameter</th>
                                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Value</th>
                                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Result</th>
                                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {selectedReport.findings?.map((f, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 text-xs font-bold text-slate-700">{f.parameter}</td>
                                    <td className={`px-6 py-4 text-xs font-black text-center ${f.result === 'Abnormal' ? 'text-red-600' : 'text-slate-600'}`}>{f.value}</td>
                                    <td className="px-6 py-4 text-center">
                                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                        f.result === 'Abnormal' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                                      }`}>
                                        {f.result}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-[10px] text-slate-400 font-medium italic">{f.reference || 'N/A'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                             <div className="space-y-4">
                               <div className="flex items-center gap-2 text-[10px] font-black text-brand-600 uppercase tracking-widest">
                                 <Beaker size={14} /> Homeopathic Rubric Suggestions
                               </div>
                               <div className="flex flex-wrap gap-2">
                                  {selectedReport.rubricsSuggested?.map((rubric, i) => (
                                    <span key={i} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200">
                                      {rubric}
                                    </span>
                                  ))}
                               </div>
                             </div>

                             <div className="bg-slate-900 p-8 rounded-[2rem] text-white space-y-4 shadow-xl shadow-slate-200">
                                <div className="flex items-center gap-3">
                                   <Info size={20} className="text-brand-400" />
                                   <p className="text-[11px] font-black uppercase tracking-widest text-brand-200">Clinical Guidance</p>
                                </div>
                                <p className="text-xs text-brand-50 font-medium leading-relaxed opacity-80 italic">
                                  {selectedReport.clinicalGuidance}
                                </p>
                             </div>
                          </div>

                          {/* Direct Gemini Multimodal Validation Deck */}
                          <div className="mt-8 border-t border-slate-100 pt-8 space-y-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                              <div>
                                <span className="text-[9px] bg-indigo-50 text-indigo-700 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider block w-max mb-1.5">
                                  Direct Gemini Multimodal Route
                                </span>
                                <h5 className="text-base font-black text-slate-800 tracking-tight leading-none">Google Gemini Multidisciplinary Clinical Deck</h5>
                              </div>
                              <div className="flex flex-wrap gap-1.5 p-1 bg-slate-50 border border-slate-200/60 rounded-2xl shadow-sm">
                                <button
                                  type="button"
                                  onClick={() => setActiveDetailTab('glass')}
                                  className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                                    activeDetailTab === 'glass' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-500 hover:bg-slate-100'
                                  }`}
                                >
                                  <div className={`w-1.5 h-1.5 rounded-full ${activeDetailTab === 'glass' ? 'bg-white' : 'bg-indigo-500'}`} />
                                  [Clinical Entity Analysis]
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveDetailTab('amboss')}
                                  className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                                    activeDetailTab === 'amboss' ? 'bg-amber-600 text-white shadow-md shadow-amber-100' : 'text-slate-500 hover:bg-slate-100'
                                  }`}
                                >
                                  <div className={`w-1.5 h-1.5 rounded-full ${activeDetailTab === 'amboss' ? 'bg-white' : 'bg-amber-500'}`} />
                                  [Reference Protocols]
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveDetailTab('homeo')}
                                  className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                                    activeDetailTab === 'homeo' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' : 'text-slate-500 hover:bg-slate-100'
                                  }`}
                                >
                                  <div className={`w-1.5 h-1.5 rounded-full ${activeDetailTab === 'homeo' ? 'bg-white' : 'bg-emerald-500'}`} />
                                  [Homeopathic Matches]
                                </button>
                              </div>
                            </div>

                            <div className="bg-slate-50/50 border border-slate-200/80 p-6 rounded-3xl min-h-[140px] relative overflow-hidden shadow-inner">
                              {activeDetailTab === 'glass' && (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <span className="text-[9px] text-indigo-700 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                                      🧬 Gemini Clinical & Biological Entity Analysis
                                    </span>
                                    <span className="text-[8px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                      Gemini Multimodal
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-700 leading-relaxed font-semibold whitespace-pre-line bg-white/80 p-5 rounded-2xl border border-slate-200/40 shadow-sm max-h-[300px] overflow-y-auto custom-scrollbar">
                                    <ReactMarkdown>{selectedReport.glassInsights || "No active clinical entity insights found. Process this document with Gemini to extract parameters."}</ReactMarkdown>
                                  </div>
                                </div>
                              )}
                              {activeDetailTab === 'amboss' && (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <span className="text-[9px] text-amber-700 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                                      📚 Biomedical Reference Protocols & Guidelines
                                    </span>
                                    <span className="text-[8px] bg-amber-50 text-amber-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                      Medical Guidelines
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-700 leading-relaxed font-semibold whitespace-pre-line bg-white/80 p-5 rounded-2xl border border-slate-200/40 shadow-sm max-h-[300px] overflow-y-auto custom-scrollbar">
                                    <ReactMarkdown>{selectedReport.ambossVerified || "No active biomedical protocol benchmarks logged. Trigger report analysis for automatic clinical guidelines extraction."}</ReactMarkdown>
                                  </div>
                                </div>
                              )}
                              {activeDetailTab === 'homeo' && (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <span className="text-[9px] text-emerald-700 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                                      🌿 Kent / Boericke Materia Medica Matcher
                                    </span>
                                    <span className="text-[8px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                      Homeopathic Similimum
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-700 leading-relaxed font-semibold whitespace-pre-line bg-white/80 p-5 rounded-2xl border border-slate-200/40 shadow-sm max-h-[300px] overflow-y-auto custom-scrollbar">
                                    <ReactMarkdown>{selectedReport.homeopathicMatches || "No classical repertory remedy matches cataloged. Run analysis to construct a clinical totality of symptoms with Gemini."}</ReactMarkdown>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Synthesis Repertory Analysis Dashboard Panel */}
                          <div className="mt-8 border-t border-slate-100 pt-8 space-y-6 animate-fade-in">
                            <div className="bg-slate-900 rounded-[2rem] p-6 lg:p-8 text-white shadow-xl space-y-6 relative overflow-hidden border border-slate-800">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
                              
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/10">
                                <div>
                                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider block w-max mb-1.5 border border-emerald-500/30">
                                    🌿 Synthesis Repertory Workflow (Inspired by RadarOpus)
                                  </span>
                                  <h5 className="text-lg font-black text-white tracking-tight">Synthesis Repertory Analysis</h5>
                                </div>
                                <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-[9px] text-slate-300 font-mono">
                                  Totality Mapped: {selectedReport.synthesisRubrics?.length || 0} Rubrics
                                </div>
                              </div>

                              <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                                The pathology-to-rubric mapper translates abnormal clinical values into precise classical rubrics, applying the Synthesis Repertory Remedy Grading weightings (<span className="text-emerald-300 font-bold">Grades 1 to 4</span>) to highlight high-grade classical remedies.
                              </p>

                              {selectedReport.synthesisRubrics && selectedReport.synthesisRubrics.length > 0 ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  {selectedReport.synthesisRubrics.map((rub, rIdx) => (
                                    <div key={rIdx} className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-3 hover:bg-white/[0.08] transition-all">
                                      <div className="flex justify-between items-start gap-2">
                                        <span className="text-[9px] bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                                          {rub.repertoryChapter}
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-medium italic">
                                          Ref: {rub.sourceAbnormalFinding}
                                        </span>
                                      </div>
                                      
                                      <h6 className="text-xs font-black text-emerald-300 tracking-tight leading-snug">
                                        {rub.rubricName}
                                      </h6>

                                      {/* Remedies associated with their grading */}
                                      <div className="pt-2">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Graded Remedies Associated:</p>
                                        <div className="flex flex-wrap gap-2">
                                          {rub.remediesAssociated?.map((rem, mIdx) => {
                                            // Style based on traditional homeopathic grading (1-4)
                                            // Grade 4: Bold underlined keynotes
                                            // Grade 3: Bold
                                            // Grade 2: Italics
                                            // Grade 1: Plain
                                            const gradStyle = rem.grade === 4 
                                              ? 'bg-emerald-950 border-emerald-600 text-emerald-200 font-black underline decoration-emerald-400 decoration-2'
                                              : rem.grade === 3
                                              ? 'bg-indigo-950/60 border-indigo-800 text-indigo-200 font-bold'
                                              : rem.grade === 2
                                              ? 'bg-cyan-950/40 border-cyan-800/80 text-cyan-200 italic'
                                              : 'bg-slate-800/85 text-slate-300 border-slate-700 font-medium';

                                            return (
                                              <div 
                                                key={mIdx} 
                                                className={`px-2.5 py-1 rounded-xl text-[10px] border flex items-center gap-1.5 transition-all cursor-default ${gradStyle}`}
                                                title={`Synthesis Grade ${rem.grade}`}
                                              >
                                                <span>{rem.remedy}</span>
                                                <span className="text-[8px] opacity-70 bg-white/10 px-1 py-0.2 rounded font-mono">G{rem.grade}</span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-8 bg-white/5 border border-dashed border-white/10 rounded-2xl text-center space-y-2">
                                  <Beaker size={28} className="mx-auto text-emerald-400 animate-pulse" />
                                  <h6 className="text-xs font-black text-white uppercase tracking-wider">Synthesis Mapping Data Not Found</h6>
                                  <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                                    This report is pending premium rubric extraction. Please trigger the <strong className="text-indigo-300">Run AI Clinical Engine</strong> button to automatically map pathological findings to the Synthesis Repertory and RadarOpus chapters.
                                  </p>
                                </div>
                              )}

                              {/* Clinical Safety Layer */}
                              <div className="border-t border-white/10 pt-6 space-y-4">
                                <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col md:flex-row gap-4 items-start md:items-center">
                                  <div className="p-3 bg-amber-500/20 text-amber-300 rounded-xl shrink-0">
                                    <ShieldCheck size={20} />
                                  </div>
                                  <div className="space-y-1">
                                    <h6 className="text-[10px] font-black text-amber-300 uppercase tracking-widest leading-none">Clinical Safety Split-Protocol Guard</h6>
                                    <p className="text-[11px] text-slate-300 leading-relaxed font-semibold">
                                      <span className="text-white font-bold">Conventional Clinical Metrics:</span> Diagnoses, reference guidelines, and biochemical alarms from Glass Health and Amboss are mapped independently. <span className="text-white font-bold">Homeopathic Repertorization:</span> Rubrics and graded remedies represent Materia Medica reference listings. Medical registration checks and clinical case-taking remain mandatory before prescribing similimum treatments.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-center">
                          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6 border border-slate-100">
                            {analyzing ? (
                              <Loader2 size={36} className="animate-spin text-brand-600" />
                            ) : (
                              <Clock size={36} strokeWidth={1} />
                            )}
                          </div>
                          <h6 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-2">
                            {analyzing ? 'AI Processing Data...' : 'Analysis Pending'}
                          </h6>
                          <p className="text-xs text-slate-400 font-medium max-w-xs mb-8">
                            {analyzing ? 'Our Lead AI Architect is extracting parameters and cross-referencing ranges.' : 'This report has not been processed for AI diagnostic insights yet.'}
                          </p>
                          {!analyzing && (
                            <button 
                              onClick={handleAnalyze}
                              className="px-8 py-3 bg-brand-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-700 transition-all shadow-lg shadow-brand-100 flex items-center gap-2"
                            >
                              <Zap size={14} fill="currentColor" />
                              Run AI Clinical Engine
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* AI Disclaimer */}
                    <div className="p-6 bg-amber-50 border-2 border-amber-200 rounded-3xl flex gap-4 items-start shadow-sm">
                       <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                       <p className="text-[11px] text-amber-900 font-medium leading-relaxed">
                         <span className="font-bold text-amber-950">MANDATORY LEGAL & SAFETY NOTICE:</span> This is an AI-assisted analysis for homeopathic reference based on Materia Medica; it does not replace professional clinical evaluation. For emergencies, visit the nearest hospital immediately. Kayra's Homeo Care follows Telemedicine Practice Guidelines and prioritizes patient safety.
                       </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-4">Diagnostic Audit Trail</h5>
                    <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 border border-slate-200">
                             <ShieldCheck size={18} />
                          </div>
                          <div>
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Origin Node</p>
                             <p className="text-xs font-bold text-slate-700">Patient Upload (Verified)</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Sync status</p>
                          <p className="text-xs font-bold text-emerald-600">Active Library</p>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-20">
                <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-8 border border-slate-100">
                  <FileSearch size={64} strokeWidth={1} />
                </div>
                <h4 className="text-2xl font-black text-slate-800 tracking-tight mb-3">Diagnostic Intelligence Hub</h4>
                <p className="text-slate-400 max-w-sm font-medium">Select a medical record from the vault to view high-resolution clinical imaging and AI-powered diagnostic summaries.</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
