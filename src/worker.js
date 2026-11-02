const json = (data, status = 200) => Response.json(data, {status, headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function validateIdea(input) {
 if (!input || typeof input !== 'object') throw new Error('入力が不正です');
 const string = (key, max) => { if(typeof input[key] !== 'string' || input[key].length > max) throw new Error(`${key}の入力を確認してください`); return input[key].trim(); };
 const title=string('title',160); if(!title) throw new Error('タイトルを入力してください');
 if(!['lab','external','spark'].includes(input.kind)) throw new Error('分類が不正です');
 const body=string('body',10000), author=string('author',80), source=string('source',2000);
 if(source && !/^https?:\/\//i.test(source)) throw new Error('URLはhttp(s)で入力してください');
 for(const key of ['tags','related']) if(!Array.isArray(input[key]) || input[key].length>30 || input[key].some(v=>typeof v!=='string'||v.length>100)) throw new Error(`${key}が不正です`);
 return {title,kind:input.kind,body,author,source,tags:[...new Set(input.tags)],related:[...new Set(input.related)]};
}
async function authorized(request, env) {
 if(!env.LAB_TOKEN) return false;
 const actual=request.headers.get('Authorization') || '';
 const digest=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
 const [a,b]=await Promise.all([digest(actual),digest(`Bearer ${env.LAB_TOKEN}`)]);
 let difference=0; for(let i=0;i<a.length;i++) difference|=a[i]^b[i]; return difference===0;
}
export default {async fetch(request,env) {
 const url=new URL(request.url);
 if(url.pathname==='/api/config' && request.method==='GET') return json({allowDemo:env.APP_MODE==='demo'});
 if(!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
 if(!await authorized(request,env)) return json({error:env.LAB_TOKEN?'研究室のアクセスキーを確認してください':'サーバーのアクセスキーが未設定です'},401);
 if(!env.DB) return json({error:'データベースが未設定です'},503);
 if(request.method!=='GET' && request.headers.get('Origin') && request.headers.get('Origin')!==url.origin) return json({error:'許可されていないアクセスです'},403);
 try {
  if(url.pathname==='/api/ideas' && request.method==='GET') {
   const {results}=await env.DB.prepare('SELECT * FROM ideas ORDER BY updated_at DESC LIMIT 2001').all();
   if(results.length>2000) return json({error:'2000件を超えました。ページ分割の追加が必要です'},409);
   return json(results.map(r=>({...r,tags:JSON.parse(r.tags),related:JSON.parse(r.related)})));
  }
  const match=url.pathname.match(/^\/api\/ideas\/([\w-]{1,100})$/);
  if(url.pathname==='/api/ideas' && request.method==='POST' || match && request.method==='PUT') {
   if(Number(request.headers.get('Content-Length'))>32000) return json({error:'入力が大きすぎます'},413);
   const raw=await request.text(); if(raw.length>32000) return json({error:'入力が大きすぎます'},413);
   let v; try {v=validateIdea(JSON.parse(raw));} catch(e) {return json({error:e.message},400);}
   const id=match?match[1]:crypto.randomUUID(),now=new Date().toISOString();
   if(match) {
    const result=await env.DB.prepare('UPDATE ideas SET title=?,kind=?,body=?,author=?,tags=?,source=?,related=?,updated_at=? WHERE id=?').bind(v.title,v.kind,v.body,v.author,JSON.stringify(v.tags),v.source,JSON.stringify(v.related),now,id).run();
    if(!result.meta.changes) return json({error:'この記録は削除されています'},404);
   } else await env.DB.prepare('INSERT INTO ideas VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,v.title,v.kind,v.body,v.author,JSON.stringify(v.tags),v.source,JSON.stringify(v.related),now,now).run();
   return json({id},match?200:201);
  }
  if(match && request.method==='DELETE') {await env.DB.prepare('DELETE FROM ideas WHERE id=?').bind(match[1]).run();return json({ok:true});}
  return json({error:'見つかりません'},404);
 } catch(e) {console.error('D1 request failed',e.name);return json({error:'保存先に接続できません。時間をおいて再試行してください'},503);}
}};
