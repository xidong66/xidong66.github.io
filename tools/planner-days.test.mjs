import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CATEGORIES, calendarEvent, occurrence } from '../js/planner-model.mjs';
import { anniversarySummary, sortAnniversaries, calendarDifference } from '../js/planner-days.mjs';

const item = (changes = {}) => ({ id: 'a', title: '纪念日', date: '2021-10-31', mode: 'countup', yearly: false, pinned: false, ...changes });

test('year/month/day display uses full calendar months and actual remaining days',()=>{
  assert.deepEqual(calendarDifference('2021-10-31','2026-10-28'),{years:4,months:11,days:28});
  assert.deepEqual(calendarDifference('2021-10-31','2026-10-31'),{years:5,months:0,days:0});
  assert.deepEqual(calendarDifference('2026-10-28','2021-10-31'),{years:4,months:11,days:28});
  assert.deepEqual(calendarDifference('2026-10-28','2026-10-28'),{years:0,months:0,days:0});
  assert.deepEqual(calendarDifference('2026-12-31','2027-01-01'),{years:0,months:0,days:1});
});
test('calendar duration handles end-of-month, leap years and resolved annual targets',()=>{
  assert.deepEqual(calendarDifference('2026-01-31','2026-02-28'),{years:0,months:1,days:0});
  assert.deepEqual(calendarDifference('2026-01-31','2026-03-30'),{years:0,months:1,days:30});
  assert.deepEqual(calendarDifference('2026-01-31','2026-03-31'),{years:0,months:2,days:0});
  assert.deepEqual(calendarDifference('2024-02-29','2025-02-28'),{years:1,months:0,days:0});
  assert.deepEqual(calendarDifference('2000-02-29','2100-02-28'),{years:100,months:0,days:0});
  assert.deepEqual(calendarDifference('1900-02-28','1901-03-01'),{years:1,months:0,days:1});
  const next=anniversarySummary(item({date:'1995-07-09',mode:'countdown',yearly:true}),'2026-10-28').target;
  assert.deepEqual(calendarDifference('2026-10-28',next),{years:0,months:8,days:11});
});
test('elapsed days exclude the start date and match the reference', () => {
  assert.deepEqual(anniversarySummary(item(), '2026-10-16'), { target: '2021-10-31', days: 1811, label: '已经', tone: 'elapsed' });
  assert.equal(anniversarySummary(item(), '2021-10-31').days, 0);
  assert.equal(anniversarySummary(item(), '2021-10-31').label, '就是今天');
});
test('one-off countdown, past target, future countup and century boundary', () => {
  assert.equal(anniversarySummary(item({ mode: 'countdown', date: '2026-10-19' }), '2026-10-16').days, 3);
  assert.equal(anniversarySummary(item({ mode: 'countdown' }), '2026-10-16').label, '已过去');
  assert.equal(anniversarySummary(item({ date: '2026-11-01' }), '2026-10-16').label, '还有');
  assert.equal(anniversarySummary(item({ date: '1900-01-01' }), '1900-03-01').days, 59);
  assert.equal(anniversarySummary(item({ date: '2000-01-01' }), '2000-03-01').days, 60);
});
test('annual birthdays show today, then next year; honor future first date', () => {
  const birthday = item({ date: '1995-10-19', mode: 'countdown', yearly: true });
  assert.equal(anniversarySummary(birthday, '2026-10-16').days, 3);
  assert.equal(anniversarySummary(birthday, '2026-10-19').days, 0);
  assert.equal(anniversarySummary(birthday, '2026-10-20').target, '2027-10-19');
  assert.equal(anniversarySummary(birthday, '2026-12-31').target, '2027-10-19');
  assert.equal(anniversarySummary({ ...birthday, date: '2028-10-19' }, '2026-10-16').target, '2028-10-19');
});
test('Feb 29 is Feb 28 in non-leap years, including 2100', () => {
  const birthday = item({ date: '2000-02-29', mode: 'countdown', yearly: true });
  assert.equal(anniversarySummary(birthday, '2027-02-28').days, 0);
  assert.equal(anniversarySummary(birthday, '2027-03-01').target, '2028-02-29');
  assert.equal(anniversarySummary(birthday, '2028-02-28').days, 1);
  assert.equal(anniversarySummary(birthday, '2100-02-27').target, '2100-02-28');
});
test('pinned records first, upcoming nearest first, input is not mutated', () => {
  const rows = [item(), item({ id: 'b', date: '2026-10-19', mode: 'countdown' }), item({ id: 'c', pinned: true }), item({ id: 'd', date: '2026-10-17', mode: 'countdown' })];
  assert.deepEqual(sortAnniversaries(rows, '2026-10-16').map((r) => r.id), ['c', 'd', 'b', 'a']);
  assert.equal(rows[0].summary, undefined);
});
test('every category has a color and is accepted in both database constraints', () => {
  const sql = readFileSync(new URL('../supabase/planner-days-upgrade.sql', import.meta.url), 'utf8');
  assert.equal(Object.keys(CATEGORIES).length, 9);
  for (const [category, value] of Object.entries(CATEGORIES)) {
    assert.equal(sql.split(`'${category}'`).length - 1, 2);
    const row = occurrence({ id: 'test', title: value.label, category, start_date: '2026-10-16', duration_minutes: 60, repeat: 'none' }, '2026-10-16');
    assert.equal(calendarEvent(row).backgroundColor, value.color);
  }
});
