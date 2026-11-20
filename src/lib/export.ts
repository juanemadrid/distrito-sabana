import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { CensusTable, Church, District, FinancialTransaction, Pastor } from '../types';
import {
  ATTENDANCE_LABELS,
  CATEGORIZATION_LABELS,
  CATEGORY_LABEL_MAP,
  CONTRACT_LABELS,
  DIGNITY_LABELS,
  calculateAge,
  formatCOP,
  formatDate,
} from './format';

// Exact official IGLEICO brand colors extracted from logo-igleico.webp
const IGLEICO_NAVY: [number, number, number] = [20, 46, 107]; // #142E6B
const IGLEICO_COBALT: [number, number, number] = [27, 68, 156]; // #1B449C
const IGLEICO_GOLD: [number, number, number] = [217, 138, 31]; // #D98A1F
const IGLEICO_CRIMSON: [number, number, number] = [216, 30, 39]; // #D81E27

let cachedLogoPng: string | null = null;

async function getLogoPngDataUrl(): Promise<string | null> {
  if (cachedLogoPng) return cachedLogoPng;
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('logo load failed'));
      img.src = `${import.meta.env.BASE_URL}logo-igleico.webp`;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 256;
    canvas.height = img.naturalHeight || 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    cachedLogoPng = canvas.toDataURL('image/png');
    return cachedLogoPng;
  } catch {
    return null;
  }
}

function addOfficialHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  district?: District | null,
  logoDataUrl?: string | null
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  // Royal Cobalt Header Band
  doc.setFillColor(...IGLEICO_NAVY);
  doc.rect(0, 0, pageWidth, 30, 'F');

  // Tricolor accent line: Cobalt + Gold + Crimson
  doc.setFillColor(...IGLEICO_COBALT);
  doc.rect(0, 30, pageWidth * 0.6, 2.2, 'F');
  doc.setFillColor(...IGLEICO_GOLD);
  doc.rect(pageWidth * 0.6, 30, pageWidth * 0.28, 2.2, 'F');
  doc.setFillColor(...IGLEICO_CRIMSON);
  doc.rect(pageWidth * 0.88, 30, pageWidth * 0.12, 2.2, 'F');

  let textX = 14;
  if (logoDataUrl) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(12, 3.5, 23, 23, 3, 3, 'F');
    doc.addImage(logoDataUrl, 'PNG', 13.5, 5, 20, 20);
    textX = 40;
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.text('IGLESIA EVANGÉLICA INTERAMERICANA DE COLOMBIA – IGLEICO', textX, 12);

  doc.setTextColor(247, 201, 110);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text(
    district?.name ? `${district.name.toUpperCase()}  •  ${subtitle}` : `DISTRITO SABANA  •  ${subtitle}`,
    textX,
    19
  );

  doc.setTextColor(226, 232, 240);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, pageWidth - 14, 25, { align: 'right' });

  doc.setTextColor(...IGLEICO_NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text(title, 14, 40);
}

