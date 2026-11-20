export function formatCOP(value: number | string | null | undefined): string {
  const num = Number(value || 0);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(num) ? num : 0);
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const monthIdx = Number(m) - 1;
  return `${Number(d)} ${months[monthIdx] || m} ${y}`;
}

export function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${months[Number(m) - 1] || m} ${y}`;
}

export function calculateAge(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return Math.max(0, age);
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN_DISTRITO: 'Directiva Distrito Sabana',
  PASTOR_LOCAL: 'Pastor Local',
  TESORERO_LOCAL: 'Tesorero(a) Local',
  SECRETARIO_LOCAL: 'Secretario(a) Local',
};

export const CATEGORIZATION_LABELS: Record<string, string> = {
  CONSTITUIDA: 'Iglesia Constituida',
  EN_FORMACION: 'Iglesia en Formación',
  CAMPO_PREDICACION: 'Campo de Predicación',
};

export const DIGNITY_LABELS: Record<string, string> = {
  REVERENDO: 'Reverendo',
  PASTOR: 'Pastor',
  LIDER: 'Líder',
  NINGUNA: 'Ninguna',
};

export const CONTRACT_LABELS: Record<string, string> = {
  ACUERDO_EMOLUMENTOS: 'Acuerdo por Emolumentos',
  LABORAL_TERMINO_FIJO: 'Laboral a Término Fijo',
  LABORAL_TERMINO_INDEFINIDO: 'Laboral a Término Indefinido',
  NINGUNO: 'Sin contrato',
};

export const ORGANISM_LABELS: Record<string, string> = {
  GENERAL: 'General / Toda la Iglesia',
  UCEI: 'UCEI (Caballeros)',
  UDEI: 'UDEI (Damas)',
  UJEI: 'UJEI (Jóvenes)',
  UNEI: 'UNEI (Niños)',
  MISIONES: 'Misiones',
  PRO_TEMPLO: 'Pro-Templo',
  OTRO: 'Otro',
  NINGUNO: 'Sin asignar',
};

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  VENTA_RECAUDO: 'Venta / Recaudo pro-fondos',
  EVENTO_CUOTA: 'Evento con cuota / Inscripción',
  MINISTERIAL: 'Actividad Ministerial / Convocatoria',
};

export const ATTENDANCE_LABELS: Record<string, string> = {
  CONVOCADO: 'Convocado (Debe ir)',
  CONFIRMADO: 'Confirmado',
  ASISTIO: 'Asistió',
  NO_ASISTIO: 'No asistió',
};

export const INCOME_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'DIEZMO', label: 'Diezmos' },
  { value: 'OFRENDA_GENERAL', label: 'Ofrenda General / Cultos' },
  { value: 'OFRENDA_MISIONERA', label: 'Ofrenda Misionera' },
  { value: 'OFRENDA_ESPECIAL', label: 'Ofrenda Especial / Pro-Templo' },
  { value: 'ACTIVIDAD', label: 'Recaudo de Actividades' },
  { value: 'ARRIENDO_RECIBIDO', label: 'Canon de Arriendo Recibido' },
  { value: 'APORTE_DISTRITAL', label: 'Aporte Distrital Recibido' },
  { value: 'OTRO_INGRESO', label: 'Otros Ingresos' },
];

export const EXPENSE_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'REMUNERACION_PASTORAL', label: 'Remuneración / Emolumentos Pastorales' },
  { value: 'SERVICIOS_PUBLICOS', label: 'Servicios Públicos (Luz, Agua, Internet)' },
  { value: 'ARRIENDO_TEMPLO', label: 'Arriendo Local del Templo' },
  { value: 'ARRIENDO_CASA_PASTORAL', label: 'Arriendo Casa Pastoral' },
  { value: 'NOMINA_SEGURIDAD', label: 'Nómina / Seguridad Social' },
  { value: 'APORTE_DISTRITAL', label: 'Aporte al Distrito Sabana' },
  { value: 'APORTE_NACIONAL', label: 'Aporte a Sede Nacional IGLEICO' },
  { value: 'GASTO_ACTIVIDAD', label: 'Insumos / Gastos de Actividad' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento / Equipos' },
  { value: 'PAGO_PRESTAMO', label: 'Abono a Préstamo / Cuenta por Pagar' },
  { value: 'AYUDA_SOCIAL', label: 'Ayuda Social / Misiones' },
  { value: 'OTRO_EGRESO', label: 'Otros Egresos' },
];

export const CATEGORY_LABEL_MAP: Record<string, string> = Object.fromEntries([
  ...INCOME_CATEGORIES.map((c) => [c.value, c.label]),
  ...EXPENSE_CATEGORIES.map((c) => [c.value, c.label]),
]);

export const PAYMENT_METHODS: Array<{ value: string; label: string }> = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'NEQUI', label: 'Nequi' },
  { value: 'DAVIPLATA', label: 'Daviplata' },
  { value: 'TRANSFERENCIA', label: 'Transferencia Bancaria' },
  { value: 'CUENTA_BANCARIA', label: 'Consignación Cuenta IGLEICO' },
  { value: 'OTRO', label: 'Otro' },
];
