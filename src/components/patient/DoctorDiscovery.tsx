import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Filter, Star, CheckCircle, Clock, Stethoscope, ArrowRight, User, Phone, Zap } from 'lucide-react';
import { db } from '../../lib/db';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { UserProfile } from '../../types';

interface DoctorDiscoveryProps {
  onSelect: (doctor: UserProfile) => void;
}

export default function DoctorDiscovery({ onSelect }: DoctorDiscoveryProps) {
  const [doctors, setDoctors] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSpecialty, setActiveSpecialty] = useState('All');
  const [cityFilter, setCityFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // Real-time synchronization for public doctor list
    const q = query(collection(db, 'users'), where('role', '==', 'doctor'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setDoctors(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredDoctors = doctors.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         doc.specialization?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialty = activeSpecialty === 'All' || doc.specialization === activeSpecialty;
    const matchesCity = !cityFilter || doc.city?.toLowerCase().includes(cityFilter.toLowerCase());
    return matchesSearch && matchesSpecialty && matchesCity;
  });

  const specialties = ['All', ...new Set(doctors.map(d => d.specialization).filter(Boolean))];

  return (
    <div className="space-y-8">
      {/* Search Header */}
      <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
              <Search size={22} />
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by doctor name or specialty..."
              className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all outline-none font-bold text-slate-800"
            />
          </div>
          <div className="relative group min-w-[200px]">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
              <MapPin size={22} />
            </div>
            <input 
              type="text" 
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              placeholder="Area / City..."
              className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all outline-none font-bold text-slate-800"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-5 rounded-2xl transition-all flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-[10px] ${showFilters ? 'bg-brand-600 text-white shadow-xl shadow-brand-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            <Filter size={18} /> Filters
          </button>
        </div>

        {/* Categories Scroller */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mask-linear-r pb-2">
          {specialties.map(spec => (
            <button
              key={spec}
              onClick={() => setActiveSpecialty(spec)}
              className={`px-6 py-3 rounded-xl whitespace-nowrap text-xs font-black uppercase tracking-widest transition-all ${activeSpecialty === spec ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:text-slate-600'}`}
            >
              {spec}
            </button>
          ))}
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <DoctorCardSkeleton key={i} />)}
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="bg-white p-20 rounded-[3rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mb-6">
              <Stethoscope size={40} />
            </div>
            <h4 className="text-xl font-bold text-slate-800 mb-2">No experts found in this sanctuary</h4>
            <p className="text-slate-400 max-w-sm mb-8">Try adjusting your filters or search keywords to locate a healthcare specialist.</p>
            <button 
              onClick={() => {setSearchQuery(''); setActiveSpecialty('All'); setCityFilter('');}}
              className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-600 transition-all"
            >
              Reset Discovery
            </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredDoctors.map((doc) => (
              <motion.div
                layout
                key={doc.uid}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group relative bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm hover:shadow-2xl hover:shadow-slate-200 hover:-translate-y-1 transition-all duration-500 overflow-hidden"
              >
                {/* Visual accents */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                
                <div className="flex gap-5 items-start mb-6 relative z-10">
                  <div className="relative">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 rounded-3xl overflow-hidden shadow-inner border-2 border-white">
                      {doc.photoURL ? (
                        <img src={doc.photoURL} alt={doc.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-50 font-black text-xl italic uppercase">
                          {doc.name ? doc.name.substring(0, 2) : 'DR'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest leading-none">Specialist</span>
                      <CheckCircle size={10} className="text-blue-500" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 tracking-tight leading-tight mb-1 truncate font-heading">Dr. {doc.name}</h4>
                    <p className="text-xs font-bold text-slate-500 italic mb-2">{doc.specialization || 'General Wellness'}</p>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Star size={12} className="text-amber-400 fill-amber-400" />
                        <span className="text-[11px] font-black text-slate-700">4.9</span>
                      </div>
                      <div className="w-1 h-1 bg-slate-200 rounded-full" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">120+ Visits</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-6 relative z-10">
                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                      <MapPin size={14} />
                    </div>
                    <p className="text-[11px] font-bold text-slate-600 truncate">{doc.clinicAddress || doc.city || 'Bihar'}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                       <Clock size={12} className="text-slate-300" />
                       <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Mon - Sat</span>
                    </div>
                    <div className="flex justify-end">
                       <span className="text-[11px] font-black text-brand-600 italic">₹{doc.consultationFee || '500'} Cons.</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => onSelect(doc)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:bg-brand-600 hover:shadow-brand-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
                >
                  Confirm Presence <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function DoctorCardSkeleton() {
  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-50 p-6 shadow-sm overflow-hidden animate-pulse">
      <div className="flex gap-5 mb-6">
        <div className="w-20 h-20 bg-slate-100 rounded-3xl" />
        <div className="flex-1 space-y-3 pt-2">
           <div className="w-12 h-2 bg-slate-100 rounded-full" />
           <div className="w-3/4 h-5 bg-slate-100 rounded-lg" />
           <div className="w-1/2 h-3 bg-slate-100 rounded-lg" />
        </div>
      </div>
      <div className="w-full h-12 bg-slate-50 rounded-2xl mb-4" />
      <div className="flex justify-between items-center mb-6 px-2">
         <div className="w-20 h-3 bg-slate-50 rounded-full" />
         <div className="w-16 h-3 bg-slate-50 rounded-full" />
      </div>
      <div className="w-full h-14 bg-slate-100 rounded-2xl" />
    </div>
  );
}
