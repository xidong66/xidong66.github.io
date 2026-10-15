import { dayNumber, todaySG } from './planner-model.mjs?v=20261016-days';

// Calendar dates, never elapsed 24-hour periods: consistent across timezones/DST.
export function anniversarySummary(item, today = todaySG()) {
  let target = item.date;
  if (item.mode === 'countdown' && item.yearly && target < today) {
    let year = Number(today.slice(0, 4));
    const inYear = (y) => {
      const monthDay = item.date.slice(5);
      const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
      return `${y}-${monthDay === '02-29' && !leap ? '02-28' : monthDay}`;
    };
    target = inYear(year);
    if (target < today) target = inYear(++year);
  }
  const difference = dayNumber(target) - dayNumber(today);
  const future = difference > 0;
  return {
    target, days: Math.abs(difference),
    label: difference === 0 ? '就是今天' : future ? '还有' : item.mode === 'countup' ? '已经' : '已过去',
    tone: difference === 0 ? 'today' : future ? 'upcoming' : 'elapsed',
  };
}

export function sortAnniversaries(items, today = todaySG()) {
  return items.map((item) => ({ ...item, summary: anniversarySummary(item, today) }))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned)
      || Number(a.summary.tone === 'elapsed') - Number(b.summary.tone === 'elapsed')
      || a.summary.days - b.summary.days || a.title.localeCompare(b.title, 'zh-CN') || a.id.localeCompare(b.id));
}
