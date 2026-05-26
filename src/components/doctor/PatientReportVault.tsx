import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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
                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl flex gap-4 items-start">
                       <Info size={18} className="text-slate-400 shrink-0 mt-0.5" />
                       <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                         <span className="font-bold text-slate-700">AI Diagnostic Notice:</span> This analysis is generated by an automated clinical engine. It is NOT a definitive diagnosis and should be reviewed by a qualified BHMS/MD physician. Kayra's Homeo Care follows Telemedicine Practice Guidelines and prioritizes patient safety through peer-review.
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
