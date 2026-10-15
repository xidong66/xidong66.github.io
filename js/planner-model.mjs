// Pure calendar logic. All wall-clock dates belong to Asia/Singapore, regardless
// of the device timezone. UTC here is only a container for date arithmetic.
export const CATEGORIES = {
  research: { label: '研究', color: '#587356' },
  course: { label: '课程', color: '#6386aa' },
  life: { label: '生活', color: '#bf8b52' },
  travel: { label: '旅行', color: '#4b8c8c' },
  date: { label: '约会', color: '#b97189' },
  homework: { label: '作业', color: '#b09045' },
  project: { label: '项目', color: '#7770a8' },
  meeting: { label: '会议', color: '#537e91' },
  other: { label: '其他', color: '#9987ad' },
};
export function dayNumber(date) { return Date.parse(`${date}T00:00:00Z`) / 86400000; }
export function dateFromDay(day) { return new Date(day * 86400000).toISOString().slice(0, 10); }
export function addDays(date, amount) { return dateFromDay(dayNumber(date) + amount); }
export function weekday(date) { return new Date(`${date}T00:00:00Z`).getUTCDay(); }
export function todaySG(now = new Date()) { return new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10); }
export function wallISO(date, time) { return `${date}T${(time || '00:00').slice(0, 5)}:00`; }
export function timeEnd(date, time, minutes) {
  return new Date(Date.parse(`${wallISO(date, time)}Z`) + minutes * 60000).toISOString().slice(0, 19);
}
export function occursOn(task, date) {
  if (date < task.start_date || (task.repeat_until && date > task.repeat_until)) return false;
  const diff = dayNumber(date) - dayNumber(task.start_date);
  const interval = task.repeat_interval || 1;
  switch (task.repeat) {
    case 'daily': return diff % interval === 0;
    case 'weekly': {
      const anchorMonday = dayNumber(task.start_date) - ((weekday(task.start_date) + 6) % 7);
      const week = Math.floor((dayNumber(date) - anchorMonday) / 7);
      return week % interval === 0 && (task.weekdays?.length ? task.weekdays : [weekday(task.start_date)]).includes(weekday(date));
    }
    case 'monthly': {
      const [y, m, d] = date.split('-').map(Number);
      const [sy, sm, sd] = task.start_date.split('-').map(Number);
      return d === sd && ((y - sy) * 12 + m - sm) % interval === 0;
    }
    default: return diff === 0;
  }
}
export function occurrence(task, originalDate, exception) {
  return {
    ...task, task_id: task.id, original_date: originalDate,
    date: exception?.override_date || originalDate,
    start_time: exception?.override_date ? exception.start_time : task.start_time,
    duration_minutes: exception?.duration_minutes ?? task.duration_minutes,
    title: exception?.title ?? task.title, notes: exception?.notes ?? task.notes,
    category: exception?.category ?? task.category, important: exception?.important ?? task.important,
    completed: exception?.completed || false, skipped: exception?.skipped || false,
    exception: exception || null, key: `${task.id}:${originalDate}`,
  };
}
export function expandTasks(tasks, exceptions, from, to) {
  const byTask = new Map();
  for (const ex of exceptions) {
    if (!byTask.has(ex.task_id)) byTask.set(ex.task_id, new Map());
    byTask.get(ex.task_id).set(ex.original_date, ex);
  }
  const result = [];
  for (const task of tasks) {
    const overrides = byTask.get(task.id) || new Map();
    // A one-off task remains the same task when rescheduled. Keep its single
    // completion record even when its original anchor date has changed.
    if (task.repeat === 'none') {
      const ex = overrides.get(task.start_date) || (overrides.size === 1 ? overrides.values().next().value : null);
      const item = occurrence(task, ex?.original_date || task.start_date, ex);
      item.date = ex?.override_date || task.start_date;
      if (!item.skipped && item.date >= from && item.date < to) result.push(item);
      continue;
    }
    const seen = new Set();
    const begin = Math.max(dayNumber(from), dayNumber(task.start_date));
    const end = Math.min(dayNumber(to), task.repeat_until ? dayNumber(addDays(task.repeat_until, 1)) : Infinity,
      task.repeat === 'none' ? dayNumber(task.start_date) + 1 : Infinity);
    for (let day = begin; day < end; day++) {
      const original = dateFromDay(day);
      if (!occursOn(task, original)) continue;
      seen.add(original);
      const item = occurrence(task, original, overrides.get(original));
      if (!item.skipped && item.date >= from && item.date < to) result.push(item);
    }
    // A moved occurrence can enter the range from outside its original dates.
    for (const [original, ex] of overrides) {
      if (seen.has(original) || !ex.override_date || !occursOn(task, original)) continue;
      const item = occurrence(task, original, ex);
      if (!item.skipped && item.date >= from && item.date < to) result.push(item);
    }
  }
  return result.sort((a, b) => a.date.localeCompare(b.date) || (a.start_time || '').localeCompare(b.start_time || '') || Number(b.important) - Number(a.important) || a.title.localeCompare(b.title));
}
export function repeatLabel(task) {
  if (task.repeat === 'none') return '';
  const unit = { daily: '天', weekly: '周', monthly: '月' }[task.repeat];
  return `每${task.repeat_interval > 1 ? task.repeat_interval : ''}${unit}`;
}
// The sidebar is a task list, not an expanded daily agenda. A series gets one
// actionable occurrence, while the calendar still renders every scheduled date.
export function buildTaskList(tasks, exceptions) {
  const byTask = new Map();
  for (const ex of exceptions) {
    if (!byTask.has(ex.task_id)) byTask.set(ex.task_id, []);
    byTask.get(ex.task_id).push(ex);
  }
  const compare = (a, b) => a.date.localeCompare(b.date) || (a.start_time || '').localeCompare(b.start_time || '') || Number(b.important) - Number(a.important) || a.title.localeCompare(b.title);
  const pending = [], completed = [];
  for (const task of tasks) {
    const records = byTask.get(task.id) || [];
    if (task.repeat === 'none') {
      const item = expandTasks([task], records, '2000-01-01', '2101-01-01')[0];
      if (item) (item.completed ? completed : pending).push(item);
      continue;
    }
    const overrides = new Map(records.map((ex) => [ex.original_date, ex]));
    let next = null, lastCompleted = null;
    for (const ex of records) {
      if (!occursOn(task, ex.original_date) || ex.skipped) continue;
      const item = occurrence(task, ex.original_date, ex);
      if (item.completed) {
        if (!lastCompleted || compare(item, lastCompleted) > 0) lastCompleted = item;
      } else if (ex.override_date && (!next || compare(item, next) < 0)) next = item;
    }
    // Stop at the first unmodified pending date. Do not materialize years of
    // future repeats, or hide tasks merely because their next date is far away.
    const end = dayNumber(task.repeat_until || '2100-12-31');
    for (let day = dayNumber(task.start_date); day <= end; day++) {
      const date = dateFromDay(day);
      if (!occursOn(task, date)) continue;
      const ex = overrides.get(date);
      if (ex?.skipped || ex?.completed || ex?.override_date) continue;
      const item = occurrence(task, date, ex);
      if (!next || compare(item, next) < 0) next = item;
      break;
    }
    if (next) pending.push(next);
    else if (lastCompleted) completed.push(lastCompleted);
  }
  return { pending: pending.sort(compare), completed: completed.sort((a, b) => compare(b, a)) };
}
export function calendarEvent(item) {
  const allDay = !item.start_time;
  return {
    id: item.key, title: `${item.completed ? '✓ ' : ''}${item.important ? '☆ ' : ''}${item.title}`,
    start: allDay ? item.date : wallISO(item.date, item.start_time),
    end: allDay ? addDays(item.date, 1) : timeEnd(item.date, item.start_time, item.duration_minutes),
    allDay, backgroundColor: CATEGORIES[item.category].color, borderColor: 'transparent',
    classNames: item.completed ? ['task-completed'] : [], extendedProps: { item },
  };
}
