import React, { useEffect, useState } from 'react';
import {
  CalendarCheck2,
  Download,
  FileSpreadsheet,
  FileText,
  Users,
  Wallet,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination, usePagination } from '../components/ui/Pagination';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  exportActivitiesExcel,
  exportActivitiesPDF,
  exportCensusExcel,
  exportCensusPDF,
  exportChurchFichaPDF,
  exportDirectoryExcel,
  exportFinancialExcel,
  exportFinancialPDF,
  exportPastorFichaPDF,
} from '../lib/export';
import { CATEGORY_LABEL_MAP, formatCOP, formatDate } from '../lib/format';
import type { CensusTable, Church, District, FinancialTransaction, Pastor } from '../types';

export function ReportsPage() {
  const { isDistrictAdmin, selectedChurchId } = useAuth();
  const [activeTab, setActiveTab] = useState<'financial' | 'census' | 'activities' | 'directory'>('financial');

  const [startDate, setStartDate] = useState('2026-06-01');
  const [endDate, setEndDate] = useState('2026-11-30');
  const [finReport, setFinReport] = useState<{
    district: District;
    church: Church | null;
    period: { start_date: string; end_date: string };
    summary: { total_income: number; total_expense: number; net_balance: number; transactions_count: number };
    by_category: Array<{ type: string; category: string; total: number; count: number }>;
    by_church: Array<{ church_name: string; ingresos: number; egresos: number; saldo: number }>;
    transactions: FinancialTransaction[];
  } | null>(null);

  const [censusReport, setCensusReport] = useState<{
    district: District;
    rows: Array<{ church_id: number; church_name: string; municipality: string; categorization: string; census: CensusTable }>;
    consolidated: CensusTable;
  } | null>(null);

  const [onlyDebtors, setOnlyDebtors] = useState(true);
  const [actReport, setActReport] = useState<{
    district: District;
    totals: { assigned: number; paid: number; pending: number };
    rows: Array<{
      activity_name: string;
      event_date: string;
      church_name: string;
      person_name: string;
      person_phone: string;
      is_member: number;
      item_detail: string;
      quantity: number;
      assigned_amount: number;
      paid_amount: number;
      pending_amount: number;
      attendance_status: string;
      notes: string;
    }>;
  } | null>(null);

  const [churches, setChurches] = useState<Church[]>([]);
  const [pastors, setPastors] = useState<Pastor[]>([]);
  const [district, setDistrict] = useState<District | null>(null);

  const scopeParam = isDistrictAdmin && selectedChurchId !== 'all' ? `&church_id=${selectedChurchId}` : '';

  useEffect(() => {
    if (activeTab === 'financial') {
      api
        .get<NonNullable<typeof finReport>>(
          `/api/reports/financial?start_date=${startDate}&end_date=${endDate}${scopeParam}`
        )
        .then(setFinReport);
    } else if (activeTab === 'census') {
      api
        .get<NonNullable<typeof censusReport>>(
          `/api/reports/census?${scopeParam ? scopeParam.slice(1) : ''}`
        )
        .then(setCensusReport);
    } else if (activeTab === 'activities') {
      api
        .get<NonNullable<typeof actReport>>(
          `/api/reports/activities?only_debtors=${onlyDebtors}${scopeParam}`
        )
        .then(setActReport);
    } else if (activeTab === 'directory') {
      Promise.all([
        api.get<{ churches: Church[] }>('/api/churches'),
        api.get<{ pastors: Pastor[] }>('/api/pastors'),
        api.get<{ district: District }>('/api/district'),
      ]).then(([c, p, d]) => {
        setChurches(c.churches);
        setPastors(p.pastors);
        setDistrict(d.district);
      });
    }
  }, [activeTab, startDate, endDate, onlyDebtors, selectedChurchId, isDistrictAdmin]);

  const actPag = usePagination(actReport?.rows || [], 10);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes Oficiales"
        subtitle="Genera y descarga informes financieros, censo poblacional, cartera de actividades y fichas institucionales en PDF y Excel."
      />

      {/* Clean Tab Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          { key: 'financial', label: 'Financiero', desc: 'Ingresos, egresos y balances', icon: <Wallet className="w-4 h-4" /> },
          { key: 'census', label: 'Censo Poblacional', desc: 'Tabla 1 y Tabla 2 Junta Nacional', icon: <Users className="w-4 h-4" /> },
          { key: 'activities', label: 'Actividades y Cartera', desc: 'Saldos pendientes por persona', icon: <CalendarCheck2 className="w-4 h-4" /> },
          { key: 'directory', label: 'Fichas Institucionales', desc: 'Iglesias y pastores en PDF / Excel', icon: <FileText className="w-4 h-4" /> },
        ].map((t) => {
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key as typeof activeTab)}
              className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                active
                  ? 'bg-gradient-to-br from-[#142E6B] to-[#1B449C] text-white border-[#142E6B] shadow-md'
                  : 'bg-white text-[#142E6B] border-[#DDE6F4] hover:border-[#1B449C]/40'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  active ? 'bg-white/15 text-[#F7C96E]' : 'bg-[#EEF4FC] text-[#1B449C]'
                }`}
              >
                {t.icon}
              </div>
              <p className="text-sm font-bold mt-3">{t.label}</p>
              <p className={`text-xs mt-0.5 ${active ? 'text-blue-100/80' : 'text-slate-500'}`}>{t.desc}</p>
            </button>
          );
        })}
      </div>

      {/* 1. FINANCIERO */}
      {activeTab === 'financial' && finReport && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="label-field">Desde</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input-field w-auto"
                />
              </div>
              <div>
                <label className="label-field">Hasta</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input-field w-auto"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => exportFinancialPDF(finReport)}
                className="btn-primary px-4 py-2 text-xs"
              >
                <Download className="w-4 h-4" /> Descargar PDF
              </button>
              <button
                type="button"
                onClick={() => exportFinancialExcel(finReport)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Descargar Excel
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 border-b border-slate-100">
            <div className="p-5">
              <p className="text-xs font-medium text-slate-500">Total ingresos</p>
              <p className="text-2xl font-bold text-emerald-700 tabular-nums mt-1">
                {formatCOP(finReport.summary.total_income)}
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs font-medium text-slate-500">Total egresos</p>
              <p className="text-2xl font-bold text-rose-600 tabular-nums mt-1">
                {formatCOP(finReport.summary.total_expense)}
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs font-medium text-slate-500">Balance neto del período</p>
              <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
                {formatCOP(finReport.summary.net_balance)}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-left text-xs font-medium text-slate-500">
                  <th className="py-3 px-5">Tipo</th>
                  <th className="py-3 px-4">Concepto</th>
                  <th className="py-3 px-4 text-center">Movimientos</th>
                  <th className="py-3 px-5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {finReport.by_category.map((c, idx) => (
                  <tr key={idx}>
                    <td className="py-3 px-5">
                      <Badge tone={c.type === 'INGRESO' ? 'emerald' : 'rose'}>{c.type}</Badge>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {CATEGORY_LABEL_MAP[c.category] || c.category}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-500 tabular-nums">{c.count}</td>
                    <td className="py-3 px-5 text-right font-semibold text-slate-900 tabular-nums">
                      {formatCOP(c.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. CENSO */}
      {activeTab === 'census' && censusReport && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Censo poblacional · Clasificación Junta Nacional IGLEICO
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tabla 1 (Bautizados / No Bautizados por edad) y Tabla 2 (Totales consolidados)
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => exportCensusPDF(censusReport)}
                className="btn-primary px-4 py-2 text-xs"
              >
                <Download className="w-4 h-4" /> PDF Oficial
              </button>
              <button
                type="button"
                onClick={() => exportCensusExcel(censusReport)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#142E6B] text-white text-center">
                  <th className="py-3 px-4 text-left">Iglesia</th>
                  <th className="py-2.5 px-2">0-12m</th>
                  <th className="py-2.5 px-2">1-5</th>
                  <th className="py-2.5 px-2">6-11</th>
                  <th className="py-2.5 px-2">12-14 B</th>
                  <th className="py-2.5 px-2">12-14 NB</th>
                  <th className="py-2.5 px-2">15-30 B</th>
                  <th className="py-2.5 px-2">15-30 NB</th>
                  <th className="py-2.5 px-2">31-59 B</th>
                  <th className="py-2.5 px-2">31-59 NB</th>
                  <th className="py-2.5 px-2">&gt;60 B</th>
                  <th className="py-2.5 px-2">&gt;60 NB</th>
                  <th className="py-2.5 px-2 bg-[#1B449C]">Baut.</th>
                  <th className="py-2.5 px-2 bg-[#1B449C]">No B.</th>
                  <th className="py-2.5 px-2 bg-[#1B449C]">Niños</th>
                  <th className="py-2.5 px-3 bg-[#D98A1F]">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-center tabular-nums">
                {censusReport.rows.map((r) => (
                  <tr key={r.church_id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-left font-semibold text-slate-900">{r.church_name}</td>
                    <td>{r.census.infancy_0_12m}</td>
                    <td>{r.census.infancy_1_5}</td>
                    <td>{r.census.childhood_6_11}</td>
                    <td>{r.census.adolescents_12_14_b}</td>
                    <td>{r.census.adolescents_12_14_nb}</td>
                    <td>{r.census.youth_15_30_b}</td>
                    <td>{r.census.youth_15_30_nb}</td>
                    <td>{r.census.adults_31_59_b}</td>
                    <td>{r.census.adults_31_59_nb}</td>
                    <td>{r.census.seniors_60_plus_b}</td>
                    <td>{r.census.seniors_60_plus_nb}</td>
                    <td className="font-semibold bg-slate-50">{r.census.total_baptized}</td>
                    <td className="font-semibold bg-slate-50">{r.census.total_not_baptized}</td>
                    <td className="font-semibold bg-slate-50">{r.census.total_children}</td>
                    <td className="font-bold bg-emerald-50/70 text-emerald-800">{r.census.grand_total}</td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-bold text-slate-900">
                  <td className="py-3 px-4 text-left">TOTAL CONSOLIDADO</td>
                  <td>{censusReport.consolidated.infancy_0_12m}</td>
                  <td>{censusReport.consolidated.infancy_1_5}</td>
                  <td>{censusReport.consolidated.childhood_6_11}</td>
                  <td>{censusReport.consolidated.adolescents_12_14_b}</td>
                  <td>{censusReport.consolidated.adolescents_12_14_nb}</td>
                  <td>{censusReport.consolidated.youth_15_30_b}</td>
                  <td>{censusReport.consolidated.youth_15_30_nb}</td>
                  <td>{censusReport.consolidated.adults_31_59_b}</td>
                  <td>{censusReport.consolidated.adults_31_59_nb}</td>
                  <td>{censusReport.consolidated.seniors_60_plus_b}</td>
                  <td>{censusReport.consolidated.seniors_60_plus_nb}</td>
                  <td>{censusReport.consolidated.total_baptized}</td>
                  <td>{censusReport.consolidated.total_not_baptized}</td>
                  <td>{censusReport.consolidated.total_children}</td>
                  <td className="text-emerald-800">{censusReport.consolidated.grand_total}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. ACTIVIDADES Y CARTERA */}
      {activeTab === 'activities' && actReport && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyDebtors}
                onChange={(e) => {
                  setOnlyDebtors(e.target.checked);
                  actPag.setPage(1);
                }}
              />
              Mostrar únicamente personas con saldo pendiente
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => exportActivitiesPDF({ ...actReport, onlyDebtors })}
                className="btn-primary px-4 py-2 text-xs"
              >
                <Download className="w-4 h-4" /> PDF Cartera
              </button>
              <button
                type="button"
                onClick={() => exportActivitiesExcel(actReport.rows)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-left text-xs font-medium text-slate-500">
                  <th className="py-3 px-5">Actividad</th>
                  <th className="py-3 px-4">Persona</th>
                  <th className="py-3 px-4">Detalle</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Abonado</th>
                  <th className="py-3 px-5 text-right">Saldo pendiente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {actPag.paginatedItems.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/70">
                    <td className="py-3 px-5">
                      <p className="font-semibold text-slate-900 text-xs">{r.activity_name}</p>
                      <p className="text-[11px] text-slate-400">
                        {formatDate(r.event_date)} · {r.church_name}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{r.person_name}</p>
                      <p className="text-xs text-slate-500">{r.person_phone || '—'}</p>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">{r.item_detail}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-slate-700">{formatCOP(r.assigned_amount)}</td>
                    <td className="py-3 px-4 text-right text-emerald-700 font-medium tabular-nums">
                      {formatCOP(r.paid_amount)}
                    </td>
                    <td className="py-3 px-5 text-right tabular-nums">
                      {r.pending_amount > 0 ? (
                        <Badge tone="rose">{formatCOP(r.pending_amount)}</Badge>
                      ) : (
                        <Badge tone="emerald">Al día</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={actPag.page}
            totalPages={actPag.totalPages}
            totalItems={actPag.totalItems}
            pageSize={actPag.pageSize}
            onPageChange={actPag.setPage}
            onPageSizeChange={actPag.setPageSize}
          />
        </div>
      )}

      {/* 4. FICHAS */}
      {activeTab === 'directory' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Directorio consolidado del Distrito Sabana</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Exporta todas las iglesias y pastores en un archivo Excel, o descarga cada ficha oficial en PDF.
              </p>
            </div>
            <button
              type="button"
              onClick={() => exportDirectoryExcel(churches, pastors)}
              className="btn-primary px-4 py-2 text-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Exportar directorio Excel
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
              <h4 className="text-sm font-bold text-slate-900 mb-3">Fichas de Iglesias (PDF)</h4>
              <div className="divide-y divide-slate-100">
                {churches.map((c) => (
                  <div key={c.id} className="py-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.municipality}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => exportChurchFichaPDF(c, district)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
              <h4 className="text-sm font-bold text-slate-900 mb-3">Fichas de Pastores (PDF)</h4>
              <div className="divide-y divide-slate-100">
                {pastors.map((p) => (
                  <div key={p.id} className="py-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{p.full_name}</p>
                      <p className="text-xs text-slate-500">{p.church_name || 'Distrito Sabana'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => exportPastorFichaPDF(p, district)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
