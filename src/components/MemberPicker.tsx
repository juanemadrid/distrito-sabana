import React, { useMemo, useState } from 'react';
import { Check, Search, UserCheck, UserPlus } from 'lucide-react';
import type { Member } from '../types';

interface MemberPickerProps {
  members: Member[];
  selectedMemberId: number | null;
  onSelectMember: (member: Member | null) => void;
  externalName: string;
  onExternalNameChange: (v: string) => void;
  externalPhone?: string;
  onExternalPhoneChange?: (v: string) => void;
  allowExternal?: boolean;
  externalLabel?: string;
}

export function MemberPicker({
  members,
  selectedMemberId,
  onSelectMember,
  externalName,
  onExternalNameChange,
  externalPhone = '',
  onExternalPhoneChange,
  allowExternal = true,
  externalLabel = 'Persona externa',
}: MemberPickerProps) {
  const [mode, setMode] = useState<'member' | 'external'>('member');
  const [query, setQuery] = useState('');

  const selected = useMemo(
    () => members.find((m) => m.id === selectedMemberId) || null,
    [members, selectedMemberId]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members.slice(0, 10);
    return members
      .filter(
        (m) =>
          m.full_name.toLowerCase().includes(q) ||
          (m.id_number || '').toLowerCase().includes(q) ||
          (m.phone || '').toLowerCase().includes(q) ||
          (m.church_name || '').toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [members, query]);

  return (
    <div className="space-y-2.5">
      {allowExternal && (
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setMode('member');
              onExternalNameChange('');
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
              mode === 'member'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Miembro registrado
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('external');
              onSelectMember(null);
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
              mode === 'external'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            {externalLabel}
          </button>
        </div>
      )}

      {mode === 'member' ? (
        <div className="space-y-2">
          {selected ? (
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-emerald-950 truncate">{selected.full_name}</p>
                <p className="text-xs text-emerald-700">
                  {selected.church_name} · {selected.organism !== 'NINGUNO' ? selected.organism : 'Miembro'}
                  {selected.phone ? ` · ${selected.phone}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSelectMember(null)}
                className="text-xs font-semibold text-emerald-800 hover:underline shrink-0 cursor-pointer"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar miembro por nombre, cédula o teléfono..."
                  className="input-field pl-9"
                />
              </div>
              <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
                {filtered.length === 0 ? (
                  <p className="p-3 text-xs text-slate-500 text-center">
                    No se encontraron miembros con "{query}".
                  </p>
                ) : (
                  filtered.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onSelectMember(m)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-50 transition cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{m.full_name}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {m.church_name} {m.phone ? `· ${m.phone}` : ''}
                        </p>
                      </div>
                      <Check className="w-4 h-4 text-slate-300 shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label-field">Nombre completo *</label>
            <input
              type="text"
              value={externalName}
              onChange={(e) => onExternalNameChange(e.target.value)}
              placeholder="Ej. Juan Carlos Pérez"
              className="input-field"
            />
          </div>
          {onExternalPhoneChange && (
            <div>
              <label className="label-field">Teléfono</label>
              <input
                type="text"
                value={externalPhone}
                onChange={(e) => onExternalPhoneChange(e.target.value)}
                placeholder="Ej. 300 123 4567"
                className="input-field"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
