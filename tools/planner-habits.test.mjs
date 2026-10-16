import test from 'node:test';
import assert from 'node:assert/strict';
import { habitSummary, habitMonthGrid, shiftHabitMonth } from '../js/planner-habits-model.mjs';
const habit = { id: 'reading', start_date: '2026-10-01' };
const checks = (...dates) => dates.map((check_date) => ({ habit_id: habit.id, check_date }));

test('monthly rate counts elapsed dates from the habit start, never future dates', () => {
  const s = habitSummary({ ...habit, start_date: '2026-10-10' }, checks('2026-10-09', '2026-10-10', '2026-10-15', '2026-10-17'), '2026-10', '2026-10-16');
  assert.equal(s.eligibleDays, 7); assert.equal(s.monthCount, 2); assert.equal(s.totalCount, 2); assert.equal(s.completionRate, 29);
  const createdToday = habitSummary({ ...habit, start_date: '2026-10-16' }, checks('2026-10-16'), '2026-10', '2026-10-16');
  assert.equal(createdToday.completionRate, 100); assert.equal(createdToday.eligibleDays, 1);
});
test('history is scoped to the individual habit and counted once per calendar day', () => {
  const data = [...checks('2026-09-30', '2026-10-01', '2026-10-01'), { habit_id: 'running', check_date: '2026-10-02' }];
  const s = habitSummary({ ...habit, start_date: '2026-09-01' }, data, '2026-10', '2026-10-16');
  assert.equal(s.totalCount, 2); assert.equal(s.monthCount, 1); assert.equal(s.todayChecked, false);
});
test('current streak is retained until today ends and spans month and year boundaries', () => {
  const started = { ...habit, start_date: '2025-12-30' };
  const data = checks('2025-12-30', '2025-12-31', '2026-01-01');
  assert.equal(habitSummary(started, data, '2025-12', '2026-01-01').streak, 3);
  assert.equal(habitSummary(started, data, '2025-12', '2026-01-02').streak, 3);
  assert.equal(habitSummary(started, data, '2025-12', '2026-01-03').streak, 0);
  assert.equal(habitSummary(started, [...data, ...checks('2026-01-03')], '2026-01', '2026-01-03').streak, 1);
});
test('historical months use their entire eligible range, including leap February', () => {
  const started = { ...habit, start_date: '2024-02-01' };
  assert.equal(habitSummary(started, checks('2024-02-29'), '2024-02', '2026-10-16').eligibleDays, 29);
  assert.equal(habitSummary(started, [], '2023-12', '2026-10-16').eligibleDays, 0);
  const future = habitSummary(started, [], '2027-01', '2026-10-16');
  assert.equal(future.eligibleDays, 0); assert.equal(future.completionRate, 0);
});
test('six-week calendar starts on Sunday and disables spillover, future and pre-start dates', () => {
  const grid = habitMonthGrid('2026-10', '2026-10-10', new Set(['2026-10-16']), '2026-10-16');
  assert.equal(grid.length, 42); assert.equal(grid[0].date, '2026-09-27');
  assert.equal(grid.find((d) => d.date === '2026-10-09').eligible, false);
  assert.equal(grid.find((d) => d.date === '2026-10-10').eligible, true);
  assert.equal(grid.find((d) => d.date === '2026-10-16').checked, true);
  assert.equal(grid.find((d) => d.date === '2026-10-16').isToday, true);
  assert.equal(grid.find((d) => d.date === '2026-10-17').eligible, false);
  assert.equal(grid[0].eligible, false);
  const feb = habitMonthGrid('2024-02', '2024-02-01', new Set(), '2026-10-16');
  assert.equal(feb.filter((d) => d.inMonth).length, 29);
  assert.equal(shiftHabitMonth('2026-12'), '2027-01'); assert.equal(shiftHabitMonth('2026-01', -1), '2025-12');
});
