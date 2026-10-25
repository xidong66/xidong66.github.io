import test from 'node:test';
import assert from 'node:assert/strict';
import { parseProject, selectProjects, projectCounts } from '../js/planner-projects-model.mjs';
const input={title:'研究项目',status:'in_progress',collaborators:'A Person, B Person\nA Person；C Person',output:'论文',reflection:'检查实验设计',findings:'保留观察',notes:''};
test('project form normalizes collaborators without losing full names or optional fields',()=>{
  const row=parseProject(input); assert.deepEqual(row.collaborators,['A Person','B Person','C Person']);assert.equal(row.findings,'保留观察');
  assert.deepEqual(parseProject({...input,collaborators:'',output:'',reflection:'',findings:''}).collaborators,[]);
});
test('project validation rejects blank titles, unknown statuses and excessive contributors',()=>{
  assert.throws(()=>parseProject({...input,title:'  '}),/项目名称/);
  assert.throws(()=>parseProject({...input,status:'__proto__'}),/状态/);
  assert.throws(()=>parseProject({...input,collaborators:Array.from({length:51},(_,i)=>`Person ${i}`).join('\n')}),/50/);
  assert.throws(()=>parseProject({...input,collaborators:'A'.repeat(81)}),/80/);
  assert.throws(()=>parseProject({...input,findings:'字'.repeat(5001)}),/5000/);
  assert.equal(parseProject({...input,title:'🧪'.repeat(200)}).title,'🧪'.repeat(200));
});
const rows=[
 {id:'b',title:'先记录的项目',status:'completed',sort_order:1,collaborators:['Person Alpha'],output:'Journal',reflection:'留足时间',findings:'验证发现',notes:'备注专用',updated_at:'2026-10-01'},
 {id:'c',title:'正在做的项目',status:'in_progress',sort_order:2,collaborators:[],updated_at:'2026-10-02'},
 {id:'a',title:'另一个同序项目',status:'waiting',sort_order:2,collaborators:[],updated_at:'2026-10-03'},
];
test('original project order has stable tie breaking and never mutates the loaded array',()=>{
 const ids=rows.map(r=>r.id);assert.deepEqual(selectProjects(rows).map(r=>r.id),['b','a','c']);assert.deepEqual(rows.map(r=>r.id),ids);
});
test('search covers collaborators, outcome, reflection, findings, notes and status with case folding',()=>{
 for(const search of ['ALPHA','journal','留足时间','验证发现','备注专用','已完成']) assert.deepEqual(selectProjects(rows,{search}).map(r=>r.id),['b']);
 assert.equal(selectProjects(rows,{search:'alpha',status:'in_progress'}).length,0);
});
test('status and update sorting preserve distinct projects with the same title',()=>{
 assert.deepEqual(selectProjects(rows,{sort:'status'}).map(r=>r.id),['c','a','b']);
 assert.deepEqual(selectProjects(rows,{sort:'updated'}).map(r=>r.id),['a','c','b']);
 assert.equal(selectProjects([...rows,{...rows[0],id:'d'}],{search:'先记录'}).length,2);
});
test('counts retain all six status buckets, including empty projects',()=>{
 assert.deepEqual(projectCounts(rows),{all:3,waiting:1,planned:0,in_progress:1,completed:1,failed:0,archived:0});
 assert.equal(projectCounts([]).all,0);
});