// 1. Reporte Financiero (PDF + Excel)
export async function exportFinancialPDF(data: {
  district?: District | null;
  church?: Church | null;
  period: { start_date: string; end_date: string };
  summary: { total_income: number; total_expense: number; net_balance: number };
  by_category: Array<{ type: string; category: string; total: number; count: number }>;
  by_church: Array<{ church_name: string; ingresos: number; egresos: number; saldo: number }>;
  transactions: FinancialTransaction[];
}) {
  const logo = await getLogoPngDataUrl();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const scopeLabel = data.church ? data.church.name : 'Consolidado General – Distrito Sabana';
  addOfficialHeader(
    doc,
    `REPORTE FINANCIERO (${formatDate(data.period.start_date)} al ${formatDate(data.period.end_date)})`,
    scopeLabel,
    data.district,
    logo
  );

  autoTable(doc, {
    startY: 45,
    head: [['Total Ingresos', 'Total Egresos', 'Balance Neto del Período']],
    body: [[
      formatCOP(data.summary.total_income),
      formatCOP(data.summary.total_expense),
      formatCOP(data.summary.net_balance),
    ]],
    theme: 'grid',
    headStyles: { fillColor: IGLEICO_NAVY, halign: 'center' },
    bodyStyles: { fontStyle: 'bold', fontSize: 11, halign: 'center' },
  });

  let nextY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 68;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...IGLEICO_NAVY);
  doc.text('Resumen por Concepto / Categoría', 14, nextY + 8);

  autoTable(doc, {
    startY: nextY + 11,
    head: [['Tipo', 'Concepto', 'Movimientos', 'Valor Total']],
    body: data.by_category.map((c) => [
      c.type,
      CATEGORY_LABEL_MAP[c.category] || c.category,
      String(c.count),
      formatCOP(c.total),
    ]),
    headStyles: { fillColor: IGLEICO_COBALT },
    columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
    styles: { fontSize: 8.5 },
  });

  if (data.by_church.length > 0) {
    nextY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 120;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Consolidado por Iglesia del Distrito', 14, nextY + 8);
    autoTable(doc, {
      startY: nextY + 11,
      head: [['Iglesia / Dependencia', 'Ingresos', 'Egresos', 'Saldo Neto']],
      body: data.by_church.map((c) => [
        c.church_name,
        formatCOP(c.ingresos),
        formatCOP(c.egresos),
        formatCOP(c.saldo),
      ]),
      headStyles: { fillColor: IGLEICO_GOLD, textColor: [255, 255, 255] },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } },
      styles: { fontSize: 8.5 },
    });
  }

  nextY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 140;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalle de Movimientos Registrados', 14, nextY + 8);

  autoTable(doc, {
    startY: nextY + 11,
    head: [['Fecha', 'Iglesia', 'Tipo', 'Concepto', 'Persona / Detalle', 'Valor']],
    body: data.transactions.map((t) => [
      formatDate(t.tx_date),
      t.church_name || 'Distrito Sabana',
      t.type,
      CATEGORY_LABEL_MAP[t.category] || t.category,
      [t.person_name, t.description].filter(Boolean).join(' – '),
      formatCOP(t.amount),
    ]),
    headStyles: { fillColor: IGLEICO_NAVY },
    columnStyles: { 5: { halign: 'right', fontStyle: 'bold' } },
    styles: { fontSize: 7.5 },
  });

  doc.save(`Reporte_Financiero_IGLEICO_${data.period.start_date}_${data.period.end_date}.pdf`);
}

export function exportFinancialExcel(data: {
  period: { start_date: string; end_date: string };
  by_category: Array<{ type: string; category: string; total: number; count: number }>;
  by_church: Array<{ church_name: string; ingresos: number; egresos: number; saldo: number }>;
  transactions: FinancialTransaction[];
}) {
  const wb = XLSX.utils.book_new();
  const catSheet = XLSX.utils.json_to_sheet(
    data.by_category.map((c) => ({
      Tipo: c.type,
      Concepto: CATEGORY_LABEL_MAP[c.category] || c.category,
      Movimientos: c.count,
      Valor_COP: c.total,
    }))
  );
  XLSX.utils.book_append_sheet(wb, catSheet, 'Resumen Categorias');

  if (data.by_church.length > 0) {
    const chSheet = XLSX.utils.json_to_sheet(
      data.by_church.map((c) => ({
        Iglesia: c.church_name,
        Ingresos_COP: c.ingresos,
        Egresos_COP: c.egresos,
        Saldo_COP: c.saldo,
      }))
    );
    XLSX.utils.book_append_sheet(wb, chSheet, 'Por Iglesia');
  }

  const txSheet = XLSX.utils.json_to_sheet(
    data.transactions.map((t) => ({
      Fecha: t.tx_date,
      Recibo: t.receipt_number,
      Iglesia: t.church_name || 'Distrito Sabana',
      Tipo: t.type,
      Categoria: CATEGORY_LABEL_MAP[t.category] || t.category,
      Persona: t.person_name || '',
      Descripcion: t.description || '',
      Metodo_Pago: t.payment_method,
      Valor_COP: t.amount,
    }))
  );
  XLSX.utils.book_append_sheet(wb, txSheet, 'Movimientos');
  XLSX.writeFile(wb, `Reporte_Financiero_IGLEICO_${data.period.start_date}_${data.period.end_date}.xlsx`);
}

