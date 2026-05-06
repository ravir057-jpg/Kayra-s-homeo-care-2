import { Leaf, Circle } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  theme?: 'light' | 'dark';
}

export default function Logo({ size = 'md', showTagline = true, theme = 'dark' }: LogoProps) {
  const sizes = {
    sm: { icon: 16, text: 'text-lg', tagline: 'text-[8px]', gap: 'gap-2' },
    md: { icon: 24, text: 'text-2xl', tagline: 'text-[10px]', gap: 'gap-3' },
    lg: { icon: 32, text: 'text-4xl', tagline: 'text-xs', gap: 'gap-4' }
  };

  const currentSize = sizes[size];
  const textColor = theme === 'dark' ? 'text-slate-900' : 'text-white';
  const tagColor = theme === 'dark' ? 'text-slate-500' : 'text-slate-200';

  return (
    <div className={`flex items-center ${currentSize.gap}`}>
      <div className="relative flex items-center justify-center">
        {/* Stylized Plant from Image */}
        <div className="relative">
          {/* Yellow Sun/Circle */}
          <Circle 
            size={currentSize.icon * 0.8} 
            className="absolute -top-1 -right-1 text-lime-400 fill-lime-400 opacity-80" 
          />
          {/* Green Leaves */}
          <div className="flex items-end -space-x-1">
            <Leaf 
              size={currentSize.icon} 
              className="text-emerald-600 fill-emerald-600 rotate-[-15deg]" 
            />
            <Leaf 
              size={currentSize.icon * 0.7} 
              className="text-emerald-400 fill-emerald-400 rotate-[15deg]" 
            />
          </div>
        </div>
      </div>
      
      <div className="flex flex-col">
        <h1 className={`${currentSize.text} font-bold ${textColor} tracking-tight leading-none`}>
          Kayra's Homoeo. Care
        </h1>
        {showTagline && (
          <p className={`${currentSize.tagline} font-medium ${tagColor} tracking-[0.2em] uppercase mt-1 leading-none`}>
            complete holistic care
          </p>
        )}
      </div>
    </div>
  );
}
