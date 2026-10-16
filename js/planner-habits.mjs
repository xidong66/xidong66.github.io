import { HABIT_COLORS, habitSummary, habitMonthGrid, shiftHabitMonth } from './planner-habits-model.mjs?v=20261016-habits';
import { todaySG } from './planner-model.mjs?v=20261016-colors';
const $ = (id) => document.getElementById(id);
const node = (tag, cls, text) => { const n = document.createElement(tag); n.className = cls; if (text !== undefined) n.textContent = text; return n; };
const button = (text, cls, handler) => { const n = node('button', cls, text); n.type = 'button'; n.addEventListener('click', handler); return n; };

export function setupHabits({ client, getUser, canEdit, mutate, checkedWrite, allRows, toast }) {
  let rows = [], checkins = [], month = todaySG().slice(0, 7), search = '', notice = '';
  let available = false, busy = false, edit = null;
  const dialog = $('habit-dialog');
  const guard = () => { if (!canEdit()) return false; if (!available) { toast('打卡数据尚未加载，请刷新后重试。'); return false; } return true; };
  const formOptions = { dialog: true, dialogId: 'habit-dialog', errorTarget: 'habit-error' };

  function controls() {
    $('habits-month').value = month;
    $('habits-month').max = todaySG().slice(0, 7);
    $('habits-month').disabled = busy;
    $('habits-previous').disabled = busy || month <= '2000-01';
    $('habits-next').disabled = busy || month >= todaySG().slice(0, 7);
    $('habits-current').disabled = busy;
  }
  function stat(label, value, unit, cls, hint = '') {
    const tile = node('div', `habit-stat ${cls}`);
    tile.append(node('span', 'habit-stat-label', label));
    const number = node('span', 'habit-stat-number'); number.append(node('strong', '', value), node('span', '', unit)); tile.append(number);
    if (hint) tile.title = hint;
    return tile;
  }
  function render() {
    controls();
    $('habits-notice').textContent = notice || (!available ? '正在加载习惯与打卡记录…' : '');
    $('habits-notice').hidden = available && !notice;
    const list = $('habits-list'); list.replaceChildren();
    const today = todaySG();
    const grouped = new Map();
    for (const record of checkins) { if (!grouped.has(record.habit_id)) grouped.set(record.habit_id, []); grouped.get(record.habit_id).push(record); }
    const summaries = new Map(rows.map((habit) => [habit.id, habitSummary(habit, grouped.get(habit.id) || [], month, today)]));
    $('habits-today-count').textContent = available ? `今日 ${rows.filter((r) => summaries.get(r.id).todayChecked).length} / ${rows.length} 完成` : '';
    if (!available) return;
    const visible = rows.filter((r) => `${r.title} ${r.notes}`.toLocaleLowerCase().includes(search))
      .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
    if (!visible.length) {
      const empty = node('div', 'habits-empty');
      empty.append(node('span', 'habits-empty-symbol', '✓'), node('h3', '', search ? '没有匹配的习惯' : '从一个小习惯开始。'), node('p', '', search ? '换个关键词试试。' : '阅读、运动、背单词……每天留下一点进步。'));
      if (!search) empty.append(button('＋ 新建习惯', 'primary', () => open()));
      list.append(empty); return;
    }
    for (const habit of visible) {
      const summary = summaries.get(habit.id), color = HABIT_COLORS[habit.color] || HABIT_COLORS.sage;
      const card = node('article', 'habit-card'); card.dataset.habitId = habit.id;
      card.style.setProperty('--habit-accent', color.accent); card.style.setProperty('--habit-soft', color.soft);
      const heading = node('div', 'habit-card-heading'), copy = node('div', 'habit-card-copy');
      copy.append(node('h3', '', habit.title));
      const note = node('p', '', habit.notes || `每天一次 · ${habit.start_date} 开始`); copy.append(note);
      const editButton = button('编辑', 'quiet habit-edit', () => open(habit)); editButton.setAttribute('aria-label', `编辑习惯：${habit.title}`);
      heading.append(copy, editButton); card.append(heading);
      const todayButton = button(summary.todayChecked ? '✓ 今天已打卡' : '＋ 今天打卡', `habit-today${summary.todayChecked ? ' checked' : ''}`, () => toggle(habit, today));
      todayButton.setAttribute('aria-pressed', String(summary.todayChecked)); todayButton.setAttribute('aria-label', `${habit.title}：${summary.todayChecked ? '取消今天打卡' : '今天打卡'}`);
      card.append(todayButton);
      const stats = node('div', 'habit-stats');
      stats.append(stat('本月打卡', String(summary.monthCount), '天', 'month'), stat('累计打卡', String(summary.totalCount), '天', 'total'),
        stat('月完成率', String(summary.completionRate), '%', 'rate', `本月已到日期共 ${summary.eligibleDays} 天，从习惯开始日算起，未来日期不计入。`),
        stat('当前连续', String(summary.streak), '天', 'streak', '从今天或昨天往前连续打卡的天数；今天尚未打卡时不会提前中断。'));
      card.append(stats);
      const calendar = node('div', 'habit-calendar'); calendar.setAttribute('role', 'group'); calendar.setAttribute('aria-label', `${habit.title}，${month} 打卡月历`);
      const [year, number] = month.split('-'); calendar.append(node('div', 'habit-month-caption', `${year}年${Number(number)}月`));
      const grid = node('div', 'habit-calendar-grid');
      for (const day of ['日', '一', '二', '三', '四', '五', '六']) grid.append(node('span', 'habit-weekday', day));
      for (const day of habitMonthGrid(month, habit.start_date, summary.dates, today)) {
        const cell = button('', `habit-day${day.checked ? ' checked' : ''}${day.isToday ? ' today' : ''}${day.inMonth ? '' : ' outside'}`, () => toggle(habit, day.date));
        cell.dataset.date = day.date; cell.disabled = busy || !day.eligible;
        cell.setAttribute('aria-pressed', String(day.checked));
        const state = day.checked ? '已打卡，点击取消' : day.date > today ? '未来日期，不能打卡' : day.date < habit.start_date ? '早于开始日' : day.inMonth ? '未打卡，点击补打卡' : '不在当前月份';
        cell.setAttribute('aria-label', `${habit.title}，${day.date}，${state}`); cell.title = `${day.date} · ${state}`;
        cell.append(node('span', 'habit-day-number', String(day.day)), node('span', 'habit-day-circle', day.checked ? '✓' : ''));
        grid.append(cell);
      }
      calendar.append(grid); card.append(calendar); list.append(card);
    }
    if (busy) list.querySelectorAll('button').forEach((b) => { b.disabled = true; });
  }

  async function toggle(habit, date) {
    if (!guard() || date > todaySG() || date < habit.start_date) return;
    const record = checkins.find((r) => r.habit_id === habit.id && r.check_date === date);
    await mutate(() => checkedWrite(record
      ? client.from('planner_habit_checkins').delete().eq('id', record.id).eq('created_at', record.created_at)
      : client.from('planner_habit_checkins').insert({ user_id: getUser().id, habit_id: habit.id, check_date: date })),
    record ? '已取消这天的打卡' : date === todaySG() ? '今天也坚持了，打卡成功' : '已补上这天的打卡');
  }
  function open(habit = null) {
    if (!guard()) return;
    edit = habit ? { ...habit } : null;
    $('habit-form').reset(); $('habit-error').textContent = '';
    $('habit-dialog-title').textContent = habit ? '编辑习惯' : '新建习惯';
    $('habit-title').value = habit?.title || '';
    $('habit-start').value = habit?.start_date || todaySG(); $('habit-start').max = todaySG();
    $('habit-color').value = habit?.color || 'sage'; $('habit-notes').value = habit?.notes || '';
    $('habit-delete').hidden = !habit;
    previewColor(); dialog.showModal(); $('habit-title').focus();
  }
  function previewColor() {
    const color = HABIT_COLORS[$('habit-color').value];
    $('habit-color').style.backgroundColor = color.soft; $('habit-color').style.color = color.accent;
  }
  for (const [value, info] of Object.entries(HABIT_COLORS)) {
    const choice = node('option', '', info.label); choice.value = value; $('habit-color').append(choice);
  }
  $('habit-color').addEventListener('change', previewColor);
  $('habit-form').addEventListener('submit', async (event) => {
    event.preventDefault(); if (!guard()) return;
    const changes = { title: $('habit-title').value.trim(), color: $('habit-color').value, start_date: $('habit-start').value, notes: $('habit-notes').value.trim() };
    if (!changes.title) { $('habit-error').textContent = '请填写习惯名称。'; return; }
    if (!changes.start_date || changes.start_date > todaySG() || changes.start_date < '2000-01-01') { $('habit-error').textContent = '开始日期应在 2000 年至今天之间。'; return; }
    if (edit && checkins.some((r) => r.habit_id === edit.id && r.check_date < changes.start_date)) { $('habit-error').textContent = '开始日期不能晚于已有的打卡记录；可以保持原日期或提前。'; return; }
    await mutate(() => checkedWrite(edit
      ? client.from('planner_habits').update(changes).eq('id', edit.id).eq('updated_at', edit.updated_at)
      : client.from('planner_habits').insert({ ...changes, user_id: getUser().id })), '习惯已保存', formOptions);
  });
  $('habit-delete').addEventListener('click', async () => {
    if (!guard() || !edit || !confirm(`确定删除习惯“${edit.title}”和它的全部打卡记录？`)) return;
    await mutate(() => checkedWrite(client.from('planner_habits').delete().eq('id', edit.id).eq('updated_at', edit.updated_at)), '习惯和打卡记录已删除', formOptions);
  });
  const close = () => { if (!busy) dialog.close(); };
  $('habit-close').addEventListener('click', close); $('habit-cancel').addEventListener('click', close);
  dialog.addEventListener('cancel', (event) => { if (busy) event.preventDefault(); });
  function changeMonth(value) {
    if (!/^\d{4}-\d{2}$/.test(value) || value < '2000-01' || value > todaySG().slice(0, 7)) { controls(); return; }
    month = value; render();
  }
  $('habits-month').addEventListener('change', () => changeMonth($('habits-month').value));
  $('habits-previous').addEventListener('click', () => changeMonth(shiftHabitMonth(month, -1)));
  $('habits-next').addEventListener('click', () => changeMonth(shiftHabitMonth(month)));
  $('habits-current').addEventListener('click', () => changeMonth(todaySG().slice(0, 7)));
  return {
    open,
    search(value) { search = value; render(); },
    async fetch(userId) {
      const [habits, checks] = await Promise.all([allRows('planner_habits', userId), allRows('planner_habit_checkins', userId)]);
      return { habits, checks };
    },
    apply(result) {
      if (result.status === 'fulfilled') { rows = result.value.habits; checkins = result.value.checks; available = true; notice = ''; }
      else {
        const missing = ['PGRST205', '42P01', '42501'].includes(result.reason?.code);
        notice = missing ? '习惯打卡尚未启用，请联系站主完成配置。' : '打卡同步失败，当前显示上次加载的记录，请刷新重试。';
        if (missing) { rows = []; checkins = []; available = false; }
      }
      render();
    },
    async backup(userId) { return this.fetch(userId); },
    reset() {
      rows = []; checkins = []; available = false; notice = ''; edit = null; search = ''; month = todaySG().slice(0, 7);
      dialog.close(); $('habit-form').reset(); $('habit-error').textContent = ''; render();
    },
    busy(value) {
      busy = value;
      for (const id of ['habit-save', 'habit-delete', 'habit-close', 'habit-cancel']) $(id).disabled = value;
      render();
    },
  };
}