// 2. Censo Poblacional (PDF + Excel)
export async function exportCensusPDF(data: {
  district?: District | null;
  rows: Array<{ church_name: string; municipality: string; categorization: string; census: CensusTable }>;
  consolidated: CensusTable;
}) {
  const logo = await getLogoPngDataUrl();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  addOfficialHeader(
    doc,
    'CENSO POBLACIONAL – CLASIFICACIÓN POR EDAD Y BAUTISMO (ACUERDO JUNTA NACIONAL)',
    'Tabla 1 (Bautizados / No Bautizados) y Tabla 2 (Totales)',
    data.district,
    logo
  );

  const body = data.rows.map((r) => [
    r.church_name,
    String(r.census.infancy_0_12m),
    String(r.census.infancy_1_5),
    String(r.census.childhood_6_11),
    String(r.census.adolescents_12_14_b),
    String(r.census.adolescents_12_14_nb),
    String(r.census.youth_15_30_b),
    String(r.census.youth_15_30_nb),
    String(r.census.adults_31_59_b),
    String(r.census.adults_31_59_nb),
    String(r.census.seniors_60_plus_b),
    String(r.census.seniors_60_plus_nb),
    String(r.census.total_baptized),
    String(r.census.total_not_baptized),
    String(r.census.total_children),
    String(r.census.grand_total),
  ]);

  const c = data.consolidated;
  body.push([
    'TOTAL DISTRITO SABANA',
    String(c.infancy_0_12m),
    String(c.infancy_1_5),
    String(c.childhood_6_11),
    String(c.adolescents_12_14_b),
    String(c.adolescents_12_14_nb),
    String(c.youth_15_30_b),
    String(c.youth_15_30_nb),
    String(c.adults_31_59_b),
    String(c.adults_31_59_nb),
    String(c.seniors_60_plus_b),
    String(c.seniors_60_plus_nb),
    String(c.total_baptized),
    String(c.total_not_baptized),
    String(c.total_children),
    String(c.grand_total),
  ]);

  autoTable(doc, {
    startY: 45,
    head: [[
      'Iglesia', '0-12m', '1-5', '6-11',
      '12-14 B', '12-14 NB', '15-30 B', '15-30 NB',
      '31-59 B', '31-59 NB', '>60 B', '>60 NB',
      'Baut.', 'No B.', 'Niños', 'TOTAL',
    ]],
    body,
    headStyles: { fillColor: IGLEICO_NAVY, fontSize: 7.5, halign: 'center' },
    styles: { fontSize: 8, halign: 'center' },
    columnStyles: { 0: { halign: 'left', cellWidth: 54 }, 15: { fontStyle: 'bold' } },
  });

  doc.save('Censo_Poblacional_IGLEICO_Distrito_Sabana.pdf');
}

export function exportCensusExcel(data: {
  rows: Array<{ church_name: string; municipality: string; categorization: string; census: CensusTable }>;
  consolidated: CensusTable;
}) {
  const wb = XLSX.utils.book_new();
  const mapped = data.rows.map((r) => ({
    Iglesia: r.church_name,
    Municipio: r.municipality,
    Categorizacion: CATEGORIZATION_LABELS[r.categorization] || r.categorization,
    'Niños 0-12m': r.census.infancy_0_12m,
    'Niños 1-5': r.census.infancy_1_5,
    'Niños 6-11': r.census.childhood_6_11,
    'Adolesc. 12-14 B': r.census.adolescents_12_14_b,
    'Adolesc. 12-14 NB': r.census.adolescents_12_14_nb,
    'Jóvenes 15-30 B': r.census.youth_15_30_b,
    'Jóvenes 15-30 NB': r.census.youth_15_30_nb,
    'Adultos 31-59 B': r.census.adults_31_59_b,
    'Adultos 31-59 NB': r.census.adults_31_59_nb,
    'Adulto Mayor >60 B': r.census.seniors_60_plus_b,
    'Adulto Mayor >60 NB': r.census.seniors_60_plus_nb,
    'Total Bautizados': r.census.total_baptized,
    'Total No Bautizados': r.census.total_not_baptized,
    'Total Niños': r.census.total_children,
    'TOTAL GENERAL': r.census.grand_total,
  }));
  const ws = XLSX.utils.json_to_sheet(mapped);
  XLSX.utils.book_append_sheet(wb, ws, 'Censo Poblacional');
  XLSX.writeFile(wb, 'Censo_Poblacional_IGLEICO_Distrito_Sabana.xlsx');
}

