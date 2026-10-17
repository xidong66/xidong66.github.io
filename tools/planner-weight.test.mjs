import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWeight, weightText, weightRange, weightChart } from '../js/planner-weight-model.mjs';
const rows = [
  { id: 'a', record_date: '2026-10-01', weight_hundredths: 7000 },
  { id: 'b', record_date: '2026-10-02', weight_hundredths: 6980 },
  { id: 'c', record_date: '2026-10-10', weight_hundredths: 6950 },
  { id: 'd', record_date: '2026-10-18', weight_hundredths: 6960 },
];
test('weight input stores exact hundredths of kg and rejects invalid values', () => {
  assert.equal(parseWeight('65.20'), 6520); assert.equal(parseWeight('.01'), 1); assert.equal(parseWeight(' 70.1 '), 7010);
  assert.equal(weightText(6520), '65.20'); assert.equal(weightText(-10, true), '−0.10'); assert.equal(weightText(10, true), '+0.10');
  assert.equal(weightText(null), '—');
  for (const invalid of ['', '0', '-65', '70.001', '1e2', 'NaN', 'Infinity', '1000', '65,2']) assert.throws(() => parseWeight(invalid));
});
test('missing dates produce no zeroes or invented points; gaps are dashed on the true day axis', () => {
  const chart = weightChart(rows, '2026-10-01', '2026-10-18', 800, 300);
  assert.equal(chart.points.length, 4); assert.deepEqual(chart.points.map((p) => p.weight_hundredths), [7000, 6980, 6950, 6960]);
  assert.deepEqual(chart.segments.map((s) => s.gap), [false, true, true]);
  const [a, b, c] = chart.points;
  assert(Math.abs((c.x - b.x) / (b.x - a.x) - 8) < 1e-9, 'eight-day gap occupies eight times the one-day interval');
  assert(chart.yTicks[0].value > 0, 'normal measurements are not pulled down to zero by blank dates');
});
test('range changes compare actual measurements, including irregular previous dates', () => {
  const s = weightRange(rows, '30', '2026-10', '2026-10-18');
  assert.equal(s.from, '2026-09-19'); assert.equal(s.through, '2026-10-18');
  assert.equal(s.previous.record_date, '2026-10-10'); assert.equal(s.previousChange, 10); assert.equal(s.rangeChange, -40);
  assert.deepEqual(rows.map((r) => r.id), ['a','b','c','d']);
  const ninety = weightRange(rows, '90', '2026-10', '2026-10-18'); assert.equal(ninety.from, '2026-07-21');
});
test('monthly ranges handle leap days and exclude future measurements', () => {
  const s = weightRange([{ record_date: '2024-02-29', weight_hundredths: 6000 }, { record_date: '2027-01-01', weight_hundredths: 5000 }], 'month', '2024-02', '2026-10-18');
  assert.equal(s.from, '2024-02-01'); assert.equal(s.through, '2024-02-29'); assert.equal(s.selected.length, 1);
  assert.equal(s.latest.record_date, '2024-02-29'); assert.equal(s.previousChange, null);
  assert.equal(weightRange(rows, 'month', '2026-10', '2026-10-18').through, '2026-10-18');
});
test('empty, single and constant histories remain valid without fabricated lines or division by zero', () => {
  const empty = weightRange([], 'all', '2026-10', '2026-10-18'); assert.equal(empty.latest, null); assert.equal(empty.rangeChange, null);
  assert.equal(weightChart([], empty.from, empty.through).points.length, 0);
  const one = weightRange([rows[0]], 'all', '2026-10', '2026-10-18');
  const chart = weightChart(one.selected, one.from, one.through, 280, 260);
  assert.equal(chart.segments.length, 0); assert(Number.isFinite(chart.points[0].x)); assert(Number.isFinite(chart.points[0].y));
  const flat = weightChart(rows.map((r) => ({ ...r, weight_hundredths: 7000 })), '2026-10-01', '2026-10-18');
  assert(flat.points.every((p) => p.y === flat.points[0].y)); assert(flat.yTicks[0].value < 7000); assert(flat.yTicks.at(-1).value > 7000);
});
