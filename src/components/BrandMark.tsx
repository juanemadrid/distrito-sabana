import React from 'react';

interface BrandMarkProps {
  size?: number;
  variant?: 'badge' | 'crest' | 'raw';
  className?: string;
}

const LOGO_SRC = `${import.meta.env.BASE_URL}logo-igleico.webp`;

export function BrandMark({ size = 44, variant = 'badge', className = '' }: BrandMarkProps) {
  if (variant === 'raw') {
    return (
      <img
        src={LOGO_SRC}
        alt="IGLEICO – Iglesia Evangélica Interamericana de Colombia"
        style={{ width: size, height: size }}
        className={`object-contain shrink-0 ${className}`}
      />
    );
  }

  if (variant === 'crest') {
    return (
      <div
        className={`inline-flex items-center justify-center bg-white rounded-3xl p-4 shadow-xl ring-1 ring-white/40 ${className}`}
      >
        <img
          src={LOGO_SRC}
          alt="IGLEICO – Iglesia Evangélica Interamericana de Colombia"
          style={{ width: size, height: size }}
          className="object-contain"
        />
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`inline-flex items-center justify-center bg-white rounded-xl p-1 shadow-sm ring-1 ring-slate-200/80 shrink-0 ${className}`}
    >
      <img
        src={LOGO_SRC}
        alt="IGLEICO"
        className="w-full h-full object-contain"
      />
    </div>
  );
}
