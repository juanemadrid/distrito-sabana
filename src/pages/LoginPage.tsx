import React, { useState } from 'react';
import { ArrowRight, CalendarCheck2, ChevronDown, ChevronUp, FileBarChart2, Lock, User, Wallet } from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showDemoHelp, setShowDemoHelp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Usuario o contraseña incorrectos.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillAndSubmit = async (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError('');
    setSubmitting(true);
    try {
      await login(u, p);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-12 bg-[#F4F7FC]">
      {/* Left IGLEICO Royal Cobalt Institutional Showcase */}
      <div className="hidden lg:flex lg:col-span-6 xl:col-span-5 bg-gradient-to-br from-[#0E214D] via-[#142E6B] to-[#1B449C] text-white p-11 xl:p-12 flex-col justify-between relative overflow-hidden">
        {/* Subtle decorative globe arcs matching the IGLEICO emblem */}
        <svg
          className="absolute -right-28 -bottom-28 w-[460px] h-[460px] text-white/[0.06] pointer-events-none"
          viewBox="0 0 200 200"
          fill="none"
        >
          <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1.2" />
          <ellipse cx="100" cy="100" rx="48" ry="90" stroke="currentColor" strokeWidth="1" />
          <line x1="10" y1="100" x2="190" y2="100" stroke="currentColor" strokeWidth="1" />
          <line x1="18" y1="62" x2="182" y2="62" stroke="currentColor" strokeWidth="1" />
          <line x1="18" y1="138" x2="182" y2="138" stroke="currentColor" strokeWidth="1" />
        </svg>
        <div
          className="absolute -left-20 -top-20 w-80 h-80 rounded-full opacity-25 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #D98A1F 0%, transparent 70%)' }}
        />

        {/* Top Official Logo Crest */}
        <div className="relative z-10 flex items-center gap-4">
          <BrandMark size={74} variant="crest" className="p-2.5 rounded-2xl" />
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D98A1F]/20 border border-[#E59B2E]/40 text-[11px] font-bold tracking-[0.14em] uppercase text-[#F7C96E]">
              Distrito Sabana · Colombia
            </span>
            <h1 className="text-xl font-extrabold text-white leading-snug mt-1.5">
              IGLEICO
            </h1>
            <p className="text-xs text-blue-100/80">
              Iglesia Evangélica Interamericana de Colombia
            </p>
          </div>
        </div>

        {/* Center Hero */}
        <div className="relative z-10 space-y-6 my-8">
          <div className="w-12 h-1 rounded-full bg-gradient-to-r from-[#D98A1F] to-[#D81E27]" />
          <h2 className="text-3xl xl:text-[34px] font-extrabold tracking-tight leading-[1.18] text-white">
            Administración eclesial y financiera con orden y transparencia.
          </h2>
          <p className="text-sm text-blue-100/80 leading-relaxed max-w-md">
            Plataforma oficial del <strong>Distrito Sabana</strong> para gestionar congregaciones, hojas de vida pastorales, actividades, diezmos e informes consolidados.
          </p>

          <div className="space-y-2.5 pt-1">
            <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/8 border border-white/10 backdrop-blur-xs">
              <div className="w-9 h-9 rounded-lg bg-[#D98A1F]/20 text-[#F7C96E] flex items-center justify-center shrink-0">
                <CalendarCheck2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Actividades y control de cartera</p>
                <p className="text-[11px] text-blue-100/75">Asistencia, compromisos, abonos y saldos pendientes</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/8 border border-white/10 backdrop-blur-xs">
              <div className="w-9 h-9 rounded-lg bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Tesorería local y distrital</p>
                <p className="text-[11px] text-blue-100/75">Diezmos, ofrendas, egresos y cuentas por pagar</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/8 border border-white/10 backdrop-blur-xs">
              <div className="w-9 h-9 rounded-lg bg-[#D81E27]/25 text-red-200 flex items-center justify-center shrink-0">
                <FileBarChart2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Reportes oficiales en PDF y Excel</p>
                <p className="text-[11px] text-blue-100/75">Fichas IGLEICO, balances y censo Junta Nacional</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Organisms */}
        <div className="relative z-10 pt-5 border-t border-white/15 flex items-center justify-between text-xs text-blue-200/75">
          <span>Organismos: <strong className="text-white">UCEI · UDEI · UJEI · UNEI</strong></span>
          <span>Distrito Sabana</span>
        </div>
      </div>

      {/* Right Sign-In Column */}
      <div className="flex-1 lg:col-span-6 xl:col-span-7 flex flex-col justify-center items-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[430px] bg-white rounded-3xl shadow-[0_12px_40px_rgba(20,46,107,0.09)] border border-[#DDE6F4] overflow-hidden">
          <div className="h-1.5 w-full igleico-stripe" />

          <div className="p-7 sm:p-9">
            {/* Logo Emblem centered neatly above title */}
            <div className="flex flex-col items-center text-center mb-7">
              <BrandMark size={84} variant="raw" className="mb-3" />
              <h2 className="text-2xl font-extrabold text-[#142E6B] tracking-tight">
                Distrito Sabana
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Ingresa tus credenciales para acceder al sistema
              </p>
            </div>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-[#D81E27]">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-field">Usuario o correo electrónico</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#1B449C]/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ingresa tu usuario"
                    className="input-field pl-10 py-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="label-field">Contraseña</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#1B449C]/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field pl-10 py-2.5"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full py-3 px-4 text-sm mt-2"
              >
                <span>{submitting ? 'Verificando acceso...' : 'Iniciar sesión'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Discreet collapsible demo credentials (hidden by default) */}
            <div className="mt-7 pt-5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDemoHelp((v) => !v)}
                className="w-full flex items-center justify-between text-xs font-medium text-slate-400 hover:text-[#1B449C] transition cursor-pointer"
              >
                <span>Credenciales de evaluación</span>
                {showDemoHelp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showDemoHelp && (
                <div className="mt-3 rounded-xl border border-[#DDE6F4] bg-[#F8FAFE] divide-y divide-[#E4ECF7] text-xs overflow-hidden">
                  {[
                    { label: 'Directiva Distrito Sabana', u: 'distrito', p: 'sabana2026' },
                    { label: 'Pastor Local · El Redentor', u: 'elredentor', p: 'redentor2026' },
                    { label: 'Tesorería · El Redentor', u: 'tesoreria', p: 'tesoreria2026' },
                  ].map((acc) => (
                    <div key={acc.u} className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[#142E6B]">{acc.label}</p>
                        <p className="text-[11px] font-mono text-slate-500">
                          {acc.u} / {acc.p}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => fillAndSubmit(acc.u, acc.p)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#C9DAF7] hover:bg-[#1B449C] hover:text-white text-[#142E6B] font-semibold cursor-pointer transition"
                      >
                        Entrar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
