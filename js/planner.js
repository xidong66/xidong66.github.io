import { plannerConfig } from './planner-config.js';
import { loginErrorMessage, checkLoginConnection, authFetchWithTimeout } from './planner-auth.mjs?v=20261016-login-check';
import { CATEGORIES, addDays, todaySG, weekday, expandTasks, calendarEvent, repeatLabel, buildTaskList } from './planner-model.mjs?v=20261018-pending-first';
import { setupAnniversaries } from './planner-anniversaries.mjs?v=20261016-mail';
import { setupLedger } from './planner-ledger.mjs?v=20261016-ledger';
import { setupHabits } from './planner-habits.mjs?v=20261016-habits';
import { setupWeight } from './planner-weight.mjs?v=20261018-weight';
import { setupBloodPressure } from './planner-bp.mjs?v=20261018-bp';

const $ = (id) => document.getElementById(id);
const state = { user: null, tasks: [], exceptions: [], calendar: null, channel: null, busy: false, loaded: false, loading: false, epoch: 0, edit: null, search: '', showCompleted: false };
let client;
let anniversaries;
let ledger;
let habits;
let weight;
let bp;
let activeHealthMetric = 'weight';
let activeWorkspace = 'schedule';
let pollTimer;
let reloadTimer;
let toastTimer;
let calendarSizeFrame;
const dtFormat = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Singapore', month: 'long', day: 'numeric', weekday: 'long' });

function toast(message) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3500);
}
function syncStatus(message, error = false) {
  $('sync-status').textContent = message;
  $('sync-status').dataset.state = error ? 'error' : 'ok';
}
function errorMessage(error) {
  if (error?.code === '23514' && /bp_|blood_pressure/.test(error.message || '')) return '请核对血压、心率和测量时间；高压应大于低压，时间不能晚于现在。';
  if (error?.code === '23514' && /weight/.test(error.message || '')) return '请检查体重和日期，测量日期不能晚于今天。';
  if (error?.message === 'habit_unavailable') return '这个习惯已在另一台设备删除或修改，请刷新后重试。';
  if (error?.message === 'habit_start_after_checkins') return '开始日期不能晚于已有的打卡记录，请保持原日期或提前。';
  if (error?.code === '23514' && /habit/.test(error.message || '')) return '请检查日期，打卡应在习惯开始日至今天之间。';
  if (error?.code === '23503' && /ledger/.test(error.message || '')) return '账户已有流水或固定收支，不能删除或更换币种；请检查所选账户的币种。';
  if (error?.code === '23514' && /ledger/.test(error.message || '')) return '请检查金额、日期和固定收支的起止月份，记账日期不能晚于今天。';
  if (error?.code === 'PGRST205' || error?.code === '42501' || error?.code === '42P01') return '日历尚未初始化，请联系站主完成配置。';
  if (error?.message === 'conflict' || error?.code === '23505') return '这条记录已在另一台设备修改，请关闭弹窗并重新打开。';
  if (error?.code === '23514' && /category/.test(error.message || '')) return '新分类尚未启用，请联系站主完成更新。';
  if (error?.code === 'invalid_credentials') return '邮箱或密码不正确，请使用计划网站的登录账号。';
  if (error?.code === 'email_not_confirmed') return '账号邮箱尚未确认，请联系站主完成账号设置。';
  if (error?.status === 429 || error?.code === 'over_request_rate_limit') return '操作太频繁，请稍后再试。';
  if (error?.status === 401 || error?.code === 'PGRST301') return '登录已过期，请退出后重新登录。';
  return navigator.onLine ? '连接暂时失败，修改未保存。请稍后重试。' : '当前离线，修改未保存。请联网后重试。';
}
function setError(message = '') { $('workspace-error').textContent = message; $('workspace-error').hidden = !message; scheduleCalendarSize(); }
function canEdit() {
  if (!state.user || !state.loaded) { toast('请等待任务加载完成后再操作。'); return false; }
  if (state.busy) return false;
  if (!navigator.onLine) { toast('当前离线，请联网后再修改。'); return false; }
  return true;
}
function setBusy(value) {
  state.busy = value;
  anniversaries?.busy(value);
  ledger?.busy(value);
  habits?.busy(value);
  weight?.busy(value);
  bp?.busy(value);
  for (const id of ['save-task', 'delete-task', 'toggle-completion', 'confirm-delete', 'cancel-delete', 'close-delete', 'add-task', 'agenda-add', 'sign-out', 'refresh']) $(id).disabled = value;
  document.querySelectorAll('.task-check').forEach((button) => { button.disabled = value; });
  // Prevent closing a form midway through a write, including the Escape key.
  $('close-dialog').disabled = value;
  $('cancel-task').disabled = value;
}
function matches(item) { return `${item.title} ${item.notes}`.toLocaleLowerCase().includes(state.search); }

