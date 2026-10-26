export const PROJECT_STATUSES = {
  waiting: { label: '待启动', color: 'gray' },
  planned: { label: '计划中', color: 'amber' },
  in_progress: { label: '进行中', color: 'blue' },
  completed: { label: '已完成', color: 'green' },
  failed: { label: '失败', color: 'brown' },
  unspecified: { label: '未设置', color: 'gray' },
};
const length = (s) => [...s].length;
export function parseProject(values) {
  const row = {};
  for (const [field, max, label] of [['title',200,'项目名称'],['output',1000,'产出'],['reflection',5000,'问题反思'],['findings',5000,'有趣发现'],['notes',10000,'备注']]) {
    row[field] = String(values[field] || '').trim();
    if (length(row[field]) > max) throw new Error(`${label}最多 ${max} 字。`);
  }
  if (!row.title) throw new Error('请填写项目名称。');
  if (!Object.hasOwn(PROJECT_STATUSES, values.status)) throw new Error('请选择有效的项目状态。');
  row.status = values.status;
  if (values.is_archived !== undefined && typeof values.is_archived !== 'boolean') throw new Error('请选择有效的归档选项。');
  row.is_archived = values.is_archived === true;
  row.collaborators = [...new Set(String(values.collaborators || '').split(/[\n,，;；、]+/).map((s) => s.trim()).filter(Boolean))];
  if (row.collaborators.length > 50 || row.collaborators.some((s) => length(s) > 80)) throw new Error('合作者最多 50 人，每个姓名最多 80 字。');
  return row;
}
export function selectProjects(rows, { search = '', status = 'all', sort = 'original', view = 'home' } = {}) {
  const query = search.trim().toLocaleLowerCase();
  const selected = rows.filter((r) => (view === 'all' || !r.is_archived) && (status === 'all' || r.status === status) &&
    [r.title, PROJECT_STATUSES[r.status]?.label, ...(r.collaborators || []), r.output, r.reflection, r.findings, r.notes].join(' ').toLocaleLowerCase().includes(query));
  const original = (a,b) => (a.sort_order || 0)-(b.sort_order || 0) || (a.created_at || '').localeCompare(b.created_at || '') || a.id.localeCompare(b.id);
  const ranks = { in_progress:0, planned:1, waiting:2, completed:3, failed:4, unspecified:5 };
  return selected.sort((a,b) => (sort === 'status' ? (ranks[a.status] ?? 6)-(ranks[b.status] ?? 6) : sort === 'updated' ? (b.updated_at || '').localeCompare(a.updated_at || '') : sort === 'name' ? a.title.localeCompare(b.title,'zh-CN') : 0) || original(a,b));
}
export function projectCounts(rows, { view = 'home' } = {}) {
  const scoped = rows.filter((r) => view === 'all' || !r.is_archived);
  const counts = Object.fromEntries(Object.keys(PROJECT_STATUSES).map((s) => [s, 0]));
  for (const r of scoped) if (Object.hasOwn(counts,r.status)) counts[r.status]++;
  return { all: scoped.length, home: rows.filter((r) => !r.is_archived).length, total: rows.length, ...counts };
}
export function projectFieldPatch(row, field, value) {
  if (!['title','status','collaborators','output','reflection','findings','notes','is_archived'].includes(field)) throw new Error('这个字段不能直接编辑。');
  return { [field]: parseProject({ ...row, collaborators: (row.collaborators || []).join('\n'), [field]: value })[field] };
}
