import { todaySG, dayNumber } from './planner-model.mjs?v=20261016-colors';
import { weightRange } from './planner-weight-model.mjs?v=20261018-weight';

export const bpLocal = (iso, seconds = false) => new Date(Date.parse(iso) + 8 * 3600000).toISOString().slice(0, seconds ? 19 : 16);
export function parseBPTime(local, now = new Date().toISOString()) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(local)) throw new Error('请选择有效的测量日期和时间。');
  const value = `${local.length === 16 ? local + ':00' : local}+08:00`, time = Date.parse(value);
  if (!Number.isFinite(time) || bpLocal(new Date(time).toISOString(), true) !== (local.length === 16 ? local + ':00' : local)
    || local < '2000-01-01T00:00' || time > Date.parse(now)) throw new Error('测量时间应在 2000 年至现在之间。');
  return new Date(time).toISOString();
}
export function parseBP(systolic, diastolic, pulse = '') {
  const integer = (v, label) => { const s = String(v).trim(); if (!/^\d{1,3}$/.test(s) || Number(s) < 1) throw new Error(`${label}请填写 1 至 999 的整数。`); return Number(s); };
  const high = integer(systolic, '高压'), low = integer(diastolic, '低压');
  if (high <= low) throw new Error('高压应大于低压，请核对输入的测量值。');
  return { systolic: high, diastolic: low, pulse: String(pulse).trim() ? integer(pulse, '心率') : null };
}
export function bpRange(records, mode = '30', month = todaySG().slice(0, 7), now = new Date().toISOString()) {
  const sorted = records.filter((r) => Date.parse(r.measured_at) <= Date.parse(now)).slice()
    .sort((a, b) => Date.parse(a.measured_at) - Date.parse(b.measured_at) || a.id.localeCompare(b.id));
  const bounds = weightRange(sorted.map((r) => ({ record_date: bpLocal(r.measured_at).slice(0, 10) })), mode, month, bpLocal(now).slice(0, 10));
  const selected = sorted.filter((r) => { const d = bpLocal(r.measured_at).slice(0, 10); return d >= bounds.from && d <= bounds.through; });
  const start = mode === 'all' && selected.length ? Date.parse(selected[0].measured_at) : Date.parse(`${bounds.from}T00:00:00+08:00`);
  const end = mode === 'all' && selected.length ? Date.parse(selected.at(-1).measured_at) : Math.min(Date.parse(`${bounds.through}T23:59:59+08:00`), Date.parse(now));
  return { from: bounds.from, through: bounds.through, start, end, selected, latest: sorted.at(-1) || null };
}
export function bpChart(records, start, end, width = 800, height = 300) {
  const margin = { left: 48, right: 24, top: 25, bottom: 38 };
  const pw = width - margin.left - margin.right, ph = height - margin.top - margin.bottom;
  if (!records.length) return { points: [], segments: [], xTicks: [], yTicks: [], width, height, margin };
  const values = records.flatMap((r) => [r.systolic, r.diastolic]);
  const padding = Math.max(5, (Math.max(...values) - Math.min(...values)) * .12);
  const low = Math.max(0, Math.min(...values) - padding), high = Math.max(...values) + padding;
  const points = records.map((r) => ({ ...r,
    x: margin.left + (end > start ? (Date.parse(r.measured_at) - start) / (end - start) : .5) * pw,
    highY: margin.top + (high - r.systolic) / (high - low) * ph,
    lowY: margin.top + (high - r.diastolic) / (high - low) * ph }));
  const segments = points.slice(1).map((to, i) => ({ from: points[i], to, gap: dayNumber(bpLocal(to.measured_at).slice(0, 10)) - dayNumber(bpLocal(points[i].measured_at).slice(0, 10)) > 1 }));
  const count = end === start ? 1 : width < 520 ? 3 : 6;
  const firstLocal = bpLocal(new Date(start).toISOString()), lastLocal = bpLocal(new Date(end).toISOString());
  const sameDay = firstLocal.slice(0, 10) === lastLocal.slice(0, 10), spansYears = firstLocal.slice(0, 4) !== lastLocal.slice(0, 4);
  const xTicks = Array.from({ length: count }, (_, i) => {
    const ratio = count === 1 ? .5 : i / (count - 1), local = bpLocal(new Date(start + (end - start) * ratio).toISOString());
    return { x: margin.left + ratio * pw, label: sameDay ? local.slice(11) : spansYears ? local.slice(2, 10).replaceAll('-', '/') : local.slice(5, 10).replace('-', '/') };
  });
  const yTicks = Array.from({ length: 5 }, (_, i) => ({ value: Math.round(low + (high - low) * i / 4), y: margin.top + ph * (1 - i / 4) }));
  return { points, segments, xTicks, yTicks, width, height, margin };
}
