import { PROJECT_STATUSES, parseProject, selectProjects, projectCounts, projectFieldPatch } from './planner-projects-model.mjs?v=20261026-project-archive';
const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const n=document.createElement(tag); n.className=cls; if (text !== undefined) n.textContent=text; return n; };
const FIELDS={ title:'项目名称', status:'状态', collaborators:'合作者', output:'产出', reflection:'问题反思', findings:'有趣发现' };
export function setupProjects({ client, getUser, canEdit, mutate, checkedWrite, allRows, toast, clearSearch, errorMessage }) {
  let rows=[], available=false, notice='', actionError='', search='', status='all', view='home', sort='original', limit=50, busy=false, edit=null, conflict=false, inline=null;
  const options={ dialog:true, dialogId:'project-dialog', errorTarget:'project-error' };
  const guard=() => { if (!canEdit()) return false; if (!available) { toast('项目尚未加载，请刷新后重试。'); return false; } return true; };
  function badge(value) { const s=PROJECT_STATUSES[value] || PROJECT_STATUSES.waiting; return el('span',`project-status ${s.color}`,s.label); }
  function tags(names) {
    const wrap=el('span','project-tags');
    for (const name of names || []) { let h=0; for (const ch of name) h=(h*31+ch.codePointAt(0))>>>0; wrap.append(el('span',`project-person tone-${h%6}`,name)); }
    if (!wrap.childNodes.length) wrap.append(el('span','project-blank','点击填写')); return wrap;
  }
  function detailsButton(row) {
    const b=el('button','project-details quiet','编辑'); b.type='button'; b.disabled=busy; b.setAttribute('aria-label',`编辑项目详情：${row.title}`); b.addEventListener('click',()=>open(row)); return b;
  }
  function archiveButton(row) {
    const b=el('button','project-archive-control quiet',row.is_archived ? '取消归档' : '归档'); b.type='button'; b.disabled=busy;
    b.setAttribute('aria-label',`${row.is_archived ? '取消归档' : '归档'}项目：${row.title}`); b.setAttribute('aria-pressed',String(!!row.is_archived));
    b.addEventListener('click',()=>toggleArchive(row.id)); return b;
  }
  async function toggleArchive(id) {
    if (!(await saveInline()) || !guard()) return;
    const row=rows.find((r)=>r.id===id); if (!row) return;
    actionError='';
    await mutate(async()=>{
      try {
        const updated=await checkedWrite(client.from('planner_projects').update({is_archived:!row.is_archived}).eq('id',row.id).eq('updated_at',row.updated_at));
        rows=rows.map((r)=>r.id===updated.id ? updated : r);
      } catch(error) {actionError=errorMessage(error);throw error;}
    },row.is_archived ? '已取消归档，项目已回到首页' : '项目已归档，可在“全部”中查看');
  }
  function cell(row,field,view) {
    const host=el('div','project-cell'); Object.assign(host.dataset,{projectId:row.id,projectField:field,projectView:view});
    const b=el('button',`project-field${field==='title' ? ' project-name' : ''}`); b.type='button'; b.disabled=busy;
    b.title=`点击编辑${FIELDS[field]}`; b.setAttribute('aria-label',`编辑${FIELDS[field]}：${row.title}`);
    if (field==='status') b.append(badge(row.status));
    else if (field==='collaborators') b.append(tags(row.collaborators));
    else b.append(el('span',row[field] ? '' : 'project-blank',row[field] || '点击填写'));
    b.append(el('span','project-pencil','✎')); b.lastChild.setAttribute('aria-hidden','true');
    b.addEventListener('click',()=>startInline(row.id,field,view)); host.append(b); return host;
  }
  function updateInline() {
    if (!inline) return;
    const d=inline;
    d.input.disabled=busy || d.saving; d.save.disabled=busy || d.saving || d.conflict;
    d.cancel.disabled=busy || d.saving; d.message.textContent=d.error || (d.saving ? '正在保存…' : '离开此格自动保存');
    d.message.dataset.state=d.error ? 'error' : '';
  }
  function cancelInline() { if (inline?.saving) return; inline=null; render(); }
  function saveInline() {
    const d=inline;
    if (!d) return Promise.resolve(true);
    if (d.promise) return d.promise;
    if (d.composing) return Promise.resolve(false);
    if (d.conflict) { d.error='其他设备已修改，请保留所需内容，取消后重新编辑。'; updateInline(); return Promise.resolve(false); }
    let patch;
    try { patch=projectFieldPatch(d.row,d.field,d.input.value); } catch(error) { d.error=error.message; updateInline(); return Promise.resolve(false); }
    if (JSON.stringify(patch[d.field])===JSON.stringify(d.row[d.field])) { cancelInline(); return Promise.resolve(true); }
    if (!guard() || getUser()?.id!==d.userId) { d.error='尚未保存，请联网后点击保存。'; updateInline(); return Promise.resolve(false); }
    d.saving=true; d.error=''; updateInline();
    // A poll must not replace this draft or supply a newer version for its write.
    // Save only the edited field, using the version captured when editing began.
    d.promise=Promise.resolve().then(async()=>{
      const saved=await mutate(async()=>{
        try {
          const updated=await checkedWrite(client.from('planner_projects').update(patch).eq('id',d.row.id).eq('updated_at',d.row.updated_at));
          if (inline===d && getUser()?.id===d.userId) rows=rows.map((r)=>r.id===updated.id ? updated : r);
        }
        catch(error) { d.conflict=error.message==='conflict' || error.code==='23505'; d.error=errorMessage(error); throw error; }
      },'项目修改已保存');
      if (inline!==d) return saved;
      d.saving=false; d.promise=null;
      if (saved) { inline=null; render(); }
      else { d.error ||= '修改尚未保存，请重试。'; updateInline(); }
      return saved;
    });
    return d.promise;
  }
  async function startInline(id,field,view) {
    if (inline && !(await saveInline())) return;
    if (!guard()) return;
    const row=rows.find((r)=>r.id===id);
    const host=[...document.querySelectorAll('.project-cell')].find((n)=>n.dataset.projectId===id && n.dataset.projectField===field && n.dataset.projectView===view);
    if (!row || !host) return;
    const input=el(field==='status' ? 'select' : field==='title' ? 'input' : 'textarea','project-inline-input');
    input.setAttribute('aria-label',FIELDS[field]);
    if (field==='status') for (const [value,s] of Object.entries(PROJECT_STATUSES)) { const opt=el('option','',s.label); opt.value=value; input.append(opt); }
    if (input.tagName==='TEXTAREA') input.rows=field==='collaborators' ? 3 : 4;
    input.value=field==='collaborators' ? (row.collaborators || []).join('\n') : row[field] || '';
    const controls=el('div','project-inline-controls'), message=el('div','project-inline-message'); message.setAttribute('role','status');
    const save=el('button','quiet','保存'), cancel=el('button','quiet','取消'); save.type=cancel.type='button'; controls.append(save,cancel);
    const widget=el('div','project-inline-editor'); widget.append(input,controls,message); host.replaceChildren(widget);
    const d={row:structuredClone(row),field,userId:getUser().id,input,save,cancel,message,widget,error:'',saving:false,conflict:false,composing:false,promise:null}; inline=d;
    for (const b of [save,cancel]) b.addEventListener('pointerdown',(e)=>e.preventDefault());
    save.addEventListener('click',()=>saveInline()); cancel.addEventListener('click',cancelInline);
    input.addEventListener('compositionstart',()=>{d.composing=true;}); input.addEventListener('compositionend',()=>{d.composing=false;if(inline===d && !widget.contains(document.activeElement))saveInline();});
    input.addEventListener('input',()=>{if (!d.conflict) d.error='';updateInline();});
    input.addEventListener('keydown',(e)=>{
      if (e.isComposing || d.composing) return;
      if (e.key==='Escape') {e.preventDefault();e.stopPropagation();cancelInline();}
      else if (e.key==='Enter' && (input.tagName==='INPUT' || e.ctrlKey || e.metaKey)) {e.preventDefault();saveInline();}
    });
    widget.addEventListener('focusout',(e)=>{
      // These controls flush explicitly in their click/change handler. Saving
      // on pointer-down blur would disable or replace them before the click.
      if (e.relatedTarget?.closest('.project-cell,.project-details,.project-archive-control,.project-view-button,.project-filter,#project-sort,#project-more,#add-task,#sign-out,#refresh,#export')) return;
      queueMicrotask(()=>{if (inline===d && !widget.contains(document.activeElement) && !d.saving) saveInline();});
    });
    if (field==='status') input.addEventListener('change',()=>saveInline());
    updateInline(); input.focus(); if (input.tagName==='INPUT') input.select();
  }
  function render() {
    $('projects-notice').textContent=actionError || notice || (!available ? '正在加载项目…' : ''); $('projects-notice').hidden=available && !notice && !actionError;
    const counts=projectCounts(rows,{view}), filters=$('project-filters'); filters.replaceChildren();
    document.querySelectorAll('[data-project-view-filter]').forEach((b)=>{ b.setAttribute('aria-pressed',String(b.dataset.projectViewFilter===view)); b.disabled=busy; b.querySelector('span').textContent=String(b.dataset.projectViewFilter==='home' ? counts.home : counts.total); });
    for (const [value,label] of [['all','全部状态'],...Object.entries(PROJECT_STATUSES).filter(([s])=>s!=='unspecified' || counts.unspecified>0).map(([s,v])=>[s,v.label])]) {
      const b=el('button','project-filter'); b.type='button'; b.dataset.projectStatus=value; b.setAttribute('aria-pressed',String(status===value)); b.append(el('span','',label),el('span','project-filter-count',String(counts[value]))); b.disabled=busy;
      b.addEventListener('click',async()=>{if (!(await saveInline())) return;status=value;limit=50;render();}); filters.append(b);
    }
    $('project-sort').value=sort; $('project-sort').disabled=busy;
    const selected=selectProjects(rows,{search,status,sort,view}), shown=selected.slice(0,limit);
    $('project-count').textContent=`${selected.length} 个项目${selected.length>limit ? ` · 已显示 ${shown.length} 个` : ''}`;
    // Background polling and focus refresh keep the active editor mounted.
    if (inline) {updateInline();return;}
    const table=$('project-table-body'), cards=$('project-cards'); table.replaceChildren();cards.replaceChildren();
    for (const row of shown) {
      const tr=el('tr','');tr.dataset.projectId=row.id;
      for (const field of Object.keys(FIELDS)) {const td=el('td','');td.append(cell(row,field,'table'));tr.append(td);}
      if (row.is_archived) { tr.classList.add('is-archived'); tr.firstChild.append(el('span','project-archive-label','已归档')); }
      const actions=el('td','project-actions'), buttons=el('div','project-row-actions');buttons.append(detailsButton(row),archiveButton(row));actions.append(buttons);tr.append(actions);table.append(tr);
      const card=el('article','project-card');card.dataset.projectId=row.id;
      const top=el('div','project-card-top');top.append(cell(row,'title','card'),cell(row,'status','card'));card.append(top,cell(row,'collaborators','card'));
      const dl=el('dl','');
      for (const field of ['output','reflection','findings']) {const group=el('div','');const dd=el('dd','');dd.append(cell(row,field,'card'));group.append(el('dt','',FIELDS[field]),dd);dl.append(group);}
      const footer=el('div','project-card-actions');if(row.is_archived)footer.append(el('span','project-archive-label','已归档'));footer.append(detailsButton(row),archiveButton(row));card.append(dl,footer);cards.append(card);
    }
    $('projects-empty').hidden=selected.length>0 || !available;$('projects-empty').textContent=rows.length ? view==='home' && !counts.home ? '首页暂时没有项目，已归档项目可在“全部”中查看。' : '没有符合筛选条件的项目。' : '还没有项目，点击“新建项目”开始记录。';
    $('project-table-wrap').hidden=!shown.length;$('project-more').hidden=selected.length<=limit;$('project-more').disabled=busy;
  }
  async function open(row=null) {
    if (inline && !(await saveInline())) return;
    if (!guard()) return;
    if (row) {row=rows.find((r)=>r.id===row.id);if (!row) {toast('项目已被删除，请刷新后重试。');return;}}
    edit=row ? structuredClone(row) : null;conflict=false;$('project-form').reset();$('project-error').textContent='';
    $('project-dialog-title').textContent=row ? '编辑项目' : '新建项目';
    for (const field of ['title','status','output','reflection','findings','notes']) $(`project-${field}`).value=row?.[field] || (field==='status' ? 'waiting' : '');
    $('project-archived').checked=!!row?.is_archived;
    $('project-collaborators').value=(row?.collaborators || []).join('\n');$('project-delete').hidden=!row;$('project-dialog').showModal();$('project-title').focus();
  }
  $('project-form').addEventListener('submit',async(e)=>{
    e.preventDefault();if (!guard()) return;
    if (conflict) {$('project-error').textContent='项目已在其他设备修改，请关闭弹窗并重新打开。';return;}
    let values;try {values=parseProject({...Object.fromEntries(['title','status','collaborators','output','reflection','findings','notes'].map((f)=>[f,$(`project-${f}`).value])),is_archived:$('project-archived').checked});}catch(error){$('project-error').textContent=error.message;return;}
    await mutate(async()=>{
      try {await checkedWrite(edit ? client.from('planner_projects').update(values).eq('id',edit.id).eq('updated_at',edit.updated_at)
        : client.from('planner_projects').insert({...values,user_id:getUser().id,sort_order:Math.min(1000000000,rows.reduce((max,r)=>Math.max(max,r.sort_order),0)+1)}));}
      catch(error){if(error.message==='conflict' || error.code==='23505') conflict=true;throw error;}
      status='all';if(values.is_archived)view='all';search='';clearSearch();limit=Math.max(limit,rows.length+1);
    },'项目已保存',options);
  });
  $('project-delete').addEventListener('click',async()=>{
    if (!guard() || !edit) return;
    if (conflict){$('project-error').textContent='项目已在其他设备修改，请关闭弹窗并重新打开。';return;}
    if (!confirm(`确定删除“${edit.title}”？`)) return;
    await mutate(async()=>{try {await checkedWrite(client.from('planner_projects').delete().eq('id',edit.id).eq('updated_at',edit.updated_at));}catch(error){if(error.message==='conflict') conflict=true;throw error;}},'项目已删除',options);
  });
  const close=()=>{if(!busy)$('project-dialog').close();};
  $('project-close').addEventListener('click',close);$('project-cancel').addEventListener('click',close);$('project-dialog').addEventListener('cancel',(e)=>{if(busy)e.preventDefault();});
  $('project-sort').addEventListener('change',async()=>{const value=$('project-sort').value;if (!(await saveInline())) return;sort=value;limit=50;render();});$('project-more').addEventListener('click',async()=>{if (!(await saveInline())) return;limit+=50;render();});
  document.querySelectorAll('[data-project-view-filter]').forEach((b)=>b.addEventListener('click',async()=>{if (!(await saveInline()))return;view=b.dataset.projectViewFilter;status='all';limit=50;render();}));
  for(const [value,s] of Object.entries(PROJECT_STATUSES)){const option=el('option','',s.label);option.value=value;$('project-status').append(option);}
  return {
    open,flush:saveInline,search(value){if(search!==value)limit=50;search=value;render();},
    fetch(userId){return allRows('planner_projects',userId);},backup(userId){return allRows('planner_projects',userId);},
    apply(result){if(result.status==='fulfilled'){rows=result.value;available=true;notice='';}else{const missing=['PGRST205','42P01','42501'].includes(result.reason?.code);notice=missing ? '项目管理尚未启用，请联系站主完成配置。' : '项目同步失败，保留上次加载的项目，请刷新重试。';if(missing){rows=[];available=false;}}render();},
    reset(){inline=null;rows=[];available=false;notice='';actionError='';search='';status='all';view='home';sort='original';limit=50;edit=null;conflict=false;$('project-dialog').close();$('project-form').reset();$('project-error').textContent='';render();},
    busy(value){busy=value;for(const id of ['project-save','project-delete','project-close','project-cancel'])$(id).disabled=value;render();},
  };
}
