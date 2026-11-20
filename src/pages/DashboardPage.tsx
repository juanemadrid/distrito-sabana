import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CalendarCheck2,
  Church as ChurchIcon,
  FileBarChart2,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BrandMark } from '../components/BrandMark';
import type { NavKey } from '../components/Layout';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/ui/Badge';
import { Pagination, usePagination } from '../components/ui/Pagination';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  CATEGORIZATION_LABELS,
  CATEGORY_LABEL_MAP,
  formatCOP,
  formatDate,
  formatMonthLabel,
} from '../lib/format';
import type { CensusTable, District } from '../types';

interface DashboardPayload {
  district: District;
  current_month: string;
  kpis: {
    churches_total: number;
    constituidas: number;
    en_formacion: number;
    campos_predicacion: number;
    pastors_total: number;
    members_total: number;
    baptized_total: number;
    not_baptized_total: number;
    children_total: number;
    month_income: number;
    month_expense: number;
    month_balance: number;
    accumulated_balance: number;
    activity_assigned: number;
    activity_paid: number;
    activity_pending: number;
    debtors_count: number;
    loans_remaining: number;
  };
  census: CensusTable;
  monthly_series: Array<{ month: string; ingresos: number; egresos: number }>;
  income_by_category: Array<{ category: string; total: number }>;
  active_activities: Array<{
    id: number;
    name: string;
    scope: string;
    organism: string;
    event_date: string;
    church_name: string | null;
    goal_amount: number;
    participants_count: number;
    total_assigned: number;
    total_paid: number;
    total_pending: number;
  }>;
  top_debtors: Array<{
    id: number;
    person_name: string;
    person_phone: string;
    item_detail: string;
    assigned_amount: number;
    paid_amount: number;
    pending_amount: number;
    activity_id: number;
    activity_name: string;
    church_name: string | null;
  }>;
  churches_summary: Array<{
    id: number;
    name: string;
    municipality: string;
    zone_name: string;
    categorization: string;
    pastor_name: string;
    members_total: number;
    baptized: number;
    month_income: number;
    month_expense: number;
    activity_pending: number;
  }>;
}

