import { motion } from 'motion/react';

interface SkeletonProps {
  className?: string;
  variant?: 'card' | 'text' | 'circle' | 'list' | 'progress';
  progressVal?: number;
  label?: string;
}

export default function SkeletalLoader({ className = '', variant = 'card', progressVal, label }: SkeletonProps) {
  if (variant === 'progress') {
    return (
      <div className={`p-5 bg-white border border-slate-100 rounded-[2rem] shadow-sm space-y-4 ${className}`} id=" KhcProgressFeedback">
        <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider text-teal-950">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-600 rounded-full animate-ping" />
            {label || 'Analyzing Clinical Telemetry'}
          </span>
          <span className="font-mono text-emerald-700">{progressVal !== undefined ? `${progressVal}%` : 'Processing'}</span>
        </div>
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-emerald-600"
            initial={{ width: '0%' }}
            animate={{ width: progressVal !== undefined ? `${progressVal}%` : '100%' }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </div>
        <p className="text-[10px] text-slate-400 font-medium">Please avoid refreshing the browser. Standard Materia Medica lookup protocols are actively parsing diagnostic signatures.</p>
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className="space-y-3 w-full" id="KhcSkeletonList">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl">
            <div className="w-12 h-12 bg-slate-100 rounded-xl animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-slate-200 rounded w-1/3 animate-pulse" />
              <div className="h-2 bg-slate-100 rounded w-1/2 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'circle') {
    return (
      <div className={`rounded-full bg-slate-200 animate-pulse ${className}`} id="KhcSkeletonCircle" />
    );
  }

  if (variant === 'text') {
    return (
      <div className="space-y-2 py-1 w-full" id="KhcSkeletonText">
        <div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse" />
        <div className="h-3 bg-slate-100 rounded w-1/2 animate-pulse" />
      </div>
    );
  }

  // Default: card skeleton
  return (
    <div className={`p-6 bg-white border border-slate-100 rounded-3xl space-y-4 animate-pulse ${className}`} id="KhcSkeletonCard">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-slate-200 rounded-2xl" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-slate-200 rounded w-1/2" />
          <div className="h-3 bg-slate-100 rounded w-1/3" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-slate-100 rounded w-full" />
        <div className="h-3 bg-slate-100 rounded w-5/6" />
      </div>
      <div className="pt-2 flex justify-between items-center border-t border-slate-50">
        <div className="h-3 bg-slate-100 rounded w-1/4" />
        <div className="h-8 bg-slate-200 rounded-xl w-1/3" />
      </div>
    </div>
  );
}
