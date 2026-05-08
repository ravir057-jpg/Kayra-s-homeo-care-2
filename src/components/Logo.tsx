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
            className="absolute -top-1 -right-1 text-amber-400 fill-amber-400 opacity-60" 
          />
          {/* Green Leaves */}
          <div className="flex items-end -space-x-1">
            <Leaf 
              size={currentSize.icon} 
              className="text-brand-600 fill-brand-600 rotate-[-15deg]" 
            />
            <Leaf 
              size={currentSize.icon * 0.7} 
              className="text-brand-400 fill-brand-400 rotate-[15deg] opacity-80" 
            />
          </div>
        </div>
      </div>
      
      <div className="flex flex-col">
        <h1 className={`${currentSize.text} font-black ${textColor} tracking-tight leading-none font-heading`}>
          Kayra's <span className="text-brand-600">Care</span>
        </h1>
        {showTagline && (
          <p className={`${currentSize.tagline} font-black ${tagColor} tracking-[0.25em] uppercase mt-1.5 leading-none opacity-60`}>
            Bihar's Sanctuary
          </p>
        )}
      </div>
    </div>
  );
}
