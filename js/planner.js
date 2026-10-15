import { plannerConfig } from './planner-config.js';
import { CATEGORIES, addDays, todaySG, weekday, wallISO, expandTasks, calendarEvent, repeatLabel } from './planner-model.mjs';

const $ = (id) => document.getElementById(id);
const state = { user: null, tasks: [], exceptions: [], calendar: null, channel: null, busy: false, loaded: false, loading: false, epoch: 0, edit: null, search: '', showCompleted: false };
let client;
let pollTimer;
let reloadTimer;
let toastTimer;
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
  if (error?.code === 'PGRST205' || error?.code === '42501' || error?.code === '42P01') return '日历尚未初始化，请联系站主完成配置。';
  if (error?.message === 'conflict' || error?.code === '23505') return '这条任务已在另一台设备修改，请刷新后重试。';
  if (error?.code === 'invalid_credentials') return '邮箱或密码不正确，请使用计划网站的登录账号。';
  if (error?.code === 'email_not_confirmed') return '账号邮箱尚未确认，请联系站主完成账号设置。';
  if (error?.status === 429 || error?.code === 'over_request_rate_limit') return '操作太频繁，请稍后再试。';
  if (error?.status === 401 || error?.code === 'PGRST301') return '登录已过期，请退出后重新登录。';
  return navigator.onLine ? '连接暂时失败，修改未保存。请稍后重试。' : '当前离线，修改未保存。请联网后重试。';
}
function setError(message = '') { $('workspace-error').textContent = message; $('workspace-error').hidden = !message; }
function canEdit() {
  if (!state.user || !state.loaded) { toast('请等待任务加载完成后再操作。'); return false; }
  if (state.busy) return false;
  if (!navigator.onLine) { toast('当前离线，请联网后再修改。'); return false; }
  return true;
}
function setBusy(value) {
  state.busy = value;
  for (const id of ['save-task', 'delete-task', 'add-task', 'agenda-add', 'sign-out', 'refresh']) $(id).disabled = value;
  document.querySelectorAll('.task-check').forEach((button) => { button.disabled = value; });
  // Prevent closing a form midway through a write, including the Escape key.
  $('close-dialog').disabled = value;
  $('cancel-task').disabled = value;
}
function matches(item) { return `${item.title} ${item.notes}`.toLocaleLowerCase().includes(state.search); }

async function allRows(table, userId) {
  const rows = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await client.from(table).select('*').eq('user_id', userId).order(table === 'planner_tasks' ? 'id' : 'task_id').order(table === 'planner_tasks' ? 'start_date' : 'original_date').range(start, start + 499);
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
    const [tasks, exceptions] = await Promise.all([allRows('planner_tasks', userId), allRows('planner_occurrences', userId)]);
    if (token !== state.epoch || state.user?.id !== userId) return;
    state.tasks = tasks;
    state.exceptions = exceptions;
    state.loaded = true;
    setError();
    render();
    const time = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date());
    syncStatus(`已同步 · ${time}`);
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

