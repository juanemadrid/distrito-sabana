import React, { useEffect, useState } from 'react';
import { Plus, Save, Shield, Trash2, UserPlus, Users } from 'lucide-react';
import { Modal } from '../components/Modal';
import { Badge } from '../components/ui/Badge';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination, usePagination } from '../components/ui/Pagination';
import { useFeedback } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { ROLE_LABELS } from '../lib/format';
import type { District, SystemUser, UserRole, Zone } from '../types';

export function DistrictPage() {
  const { isDistrictAdmin, churches } = useAuth();
  const { notify, confirm } = useFeedback();

  const [tab, setTab] = useState<'board' | 'zones' | 'users'>('board');
  const [district, setDistrict] = useState<District | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [savingDist, setSavingDist] = useState(false);

  const [zoneOpen, setZoneOpen] = useState(false);
  const [zoneForm, setZoneForm] = useState({ name: '', coordinator_name: '', description: '' });

  const [userOpen, setUserOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    username: '',
    full_name: '',
    email: '',
    password: '',
    role: 'PASTOR_LOCAL' as UserRole,
    church_id: '',
  });
  const [errorMsg, setErrorMsg] = useState('');

  const loadAll = async () => {
    const res = await api.get<{ district: District; zones: Zone[] }>('/api/district');
    setDistrict(res.district);
    setZones(res.zones);
    if (isDistrictAdmin) {
      const uRes = await api.get<{ users: SystemUser[] }>('/api/auth/users');
      setUsers(uRes.users);
    }
  };

  useEffect(() => {
    loadAll();
  }, [isDistrictAdmin]);

  const usersPag = usePagination(users, 8);

  const handleSaveDistrict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!district) return;
    setSavingDist(true);
    try {
      await api.put('/api/district', district);
      notify('Datos del Distrito Sabana actualizados.');
    } finally {
      setSavingDist(false);
    }
  };

  const handleAddZone = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/api/zones', zoneForm);
    setZoneOpen(false);
    setZoneForm({ name: '', coordinator_name: '', description: '' });
    notify('Zona creada correctamente.');
    await loadAll();
  };

  const handleDeleteZone = async (z: Zone) => {
    const ok = await confirm({
      title: 'Eliminar zona',
      message: `¿Deseas eliminar la zona "${z.name}"?`,
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    await api.del(`/api/zones/${z.id}`);
    notify('Zona eliminada.');
    await loadAll();
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await api.post('/api/auth/users', {
        ...userForm,
        church_id: userForm.role === 'ADMIN_DISTRITO' ? null : Number(userForm.church_id),
      });
      setUserOpen(false);
      setUserForm({ username: '', full_name: '', email: '', password: '', role: 'PASTOR_LOCAL', church_id: '' });
      notify('Usuario creado exitosamente.');
      await loadAll();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo crear el usuario.');
    }
  };

  const handleToggleUser = async (u: SystemUser) => {
    await api.put(`/api/auth/users/${u.id}`, {
      full_name: u.full_name,
      email: u.email,
      role: u.role,
      church_id: u.church_id,
      is_active: u.is_active ? 0 : 1,
    });
    notify(u.is_active ? 'Usuario desactivado.' : 'Usuario activado.');
    await loadAll();
  };

  const handleDeleteUser = async (u: SystemUser) => {
    const ok = await confirm({
      title: 'Eliminar usuario',
      message: `¿Deseas eliminar el acceso del usuario "${u.username}"?`,
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.del(`/api/auth/users/${u.id}`);
      notify('Usuario eliminado.');
      await loadAll();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'No se pudo eliminar.', 'error');
    }
  };

  if (!district) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gobernación · Distrito Sabana"
        subtitle="Administración de la Junta Distrital, zonas territoriales y accesos por rol."
      />

      {/* Clean Underline Tabs */}
      <div className="border-b border-[#DDE6F4] flex gap-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => setTab('board')}
          className={`pb-3 text-sm font-bold border-b-2 whitespace-nowrap cursor-pointer transition ${
            tab === 'board' ? 'border-[#1B449C] text-[#142E6B]' : 'border-transparent text-slate-500 hover:text-[#142E6B]'
          }`}
        >
          Junta Directiva
        </button>
        <button
          type="button"
          onClick={() => setTab('zones')}
          className={`pb-3 text-sm font-bold border-b-2 whitespace-nowrap cursor-pointer transition ${
            tab === 'zones' ? 'border-[#1B449C] text-[#142E6B]' : 'border-transparent text-slate-500 hover:text-[#142E6B]'
          }`}
        >
          Zonas del Distrito ({zones.length})
        </button>
        {isDistrictAdmin && (
          <button
            type="button"
            onClick={() => setTab('users')}
            className={`pb-3 text-sm font-bold border-b-2 whitespace-nowrap cursor-pointer transition ${
              tab === 'users' ? 'border-[#1B449C] text-[#142E6B]' : 'border-transparent text-slate-500 hover:text-[#142E6B]'
            }`}
          >
            Usuarios y Permisos ({users.length})
          </button>
        )}
      </div>

      {/* TAB 1: JUNTA DISTRITAL */}
      {tab === 'board' && (
        <form
          onSubmit={handleSaveDistrict}
          className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-5"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Datos de la Directiva Distrital</h3>
              <p className="text-xs text-slate-500 mt-0.5">{district.organization}</p>
            </div>
            {isDistrictAdmin && (
              <button
                type="submit"
                disabled={savingDist}
                className="btn-primary px-4 py-2 text-xs"
              >
                <Save className="w-4 h-4" />
                {savingDist ? 'Guardando...' : 'Guardar cambios'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label-field">Nombre del Distrito</label>
              <input
                type="text"
                disabled={!isDistrictAdmin}
                value={district.name}
                onChange={(e) => setDistrict({ ...district, name: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Región / Cobertura</label>
              <input
                type="text"
                disabled={!isDistrictAdmin}
                value={district.region}
                onChange={(e) => setDistrict({ ...district, region: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Sede / Ciudad</label>
              <input
                type="text"
                disabled={!isDistrictAdmin}
                value={district.address}
                onChange={(e) => setDistrict({ ...district, address: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Ministro Distrital</label>
              <input
                type="text"
                disabled={!isDistrictAdmin}
                value={district.minister_name}
                onChange={(e) => setDistrict({ ...district, minister_name: e.target.value })}
                className="input-field font-semibold"
              />
            </div>
            <div>
              <label className="label-field">Ministro Suplente</label>
              <input
                type="text"
                disabled={!isDistrictAdmin}
                value={district.substitute_minister_name}
                onChange={(e) => setDistrict({ ...district, substitute_minister_name: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Secretaria(o) Distrital</label>
              <input
                type="text"
                disabled={!isDistrictAdmin}
                value={district.secretary_name}
                onChange={(e) => setDistrict({ ...district, secretary_name: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Tesorera(o) Distrital</label>
              <input
                type="text"
                disabled={!isDistrictAdmin}
                value={district.treasurer_name}
                onChange={(e) => setDistrict({ ...district, treasurer_name: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Correo institucional</label>
              <input
                type="email"
                disabled={!isDistrictAdmin}
                value={district.email}
                onChange={(e) => setDistrict({ ...district, email: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Teléfono de contacto</label>
              <input
                type="text"
                disabled={!isDistrictAdmin}
                value={district.phone}
                onChange={(e) => setDistrict({ ...district, phone: e.target.value })}
                className="input-field"
              />
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: ZONAS */}
      {tab === 'zones' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Zonas del Distrito Sabana</h3>
              <p className="text-xs text-slate-500 mt-0.5">División territorial para coordinación de iglesias</p>
            </div>
            {isDistrictAdmin && (
              <button
                type="button"
                onClick={() => setZoneOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Nueva zona
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {zones.map((z) => (
              <div
                key={z.id}
                className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex justify-between gap-2"
              >
                <div>
                  <p className="font-semibold text-sm text-slate-900">{z.name}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Coordinador: <strong>{z.coordinator_name || 'Sin asignar'}</strong>
                  </p>
                  {z.description && <p className="text-xs text-slate-500 mt-1.5">{z.description}</p>}
                </div>
                {isDistrictAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDeleteZone(z)}
                    className="p-1.5 h-fit rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"
                    title="Eliminar zona"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: USUARIOS Y ROLES */}
      {tab === 'users' && isDistrictAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Usuarios y roles de acceso</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Administra las cuentas de la directiva distrital y de cada iglesia local.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setUserForm({
                  username: '',
                  full_name: '',
                  email: '',
                  password: '',
                  role: 'PASTOR_LOCAL',
                  church_id: churches[0] ? String(churches[0].id) : '',
                });
                setUserOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> Nuevo usuario
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-left text-xs font-medium text-slate-500">
                  <th className="py-3 px-5">Nombre</th>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Rol</th>
                  <th className="py-3 px-4">Alcance / Iglesia</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersPag.paginatedItems.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-5 font-semibold text-slate-900">{u.full_name}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">{u.username}</td>
                    <td className="py-3.5 px-4">
                      <Badge tone={u.role === 'ADMIN_DISTRITO' ? 'amber' : 'neutral'}>
                        {u.role === 'ADMIN_DISTRITO' ? <Shield className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                        {ROLE_LABELS[u.role] || u.role}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {u.role === 'ADMIN_DISTRITO' ? 'Todo el Distrito Sabana' : u.church_name || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <button type="button" onClick={() => handleToggleUser(u)} className="cursor-pointer">
                        <Badge tone={u.is_active ? 'emerald' : 'rose'}>
                          {u.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </button>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={usersPag.page}
            totalPages={usersPag.totalPages}
            totalItems={usersPag.totalItems}
            pageSize={usersPag.pageSize}
            onPageChange={usersPag.setPage}
            onPageSizeChange={usersPag.setPageSize}
          />
        </div>
      )}

      {/* Modal: Nueva Zona */}
      <Modal open={zoneOpen} onClose={() => setZoneOpen(false)} title="Nueva zona del distrito" size="md">
        <form onSubmit={handleAddZone} className="space-y-4">
          <div>
            <label className="label-field">Nombre de la zona *</label>
            <input
              type="text"
              required
              value={zoneForm.name}
              onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">Coordinador</label>
            <input
              type="text"
              value={zoneForm.coordinator_name}
              onChange={(e) => setZoneForm({ ...zoneForm, coordinator_name: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">Descripción</label>
            <input
              type="text"
              value={zoneForm.description}
              onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })}
              className="input-field"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setZoneOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold cursor-pointer"
            >
              Guardar zona
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Nuevo Usuario */}
      <Modal open={userOpen} onClose={() => setUserOpen(false)} title="Crear usuario de acceso" size="md">
        <form onSubmit={handleAddUser} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
              {errorMsg}
            </div>
          )}
          <div>
            <label className="label-field">Nombre completo *</label>
            <input
              type="text"
              required
              value={userForm.full_name}
              onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
              className="input-field"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Usuario *</label>
              <input
                type="text"
                required
                value={userForm.username}
                onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Contraseña *</label>
              <input
                type="password"
                required
                minLength={6}
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                className="input-field"
              />
            </div>
          </div>
          <div>
            <label className="label-field">Rol *</label>
            <select
              value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}
              className="input-field"
            >
              <option value="PASTOR_LOCAL">Pastor Local</option>
              <option value="TESORERO_LOCAL">Tesorero(a) Local</option>
              <option value="SECRETARIO_LOCAL">Secretario(a) Local</option>
              <option value="ADMIN_DISTRITO">Directiva Distrito Sabana</option>
            </select>
          </div>
          {userForm.role !== 'ADMIN_DISTRITO' && (
            <div>
              <label className="label-field">Iglesia asignada *</label>
              <select
                required
                value={userForm.church_id}
                onChange={(e) => setUserForm({ ...userForm, church_id: e.target.value })}
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
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setUserOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold cursor-pointer"
            >
              Crear usuario
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
