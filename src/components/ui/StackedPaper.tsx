import React from 'react';

interface StackedPaperProps {
  children: React.ReactNode;
  className?: string;
  paperClassName?: string;
  noPadding?: boolean;
  transparent?: boolean;
}

export const StackedPaper: React.FC<StackedPaperProps> = ({ 
  children, 
  className = "", 
  paperClassName = "",
  noPadding = false,
  transparent = false
}) => {
  return (
    <div className={`relative ${className}`}>
      {/* Stacked layers */}
      {!transparent && (
        <>
          <div className="absolute inset-0 translate-y-2 translate-x-1 bg-slate-200 dark:bg-slate-800 rounded-3xl -z-10" />
          <div className="absolute inset-0 translate-y-1 translate-x-0.5 bg-slate-100 dark:bg-slate-800 rounded-3xl -z-10" />
        </>
      )}
      
      <div className={`flex flex-col rounded-3xl overflow-hidden h-full relative ${transparent ? '' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm'}`}>
        {!transparent && (
          <>
            <div className="absolute top-0 left-0 right-0 h-6 torn-paper-edge z-10 opacity-50" />
            <div className="absolute top-1 left-0 right-0 h-6 torn-paper-edge z-10 opacity-30" />
            <div className="absolute top-2 left-0 right-0 h-6 torn-paper-edge z-10" />
          </>
        )}
        
        <div className={`flex flex-col h-full ${noPadding ? '' : 'pt-6'} ${transparent ? '' : 'paper-texture'} ${paperClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
};
