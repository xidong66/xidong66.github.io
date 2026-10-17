import { addDays, dayNumber, todaySG } from './planner-model.mjs?v=20261016-colors';

export function parseWeight(value) {
  const input = String(value).trim();
  if (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(input)) throw new Error('请填写公斤数，最多保留两位小数。');
  const [whole, fraction = ''] = input.split('.');
  const hundredths = BigInt(whole || 0) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (hundredths < 1n || hundredths > 99999n) throw new Error('体重应在 0.01 至 999.99 kg 之间。');
  return Number(hundredths);
}
export function weightText(hundredths, signed = false) {
  if (hundredths === null || hundredths === undefined) return '—';
  const n = Math.abs(hundredths);
  return `${hundredths < 0 ? '−' : signed && hundredths > 0 ? '+' : ''}${Math.floor(n / 100)}.${String(n % 100).padStart(2, '0')}`;
}
export function weightRange(records, mode = '30', month = todaySG().slice(0, 7), today = todaySG()) {
  const sorted = records.filter((r) => r.record_date <= today).slice().sort((a, b) => a.record_date.localeCompare(b.record_date));
  let from, through;
  if (mode === 'month') {
    from = `${month}-01`;
    const [year, number] = month.split('-').map(Number);
    const next = new Date(Date.UTC(year, number, 1)).toISOString().slice(0, 10);
    through = addDays(next, -1) < today ? addDays(next, -1) : today;
  } else if (mode === 'all') {
    from = sorted[0]?.record_date || addDays(today, -29); through = sorted.at(-1)?.record_date || today;
  } else { from = addDays(today, mode === '90' ? -89 : -29); through = today; }
  if (from < '2000-01-01') from = '2000-01-01';
  const selected = sorted.filter((r) => r.record_date >= from && r.record_date <= through);
  const latest = sorted.at(-1) || null, previous = sorted.at(-2) || null;
  return { from, through, selected, latest, previous,
    previousChange: previous ? latest.weight_hundredths - previous.weight_hundredths : null,
    rangeChange: selected.length >= 2 ? selected.at(-1).weight_hundredths - selected[0].weight_hundredths : null };
}

// Only actual records become points. Calendar-day spacing is preserved, and
// missing days are marked by dashed segments rather than zeroes/interpolation.
export function weightChart(records, from, through, width = 800, height = 300) {
  const margin = { left: 58, right: 20, top: 25, bottom: 38 };
  const plotWidth = width - margin.left - margin.right, plotHeight = height - margin.top - margin.bottom;
  if (!records.length) return { points: [], segments: [], xTicks: [], yTicks: [], margin, width, height };
  const values = records.map((r) => r.weight_hundredths), min = Math.min(...values), max = Math.max(...values);
  const padding = Math.max(50, Math.ceil((max - min) * .15));
  const low = Math.max(0, min - padding), high = max + padding;
  const days = Math.max(0, dayNumber(through) - dayNumber(from));
  const points = records.map((r) => ({ ...r,
    x: margin.left + (days ? (dayNumber(r.record_date) - dayNumber(from)) / days : .5) * plotWidth,
    y: margin.top + (high - r.weight_hundredths) / (high - low) * plotHeight }));
  const segments = points.slice(1).map((point, index) => ({ from: points[index], to: point, gap: dayNumber(point.record_date) - dayNumber(points[index].record_date) > 1 }));
  const tickCount = width < 520 ? 3 : 6;
  const offsets = [...new Set(Array.from({ length: tickCount }, (_, i) => Math.round(days * i / (tickCount - 1))))];
  const xTicks = offsets.map((offset) => ({ date: addDays(from, offset), x: margin.left + (days ? offset / days : .5) * plotWidth }));
  const yTicks = Array.from({ length: 5 }, (_, i) => ({ value: low + (high - low) * i / 4, y: margin.top + plotHeight * (1 - i / 4) }));
  return { points, segments, xTicks, yTicks, margin, width, height };
}