// 3. Actividades y Cartera (PDF + Excel)
export async function exportActivitiesPDF(data: {
  district?: District | null;
  onlyDebtors: boolean;
  totals: { assigned: number; paid: number; pending: number };
  rows: Array<{
    activity_name: string;
    event_date: string;
    church_name: string;
    person_name: string;
    person_phone: string;
    is_member: number;
    item_detail: string;
    assigned_amount: number;
    paid_amount: number;
    pending_amount: number;
    attendance_status: string;
  }>;
}) {
  const logo = await getLogoPngDataUrl();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  addOfficialHeader(
    doc,
    data.onlyDebtors
      ? 'REPORTE DE CARTERA PENDIENTE EN ACTIVIDADES (SALDOS POR COBRAR)'
      : 'REPORTE GENERAL DE ACTIVIDADES, ASISTENCIA Y RECAUDOS',
    'Control de Participantes y Saldos',
    data.district,
    logo
  );

  autoTable(doc, {
    startY: 45,
    head: [['Total Comprometido / Vendido', 'Total Recaudado / Abonado', 'Saldo Pendiente por Cobrar']],
    body: [[formatCOP(data.totals.assigned), formatCOP(data.totals.paid), formatCOP(data.totals.pending)]],
    headStyles: { fillColor: IGLEICO_NAVY, halign: 'center' },
    bodyStyles: { fontStyle: 'bold', fontSize: 10.5, halign: 'center' },
  });

  const nextY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 64;
  autoTable(doc, {
    startY: nextY + 6,
    head: [['Actividad', 'Iglesia', 'Persona', 'Tipo', 'Detalle / Llevó', 'Asistencia', 'Total', 'Abonado', 'Debe']],
    body: data.rows.map((r) => [
      `${r.activity_name} (${formatDate(r.event_date)})`,
      r.church_name,
      `${r.person_name}${r.person_phone ? ` (${r.person_phone})` : ''}`,
      r.is_member ? 'Miembro' : 'Externo',
      r.item_detail || '—',
      ATTENDANCE_LABELS[r.attendance_status] || r.attendance_status,
      formatCOP(r.assigned_amount),
      formatCOP(r.paid_amount),
      formatCOP(r.pending_amount),
    ]),
    headStyles: { fillColor: IGLEICO_COBALT, fontSize: 8 },
    styles: { fontSize: 7.5 },
    columnStyles: {
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'right', fontStyle: 'bold' },
    },
  });

  doc.save(data.onlyDebtors ? 'Cartera_Deudores_Actividades_IGLEICO.pdf' : 'Reporte_Actividades_IGLEICO.pdf');
}

export function exportActivitiesExcel(
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
  }>
) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(
    rows.map((r) => ({
      Actividad: r.activity_name,
      Fecha: r.event_date,
      Iglesia: r.church_name,
      Persona: r.person_name,
      Telefono: r.person_phone,
      Vinculo: r.is_member ? 'Miembro registrado' : 'Externo',
      Que_Se_Llevo: r.item_detail,
      Cantidad: r.quantity,
      Asistencia: ATTENDANCE_LABELS[r.attendance_status] || r.attendance_status,
      Total_Asignado_COP: r.assigned_amount,
      Total_Abonado_COP: r.paid_amount,
      Saldo_Pendiente_COP: r.pending_amount,
      Estado_Pago: r.pending_amount <= 0 ? 'AL DIA' : r.paid_amount > 0 ? 'ABONO PARCIAL' : 'DEBE',
      Notas: r.notes || '',
    }))
  );
  XLSX.utils.book_append_sheet(wb, ws, 'Actividades y Cartera');
  XLSX.writeFile(wb, 'Reporte_Actividades_IGLEICO_Distrito_Sabana.xlsx');
}