async function allRows(table, userId, configure = (query) => query) {
  const rows = [];
  for (let start = 0; ; start += 500) {
    let query = client.from(table).select('*').eq('user_id', userId);
    query = configure(query);
    query = table === 'planner_occurrences' ? query.order('task_id').order('original_date') : query.order('id');
    const { data, error } = await query.range(start, start + 499);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}
async function loadData({ force = false } = {}) {
  if (!state.user || (state.loading && !force)) return;
  const token = ++state.epoch;
  const userId = state.user.id;
  state.loading = true;
  syncStatus('正在同步…');
  try {
    // An unconfigured anniversary table must not prevent existing tasks loading.
    const [taskResult, exceptionResult, daysResult, mailResult, ledgerResult, habitsResult, weightResult, bpResult] = await Promise.allSettled([
      allRows('planner_tasks', userId), allRows('planner_occurrences', userId), allRows('planner_anniversaries', userId),
      client.rpc('planner_mail_status').then(({ data, error }) => { if (error) throw error; return data; }),
      ledger.fetch(userId),
      habits.fetch(userId),
      weight.fetch(userId),
      bp.fetch(userId),
    ]);
    if (token !== state.epoch || state.user?.id !== userId) return;
    if (taskResult.status === 'rejected') throw taskResult.reason;
    if (exceptionResult.status === 'rejected') throw exceptionResult.reason;
    state.tasks = taskResult.value;
    state.exceptions = exceptionResult.value;
    anniversaries.apply(daysResult, mailResult);
    ledger.apply(ledgerResult);
    habits.apply(habitsResult);
    weight.apply(weightResult);
    bp.apply(bpResult);
    state.loaded = true;
    setError();
    render();
    const time = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date());
    const incomplete = [daysResult.status !== 'fulfilled' ? '纪念日' : '', ledgerResult.status !== 'fulfilled' ? '记账' : '', habitsResult.status !== 'fulfilled' ? '打卡' : '', weightResult.status !== 'fulfilled' ? '体重' : '', bpResult.status !== 'fulfilled' ? '血压' : ''].filter(Boolean);
    syncStatus(`${incomplete.length ? `日程已同步 · ${incomplete.join('、')}未同步` : '已同步'} · ${time}`, !!incomplete.length);
  } catch (error) {
    if (token !== state.epoch) return;
    syncStatus(state.loaded ? '同步失败，当前显示上次加载的数据' : '尚未连接到任务数据', true);
    setError(errorMessage(error));
  } finally {
    if (token === state.epoch) state.loading = false;
  }
}
function queueReload() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => { if (state.busy) queueReload(); else loadData(); }, 350);
}

function scheduleCalendarSize() {
  cancelAnimationFrame(calendarSizeFrame);
  calendarSizeFrame = requestAnimationFrame(() => {
    const calendar = state.calendar;
    const element = $('calendar');
    if (!calendar || !element.getClientRects().length) return;
    const mobile = matchMedia('(max-width:760px)').matches;
    const footer = document.querySelector('.calendar-footer').getBoundingClientRect().height;
    const top = element.getBoundingClientRect().top + scrollY;
    const available = Math.floor(innerHeight - top - footer - 16);
    const header = element.querySelector('.fc-col-header')?.getBoundingClientRect().height || 36;
    const weeks = Math.round((calendar.view.activeEnd - calendar.view.activeStart) / (7 * 86400000));
    const minimum = calendar.view.type === 'dayGridMonth' ? weeks * (mobile ? 82 : 114) + header + 3 : mobile ? 440 : 520;
    const height = Math.max(minimum, available);
    if (calendar.getOption('height') !== height) calendar.setOption('height', height);
    // Keep the agenda in the same vertical space; only its list scrolls.
    document.querySelector('.planner-layout').style.setProperty('--planner-panel-height', `${Math.ceil(element.parentElement.getBoundingClientRect().height)}px`);
  });
}

