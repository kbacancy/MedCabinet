import { DoseLog } from './useDoseLogs';
import { Medicine } from './useMedicines';

export type AdherenceSummary = {
  medicineId: string;
  medicineName: string;
  color: string;
  takenDays: number;
  totalDays: number;
  percent: number;
  streak: number;
};

export type WeeklyPoint = {
  weekLabel: string;
  weekStart: string;
  percent: number;
};

const PALETTE = ['#1D9E75', '#F58220', '#4A90D9', '#9B59B6', '#E24B4A', '#F39C12', '#1ABC9C', '#E67E22'];

function isoWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function shortLabel(weekStart: string): string {
  const d = new Date(weekStart + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function getAdherenceSummaries(
  logs: DoseLog[],
  medicines: Medicine[],
  startDate: string,
  endDate: string,
): AdherenceSummary[] {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  let totalDays = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) totalDays++;

  return medicines.map((med, i) => {
    const medLogs = logs.filter(l => l.medicine_id === med.id);
    const takenSet = new Set(medLogs.map(l => l.date));
    const takenDays = takenSet.size;
    const percent = totalDays > 0 ? Math.round((takenDays / totalDays) * 100) : 0;

    let streak = 0;
    for (let j = 0; ; j++) {
      const d = new Date(Date.now() - j * 86400000).toISOString().split('T')[0];
      if (d < startDate) break;
      if (takenSet.has(d)) streak++;
      else break;
    }

    return {
      medicineId: med.id,
      medicineName: med.name,
      color: PALETTE[i % PALETTE.length],
      takenDays,
      totalDays,
      percent,
      streak,
    };
  });
}

export function getWeeklyPoints(
  logs: DoseLog[],
  medicineId: string,
  startDate: string,
  endDate: string,
): WeeklyPoint[] {
  const daysInWeek: Record<string, Set<string>> = {};
  for (let d = new Date(startDate + 'T00:00:00'); d <= new Date(endDate + 'T00:00:00'); d.setDate(d.getDate() + 1)) {
    const ds = d.toISOString().split('T')[0];
    const ws = isoWeekStart(ds);
    if (!daysInWeek[ws]) daysInWeek[ws] = new Set();
    daysInWeek[ws].add(ds);
  }

  const takenDates = new Set(logs.filter(l => l.medicine_id === medicineId).map(l => l.date));

  return Object.keys(daysInWeek).sort().map(ws => {
    const days = daysInWeek[ws];
    const taken = [...days].filter(d => takenDates.has(d)).length;
    return { weekStart: ws, weekLabel: shortLabel(ws), percent: Math.round((taken / days.size) * 100) };
  });
}