// 4. Ficha Oficial del Pastor (PDF)
export async function exportPastorFichaPDF(pastor: Pastor, district?: District | null) {
  const logo = await getLogoPngDataUrl();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  addOfficialHeader(
    doc,
    'RECOLECCIÓN DE DATOS GENERALES DEL PASTOR',
    pastor.church_name || 'Distrito Sabana',
    district,
    logo
  );

  autoTable(doc, {
    startY: 45,
    head: [['I. DATOS GENERALES DEL PASTOR', 'INFORMACIÓN REGISTRADA']],
    body: [
      ['Nombre del Pastor(a)', pastor.full_name],
      ['Identificación / Cédula', pastor.id_number || '—'],
      ['Fecha y Lugar de Nacimiento', `${formatDate(pastor.birth_date)} – ${pastor.birth_place || '—'}`],
      ['Celular / Correo', `${pastor.phone || '—'} / ${pastor.email || '—'}`],
      ['Dignidad Ministerial', DIGNITY_LABELS[pastor.ministerial_dignity] || pastor.ministerial_dignity],
      ['Iglesia Asignada', pastor.church_name || 'Sin asignar'],
      ['Inicio y Tiempo de Ministerio', `${pastor.ministry_start_month || '--'}/${pastor.ministry_start_year || '----'} (${pastor.ministry_time_text || '—'})`],
      ['Iglesias donde ha pastoreado', pastor.past_churches || '—'],
      ['Cargos Nacionales IGLEICO', pastor.national_roles?.map((r) => `${r.role} (${r.duration})`).join('; ') || 'Ninguno'],
      ['Cargos Distritales IGLEICO', pastor.district_roles?.map((r) => `${r.role} (${r.duration})`).join('; ') || 'Ninguno'],
      ['Contrato y Entidad', pastor.has_contract ? `${CONTRACT_LABELS[pastor.contract_type] || pastor.contract_type} – ${pastor.contract_entity || 'IGLEICO'} (Seg. Social: ${pastor.pays_social_security ? 'Sí' : 'No'})` : 'Sin contrato'],
      ['Remuneración Mensual', formatCOP(pastor.monthly_remuneration)],
      ['Bien Inmueble', pastor.has_real_estate ? pastor.real_estate_details || 'Sí' : 'No'],
      ['Estudios Académicos', pastor.academic_level || '—'],
      ['Estudios Teológicos Formales', pastor.formal_theology_studies || '—'],
      ['Estudios Teológicos Informales', pastor.informal_theology_studies || '—'],
    ],
    headStyles: { fillColor: IGLEICO_NAVY },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 62 } },
    styles: { fontSize: 8.5 },
  });

  let nextY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 140;
  autoTable(doc, {
    startY: nextY + 6,
    head: [['II. INFORMACIÓN FAMILIAR', 'DETALLE']],
    body: [
      ['Nombre del Cónyuge', pastor.spouse_name || 'No aplica / No registra'],
      ['Identificación / Nacimiento Cónyuge', pastor.spouse_name ? `${pastor.spouse_id_number || '—'} | ${formatDate(pastor.spouse_birth_date)} (${pastor.spouse_birth_place || '—'})` : '—'],
      ['Celular / Correo Cónyuge', pastor.spouse_name ? `${pastor.spouse_phone || '—'} / ${pastor.spouse_email || '—'}` : '—'],
      ['Dignidad / Ayuda Mensual Cónyuge', pastor.spouse_name ? `${DIGNITY_LABELS[pastor.spouse_dignity] || pastor.spouse_dignity} | Ayuda: ${pastor.spouse_receives_aid ? formatCOP(pastor.spouse_monthly_aid) : 'No'}` : '—'],
      ['Estudios Cónyuge', pastor.spouse_name ? `${pastor.spouse_academic_level || '—'} | Teol.: ${pastor.spouse_formal_theology || pastor.spouse_informal_theology || '—'}` : '—'],
      ['Número de Hijos', String(pastor.children?.length || 0)],
      ['Hijos (Nombre / Fecha Nac. / Edad)', pastor.children?.length ? pastor.children.map((h) => `${h.name} (${formatDate(h.birth_date)}, ${calculateAge(h.birth_date) ?? '?'} años)`).join('\n') : 'Sin hijos registrados'],
      ['Condición de Discapacidad en Núcleo', pastor.has_family_disability ? `Sí (${pastor.disability_member}): ${pastor.disability_details}` : 'No'],
    ],
    headStyles: { fillColor: IGLEICO_GOLD, textColor: [255, 255, 255] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 62 } },
    styles: { fontSize: 8.5 },
  });

  nextY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 220;
  if (nextY > 235) {
    doc.addPage();
    nextY = 20;
  }
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  const authText =
    'De conformidad con lo dispuesto en las normas vigentes sobre protección de datos personales, en especial la Ley 1581 de 2012 y el Decreto 1074 de 2015, autorizo libre, expresa e inequívocamente a la Iglesia Evangélica Interamericana de Colombia (IGLEICO), para que realice la recolección y tratamiento de mis datos personales que suministro de manera veraz y completa.';
  doc.text(doc.splitTextToSize(authText, 185), 14, nextY + 8);
  doc.setFont('helvetica', 'bold');
  doc.text(`Autorización aceptada: ${pastor.data_auth_accepted ? 'SÍ' : 'NO'}   |   Fecha: ${formatDate(pastor.data_auth_date)}   |   Firma: ${pastor.signature_name || pastor.full_name}`, 14, nextY + 24);

  doc.save(`Ficha_Pastor_${pastor.full_name.replace(/\s+/g, '_')}.pdf`);
}

