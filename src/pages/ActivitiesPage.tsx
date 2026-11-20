import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Coins,
  Download,
  MapPin,
  Plus,
  Search,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { MemberPicker } from '../components/MemberPicker';
import { Modal } from '../components/Modal';
import { Badge } from '../components/ui/Badge';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination, usePagination } from '../components/ui/Pagination';
import { useFeedback } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { exportActivitiesExcel, exportActivitiesPDF } from '../lib/export';
import {
  ACTIVITY_TYPE_LABELS,
  ATTENDANCE_LABELS,
  ORGANISM_LABELS,
  PAYMENT_METHODS,
  formatCOP,
  formatDate,
} from '../lib/format';
import type { Activity, ActivityParticipant, ActivityPayment, Member } from '../types';

export function ActivitiesPage() {
  const { user, churches, isDistrictAdmin, selectedChurchId } = useAuth();
  const { notify, confirm } = useFeedback();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [actSearch, setActSearch] = useState('');
  const [actScopeFilter, setActScopeFilter] = useState<'ALL' | 'LOCAL' | 'DISTRITAL'>('ALL');
  const [actStatusFilter, setActStatusFilter] = useState<'ALL' | 'ACTIVA' | 'CERRADA'>('ALL');

  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
  const [detail, setDetail] = useState<{
    activity: Activity;
    participants: ActivityParticipant[];
    payments: ActivityPayment[];
    summary: {
      participants_count: number;
      total_assigned: number;
      total_paid: number;
      total_pending: number;
      debtors_count: number;
    };
  } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters inside activity detail
  const [partFilter, setPartFilter] = useState<'ALL' | 'DEBTORS' | 'PAID'>('ALL');
  const [partSearch, setPartSearch] = useState('');
  const [detailTab, setDetailTab] = useState<'participants' | 'payments'>('participants');

  // Modals
  const [createActOpen, setCreateActOpen] = useState(false);
  const [addPartOpen, setAddPartOpen] = useState(false);
  const [payModalPart, setPayModalPart] = useState<ActivityParticipant | null>(null);

  const [actForm, setActForm] = useState({
    name: '',
    scope: 'LOCAL',
    church_id: user?.church_id ? String(user.church_id) : '',
    activity_type: 'VENTA_RECAUDO',
    organism: 'GENERAL',
    event_date: new Date().toISOString().slice(0, 10),
    location: '',
    responsible_name: user?.full_name || '',
    unit_label: 'Plato',
    unit_price: '15000',
    goal_amount: '1000000',
    description: '',
  });

  const [partForm, setPartForm] = useState({
    member_id: null as number | null,
    external_name: '',
    external_phone: '',
    item_detail: '',
    quantity: '1',
    unit_price: '0',
    assigned_amount: '0',
    manual_total: false,
    initial_payment: '0',
    payment_method: 'EFECTIVO',
    attendance_status: 'CONFIRMADO',
    record_in_finance: true,
    notes: '',
  });

  const [payForm, setPayForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: 'EFECTIVO',
    notes: '',
    record_in_finance: true,
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadActivities = async () => {
    setLoading(true);
    const qs = isDistrictAdmin && selectedChurchId !== 'all' ? `?church_id=${selectedChurchId}` : '';
    try {
      const data = await api.get<{ activities: Activity[] }>(`/api/activities${qs}`);
      setActivities(data.activities);
    } finally {
      setLoading(false);
    }
  };

  const loadActivityDetail = async (id: number) => {
    const data = await api.get<NonNullable<typeof detail>>(`/api/activities/${id}`);
    setDetail(data);
    const mQs =
      data.activity.scope === 'LOCAL' && data.activity.church_id
        ? `?church_id=${data.activity.church_id}`
        : '';
    const mRes = await api.get<{ members: Member[] }>(`/api/members${mQs}`);
    setMembers(mRes.members);
  };

  useEffect(() => {
    loadActivities();
    setSelectedActivityId(null);
    setDetail(null);
  }, [selectedChurchId, isDistrictAdmin]);

  useEffect(() => {
    if (selectedActivityId) {
      loadActivityDetail(selectedActivityId);
    }
  }, [selectedActivityId]);

  const filteredActivities = useMemo(() => {
    const q = actSearch.trim().toLowerCase();
    return activities.filter((a) => {
      if (actScopeFilter !== 'ALL' && a.scope !== actScopeFilter) return false;
      if (actStatusFilter !== 'ALL' && a.status !== actStatusFilter) return false;
      if (
        q &&
        !a.name.toLowerCase().includes(q) &&
        !(a.church_name || '').toLowerCase().includes(q) &&
        !(a.responsible_name || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [activities, actSearch, actScopeFilter, actStatusFilter]);

  const actPag = usePagination(filteredActivities, 8);

  const filteredParticipants = useMemo(() => {
    if (!detail) return [];
    const q = partSearch.trim().toLowerCase();
    return detail.participants.filter((p) => {
      if (partFilter === 'DEBTORS' && p.pending_amount <= 0) return false;
      if (partFilter === 'PAID' && p.pending_amount > 0) return false;
      if (
        q &&
        !p.person_name.toLowerCase().includes(q) &&
        !(p.item_detail || '').toLowerCase().includes(q) &&
        !(p.church_name || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [detail, partFilter, partSearch]);

  const partPag = usePagination(filteredParticipants, 8);
  const payPag = usePagination(detail?.payments || [], 8);

  const openCreateActivity = () => {
    setErrorMsg('');
    const defaultChurch =
      !isDistrictAdmin && user?.church_id
        ? String(user.church_id)
        : selectedChurchId !== 'all'
        ? selectedChurchId
        : churches[0]
        ? String(churches[0].id)
        : '';
    setActForm({
      name: '',
      scope: isDistrictAdmin && selectedChurchId === 'all' ? 'DISTRITAL' : 'LOCAL',
      church_id: defaultChurch,
      activity_type: 'VENTA_RECAUDO',
      organism: 'GENERAL',
      event_date: new Date().toISOString().slice(0, 10),
      location: '',
      responsible_name: user?.full_name || '',
      unit_label: 'Plato',
      unit_price: '15000',
      goal_amount: '1000000',
      description: '',
    });
    setCreateActOpen(true);
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      const res = await api.post<{ activity: Activity }>('/api/activities', {
        ...actForm,
        church_id: actForm.scope === 'DISTRITAL' ? null : Number(actForm.church_id),
        unit_price: Number(actForm.unit_price || 0),
        goal_amount: Number(actForm.goal_amount || 0),
      });
      setCreateActOpen(false);
      notify('Actividad creada correctamente.');
      await loadActivities();
      setSelectedActivityId(res.activity.id);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al crear la actividad.');
    } finally {
      setSaving(false);
    }
  };

  const openAddParticipant = () => {
    if (!detail) return;
    setErrorMsg('');
    const up = detail.activity.unit_price || 0;
    setPartForm({
      member_id: null,
      external_name: '',
      external_phone: '',
      item_detail: detail.activity.unit_label ? `1 ${detail.activity.unit_label}` : '',
      quantity: '1',
      unit_price: String(up),
      assigned_amount: String(up),
      manual_total: false,
      initial_payment: '0',
      payment_method: 'EFECTIVO',
      attendance_status: detail.activity.activity_type === 'EVENTO_CUOTA' ? 'CONVOCADO' : 'CONFIRMADO',
      record_in_finance: true,
      notes: '',
    });
    setAddPartOpen(true);
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    if (!partForm.member_id && !partForm.external_name.trim()) {
      setErrorMsg('Selecciona un miembro registrado o escribe el nombre de la persona.');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      const qty = Number(partForm.quantity || 1);
      const up = Number(partForm.unit_price || 0);
      const total = partForm.manual_total ? Number(partForm.assigned_amount || 0) : qty * up;

      await api.post(`/api/activities/${detail.activity.id}/participants`, {
        member_id: partForm.member_id,
        person_name: partForm.external_name,
        person_phone: partForm.external_phone,
        item_detail: partForm.item_detail || `${qty} ${detail.activity.unit_label || 'und'}`,
        quantity: qty,
        unit_price: up,
        assigned_amount: total,
        initial_payment: Number(partForm.initial_payment || 0),
        payment_method: partForm.payment_method,
        attendance_status: partForm.attendance_status,
        record_in_finance: partForm.record_in_finance,
        notes: partForm.notes,
      });
      setAddPartOpen(false);
      notify('Participante registrado en la actividad.');
      await loadActivityDetail(detail.activity.id);
      await loadActivities();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo registrar el participante.');
    } finally {
      setSaving(false);
    }
  };

  const openPayModal = (p: ActivityParticipant) => {
    setErrorMsg('');
    setPayModalPart(p);
    setPayForm({
      amount: String(p.pending_amount > 0 ? p.pending_amount : ''),
      payment_date: new Date().toISOString().slice(0, 10),
      payment_method: 'EFECTIVO',
      notes: '',
      record_in_finance: true,
    });
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail || !payModalPart) return;
    setSaving(true);
    setErrorMsg('');
    try {
      await api.post(
        `/api/activities/${detail.activity.id}/participants/${payModalPart.id}/payments`,
        {
          amount: Number(payForm.amount),
          payment_date: payForm.payment_date,
          payment_method: payForm.payment_method,
          notes: payForm.notes,
          record_in_finance: payForm.record_in_finance,
        }
      );
      setPayModalPart(null);
      notify('Abono aplicado y sincronizado correctamente.');
      await loadActivityDetail(detail.activity.id);
      await loadActivities();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo registrar el abono.');
    } finally {
      setSaving(false);
    }
  };

  const updateAttendance = async (p: ActivityParticipant, newStatus: string) => {
    if (!detail) return;
    await api.put(`/api/activities/${detail.activity.id}/participants/${p.id}`, {
      item_detail: p.item_detail,
      quantity: p.quantity,
      unit_price: p.unit_price,
      assigned_amount: p.assigned_amount,
      attendance_status: newStatus,
      notes: p.notes,
    });
    notify('Estado de asistencia actualizado.');
    await loadActivityDetail(detail.activity.id);
  };

  const removeParticipant = async (p: ActivityParticipant) => {
    if (!detail) return;
    const ok = await confirm({
      title: 'Retirar participante',
      message: `¿Deseas eliminar a ${p.person_name} de "${detail.activity.name}"?`,
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    await api.del(`/api/activities/${detail.activity.id}/participants/${p.id}`);
    notify('Registro eliminado.');
    await loadActivityDetail(detail.activity.id);
    await loadActivities();
  };

  const toggleActivityStatus = async () => {
    if (!detail) return;
    const nextStatus = detail.activity.status === 'ACTIVA' ? 'CERRADA' : 'ACTIVA';
    await api.put(`/api/activities/${detail.activity.id}`, {
      ...detail.activity,
      status: nextStatus,
    });
    notify(nextStatus === 'CERRADA' ? 'Actividad cerrada.' : 'Actividad reabierta.');
    await loadActivityDetail(detail.activity.id);
    await loadActivities();
  };

  const exportCurrentActivity = (format: 'pdf' | 'excel', onlyDebtors = false) => {
    if (!detail) return;
    const source = onlyDebtors
      ? detail.participants.filter((p) => p.pending_amount > 0)
      : detail.participants;
    const rows = source.map((p) => ({
      activity_name: detail.activity.name,
      event_date: detail.activity.event_date,
      church_name: p.church_name || detail.activity.church_name || 'Distrito Sabana',
      person_name: p.person_name,
      person_phone: p.person_phone,
      is_member: p.is_member,
      item_detail: p.item_detail,
      quantity: p.quantity,
      assigned_amount: p.assigned_amount,
      paid_amount: p.paid_amount,
      pending_amount: p.pending_amount,
      attendance_status: p.attendance_status,
      notes: p.notes,
    }));
    if (format === 'excel') exportActivitiesExcel(rows);
    else {
      exportActivitiesPDF({
        onlyDebtors,
        totals: {
          assigned: rows.reduce((s, r) => s + r.assigned_amount, 0),
          paid: rows.reduce((s, r) => s + r.paid_amount, 0),
          pending: rows.reduce((s, r) => s + r.pending_amount, 0),
        },
        rows,
      });
    }
  };

  // =========================================================================
  // ACTIVITY DETAIL WORKSPACE
  // =========================================================================
  if (detail) {
    const a = detail.activity;
    const s = detail.summary;
    const progressDenom = a.goal_amount > 0 ? a.goal_amount : Math.max(s.total_assigned, 1);
    const pct = Math.min(100, Math.round((s.total_paid / progressDenom) * 100));

    return (
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[
            {
              label: 'Actividades y Cartera',
              onClick: () => {
                setSelectedActivityId(null);
                setDetail(null);
              },
            },
            { label: a.name },
          ]}
          title={a.name}
          subtitle={`${a.scope === 'DISTRITAL' ? 'Actividad Distrital' : a.church_name || 'Actividad Local'} · ${formatDate(a.event_date)} · Responsable: ${a.responsible_name || '—'}`}
          actions={
            <>
              <button
                type="button"
                onClick={() => {
                  setSelectedActivityId(null);
                  setDetail(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver
              </button>
              <button
                type="button"
                onClick={() => exportCurrentActivity('pdf', true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-rose-700 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                PDF Deudores
              </button>
              <button
                type="button"
                onClick={() => exportCurrentActivity('excel', false)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Excel
              </button>
              <button
                type="button"
                onClick={toggleActivityStatus}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                {a.status === 'ACTIVA' ? 'Cerrar' : 'Reabrir'}
              </button>
              <button
                type="button"
                onClick={openAddParticipant}
                className="btn-primary px-4 py-2 text-xs sm:text-sm"
              >
                <UserPlus className="w-4 h-4" />
                Registrar persona
              </button>
            </>
          }
        />

        {/* Metric Strip + Progress */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500">Total comprometido</p>
              <p className="text-xl font-bold text-slate-900 tabular-nums mt-1">{formatCOP(s.total_assigned)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Total recaudado</p>
              <p className="text-xl font-bold text-emerald-700 tabular-nums mt-1">{formatCOP(s.total_paid)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Saldo por cobrar</p>
              <p className="text-xl font-bold text-rose-600 tabular-nums mt-1">{formatCOP(s.total_pending)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Meta · Avance</p>
              <p className="text-xl font-bold text-slate-900 tabular-nums mt-1">
                {pct}% <span className="text-xs font-normal text-slate-500">de {formatCOP(a.goal_amount || s.total_assigned)}</span>
              </p>
            </div>
          </div>

          <div className="h-2 rounded-full bg-[#EEF4FC] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#1B449C] to-[#D98A1F] transition-all" style={{ width: `${pct}%` }} />
          </div>

          {a.description && (
            <p className="text-xs text-slate-500 flex flex-wrap items-center gap-4">
              <span>{a.description}</span>
              {a.location && (
                <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                  <MapPin className="w-3.5 h-3.5" /> {a.location}
                </span>
              )}
            </p>
          )}
        </div>

        {/* Paginated Participants / Payments Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
          <div className="px-5 pt-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex gap-6">
              <button
                type="button"
                onClick={() => setDetailTab('participants')}
                className={`pb-3 text-sm font-semibold border-b-2 cursor-pointer transition ${
                  detailTab === 'participants'
                    ? 'border-[#1B449C] text-[#142E6B]'
                    : 'border-transparent text-slate-500 hover:text-[#142E6B]'
                }`}
              >
                Participantes y saldos ({detail.participants.length})
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('payments')}
                className={`pb-3 text-sm font-semibold border-b-2 cursor-pointer transition ${
                  detailTab === 'payments'
                    ? 'border-[#1B449C] text-[#142E6B]'
                    : 'border-transparent text-slate-500 hover:text-[#142E6B]'
                }`}
              >
                Historial de abonos ({detail.payments.length})
              </button>
            </div>

            {detailTab === 'participants' && (
              <div className="flex flex-wrap items-center gap-2 pb-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#1B449C]/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={partSearch}
                    onChange={(e) => {
                      setPartSearch(e.target.value);
                      partPag.setPage(1);
                    }}
                    placeholder="Buscar persona..."
                    className="input-field pl-10 py-1.5 text-xs w-52"
                  />
                </div>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  {[
                    { k: 'ALL', l: 'Todos' },
                    { k: 'DEBTORS', l: `Deben (${s.debtors_count})` },
                    { k: 'PAID', l: 'Al día' },
                  ].map((f) => (
                    <button
                      key={f.k}
                      type="button"
                      onClick={() => {
                        setPartFilter(f.k as typeof partFilter);
                        partPag.setPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg cursor-pointer transition ${
                        partFilter === f.k ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      {f.l}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {detailTab === 'participants' ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200/80 text-left text-xs font-medium text-slate-500">
                      <th className="py-3 px-5">Persona</th>
                      <th className="py-3 px-4">Qué se llevó / Detalle</th>
                      <th className="py-3 px-4">Asistencia</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-right">Abonado</th>
                      <th className="py-3 px-4 text-right">Saldo</th>
                      <th className="py-3 px-5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {partPag.paginatedItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-sm text-slate-400">
                          No hay participantes en esta vista.
                        </td>
                      </tr>
                    ) : (
                      partPag.paginatedItems.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/70">
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-900">{p.person_name}</p>
                              <Badge tone={p.is_member ? 'emerald' : 'neutral'}>
                                {p.is_member ? 'Miembro' : 'Externo'}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {p.church_name || ''} {p.person_phone ? `· ${p.person_phone}` : ''}
                            </p>
                            {p.notes && <p className="text-[11px] text-amber-700 mt-0.5">{p.notes}</p>}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-medium text-slate-800">{p.item_detail || '—'}</p>
                            <p className="text-[11px] text-slate-400 tabular-nums">
                              {p.quantity} × {formatCOP(p.unit_price)}
                            </p>
                          </td>
                          <td className="py-3.5 px-4">
                            <select
                              value={p.attendance_status}
                              onChange={(e) => updateAttendance(p, e.target.value)}
                              className="text-xs font-medium rounded-lg border border-slate-200 px-2.5 py-1.5 bg-white focus:outline-none focus:border-slate-400"
                            >
                              {Object.entries(ATTENDANCE_LABELS).map(([k, lbl]) => (
                                <option key={k} value={k}>
                                  {lbl}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-slate-800 tabular-nums">
                            {formatCOP(p.assigned_amount)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-emerald-700 tabular-nums">
                            {formatCOP(p.paid_amount)}
                          </td>
                          <td className="py-3.5 px-4 text-right tabular-nums">
                            {p.pending_amount > 0 ? (
                              <Badge tone="rose">Debe {formatCOP(p.pending_amount)}</Badge>
                            ) : (
                              <Badge tone="emerald">
                                <CheckCircle2 className="w-3 h-3" /> Al día
                              </Badge>
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {p.pending_amount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => openPayModal(p)}
                                  className="btn-primary px-2.5 py-1.5 text-xs"
                                >
                                  <Coins className="w-3.5 h-3.5" />
                                  Abonar
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => removeParticipant(p)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={partPag.page}
                totalPages={partPag.totalPages}
                totalItems={partPag.totalItems}
                pageSize={partPag.pageSize}
                onPageChange={partPag.setPage}
                onPageSizeChange={partPag.setPageSize}
              />
            </>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200/80 text-left text-xs font-medium text-slate-500">
                      <th className="py-3 px-5">Fecha</th>
                      <th className="py-3 px-4">Persona</th>
                      <th className="py-3 px-4">Método</th>
                      <th className="py-3 px-4">Observación</th>
                      <th className="py-3 px-5 text-right">Valor abonado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payPag.paginatedItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-xs text-slate-400">
                          Aún no hay abonos registrados.
                        </td>
                      </tr>
                    ) : (
                      payPag.paginatedItems.map((pay) => (
                        <tr key={pay.id}>
                          <td className="py-3 px-5 text-xs text-slate-600">{formatDate(pay.payment_date)}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{pay.person_name}</td>
                          <td className="py-3 px-4 text-xs text-slate-600">{pay.payment_method}</td>
                          <td className="py-3 px-4 text-xs text-slate-500">{pay.notes || '—'}</td>
                          <td className="py-3 px-5 text-right font-semibold text-emerald-700 tabular-nums">
                            {formatCOP(pay.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={payPag.page}
                totalPages={payPag.totalPages}
                totalItems={payPag.totalItems}
                pageSize={payPag.pageSize}
                onPageChange={payPag.setPage}
                onPageSizeChange={payPag.setPageSize}
              />
            </>
          )}
        </div>

        {/* Modal: Agregar Participante */}
        <Modal
          open={addPartOpen}
          onClose={() => setAddPartOpen(false)}
          title="Registrar persona en actividad"
          subtitle={a.name}
          size="lg"
        >
          <form onSubmit={handleAddParticipant} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="label-field">Persona o miembro de la iglesia</label>
              <MemberPicker
                members={members}
                selectedMemberId={partForm.member_id}
                onSelectMember={(m) =>
                  setPartForm((f) => ({
                    ...f,
                    member_id: m ? m.id : null,
                    external_name: m ? m.full_name : '',
                    external_phone: m ? m.phone : '',
                  }))
                }
                externalName={partForm.external_name}
                onExternalNameChange={(v) => setPartForm((f) => ({ ...f, external_name: v }))}
                externalPhone={partForm.external_phone}
                onExternalPhoneChange={(v) => setPartForm((f) => ({ ...f, external_phone: v }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="label-field">Qué se llevó / Detalle</label>
                <input
                  type="text"
                  value={partForm.item_detail}
                  onChange={(e) => setPartForm((f) => ({ ...f, item_detail: e.target.value }))}
                  placeholder="Ej. 5 platos / Talonario #04"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">Asistencia</label>
                <select
                  value={partForm.attendance_status}
                  onChange={(e) => setPartForm((f) => ({ ...f, attendance_status: e.target.value }))}
                  className="input-field"
                >
                  {Object.entries(ATTENDANCE_LABELS).map(([k, lbl]) => (
                    <option key={k} value={k}>
                      {lbl}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <label className="label-field">Cantidad ({a.unit_label || 'und'})</label>
                <input
                  type="number"
                  min="0"
                  value={partForm.quantity}
                  onChange={(e) => {
                    const q = e.target.value;
                    const total = Number(q || 0) * Number(partForm.unit_price || 0);
                    setPartForm((f) => ({
                      ...f,
                      quantity: q,
                      assigned_amount: f.manual_total ? f.assigned_amount : String(total),
                    }));
                  }}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">Valor unitario ($)</label>
                <input
                  type="number"
                  min="0"
                  value={partForm.unit_price}
                  onChange={(e) => {
                    const up = e.target.value;
                    const total = Number(partForm.quantity || 0) * Number(up || 0);
                    setPartForm((f) => ({
                      ...f,
                      unit_price: up,
                      assigned_amount: f.manual_total ? f.assigned_amount : String(total),
                    }));
                  }}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">Total a pagar ($)</label>
                <input
                  type="number"
                  min="0"
                  value={partForm.assigned_amount}
                  onChange={(e) =>
                    setPartForm((f) => ({ ...f, assigned_amount: e.target.value, manual_total: true }))
                  }
                  className="input-field font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80">
              <div>
                <label className="label-field text-emerald-900">Abono inicial ($0 si queda pendiente)</label>
                <input
                  type="number"
                  min="0"
                  value={partForm.initial_payment}
                  onChange={(e) => setPartForm((f) => ({ ...f, initial_payment: e.target.value }))}
                  className="input-field font-semibold"
                />
                <p className="text-xs text-rose-700 font-medium mt-1.5 tabular-nums">
                  Saldo pendiente:{' '}
                  {formatCOP(
                    Math.max(0, Number(partForm.assigned_amount || 0) - Number(partForm.initial_payment || 0))
                  )}
                </p>
              </div>
              <div>
                <label className="label-field text-emerald-900">Método de pago</label>
                <select
                  value={partForm.payment_method}
                  onChange={(e) => setPartForm((f) => ({ ...f, payment_method: e.target.value }))}
                  className="input-field"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm.value} value={pm.value}>
                      {pm.label}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 mt-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={partForm.record_in_finance}
                    onChange={(e) => setPartForm((f) => ({ ...f, record_in_finance: e.target.checked }))}
                  />
                  Registrar ingreso automáticamente en Finanzas
                </label>
              </div>
            </div>

            <div>
              <label className="label-field">Observaciones</label>
              <input
                type="text"
                value={partForm.notes}
                onChange={(e) => setPartForm((f) => ({ ...f, notes: e.target.value }))}
                className="input-field"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAddPartOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
              >
                {saving ? 'Guardando...' : 'Guardar registro'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal: Registrar Abono */}
        <Modal
          open={Boolean(payModalPart)}
          onClose={() => setPayModalPart(null)}
          title="Registrar abono"
          subtitle={
            payModalPart
              ? `${payModalPart.person_name} · Pendiente: ${formatCOP(payModalPart.pending_amount)}`
              : ''
          }
          size="md"
        >
          {payModalPart && (
            <form onSubmit={handleRecordPayment} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="label-field">Valor del abono ($) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={payForm.amount}
                  onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                  className="input-field text-lg font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Fecha de pago</label>
                  <input
                    type="date"
                    value={payForm.payment_date}
                    onChange={(e) => setPayForm((f) => ({ ...f, payment_date: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-field">Método de pago</label>
                  <select
                    value={payForm.payment_method}
                    onChange={(e) => setPayForm((f) => ({ ...f, payment_method: e.target.value }))}
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

              <div>
                <label className="label-field">Observación</label>
                <input
                  type="text"
                  value={payForm.notes}
                  onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))}
                  className="input-field"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={payForm.record_in_finance}
                  onChange={(e) => setPayForm((f) => ({ ...f, record_in_finance: e.target.checked }))}
                />
                Registrar automáticamente como ingreso en Finanzas
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayModalPart(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
                >
                  {saving ? 'Aplicando...' : 'Confirmar abono'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    );
  }

  // =========================================================================
  // ACTIVITIES DIRECTORY (CLEAN PAGINATED TABLE)
  // =========================================================================
  return (
    <div className="space-y-6">
      <PageHeader
        title="Actividades y Cartera"
        subtitle="Controla ventas pro-fondos, eventos con cuota, asistencia, compromisos y saldos por cobrar."
        actions={
          <button
            type="button"
            onClick={openCreateActivity}
            className="btn-primary px-4 py-2.5 text-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva actividad
          </button>
        }
      />

      <div className="bg-white rounded-2xl border border-[#DDE6F4] shadow-[0_2px_8px_rgba(20,46,107,0.04)] overflow-hidden">
        <div className="p-4 border-b border-[#E4ECF7] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-[#1B449C]/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={actSearch}
              onChange={(e) => {
                setActSearch(e.target.value);
                actPag.setPage(1);
              }}
              placeholder="Buscar actividad, iglesia o responsable..."
              className="input-field pl-10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={actScopeFilter}
              onChange={(e) => {
                setActScopeFilter(e.target.value as typeof actScopeFilter);
                actPag.setPage(1);
              }}
              className="input-field w-auto text-xs font-medium"
            >
              <option value="ALL">Todo alcance</option>
              <option value="LOCAL">Actividades locales</option>
              <option value="DISTRITAL">Actividades distritales</option>
            </select>
            <select
              value={actStatusFilter}
              onChange={(e) => {
                setActStatusFilter(e.target.value as typeof actStatusFilter);
                actPag.setPage(1);
              }}
              className="input-field w-auto text-xs font-medium"
            >
              <option value="ALL">Todos los estados</option>
              <option value="ACTIVA">Activas</option>
              <option value="CERRADA">Cerradas</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-left text-xs font-medium text-slate-500">
                <th className="py-3 px-5">Actividad</th>
                <th className="py-3 px-4">Alcance / Organismo</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4 text-right">Recaudado</th>
                <th className="py-3 px-4 text-right">Por cobrar</th>
                <th className="py-3 px-5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    Cargando actividades...
                  </td>
                </tr>
              ) : actPag.paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-slate-400">
                    No se encontraron actividades registradas.
                  </td>
                </tr>
              ) : (
                actPag.paginatedItems.map((a) => {
                  const denom = a.goal_amount > 0 ? a.goal_amount : Math.max(a.total_assigned || 0, 1);
                  const pct = Math.min(100, Math.round(((a.total_paid || 0) / denom) * 100));
                  return (
                    <tr
                      key={a.id}
                      onClick={() => setSelectedActivityId(a.id)}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                    >
                      <td className="py-3.5 px-5">
                        <p className="font-semibold text-slate-900">{a.name}</p>
                        <div className="flex items-center gap-2 mt-1.5 max-w-xs">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-emerald-600" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[11px] text-slate-500 tabular-nums">
                            {pct}% · {a.participants_count || 0} pers.
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge tone={a.scope === 'DISTRITAL' ? 'amber' : 'neutral'}>
                          {a.scope === 'DISTRITAL' ? 'Distrital' : a.church_name || 'Local'}
                        </Badge>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {ORGANISM_LABELS[a.organism] || a.organism}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatDate(a.event_date)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-emerald-700 tabular-nums">
                        {formatCOP(a.total_paid || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums">
                        {(a.total_pending || 0) > 0 ? (
                          <Badge tone="rose">
                            {formatCOP(a.total_pending)} ({a.debtors_count})
                          </Badge>
                        ) : (
                          <Badge tone="emerald">Al día</Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#C9DAF7] bg-[#F8FAFE] text-xs font-semibold text-[#142E6B] whitespace-nowrap">
                          Gestionar →
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
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

      {/* Modal: Nueva Actividad */}
      <Modal
        open={createActOpen}
        onClose={() => setCreateActOpen(false)}
        title="Nueva actividad"
        subtitle="Define los datos principales; enseguida podrás registrar participantes, entregas y abonos."
        size="lg"
      >
        <form onSubmit={handleCreateActivity} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="label-field">Nombre de la actividad *</label>
            <input
              type="text"
              required
              value={actForm.name}
              onChange={(e) => setActForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej. Venta de Empanadas Pro-Templo / Campamento UJEI"
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {isDistrictAdmin && (
              <div>
                <label className="label-field">Alcance</label>
                <select
                  value={actForm.scope}
                  onChange={(e) => setActForm((f) => ({ ...f, scope: e.target.value }))}
                  className="input-field"
                >
                  <option value="LOCAL">Iglesia local</option>
                  <option value="DISTRITAL">Distrital (Todo Distrito Sabana)</option>
                </select>
              </div>
            )}

            {isDistrictAdmin && actForm.scope === 'LOCAL' && (
              <div>
                <label className="label-field">Iglesia *</label>
                <select
                  required
                  value={actForm.church_id}
                  onChange={(e) => setActForm((f) => ({ ...f, church_id: e.target.value }))}
                  className="input-field"
                >
                  <option value="">Selecciona una iglesia...</option>
                  {churches.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="label-field">Tipo de actividad</label>
              <select
                value={actForm.activity_type}
                onChange={(e) => setActForm((f) => ({ ...f, activity_type: e.target.value }))}
                className="input-field"
              >
                {Object.entries(ACTIVITY_TYPE_LABELS).map(([k, lbl]) => (
                  <option key={k} value={k}>
                    {lbl}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-field">Organismo / Ministerio</label>
              <select
                value={actForm.organism}
                onChange={(e) => setActForm((f) => ({ ...f, organism: e.target.value }))}
                className="input-field"
              >
                {Object.entries(ORGANISM_LABELS)
                  .filter(([k]) => k !== 'NINGUNO')
                  .map(([k, lbl]) => (
                    <option key={k} value={k}>
                      {lbl}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label-field">Fecha *</label>
              <input
                type="date"
                required
                value={actForm.event_date}
                onChange={(e) => setActForm((f) => ({ ...f, event_date: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Lugar</label>
              <input
                type="text"
                value={actForm.location}
                onChange={(e) => setActForm((f) => ({ ...f, location: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Responsable</label>
              <input
                type="text"
                value={actForm.responsible_name}
                onChange={(e) => setActForm((f) => ({ ...f, responsible_name: e.target.value }))}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label-field">Unidad (Plato, Boleta...)</label>
              <input
                type="text"
                value={actForm.unit_label}
                onChange={(e) => setActForm((f) => ({ ...f, unit_label: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Valor unitario ($)</label>
              <input
                type="number"
                min="0"
                value={actForm.unit_price}
                onChange={(e) => setActForm((f) => ({ ...f, unit_price: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Meta de recaudo ($)</label>
              <input
                type="number"
                min="0"
                value={actForm.goal_amount}
                onChange={(e) => setActForm((f) => ({ ...f, goal_amount: e.target.value }))}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="label-field">Descripción</label>
            <textarea
              rows={2}
              value={actForm.description}
              onChange={(e) => setActForm((f) => ({ ...f, description: e.target.value }))}
              className="input-field"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateActOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Creando...' : 'Crear actividad'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
