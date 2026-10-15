import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCents, decimal, money, monthlyDate, nextMonth, nextDue } from '../js/planner-ledger-model.mjs';

test('money input uses exact integer cents and rejects unsupported formats', () => {
  assert.equal(parseCents('0.10') + parseCents('0.20'), 30);
  assert.equal(parseCents('.01'), 1);
  assert.equal(parseCents(' 12.3 '), 1230);
  assert.equal(parseCents('-0.01', true), -1);
  assert.equal(parseCents('999999999.99'), 99999999999);
  for (const invalid of ['', 'NaN', 'Infinity', '1e3', '1,000', '0.001', '-1', '1000000000']) assert.throws(() => parseCents(invalid));
});
test('balance display preserves negative cents and totals beyond Number precision', () => {
  assert.equal(decimal(-1), '-0.01');
  assert.equal(money(-1, 'GBP'), '£ -0.01');
  assert.equal(money(12345, 'SGD'), 'S$ 123.45');
  assert.equal(money('9007199254740993', 'CNY'), 'CN¥ 90,071,992,547,409.93');
});
test('fixed monthly dates clamp to the last day, including leap February', () => {
  assert.equal(monthlyDate('2024-02', 31), '2024-02-29');
  assert.equal(monthlyDate('2025-02', 31), '2025-02-28');
  assert.equal(monthlyDate('2026-04', 31), '2026-04-30');
  assert.equal(monthlyDate('2026-05', 31), '2026-05-31');
  assert.equal(nextMonth('2026-12'), '2027-01');
  assert.equal(nextMonth('2026-01', -1), '2025-12');
});
test('next due respects start, end, pause and the fact today is already posted', () => {
  const rule = { day_of_month: 31, start_month: '2024-01-01', end_month: null, enabled: true, removed: false };
  assert.equal(nextDue(rule, '2024-02-01'), '2024-02-29');
  assert.equal(nextDue(rule, '2024-02-29'), '2024-03-31');
  assert.equal(nextDue({ ...rule, start_month: '2025-02-01' }, '2024-10-01'), '2025-02-28');
  assert.equal(nextDue({ ...rule, end_month: '2024-02-01' }, '2024-02-29'), null);
  assert.equal(nextDue({ ...rule, enabled: false }, '2024-02-01'), null);
  assert.equal(nextDue({ ...rule, removed: true }, '2024-02-01'), null);
});
