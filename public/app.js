import {seed} from './seed.js';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const kinds={lab:{name:'研究室内の研究',color:'#c0d6f4',class:'blue'},spark:{name:'先輩・教授のアイデア',color:'#c0e6d3',class:'green'},external:{name:'関連する外部の研究',color:'#f4dfa8',class:'yellow'}};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storageKey='labhub-demo-v1',favoriteKey='labhub-favorites-v1',positionKey='labhub-node-positions-v1';
let ideas=[],favorites=new Set(),view='graph',selected='s1',activeKinds=new Set(Object.keys(kinds)),query='',token='',shared=true,allowDemo=false,initialized=false,zoom=1,toastTimer,positions=new Map(),dragged=false;
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4200);}
function loadDemo(){try{const stored=localStorage.getItem(storageKey);ideas=stored?JSON.parse(stored):structuredClone(seed);if(!Array.isArray(ideas))throw Error();}catch{ideas=structuredClone(seed);toast('ブラウザの保存データを読めませんでした。サンプルを表示します');}try{favorites=new Set(JSON.parse(localStorage.getItem(favoriteKey)||'[]'));}catch{favorites=new Set();}}
function saveLocal(next){try{localStorage.setItem(storageKey,JSON.stringify(next));}catch{throw Error('ブラウザに保存できません。書き出して空き容量やブラウザの設定を確認してください');}}
function positionStorageKey(){return `${positionKey}-${shared?'shared':'demo'}`;}
function loadPositions(){
 positions=new Map();
 try{
  const stored=JSON.parse(localStorage.getItem(positionStorageKey())||'[]');
  if(!Array.isArray(stored))return;
  for(const entry of stored){
   if(!Array.isArray(entry)||entry.length!==2)continue;
   const [id,point]=entry;
   if(typeof id==='string'&&Array.isArray(point)&&point.length===2&&point.every(Number.isFinite))positions.set(id,[Math.max(70,Math.min(930,point[0])),Math.max(70,Math.min(550,point[1]))]);
  }
 }catch{ /* Use the initial layout if saved positions cannot be read. */ }
}
function savePositions(){try{localStorage.setItem(positionStorageKey(),JSON.stringify([...positions]));}catch{toast('ノードの位置を保存できませんでした。ブラウザの保存設定や空き容量を確認してください');}}
function visible(){return ideas.filter(v=>activeKinds.has(v.kind)&&(view!=='favorites'||favorites.has(v.id))&&[v.title,v.body,v.author,...v.tags].join(' ').toLowerCase().includes(query.toLowerCase())).sort((a,b)=>$('#sort').value==='oldest'?a.updated_at.localeCompare(b.updated_at):b.updated_at.localeCompare(a.updated_at));}
function related(a,b){return a.related.includes(b.id)||b.related.includes(a.id)||a.tags.some(t=>b.tags.includes(t));}
function badge(v){const k=kinds[v.kind];return `<span class="kind-badge ${k.class}"><i class="dot ${k.class}"></i>${k.name}</span>`;}
async function api(path='',options={}){const res=await fetch('/api/ideas'+path,{...options,headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'}});let data;try{data=await res.json();}catch{throw Error('共有サーバーに接続できません。ローカルサーバーの設定を確認してください');}if(!res.ok)throw Error(data.error||'保存先に接続できません');return data;}
async function refresh(){if(shared)ideas=await api();render();}
function render(){
 $('#add').disabled=!initialized||(shared&&!token);
 $('#export').disabled=!initialized||(shared&&!token);
 const rows=visible();if(!rows.some(v=>v.id===selected))selected=rows[0]?.id||null;
 $('#total').textContent=ideas.length;
 for(const k of Object.keys(kinds))$(`#${k}-count`).textContent=ideas.filter(v=>v.kind===k).length;
 $('#result-count').textContent=`${rows.length} 件`;
 $$('.view-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
 $('#graph-panel').hidden=view!=='graph';$('#list-panel').hidden=view==='graph';
 if(view==='graph')renderGraph(rows);else renderList(rows);
 renderDetail();
}
function initialPosition(v,index){
 if(positions.has(v.id))return positions.get(v.id);
 const layout={s1:[490,290],l1:[245,195],e1:[730,130],l2:[205,415],s2:[470,85],e2:[850,380],l3:[510,520],s3:[130,310],e3:[755,530],s4:[305,505],s5:[730,260]};
 const angle=index*2.399963;const r=160+Math.sqrt(index)*30;const point=layout[v.id]||[500+Math.cos(angle)*r,310+Math.sin(angle)*r*.75];positions.set(v.id,point);return point;
}
function graphLabel(v,r){
 let lines=[],line='',count=0;
 // Japanese takes more horizontal space than latin letters.
 for(const part of v.title.match(/[A-Za-z0-9]+|./gu)||[]){const w=[...part].reduce((n,c)=>n+(/[\u0000-\u00ff]/.test(c)?.55:1),0);if(line&&count+w>r/8.5){lines.push(line.trim());line='';count=0;}line+=part;count+=w;}
 if(line)lines.push(line);if(lines.length>4){lines=lines.slice(0,4);lines[3]=lines[3].slice(0,-1)+'…';}
 return `<text text-anchor="middle">${lines.map((line,i)=>`<tspan x="0" y="${(i-(lines.length-1)/2)*20+3}">${esc(line)}</tspan>`).join('')}</text>`;
}
function renderGraph(rows){
 const svg=$('#graph');if(!rows.length){svg.innerHTML='<text x="500" y="300" text-anchor="middle" fill="#899fa9" font-size="17">該当するストックがありません</text>';return;}
 // The graph shows the first 40 matching records; the list can show all records.
 const nodes=rows.slice(0,40);const all=ideas;
 nodes.forEach(v=>initialPosition(v,all.indexOf(v)));
 const edges=[];for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const a=nodes[i],b=nodes[j];if(!related(a,b))continue;const [x1,y1]=positions.get(a.id),[x2,y2]=positions.get(b.id);const explicit=a.related.includes(b.id)||b.related.includes(a.id);edges.push(`<line data-a="${esc(a.id)}" data-b="${esc(b.id)}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="edge ${explicit?'explicit':''} ${a.id===selected||b.id===selected?'highlight':''}"/>`);}
 svg.innerHTML=`<defs><filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#456574" flood-opacity=".06"/></filter></defs><g id="graph-scene">${edges.join('')}${nodes.map(v=>{const [x,y]=positions.get(v.id),r=v.id==='s1'?88:v.kind==='lab'?69:v.kind==='external'?64:59;return `<g class="graph-node ${v.id===selected?'selected':''}" data-id="${esc(v.id)}" tabindex="0" role="button" aria-label="${esc(v.title)}" transform="translate(${x},${y})"><title>${esc(v.title)} — ${kinds[v.kind].name}</title><circle class="node-circle" r="${r}" fill="${kinds[v.kind].color}" filter="url(#softShadow)"/>${graphLabel(v,r)}</g>`;}).join('')}</g>`;
 setZoom();
 $$('.graph-node').forEach(n=>{
  n.addEventListener('click',()=>{if(!dragged){selected=n.dataset.id;render();}});
  n.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selected=n.dataset.id;render();}});
  n.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragged=false;const start={x:e.clientX,y:e.clientY};n.setPointerCapture(e.pointerId);const move=ev=>{if(Math.hypot(ev.clientX-start.x,ev.clientY-start.y)>4)dragged=true;if(!dragged)return;const matrix=$('#graph-scene').getScreenCTM();if(!matrix)return;const p=new DOMPoint(ev.clientX,ev.clientY).matrixTransform(matrix.inverse());const pos=[Math.max(70,Math.min(930,p.x)),Math.max(70,Math.min(550,p.y))];positions.set(n.dataset.id,pos);n.setAttribute('transform',`translate(${pos[0]},${pos[1]})`);$$('.edge').forEach(edge=>{const side=edge.dataset.a===n.dataset.id?'1':edge.dataset.b===n.dataset.id?'2':null;if(side){edge.setAttribute('x'+side,pos[0]);edge.setAttribute('y'+side,pos[1]);}});};const end=()=>{if(dragged)savePositions();n.removeEventListener('pointermove',move);n.removeEventListener('pointerup',end);n.removeEventListener('pointercancel',end);};n.addEventListener('pointermove',move);n.addEventListener('pointerup',end);n.addEventListener('pointercancel',end);});
 });
 if(rows.length>40)$('#result-count').textContent=`${rows.length} 件（グラフは40件まで）`;
}
function setZoom(){const g=$('#graph-scene');if(g)g.setAttribute('transform',`translate(${500*(1-zoom)},${310*(1-zoom)}) scale(${zoom})`);$('#zoom-reset').textContent=Math.round(zoom*100)+'%';}
function renderList(rows){$('#list-panel').innerHTML=rows.length?rows.map(v=>`<button class="idea-card ${v.id===selected?'selected':''}" data-id="${esc(v.id)}">${badge(v)}<h3>${esc(v.title)}</h3><p>${esc(v.body||'まだメモがありません。気づいたことを追記してみましょう。')}</p><div class="card-meta"><span>${esc(v.author||'発案者未設定')}</span><span>${v.tags.slice(0,3).map(t=>'#'+esc(t)).join(' ')}</span></div></button>`).join(''):'<div class="empty"><strong>まだ、ここにストックはありません</strong>アイデアを追加するか、検索条件を変えてみましょう。</div>';$$('.idea-card').forEach(b=>b.onclick=()=>{selected=b.dataset.id;render();});}
function renderDetail(){
 const v=ideas.find(v=>v.id===selected);if(!v){$('#detail').innerHTML='<div class="empty"><strong>小さなひらめきから、はじめよう。</strong>「アイデアを追加」から<br>最初のストックを残せます。</div>';return;}
 const connections=ideas.filter(b=>b.id!==v.id&&related(v,b));
 const hasSource=/^https?:\/\//i.test(v.source);
 $('#detail').innerHTML=`
 <div class="detail-top"><button id="favorite" aria-label="${favorites.has(v.id)?'お気に入りから外す':'お気に入りに追加'}">${favorites.has(v.id)?'★':'☆'}</button></div>
 ${badge(v)}<h2>${esc(v.title)}</h2>
 <div class="author-line"><span class="avatar">${esc((v.author||'?')[0])}</span>${esc(v.author||'発案者未設定')}</div>
 <p class="detail-body">${esc(v.body||'まだメモがありません。編集から一言残してみましょう。')}</p>
 <div class="reference-block"><div class="reference-heading"><span>参考URL</span><button type="button" id="edit-source">${hasSource?'編集':'＋ URLを追加'}</button></div>
 ${hasSource?`<a class="source-link" href="${esc(v.source)}" target="_blank" rel="noopener noreferrer">${esc(v.source)} ↗</a>`:''}</div>
 <div class="detail-section">タグ</div><div class="tag-list">${v.tags.length?v.tags.map(t=>`<button class="tag" data-tag="${esc(t)}"># ${esc(t)}</button>`).join(''):'<span class="tag">未設定</span>'}</div>
 <div class="detail-section">つながっているストック <span style="color:#9bafb7;font-weight:400">${connections.length}</span></div>
 ${connections.length?connections.map(b=>`<button class="related-item" data-related="${esc(b.id)}"><i class="dot ${kinds[b.kind].class}"></i>${esc(b.title)}<span>↗</span></button>`).join(''):'<small style="color:#99a9b3;font-size:10px">タグや関連づけでつなげてみましょう。</small>'}
 <div class="detail-bottom"><button id="edit">✎ 編集する</button><button id="delete" aria-label="このストックを削除">削除</button></div>
 <div class="detail-date">更新 ${new Date(v.updated_at).toLocaleDateString('ja-JP')} · ${shared?'研究室で共有':'このブラウザのデモ'}</div>`;
 $('#favorite').onclick=()=>{const next=new Set(favorites);if(next.has(v.id))next.delete(v.id);else next.add(v.id);try{localStorage.setItem(favoriteKey,JSON.stringify([...next]));favorites=next;render();}catch{toast('お気に入りを保存できませんでした');}};
 $('#edit').onclick=()=>openEditor(v);
 $('#edit-source').onclick=()=>openEditor(v,'source');
 $('#delete').onclick=async()=>{if(!confirm(`「${v.title}」を削除しますか？`))return;try{if(shared){await api('/'+encodeURIComponent(v.id),{method:'DELETE'});await refresh();}else{const next=ideas.filter(b=>b.id!==v.id);next.forEach(b=>b.related=b.related.filter(id=>id!==v.id));saveLocal(next);ideas=next;}render();toast('ストックを削除しました');}catch(e){toast(e.message);}};
 $$('[data-related]').forEach(b=>b.onclick=()=>{selected=b.dataset.related;const target=ideas.find(v=>v.id===selected);query='';$('#search').value='';if(target)activeKinds.add(target.kind);if(view==='favorites')view='list';syncFilters();render();});
 $$('[data-tag]').forEach(b=>b.onclick=()=>{query=b.dataset.tag;$('#search').value=query;render();});
}
function openEditor(v,focusField='title'){const f=$('#idea-form');f.reset();for(const key of ['id','title','kind','body','author','source'])f.elements[key].value=v?v[key]:key==='kind'?'spark':'';f.elements.tags.value=v?v.tags.join(', '):'';f.elements.related.innerHTML=ideas.filter(b=>b.id!==v?.id).map(b=>`<option value="${esc(b.id)}" ${v?.related.includes(b.id)?'selected':''}>${esc(b.title)}</option>`).join('');$('#editor-title').textContent=v?'ストックを編集':'アイデアを残す';$('#editor').showModal();setTimeout(()=>f.elements[focusField].focus(),50);}
$('#idea-form').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,b=f.querySelector('[type=submit]');if(b.disabled)return;const v={title:f.elements.title.value.trim(),kind:f.elements.kind.value,body:f.elements.body.value.trim(),author:f.elements.author.value.trim(),source:f.elements.source.value.trim(),tags:[...new Set(f.elements.tags.value.split(/[,、]/).map(t=>t.trim().replace(/^#\s*/, '')).filter(Boolean))],related:[...f.elements.related.selectedOptions].map(o=>o.value)};if(!v.title)return; if(v.tags.length>30||v.tags.some(t=>t.length>100)){toast('タグは30個まで、1つ100文字以内で入力してください');return;}const existing=f.elements.id.value;b.disabled=true;try{if(shared){const result=await api(existing?'/'+encodeURIComponent(existing):'',{method:existing?'PUT':'POST',body:JSON.stringify(v)});selected=result.id;await refresh();}else{const now=new Date().toISOString(),old=ideas.find(b=>b.id===existing),id=old?.id||crypto.randomUUID();const next=ideas.filter(b=>b.id!==id).concat({...v,id,created_at:old?.created_at||now,updated_at:now});saveLocal(next);ideas=next;selected=id;}query='';$('#search').value='';activeKinds.add(v.kind);if(view==='favorites'&&!favorites.has(selected))view='list';syncFilters();$('#editor').close();render();toast(existing?'ストックを更新しました':'新しい研究の種をストックしました');}catch(err){toast(err.message);}finally{b.disabled=false;}};
function syncFilters(){$$('[data-kind]').forEach(b=>{b.classList.toggle('selected',activeKinds.has(b.dataset.kind));b.setAttribute('aria-pressed',String(activeKinds.has(b.dataset.kind)));});}
$$('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;render();});
$$('[data-kind]').forEach(b=>b.onclick=()=>{activeKinds.has(b.dataset.kind)?activeKinds.delete(b.dataset.kind):activeKinds.add(b.dataset.kind);syncFilters();render();});
$('#search').oninput=e=>{query=e.target.value;render();};$('#sort').onchange=render;
$('#add').onclick=()=>openEditor();
$$('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).close());
$('#zoom-in').onclick=()=>{zoom=Math.min(1.6,zoom+.1);setZoom();};$('#zoom-out').onclick=()=>{zoom=Math.max(.5,zoom-.1);setZoom();};$('#zoom-reset').onclick=()=>{zoom=1;setZoom();};
$('#settings').onclick=()=>$('#settings-dialog').showModal();
$('#connect').onclick=async()=>{const candidate=$('#token').value.trim();if(!candidate){toast('アクセスキーを入力してください');return;}const button=$('#connect');button.disabled=true;const oldToken=token;token=candidate;try{const records=await api();shared=true;ideas=records;selected=ideas[0]?.id||null;loadPositions();$('#token').value='';$('#settings-dialog').close();render();toast('D1 の共有ストックに接続しました。デモデータは転送されません');}catch(e){token=oldToken;toast(e.message);}finally{button.disabled=false;}};
$('#demo-mode').onclick=()=>{if(!allowDemo)return;shared=false;token='';$('#token').value='';loadDemo();selected='s1';loadPositions();$('#settings-dialog').close();render();toast('このブラウザのデモに戻りました');};
$('#export').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,exported_at:new Date().toISOString(),ideas},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`labhub-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('ストックをJSONで書き出しました');};
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!$('dialog[open]')){e.preventDefault();$('#search').focus();}});
async function initialize(){
 render();
 try {
  const response=await fetch('/api/config',{cache:'no-store'});
  if(!response.ok)throw Error('保存先の設定を読み込めません。ページを再読み込みしてください');
  const config=await response.json();
  allowDemo=config.allowDemo===true;shared=!allowDemo;
  $('#demo-mode').hidden=!allowDemo;
  if(allowDemo)loadDemo();
  else {
   $('#settings-dialog h2').textContent='共有ストックを開く';
   $('#settings-dialog p').textContent='研究室のアクセスキーを入力して、共有ストックを開いてください。';
   try{favorites=new Set(JSON.parse(localStorage.getItem(favoriteKey)||'[]'));}catch{favorites=new Set();}
  }
  loadPositions();initialized=true;syncFilters();render();
  if(shared)$('#settings-dialog').showModal();
 }catch(e){toast(e.message||'保存先に接続できません。ページを再読み込みしてください');}
}
initialize();