function setupCalendar() {
  if (state.calendar) return;
  state.calendar = new FullCalendar.Calendar($('calendar'), {
    initialView: 'dayGridMonth', initialDate: todaySG(), firstDay: 1,
    // UTC coercion treats the app's Singapore wall time consistently, without
    // importing the device's timezone or requiring a named-zone plugin.
    timeZone: 'UTC', locale: 'zh-cn', headerToolbar: false,
    buttonText: { today: '今天', month: '月', week: '周', day: '日' },
    allDayText: '全天', noEventsText: '没有任务', moreLinkText: (n) => `还有 ${n} 项`,
    dayHeaderContent: (arg) => ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][arg.date.getUTCDay()],
    height: 'auto', contentHeight: matchMedia('(max-width:760px)').matches ? 490 : Math.max(550, Math.min(820, innerHeight - 300)),
    fixedWeekCount: false, dayMaxEvents: 3, eventDisplay: 'block', displayEventEnd: false,
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    slotMinTime: '06:00:00', slotMaxTime: '24:00:00', scrollTime: '08:00:00',
    now: () => new Date(new Date().getTime() + 8 * 3600000).toISOString().slice(0, 19), nowIndicator: true,
    selectable: true, selectMirror: true, editable: true, eventDurationEditable: true,
    longPressDelay: 450, selectLongPressDelay: 450,
    events(info, success) {
      const from = addDays(info.startStr.slice(0, 10), -1);
      const to = info.endStr.slice(0, 10);
      success(expandTasks(state.tasks, state.exceptions, from, to).filter(matches).map(calendarEvent));
    },
    datesSet() { if (state.calendar) updateCalendarChrome(); },
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
    windowResize() { state.calendar.setOption('contentHeight', matchMedia('(max-width:760px)').matches ? 490 : Math.max(550, Math.min(820, innerHeight - 300))); },
  });
  state.calendar.render();
}
function render() {
  $('today-caption').textContent = dtFormat.format(new Date());
  if (state.calendar) { state.calendar.refetchEvents(); updateCalendarChrome(); }
  renderAgenda();
}
function updateCalendarChrome() {
  $('calendar-title').textContent = state.calendar.view.title;
  document.querySelectorAll('[data-view]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.view === state.calendar.view.type)));
}
function renderAgenda() {
  const list = $('agenda-list');
  list.replaceChildren();
  if (!state.loaded) { list.textContent = '正在加载日程…'; return; }
  const today = todaySG();
  const tomorrow = addDays(today, 1);
  const end = addDays(today, 8);
  const earliest = state.tasks.reduce((date, task) => task.start_date < date ? task.start_date : date, today);
  const movedEarliest = state.exceptions.reduce((date, ex) => ex.override_date && ex.override_date < date ? ex.override_date : date, earliest);
  const items = expandTasks(state.tasks, state.exceptions, movedEarliest, end).filter(matches);
  const pending = items.filter((item) => !item.completed);
  $('agenda-count').textContent = pending.length;
  const groups = [
    { title: '已逾期', cls: 'overdue', filter: (i) => !i.completed && i.date < today },
    { title: '今天', filter: (i) => !i.completed && i.date === today },
    { title: '未来七天', filter: (i) => !i.completed && i.date >= tomorrow },
    { title: '已完成', filter: (i) => state.showCompleted && i.completed },
  ];
  let shown = 0;
  for (const group of groups) {
    const rows = items.filter(group.filter);
    if (!rows.length) continue;
    const section = document.createElement('div'); section.className = `agenda-group ${group.cls || ''}`;
    const heading = document.createElement('h3'); heading.textContent = group.title;
    const total = document.createElement('span'); total.textContent = rows.length; heading.append(total); section.append(heading);
    for (const item of rows.slice(0, 80)) { section.append(taskCard(item)); shown++; }
    if (rows.length > 80) {
      const note = document.createElement('p'); note.className = 'muted'; note.textContent = `显示前 80 项，共 ${rows.length} 项。可搜索名称缩小范围。`; section.append(note);
    }
    list.append(section);
  }
  if (!shown) {
    const empty = document.createElement('div'); empty.className = 'empty-state';
    const symbol = document.createElement('span'); symbol.className = 'empty-symbol'; symbol.textContent = '✓';
    const text = document.createElement('div'); text.textContent = state.search ? '没有匹配的近期任务' : '近期没有待办，留一点空白。';
    empty.append(symbol, text); list.append(empty);
  }
}
function taskCard(item) {
  const card = document.createElement('div'); card.className = `task-card${item.completed ? ' done' : ''}`;
  const check = document.createElement('button'); check.type = 'button'; check.className = 'task-check'; check.textContent = item.completed ? '✓' : '';
  check.setAttribute('aria-label', `${item.completed ? '恢复未完成' : '完成任务'}：${item.title}`); check.setAttribute('aria-pressed', String(item.completed)); check.disabled = state.busy;
  check.addEventListener('click', () => mutate(() => saveException(item, { completed: !item.completed }), item.completed ? '已恢复待办' : '已完成，做得不错。'));
  const copy = document.createElement('button'); copy.type = 'button'; copy.className = 'task-copy'; copy.setAttribute('aria-label', `编辑：${item.title}`);
  const title = document.createElement('span'); title.className = 'task-name'; title.textContent = item.title;
  const meta = document.createElement('span'); meta.className = 'task-meta';
  meta.textContent = `${item.date.slice(5).replace('-', '/')} · ${item.start_time ? item.start_time.slice(0, 5) : '全天'} · ${CATEGORIES[item.category].label}${repeatLabel(item) ? ` · ↻ ${repeatLabel(item)}` : ''}`;
  copy.append(title, meta); copy.addEventListener('click', () => { if (canEdit()) openEdit(item); }); card.append(check, copy);
  if (item.important) { const star = document.createElement('span'); star.className = 'task-star'; star.textContent = '☆'; star.setAttribute('aria-label', '重要'); card.append(star); }
  return card;
}

function fillForm(task, date) {
  $('task-title').value = task.title || '';
  $('task-date').value = date;
  $('task-category').value = task.category || 'research';
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
  $('repeat-fields').hidden = single;
  const repeating = $('task-repeat').value !== 'none';
  $('repeat-interval-wrap').hidden = !repeating;
  $('task-interval').disabled = !repeating || single;
  $('task-until').disabled = !repeating || single;
  $('repeat-until-wrap').hidden = !repeating;
  $('weekdays').hidden = $('task-repeat').value !== 'weekly';
}
function closeDialog() { if (!state.busy) $('task-dialog').close(); }
async function mutate(operation, message, { dialog = false } = {}) {
  if (!canEdit()) return false;
  setBusy(true);
  ++state.epoch;
  state.loading = false;
  if (dialog) $('task-error').textContent = '';
  syncStatus('正在保存…');
  try {
    await operation();
    // Force refresh invalidates any older poll that started before this write.
    await loadData({ force: true });
    if (dialog) $('task-dialog').close();
    toast(message);
    return true;
  } catch (error) {
    const message = errorMessage(error);
    if (dialog) $('task-error').textContent = message; else setError(message);
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
  const single = isSingleEdit();
  if (!confirm(single ? '删除这一次任务？其他重复日期会保留。' : state.edit.task.repeat === 'none' ? '确定删除这条任务？' : '删除整个系列及其所有完成记录？')) return;
  await mutate(() => single ? saveException(state.edit.item, { skipped: true }) : checkedWrite(client.from('planner_tasks').delete().eq('id', state.edit.task.id).eq('updated_at', state.edit.task.updated_at)), single ? '已删除这一次任务' : '任务已删除', { dialog: true });
}
async function moveCalendarEvent(info) {
  const item = info.event.extendedProps.item;
  const date = info.event.startStr.slice(0, 10);
  const time = info.event.allDay ? null : info.event.startStr.slice(11, 16);
  const duration = info.event.allDay ? 60 : Math.round((info.event.end - info.event.start) / 60000) || item.duration_minutes;
  info.revert();
  if (!canEdit()) return;
  if (date < '2000-01-01' || date > '2100-12-31' || duration < 5 || duration > 1440) { toast('请选择有效日期，单次任务最长为 24 小时。'); return; }
  if (item.repeat !== 'none' && !confirm('只调整这一次任务的时间？其他重复日期会保留。')) return;
  await mutate(() => item.repeat === 'none'
    ? checkedWrite(client.from('planner_tasks').update({ start_date: date, start_time: time, duration_minutes: duration }).eq('id', item.task_id).eq('updated_at', item.updated_at))
    : saveException(item, { override_date: date, start_time: time, duration_minutes: duration }), '时间已更新');
}
function exportBackup() {
  if (!state.loaded || !state.user) return;
  const blob = new Blob([JSON.stringify({ format: 'xidong-planner', version: 1, timezone: 'Asia/Singapore', exported_at: new Date().toISOString(), tasks: state.tasks, occurrences: state.exceptions }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = `planner-${todaySG()}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('备份已导出，请妥善保存。');
}

async function applySession(session) {
  if (state.user?.id === session?.user?.id) return;
  ++state.epoch;
  clearInterval(pollTimer); clearTimeout(reloadTimer);
  if (state.channel) { client.removeChannel(state.channel); state.channel = null; }
  state.user = session?.user || null;
  state.tasks = []; state.exceptions = []; state.loaded = false; state.loading = false; state.edit = null;
  $('task-dialog').close();
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
    .subscribe();
  await loadData();
  // Polling also catches deletes and provides fallback when Realtime is blocked.
  pollTimer = setInterval(() => { if (!document.hidden && !state.busy) loadData(); }, 30000);
}
async function init() {
  if (!window.supabase || !window.FullCalendar) { $('login-error').textContent = '页面组件加载失败，请刷新重试。'; $('login-submit').disabled = true; return; }
  client = window.supabase.createClient(plannerConfig.url, plannerConfig.publishableKey, { auth: { storageKey: 'xidong-planner-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  $('login-form').addEventListener('submit', async (event) => {
    event.preventDefault(); $('login-submit').disabled = true; $('login-error').textContent = '';
    try {
      const { data, error } = await client.auth.signInWithPassword({ email: $('login-email').value.trim(), password: $('login-password').value });
      if (error) throw error;
      $('login-password').value = '';
      await applySession(data.session);
    } catch (error) { $('login-error').textContent = errorMessage(error); }
    finally { $('login-submit').disabled = false; }
  });
  $('sign-out').addEventListener('click', async () => {
    if (state.busy) return;
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) { toast('退出失败，请重试。'); return; }
    await applySession(null); toast('已退出当前设备');
  });
  client.auth.onAuthStateChange((_event, session) => { setTimeout(() => applySession(session), 0); });
  $('add-task').addEventListener('click', () => { if (canEdit()) openNew(); });
  $('agenda-add').addEventListener('click', () => { if (canEdit()) openNew(); });
  $('previous').addEventListener('click', () => state.calendar.prev());
  $('next').addEventListener('click', () => state.calendar.next());
  $('today').addEventListener('click', () => state.calendar.gotoDate(todaySG()));
  document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => state.calendar.changeView(button.dataset.view)));
  document.querySelectorAll('[data-pane]').forEach((button) => button.addEventListener('click', () => {
    document.querySelector('.planner-layout').dataset.pane = button.dataset.pane;
    document.querySelectorAll('[data-pane]').forEach((tab) => { if (tab.tagName === 'BUTTON') tab.setAttribute('aria-pressed', String(tab === button)); });
    state.calendar.updateSize();
  }));
  $('refresh').addEventListener('click', () => loadData({ force: true }));
  $('export').addEventListener('click', exportBackup);
  $('search').addEventListener('input', () => { state.search = $('search').value.trim().toLocaleLowerCase(); render(); });
  $('show-completed').addEventListener('change', () => { state.showCompleted = $('show-completed').checked; renderAgenda(); });
  $('task-form').addEventListener('submit', submitTask);
  $('delete-task').addEventListener('click', deleteTask);
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
  if (error) $('login-error').textContent = errorMessage(error);
  else await applySession(data.session);
}
init().catch(() => { $('login-error').textContent = '初始化失败，请刷新页面重试。'; });
