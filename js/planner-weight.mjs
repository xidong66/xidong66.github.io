import { parseWeight, weightText, weightRange, weightChart } from './planner-weight-model.mjs?v=20261018-weight';
import { todaySG } from './planner-model.mjs?v=20261016-colors';
const $ = (id) => document.getElementById(id);
const node = (tag, cls, text) => { const n = document.createElement(tag); n.className = cls; if (text !== undefined) n.textContent = text; return n; };
const svgNode = (tag, attrs, text) => { const n = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [key, value] of Object.entries(attrs)) n.setAttribute(key, value); if (text !== undefined) n.textContent = text; return n; };
const action = (text, handler, cls = 'quiet') => { const n = node('button', cls, text); n.type = 'button'; n.addEventListener('click', handler); return n; };

export function setupWeight({ client, getUser, canEdit, mutate, checkedWrite, allRows, toast }) {
  let rows = [], available = false, notice = '', busy = false, edit = null;
  let mode = '30', month = todaySG().slice(0, 7), search = '', limit = 20, selected = [], range = null, chartWidth = 0;
  const options = { dialog: true, dialogId: 'weight-dialog', errorTarget: 'weight-error' };
  const guard = () => { if (!canEdit()) return false; if (!available) { toast('体重数据尚未加载，请刷新后重试。'); return false; } return true; };
  function summaryCard(label, value, unit, detail) {
    const c = node('div', 'weight-summary-card'); c.append(node('span', 'weight-summary-label', label));
    const line = node('div', 'weight-summary-value'); line.append(node('strong', '', value), node('span', '', unit));
    c.append(line, node('span', 'weight-summary-detail', detail)); return c;
  }
  function renderChart() {
    if (!range) return;
    const container = $('weight-chart'), width = Math.max(240, Math.floor(container.getBoundingClientRect().width || 800)), height = width < 520 ? 260 : 310;
    chartWidth = width; container.replaceChildren();
    $('weight-chart-readout').textContent = '点测量圆点可修改；虚线连接漏记日期，空白日不补值。';
    if (!selected.length) { container.append(node('div', 'weight-chart-empty', available ? '这个范围还没有测量记录。有测量再记，漏记也没关系。' : '正在加载体重记录…')); return; }
    const data = weightChart(selected, range.from, range.through, width, height);
    const svg = svgNode('svg', { viewBox: `0 0 ${width} ${height}`, role: 'group', 'aria-label': `体重变化曲线，${range.from} 至 ${range.through}，${selected.length} 次实际测量，单位公斤` });
    svg.append(svgNode('text', { x: 14, y: 14, class: 'weight-axis-label' }, 'kg'));
    for (const tick of data.yTicks) {
      svg.append(svgNode('line', { x1: data.margin.left, x2: width - data.margin.right, y1: tick.y, y2: tick.y, class: 'weight-gridline' }));
      svg.append(svgNode('text', { x: data.margin.left - 10, y: tick.y + 4, 'text-anchor': 'end', class: 'weight-axis-label' }, weightText(Math.round(tick.value))));
    }
    const longRange = range.from.slice(0, 4) !== range.through.slice(0, 4);
    for (const tick of data.xTicks) svg.append(svgNode('text', { x: tick.x, y: height - 12, 'text-anchor': 'middle', class: 'weight-axis-label' }, longRange ? tick.date.slice(2).replaceAll('-', '/') : tick.date.slice(5).replace('-', '/')));
    for (const s of data.segments) svg.append(svgNode('line', { x1: s.from.x, y1: s.from.y, x2: s.to.x, y2: s.to.y, class: `weight-line${s.gap ? ' gap' : ''}` }));
    for (const p of data.points) {
      const label = `${p.record_date}，${weightText(p.weight_hundredths)} kg`;
      const group = svgNode('g', { class: 'weight-point', tabindex: '0', role: 'button', 'aria-label': `${label}，编辑测量`, 'data-record-id': p.id });
      group.append(svgNode('title', {}, label), svgNode('circle', { cx: p.x, cy: p.y, r: 10, class: 'weight-point-hit' }), svgNode('circle', { cx: p.x, cy: p.y, r: 4, class: 'weight-point-dot' }));
      group.addEventListener('pointerenter', () => { $('weight-chart-readout').textContent = label; });
      group.addEventListener('focus', () => { $('weight-chart-readout').textContent = label; });
      group.addEventListener('click', () => { if (!busy) open(p); });
      group.addEventListener('keydown', (e) => { if (!busy && ['Enter', ' '].includes(e.key)) { e.preventDefault(); open(p); } });
      svg.append(group);
    }
    container.append(svg);
    if (selected.length === 1) $('weight-chart-readout').textContent = '已有 1 次测量；再记录一次，就能看到两次测量之间的变化。';
  }
  function render() {
    $('weight-notice').textContent = notice || (!available ? '正在加载体重记录…' : ''); $('weight-notice').hidden = available && !notice;
    $('weight-month-wrap').hidden = mode !== 'month'; $('weight-month').value = month; $('weight-month').max = todaySG().slice(0, 7); $('weight-month').disabled = busy;
    document.querySelectorAll('[data-weight-range]').forEach((b) => { b.setAttribute('aria-pressed', String(b.dataset.weightRange === mode)); b.disabled = busy; });
    range = weightRange(rows, mode, month);
    selected = range.selected.filter((r) => `${r.record_date} ${r.notes} ${weightText(r.weight_hundredths)}`.toLocaleLowerCase().includes(search));
    const first = selected[0], last = selected.at(-1), change = selected.length >= 2 ? last.weight_hundredths - first.weight_hundredths : null;
    const dateSpan = (a, b) => a.slice(0, 4) === b.slice(0, 4) ? `${a.slice(5).replace('-', '/')} → ${b.slice(5).replace('-', '/')}` : `${a} → ${b}`;
    const cards = $('weight-summary'); cards.replaceChildren();
    cards.append(summaryCard('最新体重', weightText(range.latest?.weight_hundredths), 'kg', range.latest?.record_date || '还没有测量记录'),
      summaryCard('较上次测量', weightText(range.previousChange, true), 'kg', range.previous ? `对比 ${range.previous.record_date} 的测量` : '至少两次测量后显示'),
      summaryCard('所选范围变化', weightText(change, true), 'kg', first && last ? dateSpan(first.record_date, last.record_date) : '按实际记录计算'),
      summaryCard('本范围测量', String(selected.length), '天', dateSpan(range.from, range.through)));
    $('weight-range-caption').textContent = `${range.from} 至 ${range.through}${search ? ' · 已筛选搜索结果' : ''}`;
    renderChart();
    const list = $('weight-records'); list.replaceChildren();
    const visible = selected.slice().reverse();
    $('weight-record-count').textContent = `${visible.length} 条`;
    for (const row of visible.slice(0, limit)) {
      const item = node('div', 'weight-record'); item.dataset.recordId = row.id;
      const copy = action('', () => open(row), 'weight-record-copy');
      copy.append(node('strong', '', `${weightText(row.weight_hundredths)} kg`), node('span', '', row.record_date === todaySG() ? `${row.record_date} · 今天` : row.record_date));
      const note = node('span', 'weight-record-notes', row.notes || '—');
      const editButton = action('修改', () => open(row)); editButton.setAttribute('aria-label', `修改 ${row.record_date} 的体重`);
      item.append(copy, note, editButton); list.append(item);
    }
    if (!visible.length) list.append(node('div', 'weight-history-empty', search ? '没有匹配的记录。' : '还没有记录，点击“记录体重”添加一次测量。'));
    $('weight-more').hidden = visible.length <= limit; $('weight-more').disabled = busy;
    if (busy) list.querySelectorAll('button').forEach((b) => { b.disabled = true; });
  }
  function fillDate(date) {
    edit = rows.find((r) => r.record_date === date); edit = edit ? { ...edit } : null;
    $('weight-dialog-title').textContent = edit ? '修改这天的体重' : '记录体重';
    $('weight-value').value = edit ? weightText(edit.weight_hundredths) : '';
    $('weight-notes').value = edit?.notes || ''; $('weight-delete').hidden = !edit;
    $('weight-error').textContent = '';
  }
  function open(row = null) {
    if (!guard()) return;
    $('weight-form').reset(); $('weight-date').max = todaySG(); $('weight-date').value = row?.record_date || todaySG();
    fillDate($('weight-date').value); $('weight-dialog').showModal(); $('weight-value').focus();
  }
  $('weight-date').addEventListener('change', () => fillDate($('weight-date').value));
  $('weight-form').addEventListener('submit', async (event) => {
    event.preventDefault(); if (!guard()) return;
    const date = $('weight-date').value;
    if (!date || date < '2000-01-01' || date > todaySG()) { $('weight-error').textContent = '请选择 2000 年至今天之间的测量日期。'; return; }
    let value; try { value = parseWeight($('weight-value').value); } catch (error) { $('weight-error').textContent = error.message; return; }
    const changes = { record_date: date, weight_hundredths: value, notes: $('weight-notes').value.trim() };
    await mutate(async () => {
      await checkedWrite(edit ? client.from('planner_weight_records').update(changes).eq('id', edit.id).eq('updated_at', edit.updated_at)
        : client.from('planner_weight_records').insert({ ...changes, user_id: getUser().id }));
      // Show the saved date when a historical record falls outside the old range.
      const bounds = weightRange([], mode, month);
      if (mode !== 'all' && (date < bounds.from || date > bounds.through)) { mode = 'month'; month = date.slice(0, 7); }
      limit = 20;
    }, '体重记录已保存', options);
  });
  $('weight-delete').addEventListener('click', async () => {
    if (!guard() || !edit || !confirm(`确定删除 ${edit.record_date} 的体重测量？`)) return;
    await mutate(() => checkedWrite(client.from('planner_weight_records').delete().eq('id', edit.id).eq('updated_at', edit.updated_at)), '这次测量已删除', options);
  });
  const close = () => { if (!busy) $('weight-dialog').close(); };
  $('weight-close').addEventListener('click', close); $('weight-cancel').addEventListener('click', close);
  $('weight-dialog').addEventListener('cancel', (event) => { if (busy) event.preventDefault(); });
  document.querySelectorAll('[data-weight-range]').forEach((b) => b.addEventListener('click', () => { mode = b.dataset.weightRange; limit = 20; render(); }));
  $('weight-month').addEventListener('change', () => {
    const value = $('weight-month').value; if (!value || value < '2000-01' || value > todaySG().slice(0, 7)) { render(); return; }
    month = value; limit = 20; render();
  });
  $('weight-more').addEventListener('click', () => { limit += 20; render(); });
  const observer = new ResizeObserver(() => { const w = Math.floor($('weight-chart').getBoundingClientRect().width); if (w > 0 && w !== chartWidth) renderChart(); });
  observer.observe($('weight-chart'));
  return {
    open,
    search(value) { if (search !== value) limit = 20; search = value; render(); },
    fetch(userId) { return allRows('planner_weight_records', userId); },
    apply(result) {
      if (result.status === 'fulfilled') { rows = result.value; available = true; notice = ''; }
      else {
        const missing = ['PGRST205', '42P01', '42501'].includes(result.reason?.code);
        notice = missing ? '体重管理尚未启用，请联系站主完成配置。' : '体重同步失败，当前显示上次加载的记录，请刷新重试。';
        if (missing) { rows = []; available = false; }
      }
      render();
    },
    backup(userId) { return allRows('planner_weight_records', userId); },
    reset() {
      rows = []; selected = []; available = false; notice = ''; edit = null; mode = '30'; month = todaySG().slice(0, 7); search = ''; limit = 20;
      $('weight-dialog').close(); $('weight-form').reset(); $('weight-error').textContent = ''; render();
    },
    busy(value) { busy = value; for (const id of ['weight-save', 'weight-delete', 'weight-close', 'weight-cancel']) $(id).disabled = value; render(); },
  };
}
