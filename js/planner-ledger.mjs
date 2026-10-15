import { CURRENCIES, LEDGER_CATEGORIES, parseCents, decimal, money, nextMonth, nextDue } from './planner-ledger-model.mjs?v=20261016-ledger';
import { todaySG } from './planner-model.mjs?v=20261016-colors';
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const node = document.createElement(tag); node.className = cls; if (text !== undefined) node.textContent = text; return node; };
const option = (value, label) => { const node = document.createElement('option'); node.value = value; node.textContent = label; return node; };
const action = (label, handler, cls = 'quiet') => { const node = el('button', cls, label); node.type = 'button'; node.addEventListener('click', handler); return node; };

export function setupLedger({ client, getUser, canEdit, mutate, checkedWrite, allRows, reload, toast }) {
  let month = todaySG().slice(0, 7), dataMonth = '', search = '', filter = 'all';
  let accounts = [], entries = [], rules = [], monthly = [];
  let available = false, notice = '', busy = false, edit = null;
  const guard = () => { if (!canEdit()) return false; if (!available) { toast('记账数据尚未加载，请刷新后重试。'); return false; } return true; };
  const accountName = (id) => accounts.find((a) => a.id === id)?.name || '待分配账户';
  const categoryName = (row) => LEDGER_CATEGORIES[row.kind]?.[row.category] || '其他';
  const write = (query, message) => mutate(() => checkedWrite(query), message, { dialog: true, dialogId: 'ledger-dialog', errorTarget: 'ledger-error' });
  function controls() {
    $('ledger-month').value = month;
    $('ledger-month').max = todaySG().slice(0, 7);
    $('ledger-previous').disabled = busy || month <= '2000-01';
    $('ledger-next').disabled = busy || month >= todaySG().slice(0, 7);
    $('ledger-month').disabled = busy;
  }
  function render() {
    controls();
    const loaded = available && dataMonth === month;
    $('ledger-notice').textContent = notice || (!loaded ? '正在加载本月记账数据…' : '');
    $('ledger-notice').hidden = !notice && loaded;
    const summaries = $('ledger-summary'); summaries.replaceChildren();
    if (dataMonth === month) for (const [currency, info] of Object.entries(CURRENCIES)) {
      const row = monthly.find((r) => r.currency === currency) || {};
      const income = BigInt(row.income_cents || 0), expense = BigInt(row.expense_cents || 0);
      const card = el('div', 'ledger-summary-card'); card.dataset.currency = currency; card.style.setProperty('--ledger-color', info.color);
      card.append(el('span', 'ledger-currency-label', `${info.label} · ${currency}`), el('span', 'ledger-summary-label', '本月支出'), el('strong', 'ledger-total', money(expense, currency)));
      const meta = el('div', 'ledger-summary-meta');
      meta.append(el('span', '', `收入 ${money(income, currency)}`), el('span', '', `结余 ${money(income - expense, currency)}`)); card.append(meta); summaries.append(card);
    }
    const accountList = $('ledger-accounts'); accountList.replaceChildren();
    for (const account of accounts) {
      const card = action('', () => openAccount(account), 'ledger-account-card'); card.dataset.accountId = account.id;
      card.append(el('span', 'ledger-account-name', account.name), el('span', 'ledger-account-currency', `${CURRENCIES[account.currency].label} · 账面余额`), el('strong', 'ledger-account-balance', money(account.balance_cents, account.currency)));
      accountList.append(card);
    }
    if (!accounts.length && available) accountList.append(el('p', 'ledger-empty', '添加自己的银行卡、现金或电子钱包，分别记录余额。也可以先直接记一笔。'));
    const selector = $('ledger-filter'); selector.replaceChildren(option('all', '全部流水'), option('unassigned', '只看待分配账户'));
    accounts.forEach((a) => selector.append(option(a.id, a.name)));
    if (filter !== 'all' && filter !== 'unassigned' && !accounts.some((a) => a.id === filter)) filter = 'all';
    selector.value = filter;
    const list = $('ledger-entries'); list.replaceChildren();
    const current = dataMonth === month ? entries.filter((row) => !row.voided) : [];
    const pending = current.filter((row) => !row.account_id).length;
    $('ledger-pending').textContent = `${pending} 笔待分配`;
    $('ledger-pending').hidden = !pending;
    const visible = current.filter((row) => (filter === 'all' || (filter === 'unassigned' ? !row.account_id : row.account_id === filter))
      && `${row.title} ${row.notes} ${categoryName(row)} ${accountName(row.account_id)}`.toLocaleLowerCase().includes(search))
      .sort((a, b) => b.entry_date.localeCompare(a.entry_date) || b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id));
    $('ledger-entry-count').textContent = `${visible.length} 笔`;
    for (const row of visible) {
      const card = el('div', 'ledger-entry'); card.dataset.entryId = row.id;
      const copy = action('', () => openEntry(row), 'ledger-entry-copy');
      copy.append(el('strong', '', row.title), el('span', 'ledger-entry-meta', `${row.entry_date} · ${categoryName(row)}${row.rule_id ? ' · 每月自动' : ''}`));
      const amount = el('strong', `ledger-entry-amount ${row.kind}`, `${row.kind === 'income' ? '+' : '−'}${money(row.amount_cents, row.currency)}`);
      const account = action(accountName(row.account_id), () => { openEntry(row); $('ledger-record-account').focus(); }, `ledger-assignment${row.account_id ? '' : ' is-pending'}`);
      account.title = row.account_id ? '更换账户' : '补选这笔流水对应的银行卡或钱包';
      card.append(copy, amount, account); list.append(card);
    }
    if (!visible.length && available) list.append(el('p', 'ledger-empty', search || filter !== 'all' ? '没有符合条件的流水。' : '这个月还没有流水。点“记一笔”，金额填好就可以保存。'));
    const ruleList = $('ledger-rules'); ruleList.replaceChildren();
    const activeRules = rules.filter((r) => !r.removed);
    $('ledger-rule-count').textContent = activeRules.length;
    for (const rule of activeRules) {
      const card = el('div', `ledger-rule${rule.enabled ? '' : ' paused'}`); card.dataset.ruleId = rule.id;
      const copy = action('', () => openRule(rule), 'ledger-rule-copy');
      const next = nextDue(rule, todaySG());
      copy.append(el('strong', '', rule.title), el('span', 'ledger-entry-meta', `每月 ${rule.day_of_month} 日 · ${accountName(rule.account_id)} · ${!rule.enabled ? '已暂停' : next ? `下次 ${next}` : '已结束'}`));
      const amount = el('span', `ledger-entry-amount ${rule.kind}`, `${rule.kind === 'income' ? '+' : '−'}${money(rule.amount_cents, rule.currency)}`);
      const toggle = action(rule.enabled ? '暂停' : '启用', () => { if (guard()) mutate(() => checkedWrite(client.from('planner_ledger_rules').update({ enabled: !rule.enabled }).eq('id', rule.id).eq('updated_at', rule.updated_at)), rule.enabled ? '固定收支已暂停' : '固定收支已启用'); });
      card.append(copy, amount, toggle); ruleList.append(card);
    }
    if (!activeRules.length && available) ruleList.append(el('p', 'ledger-empty', '房租、会员订阅、工资等固定收支，可以按月自动生成记账流水。'));
    document.querySelectorAll('#ledger-panel button').forEach((button) => { if (busy) button.disabled = true; }); controls();
  }
  function fillCategories(kind, selected = 'other') {
    $('ledger-record-category').replaceChildren(...Object.entries(LEDGER_CATEGORIES[kind]).map(([value, label]) => option(value, label)));
    $('ledger-record-category').value = selected in LEDGER_CATEGORIES[kind] ? selected : 'other';
  }
  function fillAccounts(currency, selected = '') {
    $('ledger-record-account').replaceChildren(option('', '暂不选账户，先记下来'));
    accounts.filter((a) => a.currency === currency).forEach((a) => $('ledger-record-account').append(option(a.id, a.name)));
    $('ledger-record-account').value = accounts.some((a) => a.id === selected && a.currency === currency) ? selected : '';
  }
  function openBase(type, row) {
    if (!guard()) return false;
    edit = { type, row: row ? { ...row } : null };
    $('ledger-form').reset(); $('ledger-error').textContent = '';
    $('ledger-account-fields').hidden = type !== 'account'; $('ledger-record-fields').hidden = type === 'account';
    $('ledger-rule-fields').hidden = type !== 'rule'; $('ledger-entry-date-wrap').hidden = type !== 'entry';
    $('ledger-account-name').required = type === 'account'; $('ledger-opening').required = type === 'account';
    for (const id of ['ledger-record-amount', 'ledger-record-kind', 'ledger-record-currency']) $(id).required = type !== 'account';
    $('ledger-record-date').required = type === 'entry'; $('ledger-rule-day').required = type === 'rule'; $('ledger-rule-start').required = type === 'rule';
    // Hidden required controls must not block native form validation.
    for (const [id, enabled] of [['ledger-account-fields', type === 'account'], ['ledger-record-fields', type !== 'account']]) $(id).querySelectorAll('input,select,textarea').forEach((input) => { input.disabled = !enabled; });
    $('ledger-rule-fields').querySelectorAll('input').forEach((input) => { input.disabled = type !== 'rule'; });
    $('ledger-record-date').disabled = type !== 'entry';
    $('ledger-delete').hidden = !row;
    $('ledger-save').textContent = type === 'account' ? '保存账户' : type === 'rule' ? '保存固定收支' : '保存这笔';
    $('ledger-dialog-title').textContent = `${row ? '编辑' : '新建'}${type === 'account' ? '自己的账户' : type === 'rule' ? '每月固定收支' : '流水'}`;
    return true;
  }
  function openAccount(row = null) {
    if (!openBase('account', row)) return;
    $('ledger-account-name').value = row?.name || '';
    $('ledger-account-currency').value = row?.currency || 'CNY';
    $('ledger-opening').value = decimal(row?.opening_cents || 0);
    const used = row && (row.entry_count > 0 || rules.some((r) => r.account_id === row.id));
    $('ledger-account-currency').disabled = !!used;
    $('ledger-account-help').textContent = '例如人民币银行卡、英国银行卡、新加坡银行卡、现金。初始金额不计入月度收入；已有流水的账户不能更换币种。';
    $('ledger-dialog').showModal(); $('ledger-account-name').focus();
  }
  function openRecord(type, row) {
    if (!openBase(type, row)) return false;
    const currency = row?.currency || 'CNY';
    $('ledger-record-title').value = row?.title || '';
    $('ledger-record-kind').value = row?.kind || 'expense';
    $('ledger-record-currency').value = currency;
    $('ledger-record-amount').value = row ? decimal(row.amount_cents) : '';
    $('ledger-record-notes').value = row?.notes || '';
    fillCategories(row?.kind || 'expense', row?.category || 'other'); fillAccounts(currency, row?.account_id || '');
    return true;
  }
  function openEntry(row = null) {
    if (!openRecord('entry', row)) return;
    $('ledger-record-date').max = todaySG();
    $('ledger-record-date').value = row?.entry_date || (month < todaySG().slice(0, 7) ? `${month}-01` : todaySG());
    $('ledger-record-help').textContent = row?.rule_id ? '这次修改只影响当前这笔流水，后续月份仍按固定规则生成。' : '只填金额就能记账；账户、用途和备注可以以后补充。';
    $('ledger-dialog').showModal(); $('ledger-record-amount').focus();
  }
  function openRule(row = null) {
    if (!openRecord('rule', row)) return;
    $('ledger-rule-day').value = row?.day_of_month || new Date(`${todaySG()}T00:00:00Z`).getUTCDate();
    $('ledger-rule-start').value = row?.start_month.slice(0, 7) || todaySG().slice(0, 7);
    $('ledger-rule-end').value = row?.end_month?.slice(0, 7) || '';
    $('ledger-rule-enabled').checked = row?.enabled ?? true;
    $('ledger-record-help').textContent = '每月到期自动记一笔，不会从银行卡实际扣款。已有流水不随规则修改而改变。';
    $('ledger-dialog').showModal(); $('ledger-record-title').focus();
  }
  $('ledger-form').addEventListener('submit', async (event) => {
    event.preventDefault(); if (!guard() || !edit) return;
    try {
      const { type, row } = edit;
      if (type === 'account') {
        const changes = { name: $('ledger-account-name').value.trim(), currency: $('ledger-account-currency').value, opening_cents: parseCents($('ledger-opening').value, true) };
        if (!changes.name) throw new Error('请填写账户名称。');
        await write(row ? client.from('planner_ledger_accounts').update(changes).eq('id', row.id).eq('updated_at', row.updated_at) : client.from('planner_ledger_accounts').insert({ ...changes, user_id: getUser().id }), '账户已保存');
        return;
      }
      const changes = {
        title: $('ledger-record-title').value.trim() || LEDGER_CATEGORIES[$('ledger-record-kind').value][$('ledger-record-category').value],
        kind: $('ledger-record-kind').value, currency: $('ledger-record-currency').value,
        amount_cents: parseCents($('ledger-record-amount').value), category: $('ledger-record-category').value,
        account_id: $('ledger-record-account').value || null, notes: $('ledger-record-notes').value.trim(),
      };
      if (changes.amount_cents <= 0) throw new Error('金额必须大于 0。');
      if (type === 'entry') {
        changes.entry_date = $('ledger-record-date').value;
        if (!changes.entry_date || changes.entry_date > todaySG()) throw new Error('记账日期不能晚于今天。');
        await mutate(async () => {
          await checkedWrite(row ? client.from('planner_ledger_entries').update(changes).eq('id', row.id).eq('updated_at', row.updated_at) : client.from('planner_ledger_entries').insert({ ...changes, user_id: getUser().id }));
          month = changes.entry_date.slice(0, 7);
        }, '这笔已记好', { dialog: true, dialogId: 'ledger-dialog', errorTarget: 'ledger-error' });
      } else {
        changes.day_of_month = Number($('ledger-rule-day').value);
        changes.start_month = `${$('ledger-rule-start').value}-01`;
        changes.end_month = $('ledger-rule-end').value ? `${$('ledger-rule-end').value}-01` : null;
        changes.enabled = $('ledger-rule-enabled').checked;
        if (changes.end_month && changes.end_month < changes.start_month) throw new Error('结束月份不能早于起始月份。');
        await write(row ? client.from('planner_ledger_rules').update(changes).eq('id', row.id).eq('updated_at', row.updated_at) : client.from('planner_ledger_rules').insert({ ...changes, user_id: getUser().id }), '固定收支已保存，已到期月份会自动入账');
      }
    } catch (error) { $('ledger-error').textContent = error.message; }
  });
  $('ledger-delete').addEventListener('click', async () => {
    if (!guard() || !edit?.row) return;
    const { type, row } = edit;
    const message = type === 'account' ? '确定删除这个账户？已有流水或固定规则的账户不能删除。' : type === 'rule' ? '确定删除这条固定收支规则？已记账流水会保留。' : '确定删除这笔流水？余额和月度统计会同步更新；自动生成的流水也不会被再次补记。';
    if (!confirm(message)) return;
    const table = type === 'account' ? 'planner_ledger_accounts' : type === 'rule' ? 'planner_ledger_rules' : 'planner_ledger_entries';
    const query = type === 'account' ? client.from(table).delete() : client.from(table).update(type === 'rule' ? { enabled: false, removed: true } : { voided: true });
    await write(query.eq('id', row.id).eq('updated_at', row.updated_at), '已删除');
  });
  $('ledger-record-kind').addEventListener('change', () => fillCategories($('ledger-record-kind').value));
  $('ledger-record-currency').addEventListener('change', () => fillAccounts($('ledger-record-currency').value, $('ledger-record-account').value));
  const close = () => { if (!busy) $('ledger-dialog').close(); };
  $('ledger-close').addEventListener('click', close); $('ledger-cancel').addEventListener('click', close);
  $('ledger-dialog').addEventListener('cancel', (event) => { if (busy) event.preventDefault(); });
  $('ledger-add-account').addEventListener('click', () => openAccount());
  $('ledger-add-rule').addEventListener('click', () => openRule());
  function changeMonth(value) {
    if (!/^\d{4}-\d{2}$/.test(value) || value < '2000-01' || value > todaySG().slice(0, 7)) { controls(); return; }
    month = value; render(); reload();
  }
  $('ledger-previous').addEventListener('click', () => changeMonth(nextMonth(month, -1)));
  $('ledger-next').addEventListener('click', () => changeMonth(nextMonth(month)));
  $('ledger-current').addEventListener('click', () => changeMonth(todaySG().slice(0, 7)));
  $('ledger-month').addEventListener('change', () => changeMonth($('ledger-month').value));
  $('ledger-filter').addEventListener('change', () => { filter = $('ledger-filter').value; render(); });
  return {
    open: openEntry,
    search(value) { search = value; render(); },
    async fetch(userId) {
      const selected = month;
      const { error } = await client.rpc('planner_ledger_refresh'); if (error) throw error;
      const [accountRows, ruleRows, entryRows, summary] = await Promise.all([
        allRows('planner_ledger_balances', userId), allRows('planner_ledger_rules', userId),
        allRows('planner_ledger_entries', userId, (q) => q.gte('entry_date', `${selected}-01`).lt('entry_date', `${nextMonth(selected)}-01`).eq('voided', false)),
        client.from('planner_ledger_monthly').select('*').eq('user_id', userId).eq('month', `${selected}-01`),
      ]);
      if (summary.error) throw summary.error;
      return { month: selected, accounts: accountRows, rules: ruleRows, entries: entryRows, monthly: summary.data };
    },
    apply(result) {
      if (result.status === 'fulfilled') {
        if (result.value.month !== month) return;
        ({ accounts, rules, entries, monthly } = result.value); dataMonth = month; available = true; notice = '';
      } else {
        notice = ['PGRST205', 'PGRST202', '42P01', '42501'].includes(result.reason?.code) ? '记账功能尚未启用，请联系站主完成配置。' : '记账同步失败，请刷新后重试。已有记录仍保存在云端。';
      }
      render();
    },
    async backup(userId) {
      const [accountRows, ruleRows, entryRows] = await Promise.all(['planner_ledger_accounts', 'planner_ledger_rules', 'planner_ledger_entries'].map((table) => allRows(table, userId)));
      return { accounts: accountRows, rules: ruleRows, entries: entryRows };
    },
    busy(value) {
      busy = value;
      document.querySelectorAll('#ledger-panel button,#ledger-dialog button').forEach((button) => { button.disabled = value; }); controls();
    },
    reset() {
      accounts = []; entries = []; rules = []; monthly = []; dataMonth = ''; month = todaySG().slice(0, 7); available = false; notice = ''; search = ''; filter = 'all'; edit = null;
      $('ledger-dialog').close(); $('ledger-form').reset(); $('ledger-record-account').replaceChildren(); $('ledger-error').textContent = ''; render();
    },
  };
}
