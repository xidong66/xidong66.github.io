import { addDays, dayNumber, todaySG, weekday } from './planner-model.mjs?v=20261016-colors';

export const HABIT_COLORS = {
  sage: { label: '鼠尾草绿', accent: '#55745c', soft: '#eaf1e8' },
  blue: { label: '雾霭蓝', accent: '#507ca8', soft: '#eaf1f8' },
  rose: { label: '玫瑰粉', accent: '#b06b83', soft: '#f8edf1' },
  amber: { label: '暖杏橙', accent: '#a77636', soft: '#faf1e3' },
  lavender: { label: '薰衣草紫', accent: '#8271ac', soft: '#f0edf8' },
  teal: { label: '湖水青', accent: '#4c8a85', soft: '#e8f3f1' },
};

export function shiftHabitMonth(month, offset = 1) {
  const [year, number] = month.split('-').map(Number);
  return new Date(Date.UTC(year, number - 1 + offset, 1)).toISOString().slice(0, 7);
}

export function habitSummary(habit, checkins, month, today = todaySG()) {
  const dates = new Set(checkins.filter((row) => row.habit_id === habit.id && row.check_date >= habit.start_date && row.check_date <= today).map((row) => row.check_date));
  const from = `${month}-01`, until = `${shiftHabitMonth(month)}-01`;
  const eligibleFrom = from > habit.start_date ? from : habit.start_date;
  const eligibleThrough = addDays(until, -1) < today ? addDays(until, -1) : today;
  const eligibleDays = Math.max(0, dayNumber(eligibleThrough) - dayNumber(eligibleFrom) + 1);
  const monthCount = [...dates].filter((date) => date >= from && date < until).length;
  let cursor = dates.has(today) ? today : addDays(today, -1), streak = 0;
  while (cursor >= habit.start_date && dates.has(cursor)) { ++streak; cursor = addDays(cursor, -1); }
  return { dates, monthCount, totalCount: dates.size, eligibleDays, completionRate: eligibleDays ? Math.round(monthCount / eligibleDays * 100) : 0, streak, todayChecked: dates.has(today) };
}

export function habitMonthGrid(month, startDate, dates = new Set(), today = todaySG()) {
  const first = `${month}-01`, gridStart = addDays(first, -weekday(first));
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index), inMonth = date.slice(0, 7) === month;
    return { date, day: Number(date.slice(8)), inMonth, checked: dates.has(date), eligible: inMonth && date >= startDate && date <= today, isToday: date === today };
  });
}
