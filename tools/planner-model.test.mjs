import test from 'node:test';
import assert from 'node:assert/strict';
import { todaySG, addDays, occursOn, expandTasks, calendarEvent } from '../js/planner-model.mjs';

const task = (changes = {}) => ({ id: 'task-a', title: '研究', notes: '', start_date: '2026-10-16', start_time: '15:00:00', duration_minutes: 60, category: 'research', important: false, repeat: 'none', repeat_interval: 1, weekdays: [], repeat_until: null, ...changes });

test('Singapore date does not depend on host timezone', () => {
  assert.equal(todaySG(new Date('2026-10-15T16:01:00Z')), '2026-10-16');
  assert.equal(todaySG(new Date('2026-10-16T15:59:00Z')), '2026-10-16');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
});
test('weekly interval uses Monday week and respects selected days/start/end', () => {
  const row = task({ repeat: 'weekly', repeat_interval: 2, weekdays: [1, 5], repeat_until: '2026-11-02' });
  assert.equal(occursOn(row, '2026-10-12'), false);
  assert.equal(occursOn(row, '2026-10-16'), true);
  assert.equal(occursOn(row, '2026-10-19'), false);
  assert.equal(occursOn(row, '2026-10-26'), true);
  assert.equal(occursOn(row, '2026-10-30'), true);
  assert.equal(occursOn(row, '2026-11-09'), false);
});
test('daily recurrence and inclusive until date', () => {
  const result = expandTasks([task({ repeat: 'daily', repeat_interval: 2, repeat_until: '2026-10-20' })], [], '2026-10-15', '2026-10-25');
  assert.deepEqual(result.map((i) => i.date), ['2026-10-16','2026-10-18','2026-10-20']);
});
test('monthly recurrence skips nonexistent dates and handles leap day', () => {
  const row = task({ start_date: '2028-01-31', repeat: 'monthly' });
  assert.equal(occursOn(row, '2028-02-29'), false);
  assert.equal(occursOn(row, '2028-03-31'), true);
  const leap = task({ start_date: '2028-02-29', repeat: 'monthly', repeat_interval: 12 });
  assert.equal(occursOn(leap, '2029-02-28'), false);
  assert.equal(occursOn(leap, '2032-02-29'), true);
});
test('completing/deleting one occurrence leaves future repeats unchanged', () => {
  const row = task({ repeat: 'daily' });
  const ex = [{ task_id: row.id, original_date: '2026-10-16', completed: true }, { task_id: row.id, original_date: '2026-10-17', skipped: true }];
  const result = expandTasks([row], ex, '2026-10-16', '2026-10-19');
  assert.equal(result.length, 2); assert.equal(result[0].completed, true); assert.equal(result[1].completed, false);
});
test('moved occurrence enters range once, keeps original identity and supports all-day', () => {
  const row = task({ repeat: 'weekly', weekdays: [5] });
  const ex = [{ task_id: row.id, original_date: '2026-10-16', override_date: '2026-10-27', start_time: null, title: '移动后的课程' }];
  const result = expandTasks([row], ex, '2026-10-26', '2026-10-29');
  assert.equal(result.length, 1); assert.equal(result[0].original_date, '2026-10-16');
  assert.equal(result[0].title, '移动后的课程'); assert.equal(result[0].start_time, null);
  const event = calendarEvent(result[0]); assert.equal(event.allDay, true); assert.equal(event.end, '2026-10-28');
  assert.equal(expandTasks([row], ex, '2026-10-16', '2026-10-17').length, 0);
});
test('overrides outside new series rule stay hidden', () => {
  const row = task({ repeat: 'weekly', weekdays: [1] });
  const ex = [{ task_id: row.id, original_date: '2026-10-16', override_date: '2026-10-27' }];
  assert.equal(expandTasks([row], ex, '2026-10-27', '2026-10-28').length, 0);
});
test('timed event can cross midnight without device timezone shifts', () => {
  const item = expandTasks([task({ start_time: '23:30:00', duration_minutes: 120 })], [], '2026-10-16', '2026-10-18')[0];
  const event = calendarEvent(item);
  assert.equal(event.start, '2026-10-16T23:30:00'); assert.equal(event.end, '2026-10-17T01:30:00');
});
test('rescheduling a one-off task preserves its completion identity', () => {
  const row = task({ start_date: '2026-10-20' });
  const ex = [{ task_id: row.id, original_date: '2026-10-16', completed: true }];
  const result = expandTasks([row], ex, '2026-10-20', '2026-10-21');
  assert.equal(result.length, 1); assert.equal(result[0].date, '2026-10-20');
  assert.equal(result[0].completed, true); assert.equal(result[0].original_date, '2026-10-16');
});