// 5. Ficha Oficial de la Iglesia (PDF)
export async function exportChurchFichaPDF(church: Church, district?: District | null) {
  const logo = await getLogoPngDataUrl();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  addOfficialHeader(
    doc,
    'RECOLECCIÓN DE DATOS GENERALES DE LA IGLESIA',
    church.name,
    district,
    logo
  );

  autoTable(doc, {
    startY: 45,
    head: [['1. DATOS GENERALES Y PROPIEDADES', 'INFORMACIÓN']],
    body: [
      ['Nombre Completo de la Iglesia', church.name],
      ['Ubicación', `${church.address || '—'} | Barrio/Vereda: ${church.neighborhood || '—'} | ${church.municipality}, ${church.department} (Estrato ${church.stratum || '—'})`],
      ['Distrito y Zona', `${district?.name || 'Distrito Sabana'} – ${church.zone_name || 'Sin zona'}`],
      ['Teléfono / Correo', `${church.phone || '—'} / ${church.email || '—'}`],
      ['Categorización y Fundación', `${CATEGORIZATION_LABELS[church.categorization] || church.categorization} | Fundada: ${church.foundation_month || '--'}/${church.foundation_year || '----'}`],
      ['Local y Titularidad', `${church.premises_type} | A nombre de: ${church.property_owner_type || '—'} ${church.property_owner_name || ''}`],
      ['Arriendo / Casa Pastoral', `Arriendo local: ${formatCOP(church.rent_amount)} | Casa pastoral: ${church.has_pastoral_house ? 'Sí' : `No (Arriendo: ${formatCOP(church.pastoral_house_rent)})`}`],
      ['Documento y Predial', `${church.ownership_doc_type} | Paga predial: ${church.pays_property_tax ? 'Sí' : 'No'} | Al día: ${church.property_tax_up_to_date}`],
    ],
    headStyles: { fillColor: IGLEICO_NAVY },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 58 } },
    styles: { fontSize: 8.5 },
  });

  let nextY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 120;
  autoTable(doc, {
    startY: nextY + 5,
    head: [['2. INFORMACIÓN FINANCIERA Y 3. MINISTERIOS', 'INFORMACIÓN']],
    body: [
      ['Promedio Ingresos Mensuales', `Declarado: ${formatCOP(church.avg_monthly_income)} | Real sistema: ${formatCOP(church.live_avg_monthly_income || 0)}`],
      ['Cuenta Bancaria IGLEICO', church.has_bank_account ? `Sí – ${church.bank_name} (${church.bank_account_type}) | NIT: ${church.bank_nit}` : 'No'],
      ['Cuentas por Pagar / Personal', `Préstamos activos: ${church.loans?.filter((l) => l.status === 'ACTIVO').length || 0} | Personal contratado: ${church.has_hired_staff ? 'Sí' : 'No'}`],
      ['Pastor / Copastor', `Pastor: ${church.pastor?.full_name || 'Sin asignar'} | Copastor: ${church.has_copastor ? `${church.copastor_name} (${church.copastor_phone})` : 'No'}`],
      ['Concilio Local', church.has_local_council ? `Sí (${church.local_council_count} miembros)` : 'No'],
      ['Tesorero(a) Local', `${church.treasurer_name || '—'} | ${church.treasurer_phone || ''} | ${church.treasurer_academic || ''}`],
      ['Secretario(a) Local', `${church.secretary_name || '—'} | ${church.secretary_phone || ''} | ${church.secretary_academic || ''}`],
      ['Organismos Internos', [church.has_ucei && 'UCEI', church.has_ujei && 'UJEI', church.has_udei && 'UDEI', church.has_unei && 'UNEI'].filter(Boolean).join(', ') || 'Ninguno'],
      ['Ministerios Locales', [church.ministry_missions && 'Misiones', church.ministry_discipleship && 'Discipulado', church.ministry_intercession && 'Intercesión', church.ministry_evangelism && 'Evangelismo', church.ministry_worship && 'Alabanza', church.ministry_other].filter(Boolean).join(', ') || 'Ninguno'],
      ['Discipulado / Escuela Dominical', `${church.discipleship_program || '—'} | Maestros E.D.: ${church.sunday_school_teachers}`],
      ['Equipos Audiovisuales', [church.equipment?.camera && 'Cámara', church.equipment?.videobeam && 'Video Beam', church.equipment?.screen && 'Pantalla', church.equipment?.computer && 'Computador', church.equipment?.other].filter(Boolean).join(', ') || 'Ninguno'],
    ],
    headStyles: { fillColor: IGLEICO_GOLD, textColor: [255, 255, 255] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 58 } },
    styles: { fontSize: 8.5 },
  });

  nextY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 210;
  const c = church.census;
  autoTable(doc, {
    startY: nextY + 5,
    head: [['0-12m', '1-5', '6-11', '12-14 B/NB', '15-30 B/NB', '31-59 B/NB', '>60 B/NB', 'Baut.', 'No Baut.', 'Niños', 'TOTAL']],
    body: [[
      String(c.infancy_0_12m),
      String(c.infancy_1_5),
      String(c.childhood_6_11),
      `${c.adolescents_12_14_b}/${c.adolescents_12_14_nb}`,
      `${c.youth_15_30_b}/${c.youth_15_30_nb}`,
      `${c.adults_31_59_b}/${c.adults_31_59_nb}`,
      `${c.seniors_60_plus_b}/${c.seniors_60_plus_nb}`,
      String(c.total_baptized),
      String(c.total_not_baptized),
      String(c.total_children),
      String(c.grand_total),
    ]],
    headStyles: { fillColor: IGLEICO_NAVY, fontSize: 7.5, halign: 'center' },
    styles: { fontSize: 8, halign: 'center' },
  });

  doc.save(`Ficha_Iglesia_${church.name.replace(/\s+/g, '_')}.pdf`);
}

