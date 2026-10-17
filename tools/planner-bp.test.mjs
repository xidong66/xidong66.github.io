import test from 'node:test';
import assert from 'node:assert/strict';
import { bpLocal, parseBPTime, parseBP, bpRange, bpChart } from '../js/planner-bp-model.mjs';
const now = '2026-10-18T12:00:00Z';
const rows = [
  { id: 'a', measured_at: '2026-10-10T00:00:00Z', systolic: 120, diastolic: 80, pulse: 70 },
  { id: 'b', measured_at: '2026-10-17T00:00:00Z', systolic: 118, diastolic: 78, pulse: 68 },
  { id: 'c', measured_at: '2026-10-17T12:00:00Z', systolic: 122, diastolic: 82, pulse: null },
];
test('blood pressure is integer-valued, high exceeds low, and pulse is optional', () => {
  assert.deepEqual(parseBP('120','80',''), { systolic: 120, diastolic: 80, pulse: null });
  assert.equal(parseBP('118','78','68').pulse, 68);
  for (const values of [['80','120',''],['120','80','0'],['120.5','80',''],['0','80',''],['120','80','1e2']]) assert.throws(() => parseBP(...values));
});
test('measurement times round-trip in UTC+8 regardless of host timezone', () => {
  assert.equal(parseBPTime('2026-10-18T08:15:30',now),'2026-10-18T00:15:30.000Z');
  assert.equal(bpLocal('2026-10-17T23:59:59Z',true),'2026-10-18T07:59:59');
  assert.throws(() => parseBPTime('2026-10-18T21:00',now));
  assert.throws(() => parseBPTime('2026-02-30T08:00',now));
  assert.throws(() => parseBPTime('1999-12-31T23:59',now));
});
test('multiple same-day and same-time readings remain independent, with no pulse carry-forward', () => {
  const result = bpRange([...rows,{...rows[2],id:'d'}], 'all', '2026-10', now);
  assert.equal(result.selected.length,4); assert.equal(result.latest.pulse,null);
  assert.equal(result.from,'2026-10-10'); assert.equal(result.through,'2026-10-17');
  assert.equal(bpRange(rows,'month','2026-09',now).selected.length,0);
  assert.equal(bpRange([...rows,{id:'future',measured_at:'2027-01-01T00:00:00Z'}],'all','2026-10',now).selected.length,3);
});
test('two series share one axis; intraday spacing uses actual time and missing days are dashed', () => {
  const r=bpRange(rows,'all','2026-10',now), c=bpChart(r.selected,r.start,r.end);
  assert.equal(c.points.length,3); assert.deepEqual(c.segments.map((s)=>s.gap),[true,false]);
  assert(c.points.every((p)=>p.highY<p.lowY));
  assert(Math.abs((c.points[1].x-c.points[0].x)/(c.points[2].x-c.points[1].x)-14)<1e-9);
});
test('empty and one-reading charts contain no invented measurements or trend lines', () => {
  const empty=bpRange([],'30','2026-10',now); assert.equal(bpChart([],empty.start,empty.end).points.length,0);
  const r=bpRange([rows[0]],'all','2026-10',now),c=bpChart(r.selected,r.start,r.end,240,260);
  assert.equal(c.points.length,1);assert.equal(c.segments.length,0);assert.equal(c.xTicks.length,1);assert(Number.isFinite(c.points[0].x));
});
