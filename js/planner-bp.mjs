import { bpLocal, parseBPTime, parseBP, bpRange, bpChart } from './planner-bp-model.mjs?v=20261018-bp';
import { todaySG } from './planner-model.mjs?v=20261016-colors';
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const n = document.createElement(tag); n.className = cls; if (text !== undefined) n.textContent = text; return n; };
const sv = (tag, attrs, text) => { const n = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); if (text !== undefined) n.textContent = text; return n; };
const button = (text, fn, cls = 'quiet') => { const n = el('button', cls, text); n.type = 'button'; n.addEventListener('click', fn); return n; };
export function setupBloodPressure({ client, getUser, canEdit, mutate, checkedWrite, allRows, toast }) {
  let rows = [], available = false, notice = '', busy = false, edit = null, mode = '30', month = todaySG().slice(0, 7), search = '', limit = 20, range = null, selected = [], chartWidth = 0;
  const options = { dialog: true, dialogId: 'bp-dialog', errorTarget: 'bp-error' };
  const guard = () => { if (!canEdit()) return false; if (!available) { toast('血压记录尚未加载，请刷新后重试。'); return false; } return true; };
  const label = (r) => `${bpLocal(r.measured_at).replace('T', ' ')} · ${r.systolic}/${r.diastolic} mmHg${r.pulse ? ` · 心率 ${r.pulse} 次/分` : ''}`;
  function card(title, value, unit, detail) {
    const n = el('div', 'weight-summary-card'); n.append(el('span', 'weight-summary-label', title));
    const v = el('div', 'weight-summary-value'); v.append(el('strong', '', value), el('span', '', unit)); n.append(v, el('span', 'weight-summary-detail', detail)); return n;
  }
  function renderChart() {
    if (!range) return;
    const area = $('bp-chart'), width = Math.max(240, Math.floor(area.getBoundingClientRect().width || 800)), height = width < 520 ? 260 : 310;
    chartWidth = width; area.replaceChildren(); $('bp-readout').textContent = '点测量圆点可修改；漏记日不补值。';
    if (!selected.length) { area.append(el('div', 'weight-chart-empty', available ? '这个范围还没有血压记录，测量后再记即可。' : '正在加载血压记录…')); return; }
    const data = bpChart(selected, range.start, range.end, width, height);
    const svg = sv('svg', { viewBox: `0 0 ${width} ${height}`, role: 'group', 'aria-label': `血压趋势，高压与低压，${selected.length} 次实际测量，单位 mmHg` });
    svg.append(sv('text', { x: 5, y: 13, class: 'weight-axis-label' }, 'mmHg'));
    for (const t of data.yTicks) svg.append(sv('line', { x1: data.margin.left, x2: width - data.margin.right, y1: t.y, y2: t.y, class: 'weight-gridline' }), sv('text', { x: data.margin.left - 9, y: t.y + 4, 'text-anchor': 'end', class: 'weight-axis-label' }, String(t.value)));
    for (const t of data.xTicks) svg.append(sv('text', { x: t.x, y: height - 12, 'text-anchor': 'middle', class: 'weight-axis-label' }, t.label));
    for (const kind of ['high', 'low']) {
      for (const s of data.segments) svg.append(sv('line', { x1: s.from.x, x2: s.to.x, y1: s.from[`${kind}Y`], y2: s.to[`${kind}Y`], class: `bp-line ${kind}${s.gap ? ' gap' : ''}` }));
      for (const p of data.points) {
        const group = sv('g', { class: `bp-point ${kind}`, role: 'button', tabindex: '0', 'aria-label': `${label(p)}，编辑测量`, 'data-record-id': p.id });
        group.append(sv('title', {}, label(p)), sv('circle', { cx: p.x, cy: p[`${kind}Y`], r: 10, class: 'weight-point-hit' }), sv('circle', { cx: p.x, cy: p[`${kind}Y`], r: 4, class: 'bp-point-dot' }));
        group.addEventListener('pointerenter', () => { $('bp-readout').textContent = label(p); }); group.addEventListener('focus', () => { $('bp-readout').textContent = label(p); });
        group.addEventListener('click', () => { if (!busy) open(p); });
        group.addEventListener('keydown', (e) => { if (!busy && ['Enter', ' '].includes(e.key)) { e.preventDefault(); open(p); } }); svg.append(group);
      }
    }
    area.append(svg);
    if (selected.length === 1) $('bp-readout').textContent = '已有一次测量，高压与低压分别显示；继续记录后形成趋势线。';
  }
  function render() {
    $('bp-notice').textContent = notice || (!available ? '正在加载血压记录…' : ''); $('bp-notice').hidden = available && !notice;
    $('bp-month-wrap').hidden = mode !== 'month'; $('bp-month').value = month; $('bp-month').max = todaySG().slice(0, 7); $('bp-month').disabled = busy;
    document.querySelectorAll('[data-bp-range]').forEach((b) => { b.setAttribute('aria-pressed', String(b.dataset.bpRange === mode)); b.disabled = busy; });
    range = bpRange(rows, mode, month);
    selected = range.selected.filter((r) => `${label(r)} ${r.notes}`.toLocaleLowerCase().includes(search));
    const latest = range.latest, dateSpan = range.from.slice(0, 4) === range.through.slice(0, 4) ? `${range.from.slice(5).replace('-', '/')} → ${range.through.slice(5).replace('-', '/')}` : `${range.from} → ${range.through}`;
    $('bp-summary').replaceChildren(
      card('最近一次血压', latest ? `${latest.systolic} / ${latest.diastolic}` : '—', 'mmHg', latest ? bpLocal(latest.measured_at).replace('T', ' ') : '还没有测量记录'),
      card('这次测量心率', latest?.pulse ? String(latest.pulse) : '—', '次/分', latest?.pulse ? '对应最近一次血压测量' : latest ? '此条记录未填写心率' : '记录血压时可选记心率'),
      card('本范围测量', String(selected.length), '次', dateSpan));
    $('bp-range-caption').textContent = `${range.from} 至 ${range.through}${search ? ' · 已筛选' : ''}`; renderChart();
    const list = $('bp-records'); list.replaceChildren(); $('bp-record-count').textContent = `${selected.length} 条`;
    for (const row of selected.slice().reverse().slice(0, limit)) {
      const n = el('div', 'weight-record bp-record'); n.dataset.recordId = row.id;
      const copy = button('', () => open(row), 'weight-record-copy'); const value = el('strong', 'bp-record-value');
      value.append(el('span', 'bp-high-text', String(row.systolic)), el('span', '', ' / '), el('span', 'bp-low-text', String(row.diastolic)), el('small', '', ' mmHg'));
      copy.append(value, el('span', '', bpLocal(row.measured_at).replace('T', ' ')));
      const meta = el('div', 'weight-record-notes'); if (row.pulse) meta.append(el('span', 'bp-pulse', `心率 ${row.pulse} 次/分`)); meta.append(el('span', '', row.notes || ''));
      const editButton = button('修改', () => open(row)); editButton.setAttribute('aria-label', `修改 ${bpLocal(row.measured_at).replace('T', ' ')} 的血压`);
      n.append(copy, meta, editButton); list.append(n);
    }
    if (!selected.length) list.append(el('div', 'weight-history-empty', search ? '没有匹配的血压记录。' : '点击“记录血压”添加一次测量；支持一天多次。'));
    $('bp-more').hidden = selected.length <= limit; $('bp-more').disabled = busy; if (busy) list.querySelectorAll('button').forEach((b) => { b.disabled = true; });
  }
  function open(row = null) {
    if (!guard()) return; edit = row ? { ...row } : null; $('bp-form').reset(); $('bp-error').textContent = '';
    const now = new Date().toISOString();
    $('bp-dialog-title').textContent = row ? '修改血压记录' : '记录血压'; $('bp-time').max = bpLocal(now, true);
    $('bp-time').value = bpLocal(row?.measured_at || now, true); $('bp-systolic').value = row?.systolic || ''; $('bp-diastolic').value = row?.diastolic || ''; $('bp-pulse').value = row?.pulse || ''; $('bp-notes').value = row?.notes || ''; $('bp-delete').hidden = !row;
    $('bp-dialog').showModal(); $('bp-systolic').focus();
  }
  $('bp-form').addEventListener('submit', async (event) => {
    event.preventDefault(); if (!guard()) return;
    let changes; try { changes = { ...parseBP($('bp-systolic').value, $('bp-diastolic').value, $('bp-pulse').value), measured_at: parseBPTime($('bp-time').value), notes: $('bp-notes').value.trim() }; } catch (error) { $('bp-error').textContent = error.message; return; }
    await mutate(async () => {
      await checkedWrite(edit ? client.from('planner_blood_pressure').update(changes).eq('id', edit.id).eq('updated_at', edit.updated_at) : client.from('planner_blood_pressure').insert({ ...changes, user_id: getUser().id }));
      const date = bpLocal(changes.measured_at).slice(0, 10), bounds = bpRange([], mode, month);
      if (mode !== 'all' && (date < bounds.from || date > bounds.through)) { mode = 'month'; month = date.slice(0, 7); } limit = 20;
    }, '血压记录已保存', options);
  });
  $('bp-time').addEventListener('input', () => { $('bp-time').max = bpLocal(new Date().toISOString(), true); });
  $('bp-delete').addEventListener('click', async () => {
    if (!guard() || !edit || !confirm(`确定删除 ${bpLocal(edit.measured_at).replace('T', ' ')} 的这次血压测量？`)) return;
    await mutate(() => checkedWrite(client.from('planner_blood_pressure').delete().eq('id', edit.id).eq('updated_at', edit.updated_at)), '这次血压测量已删除', options);
  });
  const close = () => { if (!busy) $('bp-dialog').close(); };
  $('bp-close').addEventListener('click', close); $('bp-cancel').addEventListener('click', close); $('bp-dialog').addEventListener('cancel', (e) => { if (busy) e.preventDefault(); });
  document.querySelectorAll('[data-bp-range]').forEach((b) => b.addEventListener('click', () => { mode = b.dataset.bpRange; limit = 20; render(); }));
  $('bp-month').addEventListener('change', () => { const v = $('bp-month').value; if (v && v >= '2000-01' && v <= todaySG().slice(0, 7)) { month = v; limit = 20; } render(); });
  $('bp-more').addEventListener('click', () => { limit += 20; render(); });
  new ResizeObserver(() => { const w = Math.floor($('bp-chart').getBoundingClientRect().width); if (w > 0 && w !== chartWidth) renderChart(); }).observe($('bp-chart'));
  return {
    open, search(value) { if (search !== value) limit = 20; search = value; render(); },
    fetch(userId) { return allRows('planner_blood_pressure', userId); }, backup(userId) { return allRows('planner_blood_pressure', userId); },
    apply(result) {
      if (result.status === 'fulfilled') { rows = result.value; available = true; notice = ''; }
      else { const missing = ['PGRST205', '42P01', '42501'].includes(result.reason?.code); notice = missing ? '血压记录尚未启用，请联系站主完成配置。' : '血压同步失败，保留上次加载的记录，请刷新重试。'; if (missing) { rows = []; available = false; } }
      render();
    },
    reset() { rows = []; available = false; notice = ''; edit = null; mode = '30'; month = todaySG().slice(0, 7); search = ''; limit = 20; $('bp-dialog').close(); $('bp-form').reset(); $('bp-error').textContent = ''; render(); },
    busy(value) { busy = value; for (const id of ['bp-save', 'bp-delete', 'bp-close', 'bp-cancel']) $(id).disabled = value; render(); },
  };
}
