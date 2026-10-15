import { sortAnniversaries } from './planner-days.mjs?v=20261016-days';
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
  const dialog = $('anniversary-dialog');
  const table = () => client.from('planner_anniversaries');

  function render() {
    const list = $('anniversary-list');
    const featured = $('anniversary-featured');
    list.replaceChildren(); featured.replaceChildren();
    $('anniversary-notice').textContent = loadingError;
    $('anniversary-notice').hidden = !loadingError;
    $('anniversary-count').textContent = rows.length;
    if (!available) return;
    const items = sortAnniversaries(rows).filter((item) => `${item.title} ${item.notes}`.toLocaleLowerCase().includes(search));
    if (!items.length) {
      list.append(node('div', 'anniversary-empty', search ? '没有匹配的纪念日。' : '记下一个值得期待或回味的日子。生日、相识、旅行出发，都可以放在这里。'));
      return;
    }
    for (const [index, item] of items.entries()) {
      const card = node('button', `anniversary-card ${item.summary.tone}${index === 0 ? ' featured' : ''}`);
      card.type = 'button'; card.dataset.anniversaryId = item.id;
      card.setAttribute('aria-label', `编辑纪念日：${item.title}，${item.summary.label} ${item.summary.days} 天`);
      const copy = node('span', 'anniversary-copy');
      copy.append(node('span', 'anniversary-name', `${item.pinned ? '☆ ' : ''}${item.title}`));
      copy.append(node('span', 'anniversary-date', item.yearly
        ? `下次：${item.summary.target} · 每年 ↻` : `${item.mode === 'countup' ? '开始日' : '目标日'}：${item.date}`));
      if (index === 0 && item.notes) copy.append(node('span', 'anniversary-notes', item.notes));
      const count = node('span', 'anniversary-number');
      count.append(node('span', 'anniversary-direction', item.summary.label));
      const digits = node('span', 'anniversary-digits');
      digits.append(node('strong', '', String(item.summary.days)), node('span', '', '天'));
      count.append(digits); card.append(copy, count);
      card.addEventListener('click', () => open(item));
      (index === 0 ? featured : list).append(card);
    }
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
    apply(result) {
      if (result.status === 'fulfilled') { rows = result.value; available = true; loadingError = ''; }
      else {
        const missing = ['PGRST205', '42P01', '42501'].includes(result.reason?.code);
        loadingError = missing ? '纪念日功能尚未启用，请联系站主完成配置。' : '纪念日同步失败，当前显示上次加载的记录。请刷新重试。';
        if (missing) { available = false; rows = []; }
      }
      render();
    },
    reset() { rows = []; available = false; edit = null; loadingError = ''; dialog.close(); $('anniversary-form').reset(); $('anniversary-error').textContent = ''; render(); },
    search(value) { search = value; render(); },
    snapshot: () => rows,
    get available() { return available; },
    busy(value) {
      for (const id of ['save-anniversary', 'delete-anniversary', 'cancel-anniversary', 'close-anniversary']) $(id).disabled = value;
    },
  };
}
