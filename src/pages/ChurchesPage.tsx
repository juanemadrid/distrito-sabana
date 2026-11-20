import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Check,
  Church as ChurchIcon,
  Download,
  Edit3,
  Landmark,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination, usePagination } from '../components/ui/Pagination';
import { useFeedback } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { exportChurchFichaPDF } from '../lib/export';
import { CATEGORIZATION_LABELS, formatCOP } from '../lib/format';
import type { Church, District, Zone } from '../types';

function emptyChurch(): Partial<Church> {
  return {
    name: '',
    zone_id: null,
    zone_name: '',
    address: '',
    stratum: '2',
    neighborhood: '',
    municipality: '',
    department: 'Sucre',
    phone: '',
    email: '',
    categorization: 'CONSTITUIDA',
    foundation_month: '',
    foundation_year: '',
    is_active: 1,
    premises_type: 'PROPIO',
    premises_other: '',
    property_owner_type: 'IGLEICO',
    property_owner_name: '',
    rent_amount: 0,
    rent_start_date: '',
    rent_end_date: '',
    has_pastoral_house: 0,
    pastoral_house_rent: 0,
    ownership_doc_type: 'ESCRITURA',
    pays_property_tax: 0,
    property_tax_up_to_date: 'NO_APLICA',
    other_properties: {},
    has_leased_property: 0,
    leased_property_income: 0,
    vehicles: {},
    avg_monthly_income: 0,
    has_bank_account: 0,
    bank_nit: '890.905.568-5',
    bank_name: '',
    bank_account_type: 'Ahorros',
    has_accounts_payable: 0,
    has_hired_staff: 0,
    hired_staff: [],
    has_copastor: 0,
    copastor_name: '',
    copastor_phone: '',
    copastor_email: '',
    copastor_remuneration: 0,
    copastor_no_pay: 1,
    has_local_council: 1,
    local_council_count: 5,
    treasurer_name: '',
    treasurer_phone: '',
    treasurer_email: '',
    treasurer_academic: '',
    secretary_name: '',
    secretary_phone: '',
    secretary_email: '',
    secretary_academic: '',
    has_ucei: 1,
    has_ujei: 1,
    has_udei: 1,
    has_unei: 1,
    ministry_missions: 0,
    ministry_discipleship: 1,
    ministry_intercession: 1,
    ministry_evangelism: 1,
    ministry_worship: 1,
    ministry_other: '',
    discipleship_program: '',
    has_preaching_fields: 0,
    preaching_fields_count: 0,
    has_ordained_ministers: 0,
    ordained_ministers_count: 0,
    has_retired_pastors: 0,
    retired_pastors_count: 0,
    has_professionals: 0,
    professionals: [],
    skills: {},
    sunday_school_teachers: 0,
    has_age_divided_classes: 0,
    age_divided_classes_info: '',
    institutions: {},
    social: {},
    equipment: {},
    has_theology_teachers: 0,
    use_auto_census: 1,
    manual_census: {},
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

export function ChurchesPage({ initialChurchId }: { initialChurchId?: number | null }) {
  const { isDistrictAdmin, refreshChurches } = useAuth();
  const { notify, confirm } = useFeedback();

  const [churches, setChurches] = useState<Church[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [district, setDistrict] = useState<District | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('ALL');
  const [zoneFilter, setZoneFilter] = useState('ALL');

  // Full-page detail / create / edit state
  const [selectedId, setSelectedId] = useState<number | null>(initialChurchId ?? null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<Partial<Church>>(emptyChurch());
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cRes, dRes] = await Promise.all([
        api.get<{ churches: Church[] }>('/api/churches'),
        api.get<{ district: District; zones: Zone[] }>('/api/district'),
      ]);
      setChurches(cRes.churches);
      setDistrict(dRes.district);
      setZones(dRes.zones);
      // Si es usuario local (solo 1 iglesia), abrir directamente su ficha limpia
      if (!isDistrictAdmin && cRes.churches.length === 1 && !selectedId) {
        setSelectedId(cRes.churches[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialChurchId) {
      setSelectedId(initialChurchId);
      setCreatingNew(false);
      setEditMode(false);
    }
  }, [initialChurchId]);

  const selectedChurch = useMemo(
    () => churches.find((c) => c.id === selectedId) || null,
    [churches, selectedId]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return churches.filter((c) => {
      if (catFilter !== 'ALL' && c.categorization !== catFilter) return false;
      if (zoneFilter !== 'ALL' && String(c.zone_id || '') !== zoneFilter) return false;
      if (
        q &&
        !c.name.toLowerCase().includes(q) &&
        !(c.municipality || '').toLowerCase().includes(q) &&
        !(c.pastor?.full_name || '').toLowerCase().includes(q) &&
        !(c.neighborhood || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [churches, search, catFilter, zoneFilter]);

  const pag = usePagination(filtered, 8);

  const hydrateForEdit = (c: Church) => ({
    ...c,
    other_properties: c.other_properties || {},
    vehicles: c.vehicles || {},
    hired_staff: c.hired_staff || [],
    professionals: c.professionals || [],
    skills: c.skills || {},
    institutions: c.institutions || {},
    social: c.social || {},
    equipment: c.equipment || {},
    manual_census: c.manual_census || {},
  });

  const openChurch = (c: Church) => {
    setSelectedId(c.id);
    setCreatingNew(false);
    setEditMode(false);
    setActiveTab(1);
    setForm(hydrateForEdit(c));
  };

  const startCreate = () => {
    setSelectedId(null);
    setCreatingNew(true);
    setEditMode(true);
    setActiveTab(1);
    setForm(emptyChurch());
  };

  const startEditCurrent = () => {
    if (!selectedChurch) return;
    setForm(hydrateForEdit(selectedChurch));
    setEditMode(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) {
      notify('El nombre completo de la iglesia es obligatorio.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (creatingNew) {
        const res = await api.post<{ church: Church }>('/api/churches', form);
        notify('Iglesia registrada exitosamente.');
        await loadData();
        await refreshChurches();
        setCreatingNew(false);
        setEditMode(false);
        setSelectedId(res.church.id);
      } else if (selectedChurch) {
        await api.put(`/api/churches/${selectedChurch.id}`, form);
        notify('Ficha de la iglesia actualizada correctamente.');
        await loadData();
        await refreshChurches();
        setEditMode(false);
      }
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'No se pudo guardar la ficha.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Church) => {
    const ok = await confirm({
      title: 'Eliminar iglesia',
      message: `¿Deseas eliminar "${c.name}" y todos sus registros asociados? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar iglesia',
      destructive: true,
    });
    if (!ok) return;
    await api.del(`/api/churches/${c.id}`);
    notify('Iglesia eliminada.');
    setSelectedId(null);
    setEditMode(false);
    await loadData();
    await refreshChurches();
  };

  // =========================================================================
  // FULL-PAGE DETAIL & EDITOR WORKSPACE (NEVER A CRAMPED MODAL!)
  // =========================================================================
  if (creatingNew || selectedChurch) {
    const c = editMode ? (form as Church) : selectedChurch!;
    const census = selectedChurch?.census || c.auto_census;

    return (
      <form onSubmit={handleSave} className="space-y-6">
        <PageHeader
          breadcrumbs={[
            ...(isDistrictAdmin
              ? [
                  {
                    label: 'Iglesias',
                    onClick: () => {
                      setSelectedId(null);
                      setCreatingNew(false);
                      setEditMode(false);
                    },
                  },
                ]
              : []),
            { label: creatingNew ? 'Nueva iglesia' : selectedChurch?.name || '' },
          ]}
          title={creatingNew ? 'Registrar nueva iglesia' : selectedChurch?.name || ''}
          subtitle={
            creatingNew
              ? 'Completa los datos oficiales de la congregación para el Distrito Sabana.'
              : [selectedChurch?.address, selectedChurch?.neighborhood, selectedChurch?.municipality, selectedChurch?.department]
                  .filter(Boolean)
                  .join(' · ')
          }
          actions={
            <>
              {isDistrictAdmin && !editMode && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(null);
                    setCreatingNew(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold cursor-pointer transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver
                </button>
              )}

              {!editMode && selectedChurch && (
                <>
                  <button
                    type="button"
                    onClick={() => exportChurchFichaPDF(selectedChurch, district)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold cursor-pointer transition"
                  >
                    <Download className="w-4 h-4 text-slate-500" />
                    Ficha PDF
                  </button>
                  <button
                    type="button"
                    onClick={startEditCurrent}
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
                      if (creatingNew) {
                        setCreatingNew(false);
                        setEditMode(false);
                      } else {
                        setEditMode(false);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold cursor-pointer"
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
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </>
              )}
            </>
          }
        />

        {/* Executive Summary Strip (View mode) */}
        {!creatingNew && selectedChurch && !editMode && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
              <p className="text-xs font-medium text-slate-500">Pastor titular</p>
              <p className="text-sm font-bold text-slate-900 mt-1.5 truncate">
                {selectedChurch.pastor?.full_name || 'Sin asignar'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{selectedChurch.pastor?.phone || '—'}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
              <p className="text-xs font-medium text-slate-500">Membresía activa</p>
              <p className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
                {selectedChurch.census.grand_total} personas
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedChurch.census.total_baptized} baut. · {selectedChurch.census.total_not_baptized} no baut. · {selectedChurch.census.total_children} niños
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
              <p className="text-xs font-medium text-slate-500">Estado del inmueble</p>
              <p className="text-sm font-bold text-slate-900 mt-1.5">{selectedChurch.premises_type}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedChurch.has_pastoral_house ? 'Con casa pastoral' : 'Sin casa pastoral'}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4">
              <p className="text-xs font-medium text-slate-500">Promedio mensual</p>
              <p className="text-lg font-bold text-emerald-700 mt-1 tabular-nums">
                {formatCOP(selectedChurch.live_avg_monthly_income || selectedChurch.avg_monthly_income)}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedChurch.has_bank_account ? `${selectedChurch.bank_name} (${selectedChurch.bank_nit})` : 'Sin cuenta bancaria'}
              </p>
            </div>
          </div>
        )}

        {/* Underline Section Tabs */}
        <div className="border-b border-[#DDE6F4] flex gap-6 overflow-x-auto">
          {[
            { id: 1, label: 'Información general y bienes' },
            { id: 2, label: 'Perfil financiero' },
            { id: 3, label: 'Ministerios y liderazgo' },
            { id: 4, label: 'Medios y censo poblacional' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as 1 | 2 | 3 | 4)}
              className={`pb-3 text-sm font-bold border-b-2 whitespace-nowrap transition cursor-pointer ${
                activeTab === t.id
                  ? 'border-[#1B449C] text-[#142E6B]'
                  : 'border-transparent text-slate-500 hover:text-[#142E6B]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* TAB 1: GENERAL Y BIENES */}
        {activeTab === 1 &&
          (!editMode && selectedChurch ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Identificación y ubicación</h3>
                <InfoRow
                  label="Categorización"
                  value={
                    <Badge
                      tone={
                        selectedChurch.categorization === 'CONSTITUIDA'
                          ? 'emerald'
                          : selectedChurch.categorization === 'EN_FORMACION'
                          ? 'amber'
                          : 'sky'
                      }
                    >
                      {CATEGORIZATION_LABELS[selectedChurch.categorization]}
                    </Badge>
                  }
                />
                <InfoRow label="Zona del Distrito" value={selectedChurch.zone_name || 'Sin asignar'} />
                <InfoRow label="Dirección" value={selectedChurch.address} />
                <InfoRow label="Barrio / Vereda" value={selectedChurch.neighborhood} />
                <InfoRow
                  label="Municipio y Departamento"
                  value={`${selectedChurch.municipality}, ${selectedChurch.department}`}
                />
                <InfoRow label="Estrato" value={selectedChurch.stratum} />
                <InfoRow
                  label="Fecha de fundación"
                  value={
                    selectedChurch.foundation_year
                      ? `${selectedChurch.foundation_month || '--'}/${selectedChurch.foundation_year}`
                      : '—'
                  }
                />
                <InfoRow label="Teléfono" value={selectedChurch.phone} />
                <InfoRow label="Correo electrónico" value={selectedChurch.email} />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Propiedad, arriendos y vehículos</h3>
                <InfoRow label="Tipo de local" value={selectedChurch.premises_type} />
                <InfoRow
                  label="Propiedad a nombre de"
                  value={
                    [selectedChurch.property_owner_type, selectedChurch.property_owner_name]
                      .filter(Boolean)
                      .join(' · ') || '—'
                  }
                />
                <InfoRow label="Documento de propiedad" value={selectedChurch.ownership_doc_type} />
                <InfoRow label="Valor arriendo local" value={formatCOP(selectedChurch.rent_amount)} />
                <InfoRow
                  label="Casa pastoral"
                  value={
                    selectedChurch.has_pastoral_house
                      ? 'Sí dispone'
                      : `No (Arriendo: ${formatCOP(selectedChurch.pastoral_house_rent)})`
                  }
                />
                <InfoRow
                  label="Impuesto predial"
                  value={
                    selectedChurch.pays_property_tax
                      ? `Paga predial · Al día: ${selectedChurch.property_tax_up_to_date}`
                      : 'No paga / No aplica'
                  }
                />
                <InfoRow
                  label="Propiedad arrendada a terceros"
                  value={
                    selectedChurch.has_leased_property
                      ? `Sí (${formatCOP(selectedChurch.leased_property_income)}/mes)`
                      : 'No'
                  }
                />
                <InfoRow
                  label="Vehículos registrados"
                  value={
                    [
                      selectedChurch.vehicles?.has_car && 'Automóvil',
                      selectedChurch.vehicles?.has_moto && 'Motocicleta',
                    ]
                      .filter(Boolean)
                      .join(', ') || 'Ninguno'
                  }
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Datos generales de la iglesia</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="label-field">Nombre completo de la iglesia *</label>
                    <input
                      type="text"
                      required
                      value={form.name || ''}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">Categorización</label>
                    <select
                      value={form.categorization || 'CONSTITUIDA'}
                      onChange={(e) =>
                        setForm({ ...form, categorization: e.target.value as Church['categorization'] })
                      }
                      className="input-field"
                    >
                      <option value="CONSTITUIDA">Iglesia Constituida</option>
                      <option value="EN_FORMACION">Iglesia en Formación</option>
                      <option value="CAMPO_PREDICACION">Campo de Predicación</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-field">Zona del Distrito Sabana</label>
                    <select
                      value={form.zone_id ? String(form.zone_id) : ''}
                      onChange={(e) => {
                        const z = zones.find((x) => String(x.id) === e.target.value);
                        setForm({ ...form, zone_id: z ? z.id : null, zone_name: z ? z.name : '' });
                      }}
                      className="input-field"
                    >
                      <option value="">Sin zona asignada</option>
                      {zones.map((z) => (
                        <option key={z.id} value={String(z.id)}>
                          {z.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label-field">Dirección</label>
                    <input
                      type="text"
                      value={form.address || ''}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">Barrio o Vereda</label>
                    <input
                      type="text"
                      value={form.neighborhood || ''}
                      onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">Estrato</label>
                    <input
                      type="text"
                      value={form.stratum || ''}
                      onChange={(e) => setForm({ ...form, stratum: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">Municipio</label>
                    <input
                      type="text"
                      value={form.municipality || ''}
                      onChange={(e) => setForm({ ...form, municipality: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">Departamento</label>
                    <input
                      type="text"
                      value={form.department || ''}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">Teléfono</label>
                    <input
                      type="text"
                      value={form.phone || ''}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">Correo electrónico</label>
                    <input
                      type="email"
                      value={form.email || ''}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">Mes fundación (MM)</label>
                    <input
                      type="text"
                      placeholder="Ej. 04"
                      value={form.foundation_month || ''}
                      onChange={(e) => setForm({ ...form, foundation_month: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">Año fundación (AAAA)</label>
                    <input
                      type="text"
                      placeholder="Ej. 1999"
                      value={form.foundation_year || ''}
                      onChange={(e) => setForm({ ...form, foundation_year: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Bienes, arriendos y vehículos</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label-field">El local de la iglesia es</label>
                    <select
                      value={form.premises_type || 'PROPIO'}
                      onChange={(e) =>
                        setForm({ ...form, premises_type: e.target.value as Church['premises_type'] })
                      }
                      className="input-field"
                    >
                      <option value="PROPIO">Propio</option>
                      <option value="COMODATO">Comodato</option>
                      <option value="PRESTADO">Prestado</option>
                      <option value="ARRENDADO">Arrendado</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-field">A nombre de quién está</label>
                    <select
                      value={form.property_owner_type || ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          property_owner_type: e.target.value as Church['property_owner_type'],
                        })
                      }
                      className="input-field"
                    >
                      <option value="">Selecciona...</option>
                      <option value="IGLEICO_CENTRAL">IGLEICO Central</option>
                      <option value="IGLEICO">IGLEICO</option>
                      <option value="TERCERO">Tercero</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label-field">Nombre del propietario (si es tercero)</label>
                    <input
                      type="text"
                      value={form.property_owner_name || ''}
                      onChange={(e) => setForm({ ...form, property_owner_name: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">Valor arriendo local ($)</label>
                    <input
                      type="number"
                      value={form.rent_amount || 0}
                      onChange={(e) => setForm({ ...form, rent_amount: Number(e.target.value) })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">Documento de propiedad</label>
                    <select
                      value={form.ownership_doc_type || 'NINGUNO'}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          ownership_doc_type: e.target.value as Church['ownership_doc_type'],
                        })
                      }
                      className="input-field"
                    >
                      <option value="ESCRITURA">Escritura</option>
                      <option value="COMPRAVENTA">Compraventa</option>
                      <option value="NINGUNO">Ninguno / No aplica</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-field">¿Tiene casa pastoral?</label>
                    <select
                      value={form.has_pastoral_house ? '1' : '0'}
                      onChange={(e) => setForm({ ...form, has_pastoral_house: Number(e.target.value) })}
                      className="input-field"
                    >
                      <option value="1">Sí</option>
                      <option value="0">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-field">Arriendo casa pastoral ($)</label>
                    <input
                      type="number"
                      value={form.pastoral_house_rent || 0}
                      onChange={(e) => setForm({ ...form, pastoral_house_rent: Number(e.target.value) })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">¿Paga impuesto predial?</label>
                    <select
                      value={form.pays_property_tax ? '1' : '0'}
                      onChange={(e) => setForm({ ...form, pays_property_tax: Number(e.target.value) })}
                      className="input-field"
                    >
                      <option value="1">Sí</option>
                      <option value="0">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-field">¿Al día con predial?</label>
                    <select
                      value={form.property_tax_up_to_date || 'NO_APLICA'}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          property_tax_up_to_date: e.target.value as Church['property_tax_up_to_date'],
                        })
                      }
                      className="input-field"
                    >
                      <option value="SI">Sí</option>
                      <option value="NO">No</option>
                      <option value="NO_APLICA">No aplica</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 pt-2 border-t border-slate-100 flex flex-wrap gap-6">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(form.vehicles?.has_car)}
                        onChange={(e) =>
                          setForm({ ...form, vehicles: { ...(form.vehicles || {}), has_car: e.target.checked } })
                        }
                      />
                      Tiene carro
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(form.vehicles?.has_moto)}
                        onChange={(e) =>
                          setForm({ ...form, vehicles: { ...(form.vehicles || {}), has_moto: e.target.checked } })
                        }
                      />
                      Tiene moto
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ))}

        {/* TAB 2: PERFIL FINANCIERO */}
        {activeTab === 2 &&
          (!editMode && selectedChurch ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Cuentas e ingresos</h3>
                <InfoRow label="Promedio ingresos declarado" value={formatCOP(selectedChurch.avg_monthly_income)} />
                <InfoRow
                  label="Promedio real registrado en el sistema"
                  value={
                    <span className="text-emerald-700 font-bold">
                      {formatCOP(selectedChurch.live_avg_monthly_income || 0)}
                    </span>
                  }
                />
                <InfoRow
                  label="Cuenta bancaria IGLEICO"
                  value={selectedChurch.has_bank_account ? 'Sí' : 'No dispone'}
                />
                {Boolean(selectedChurch.has_bank_account) && (
                  <>
                    <InfoRow label="NIT asociado" value={selectedChurch.bank_nit} />
                    <InfoRow label="Entidad bancaria" value={selectedChurch.bank_name} />
                    <InfoRow label="Tipo de cuenta" value={selectedChurch.bank_account_type} />
                  </>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Cuentas por pagar / Préstamos</h3>
                  {!selectedChurch.loans || selectedChurch.loans.length === 0 ? (
                    <p className="text-xs text-slate-500">No registra préstamos ni cuentas por pagar.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedChurch.loans.map((l) => (
                        <div key={l.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex justify-between text-xs">
                          <div>
                            <p className="font-semibold text-slate-900">{l.creditor}</p>
                            <p className="text-slate-500">{l.term_description || l.seniority_text}</p>
                          </div>
                          <div className="text-right tabular-nums">
                            <p className="font-bold text-rose-600">{formatCOP(l.remaining_amount)}</p>
                            <p className="text-[11px] text-slate-400">de {formatCOP(l.initial_amount)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Personal contratado</h3>
                  {selectedChurch.hired_staff.length === 0 ? (
                    <p className="text-xs text-slate-500">No registra personal contratado.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedChurch.hired_staff.map((st, i) => (
                        <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex justify-between text-xs">
                          <div>
                            <p className="font-semibold text-slate-900">{st.contract_type}</p>
                            <p className="text-slate-500">
                              Seguridad social: {st.pays_social_security ? 'Sí' : 'No'}
                            </p>
                          </div>
                          <p className="font-bold text-slate-900 tabular-nums">{formatCOP(st.value)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="label-field">Promedio ingresos mensuales declarado ($)</label>
                  <input
                    type="number"
                    value={form.avg_monthly_income || 0}
                    onChange={(e) => setForm({ ...form, avg_monthly_income: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-field">¿Cuenta bancaria a nombre IGLEICO?</label>
                  <select
                    value={form.has_bank_account ? '1' : '0'}
                    onChange={(e) => setForm({ ...form, has_bank_account: Number(e.target.value) })}
                    className="input-field"
                  >
                    <option value="1">Sí</option>
                    <option value="0">No</option>
                  </select>
                </div>
                {Boolean(form.has_bank_account) && (
                  <>
                    <div>
                      <label className="label-field">NIT IGLEICO</label>
                      <select
                        value={form.bank_nit || '890.905.568-5'}
                        onChange={(e) => setForm({ ...form, bank_nit: e.target.value })}
                        className="input-field"
                      >
                        <option value="890.905.568-5">890.905.568-5</option>
                        <option value="811.031.238-0">811.031.238-0</option>
                        <option value="OTRO">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="label-field">Entidad Bancaria</label>
                      <input
                        type="text"
                        value={form.bank_name || ''}
                        onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="label-field">Tipo de cuenta</label>
                      <select
                        value={form.bank_account_type || 'Ahorros'}
                        onChange={(e) => setForm({ ...form, bank_account_type: e.target.value })}
                        className="input-field"
                      >
                        <option value="Ahorros">Ahorros</option>
                        <option value="Corriente">Corriente</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}

        {/* TAB 3: MINISTERIOS Y LIDERAZGO */}
        {activeTab === 3 &&
          (!editMode && selectedChurch ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Concilio y liderazgo local</h3>
                <InfoRow
                  label="Copastor"
                  value={
                    selectedChurch.has_copastor
                      ? `${selectedChurch.copastor_name} (${selectedChurch.copastor_phone || '—'})`
                      : 'No tiene'
                  }
                />
                <InfoRow
                  label="Concilio local"
                  value={
                    selectedChurch.has_local_council
                      ? `Sí (${selectedChurch.local_council_count} miembros)`
                      : 'No tiene'
                  }
                />
                <InfoRow
                  label="Tesorero(a) local"
                  value={`${selectedChurch.treasurer_name || '—'}${selectedChurch.treasurer_phone ? ` · ${selectedChurch.treasurer_phone}` : ''}`}
                />
                <InfoRow label="Perfil académico Tesorero(a)" value={selectedChurch.treasurer_academic} />
                <InfoRow
                  label="Secretario(a) local"
                  value={`${selectedChurch.secretary_name || '—'}${selectedChurch.secretary_phone ? ` · ${selectedChurch.secretary_phone}` : ''}`}
                />
                <InfoRow label="Perfil académico Secretario(a)" value={selectedChurch.secretary_academic} />
                <InfoRow label="Maestros Escuela Dominical" value={selectedChurch.sunday_school_teachers} />
                <InfoRow label="División por edades" value={selectedChurch.age_divided_classes_info} />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2.5">Organismos internos activos</h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { on: selectedChurch.has_ucei, label: 'UCEI · Caballeros' },
                      { on: selectedChurch.has_udei, label: 'UDEI · Damas' },
                      { on: selectedChurch.has_ujei, label: 'UJEI · Jóvenes' },
                      { on: selectedChurch.has_unei, label: 'UNEI · Niños' },
                    ].map((o) => (
                      <Badge key={o.label} tone={o.on ? 'emerald' : 'neutral'}>
                        {o.on ? <Check className="w-3 h-3" /> : null}
                        {o.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2.5">Ministerios locales</h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { on: selectedChurch.ministry_missions, label: 'Misiones' },
                      { on: selectedChurch.ministry_discipleship, label: 'Discipulado' },
                      { on: selectedChurch.ministry_intercession, label: 'Intercesión' },
                      { on: selectedChurch.ministry_evangelism, label: 'Evangelismo' },
                      { on: selectedChurch.ministry_worship, label: 'Alabanza' },
                    ]
                      .filter((m) => m.on)
                      .map((m) => (
                        <Badge key={m.label} tone="navy">
                          {m.label}
                        </Badge>
                      ))}
                    {selectedChurch.ministry_other && (
                      <Badge tone="amber">{selectedChurch.ministry_other}</Badge>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Discipulado y profesionales</h3>
                  <InfoRow label="Programa de discipulado" value={selectedChurch.discipleship_program} />
                  <InfoRow
                    label="Campos de predicación a cargo"
                    value={selectedChurch.has_preaching_fields ? selectedChurch.preaching_fields_count : 'Ninguno'}
                  />
                  <InfoRow
                    label="Profesionales en la iglesia"
                    value={
                      selectedChurch.professionals.length
                        ? selectedChurch.professionals.map((p) => `${p.profession} (${p.count})`).join(', ')
                        : 'No registrados'
                    }
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label-field">Tesorero(a) local</label>
                  <input
                    type="text"
                    value={form.treasurer_name || ''}
                    onChange={(e) => setForm({ ...form, treasurer_name: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-field">Celular Tesorero(a)</label>
                  <input
                    type="text"
                    value={form.treasurer_phone || ''}
                    onChange={(e) => setForm({ ...form, treasurer_phone: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-field">Perfil académico Tesorero(a)</label>
                  <input
                    type="text"
                    value={form.treasurer_academic || ''}
                    onChange={(e) => setForm({ ...form, treasurer_academic: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-field">Secretario(a) local</label>
                  <input
                    type="text"
                    value={form.secretary_name || ''}
                    onChange={(e) => setForm({ ...form, secretary_name: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-field">Celular Secretario(a)</label>
                  <input
                    type="text"
                    value={form.secretary_phone || ''}
                    onChange={(e) => setForm({ ...form, secretary_phone: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-field">Miembros Concilio Local</label>
                  <input
                    type="number"
                    min="0"
                    value={form.local_council_count || 0}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        local_council_count: Number(e.target.value),
                        has_local_council: Number(e.target.value) > 0 ? 1 : 0,
                      })
                    }
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-field">Copastor (si tiene)</label>
                  <input
                    type="text"
                    value={form.copastor_name || ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        copastor_name: e.target.value,
                        has_copastor: e.target.value.trim() ? 1 : 0,
                      })
                    }
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-field">Maestros Escuela Dominical</label>
                  <input
                    type="number"
                    min="0"
                    value={form.sunday_school_teachers || 0}
                    onChange={(e) => setForm({ ...form, sunday_school_teachers: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-field">Programa de discipulado</label>
                  <input
                    type="text"
                    value={form.discipleship_program || ''}
                    onChange={(e) => setForm({ ...form, discipleship_program: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                <div>
                  <p className="label-field mb-2">Organismos internos activos</p>
                  <div className="grid grid-cols-2 gap-2.5 text-sm">
                    {[
                      { k: 'has_ucei', l: 'UCEI (Caballeros)' },
                      { k: 'has_udei', l: 'UDEI (Damas)' },
                      { k: 'has_ujei', l: 'UJEI (Jóvenes)' },
                      { k: 'has_unei', l: 'UNEI (Niños)' },
                    ].map((o) => (
                      <label key={o.k} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean((form as Record<string, unknown>)[o.k])}
                          onChange={(e) => setForm({ ...form, [o.k]: e.target.checked ? 1 : 0 })}
                        />
                        <span>{o.l}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="label-field mb-2">Ministerios locales</p>
                  <div className="grid grid-cols-2 gap-2.5 text-sm">
                    {[
                      { k: 'ministry_missions', l: 'Misiones' },
                      { k: 'ministry_discipleship', l: 'Discipulado' },
                      { k: 'ministry_intercession', l: 'Intercesión' },
                      { k: 'ministry_evangelism', l: 'Evangelismo' },
                      { k: 'ministry_worship', l: 'Alabanza' },
                    ].map((m) => (
                      <label key={m.k} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean((form as Record<string, unknown>)[m.k])}
                          onChange={(e) => setForm({ ...form, [m.k]: e.target.checked ? 1 : 0 })}
                        />
                        <span>{m.l}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

        {/* TAB 4: MEDIOS Y CENSO POBLACIONAL */}
        {activeTab === 4 && (
          <div className="space-y-5">
            {/* Censo Poblacional (Tabla 1 & Tabla 2) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Censo poblacional · Clasificación Junta Nacional IGLEICO
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tabla 1 (Bautizados / No Bautizados por rango de edad) y Tabla 2 (Totales)
                  </p>
                </div>
                {editMode && (
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.use_auto_census !== 0}
                      onChange={(e) => setForm({ ...form, use_auto_census: e.target.checked ? 1 : 0 })}
                    />
                    Calcular automáticamente desde el directorio de Miembros
                  </label>
                )}
              </div>

              {census && (!editMode || form.use_auto_census !== 0) ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-[#DDE6F4] rounded-xl overflow-hidden">
                    <thead>
                      <tr className="bg-[#142E6B] text-white text-center">
                        <th className="py-2.5 px-2">0–12m</th>
                        <th className="py-2.5 px-2">1–5 años</th>
                        <th className="py-2.5 px-2">6–11 años</th>
                        <th className="py-2.5 px-2">12–14 (B / NB)</th>
                        <th className="py-2.5 px-2">15–30 (B / NB)</th>
                        <th className="py-2.5 px-2">31–59 (B / NB)</th>
                        <th className="py-2.5 px-2">&gt;60 (B / NB)</th>
                        <th className="py-2.5 px-2 bg-[#1B449C]">Bautizados</th>
                        <th className="py-2.5 px-2 bg-[#1B449C]">No Baut.</th>
                        <th className="py-2.5 px-2 bg-[#1B449C]">Niños</th>
                        <th className="py-2.5 px-3 bg-[#D98A1F]">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-center font-semibold text-slate-800 tabular-nums">
                        <td className="py-3">{census.infancy_0_12m}</td>
                        <td className="py-3">{census.infancy_1_5}</td>
                        <td className="py-3">{census.childhood_6_11}</td>
                        <td className="py-3">
                          {census.adolescents_12_14_b} / {census.adolescents_12_14_nb}
                        </td>
                        <td className="py-3">
                          {census.youth_15_30_b} / {census.youth_15_30_nb}
                        </td>
                        <td className="py-3">
                          {census.adults_31_59_b} / {census.adults_31_59_nb}
                        </td>
                        <td className="py-3">
                          {census.seniors_60_plus_b} / {census.seniors_60_plus_nb}
                        </td>
                        <td className="py-3 bg-slate-50 font-bold">{census.total_baptized}</td>
                        <td className="py-3 bg-slate-50 font-bold">{census.total_not_baptized}</td>
                        <td className="py-3 bg-slate-50 font-bold">{census.total_children}</td>
                        <td className="py-3 bg-emerald-50 text-emerald-800 font-extrabold text-sm">
                          {census.grand_total}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {[
                    ['infancy_0_12m', '0–12m'],
                    ['infancy_1_5', '1–5 años'],
                    ['childhood_6_11', '6–11 años'],
                    ['adolescents_12_14_b', '12–14 B'],
                    ['adolescents_12_14_nb', '12–14 NB'],
                    ['youth_15_30_b', '15–30 B'],
                    ['youth_15_30_nb', '15–30 NB'],
                    ['adults_31_59_b', '31–59 B'],
                    ['adults_31_59_nb', '31–59 NB'],
                    ['seniors_60_plus_b', '>60 B'],
                    ['seniors_60_plus_nb', '>60 NB'],
                  ].map(([key, lbl]) => (
                    <div key={key}>
                      <label className="label-field">{lbl}</label>
                      <input
                        type="number"
                        min="0"
                        value={Number((form.manual_census as Record<string, number> | undefined)?.[key] || 0)}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            manual_census: { ...(form.manual_census || {}), [key]: Number(e.target.value) },
                          })
                        }
                        className="input-field"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Redes y Equipos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Redes sociales y medios</h3>
                {!editMode && selectedChurch ? (
                  <>
                    <InfoRow label="Facebook" value={selectedChurch.social?.facebook} />
                    <InfoRow label="Instagram" value={selectedChurch.social?.instagram} />
                    <InfoRow label="TikTok" value={selectedChurch.social?.tiktok} />
                    <InfoRow label="WhatsApp" value={selectedChurch.social?.whatsapp} />
                    <InfoRow label="YouTube" value={selectedChurch.social?.youtube} />
                  </>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(['facebook', 'instagram', 'tiktok', 'whatsapp', 'youtube'] as const).map((net) => (
                      <div key={net}>
                        <label className="label-field capitalize">{net}</label>
                        <input
                          type="text"
                          value={form.social?.[net] || ''}
                          onChange={(e) =>
                            setForm({ ...form, social: { ...(form.social || {}), [net]: e.target.value } })
                          }
                          className="input-field"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Equipos audiovisuales y teología</h3>
                {!editMode && selectedChurch ? (
                  <>
                    <InfoRow
                      label="Equipos disponibles"
                      value={
                        [
                          selectedChurch.equipment?.camera && 'Cámara',
                          selectedChurch.equipment?.videobeam && 'Video Beam',
                          selectedChurch.equipment?.screen && 'Pantalla',
                          selectedChurch.equipment?.computer && 'Computador',
                        ]
                          .filter(Boolean)
                          .join(', ') || 'Ninguno'
                      }
                    />
                    <InfoRow label="Otros equipos" value={selectedChurch.equipment?.other} />
                    <InfoRow
                      label="Docentes en Teología / Ciencias Religiosas"
                      value={selectedChurch.has_theology_teachers ? 'Sí' : 'No'}
                    />
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2.5 text-sm">
                      {[
                        { k: 'camera', l: 'Cámara' },
                        { k: 'videobeam', l: 'Video Beam' },
                        { k: 'screen', l: 'Pantalla' },
                        { k: 'computer', l: 'Computador' },
                      ].map((eq) => (
                        <label key={eq.k} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean((form.equipment as Record<string, unknown> | undefined)?.[eq.k])}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                equipment: { ...(form.equipment || {}), [eq.k]: e.target.checked },
                              })
                            }
                          />
                          <span>{eq.l}</span>
                        </label>
                      ))}
                    </div>
                    <div>
                      <label className="label-field">Otros equipos</label>
                      <input
                        type="text"
                        value={form.equipment?.other || ''}
                        onChange={(e) =>
                          setForm({ ...form, equipment: { ...(form.equipment || {}), other: e.target.value } })
                        }
                        className="input-field"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </form>
    );
  }

  // =========================================================================
  // DIRECTORY VIEW (CLEAN PAGINATED TABLE)
  // =========================================================================
  const countByCat = {
    constituidas: churches.filter((c) => c.categorization === 'CONSTITUIDA').length,
    enFormacion: churches.filter((c) => c.categorization === 'EN_FORMACION').length,
    campos: churches.filter((c) => c.categorization === 'CAMPO_PREDICACION').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Iglesias del Distrito Sabana"
        subtitle="Directorio institucional, propiedades, liderazgo local y censo poblacional de cada congregación."
        actions={
          isDistrictAdmin ? (
            <button
              type="button"
              onClick={startCreate}
              className="btn-primary px-4 py-2.5 text-sm"
            >
              <Plus className="w-4 h-4" />
              Nueva iglesia
            </button>
          ) : null
        }
      />

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#DDE6F4] p-4 shadow-[0_2px_6px_rgba(20,46,107,0.03)]">
          <p className="text-xs font-semibold text-slate-500">Total congregaciones</p>
          <p className="text-2xl font-extrabold text-[#142E6B] mt-1 tabular-nums">{churches.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#DDE6F4] p-4 shadow-[0_2px_6px_rgba(20,46,107,0.03)]">
          <p className="text-xs font-semibold text-slate-500">Iglesias constituidas</p>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1 tabular-nums">{countByCat.constituidas}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#DDE6F4] p-4 shadow-[0_2px_6px_rgba(20,46,107,0.03)]">
          <p className="text-xs font-semibold text-slate-500">En formación</p>
          <p className="text-2xl font-extrabold text-[#D98A1F] mt-1 tabular-nums">{countByCat.enFormacion}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#DDE6F4] p-4 shadow-[0_2px_6px_rgba(20,46,107,0.03)]">
          <p className="text-xs font-semibold text-slate-500">Campos de predicación</p>
          <p className="text-2xl font-extrabold text-[#1B449C] mt-1 tabular-nums">{countByCat.campos}</p>
        </div>
      </div>

      {/* Table Card with Filter Toolbar + Pagination (No horizontal overflow at 1280px) */}
      <div className="bg-white rounded-2xl border border-[#DDE6F4] shadow-[0_2px_8px_rgba(20,46,107,0.04)] overflow-hidden">
        <div className="p-4 border-b border-[#E4ECF7] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-[#1B449C]/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                pag.setPage(1);
              }}
              placeholder="Buscar iglesia, municipio o pastor..."
              className="input-field pl-10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={catFilter}
              onChange={(e) => {
                setCatFilter(e.target.value);
                pag.setPage(1);
              }}
              className="input-field w-auto text-xs font-semibold text-[#142E6B]"
            >
              <option value="ALL">Todas las categorías</option>
              <option value="CONSTITUIDA">Constituidas</option>
              <option value="EN_FORMACION">En Formación</option>
              <option value="CAMPO_PREDICACION">Campos de Predicación</option>
            </select>

            <select
              value={zoneFilter}
              onChange={(e) => {
                setZoneFilter(e.target.value);
                pag.setPage(1);
              }}
              className="input-field w-auto text-xs font-semibold text-[#142E6B]"
            >
              <option value="ALL">Todas las zonas</option>
              {zones.map((z) => (
                <option key={z.id} value={String(z.id)}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8FAFE] border-b border-[#E4ECF7] text-left text-xs font-semibold text-[#142E6B]/80">
                <th className="py-3 px-4">Iglesia</th>
                <th className="py-3 px-3">Categoría</th>
                <th className="py-3 px-3">Pastor</th>
                <th className="py-3 px-3 text-right">Miembros</th>
                <th className="py-3 px-3 text-right">Prom. mes</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    Cargando congregaciones...
                  </td>
                </tr>
              ) : pag.paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-slate-400">
                    No se encontraron iglesias con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                pag.paginatedItems.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => openChurch(c)}
                    className="hover:bg-[#F4F7FC] transition cursor-pointer"
                  >
                    <td className="py-3 px-4 max-w-[260px]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#EEF4FC] text-[#1B449C] flex items-center justify-center shrink-0">
                          <ChurchIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#142E6B] truncate">{c.name}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {c.municipality}, {c.department}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
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
                    <td className="py-3 px-3 max-w-[170px]">
                      <p className="text-xs font-semibold text-slate-800 truncate">{c.pastor?.full_name || 'Sin asignar'}</p>
                      <p className="text-[11px] text-slate-400">{c.premises_type}</p>
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                      <span className="font-bold text-[#142E6B]">{c.census.grand_total}</span>
                      <span className="block text-[11px] text-slate-400">{c.census.total_baptized} B</span>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-emerald-700 tabular-nums whitespace-nowrap">
                      {formatCOP(c.live_avg_monthly_income || c.avg_monthly_income)}
                    </td>
                    <td
                      className="py-3 px-4 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openChurch(c)}
                          className="px-2.5 py-1.5 rounded-lg border border-[#C9DAF7] bg-[#F8FAFE] hover:bg-[#1B449C] hover:text-white text-xs font-semibold text-[#142E6B] transition whitespace-nowrap cursor-pointer"
                        >
                          Ver ficha
                        </button>
                        <button
                          type="button"
                          onClick={() => exportChurchFichaPDF(c, district)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#1B449C] hover:bg-[#EEF4FC] cursor-pointer"
                          title="Descargar Ficha PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {isDistrictAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDelete(c)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#D81E27] hover:bg-red-50 cursor-pointer"
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
