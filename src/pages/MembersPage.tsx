import React, { useEffect, useState } from 'react';
import { Edit3, Eye, Search, Trash2, UserPlus } from 'lucide-react';
import { Modal } from '../components/Modal';
import { Badge } from '../components/ui/Badge';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination, usePagination } from '../components/ui/Pagination';
import { useFeedback } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { ORGANISM_LABELS, calculateAge, formatCOP, formatDate } from '../lib/format';
import type { Member } from '../types';

const EMPTY_FORM = {
  church_id: '',
  full_name: '',
  id_number: '',
  phone: '',
  email: '',
  birth_date: '',
  gender: 'M' as 'M' | 'F',
  address: '',
  baptism_status: 'BAUTIZADO' as 'BAUTIZADO' | 'NO_BAUTIZADO' | 'NINO',
  baptism_date: '',
  organism: 'UCEI' as 'UCEI' | 'UDEI' | 'UJEI' | 'UNEI' | 'NINGUNO',
  church_role: 'Miembro',
  profession: '',
  comm_skills: '',
  status: 'ACTIVO' as 'ACTIVO' | 'INACTIVO' | 'VISITANTE',
  notes: '',
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || parts[0]?.[1] || '')).toUpperCase();
}

export function MembersPage() {
  const { user, churches, isDistrictAdmin, selectedChurchId } = useAuth();
  const { notify, confirm } = useFeedback();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [orgFilter, setOrgFilter] = useState('ALL');
  const [bapFilter, setBapFilter] = useState('ALL');

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [profile, setProfile] = useState<{
    member: Member;
    activities: Array<{
      id: number;
      activity_name: string;
      event_date: string;
      item_detail: string;
      assigned_amount: number;
      paid_amount: number;
      pending_amount: number;
    }>;
    tithes: Array<{
      id: number;
      amount: number;
      tx_date: string;
      category: string;
      payment_method: string;
      receipt_number: string;
    }>;
  } | null>(null);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (isDistrictAdmin && selectedChurchId !== 'all') qs.set('church_id', selectedChurchId);
      if (search.trim()) qs.set('q', search.trim());
      if (orgFilter !== 'ALL') qs.set('organism', orgFilter);
      if (bapFilter !== 'ALL') qs.set('baptism', bapFilter);

      const res = await api.get<{ members: Member[] }>(`/api/members?${qs.toString()}`);
      setMembers(res.members);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(loadMembers, 180);
    return () => clearTimeout(t);
  }, [selectedChurchId, isDistrictAdmin, search, orgFilter, bapFilter]);

  const pag = usePagination(members, 10);

  const openNew = () => {
    setErrorMsg('');
    setEditingId(null);
    const defaultChurch =
      !isDistrictAdmin && user?.church_id
        ? String(user.church_id)
        : selectedChurchId !== 'all'
        ? selectedChurchId
        : churches[0]
        ? String(churches[0].id)
        : '';
    setForm({ ...EMPTY_FORM, church_id: defaultChurch });
    setFormOpen(true);
  };

  const openEdit = (m: Member) => {
    setErrorMsg('');
    setEditingId(m.id);
    setForm({
      church_id: String(m.church_id),
      full_name: m.full_name,
      id_number: m.id_number || '',
      phone: m.phone || '',
      email: m.email || '',
      birth_date: m.birth_date || '',
      gender: m.gender || 'M',
      address: m.address || '',
      baptism_status: m.baptism_status,
      baptism_date: m.baptism_date || '',
      organism: m.organism,
      church_role: m.church_role || 'Miembro',
      profession: m.profession || '',
      comm_skills: m.comm_skills || '',
      status: m.status,
      notes: m.notes || '',
    });
    setFormOpen(true);
  };

  const openProfile = async (id: number) => {
    const data = await api.get<NonNullable<typeof profile>>(`/api/members/${id}`);
    setProfile(data);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      const payload = { ...form, church_id: Number(form.church_id) };
      if (editingId) {
        await api.put(`/api/members/${editingId}`, payload);
        notify('Datos del miembro actualizados.');
      } else {
        await api.post('/api/members', payload);
        notify('Miembro registrado en el directorio.');
      }
      setFormOpen(false);
      await loadMembers();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al guardar miembro.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: Member) => {
    const ok = await confirm({
      title: 'Eliminar miembro',
      message: `¿Deseas eliminar a ${m.full_name} del directorio?`,
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    await api.del(`/api/members/${m.id}`);
    notify('Miembro eliminado.');
    await loadMembers();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Directorio de Miembros"
        subtitle="Registro de congregación por organismo interno (UCEI, UDEI, UJEI, UNEI) conectado a actividades, diezmos y censo."
        actions={
          <button
            type="button"
            onClick={openNew}
            className="btn-primary px-4 py-2.5 text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Nuevo miembro
          </button>
        }
      />

      <div className="bg-white rounded-2xl border border-[#DDE6F4] shadow-[0_2px_8px_rgba(20,46,107,0.04)] overflow-hidden">
        <div className="p-4 border-b border-[#E4ECF7] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-[#1B449C]/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                pag.setPage(1);
              }}
              placeholder="Buscar por nombre, cédula o teléfono..."
              className="input-field pl-10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-[#EEF4FC] p-1 rounded-xl text-xs font-semibold">
              {['ALL', 'UCEI', 'UDEI', 'UJEI', 'UNEI'].map((org) => (
                <button
                  key={org}
                  type="button"
                  onClick={() => {
                    setOrgFilter(org);
                    pag.setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer transition ${
                    orgFilter === org ? 'bg-[#1B449C] text-white shadow-xs' : 'text-[#142E6B]/80 hover:text-[#142E6B]'
                  }`}
                >
                  {org === 'ALL' ? 'Todos' : org}
                </button>
              ))}
            </div>

            <select
              value={bapFilter}
              onChange={(e) => {
                setBapFilter(e.target.value);
                pag.setPage(1);
              }}
              className="input-field w-auto text-xs font-semibold text-[#142E6B]"
            >
              <option value="ALL">Bautismo: Todos</option>
              <option value="BAUTIZADO">Bautizados</option>
              <option value="NO_BAUTIZADO">No bautizados</option>
              <option value="NINO">Niños</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8FAFE] border-b border-[#E4ECF7] text-left text-xs font-semibold text-[#142E6B]/80">
                <th className="py-3 px-4">Miembro</th>
                <th className="py-3 px-3">Iglesia</th>
                <th className="py-3 px-3">Edad / Bautismo</th>
                <th className="py-3 px-3">Organismo / Rol</th>
                <th className="py-3 px-3 text-right">Saldo Act.</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    Cargando miembros...
                  </td>
                </tr>
              ) : pag.paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-slate-400">
                    No se encontraron miembros con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                pag.paginatedItems.map((m) => {
                  const age = calculateAge(m.birth_date);
                  return (
                    <tr
                      key={m.id}
                      onClick={() => openProfile(m.id)}
                      className="hover:bg-[#F4F7FC] transition cursor-pointer"
                    >
                      <td className="py-3 px-4 max-w-[240px]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#EEF4FC] text-[#142E6B] text-xs font-bold flex items-center justify-center shrink-0">
                            {getInitials(m.full_name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#142E6B] truncate">{m.full_name}</p>
                            <p className="text-xs text-slate-500 truncate">
                              {m.phone || '—'}{m.profession ? ` · ${m.profession}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600 max-w-[170px] truncate">{m.church_name}</td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="text-xs font-semibold text-slate-800 mr-1.5">
                          {age !== null ? `${age}a` : '—'}
                        </span>
                        <Badge
                          tone={
                            m.baptism_status === 'BAUTIZADO'
                              ? 'emerald'
                              : m.baptism_status === 'NINO'
                              ? 'sky'
                              : 'amber'
                          }
                        >
                          {m.baptism_status === 'BAUTIZADO'
                            ? 'Bautizado'
                            : m.baptism_status === 'NINO'
                            ? 'Niño'
                            : 'No baut.'}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 max-w-[160px]">
                        <div className="flex items-center gap-1.5">
                          <Badge tone="navy">{m.organism}</Badge>
                          <span className="text-xs text-slate-500 truncate">{m.church_role}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                        {Number(m.pending_activity_debt || 0) > 0 ? (
                          <Badge tone="rose">Debe {formatCOP(m.pending_activity_debt)}</Badge>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-600">Al día</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => openProfile(m.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#1B449C] hover:bg-[#EEF4FC] cursor-pointer"
                            title="Ver historial"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(m)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#D98A1F] hover:bg-amber-50 cursor-pointer"
                            title="Editar"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(m)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#D81E27] hover:bg-red-50 cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={pag.page}
          totalPages={pag.totalPages}
          totalItems={pag.totalItems}
          pageSize={pag.pageSize}
          onPageChange={pag.setPage}
          onPageSizeChange={pag.setPageSize}
        />
      </div>

      {/* Modal: Crear / Editar */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? 'Editar miembro' : 'Registrar nuevo miembro'}
        subtitle="La fecha de nacimiento y estado bautismal actualizan el censo poblacional automáticamente."
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {isDistrictAdmin && (
              <div className="sm:col-span-2">
                <label className="label-field">Iglesia *</label>
                <select
                  required
                  value={form.church_id}
                  onChange={(e) => setForm((f) => ({ ...f, church_id: e.target.value }))}
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

            <div className="sm:col-span-2">
              <label className="label-field">Nombre completo *</label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                className="input-field"
              />
            </div>

            <div>
              <label className="label-field">Cédula / TI</label>
              <input
                type="text"
                value={form.id_number}
                onChange={(e) => setForm((f) => ({ ...f, id_number: e.target.value }))}
                className="input-field"
              />
            </div>

            <div>
              <label className="label-field">Celular</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="input-field"
              />
            </div>

            <div>
              <label className="label-field">Fecha de nacimiento</label>
              <input
                type="date"
                value={form.birth_date}
                onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
                className="input-field"
              />
            </div>

            <div>
              <label className="label-field">Sexo</label>
              <select
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as 'M' | 'F' }))}
                className="input-field"
              >
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>

            <div>
              <label className="label-field">Estado bautismal</label>
              <select
                value={form.baptism_status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    baptism_status: e.target.value as 'BAUTIZADO' | 'NO_BAUTIZADO' | 'NINO',
                  }))
                }
                className="input-field"
              >
                <option value="BAUTIZADO">Bautizado</option>
                <option value="NO_BAUTIZADO">No bautizado</option>
                <option value="NINO">Niño (0 a 11 años)</option>
              </select>
            </div>

            <div>
              <label className="label-field">Organismo interno</label>
              <select
                value={form.organism}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    organism: e.target.value as 'UCEI' | 'UDEI' | 'UJEI' | 'UNEI' | 'NINGUNO',
                  }))
                }
                className="input-field"
              >
                <option value="UCEI">{ORGANISM_LABELS.UCEI}</option>
                <option value="UDEI">{ORGANISM_LABELS.UDEI}</option>
                <option value="UJEI">{ORGANISM_LABELS.UJEI}</option>
                <option value="UNEI">{ORGANISM_LABELS.UNEI}</option>
                <option value="NINGUNO">Sin asignar</option>
              </select>
            </div>

            <div>
              <label className="label-field">Rol / Ministerio</label>
              <input
                type="text"
                value={form.church_role}
                onChange={(e) => setForm((f) => ({ ...f, church_role: e.target.value }))}
                className="input-field"
              />
            </div>

            <div>
              <label className="label-field">Profesión u oficio</label>
              <input
                type="text"
                value={form.profession}
                onChange={(e) => setForm((f) => ({ ...f, profession: e.target.value }))}
                className="input-field"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label-field">Dirección / Barrio</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="input-field"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold cursor-pointer"
            >
              {saving ? 'Guardando...' : 'Guardar miembro'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Historial del Miembro */}
      <Modal
        open={Boolean(profile)}
        onClose={() => setProfile(null)}
        title={profile?.member.full_name || ''}
        subtitle={
          profile
            ? `${profile.member.church_name} · ${profile.member.organism} · ${profile.member.church_role}`
            : ''
        }
        size="lg"
      >
        {profile && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
              <div>
                <span className="text-slate-500 block">Teléfono</span>
                <strong className="text-slate-900 mt-0.5 block">{profile.member.phone || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Edad</span>
                <strong className="text-slate-900 mt-0.5 block">
                  {calculateAge(profile.member.birth_date) ?? '—'} años
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Profesión</span>
                <strong className="text-slate-900 mt-0.5 block">{profile.member.profession || '—'}</strong>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-2.5">
                Actividades y saldos ({profile.activities.length})
              </h4>
              {profile.activities.length === 0 ? (
                <p className="text-xs text-slate-400">Sin actividades registradas.</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden">
                  {profile.activities.map((a) => (
                    <div key={a.id} className="px-4 py-3 flex items-center justify-between gap-2 text-xs">
                      <div>
                        <p className="font-semibold text-slate-900">{a.activity_name}</p>
                        <p className="text-slate-500">
                          {formatDate(a.event_date)} · {a.item_detail}
                        </p>
                      </div>
                      <div className="text-right tabular-nums">
                        <p className="text-slate-600">
                          {formatCOP(a.paid_amount)} / {formatCOP(a.assigned_amount)}
                        </p>
                        {a.pending_amount > 0 ? (
                          <span className="text-rose-600 font-bold">Debe {formatCOP(a.pending_amount)}</span>
                        ) : (
                          <span className="text-emerald-600 font-semibold">Al día</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-2.5">
                Diezmos registrados ({profile.tithes.length})
              </h4>
              {profile.tithes.length === 0 ? (
                <p className="text-xs text-slate-400">Sin diezmos registrados a su nombre.</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden">
                  {profile.tithes.map((t) => (
                    <div key={t.id} className="px-4 py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-800">{formatDate(t.tx_date)}</span>
                        <span className="text-slate-400 ml-2 font-mono">{t.receipt_number}</span>
                      </div>
                      <span className="font-bold text-emerald-700 tabular-nums">{formatCOP(t.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
