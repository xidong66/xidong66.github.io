export const CURRENCIES = {
  CNY: { label: '人民币', symbol: 'CN¥', color: '#8c6545' },
  GBP: { label: '英镑', symbol: '£', color: '#6e5492' },
  SGD: { label: '新加坡元', symbol: 'S$', color: '#365c45' },
};
export const LEDGER_CATEGORIES = {
  expense: { food: '餐饮', transport: '交通', shopping: '购物', housing: '居住', study: '学习', travel: '旅行', fun: '娱乐', health: '医疗', subscription: '订阅', other: '其他支出' },
  income: { salary: '工资', scholarship: '奖学金', sidejob: '兼职', refund: '退款', other: '其他收入' },
};
export function parseCents(input, signed = false) {
  const value = String(input).trim();
  if (!/^-?(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(value) || (!signed && value.startsWith('-'))) throw new Error('金额最多保留两位小数。');
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = value.replace(/^-/, '').split('.');
  const cents = BigInt(whole || '0') * 100n + BigInt(fraction.padEnd(2, '0'));
  if (cents > 99999999999n) throw new Error('单笔金额不能超过 999,999,999.99。');
  return Number(negative ? -cents : cents);
}
export function decimal(cents) {
  const value = BigInt(cents || 0); const absolute = value < 0n ? -value : value;
  return `${value < 0n ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
}
export function money(cents, currency) {
  const value = BigInt(cents || 0); const absolute = value < 0n ? -value : value;
  return `${CURRENCIES[currency].symbol} ${value < 0n ? '-' : ''}${(absolute / 100n).toLocaleString('zh-CN')}.${String(absolute % 100n).padStart(2, '0')}`;
}
export function nextMonth(month, offset = 1) {
  const [year, number] = month.split('-').map(Number);
  return new Date(Date.UTC(year, number - 1 + offset, 1)).toISOString().slice(0, 7);
}
export function monthlyDate(month, day) {
  const last = new Date(`${nextMonth(month)}-01T00:00:00Z`); last.setUTCDate(0);
  return `${month}-${String(Math.min(day, last.getUTCDate())).padStart(2, '0')}`;
}
export function nextDue(rule, today) {
  if (!rule.enabled || rule.removed) return null;
  let month = today.slice(0, 7) < rule.start_month.slice(0, 7) ? rule.start_month.slice(0, 7) : today.slice(0, 7);
  if (monthlyDate(month, rule.day_of_month) <= today) month = nextMonth(month);
  if (rule.end_month && month > rule.end_month.slice(0, 7)) return null;
  return monthlyDate(month, rule.day_of_month);
}
