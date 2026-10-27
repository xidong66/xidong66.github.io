import { dayNumber, todaySG } from './planner-model.mjs?v=20261016-days';

// Count whole calendar months from the earlier date, clamping to the month's
// final day. The remainder is real days, never days divided by 365 or 30.
export function calendarDifference(from, to) {
  const [start,end] = from <= to ? [from,to] : [to,from];
  const [sy,sm,sd] = start.split('-').map(Number);
  const [ey,em] = end.split('-').map(Number);
  let totalMonths = (ey-sy)*12+em-sm;
  const anchor = (months) => {
    const index=sm-1+months, year=sy+Math.floor(index/12), month=index%12+1;
    const last=new Date(Date.UTC(year,month,0)).getUTCDate();
    return `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(Math.min(sd,last)).padStart(2,'0')}`;
  };
  if (anchor(totalMonths)>end) totalMonths--;
  return { years:Math.floor(totalMonths/12), months:totalMonths%12, days:dayNumber(end)-dayNumber(anchor(totalMonths)) };
}

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