export function exportDirectoryExcel(churches: Church[], pastors: Pastor[]) {
  const wb = XLSX.utils.book_new();
  const cSheet = XLSX.utils.json_to_sheet(
    churches.map((c) => ({
      Iglesia: c.name,
      Categorizacion: CATEGORIZATION_LABELS[c.categorization] || c.categorization,
      Zona: c.zone_name,
      Municipio: c.municipality,
      Departamento: c.department,
      Direccion: c.address,
      Pastor: c.pastor?.full_name || 'Sin asignar',
      Tesorero: c.treasurer_name,
      Secretario: c.secretary_name,
      Local: c.premises_type,
      Cuenta_Banco: c.has_bank_account ? `${c.bank_name} (${c.bank_nit})` : 'No',
      Promedio_Ingresos_COP: c.live_avg_monthly_income || c.avg_monthly_income,
      Total_Miembros: c.census.grand_total,
      Bautizados: c.census.total_baptized,
      No_Bautizados: c.census.total_not_baptized,
      Ninos: c.census.total_children,
    }))
  );
  XLSX.utils.book_append_sheet(wb, cSheet, 'Iglesias Distrito Sabana');

  const pSheet = XLSX.utils.json_to_sheet(
    pastors.map((p) => ({
      Nombre: p.full_name,
      Dignidad: DIGNITY_LABELS[p.ministerial_dignity] || p.ministerial_dignity,
      Cedula: p.id_number,
      Celular: p.phone,
      Correo: p.email,
      Iglesia: p.church_name || 'Sin asignar',
      Inicio_Ministerio: `${p.ministry_start_month}/${p.ministry_start_year}`,
      Contrato: CONTRACT_LABELS[p.contract_type] || p.contract_type,
      Entidad: p.contract_entity,
      Remuneracion_COP: p.monthly_remuneration,
      Nivel_Academico: p.academic_level,
      Conyuge: p.spouse_name,
      Hijos: p.children?.length || 0,
      Autorizo_Ley1581: p.data_auth_accepted ? 'SI' : 'NO',
    }))
  );
  XLSX.utils.book_append_sheet(wb, pSheet, 'Pastores Distrito Sabana');
  XLSX.writeFile(wb, 'Directorio_IGLEICO_Distrito_Sabana.xlsx');
}