export function DashboardPage({
  onNavigate,
  onOpenChurch,
}: {
  onNavigate: (nav: NavKey) => void;
  onOpenChurch?: (churchId: number) => void;
}) {
  const { selectedChurchId, isDistrictAdmin } = useAuth();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const qs = isDistrictAdmin && selectedChurchId !== 'all' ? `?church_id=${selectedChurchId}` : '';
    api
      .get<DashboardPayload>(`/api/dashboard${qs}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [selectedChurchId, isDistrictAdmin]);

  const churchesPag = usePagination(data?.churches_summary || [], 5);

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-white rounded-2xl border border-[#DDE6F4]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-32 bg-white rounded-2xl border border-[#DDE6F4]" />
          ))}
        </div>
      </div>
    );
  }

  const { kpis } = data;
  const chartData = data.monthly_series.map((m) => ({
    ...m,
    label: formatMonthLabel(m.month),
  }));
  const maxCategoryTotal = Math.max(...data.income_by_category.map((c) => c.total), 1);

  return (
    <div className="space-y-6">
      {/* Executive IGLEICO Institutional Welcome Banner */}
      <div className="relative overflow-hidden bg-white rounded-2xl border border-[#DDE6F4] p-5 sm:p-6 shadow-[0_2px_10px_rgba(20,46,107,0.05)]">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#1B449C] via-[#D98A1F] to-[#D81E27]" />
        <div className="pl-2 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <BrandMark size={56} variant="raw" className="hidden sm:block" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge tone="navy">IGLEICO · {data.district.name}</Badge>
                <Badge tone="amber">{formatMonthLabel(data.current_month)}</Badge>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#142E6B] mt-1.5 leading-tight">
                {isDistrictAdmin && selectedChurchId === 'all'
                  ? 'Panel General del Distrito Sabana'
                  : data.churches_summary[0]?.name || 'Panel Principal'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Ministro Distrital: <strong className="text-slate-700">{data.district.minister_name}</strong> · Tesorería:{' '}
                <strong className="text-slate-700">{data.district.treasurer_name}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#C9DAF7] bg-[#F8FAFE] hover:bg-[#EEF4FC] text-[#142E6B] text-xs font-bold transition cursor-pointer"
            >
              <FileBarChart2 className="w-4 h-4 text-[#1B449C]" />
              Reportes
            </button>
            <button
              type="button"
              onClick={() => onNavigate('finance')}
              className="btn-gold px-3.5 py-2 text-xs"
            >
              <Wallet className="w-4 h-4" />
              Finanzas / Diezmos
            </button>
            <button
              type="button"
              onClick={() => onNavigate('activities')}
              className="btn-primary px-4 py-2 text-xs"
            >
              <CalendarCheck2 className="w-4 h-4" />
              Actividades
            </button>
          </div>
        </div>
      </div>

      {/* 4 Brand-Aligned KPI Cards (Full unwrapped subtitles) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Ingresos del mes"
          value={formatCOP(kpis.month_income)}
          subtitle={`Egresos: ${formatCOP(kpis.month_expense)} · Neto: ${formatCOP(kpis.month_balance)}`}
          icon={<TrendingUp className="w-5 h-5" />}
          tone="emerald"
          onClick={() => onNavigate('finance')}
        />
        <StatCard
          title="Cartera por cobrar"
          value={formatCOP(kpis.activity_pending)}
          subtitle={`${kpis.debtors_count} saldo(s) pendiente(s) en actividades activas`}
          icon={<AlertCircle className="w-5 h-5" />}
          tone={kpis.activity_pending > 0 ? 'rose' : 'emerald'}
          onClick={() => onNavigate('activities')}
        />
        <StatCard
          title="Membresía activa"
          value={kpis.members_total}
          subtitle={`${kpis.baptized_total} bautizados · ${kpis.not_baptized_total} no baut. · ${kpis.children_total} niños`}
          icon={<Users className="w-5 h-5" />}
          tone="neutral"
          onClick={() => onNavigate('members')}
        />
        <StatCard
          title={isDistrictAdmin && selectedChurchId === 'all' ? 'Iglesias del distrito' : 'Balance acumulado'}
          value={
            isDistrictAdmin && selectedChurchId === 'all'
              ? `${kpis.churches_total} Iglesias`
              : formatCOP(kpis.accumulated_balance)
          }
          subtitle={
            isDistrictAdmin && selectedChurchId === 'all'
              ? `${kpis.constituidas} constituidas · ${kpis.en_formacion} formación · ${kpis.pastors_total} pastores`
              : kpis.loans_remaining > 0
              ? `Cuentas por pagar: ${formatCOP(kpis.loans_remaining)}`
              : 'Sin cuentas por pagar activas'
          }
          icon={<ChurchIcon className="w-5 h-5" />}
          tone="amber"
          onClick={() => onNavigate(isDistrictAdmin ? 'churches' : 'finance')}
        />
      </div>

      {/* Main Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#DDE6F4] p-6 shadow-[0_2px_8px_rgba(20,46,107,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
            <div>
              <h2 className="text-base font-bold text-[#142E6B]">Flujo financiero semestral</h2>
              <p className="text-xs text-slate-500 mt-0.5">Comparativo mensual de ingresos y egresos (COP)</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1B449C]" />
                Ingresos
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D98A1F]" />
                Egresos
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={6} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#EBF1FA" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickFormatter={(v) => `${(Number(v) / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  cursor={{ fill: '#F4F7FC' }}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #C9DAF7',
                    boxShadow: '0 10px 25px -5px rgba(20,46,107,0.12)',
                    fontSize: '12px',
                  }}
                  formatter={(val) => formatCOP(Number(val))}
                />
                <Bar dataKey="ingresos" name="Ingresos" fill="#1B449C" radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Bar dataKey="egresos" name="Egresos" fill="#D98A1F" radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Income Breakdown (No truncated labels) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#DDE6F4] p-6 shadow-[0_2px_8px_rgba(20,46,107,0.04)] flex flex-col">
          <div className="mb-5">
            <h2 className="text-base font-bold text-[#142E6B]">Ingresos por concepto</h2>
            <p className="text-xs text-slate-500 mt-0.5">{formatMonthLabel(data.current_month)}</p>
          </div>

          {data.income_by_category.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
              Sin ingresos registrados en este mes.
            </div>
          ) : (
            <div className="space-y-4 flex-1">
              {data.income_by_category.map((cat) => {
                const widthPct = Math.max(8, Math.round((cat.total / maxCategoryTotal) * 100));
                const sharePct =
                  kpis.month_income > 0 ? Math.round((cat.total / kpis.month_income) * 100) : 0;
                return (
                  <div key={cat.category} className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-700 leading-snug">
                        {CATEGORY_LABEL_MAP[cat.category] || cat.category}
                      </span>
                      <span className="font-bold text-[#142E6B] tabular-nums shrink-0">
                        {formatCOP(cat.total)}{' '}
                        <span className="text-slate-400 font-normal">({sharePct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#EEF4FC] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#142E6B] to-[#1B449C]"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Operational Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-[#DDE6F4] p-6 shadow-[0_2px_8px_rgba(20,46,107,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[#142E6B]">Actividades en curso</h2>
              <p className="text-xs text-slate-500 mt-0.5">Avance de recaudo respecto a la meta</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('activities')}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#1B449C] hover:text-[#142E6B] cursor-pointer"
            >
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {data.active_activities.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No hay actividades activas.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.active_activities.slice(0, 4).map((a) => {
                const denom = a.goal_amount > 0 ? a.goal_amount : Math.max(a.total_assigned, 1);
                const pct = Math.min(100, Math.round((a.total_paid / denom) * 100));
                return (
                  <div
                    key={a.id}
                    onClick={() => onNavigate('activities')}
                    className="py-3.5 first:pt-0 last:pb-0 cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 group-hover:text-[#1B449C] transition truncate">
                          {a.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {a.scope === 'DISTRITAL' ? 'Distrital' : a.church_name} · {formatDate(a.event_date)} ·{' '}
                          {a.participants_count} pers.
                        </p>
                      </div>
                      <div className="text-right shrink-0 tabular-nums">
                        <p className="text-sm font-bold text-[#142E6B]">{formatCOP(a.total_paid)}</p>
                        {a.total_pending > 0 && (
                          <p className="text-[11px] font-semibold text-[#D81E27]">
                            Pendiente: {formatCOP(a.total_pending)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2.5">
                      <div className="flex-1 h-2 rounded-full bg-[#EEF4FC] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#1B449C] to-[#D98A1F]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-[#142E6B] tabular-nums w-9 text-right">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-[#DDE6F4] p-6 shadow-[0_2px_8px_rgba(20,46,107,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[#142E6B]">Saldos pendientes en actividades</h2>
              <p className="text-xs text-slate-500 mt-0.5">Seguimiento rápido de cartera por cobrar</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('activities')}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#D81E27] hover:underline cursor-pointer"
            >
              Registrar abono <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {data.top_debtors.length === 0 ? (
            <div className="py-10 text-center text-xs text-emerald-700 font-medium bg-emerald-50/70 rounded-xl border border-emerald-100">
              No hay saldos pendientes por cobrar en actividades activas.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.top_debtors.slice(0, 5).map((d) => (
                <div key={d.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{d.person_name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {d.activity_name} {d.item_detail ? `· ${d.item_detail}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge tone="rose" className="tabular-nums">
                      Debe {formatCOP(d.pending_amount)}
                    </Badge>
                    <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                      Abonó {formatCOP(d.paid_amount)} de {formatCOP(d.assigned_amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Paginated Churches Summary Table */}
      {isDistrictAdmin && data.churches_summary.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#DDE6F4] shadow-[0_2px_8px_rgba(20,46,107,0.04)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E4ECF7] flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#142E6B]">Resumen por iglesia · Distrito Sabana</h2>
              <p className="text-xs text-slate-500 mt-0.5">Selecciona cualquier congregación para ver su ficha completa</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('churches')}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#1B449C] hover:text-[#142E6B] cursor-pointer"
            >
              Ir a Iglesias <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F8FAFE] border-b border-[#E4ECF7] text-left text-xs font-semibold text-[#142E6B]/75">
                  <th className="py-3 px-5">Iglesia</th>
                  <th className="py-3 px-3">Categoría</th>
                  <th className="py-3 px-3">Pastor / Líder</th>
                  <th className="py-3 px-3 text-right">Miembros</th>
                  <th className="py-3 px-3 text-right">Ingresos mes</th>
                  <th className="py-3 px-3 text-right">Egresos mes</th>
                  <th className="py-3 px-5 text-right">Por cobrar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {churchesPag.paginatedItems.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => (onOpenChurch ? onOpenChurch(c.id) : onNavigate('churches'))}
                    className="hover:bg-[#F4F7FC] transition cursor-pointer"
                  >
                    <td className="py-3.5 px-5">
                      <p className="font-semibold text-[#142E6B]">{c.name}</p>
                      <p className="text-xs text-slate-500">
                        {c.municipality}
                        {c.zone_name ? ` · ${c.zone_name}` : ''}
                      </p>
                    </td>
                    <td className="py-3.5 px-3">
                      <Badge
                        tone={
                          c.categorization === 'CONSTITUIDA'
                            ? 'emerald'
                            : c.categorization === 'EN_FORMACION'
                            ? 'amber'
                            : 'sky'
                        }
                      >
                        {CATEGORIZATION_LABELS[c.categorization] || c.categorization}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-3 text-slate-700 text-xs font-medium">{c.pastor_name}</td>
                    <td className="py-3.5 px-3 text-right tabular-nums whitespace-nowrap">
                      <span className="font-bold text-[#142E6B]">{c.members_total}</span>
                      <span className="text-xs text-slate-400 ml-1">({c.baptized} B)</span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-semibold text-emerald-700 tabular-nums whitespace-nowrap">
                      {formatCOP(c.month_income)}
                    </td>
                    <td className="py-3.5 px-3 text-right text-slate-600 tabular-nums whitespace-nowrap">
                      {formatCOP(c.month_expense)}
                    </td>
                    <td className="py-3.5 px-5 text-right tabular-nums whitespace-nowrap">
                      {c.activity_pending > 0 ? (
                        <span className="font-bold text-[#D81E27]">{formatCOP(c.activity_pending)}</span>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-600">Al día</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={churchesPag.page}
            totalPages={churchesPag.totalPages}
            totalItems={churchesPag.totalItems}
            pageSize={churchesPag.pageSize}
            onPageChange={churchesPag.setPage}
            onPageSizeChange={churchesPag.setPageSize}
            pageSizeOptions={[5, 10, 20]}
          />
        </div>
      )}
    </div>
  );
}
