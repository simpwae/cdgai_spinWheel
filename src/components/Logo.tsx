import React from 'react';
interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}
export const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-16 h-16 text-base',
    lg: 'w-24 h-24 text-xl',
    xl: 'w-32 h-32 text-3xl'
  };
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} bg-cdgai-maroon rounded-full flex items-center justify-center shadow-lg border-4 border-white/10`}>
        
        <span className="font-black text-white tracking-tighter">CDGAI</span>
      </div>
    </div>);

};