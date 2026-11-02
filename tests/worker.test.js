import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker,{validateIdea} from '../src/worker.js';
const example={title:'新しい研究の種',kind:'spark',body:'教授との雑談',author:'テスト',tags:['LLM'],source:'',related:[]};
test('public config defaults to shared mode without exposing credentials',async()=>{const response=await worker.fetch(new Request('https://lab.test/api/config'),{LAB_TOKEN:'private-key'});assert.deepEqual(await response.json(),{allowDemo:false});const demo=await worker.fetch(new Request('https://lab.test/api/config'),{APP_MODE:'demo',LAB_TOKEN:'private-key'});assert.deepEqual(await demo.json(),{allowDemo:true});});
function database(){const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../migrations/0001_initial.sql',import.meta.url),'utf8'));return {prepare(sql){return {bind(...args){return {async run(){const result=db.prepare(sql).run(...args);return {meta:{changes:Number(result.changes)}};}};},async all(){return {results:db.prepare(sql).all()};}};}};}
test('validation rejects unsafe links, empty titles and invalid classifications',()=>{assert.throws(()=>validateIdea({...example,source:'javascript:alert(1)'}));assert.throws(()=>validateIdea({...example,title:'  '}));assert.throws(()=>validateIdea({...example,kind:'other'}));assert.throws(()=>validateIdea({...example,tags:Array(31).fill('a')}));assert.equal(validateIdea({...example,title:'  seed  '}).title,'seed');});
test('API refuses missing credentials and unconfigured servers',async()=>{for(const env of [{},{LAB_TOKEN:'correct'}]){const r=await worker.fetch(new Request('https://lab.test/api/ideas'),env);assert.equal(r.status,401);}});
test('CRUD stores Japanese, quotes and links using bound parameters',async()=>{
 const env={LAB_TOKEN:'test-key',DB:database()};
 const request=(path='',method='GET',body)=>worker.fetch(new Request('https://lab.test/api/ideas'+path,{method,headers:{Authorization:'Bearer test-key','Content-Type':'application/json',Origin:'https://lab.test'},...(body?{body:JSON.stringify(body)}:{})}),env);
 const created=await request('','POST',{...example,title:"研究'); DROP TABLE ideas; --"});assert.equal(created.status,201);const {id}=await created.json();
 const list=await (await request()).json();assert.equal(list.length,1);assert.deepEqual(list[0].tags,['LLM']);
 assert.equal((await request('/'+id,'PUT',{...example,title:'編集済み'})).status,200);assert.equal((await (await request()).json())[0].title,'編集済み');
 assert.equal((await request('/'+id,'DELETE')).status,200);assert.equal((await (await request()).json()).length,0);
 assert.equal((await request('/'+id,'PUT',example)).status,404);
});
test('cross origin writes and invalid bodies are rejected',async()=>{const env={LAB_TOKEN:'test-key',DB:database()};const r=await worker.fetch(new Request('https://lab.test/api/ideas',{method:'POST',headers:{Authorization:'Bearer test-key',Origin:'https://other.test'},body:JSON.stringify(example)}),env);assert.equal(r.status,403);const bad=await worker.fetch(new Request('https://lab.test/api/ideas',{method:'POST',headers:{Authorization:'Bearer test-key'},body:'bad json'}),env);assert.equal(bad.status,400);});
