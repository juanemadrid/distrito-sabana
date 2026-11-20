import React from 'react';

type Tone = 'neutral' | 'navy' | 'emerald' | 'rose' | 'amber' | 'sky';

const TONE_STYLES: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  navy: 'bg-[#EEF4FC] text-[#142E6B] border-[#C9DAF7]',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rose: 'bg-red-50 text-[#D81E27] border-red-200',
  amber: 'bg-[#FEF6E6] text-[#B86F11] border-[#F4D99E]',
  sky: 'bg-sky-50 text-sky-700 border-sky-200',
};

export function Badge({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${TONE_STYLES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