function setupCalendar() {
  if (state.calendar) return;
  state.calendar = new FullCalendar.Calendar($('calendar'), {
    initialView: 'dayGridMonth', initialDate: todaySG(), firstDay: 0,
    // UTC coercion treats the app's Singapore wall time consistently, without
    // importing the device's timezone or requiring a named-zone plugin.
    timeZone: 'UTC', locale: 'zh-cn', headerToolbar: false,
    buttonText: { today: '今天', month: '月', week: '周', day: '日' },
    allDayText: '全天', noEventsText: '没有任务', moreLinkText: (n) => `还有 ${n} 项`,
    dayHeaderContent: (arg) => ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][arg.date.getUTCDay()],
    dayCellContent: (arg) => arg.dayNumberText.replace(/日$/, ''),
    height: 680, expandRows: true,
    fixedWeekCount: false, dayMaxEvents: true, eventDisplay: 'block', displayEventEnd: false,
    // Keep pending tasks above completed ones, including when rows overflow.
    eventOrder: 'completionOrder,start,-duration,allDay,title', eventOrderStrict: true,
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    slotMinTime: '06:00:00', slotMaxTime: '24:00:00', scrollTime: '08:00:00',
    now: () => new Date(new Date().getTime() + 8 * 3600000).toISOString().slice(0, 19), nowIndicator: true,
    selectable: true, selectMirror: true, editable: true, eventDurationEditable: true,
    allDayMaintainDuration: false, defaultTimedEventDuration: '01:00',
    longPressDelay: 450, selectLongPressDelay: 450,
    events(info, success) {
      const from = addDays(info.startStr.slice(0, 10), -1);
      const to = info.endStr.slice(0, 10);
      success(expandTasks(state.tasks, state.exceptions, from, to).filter(matches).map(calendarEvent));
    },
    datesSet() { if (state.calendar) { updateCalendarChrome(); scheduleCalendarSize(); } },
    select(info) {
      state.calendar.unselect();
      if (canEdit()) openNew(info.startStr.slice(0, 10), info.allDay ? null : info.startStr.slice(11, 16), info.allDay ? 60 : Math.min(1440, Math.max(5, (info.end - info.start) / 60000)));
    },
    eventClick(info) { if (canEdit()) openEdit(info.event.extendedProps.item); },
    eventDidMount(info) {
      const item = info.event.extendedProps.item;
      info.el.title = `${item.title}${repeatLabel(item) ? ` · ${repeatLabel(item)}` : ''}${item.notes ? `\n${item.notes}` : ''}`;
    },
    eventDrop: moveCalendarEvent, eventResize: moveCalendarEvent,
    windowResize: scheduleCalendarSize,
  });
  state.calendar.render();
}
function render() {
  $('today-caption').textContent = dtFormat.format(new Date());
  if (state.calendar) { state.calendar.refetchEvents(); updateCalendarChrome(); scheduleCalendarSize(); }
  renderAgenda();
  anniversaries?.search(state.search);
  ledger?.search(state.search);
  habits?.search(state.search);
  weight?.search(state.search);
  bp?.search(state.search);
}
function updateCalendarChrome() {
  $('calendar-title').textContent = state.calendar.view.title;
  document.querySelectorAll('[data-view]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.view === state.calendar.view.type)));
}
function renderAgenda() {
  const list = $('agenda-list');
  list.replaceChildren();
  if (!state.loaded) { list.textContent = '正在加载日程…'; return; }
  const tasks = buildTaskList(state.tasks, state.exceptions);
  const pending = tasks.pending.filter(matches);
  const completed = state.showCompleted ? tasks.completed.filter(matches) : [];
  $('agenda-count').textContent = pending.length;
  for (const item of pending) list.append(taskCard(item));
  if (completed.length) {
    const section = document.createElement('div'); section.className = 'agenda-group';
    const heading = document.createElement('h3'); heading.textContent = '已完成';
    const total = document.createElement('span'); total.textContent = completed.length; heading.append(total); section.append(heading);
    for (const item of completed) section.append(taskCard(item));
    list.append(section);
  }
  if (!pending.length && !completed.length) {
    const empty = document.createElement('div'); empty.className = 'empty-state';
    const symbol = document.createElement('span'); symbol.className = 'empty-symbol'; symbol.textContent = '✓';
    const text = document.createElement('div'); text.textContent = state.search ? '没有匹配的任务' : '没有待办，添加一个新计划吧。';
    empty.append(symbol, text); list.append(empty);
  }
}
function taskCard(item) {
  const card = document.createElement('div'); card.className = `task-card${item.completed ? ' done' : ''}`;
  const category = CATEGORIES[item.category] || CATEGORIES.other;
  card.style.setProperty('--category-accent', category.textColor);
  card.title = category.label;
  card.dataset.taskId = item.task_id;
  card.dataset.occurrenceDate = item.original_date;
  const check = document.createElement('button'); check.type = 'button'; check.className = 'task-check'; check.textContent = item.completed ? '✓' : '';
  check.setAttribute('aria-label', `${item.completed ? '恢复未完成' : '完成任务'}：${item.title}`); check.setAttribute('aria-pressed', String(item.completed)); check.disabled = state.busy;
  check.addEventListener('click', () => mutate(() => saveException(item, { completed: !item.completed }), item.completed ? '已恢复待办' : item.repeat === 'none' ? '任务已完成' : '本次任务已完成'));
  const copy = document.createElement('button'); copy.type = 'button'; copy.className = 'task-copy'; copy.setAttribute('aria-label', `编辑：${item.title}`);
  const title = document.createElement('span'); title.className = 'task-name'; title.textContent = item.title;
  const meta = document.createElement('span'); meta.className = 'task-meta';
  const due = document.createElement('span'); due.className = 'task-due';
  const today = todaySG();
  const [year, month, day] = item.date.split('-').map(Number);
  const dateLabel = item.date === today ? '今天' : item.date === addDays(today, 1) ? '明天' : `${year !== Number(today.slice(0, 4)) ? `${year}年` : ''}${month}月${day}日，${['周日', '周一', '周二', '周三', '周四', '周五', '周六'][weekday(item.date)]}`;
  due.textContent = `${dateLabel}${item.start_time ? ` ${item.start_time.slice(0, 5)}` : ''}`;
  if (!item.completed) due.classList.add(item.date < today ? 'is-overdue' : item.date === today ? 'is-today' : 'is-future');
  meta.append(taskIcon('calendar'), due);
  if (item.repeat !== 'none') {
    const repeat = taskIcon('repeat'); repeat.classList.add('task-repeat');
    repeat.setAttribute('role', 'img'); repeat.removeAttribute('aria-hidden'); repeat.setAttribute('aria-label', `循环任务：${repeatLabel(item)}`);
    const tooltip = document.createElementNS('http://www.w3.org/2000/svg', 'title'); tooltip.textContent = `${repeatLabel(item)}${item.repeat_until ? `，至 ${item.repeat_until}` : ''}`; repeat.prepend(tooltip);
    meta.append(repeat);
  }
  copy.append(title, meta); copy.addEventListener('click', () => { if (canEdit()) openEdit(item); }); card.append(check, copy);
  if (item.important) { const star = document.createElement('span'); star.className = 'task-star'; star.textContent = '☆'; star.setAttribute('aria-label', '重要'); card.append(star); }
  return card;
}
function taskIcon(name) {
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 16 16'); icon.setAttribute('aria-hidden', 'true'); icon.classList.add('task-meta-icon');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', name === 'repeat'
    ? 'M13 6A5.2 5.2 0 0 0 4 3.6L2 5.5M2 2.5v3h3M3 10a5.2 5.2 0 0 0 9 2.4l2-1.9M14 13.5v-3h-3'
    : 'M5 1.75v3M11 1.75v3M2.25 6h11.5M3.75 3.25h8.5a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-8.5a1.5 1.5 0 0 1-1.5-1.5v-8a1.5 1.5 0 0 1 1.5-1.5Z');
  icon.append(path); return icon;
}

