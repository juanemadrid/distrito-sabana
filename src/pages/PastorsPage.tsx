import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Edit3,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination, usePagination } from '../components/ui/Pagination';
import { useFeedback } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { exportPastorFichaPDF } from '../lib/export';
import { CONTRACT_LABELS, DIGNITY_LABELS, calculateAge, formatCOP, formatDate } from '../lib/format';
import type { District, Pastor } from '../types';

function emptyPastor(defaultChurchId: number | null): Partial<Pastor> {
  return {
    church_id: defaultChurchId,
    full_name: '',
    birth_date: '',
    birth_place: '',
    id_number: '',
    phone: '',
    email: '',
    ministerial_dignity: 'PASTOR',
    ministry_start_month: '',
    ministry_start_year: '',
    ministry_time_text: '',
    past_churches: '',
    national_roles: [],
    district_roles: [],
    has_contract: 1,
    contract_type: 'ACUERDO_EMOLUMENTOS',
    pays_social_security: 1,
    contract_entity: 'IGLEICO',
    monthly_remuneration: 0,
    has_real_estate: 0,
    real_estate_details: '',
    academic_level: 'UNIVERSITARIO',
    formal_theology_studies: '',
    informal_theology_studies: '',
    spouse_name: '',
    spouse_birth_date: '',
    spouse_birth_place: '',
    spouse_id_number: '',
    spouse_phone: '',
    spouse_email: '',
    spouse_dignity: 'NINGUNA',
    spouse_receives_aid: 0,
    spouse_monthly_aid: 0,
    spouse_national_roles: [],
    spouse_district_roles: [],
    spouse_academic_level: '',
    spouse_formal_theology: '',
    spouse_informal_theology: '',
    children: [],
    has_family_disability: 0,
    disability_member: 'NINGUNO',
    disability_details: '',
    data_auth_accepted: 1,
    data_auth_date: new Date().toISOString().slice(0, 10),
    signature_name: '',
    status: 'ACTIVO',
  };
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 last:border-b-0">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900 sm:text-right">{value || '—'}</span>
    </div>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || parts[0]?.[1] || '')).toUpperCase();
}

