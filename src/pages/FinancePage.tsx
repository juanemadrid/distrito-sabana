import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Coins,
  CreditCard,
  HandCoins,
  Plus,
  Search,
  Trash2,
  Wallet,
} from 'lucide-react';
import { MemberPicker } from '../components/MemberPicker';
import { Modal } from '../components/Modal';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/ui/Badge';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination, usePagination } from '../components/ui/Pagination';
import { useFeedback } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  CATEGORY_LABEL_MAP,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
  formatCOP,
  formatDate,
} from '../lib/format';
import type { DebtLoan, FinancialTransaction, Member } from '../types';

export function FinancePage() {
  const { user, churches, isDistrictAdmin, selectedChurchId } = useAuth();
  const { notify, confirm } = useFeedback();

  const [tab, setTab] = useState<'all' | 'tithes' | 'loans'>('all');
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [summary, setSummary] = useState({
    total_income: 0,
    total_expense: 0,
    balance: 0,
    total_tithes: 0,
    total_offerings: 0,
    total_activities: 0,
    count: 0,
  });
  const [loans, setLoans] = useState<DebtLoan[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>('2026-11');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [catFilter, setCatFilter] = useState<string>('ALL');

  // Modals
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [payLoan, setPayLoan] = useState<DebtLoan | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [txForm, setTxForm] = useState({
    type: 'INGRESO' as 'INGRESO' | 'EGRESO',
    scope: 'LOCAL' as 'LOCAL' | 'DISTRITAL',
    church_id: user?.church_id ? String(user.church_id) : '',
    category: 'DIEZMO',
    amount: '',
    tx_date: new Date().toISOString().slice(0, 10),
    description: '',
    member_id: null as number | null,
    person_name: '',
    payment_method: 'EFECTIVO',
    receipt_number: '',
  });

  const [loanForm, setLoanForm] = useState({
    church_id: user?.church_id ? String(user.church_id) : '',
    creditor: '',
    initial_amount: '',
    remaining_amount: '',
    start_date: new Date().toISOString().slice(0, 10),
    term_description: '',
    seniority_text: '',
    notes: '',
  });

  const [loanPayForm, setLoanPayForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: 'TRANSFERENCIA',
    record_in_finance: true,
  });

  const loadFinance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (isDistrictAdmin && selectedChurchId !== 'all') params.set('church_id', selectedChurchId);
      if (monthFilter !== 'ALL') params.set('month', monthFilter);
      if (tab === 'tithes') {
        params.set('type', 'INGRESO');
        params.set('category', 'DIEZMO');
      } else {
        if (typeFilter !== 'ALL') params.set('type', typeFilter);
        if (catFilter !== 'ALL') params.set('category', catFilter);
      }

      const [txRes, loanRes] = await Promise.all([
        api.get<{ transactions: FinancialTransaction[]; summary: typeof summary }>(
          `/api/finance/transactions?${params.toString()}`
        ),
        api.get<{ loans: DebtLoan[] }>(
          `/api/finance/loans${isDistrictAdmin && selectedChurchId !== 'all' ? `?church_id=${selectedChurchId}` : ''}`
        ),
      ]);
      setTransactions(txRes.transactions);
      setSummary(txRes.summary);
      setLoans(loanRes.loans);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinance();
  }, [selectedChurchId, isDistrictAdmin, monthFilter, typeFilter, catFilter, tab]);

  const filteredTx = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(
      (t) =>
        (t.person_name || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.receipt_number || '').toLowerCase().includes(q) ||
        (t.church_name || '').toLowerCase().includes(q)
    );
  }, [transactions, search]);

  const txPag = usePagination(filteredTx, 10);

  const loadMembersForChurch = async (churchIdStr: string) => {
    const qs = churchIdStr ? `?church_id=${churchIdStr}` : '';
    const mRes = await api.get<{ members: Member[] }>(`/api/members${qs}`);
    setMembers(mRes.members);
  };

  const openTxModal = async (type: 'INGRESO' | 'EGRESO', presetCategory?: string) => {
    setErrorMsg('');
    const defaultChurch =
      !isDistrictAdmin && user?.church_id
        ? String(user.church_id)
        : selectedChurchId !== 'all'
        ? selectedChurchId
        : churches[0]
        ? String(churches[0].id)
        : '';

    setTxForm({
      type,
      scope: 'LOCAL',
      church_id: defaultChurch,
      category: presetCategory || (type === 'INGRESO' ? 'DIEZMO' : 'SERVICIOS_PUBLICOS'),
      amount: '',
      tx_date: new Date().toISOString().slice(0, 10),
      description: '',
      member_id: null,
      person_name: '',
      payment_method: 'EFECTIVO',
      receipt_number: '',
    });
    await loadMembersForChurch(defaultChurch);
    setTxModalOpen(true);
  };

  const handleSaveTx = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      await api.post('/api/finance/transactions', {
        ...txForm,
        church_id: txForm.scope === 'DISTRITAL' ? null : Number(txForm.church_id),
        amount: Number(txForm.amount),
      });
      setTxModalOpen(false);
      notify(txForm.type === 'INGRESO' ? 'Ingreso registrado correctamente.' : 'Egreso registrado correctamente.');
      await loadFinance();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo guardar el movimiento.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTx = async (t: FinancialTransaction) => {
    const ok = await confirm({
      title: 'Eliminar movimiento',
      message: `¿Deseas eliminar el registro ${t.receipt_number} por ${formatCOP(t.amount)}?`,
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    await api.del(`/api/finance/transactions/${t.id}`);
    notify('Movimiento eliminado.');
    await loadFinance();
  };

  const handleSaveLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      await api.post('/api/finance/loans', {
        ...loanForm,
        church_id: Number(loanForm.church_id),
        initial_amount: Number(loanForm.initial_amount),
        remaining_amount: loanForm.remaining_amount
          ? Number(loanForm.remaining_amount)
          : Number(loanForm.initial_amount),
      });
      setLoanModalOpen(false);
      notify('Cuenta por pagar registrada.');
      await loadFinance();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al registrar préstamo.');
    } finally {
      setSaving(false);
    }
  };

  const handlePayLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payLoan) return;
    setSaving(true);
    setErrorMsg('');
    try {
      await api.post(`/api/finance/loans/${payLoan.id}/pay`, {
        amount: Number(loanPayForm.amount),
        payment_date: loanPayForm.payment_date,
        payment_method: loanPayForm.payment_method,
        record_in_finance: loanPayForm.record_in_finance,
      });
      setPayLoan(null);
      notify('Abono aplicado al préstamo.');
      await loadFinance();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al registrar abono.');
    } finally {
      setSaving(false);
    }
  };

  const categoriesForCurrentType =
    txForm.type === 'INGRESO' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finanzas y Diezmos"
        subtitle="Libro de tesorería, control de diezmos, ofrendas, gastos operativos y cuentas por pagar."
        actions={
          <>
            <button
              type="button"
              onClick={() => openTxModal('EGRESO')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#C9DAF7] bg-white hover:bg-[#F8FAFE] text-[#142E6B] text-xs sm:text-sm font-semibold cursor-pointer transition"
            >
              <ArrowDownCircle className="w-4 h-4 text-[#D81E27]" />
              Registrar egreso
            </button>
            <button
              type="button"
              onClick={() => openTxModal('INGRESO', 'DIEZMO')}
              className="btn-primary px-4 py-2.5 text-xs sm:text-sm"
            >
              <ArrowUpCircle className="w-4 h-4 text-[#F7C96E]" />
              Nuevo ingreso / diezmo
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Ingresos del período"
          value={formatCOP(summary.total_income)}
          subtitle={`Diezmos: ${formatCOP(summary.total_tithes)} · Ofrendas: ${formatCOP(summary.total_offerings)}`}
          icon={<ArrowUpCircle className="w-[18px] h-[18px]" />}
          tone="emerald"
        />
        <StatCard
          title="Egresos del período"
          value={formatCOP(summary.total_expense)}
          subtitle={`${summary.count} movimientos registrados`}
          icon={<ArrowDownCircle className="w-[18px] h-[18px]" />}
          tone="rose"
        />
        <StatCard
          title="Balance neto"
          value={formatCOP(summary.balance)}
          subtitle={summary.balance >= 0 ? 'Resultado positivo' : 'Resultado negativo'}
          icon={<Wallet className="w-[18px] h-[18px]" />}
          tone="neutral"
        />
        <StatCard
          title="Recaudo actividades"
          value={formatCOP(summary.total_activities)}
          subtitle={`Préstamos activos: ${formatCOP(
            loans.filter((l) => l.status === 'ACTIVO').reduce((s, l) => s + l.remaining_amount, 0)
          )}`}
          icon={<HandCoins className="w-[18px] h-[18px]" />}
          tone="amber"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
        <div className="px-5 pt-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex gap-6 overflow-x-auto">
            {[
              { key: 'all', label: 'Movimientos' },
              { key: 'tithes', label: 'Control de diezmos' },
              { key: 'loans', label: `Cuentas por pagar (${loans.length})` },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTab(t.key as typeof tab);
                  txPag.setPage(1);
                }}
                className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap cursor-pointer transition ${
                  tab === t.key
                    ? 'border-[#1B449C] text-[#142E6B]'
                    : 'border-transparent text-slate-500 hover:text-[#142E6B]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab !== 'loans' ? (
            <div className="flex flex-wrap items-center gap-2 pb-3">
              <div className="relative">
                <Search className="w-4 h-4 text-[#1B449C]/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    txPag.setPage(1);
                  }}
                  placeholder="Buscar recibo o persona..."
                  className="input-field pl-10 py-1.5 text-xs w-52"
                />
              </div>

              <select
                value={monthFilter}
                onChange={(e) => {
                  setMonthFilter(e.target.value);
                  txPag.setPage(1);
                }}
                className="input-field w-auto py-1.5 text-xs font-medium"
              >
                <option value="ALL">Todos los meses</option>
                <option value="2026-11">Noviembre 2026</option>
                <option value="2026-10">Octubre 2026</option>
                <option value="2026-09">Septiembre 2026</option>
                <option value="2026-08">Agosto 2026</option>
                <option value="2026-07">Julio 2026</option>
                <option value="2026-06">Junio 2026</option>
              </select>

              {tab === 'all' && (
                <>
                  <select
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value);
                      txPag.setPage(1);
                    }}
                    className="input-field w-auto py-1.5 text-xs font-medium"
                  >
                    <option value="ALL">Ingresos y egresos</option>
                    <option value="INGRESO">Solo ingresos</option>
                    <option value="EGRESO">Solo egresos</option>
                  </select>
                  <select
                    value={catFilter}
                    onChange={(e) => {
                      setCatFilter(e.target.value);
                      txPag.setPage(1);
                    }}
                    className="input-field w-auto py-1.5 text-xs font-medium max-w-[180px]"
                  >
                    <option value="ALL">Todas las categorías</option>
                    {[...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES].map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          ) : (
            <div className="pb-3">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setLoanForm({
                    church_id:
                      !isDistrictAdmin && user?.church_id
                        ? String(user.church_id)
                        : selectedChurchId !== 'all'
                        ? selectedChurchId
                        : churches[0]
                        ? String(churches[0].id)
                        : '',
                    creditor: '',
                    initial_amount: '',
                    remaining_amount: '',
                    start_date: new Date().toISOString().slice(0, 10),
                    term_description: '',
                    seniority_text: '',
                    notes: '',
                  });
                  setLoanModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Nuevo préstamo
              </button>
            </div>
          )}
        </div>

        {tab !== 'loans' ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80 text-left text-xs font-medium text-slate-500">
                    <th className="py-3 px-5">Fecha / Recibo</th>
                    <th className="py-3 px-4">Iglesia</th>
                    <th className="py-3 px-4">Concepto</th>
                    <th className="py-3 px-4">Persona / Detalle</th>
                    <th className="py-3 px-4">Método</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                    <th className="py-3 px-5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                        Cargando movimientos...
                      </td>
                    </tr>
                  ) : txPag.paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-sm text-slate-400">
                        No se encontraron movimientos con los filtros actuales.
                      </td>
                    </tr>
                  ) : (
                    txPag.paginatedItems.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <p className="text-xs font-semibold text-slate-800">{formatDate(t.tx_date)}</p>
                          <p className="text-[11px] font-mono text-slate-400">{t.receipt_number}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge tone={t.scope === 'DISTRITAL' ? 'amber' : 'neutral'}>
                            {t.scope === 'DISTRITAL' ? 'Distrito Sabana' : t.church_name || 'Local'}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge tone={t.type === 'INGRESO' ? 'emerald' : 'rose'}>
                            {CATEGORY_LABEL_MAP[t.category] || t.category}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4">
                          {t.person_name && <p className="font-semibold text-slate-900 text-xs">{t.person_name}</p>}
                          <p className="text-xs text-slate-500">{t.description || '—'}</p>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">{t.payment_method}</td>
                        <td
                          className={`py-3.5 px-4 text-right font-semibold tabular-nums whitespace-nowrap ${
                            t.type === 'INGRESO' ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {t.type === 'INGRESO' ? '+' : '-'} {formatCOP(t.amount)}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteTx(t)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={txPag.page}
              totalPages={txPag.totalPages}
              totalItems={txPag.totalItems}
              pageSize={txPag.pageSize}
              onPageChange={txPag.setPage}
              onPageSizeChange={txPag.setPageSize}
            />
          </>
        ) : (
          <div className="p-5 space-y-3">
            {loans.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                No hay cuentas por pagar ni préstamos activos.
              </div>
            ) : (
              loans.map((loan) => {
                const paid = Math.max(0, loan.initial_amount - loan.remaining_amount);
                const pct = Math.min(100, Math.round((paid / Math.max(loan.initial_amount, 1)) * 100));
                return (
                  <div
                    key={loan.id}
                    className="p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CreditCard className="w-4 h-4 text-slate-500" />
                        <p className="font-semibold text-slate-900">{loan.creditor}</p>
                        <Badge tone="neutral">{loan.church_name}</Badge>
                        <Badge tone={loan.status === 'PAGADO' ? 'emerald' : 'amber'}>{loan.status}</Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        Plazo: {loan.term_description || '—'} · Antigüedad: {loan.seniority_text || '—'}
                      </p>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden max-w-md mt-2">
                        <div className="h-full bg-emerald-600" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-slate-500 tabular-nums">
                        Inicial: {formatCOP(loan.initial_amount)} · Pagado: {formatCOP(paid)} ({pct}%)
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 block">Saldo pendiente</span>
                        <span className="text-lg font-bold text-rose-600 tabular-nums">
                          {formatCOP(loan.remaining_amount)}
                        </span>
                      </div>
                      {loan.status === 'ACTIVO' && (
                        <button
                          type="button"
                          onClick={() => {
                            setErrorMsg('');
                            setPayLoan(loan);
                            setLoanPayForm({
                              amount: '',
                              payment_date: new Date().toISOString().slice(0, 10),
                              payment_method: 'TRANSFERENCIA',
                              record_in_finance: true,
                            });
                          }}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                        >
                          <Coins className="w-4 h-4" />
                          Abonar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Modal: Nuevo Movimiento */}
      <Modal
        open={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        title={txForm.type === 'INGRESO' ? 'Registrar ingreso / diezmo' : 'Registrar egreso'}
        subtitle="El registro actualiza automáticamente los saldos y reportes financieros."
        size="lg"
      >
        <form onSubmit={handleSaveTx} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setTxForm((f) => ({ ...f, type: 'INGRESO', category: 'DIEZMO' }))}
              className={`py-2 rounded-lg text-xs font-semibold cursor-pointer transition ${
                txForm.type === 'INGRESO' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Ingreso (Diezmo / Ofrenda)
            </button>
            <button
              type="button"
              onClick={() => setTxForm((f) => ({ ...f, type: 'EGRESO', category: 'SERVICIOS_PUBLICOS' }))}
              className={`py-2 rounded-lg text-xs font-semibold cursor-pointer transition ${
                txForm.type === 'EGRESO' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Egreso (Gasto / Arriendo)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {isDistrictAdmin && (
              <div>
                <label className="label-field">Nivel / Cuenta</label>
                <select
                  value={txForm.scope}
                  onChange={(e) => setTxForm((f) => ({ ...f, scope: e.target.value as 'LOCAL' | 'DISTRITAL' }))}
                  className="input-field"
                >
                  <option value="LOCAL">Iglesia local</option>
                  <option value="DISTRITAL">Tesorería Distrito Sabana</option>
                </select>
              </div>
            )}

            {isDistrictAdmin && txForm.scope === 'LOCAL' && (
              <div>
                <label className="label-field">Iglesia *</label>
                <select
                  required
                  value={txForm.church_id}
                  onChange={async (e) => {
                    const cid = e.target.value;
                    setTxForm((f) => ({ ...f, church_id: cid, member_id: null }));
                    await loadMembersForChurch(cid);
                  }}
                  className="input-field"
                >
                  <option value="">Selecciona iglesia...</option>
                  {churches.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="label-field">Concepto *</label>
              <select
                value={txForm.category}
                onChange={(e) => setTxForm((f) => ({ ...f, category: e.target.value }))}
                className="input-field"
              >
                {categoriesForCurrentType.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-field">Valor ($) *</label>
              <input
                type="number"
                required
                min="1"
                value={txForm.amount}
                onChange={(e) => setTxForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="Ej. 350000"
                className="input-field font-bold"
              />
            </div>
          </div>

          {txForm.type === 'INGRESO' && txForm.category === 'DIEZMO' && txForm.scope === 'LOCAL' ? (
            <div>
              <label className="label-field">Miembro que entrega el diezmo (opcional)</label>
              <MemberPicker
                members={members}
                selectedMemberId={txForm.member_id}
                onSelectMember={(m) =>
                  setTxForm((f) => ({
                    ...f,
                    member_id: m ? m.id : null,
                    person_name: m ? m.full_name : '',
                  }))
                }
                externalName={txForm.person_name}
                onExternalNameChange={(v) => setTxForm((f) => ({ ...f, person_name: v }))}
                externalLabel="Otro nombre / Anónimo"
              />
            </div>
          ) : (
            <div>
              <label className="label-field">
                {txForm.type === 'INGRESO' ? 'Entregado por (opcional)' : 'Beneficiario / Proveedor'}
              </label>
              <input
                type="text"
                value={txForm.person_name}
                onChange={(e) => setTxForm((f) => ({ ...f, person_name: e.target.value }))}
                className="input-field"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label-field">Fecha *</label>
              <input
                type="date"
                required
                value={txForm.tx_date}
                onChange={(e) => setTxForm((f) => ({ ...f, tx_date: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Método de pago</label>
              <select
                value={txForm.payment_method}
                onChange={(e) => setTxForm((f) => ({ ...f, payment_method: e.target.value }))}
                className="input-field"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm.value} value={pm.value}>
                    {pm.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">N° Comprobante</label>
              <input
                type="text"
                value={txForm.receipt_number}
                onChange={(e) => setTxForm((f) => ({ ...f, receipt_number: e.target.value }))}
                placeholder="Automático"
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="label-field">Descripción</label>
            <input
              type="text"
              value={txForm.description}
              onChange={(e) => setTxForm((f) => ({ ...f, description: e.target.value }))}
              className="input-field"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setTxModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar movimiento'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Nuevo Préstamo */}
      <Modal
        open={loanModalOpen}
        onClose={() => setLoanModalOpen(false)}
        title="Registrar cuenta por pagar / préstamo"
        size="md"
      >
        <form onSubmit={handleSaveLoan} className="space-y-3.5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
              {errorMsg}
            </div>
          )}
          {isDistrictAdmin && (
            <div>
              <label className="label-field">Iglesia *</label>
              <select
                required
                value={loanForm.church_id}
                onChange={(e) => setLoanForm((f) => ({ ...f, church_id: e.target.value }))}
                className="input-field"
              >
                <option value="">Selecciona...</option>
                {churches.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label-field">Acreedor *</label>
            <input
              type="text"
              required
              value={loanForm.creditor}
              onChange={(e) => setLoanForm((f) => ({ ...f, creditor: e.target.value }))}
              className="input-field"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Valor inicial ($) *</label>
              <input
                type="number"
                required
                min="1"
                value={loanForm.initial_amount}
                onChange={(e) => setLoanForm((f) => ({ ...f, initial_amount: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Saldo pendiente ($)</label>
              <input
                type="number"
                min="0"
                value={loanForm.remaining_amount}
                onChange={(e) => setLoanForm((f) => ({ ...f, remaining_amount: e.target.value }))}
                className="input-field"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Plazo para cancelar</label>
              <input
                type="text"
                value={loanForm.term_description}
                onChange={(e) => setLoanForm((f) => ({ ...f, term_description: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Antigüedad</label>
              <input
                type="text"
                value={loanForm.seniority_text}
                onChange={(e) => setLoanForm((f) => ({ ...f, seniority_text: e.target.value }))}
                className="input-field"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setLoanModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold cursor-pointer"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Abonar a préstamo */}
      <Modal
        open={Boolean(payLoan)}
        onClose={() => setPayLoan(null)}
        title="Abonar a préstamo"
        subtitle={payLoan ? `${payLoan.creditor} · Pendiente: ${formatCOP(payLoan.remaining_amount)}` : ''}
        size="md"
      >
        <form onSubmit={handlePayLoan} className="space-y-4">
          <div>
            <label className="label-field">Valor a abonar ($) *</label>
            <input
              type="number"
              required
              min="1"
              value={loanPayForm.amount}
              onChange={(e) => setLoanPayForm((f) => ({ ...f, amount: e.target.value }))}
              className="input-field font-bold"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Fecha</label>
              <input
                type="date"
                value={loanPayForm.payment_date}
                onChange={(e) => setLoanPayForm((f) => ({ ...f, payment_date: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Método</label>
              <select
                value={loanPayForm.payment_method}
                onChange={(e) => setLoanPayForm((f) => ({ ...f, payment_method: e.target.value }))}
                className="input-field"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm.value} value={pm.value}>
                    {pm.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={loanPayForm.record_in_finance}
              onChange={(e) => setLoanPayForm((f) => ({ ...f, record_in_finance: e.target.checked }))}
            />
            Registrar automáticamente como egreso en Finanzas
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPayLoan(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold cursor-pointer"
            >
              {saving ? 'Aplicando...' : 'Confirmar abono'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