function fillForm(task, date) {
  $('task-title').value = task.title || '';
  $('task-date').value = date;
  $('task-category').value = task.category || 'research';
  updateCategoryColor();
  $('task-all-day').checked = !task.start_time;
  $('task-time').value = task.start_time?.slice(0, 5) || '09:00';
  $('task-duration').value = task.duration_minutes || 60;
  $('task-important').checked = !!task.important;
  $('task-repeat').value = task.repeat || 'none';
  $('task-interval').value = task.repeat_interval || 1;
  $('task-until').value = task.repeat_until || '';
  $('task-notes').value = task.notes || '';
  const days = task.weekdays?.length ? task.weekdays : [weekday(date)];
  document.querySelectorAll('#weekdays input').forEach((input) => { input.checked = days.includes(Number(input.value)); });
  updateFormVisibility();
}
function updateCategoryColor() {
  const category = CATEGORIES[$('task-category').value] || CATEGORIES.other;
  $('task-category').style.backgroundColor = category.color;
  $('task-category').style.color = category.textColor;
  $('task-category').style.borderInlineStart = `4px solid ${category.textColor}`;
}
function openNew(date = todaySG(), time = null, duration = 60) {
  state.edit = null;
  state.editConflict = false;
  $('task-form').reset();
  $('task-error').textContent = '';
  $('task-dialog-title').textContent = '新建任务';
  $('edit-scope-wrap').hidden = true;
  $('delete-task').hidden = true;
  fillForm({ start_time: time, duration_minutes: duration }, date);
  $('task-dialog').showModal();
  $('task-title').focus();
}
function openEdit(item) {
  state.editConflict = false;
  state.edit = { item, task: state.tasks.find((task) => task.id === item.task_id) };
  $('task-error').textContent = '';
  $('task-dialog-title').textContent = '编辑任务';
  $('delete-task').hidden = false;
  $('edit-scope-wrap').hidden = state.edit.task.repeat === 'none';
  $('edit-scope').value = state.edit.task.repeat === 'none' ? 'series' : 'occurrence';
  fillForm(item, item.date);
  $('task-dialog').showModal();
}
function isSingleEdit() { return state.edit && state.edit.task.repeat !== 'none' && $('edit-scope').value === 'occurrence'; }
function updateFormVisibility() {
  const timed = !$('task-all-day').checked;
  $('time-fields').hidden = !timed;
  $('task-time').required = timed;
  $('task-duration').required = timed;
  $('task-time').disabled = !timed;
  $('task-duration').disabled = !timed;
  const single = isSingleEdit();
  $('task-completion-row').hidden = !state.edit || (state.edit.task.repeat !== 'none' && !single);
  if (state.edit) {
    $('task-completion-date').textContent = `${state.edit.item.date} 这一次`;
    $('toggle-completion').textContent = state.edit.item.completed ? '恢复为未完成' : '标记为完成';
  }
  $('repeat-fields').hidden = single;
  const repeating = $('task-repeat').value !== 'none';
  $('repeat-interval-wrap').hidden = !repeating;
  $('task-interval').disabled = !repeating || single;
  $('task-until').disabled = !repeating || single;
  $('repeat-until-wrap').hidden = !repeating;
  $('weekdays').hidden = $('task-repeat').value !== 'weekly';
}
function closeDialog() { if (!state.busy) $('task-dialog').close(); }
async function toggleEditCompletion() {
  if (!canEdit() || !state.edit) return;
  if (state.editConflict) { $('task-error').textContent = '请关闭弹窗并重新打开后再操作。'; return; }
  const item = state.edit.item;
  await mutate(() => saveException(item, { completed: !item.completed }), item.completed ? '已恢复待办' : '本次任务已完成', { dialog: true });
}
async function mutate(operation, message, { dialog = false, dialogId = 'task-dialog', errorTarget = 'task-error' } = {}) {
  if (!canEdit()) return false;
  setBusy(true);
  ++state.epoch;
  state.loading = false;
  if (dialog) $(errorTarget).textContent = '';
  syncStatus('正在保存…');
  try {
    await operation();
    // Force refresh invalidates any older poll that started before this write.
    await loadData({ force: true });
    if (dialog) $(dialogId).close();
    toast(message);
    return true;
  } catch (error) {
    const message = errorMessage(error);
    if (dialog) $(errorTarget).textContent = message; else setError(message);
    syncStatus('修改未保存，请重试', true);
    if (error?.message === 'conflict' || error?.code === '23505') {
      // Preserve the open form, but reload the underlying snapshot. The user
      // must reopen it before retrying to avoid overwriting a concurrent edit.
      if (dialog) state.editConflict = true;
      await loadData({ force: true });
    }
    return false;
  } finally { setBusy(false); }
}
async function checkedWrite(query) {
  const { data, error } = await query.select();
  if (error) throw error;
  if (!data?.length) throw new Error('conflict');
  return data[0];
}
async function saveException(item, changes) {
  // A conditional update prevents edits or completion toggles from silently
  // replacing changes saved on another device. Initial inserts use a unique PK.
  if (item.exception) return checkedWrite(client.from('planner_occurrences').update(changes).eq('task_id', item.task_id).eq('original_date', item.original_date).eq('updated_at', item.exception.updated_at));
  return checkedWrite(client.from('planner_occurrences').insert({ task_id: item.task_id, user_id: state.user.id, original_date: item.original_date, ...changes }));
}
async function submitTask(event) {
  event.preventDefault();
  if (!canEdit()) return;
  if (state.editConflict) { $('task-error').textContent = '任务已在其他设备修改，请关闭弹窗并重新打开。'; return; }
  const weekdays = [...document.querySelectorAll('#weekdays input:checked')].map((i) => Number(i.value));
  const repeat = $('task-repeat').value;
  if (!isSingleEdit() && repeat === 'weekly' && !weekdays.length) { $('task-error').textContent = '请选择至少一个重复的星期。'; return; }
  if (!isSingleEdit() && repeat !== 'none' && $('task-until').value && $('task-until').value < $('task-date').value) { $('task-error').textContent = '重复结束日期不能早于开始日期。'; return; }
  const title = $('task-title').value.trim();
  if (!title) { $('task-error').textContent = '请填写任务名称。'; return; }
  const common = { title, notes: $('task-notes').value.trim(), category: $('task-category').value, important: $('task-important').checked,
    start_time: $('task-all-day').checked ? null : $('task-time').value, duration_minutes: $('task-all-day').checked ? 60 : Number($('task-duration').value) };
  await mutate(async () => {
    if (isSingleEdit()) return saveException(state.edit.item, { ...common, override_date: $('task-date').value });
    const row = { ...common, start_date: $('task-date').value, repeat, repeat_interval: repeat === 'none' ? 1 : Number($('task-interval').value), weekdays: repeat === 'weekly' ? weekdays : [], repeat_until: repeat === 'none' ? null : ($('task-until').value || null) };
    if (state.edit) return checkedWrite(client.from('planner_tasks').update(row).eq('id', state.edit.task.id).eq('updated_at', state.edit.task.updated_at));
    return checkedWrite(client.from('planner_tasks').insert({ ...row, user_id: state.user.id }));
  }, '任务已保存到云端', { dialog: true });
}
async function deleteTask() {
  if (!canEdit() || !state.edit) return;
  if (state.editConflict) { $('task-error').textContent = '请关闭弹窗并重新打开后再操作。'; return; }
  if (state.edit.task.repeat !== 'none') {
    // Deletion has its own explicit scope; changing an editing dropdown must
    // never be required to discover or choose series deletion.
    $('delete-form').reset();
    $('delete-error').textContent = '';
    $('delete-task-name').textContent = state.edit.item.title;
    $('delete-occurrence-description').textContent = `仅删除 ${state.edit.item.date} 这一次，其他日期会保留。`;
    updateDeleteLabel();
    $('delete-dialog').showModal();
    return;
  }
  if (!confirm('确定删除这条任务？')) return;
  await mutate(() => checkedWrite(client.from('planner_tasks').delete().eq('id', state.edit.task.id).eq('updated_at', state.edit.task.updated_at)), '任务已删除', { dialog: true });
}
function updateDeleteLabel() {
  const series = document.querySelector('input[name="delete-scope"]:checked').value === 'series';
  $('confirm-delete').textContent = series ? '删除整个系列' : '删除这一次';
}
function closeDeleteDialog() { if (!state.busy) $('delete-dialog').close(); }
async function confirmRecurringDelete(event) {
  event.preventDefault();
  if (!canEdit() || !state.edit) return;
  if (state.editConflict) { $('delete-error').textContent = '任务已在其他设备修改，请关闭两个弹窗并重新打开。'; return; }
  const series = document.querySelector('input[name="delete-scope"]:checked').value === 'series';
  const saved = await mutate(() => series
    ? checkedWrite(client.from('planner_tasks').delete().eq('id', state.edit.task.id).eq('updated_at', state.edit.task.updated_at))
    : saveException(state.edit.item, { skipped: true }), series ? '整个系列已删除' : '已删除这一次任务', { dialog: true, errorTarget: 'delete-error' });
  if (saved) $('delete-dialog').close();
}
async function moveCalendarEvent(info) {
  const item = info.event.extendedProps.item;
  const date = info.event.startStr.slice(0, 10);
  const time = info.event.allDay ? null : info.event.startStr.slice(11, 16);
  // Dropping an all-day event onto the time axis can leave end unset. Match
  // FullCalendar's one-hour default rather than subtracting null from start.
  const duration = info.event.allDay || !info.event.end ? 60 : Math.round((info.event.end - info.event.start) / 60000);
  info.revert();
  if (!canEdit()) return;
  if (date < '2000-01-01' || date > '2100-12-31' || duration < 5 || duration > 1440) { toast('请选择有效日期，单次任务最长为 24 小时。'); return; }
  if (item.repeat !== 'none' && !confirm('只调整这一次任务的时间？其他重复日期会保留。')) return;
  await mutate(() => item.repeat === 'none'
    ? checkedWrite(client.from('planner_tasks').update({ start_date: date, start_time: time, duration_minutes: duration }).eq('id', item.task_id).eq('updated_at', item.updated_at))
    : saveException(item, { override_date: date, start_time: time, duration_minutes: duration }), '时间已更新');
}
async function exportBackup() {
  if (!canEdit()) return;
  const userId = state.user.id;
  $('export').disabled = true;
  try {
    const [history, habitHistory, weightHistory, bpHistory] = await Promise.all([ledger.backup(userId), habits.backup(userId), weight.backup(userId), bp.backup(userId)]);
    if (state.user?.id !== userId) return;
    const blob = new Blob([JSON.stringify({ format: 'xidong-planner', version: 6, timezone: 'Asia/Singapore', exported_at: new Date().toISOString(), tasks: state.tasks, occurrences: state.exceptions, anniversaries: anniversaries.snapshot(), ledger: history, habits: habitHistory, weight: weightHistory, blood_pressure: bpHistory }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `planner-${todaySG()}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('备份已导出，请妥善保存。');
  } catch { toast('备份导出失败，请联网后重试，避免遗漏个人数据。'); }
  finally { $('export').disabled = false; }
}

async function applySession(session) {
  if (state.user?.id === session?.user?.id) return;
  ++state.epoch;
  clearInterval(pollTimer); clearTimeout(reloadTimer);
  if (state.channel) { client.removeChannel(state.channel); state.channel = null; }
  state.user = session?.user || null;
  state.tasks = []; state.exceptions = []; state.loaded = false; state.loading = false; state.edit = null;
  state.search = ''; $('search').value = ''; activeHealthMetric = 'weight'; anniversaries.reset(); ledger.reset(); habits.reset(); weight.reset(); bp.reset(); switchWorkspace('schedule');
  $('delete-dialog').close(); $('task-dialog').close();
  $('login-panel').hidden = !!state.user; $('workspace').hidden = !state.user;
  $('sign-out').hidden = !state.user; $('account-email').hidden = !state.user;
  $('account-email').textContent = state.user?.email || '';
  if (!state.user) {
    $('task-form').reset(); $('task-error').textContent = ''; state.editConflict = false;
    setError(); if (state.calendar) render(); return;
  }
  setupCalendar();
  requestAnimationFrame(() => state.calendar.updateSize());
  state.channel = client.channel(`planner-${state.user.id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'planner_tasks', filter: `user_id=eq.${state.user.id}` }, queueReload)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'planner_occurrences', filter: `user_id=eq.${state.user.id}` }, queueReload)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'planner_anniversaries', filter: `user_id=eq.${state.user.id}` }, queueReload)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'planner_ledger_accounts', filter: `user_id=eq.${state.user.id}` }, queueReload)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'planner_ledger_entries', filter: `user_id=eq.${state.user.id}` }, queueReload)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'planner_ledger_rules', filter: `user_id=eq.${state.user.id}` }, queueReload)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'planner_habits', filter: `user_id=eq.${state.user.id}` }, queueReload)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'planner_habit_checkins', filter: `user_id=eq.${state.user.id}` }, queueReload)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'planner_weight_records', filter: `user_id=eq.${state.user.id}` }, queueReload)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'planner_blood_pressure', filter: `user_id=eq.${state.user.id}` }, queueReload)
    .subscribe();
  await loadData();
  // Polling also catches deletes and provides fallback when Realtime is blocked.
  pollTimer = setInterval(() => { if (!document.hidden && !state.busy) loadData(); }, 30000);
}
function switchWorkspace(name) {
  if (activeWorkspace !== name) { state.search = ''; $('search').value = ''; }
  activeWorkspace = name;
  const days = name === 'anniversaries';
  const bookkeeping = name === 'ledger';
  const checking = name === 'habits';
  const weighing = name === 'weight';
  const pressure = weighing && activeHealthMetric === 'bp';
  $('schedule-panel').hidden = name !== 'schedule';
  $('anniversaries-panel').hidden = !days;
  $('ledger-panel').hidden = !bookkeeping;
  $('habits-panel').hidden = !checking;
  $('weight-panel').hidden = !weighing;
  $('weight-metric-panel').hidden = activeHealthMetric !== 'weight'; $('bp-panel').hidden = activeHealthMetric !== 'bp';
  document.querySelectorAll('[data-health-metric]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.healthMetric === activeHealthMetric)));
  $('workspace-title').textContent = days ? '纪念日' : bookkeeping ? '我的记账' : checking ? '习惯打卡' : pressure ? '血压记录' : weighing ? '体重管理' : '我的日程';
  $('add-task').textContent = days ? '＋ 新建纪念日' : bookkeeping ? '＋ 记一笔' : checking ? '＋ 新建习惯' : pressure ? '＋ 记录血压' : weighing ? '＋ 记录体重' : '＋ 新建任务';
  $('search').placeholder = days ? '搜索纪念日…' : bookkeeping ? '搜索流水…' : checking ? '搜索习惯…' : weighing ? '搜索日期或备注…' : '搜索任务…';
  document.querySelector('.search-label .sr-only').textContent = days ? '搜索纪念日' : bookkeeping ? '搜索流水' : checking ? '搜索习惯' : pressure ? '搜索血压记录' : weighing ? '搜索体重记录' : '搜索任务';
  document.querySelectorAll('[data-workspace]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.workspace === name)));
  render();
  if (name === 'schedule' && state.calendar) { state.calendar.updateSize(); scheduleCalendarSize(); }
}
async function init() {
  for (const [value, category] of Object.entries(CATEGORIES)) {
    const option = document.createElement('option'); option.value = value; option.textContent = category.label;
    option.style.backgroundColor = category.color; option.style.color = category.textColor;
    $('task-category').append(option);
    const legend = document.createElement('span'); legend.className = 'category-key';
    legend.style.setProperty('--category-color', category.textColor); legend.textContent = category.label;
    $('category-legend').append(legend);
  }
  $('check-connection').disabled = false;
  $('browser-hint').hidden = !/MicroMessenger/i.test(navigator.userAgent);
  $('check-connection').addEventListener('click', async () => {
    $('check-connection').disabled = true;
    const result = $('connection-result');
    result.hidden = false; result.dataset.state = 'checking'; result.textContent = '正在检测登录服务（最多约 8 秒）…';
    try {
      const diagnosis = await checkLoginConnection(plannerConfig);
      result.dataset.state = diagnosis.state; result.textContent = diagnosis.message;
    } finally { $('check-connection').disabled = false; }
  });
  if (!window.supabase || !window.FullCalendar) { $('login-error').textContent = '页面组件加载失败，请刷新重试。'; $('login-submit').disabled = true; return; }
  client = window.supabase.createClient(plannerConfig.url, plannerConfig.publishableKey, {
    auth: { storageKey: 'xidong-planner-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    global: { fetch: (input, options) => new URL(input instanceof Request ? input.url : input).pathname.startsWith('/auth/v1/') ? authFetchWithTimeout(input, options) : fetch(input, options) },
  });
  anniversaries = setupAnniversaries({ client, getUser: () => state.user, canEdit, mutate, checkedWrite });
  ledger = setupLedger({ client, getUser: () => state.user, canEdit, mutate, checkedWrite, allRows, reload: () => loadData({ force: true }), toast });
  habits = setupHabits({ client, getUser: () => state.user, canEdit, mutate, checkedWrite, allRows, toast });
  weight = setupWeight({ client, getUser: () => state.user, canEdit, mutate, checkedWrite, allRows, toast });
  bp = setupBloodPressure({ client, getUser: () => state.user, canEdit, mutate, checkedWrite, allRows, toast });
  document.querySelectorAll('[data-health-metric]').forEach((b) => b.addEventListener('click', () => { activeHealthMetric = b.dataset.healthMetric; state.search = ''; $('search').value = ''; switchWorkspace('weight'); }));
  document.querySelectorAll('[data-workspace]').forEach((button) => button.addEventListener('click', () => switchWorkspace(button.dataset.workspace)));
  $('login-form').addEventListener('submit', async (event) => {
    event.preventDefault(); $('login-submit').disabled = true; $('login-error').textContent = '';
    try {
      const { data, error } = await client.auth.signInWithPassword({ email: $('login-email').value.trim(), password: $('login-password').value });
      if (error) throw error;
      $('login-password').value = '';
      await applySession(data.session);
    } catch (error) { $('login-error').textContent = loginErrorMessage(error, navigator.onLine); }
    finally { $('login-submit').disabled = false; }
  });
  $('sign-out').addEventListener('click', async () => {
    if (state.busy) return;
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) { toast('退出失败，请重试。'); return; }
    await applySession(null); toast('已退出当前设备');
  });
  client.auth.onAuthStateChange((_event, session) => { setTimeout(() => applySession(session), 0); });
  $('add-task').addEventListener('click', () => { if (activeWorkspace === 'anniversaries') anniversaries.open(); else if (activeWorkspace === 'ledger') ledger.open(); else if (activeWorkspace === 'habits') habits.open(); else if (activeWorkspace === 'weight') { if (activeHealthMetric === 'bp') bp.open(); else weight.open(); } else if (canEdit()) openNew(); });
  $('agenda-add').addEventListener('click', () => { if (canEdit()) openNew(); });
  $('previous').addEventListener('click', () => state.calendar.prev());
  $('next').addEventListener('click', () => state.calendar.next());
  $('today').addEventListener('click', () => state.calendar.gotoDate(todaySG()));
  document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => state.calendar.changeView(button.dataset.view)));
  document.querySelectorAll('button[data-pane]').forEach((button) => button.addEventListener('click', () => {
    document.querySelector('.planner-layout').dataset.pane = button.dataset.pane;
    document.querySelectorAll('[data-pane]').forEach((tab) => { if (tab.tagName === 'BUTTON') tab.setAttribute('aria-pressed', String(tab === button)); });
    state.calendar.updateSize();
    scheduleCalendarSize();
  }));
  $('refresh').addEventListener('click', () => loadData({ force: true }));
  $('export').addEventListener('click', exportBackup);
  $('search').addEventListener('input', () => { state.search = $('search').value.trim().toLocaleLowerCase(); render(); });
  $('show-completed').addEventListener('change', () => { state.showCompleted = $('show-completed').checked; renderAgenda(); });
  $('task-form').addEventListener('submit', submitTask);
  $('task-category').addEventListener('change', updateCategoryColor);
  $('toggle-completion').addEventListener('click', toggleEditCompletion);
  $('delete-task').addEventListener('click', deleteTask);
  $('delete-form').addEventListener('submit', confirmRecurringDelete);
  $('delete-form').addEventListener('change', updateDeleteLabel);
  $('close-delete').addEventListener('click', closeDeleteDialog);
  $('cancel-delete').addEventListener('click', closeDeleteDialog);
  $('delete-dialog').addEventListener('cancel', (event) => { if (state.busy) event.preventDefault(); });
  $('close-dialog').addEventListener('click', closeDialog);
  $('cancel-task').addEventListener('click', closeDialog);
  $('task-dialog').addEventListener('cancel', (event) => { if (state.busy) event.preventDefault(); });
  $('task-dialog').addEventListener('close', () => { state.editConflict = false; });
  $('task-all-day').addEventListener('change', updateFormVisibility);
  $('task-repeat').addEventListener('change', updateFormVisibility);
  $('edit-scope').addEventListener('change', () => { if (state.edit) fillForm(isSingleEdit() ? state.edit.item : state.edit.task, isSingleEdit() ? state.edit.item.date : state.edit.task.start_date); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !state.busy) loadData(); });
  window.addEventListener('focus', () => { if (!state.busy) loadData(); });
  window.addEventListener('online', queueReload);
  window.addEventListener('offline', () => { syncStatus('当前离线，联网后继续同步', true); });
  $('login-submit').disabled = false;
  const { data, error } = await client.auth.getSession();
  if (error) $('login-error').textContent = loginErrorMessage(error, navigator.onLine);
  else await applySession(data.session);
}
init().catch((error) => { $('login-error').textContent = loginErrorMessage(error, navigator.onLine); $('login-submit').disabled = true; });
