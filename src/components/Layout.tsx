import React, { useState } from 'react';
import {
  Building2,
  CalendarCheck2,
  Church as ChurchIcon,
  FileBarChart2,
  LayoutDashboard,
  LogOut,
  Menu,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../lib/format';
import { BrandMark } from './BrandMark';

export type NavKey =
  | 'dashboard'
  | 'activities'
  | 'finance'
  | 'churches'
  | 'pastors'
  | 'members'
  | 'reports'
  | 'district';

interface LayoutProps {
  activeNav: NavKey;
  onNavigate: (nav: NavKey) => void;
  children: React.ReactNode;
}

const NAV_GROUPS: Array<{
  title: string;
  items: Array<{ key: NavKey; label: string; icon: React.ReactNode }>;
}> = [
  {
    title: 'Operación',
    items: [
      { key: 'dashboard', label: 'Panel Principal', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
      { key: 'activities', label: 'Actividades y Cartera', icon: <CalendarCheck2 className="w-[18px] h-[18px]" /> },
      { key: 'finance', label: 'Finanzas y Diezmos', icon: <Wallet className="w-[18px] h-[18px]" /> },
    ],
  },
  {
    title: 'Directorio',
    items: [
      { key: 'churches', label: 'Iglesias', icon: <ChurchIcon className="w-[18px] h-[18px]" /> },
      { key: 'pastors', label: 'Pastores', icon: <UserCheck className="w-[18px] h-[18px]" /> },
      { key: 'members', label: 'Miembros', icon: <Users className="w-[18px] h-[18px]" /> },
    ],
  },
  {
    title: 'Gobernación',
    items: [
      { key: 'reports', label: 'Reportes Oficiales', icon: <FileBarChart2 className="w-[18px] h-[18px]" /> },
      { key: 'district', label: 'Distrito Sabana', icon: <Building2 className="w-[18px] h-[18px]" /> },
    ],
  },
];

function getInitials(name?: string) {
  if (!name) return 'DS';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || parts[0]?.[1] || '')).toUpperCase();
}

export function Layout({ activeNav, onNavigate, children }: LayoutProps) {
  const { user, logout, isDistrictAdmin, churches, selectedChurchId, setSelectedChurchId } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#102556] via-[#142E6B] to-[#0C1D44] text-white shadow-xl">
      {/* Tricolor institutional accent bar */}
      <div className="h-1 w-full igleico-stripe shrink-0" />

      {/* Crisp White Brand Plaque with REAL IGLEICO Logo */}
      <div className="px-4 py-4">
        <div className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-md ring-1 ring-white/20">
          <BrandMark size={46} variant="raw" />
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#D98A1F] leading-none">
              IGLEICO
            </p>
            <p className="text-[15px] font-extrabold text-[#142E6B] leading-tight mt-0.5 truncate">
              Distrito Sabana
            </p>
            <p className="text-[10px] font-medium text-slate-500 truncate">
              Gestión Eclesial
            </p>
          </div>
        </div>
      </div>

      {/* Grouped Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-5 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-200/60">
              {group.title}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = activeNav === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      onNavigate(item.key);
                      setDrawerOpen(false);
                    }}
                    className={`relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white text-[#142E6B] font-bold shadow-md'
                        : 'text-blue-100/90 font-medium hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#D98A1F]" />
                    )}
                    <span className={isActive ? 'text-[#1B449C]' : 'text-[#F0B85A]/90'}>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Clean User Footer */}
      <div className="p-3 border-t border-white/10 bg-[#0A1838]/60">
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/8 border border-white/10">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#E59B2E] to-[#C47A16] text-white text-xs font-extrabold flex items-center justify-center shrink-0 shadow-sm">
            {getInitials(user?.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white leading-tight truncate">{user?.username === 'distrito' ? 'Rvdo. Jonás Pinto' : user?.full_name}</p>
            <p className="text-[11px] text-blue-200/80 leading-tight truncate mt-0.5">
              {ROLE_LABELS[user?.role || ''] || user?.role}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Cerrar sesión"
            className="p-1.5 rounded-lg text-blue-200/80 hover:text-white hover:bg-[#D81E27]/80 transition cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F4F7FC]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen no-print">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-72 max-w-[85vw] h-full shadow-2xl relative">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="absolute top-3.5 right-3 z-20 p-1.5 rounded-lg bg-slate-100 text-slate-600"
              aria-label="Cerrar menú"
            >
              <X className="w-4 h-4" />
            </button>
            {sidebarContent}
          </div>
          <div className="flex-1 bg-slate-900/50 backdrop-blur-[1px]" onClick={() => setDrawerOpen(false)} />
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Institutional Bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#DDE6F4] no-print">
          <div className="h-[3px] w-full igleico-stripe lg:hidden" />
          <div className="h-16 px-4 sm:px-7 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="lg:hidden p-2 rounded-xl border border-slate-200 text-[#142E6B] hover:bg-[#EEF4FC]"
                aria-label="Abrir menú"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2.5 min-w-0">
                <BrandMark size={28} variant="raw" className="lg:hidden" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#142E6B] truncate">
                    Iglesia Evangélica Interamericana de Colombia
                  </p>
                  <p className="text-[11px] font-medium text-[#D98A1F] hidden sm:block truncate">
                    Gobernación Distrito Sabana · Plataforma Institucional
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {isDistrictAdmin ? (
                <div className="flex items-center gap-2 bg-[#EEF4FC] border border-[#C9DAF7] rounded-xl px-3 py-1.5">
                  <Building2 className="w-4 h-4 text-[#1B449C] shrink-0" />
                  <select
                    value={selectedChurchId}
                    onChange={(e) => setSelectedChurchId(e.target.value)}
                    className="text-xs sm:text-sm font-semibold text-[#142E6B] bg-transparent focus:outline-none max-w-[180px] sm:max-w-[260px] cursor-pointer"
                  >
                    <option value="all">Todo el Distrito Sabana ({churches.length})</option>
                    {churches.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#EEF4FC] border border-[#C9DAF7] text-xs font-bold text-[#142E6B] max-w-[240px]">
                  <ChurchIcon className="w-3.5 h-3.5 text-[#1B449C] shrink-0" />
                  <span className="truncate">{user?.church_name || 'Iglesia Local'}</span>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-7 py-6 max-w-[1380px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
