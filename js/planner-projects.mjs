import { PROJECT_STATUSES, parseProject, selectProjects, projectCounts } from './planner-projects-model.mjs?v=20261025-projects';
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const n=document.createElement(tag); n.className=cls; if (text !== undefined) n.textContent=text; return n; };
export function setupProjects({ client, getUser, canEdit, mutate, checkedWrite, allRows, toast, clearSearch }) {
  let rows=[], available=false, notice='', search='', status='all', sort='original', limit=50, busy=false, edit=null, conflict=false;
  const options={ dialog:true, dialogId:'project-dialog', errorTarget:'project-error' };
  const guard=() => { if (!canEdit()) return false; if (!available) { toast('项目尚未加载，请刷新后重试。'); return false; } return true; };
  function badge(value) { const s=PROJECT_STATUSES[value] || PROJECT_STATUSES.waiting; return el('span',`project-status ${s.color}`,s.label); }
  function tags(names) {
    const wrap=el('div','project-tags');
    for (const name of names || []) { let h=0; for (const ch of name) h=(h*31+ch.codePointAt(0))>>>0; wrap.append(el('span',`project-person tone-${h%6}`,name)); }
    if (!wrap.childNodes.length) wrap.append(el('span','project-blank','—')); return wrap;
  }
  function editButton(row) { const b=el('button','project-name',row.title); b.type='button'; b.disabled=busy; b.title=`编辑项目：${row.title}`; b.addEventListener('click',()=>open(row)); return b; }
  function render() {
    $('projects-notice').textContent=notice || (!available ? '正在加载项目…' : ''); $('projects-notice').hidden=available && !notice;
    const counts=projectCounts(rows), filters=$('project-filters'); filters.replaceChildren();
    for (const [value,label] of [['all','全部'],...Object.entries(PROJECT_STATUSES).map(([s,v])=>[s,v.label])]) {
      const b=el('button','project-filter'); b.type='button'; b.dataset.projectStatus=value; b.setAttribute('aria-pressed',String(status===value)); b.append(el('span','',label),el('span','project-filter-count',String(counts[value]))); b.disabled=busy;
      b.addEventListener('click',()=>{ status=value; limit=50; render(); }); filters.append(b);
    }
    $('project-sort').value=sort; $('project-sort').disabled=busy;
    const selected=selectProjects(rows,{search,status,sort}), shown=selected.slice(0,limit);
    $('project-count').textContent=`${selected.length} 个项目${selected.length > limit ? ` · 已显示 ${shown.length} 个` : ''}`;
    const table=$('project-table-body'), cards=$('project-cards'); table.replaceChildren(); cards.replaceChildren();
    for (const row of shown) {
      const tr=el('tr',''); tr.dataset.projectId=row.id;
      for (const value of [editButton(row),badge(row.status),tags(row.collaborators),row.output,row.reflection,row.findings]) { const td=el('td',''); if (typeof value==='string') { td.textContent=value || '—'; if (!value) td.classList.add('project-blank'); } else td.append(value); tr.append(td); } table.append(tr);
      const card=el('article','project-card'); card.dataset.projectId=row.id;
      const top=el('div','project-card-top'); top.append(editButton(row),badge(row.status)); card.append(top,tags(row.collaborators));
      const dl=el('dl','');
      for (const [label,value] of [['产出',row.output],['问题反思',row.reflection],['有趣发现',row.findings]]) { const group=el('div',''); group.append(el('dt','',label),el('dd',value ? '' : 'project-blank',value || '—')); dl.append(group); } card.append(dl); cards.append(card);
    }
    $('projects-empty').hidden=selected.length>0 || !available; $('projects-empty').textContent=rows.length ? '没有符合筛选条件的项目。' : '还没有项目，点击“新建项目”开始记录。';
    $('project-table-wrap').hidden=!shown.length; $('project-more').hidden=selected.length<=limit; $('project-more').disabled=busy;
  }
  function open(row=null) {
    if (!guard()) return; edit=row ? structuredClone(row) : null; conflict=false; $('project-form').reset(); $('project-error').textContent='';
    $('project-dialog-title').textContent=row ? '编辑项目' : '新建项目';
    for (const field of ['title','status','output','reflection','findings','notes']) $(`project-${field}`).value=row?.[field] || (field==='status' ? 'waiting' : '');
    $('project-collaborators').value=(row?.collaborators || []).join('\n'); $('project-delete').hidden=!row; $('project-dialog').showModal(); $('project-title').focus();
  }
  $('project-form').addEventListener('submit',async(e)=>{
    e.preventDefault(); if (!guard()) return;
    if (conflict) { $('project-error').textContent='项目已在其他设备修改，请关闭弹窗并重新打开。'; return; }
    let values; try { values=parseProject(Object.fromEntries(['title','status','collaborators','output','reflection','findings','notes'].map((f)=>[f,$(`project-${f}`).value]))); } catch(error) { $('project-error').textContent=error.message; return; }
    await mutate(async()=>{
      try { await checkedWrite(edit ? client.from('planner_projects').update(values).eq('id',edit.id).eq('updated_at',edit.updated_at)
        : client.from('planner_projects').insert({...values,user_id:getUser().id,sort_order:Math.min(1000000000,rows.reduce((max,r)=>Math.max(max,r.sort_order),0)+1)})); }
      catch(error) { if (error.message==='conflict' || error.code==='23505') conflict=true; throw error; }
      // A changed status/search must not make a successfully saved row seem lost.
      status='all'; search=''; clearSearch(); limit=Math.max(limit,rows.length+1);
    },'项目已保存',options);
  });
  $('project-delete').addEventListener('click',async()=>{
    if (!guard() || !edit) return;
    if (conflict) { $('project-error').textContent='项目已在其他设备修改，请关闭弹窗并重新打开。'; return; }
    if (!confirm(`确定删除“${edit.title}”？`)) return;
    await mutate(async()=>{ try { await checkedWrite(client.from('planner_projects').delete().eq('id',edit.id).eq('updated_at',edit.updated_at)); } catch(error) { if (error.message==='conflict') conflict=true; throw error; } },'项目已删除',options);
  });
  const close=()=>{ if (!busy) $('project-dialog').close(); };
  $('project-close').addEventListener('click',close); $('project-cancel').addEventListener('click',close); $('project-dialog').addEventListener('cancel',(e)=>{ if (busy) e.preventDefault(); });
  $('project-sort').addEventListener('change',()=>{sort=$('project-sort').value; limit=50; render();}); $('project-more').addEventListener('click',()=>{limit+=50;render();});
  for (const [value,s] of Object.entries(PROJECT_STATUSES)) { const option=el('option','',s.label); option.value=value; $('project-status').append(option); }
  return {
    open, search(value) { if (search!==value) limit=50; search=value; render(); },
    fetch(userId) { return allRows('planner_projects',userId); }, backup(userId) { return allRows('planner_projects',userId); },
    apply(result) { if (result.status==='fulfilled') { rows=result.value;available=true;notice=''; } else { const missing=['PGRST205','42P01','42501'].includes(result.reason?.code);notice=missing ? '项目管理尚未启用，请联系站主完成配置。' : '项目同步失败，保留上次加载的项目，请刷新重试。'; if (missing) {rows=[];available=false;} } render(); },
    reset() { rows=[];available=false;notice='';search='';status='all';sort='original';limit=50;edit=null;conflict=false;$('project-dialog').close();$('project-form').reset();$('project-error').textContent='';render(); },
    busy(value) { busy=value; for (const id of ['project-save','project-delete','project-close','project-cancel']) $(id).disabled=value; render(); },
  };
}