export function PastorsPage() {
  const { user, churches, isDistrictAdmin } = useAuth();
  const { notify, confirm } = useFeedback();

  const [pastors, setPastors] = useState<Pastor[]>([]);
  const [district, setDistrict] = useState<District | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [dignityFilter, setDignityFilter] = useState('ALL');

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<Partial<Pastor>>(emptyPastor(null));
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, dRes] = await Promise.all([
        api.get<{ pastors: Pastor[] }>('/api/pastors'),
        api.get<{ district: District }>('/api/district'),
      ]);
      setPastors(pRes.pastors);
      setDistrict(dRes.district);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedPastor = useMemo(
    () => pastors.find((p) => p.id === selectedId) || null,
    [pastors, selectedId]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pastors.filter((p) => {
      if (dignityFilter !== 'ALL' && p.ministerial_dignity !== dignityFilter) return false;
      if (
        q &&
        !p.full_name.toLowerCase().includes(q) &&
        !(p.church_name || '').toLowerCase().includes(q) &&
        !(p.id_number || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [pastors, search, dignityFilter]);

  const pag = usePagination(filtered, 8);

  const hydrate = (p: Pastor) => ({
    ...p,
    national_roles: p.national_roles || [],
    district_roles: p.district_roles || [],
    spouse_national_roles: p.spouse_national_roles || [],
    spouse_district_roles: p.spouse_district_roles || [],
    children: p.children || [],
  });

  const openPastor = (p: Pastor) => {
    setSelectedId(p.id);
    setCreatingNew(false);
    setEditMode(false);
    setActiveTab(1);
    setForm(hydrate(p));
  };

  const startCreate = () => {
    setSelectedId(null);
    setCreatingNew(true);
    setEditMode(true);
    setActiveTab(1);
    setForm(emptyPastor(user?.church_id || (churches[0]?.id ?? null)));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name?.trim()) {
      notify('El nombre completo del pastor es obligatorio.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (creatingNew) {
        const res = await api.post<{ pastor: Pastor }>('/api/pastors', form);
        notify('Ficha pastoral registrada correctamente.');
        await loadData();
        setCreatingNew(false);
        setEditMode(false);
        setSelectedId(res.pastor.id);
      } else if (selectedPastor) {
        await api.put(`/api/pastors/${selectedPastor.id}`, form);
        notify('Ficha pastoral actualizada.');
        await loadData();
        setEditMode(false);
      }
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'No se pudo guardar la ficha.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Pastor) => {
    const ok = await confirm({
      title: 'Eliminar ficha pastoral',
      message: `¿Deseas eliminar la hoja de vida ministerial de ${p.full_name}?`,
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    await api.del(`/api/pastors/${p.id}`);
    notify('Ficha pastoral eliminada.');
    setSelectedId(null);
    setEditMode(false);
    await loadData();
  };

  // =========================================================================
  // FULL-PAGE PASTOR DOSSIER
  // =========================================================================
  if (creatingNew || selectedPastor) {
    return (
      <form onSubmit={handleSave} className="space-y-6">
        <PageHeader
          breadcrumbs={[
            {
              label: 'Pastores',
              onClick: () => {
                setSelectedId(null);
                setCreatingNew(false);
                setEditMode(false);
              },
            },
            { label: creatingNew ? 'Nuevo registro' : selectedPastor?.full_name || '' },
          ]}
          title={creatingNew ? 'Registrar pastor o líder ministerial' : selectedPastor?.full_name || ''}
          subtitle={
            creatingNew
              ? 'Recolección oficial de datos generales, ministerio y núcleo familiar.'
              : `${DIGNITY_LABELS[selectedPastor?.ministerial_dignity || '']} · ${selectedPastor?.church_name || 'Distrito Sabana'}`
          }
          actions={
            <>
              {!editMode && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(null);
                      setCreatingNew(false);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Volver
                  </button>
                  {selectedPastor && (
                    <button
                      type="button"
                      onClick={() => exportPastorFichaPDF(selectedPastor, district)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-slate-500" />
                      Ficha PDF
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPastor) setForm(hydrate(selectedPastor));
                      setEditMode(true);
                    }}
                    className="btn-primary px-4 py-2 text-xs sm:text-sm"
                  >
                    <Edit3 className="w-4 h-4" />
                    Editar ficha
                  </button>
                </>
              )}

              {editMode && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditMode(false);
                      if (creatingNew) setCreatingNew(false);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs sm:text-sm font-semibold cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary px-4 py-2 text-xs sm:text-sm"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Guardando...' : 'Guardar ficha'}
                  </button>
                </>
              )}
            </>
          }
        />

        {/* Underline Tabs */}
        <div className="border-b border-slate-200 flex gap-6 overflow-x-auto">
          {[
            { id: 1, label: 'I. Perfil ministerial y contrato' },
            { id: 2, label: 'II. Información familiar' },
            { id: 3, label: 'III. Autorización de datos' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as 1 | 2 | 3)}
              className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap cursor-pointer transition ${
                activeTab === t.id
                  ? 'border-[#1B449C] text-[#142E6B]'
                  : 'border-transparent text-slate-500 hover:text-[#142E6B]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* TAB 1 */}
        {activeTab === 1 &&
          (!editMode && selectedPastor ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Datos personales y trayectoria</h3>
                <InfoRow label="Dignidad ministerial" value={<Badge tone="navy">{DIGNITY_LABELS[selectedPastor.ministerial_dignity]}</Badge>} />
                <InfoRow label="Número de identificación" value={selectedPastor.id_number} />
                <InfoRow label="Fecha de nacimiento" value={`${formatDate(selectedPastor.birth_date)}${selectedPastor.birth_place ? ` · ${selectedPastor.birth_place}` : ''}`} />
                <InfoRow label="Celular" value={selectedPastor.phone} />
                <InfoRow label="Correo electrónico" value={selectedPastor.email} />
                <InfoRow label="Iglesia actual" value={selectedPastor.church_name} />
                <InfoRow label="Tiempo de ministerio" value={`${selectedPastor.ministry_time_text || '—'} (desde ${selectedPastor.ministry_start_month || '--'}/${selectedPastor.ministry_start_year || '----'})`} />
                <InfoRow label="Iglesias donde ha pastoreado" value={selectedPastor.past_churches} />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Contrato, remuneración y estudios</h3>
                <InfoRow label="Tipo de contrato" value={CONTRACT_LABELS[selectedPastor.contract_type]} />
                <InfoRow label="Entidad contratante" value={selectedPastor.contract_entity || 'No aplica'} />
                <InfoRow label="Seguridad social" value={selectedPastor.pays_social_security ? 'Sí paga' : 'No'} />
                <InfoRow label="Remuneración mensual" value={<span className="font-bold text-emerald-700 tabular-nums">{formatCOP(selectedPastor.monthly_remuneration)}</span>} />
                <InfoRow label="Bien inmueble" value={selectedPastor.has_real_estate ? selectedPastor.real_estate_details || 'Sí' : 'No'} />
                <InfoRow label="Nivel académico" value={selectedPastor.academic_level} />
                <InfoRow label="Estudios teológicos formales" value={selectedPastor.formal_theology_studies} />
                <InfoRow label="Estudios teológicos informales" value={selectedPastor.informal_theology_studies} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Datos generales y ministerio</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="label-field">Nombre completo *</label>
                    <input
                      type="text"
                      required
                      value={form.full_name || ''}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">Dignidad ministerial</label>
                    <select
                      value={form.ministerial_dignity || 'PASTOR'}
                      onChange={(e) =>
                        setForm({ ...form, ministerial_dignity: e.target.value as Pastor['ministerial_dignity'] })
                      }
                      className="input-field"
                    >
                      <option value="REVERENDO">Reverendo</option>
                      <option value="PASTOR">Pastor</option>
                      <option value="LIDER">Líder</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-field">Iglesia asignada</label>
                    <select
                      disabled={!isDistrictAdmin}
                      value={form.church_id ? String(form.church_id) : ''}
                      onChange={(e) => setForm({ ...form, church_id: e.target.value ? Number(e.target.value) : null })}
                      className="input-field"
                    >
                      <option value="">Sin asignar</option>
                      {churches.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label-field">Cédula / Identificación</label>
                    <input
                      type="text"
                      value={form.id_number || ''}
                      onChange={(e) => setForm({ ...form, id_number: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">Fecha de nacimiento</label>
                    <input
                      type="date"
                      value={form.birth_date || ''}
                      onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">Lugar de nacimiento</label>
                    <input
                      type="text"
                      value={form.birth_place || ''}
                      onChange={(e) => setForm({ ...form, birth_place: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">Celular</label>
                    <input
                      type="text"
                      value={form.phone || ''}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label-field">Correo electrónico</label>
                    <input
                      type="email"
                      value={form.email || ''}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">Tiempo de ministerio</label>
                    <input
                      type="text"
                      placeholder="Ej. 14 años"
                      value={form.ministry_time_text || ''}
                      onChange={(e) => setForm({ ...form, ministry_time_text: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label-field">Mes inicio</label>
                      <input
                        type="text"
                        placeholder="MM"
                        value={form.ministry_start_month || ''}
                        onChange={(e) => setForm({ ...form, ministry_start_month: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="label-field">Año inicio</label>
                      <input
                        type="text"
                        placeholder="AAAA"
                        value={form.ministry_start_year || ''}
                        onChange={(e) => setForm({ ...form, ministry_start_year: e.target.value })}
                        className="input-field"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label-field">Iglesias donde ha pastoreado</label>
                    <textarea
                      rows={2}
                      value={form.past_churches || ''}
                      onChange={(e) => setForm({ ...form, past_churches: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Contrato y formación</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label-field">Tipo de contrato</label>
                    <select
                      value={form.contract_type || 'NINGUNO'}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          contract_type: e.target.value as Pastor['contract_type'],
                          has_contract: e.target.value === 'NINGUNO' ? 0 : 1,
                        })
                      }
                      className="input-field"
                    >
                      <option value="ACUERDO_EMOLUMENTOS">Acuerdo por Emolumentos</option>
                      <option value="LABORAL_TERMINO_FIJO">Laboral a Término Fijo</option>
                      <option value="LABORAL_TERMINO_INDEFINIDO">Laboral a Término Indefinido</option>
                      <option value="NINGUNO">Sin contrato</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-field">Entidad contratante</label>
                    <select
                      value={form.contract_entity || ''}
                      onChange={(e) => setForm({ ...form, contract_entity: e.target.value as Pastor['contract_entity'] })}
                      className="input-field"
                    >
                      <option value="">No aplica</option>
                      <option value="IGLEICO">IGLEICO</option>
                      <option value="IGLEICO_CENTRAL">IGLEICO Central</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-field">Remuneración mensual ($)</label>
                    <input
                      type="number"
                      value={form.monthly_remuneration || 0}
                      onChange={(e) => setForm({ ...form, monthly_remuneration: Number(e.target.value) })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">Nivel académico</label>
                    <select
                      value={form.academic_level || 'BACHILLER'}
                      onChange={(e) => setForm({ ...form, academic_level: e.target.value })}
                      className="input-field"
                    >
                      <option value="PRIMARIA">Primaria</option>
                      <option value="BACHILLER">Bachiller</option>
                      <option value="TECNICO">Técnico</option>
                      <option value="TECNOLOGO">Tecnólogo</option>
                      <option value="UNIVERSITARIO">Universitario</option>
                      <option value="POSTGRADO">Postgrado</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(form.pays_social_security)}
                        onChange={(e) => setForm({ ...form, pays_social_security: e.target.checked ? 1 : 0 })}
                      />
                      Paga seguridad social (si acuerdo por emolumentos)
                    </label>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label-field">Bien inmueble (especifique cuál si posee)</label>
                    <input
                      type="text"
                      value={form.real_estate_details || ''}
                      onChange={(e) =>
                        setForm({ ...form, real_estate_details: e.target.value, has_real_estate: e.target.value.trim() ? 1 : 0 })
                      }
                      className="input-field"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label-field">Estudios teológicos formales (aprobados por el Estado)</label>
                    <input
                      type="text"
                      value={form.formal_theology_studies || ''}
                      onChange={(e) => setForm({ ...form, formal_theology_studies: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label-field">Estudios teológicos informales</label>
                    <input
                      type="text"
                      value={form.informal_theology_studies || ''}
                      onChange={(e) => setForm({ ...form, informal_theology_studies: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

        {/* TAB 2: FAMILIA */}
        {activeTab === 2 &&
          (!editMode && selectedPastor ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Información del cónyuge</h3>
                <InfoRow label="Nombre" value={selectedPastor.spouse_name || 'No registra'} />
                <InfoRow label="Dignidad ministerial" value={DIGNITY_LABELS[selectedPastor.spouse_dignity] || '—'} />
                <InfoRow label="Identificación" value={selectedPastor.spouse_id_number} />
                <InfoRow label="Fecha de nacimiento" value={formatDate(selectedPastor.spouse_birth_date)} />
                <InfoRow label="Celular" value={selectedPastor.spouse_phone} />
                <InfoRow
                  label="Ayuda mensual de la iglesia"
                  value={selectedPastor.spouse_receives_aid ? formatCOP(selectedPastor.spouse_monthly_aid) : 'No recibe'}
                />
                <InfoRow label="Estudios académicos" value={selectedPastor.spouse_academic_level} />
                <InfoRow label="Estudios teológicos" value={selectedPastor.spouse_formal_theology || selectedPastor.spouse_informal_theology} />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-3">
                    Hijos registrados ({selectedPastor.children.length})
                  </h3>
                  {selectedPastor.children.length === 0 ? (
                    <p className="text-xs text-slate-500">Sin hijos registrados.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {selectedPastor.children.map((ch, idx) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-900">{ch.name}</span>
                          <span className="text-xs text-slate-500">
                            {formatDate(ch.birth_date)} · {calculateAge(ch.birth_date) ?? '—'} años
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Condición de discapacidad</h3>
                  <p className="text-sm text-slate-700">
                    {selectedPastor.has_family_disability
                      ? `Sí (${selectedPastor.disability_member}): ${selectedPastor.disability_details}`
                      : 'No registra ninguna condición de discapacidad en el núcleo familiar.'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="label-field">Nombre del cónyuge</label>
                  <input
                    type="text"
                    value={form.spouse_name || ''}
                    onChange={(e) => setForm({ ...form, spouse_name: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-field">Dignidad ministerial</label>
                  <select
                    value={form.spouse_dignity || 'NINGUNA'}
                    onChange={(e) => setForm({ ...form, spouse_dignity: e.target.value })}
                    className="input-field"
                  >
                    <option value="NINGUNA">Ninguna</option>
                    <option value="LIDER">Líder</option>
                    <option value="PASTOR">Pastor(a)</option>
                    <option value="REVERENDO">Reverendo(a)</option>
                  </select>
                </div>
                <div>
                  <label className="label-field">Cédula cónyuge</label>
                  <input
                    type="text"
                    value={form.spouse_id_number || ''}
                    onChange={(e) => setForm({ ...form, spouse_id_number: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-field">Fecha nacimiento cónyuge</label>
                  <input
                    type="date"
                    value={form.spouse_birth_date || ''}
                    onChange={(e) => setForm({ ...form, spouse_birth_date: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-field">Ayuda mensual ($)</label>
                  <input
                    type="number"
                    value={form.spouse_monthly_aid || 0}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        spouse_monthly_aid: Number(e.target.value),
                        spouse_receives_aid: Number(e.target.value) > 0 ? 1 : 0,
                      })
                    }
                    className="input-field"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase text-slate-600">Hijos ({(form.children || []).length})</h4>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({ ...form, children: [...(form.children || []), { name: '', birth_date: '' }] })
                    }
                    className="text-xs font-semibold text-slate-900 hover:underline cursor-pointer"
                  >
                    + Agregar hijo(a)
                  </button>
                </div>
                {(form.children || []).map((ch, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-3">
                    <input
                      type="text"
                      placeholder="Nombre completo"
                      value={ch.name}
                      onChange={(e) => {
                        const list = [...(form.children || [])];
                        list[idx] = { ...list[idx], name: e.target.value };
                        setForm({ ...form, children: list });
                      }}
                      className="input-field flex-1 min-w-[200px]"
                    />
                    <input
                      type="date"
                      value={ch.birth_date}
                      onChange={(e) => {
                        const list = [...(form.children || [])];
                        list[idx] = { ...list[idx], birth_date: e.target.value };
                        setForm({ ...form, children: list });
                      }}
                      className="input-field w-auto"
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, children: (form.children || []).filter((_, i) => i !== idx) })}
                      className="text-xs font-semibold text-rose-600 cursor-pointer"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

        {/* TAB 3: LEY 1581 */}
        {activeTab === 3 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Autorización de tratamiento de datos personales (Ley 1581 de 2012)
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200/70">
              De conformidad con lo dispuesto en las normas vigentes sobre protección de datos personales, en especial la Ley 1581 de 2012 y el Decreto 1074 de 2015, autorizo libre, expresa e inequívocamente a la Iglesia Evangélica Interamericana de Colombia (IGLEICO), para que realice la recolección y tratamiento de los datos personales suministrados de manera veraz y completa.
            </p>
            {!editMode && selectedPastor ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <InfoRow label="Estado" value={selectedPastor.data_auth_accepted ? <Badge tone="emerald">Autorizado</Badge> : <Badge tone="rose">Pendiente</Badge>} />
                <InfoRow label="Fecha" value={formatDate(selectedPastor.data_auth_date)} />
                <InfoRow label="Firma" value={selectedPastor.signature_name || selectedPastor.full_name} />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 pb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(form.data_auth_accepted)}
                    onChange={(e) => setForm({ ...form, data_auth_accepted: e.target.checked ? 1 : 0 })}
                  />
                  Sí, autorizo el tratamiento
                </label>
                <div>
                  <label className="label-field">Fecha</label>
                  <input
                    type="date"
                    value={form.data_auth_date || ''}
                    onChange={(e) => setForm({ ...form, data_auth_date: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-field">Firma (Nombre completo)</label>
                  <input
                    type="text"
                    value={form.signature_name || ''}
                    onChange={(e) => setForm({ ...form, signature_name: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    );
  }

  // =========================================================================
  // DIRECTORY VIEW (PAGINATED TABLE)
  // =========================================================================
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pastores y Liderazgo Ministerial"
        subtitle="Hojas de vida ministeriales, contratos, formación teológica y núcleos familiares del Distrito Sabana."
        actions={
          <button
            type="button"
            onClick={startCreate}
            className="btn-primary px-4 py-2.5 text-sm"
          >
            <Plus className="w-4 h-4" />
            Registrar pastor
          </button>
        }
      />

      <div className="bg-white rounded-2xl border border-[#DDE6F4] shadow-[0_2px_8px_rgba(20,46,107,0.04)] overflow-hidden">
        <div className="p-4 border-b border-[#E4ECF7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-[#1B449C]/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                pag.setPage(1);
              }}
              placeholder="Buscar pastor, cédula o iglesia..."
              className="input-field pl-10"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#EEF4FC] p-1 rounded-xl text-xs font-semibold">
            {[
              { k: 'ALL', l: 'Todos' },
              { k: 'REVERENDO', l: 'Reverendos' },
              { k: 'PASTOR', l: 'Pastores' },
              { k: 'LIDER', l: 'Líderes' },
            ].map((item) => (
              <button
                key={item.k}
                type="button"
                onClick={() => {
                  setDignityFilter(item.k);
                  pag.setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  dignityFilter === item.k ? 'bg-[#1B449C] text-white shadow-xs' : 'text-[#142E6B]/80 hover:text-[#142E6B]'
                }`}
              >
                {item.l}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-left text-xs font-medium text-slate-500">
                <th className="py-3 px-5">Pastor / Líder</th>
                <th className="py-3 px-4">Iglesia asignada</th>
                <th className="py-3 px-4">Dignidad y trayectoria</th>
                <th className="py-3 px-4">Contrato</th>
                <th className="py-3 px-4 text-right">Remuneración</th>
                <th className="py-3 px-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    Cargando pastores...
                  </td>
                </tr>
              ) : pag.paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-slate-400">
                    No se encontraron registros pastorales.
                  </td>
                </tr>
              ) : (
                pag.paginatedItems.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => openPastor(p)}
                    className="hover:bg-slate-50/80 transition cursor-pointer"
                  >
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1B449C] to-[#142E6B] text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {getInitials(p.full_name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{p.full_name}</p>
                          <p className="text-xs text-slate-500">
                            {p.phone || '—'} {p.id_number ? `· CC ${p.id_number}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                      {p.church_name || 'Sin asignar'}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge tone={p.ministerial_dignity === 'REVERENDO' ? 'amber' : 'navy'}>
                        {DIGNITY_LABELS[p.ministerial_dignity]}
                      </Badge>
                      <p className="text-[11px] text-slate-500 mt-1">{p.ministry_time_text || '—'}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-xs font-medium text-slate-700">{CONTRACT_LABELS[p.contract_type]}</p>
                      {Boolean(p.data_auth_accepted) && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 mt-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Ley 1581
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-900 tabular-nums">
                      {formatCOP(p.monthly_remuneration)}
                    </td>
                    <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openPastor(p)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                        >
                          Ver ficha
                        </button>
                        <button
                          type="button"
                          onClick={() => exportPastorFichaPDF(p, district)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                          title="Descargar Ficha PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {isDistrictAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDelete(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
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
    </div>
  );
}
