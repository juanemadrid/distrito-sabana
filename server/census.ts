import { db, toPlainList } from './db';

export interface CensusTable {
  infancy_0_12m: number;
  infancy_1_5: number;
  childhood_6_11: number;
  adolescents_12_14_b: number;
  adolescents_12_14_nb: number;
  youth_15_30_b: number;
  youth_15_30_nb: number;
  adults_31_59_b: number;
  adults_31_59_nb: number;
  seniors_60_plus_b: number;
  seniors_60_plus_nb: number;
  total_baptized: number;
  total_not_baptized: number;
  total_children: number;
  grand_total: number;
}

export function emptyCensus(): CensusTable {
  return {
    infancy_0_12m: 0,
    infancy_1_5: 0,
    childhood_6_11: 0,
    adolescents_12_14_b: 0,
    adolescents_12_14_nb: 0,
    youth_15_30_b: 0,
    youth_15_30_nb: 0,
    adults_31_59_b: 0,
    adults_31_59_nb: 0,
    seniors_60_plus_b: 0,
    seniors_60_plus_nb: 0,
    total_baptized: 0,
    total_not_baptized: 0,
    total_children: 0,
    grand_total: 0,
  };
}

export function recalculateCensusTotals(c: Partial<CensusTable>): CensusTable {
  const base: CensusTable = {
    infancy_0_12m: Number(c.infancy_0_12m || 0),
    infancy_1_5: Number(c.infancy_1_5 || 0),
    childhood_6_11: Number(c.childhood_6_11 || 0),
    adolescents_12_14_b: Number(c.adolescents_12_14_b || 0),
    adolescents_12_14_nb: Number(c.adolescents_12_14_nb || 0),
    youth_15_30_b: Number(c.youth_15_30_b || 0),
    youth_15_30_nb: Number(c.youth_15_30_nb || 0),
    adults_31_59_b: Number(c.adults_31_59_b || 0),
    adults_31_59_nb: Number(c.adults_31_59_nb || 0),
    seniors_60_plus_b: Number(c.seniors_60_plus_b || 0),
    seniors_60_plus_nb: Number(c.seniors_60_plus_nb || 0),
    total_baptized: 0,
    total_not_baptized: 0,
    total_children: 0,
    grand_total: 0,
  };
  base.total_children = base.infancy_0_12m + base.infancy_1_5 + base.childhood_6_11;
  base.total_baptized =
    base.adolescents_12_14_b +
    base.youth_15_30_b +
    base.adults_31_59_b +
    base.seniors_60_plus_b;
  base.total_not_baptized =
    base.adolescents_12_14_nb +
    base.youth_15_30_nb +
    base.adults_31_59_nb +
    base.seniors_60_plus_nb;
  base.grand_total = base.total_children + base.total_baptized + base.total_not_baptized;
  return base;
}

function getAgeMonths(birthDateStr: string): number | null {
  if (!birthDateStr) return null;
  const d = new Date(birthDateStr);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) months -= 1;
  return Math.max(0, months);
}

export function computeAutoCensusForChurch(churchId: number): CensusTable {
  const members = toPlainList<{ birth_date: string; baptism_status: string; status: string }>(
    db
      .prepare(`SELECT birth_date, baptism_status, status FROM members WHERE church_id = ? AND status = 'ACTIVO'`)
      .all(churchId)
  );

  const c = emptyCensus();
  for (const m of members) {
    const months = getAgeMonths(m.birth_date);
    const isBaptized = m.baptism_status === 'BAUTIZADO';

    if (months !== null && months <= 12) {
      c.infancy_0_12m++;
    } else if (months !== null && months < 6 * 12) {
      c.infancy_1_5++;
    } else if ((months !== null && months < 12 * 12) || m.baptism_status === 'NINO') {
      c.childhood_6_11++;
    } else if (months !== null && months < 15 * 12) {
      if (isBaptized) c.adolescents_12_14_b++;
      else c.adolescents_12_14_nb++;
    } else if (months !== null && months <= 30 * 12) {
      if (isBaptized) c.youth_15_30_b++;
      else c.youth_15_30_nb++;
    } else if (months !== null && months <= 59 * 12) {
      if (isBaptized) c.adults_31_59_b++;
      else c.adults_31_59_nb++;
    } else if (months !== null && months >= 60 * 12) {
      if (isBaptized) c.seniors_60_plus_b++;
      else c.seniors_60_plus_nb++;
    } else {
      // Sin fecha de nacimiento registrada -> clasificamos en adultos
      if (isBaptized) c.adults_31_59_b++;
      else c.adults_31_59_nb++;
    }
  }
  return recalculateCensusTotals(c);
}

export function getEffectiveCensusForChurch(church: {
  id: number;
  use_auto_census?: number;
  manual_census_json?: string;
}): CensusTable {
  const autoCensus = computeAutoCensusForChurch(church.id);
  if (church.use_auto_census === 0 && church.manual_census_json) {
    try {
      const parsed = JSON.parse(church.manual_census_json) as Partial<CensusTable>;
      return recalculateCensusTotals(parsed);
    } catch {
      return autoCensus;
    }
  }
  return autoCensus;
}

export function sumCensus(list: CensusTable[]): CensusTable {
  const sum = emptyCensus();
  for (const item of list) {
    sum.infancy_0_12m += item.infancy_0_12m;
    sum.infancy_1_5 += item.infancy_1_5;
    sum.childhood_6_11 += item.childhood_6_11;
    sum.adolescents_12_14_b += item.adolescents_12_14_b;
    sum.adolescents_12_14_nb += item.adolescents_12_14_nb;
    sum.youth_15_30_b += item.youth_15_30_b;
    sum.youth_15_30_nb += item.youth_15_30_nb;
    sum.adults_31_59_b += item.adults_31_59_b;
    sum.adults_31_59_nb += item.adults_31_59_nb;
    sum.seniors_60_plus_b += item.seniors_60_plus_b;
    sum.seniors_60_plus_nb += item.seniors_60_plus_nb;
  }
  return recalculateCensusTotals(sum);
}
