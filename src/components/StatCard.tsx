import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  tone?: 'neutral' | 'emerald' | 'rose' | 'amber' | 'navy';
  onClick?: () => void;
}

const TONE_STYLES = {
  neutral: {
    icon: 'bg-[#EEF4FC] text-[#1B449C]',
    bar: 'bg-[#1B449C]',
  },
  navy: {
    icon: 'bg-[#142E6B] text-white',
    bar: 'bg-[#142E6B]',
  },
  emerald: {
    icon: 'bg-emerald-50 text-emerald-700',
    bar: 'bg-emerald-600',
  },
  rose: {
    icon: 'bg-red-50 text-[#D81E27]',
    bar: 'bg-[#D81E27]',
  },
  amber: {
    icon: 'bg-amber-50 text-[#C47A16]',
    bar: 'bg-[#D98A1F]',
  },
};

export function StatCard({ title, value, subtitle, icon, tone = 'neutral', onClick }: StatCardProps) {
  const styles = TONE_STYLES[tone];
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden bg-white rounded-2xl border border-[#DDE6F4] p-5 shadow-[0_2px_8px_rgba(20,46,107,0.04)] transition-all ${
        onClick ? 'cursor-pointer hover:border-[#1B449C]/40 hover:shadow-[0_6px_18px_rgba(20,46,107,0.08)] hover:-translate-y-0.5' : ''
      }`}
    >
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${styles.bar}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500">{title}</p>
          <p className="text-2xl font-extrabold text-[#142E6B] mt-2 tracking-tight tabular-nums">
            {value}
          </p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${styles.icon}`}>
          {icon}
        </div>
      </div>
      {subtitle && (
        <p className="text-xs text-slate-500 mt-2.5 leading-snug">{subtitle}</p>
      )}
    </div>
  );
}
