import { sortAnniversaries, calendarDifference } from './planner-days.mjs?v=20261028-anniversary-format';
import { todaySG } from './planner-model.mjs?v=20261016-days';

const $ = (id) => document.getElementById(id);
const node = (tag, className, text) => {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

export function setupAnniversaries({ client, getUser, canEdit, mutate, checkedWrite }) {
  let rows = [];
  let available = false;
  let loadingError = '';
  let edit = null;
  let search = '';
  let mailSupported = false;
  let mailEnabled = false;
  const calendarFormats = new Set();
  const dialog = $('anniversary-dialog');
  const table = () => client.from('planner_anniversaries');

  function render() {
    const active=document.activeElement;
    const focusedId=active?.closest('.anniversary-card')?.dataset.anniversaryId;
    const focusOnNumber=active?.classList.contains('anniversary-number');
    let focusTarget;
    const list = $('anniversary-list');
    const featured = $('anniversary-featured');
    list.replaceChildren(); featured.replaceChildren();
    $('anniversary-notice').textContent = loadingError;
    $('anniversary-notice').hidden = !loadingError;
    $('anniversary-count').textContent = rows.length;
    if (!available) return;
    const today=todaySG();
    const items = sortAnniversaries(rows,today).filter((item) => `${item.title} ${item.notes}`.toLocaleLowerCase().includes(search));
    if (!items.length) {
      list.append(node('div', 'anniversary-empty', search ? '没有匹配的纪念日。' : '记下一个值得期待或回味的日子。生日、相识、旅行出发，都可以放在这里。'));
      return;
    }
    for (const [index, item] of items.entries()) {
      const card = node('article', `anniversary-card ${item.summary.tone}${index === 0 ? ' featured' : ''}`);
      card.dataset.anniversaryId = item.id; card.setAttribute('aria-label', `纪念日：${item.title}`);
      const copy = node('button', 'anniversary-copy'); copy.type='button';
      copy.setAttribute('aria-label',`编辑纪念日：${item.title}`); copy.title='编辑纪念日';
      copy.append(node('span', 'anniversary-name', `${item.pinned ? '☆ ' : ''}${item.title}`));
      copy.append(node('span', 'anniversary-date', item.yearly
        ? `下次：${item.summary.target} · 每年 ↻` : `${item.mode === 'countup' ? '开始日' : '目标日'}：${item.date}`));
      if (index === 0 && item.notes) copy.append(node('span', 'anniversary-notes', item.notes));
      if (item.email_reminder) copy.append(node('span', 'anniversary-mail', mailSupported && mailEnabled ? '✉ 提前 1 天 · 09:00' : '✉ 邮件提醒待启用'));
      const count = node('button', 'anniversary-number'); count.type='button';
      count.append(node('span', 'anniversary-direction', item.summary.label));
      const digits = node('span', 'anniversary-digits');
      const hint = node('span','anniversary-format-hint');
      function drawCount() {
        const calendar=calendarFormats.has(item.id);
        card.classList.toggle('calendar-format',calendar); digits.classList.toggle('calendar-duration',calendar); digits.replaceChildren();
        let value;
        if (calendar) {
          const duration=calendarDifference(item.summary.target,today);
          for (const [field,unit] of [['years','年'],['months','个月'],['days','天']]) {
            const part=node('span','anniversary-duration-part');part.dataset.durationUnit=field;
            part.append(node('strong','',String(duration[field])),node('span','',unit));digits.append(part);
          }
          value=`${duration.years}年${duration.months}个月${duration.days}天`;
        } else {digits.append(node('strong','',String(item.summary.days)),node('span','','天'));value=`${item.summary.days}天`;}
        hint.textContent=calendar ? '点击查看总天数' : '点击查看年月天';
        count.dataset.format=calendar ? 'calendar' : 'days'; count.setAttribute('aria-pressed',String(calendar));
        count.setAttribute('aria-label',`${item.title}，${item.summary.label}${value}，${hint.textContent}`);count.title=hint.textContent;
      }
      drawCount(); count.append(digits,hint);card.append(copy,count);
      count.addEventListener('click',(event)=>{event.stopPropagation();if(calendarFormats.has(item.id))calendarFormats.delete(item.id);else calendarFormats.add(item.id);drawCount();});
      copy.addEventListener('click',(event)=>{event.stopPropagation();open(item);});
      card.addEventListener('click',(event)=>{if(!event.target.closest('button'))open(item);});
      (index === 0 ? featured : list).append(card);
      if(item.id===focusedId)focusTarget=focusOnNumber ? count : copy;
    }
    focusTarget?.focus({preventScroll:true});
  }
  function formMode() {
    const countdown = $('anniversary-mode').value === 'countdown';
    $('anniversary-yearly-wrap').hidden = !countdown;
    $('anniversary-yearly').disabled = !countdown;
    $('anniversary-date-label').textContent = countdown ? '目标日期' : '开始日期';
    $('anniversary-date-help').textContent = countdown
      ? '生日可选每年重复。2 月 29 日在非闰年按 2 月 28 日计算。'
      : '从开始日算起，当天为 0 天；未来的开始日会先显示倒计时。';
  }
  function mailHint() {
    $('anniversary-email').disabled = !mailSupported;
    $('anniversary-email-help').textContent = !mailSupported ? '邮件提醒暂不可用，请刷新或联系站主启用。'
      : `${mailEnabled ? '' : '提醒服务待站主启用，设置可先保存。'}发至当前账号的登录邮箱。时间为 UTC+8；正计时纪念日按每年同月同日提醒。`;
  }
  function open(item = null) {
    if (!canEdit()) return;
    if (!available) { $('anniversary-notice').hidden = false; return; }
    edit = item ? { ...item } : null;
    $('anniversary-form').reset();
    $('anniversary-error').textContent = '';
    $('anniversary-dialog-title').textContent = item ? '编辑纪念日' : '新建纪念日';
    $('anniversary-title').value = item?.title || '';
    $('anniversary-date').value = item?.date || todaySG();
    $('anniversary-mode').value = item?.mode || 'countdown';
    $('anniversary-yearly').checked = !!item?.yearly;
    $('anniversary-pinned').checked = !!item?.pinned;
    $('anniversary-notes').value = item?.notes || '';
    $('anniversary-email').checked = !!item?.email_reminder;
    mailHint();
    $('delete-anniversary').hidden = !item;
    formMode(); dialog.showModal(); $('anniversary-title').focus();
  }
  const close = () => { if (!dialog.querySelector('[type=submit]').disabled) dialog.close(); };
  $('anniversary-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!canEdit() || !available) return;
    const changes = {
      title: $('anniversary-title').value.trim(), date: $('anniversary-date').value,
      mode: $('anniversary-mode').value,
      yearly: $('anniversary-mode').value === 'countdown' && $('anniversary-yearly').checked,
      pinned: $('anniversary-pinned').checked, notes: $('anniversary-notes').value.trim(),
    };
    // Omit the column on old databases, preserving all existing CRUD operations.
    if (mailSupported) changes.email_reminder = $('anniversary-email').checked;
    if (!changes.title) { $('anniversary-error').textContent = '请输入纪念日名称。'; return; }
    await mutate(() => checkedWrite(edit
      ? table().update(changes).eq('id', edit.id).eq('updated_at', edit.updated_at)
      : table().insert({ ...changes, user_id: getUser().id })), '纪念日已保存',
    { dialog: true, dialogId: 'anniversary-dialog', errorTarget: 'anniversary-error' });
  });
  $('delete-anniversary').addEventListener('click', async () => {
    if (!canEdit() || !edit || !confirm(`确定删除纪念日“${edit.title}”？`)) return;
    await mutate(() => checkedWrite(table().delete().eq('id', edit.id).eq('updated_at', edit.updated_at)), '纪念日已删除',
      { dialog: true, dialogId: 'anniversary-dialog', errorTarget: 'anniversary-error' });
  });
  $('anniversary-mode').addEventListener('change', formMode);
  $('cancel-anniversary').addEventListener('click', close);
  $('close-anniversary').addEventListener('click', close);
  dialog.addEventListener('cancel', (event) => { if ($('save-anniversary').disabled) event.preventDefault(); });
  return {
    open, render,
    apply(result, mailResult) {
      mailSupported = mailResult?.status === 'fulfilled' && typeof mailResult.value?.enabled === 'boolean';
      mailEnabled = mailSupported && mailResult.value.enabled;
      if (result.status === 'fulfilled') { rows = result.value; available = true; loadingError = ''; }
      else {
        const missing = ['PGRST205', '42P01', '42501'].includes(result.reason?.code);
        loadingError = missing ? '纪念日功能尚未启用，请联系站主完成配置。' : '纪念日同步失败，当前显示上次加载的记录。请刷新重试。';
        if (missing) { available = false; rows = []; }
      }
      render();
    },
    reset() { rows = []; available = false; edit = null; loadingError = ''; mailSupported = false; mailEnabled = false; calendarFormats.clear(); dialog.close(); $('anniversary-form').reset(); $('anniversary-error').textContent = ''; render(); },
    search(value) { search = value; render(); },
    snapshot: () => rows,
    get available() { return available; },
    busy(value) {
      for (const id of ['save-anniversary', 'delete-anniversary', 'cancel-anniversary', 'close-anniversary']) $(id).disabled = value;
    },
  };
}
