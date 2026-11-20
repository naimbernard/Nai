/* Racquet Culture community app.
   Runs on its own in each browser until config.js is filled in; then everyone shares one database. */
'use strict';
const $=id=>document.getElementById(id);
const qsa=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const rid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const pad=n=>String(n).padStart(2,'0');
const today=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
const ls={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){toast('This device is out of storage space.')}},del(k){try{localStorage.removeItem(k)}catch(e){}}};

/* ---------- Preferences ---------- */
const sysCalm=matchMedia('(prefers-reduced-motion: reduce)').matches;
let prefs=Object.assign({calm:sysCalm,haptics:true},ls.get('rc_prefs',{}));
const calm=()=>!!prefs.calm;
function applyPrefs(){document.documentElement.classList.toggle('calm',calm())}
function setPref(k,v){prefs[k]=v;ls.set('rc_prefs',prefs);applyPrefs()}
const tick=()=>{try{if(prefs.haptics&&navigator.vibrate)navigator.vibrate(10)}catch(e){}};
applyPrefs();

/* ---------- Sports, levels and the level questions ---------- */
/* Padel uses the 0 to 7 scale most clubs and apps use. Pickleball uses the 1.0 to 5.5+ skill rating scale.
   scale: how many level points make a big favourite. K: how far one match can move a level. */
const SPORTS={
  padel:{name:'Padel',min:0.5,max:7,scale:1.5,K:0.10,cut:[2.5,4.5],
    bands:{beginner:[0.5,2.4],intermediate:[2.5,4.4],pro:[4.5,7.0]},setName:'Set',maxRows:3},
  pickleball:{name:'Pickleball',min:1,max:6,scale:0.8,K:0.07,cut:[3.0,4.0],
    bands:{beginner:[1.0,2.9],intermediate:[3.0,3.9],pro:[4.0,5.5]},setName:'Game',maxRows:3}
};
const SP_KEYS=Object.keys(SPORTS);
const TIERS=[['beginner','Beginner'],['intermediate','Intermediate'],['pro','Pro']];
const TIER_NAME={beginner:'Beginner',intermediate:'Intermediate',pro:'Pro'};
const tierOf=(sp,r)=>{const c=SPORTS[sp].cut;return r<c[0]?'beginner':r<c[1]?'intermediate':'pro'};
const clampL=(sp,v)=>clamp(+v,SPORTS[sp].min,SPORTS[sp].max);
const fmtL=(v,d=2)=>(+v).toFixed(d);
const fmtD=d=>(d>0?'+':d<0?'−':'±')+Math.abs(d).toFixed(2);
const dcls=d=>d>0.004?'up':d<-0.004?'down':'flat';

/* Questions follow how clubs, coaches and rating guides describe each level online.
   Each answer has a weight from 0 (bottom of the band) to 1 (top of the band). */
const QS={
 padel:{
  beginner:[
   ['How long have you been playing padel?',[['Just started, my first few games',0],['A few months',.5],['Over a year, casually',1]]],
   ['Have you played tennis, squash or another racket sport?',[['No',0],['A little',.5],['Yes, regularly',1]]],
   ['Can you keep a friendly rally going?',[['Only a few shots',0],['5 or 6 shots at an easy pace',.5],['Yes, comfortably',1]]],
   ['When the ball comes off the back glass, you…',[['Usually miss it',0],['Return the easy ones',.6],['Return most of them',1]]],
   ['Do you know the rules: scoring, the underarm serve and playing off the walls?',[['Still learning',0],['Mostly',.5],['Yes, all of it',1]]]],
  intermediate:[
   ['Balls off the back glass and side walls?',[['Back glass is fine, corners are hard',.2],['Most of them, including double walls',.6],['Comfortably, and I can counter-attack',1]]],
   ['How do you use the lob?',[['Mostly to get out of trouble',.2],['Placed deep to push them back',.6],['A weapon to take the net',1]]],
   ['At the net, when they lob you…',[['I smash everything or let it bounce',.1],['I play a bandeja to keep the net',.6],['Bandeja and víbora, with direction',1]]],
   ['Moving with your partner?',[['We sometimes get split up',.2],['We move up and back together',.6],['We control the net and the transitions as a pair',1]]],
   ['Your volleys?',[['Forehand fine, backhand less so',.2],['Both sides, with control',.6],['Both sides, placed with pace or touch',1]]],
   ['Where do you play?',[['Social games only',.2],['Club leagues or Americanos',.6],['Regular tournaments, winning some',1]]]],
  pro:[
   ['Your overheads?',[['Solid bandeja and víbora',.2],['Plus the smash over the fence (por 3)',.55],['Por 3 and por 4 out of the court, at will',1]]],
   ['Attacking from the back of the court?',[['I defend well and reset the point',.2],['Chiquitas and low balls to win the net back',.6],['I turn defence into attack against strong pairs',1]]],
   ['Highest level you compete at?',[['Regional tournaments',.2],['National ranking events',.6],['International (FIP or pro tour)',1]]],
   ['How often do you train or play?',[['1 or 2 times a week',.1],['3 or 4 times a week',.5],['Daily, with a coach',1]]],
   ['Against 4.5+ players you usually…',[['Hold your own',.2],['Win more than you lose',.6],['Dominate',1]]]]
 },
 pickleball:{
  beginner:[
   ['How long have you been playing pickleball?',[['Just started, my first few games',0],['A few months',.5],['Over a year, casually',1]]],
   ['Have you played tennis, badminton or another racket sport?',[['No',0],['A little',.5],['Yes, regularly',1]]],
   ['Can you serve and return serve consistently?',[['Not yet',0],['Most of the time',.6],['Almost always',1]]],
   ['Do you know the kitchen (non-volley zone) rule and how to call the score?',[['Still learning',0],['Mostly',.5],['Yes',1]]],
   ['Can you keep a soft dink rally going?',[['Not yet',0],['A few dinks',.5],['Yes, several in a row',1]]]],
  intermediate:[
   ['Your third shot?',[['I mostly drive it',.2],['I try drops, some land',.5],['A reliable drop or drive, my choice',1]]],
   ['After you return serve, you…',[['Stay back',.1],['Move up sometimes',.5],['Always get to the kitchen line',1]]],
   ['Dink rallies?',[['Short, then someone pops it up',.2],['I can dink patiently on both sides',.6],['I move them around and wait for the ball to attack',1]]],
   ['Fast exchanges at the net?',[['I struggle',.1],['I can block and reset',.6],['I win speed-ups and counter',1]]],
   ['Your backhand?',[['My weak side',.2],['Consistent',.6],['A weapon, drops and rolls included',1]]],
   ['Where do you play?',[['Social games only',.2],['Club ladders or leagues',.6],['Tournaments at 3.5 and above',1]]]],
  pro:[
   ['Shot variety?',[['Drops, drives and resets are solid',.2],['Plus spin serves and topspin rolls',.6],['Plus Ernes and around-the-post shots',1]]],
   ['Under pressure in transition?',[['I reset most balls',.3],['I rarely pop it up',.6],['I turn defence into attack',1]]],
   ['Highest level you compete at?',[['Local tournaments at 4.0',.2],['Regional or national at 4.5+',.6],['Pro or 5.0+ events',1]]],
   ['Stacking and strategy?',[['I know how it works',.2],['We use it every game',.6],['I plan around the opponents’ weaknesses',1]]],
   ['Against 4.0+ players you usually…',[['Hold your own',.2],['Win more than you lose',.6],['Dominate',1]]]]
 }
};
const levelFrom=(sp,band,ans)=>{const [lo,hi]=SPORTS[sp].bands[band];return Math.round((lo+(hi-lo)*avg(ans.map(x=>+x||0)))*10)/10};

/* ---------- Avatars ----------
   Place-holder pixel avatars for now. To use your own artwork later, put the files in an "avatars" folder
   and change an entry to {id:'a1',src:'avatars/a1.png'}. Anyone who picked that id gets the new picture. */
const AVATARS=Array.from({length:12},(_,i)=>({id:'px'+(i+1),seed:i+1}));
const PALS=[['#6045a7','#dcf55a'],['#24184a','#8b6fe6'],['#dcf55a','#2b1d55'],['#1a5a4a','#9df2c8'],['#ff8a9b','#3b1630'],['#f5f2fc','#6045a7'],['#3a2775','#ffb86b'],['#0f3b4f','#7fd6ff'],['#5a1f45','#ffc2e0'],['#203018','#c5f07a'],['#40306e','#ffffff'],['#e9e3ff','#3b2775']];
function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const pxCache={};
function pixelSVG(seed){
 if(pxCache[seed])return pxCache[seed];
 const r=rng(seed*7919+13),[bg,fg]=PALS[(seed-1)%PALS.length],N=8;let s='';
 for(let y=0;y<N;y++)for(let x=0;x<N/2;x++){const on=y===0||y===N-1?r()>.75:r()>.48;if(!on)continue;
  const acc=r()>.86;const col=acc?bg==='#dcf55a'?'#6045a7':'#dcf55a':fg;
  s+=`<rect x="${x+1}" y="${y+1}" width="1" height="1" fill="${col}"/><rect x="${N-x}" y="${y+1}" width="1" height="1" fill="${col}"/>`}
 return pxCache[seed]=`<svg viewBox="0 0 10 10" shape-rendering="crispEdges" aria-hidden="true"><rect width="10" height="10" fill="${bg}"/>${s}</svg>`;
}
const safeSrc=s=>typeof s==='string'&&(/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(s)||/^avatars\/[\w.-]+$/.test(s));
const initials=p=>{const n=(p&&(p.name||p.username)||'?').trim().split(/\s+/);return((n[0]||'?')[0]+(n.length>1?n[n.length-1][0]:'')).toUpperCase()};
function avHTML(p,size){
 const st=size?` style="width:${size}px;height:${size}px;font-size:${Math.round(size*.36)}px"`:'',a=p&&p.avatar;
 if(a&&a.kind==='img'&&safeSrc(a.src))return `<span class="av"${st}><img src="${a.src}" alt=""></span>`;
 if(a&&a.kind==='preset'){const d=AVATARS.find(x=>x.id===a.id);if(d&&d.src&&safeSrc(d.src))return `<span class="av"${st}><img src="${d.src}" alt=""></span>`;if(d)return `<span class="av"${st}>${pixelSVG(d.seed)}</span>`}
 return `<span class="av"${st}>${esc(initials(p))}</span>`;
}
/* Photos are cropped to a square and shrunk to 320 pixels so they load fast for everyone */
function readPhoto(file){return new Promise((res,rej)=>{
 if(!file||!/^image\//.test(file.type))return rej(new Error('Choose a photo file.'));
 if(file.size>15*1024*1024)return rej(new Error('That photo is too large. Choose one under 15 MB.'));
 const url=URL.createObjectURL(file),img=new Image();
 img.onload=()=>{const S=320,c=document.createElement('canvas');c.width=c.height=S;const k=Math.min(img.width,img.height),sx=(img.width-k)/2,sy=(img.height-k)/2;
  c.getContext('2d').drawImage(img,sx,sy,k,k,0,0,S,S);URL.revokeObjectURL(url);res(c.toDataURL('image/jpeg',.85))};
 img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('That photo could not be opened. Try a JPG or PNG.'))};img.src=url;
})}

/* ---------- Storage: this device (until config.js is filled in) or the shared live database ---------- */
const errc=(code,msg)=>Object.assign(new Error(msg||code),{code});
async function sha(s){
 try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
 catch(e){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return 'f'+(h>>>0).toString(16)}
}
const LIVE=window.RC_LIVE||{};
let sb=null;
const Local={
 mode:'local',
 async init(){},
 async session(){return ls.get('rc_session',null)},
 async taken(u){return !!ls.get('rc_accounts',{})[u.toLowerCase()]},
 async signUp(name,username,pw){
  const acc=ls.get('rc_accounts',{}),k=username.toLowerCase();if(acc[k])throw errc('taken');
  const id='u_'+rid(),salt=rid()+rid();acc[k]={id,salt,hash:await sha(salt+'|'+pw)};ls.set('rc_accounts',acc);
  const ps=ls.get('rc_profiles',[]);ps.push({id,username,name,setup:false,created:new Date().toISOString()});ls.set('rc_profiles',ps);
  ls.set('rc_session',id);return id;
 },
 async signIn(username,pw){const a=ls.get('rc_accounts',{})[username.toLowerCase()];if(!a||a.hash!==await sha(a.salt+'|'+pw))throw errc('nomatch');ls.set('rc_session',a.id);return a.id},
 async signOut(){ls.del('rc_session')},
 async load(){return{profiles:ls.get('rc_profiles',[]),matches:ls.get('rc_matches',[])}},
 async saveProfile(p){const ps=ls.get('rc_profiles',[]),i=ps.findIndex(x=>x.id===p.id);if(i>=0)ps[i]=p;else ps.push(p);ls.set('rc_profiles',ps)},
 async addMatch(m){const ms=ls.get('rc_matches',[]);ms.push(m);ls.set('rc_matches',ms)},
 async delMatch(id){ls.set('rc_matches',ls.get('rc_matches',[]).filter(m=>m.id!==id))}
};
/* Live: Supabase accounts. The username is turned into a private sign-in address, so players never need an email. */
const emailFor=async u=>'p'+(await sha('rc|'+u.trim().toLowerCase())).slice(0,40)+'@'+(LIVE.emailDomain||'players.racquetculture.app');
const flat=r=>Object.assign({},r.data||{},{id:r.id,username:r.username,name:r.name});
const Live={
 mode:'live',
 async init(){
  sb=window.supabase.createClient(LIVE.url,LIVE.key);
  sb.channel('rc-live').on('postgres_changes',{event:'*',schema:'public',table:'rc_profiles'},onRemote)
   .on('postgres_changes',{event:'*',schema:'public',table:'rc_matches'},onRemote).subscribe();
 },
 async session(){const {data}=await sb.auth.getSession();return data.session?data.session.user.id:null},
 async taken(u){const {data,error}=await sb.rpc('rc_username_taken',{u});if(error)throw error;return !!data},
 async signUp(name,username,pw){
  const {data,error}=await sb.auth.signUp({email:await emailFor(username),password:pw,options:{data:{name,username}}});
  if(error){if(/already|registered|exists/i.test(error.message))throw errc('taken');throw error}
  if(!data.session)throw errc('confirm');
  await this.saveProfile({id:data.user.id,username,name,setup:false,created:new Date().toISOString()});
  return data.user.id;
 },
 async signIn(username,pw){const {data,error}=await sb.auth.signInWithPassword({email:await emailFor(username),password:pw});
  if(error){if(/invalid|credentials/i.test(error.message))throw errc('nomatch');if(/confirm/i.test(error.message))throw errc('confirm');throw error}return data.user.id},
 async signOut(){await sb.auth.signOut()},
 async load(){
  const all=async(t,cols)=>{const out=[];for(let f=0;;f+=1000){const {data,error}=await sb.from(t).select(cols).order('id').range(f,f+999);if(error)throw error;out.push(...data);if(data.length<1000)return out}};
  const [p,m]=await Promise.all([all('rc_profiles','id,username,name,data'),all('rc_matches','id,data')]);
  return{profiles:p.map(flat),matches:m.map(r=>Object.assign({},r.data,{id:r.id}))};
 },
 async saveProfile(p){const {id,username,name,...data}=p;const {error}=await sb.from('rc_profiles').upsert({id,username,name,data,updated_at:new Date().toISOString()});if(error)throw error},
 async addMatch(m){const {error}=await sb.from('rc_matches').insert({id:m.id,data:m});if(error)throw error},
 async delMatch(id){const {error}=await sb.from('rc_matches').delete().eq('id',id);if(error)throw error}
};
const Store=LIVE.url&&LIVE.key&&window.supabase?Live:Local;

/* ---------- App state ---------- */
const S={uid:null,profiles:[],matches:[],R:{padel:{},pickleball:{}},D:{}};
let view={tab:'home',rs:null,rt:null,pf:{q:'',sport:'',inv:false,time:''}};
const me=()=>S.profiles.find(p=>p.id===S.uid)||null;
const prof=id=>S.profiles.find(p=>p.id===id)||null;
async function reload(){const d=await Store.load();S.profiles=d.profiles||[];S.matches=d.matches||[];rate()}

/* ---------- Ratings ----------
   Every match is replayed in date order from each player's starting level, so everyone sees the same numbers.
   Each team's strength is the average of its players' levels. Beating a stronger team earns more,
   losing to a weaker one costs more, so a strong player with a newer partner is not punished for it.
   New players move faster for their first matches so their level settles quickly. */
function totals(sets){let a=0,b=0;(sets||[]).forEach(s=>{a+=+s[0]||0;b+=+s[1]||0});return[a,b]}
function applyMatch(R,m,ensure){
 const sp=SPORTS[m.sport];if(!sp)return null;
 const lv=s=>s.uid?(R[s.uid]||ensure(s.uid,clampL(m.sport,+s.level||avg(sp.bands.intermediate)))).r:clampL(m.sport,+s.level||sp.min);
 const ta=avg(m.a.map(lv)),tb=avg(m.b.map(lv)),ea=1/(1+Math.pow(10,(tb-ta)/sp.scale)),sa=m.winner==='a'?1:0;
 const [ga,gb]=totals(m.sets),share=ga+gb?ga/(ga+gb):.5,mult=.8+.8*Math.abs(share-.5);
 const out={};
 [[m.a,sa,ea],[m.b,1-sa,1-ea]].forEach(([team,s,e])=>team.forEach(sl=>{if(!sl.uid)return;const E=R[sl.uid],k=sp.K*(E.n<5?2:E.n<15?1.4:1),before=E.r;
  E.r=clampL(m.sport,E.r+k*mult*(s-e));const d=E.r-before;E.n++;if(s)E.w++;else E.l++;E.last=d;E.hist.push({id:m.id,d,r:E.r,date:m.date});out[sl.uid]=d}));
 return{d:out,ea,ta,tb};
}
const okMatch=m=>m&&SPORTS[m.sport]&&Array.isArray(m.a)&&Array.isArray(m.b)&&m.a.length&&m.b.length&&(m.winner==='a'||m.winner==='b');
const byWhen=(x,y)=>(x.date||'').localeCompare(y.date||'')||(x.at||'').localeCompare(y.at||'');
function rate(){
 const R={},D={};SP_KEYS.forEach(sp=>R[sp]={});
 const mk=(sp,id,l)=>R[sp][id]={r:l,start:l,n:0,w:0,l:0,hist:[],last:0};
 S.profiles.forEach(p=>SP_KEYS.forEach(sp=>{const L=p.levels&&p.levels[sp];if(L&&isFinite(+L.start))mk(sp,p.id,clampL(sp,L.start))}));
 S.matches.filter(okMatch).sort(byWhen).forEach(m=>{D[m.id]=applyMatch(R[m.sport],m,(id,l)=>mk(m.sport,id,l))});
 S.R=R;S.D=D;
}
/* What a result would do, without saving it */
function preview(m){
 const R={},mk=(id,l)=>R[id]={r:l,start:l,n:0,w:0,l:0,hist:[],last:0};
 [...m.a,...m.b].forEach(s=>{if(s.uid){const e=S.R[m.sport][s.uid];if(e)R[s.uid]=Object.assign({},e,{hist:[]})}});
 return applyMatch(R,m,mk);
}
const lvlOf=(sp,id)=>{const e=S.R[sp][id];return e?e.r:null};
function rankOf(sp,id){const e=S.R[sp][id];if(!e||!e.n)return null;const t=tierOf(sp,e.r);
 const list=Object.entries(S.R[sp]).filter(([pid,x])=>x.n&&prof(pid)&&tierOf(sp,x.r)===t).sort((a,b)=>b[1].r-a[1].r);
 return{pos:list.findIndex(([pid])=>pid===id)+1,of:list.length,tier:t}}

/* ---------- Small pieces of polish ---------- */
function toast(msg,ms=2600){const el=document.createElement('div');el.className='toast';el.textContent=msg;$('toasts').appendChild(el);
 setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),400)},ms)}
function doneTick(){const el=document.createElement('div');el.className='done';el.setAttribute('aria-hidden','true');
 el.innerHTML='<svg viewBox="0 0 76 76"><circle cx="38" cy="38" r="36"/><path d="M23 39l10 10 20-22"/></svg>';document.body.appendChild(el);tick();setTimeout(()=>el.remove(),1500)}
const greet=()=>{const h=new Date().getHours();return h<5?'Late night':h<12?'Good morning':h<17?'Good afternoon':'Good evening'};
const first=p=>(p&&p.name||'').trim().split(/\s+/)[0]||p&&p.username||'';
function splash(big,small){
 qsa('.splash').forEach(x=>x.remove());const el=document.createElement('div');el.className='splash';el.setAttribute('aria-hidden','true');
 el.innerHTML=`<div><img src="logo.png" alt=""><p class="s1">${esc(small)}</p><p class="s2">${esc(big)}</p></div>`;
 document.body.appendChild(el);setTimeout(()=>el.remove(),calm()?700:2000);
}
function dateLabel(iso){if(!iso)return'';const t=today(),d=new Date(iso+'T12:00:00'),y=new Date(Date.now()-864e5);
 if(iso===t)return'Today';if(iso===y.getFullYear()+'-'+pad(y.getMonth()+1)+'-'+pad(y.getDate()))return'Yesterday';
 return d.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}

/* ---------- Sliding pill ("glider"): remembers where it was and glides to the new choice after each redraw ---------- */
const glideMem={};
function glide(bar,on,key){
 let t=bar.querySelector(':scope>.glider');
 if(!t){t=document.createElement('span');t.className='glider';t.setAttribute('aria-hidden','true');bar.prepend(t)}
 if(!on||!on.offsetWidth){t.style.opacity='0';return}
 const to={x:on.offsetLeft,y:on.offsetTop,w:on.offsetWidth,h:on.offsetHeight},from=glideMem[key];glideMem[key]=to;
 const put=p=>{t.style.transform=`translate(${p.x}px,${p.y}px)`;t.style.width=p.w+'px';t.style.height=p.h+'px'};
 if(!t.dataset.ready){t.style.transition='none';put(from||to);t.style.opacity='1';t.getBoundingClientRect();t.style.transition='';t.dataset.ready='1'}
 t.style.opacity='1';put(to);
}
function syncGliders(){
 qsa('.seg').forEach(g=>glide(g,g.querySelector(':scope>button[aria-checked="true"]'),'seg|'+(g.dataset.key||'')));
 const d=$('dock');if(d&&!$('app').hidden)glide(d,d.querySelector(':scope>button[aria-current="page"]'),'dock');
}
addEventListener('resize',()=>{syncGliders();if(V.el&&document.contains(V.el))vSet(V.pos||0)});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{syncGliders();if(V.el&&document.contains(V.el))vDraw()});

/* ---------- Track that swells around a held handle (shared by the option bars and the verify slider) ---------- */
function warpPath(W,H,r,cx,hw,b){
 const f=n=>n.toFixed(1),L=Math.max(r,cx-hw*1.7),R=Math.min(W-r,cx+hw*1.7);
 const top=b>.05?`L${f(L)},0 C${f((L+cx)/2)},0 ${f(cx-hw*.55)},${f(-b)} ${f(cx)},${f(-b)} C${f(cx+hw*.55)},${f(-b)} ${f((R+cx)/2)},0 ${f(R)},0 `:'';
 const bot=b>.05?`L${f(R)},${H} C${f((R+cx)/2)},${H} ${f(cx+hw*.55)},${f(H+b)} ${f(cx)},${f(H+b)} C${f(cx-hw*.55)},${f(H+b)} ${f((L+cx)/2)},${H} ${f(L)},${H} `:'';
 return `M${r},0 ${top}L${W-r},0 A${r},${r} 0 0 1 ${W},${r} L${W},${H-r} A${r},${r} 0 0 1 ${W-r},${H} ${bot}L${r},${H} A${r},${r} 0 0 1 0,${H-r} L0,${r} A${r},${r} 0 0 1 ${r},0 Z`;
}

/* ---------- Hold-and-slide option bars ----------
   Tapping works as normal. Press the chosen option and slide: the pill swells, the track bulges around it,
   each option crossed gives a little bounce and a tick, and letting go snaps to the nearest option. */
let pd=null,hold=null,holdRaf=0,noClick=0;
function holdDraw(){
 const h=hold;if(!h)return;const bar=h.bar,W=bar.offsetWidth,H=bar.offsetHeight,P=12,s=h.b/7,dw=h.w*.08*s,dh=h.h*.16*s;
 if(!h.done){h.pill.style.transform=`translate(${(h.x-dw/2).toFixed(1)}px,${(h.y-dh/2).toFixed(1)}px)`;h.pill.style.width=(h.w+dw)+'px';h.pill.style.height=(h.h+dh)+'px';
  if(h.copy)h.copy.style.transform=`translate(${(-(h.x-dw/2)).toFixed(1)}px,${(-(h.y-dh/2)).toFixed(1)}px)`}
 h.svg.setAttribute('width',W);h.svg.setAttribute('height',H+2*P);h.svg.setAttribute('viewBox',`0 ${-P} ${W} ${H+2*P}`);h.svg.style.left='-1px';h.svg.style.top=(-1-P)+'px';
 h.svg.firstChild.setAttribute('d',warpPath(W,H,H/2,h.x+1+h.w/2,h.w*.55,h.b));
}
function holdTick(){holdRaf=0;const h=hold;if(!h)return;h.b+=(h.bT-h.b)*.28;if(Math.abs(h.bT-h.b)<.05)h.b=h.bT;holdDraw();
 if(h.b!==h.bT)holdRaf=requestAnimationFrame(holdTick);else if(h.done){h.svg.remove();h.bar.classList.remove('held');hold=null}}
function startHold(){
 const {bar,btns,pill}=pd,b0=btns[pd.idx];pd.on=true;try{bar.setPointerCapture(pd.id)}catch(x){}
 if(hold&&hold.svg)hold.svg.remove();cancelAnimationFrame(holdRaf);holdRaf=0;
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','warp');svg.setAttribute('aria-hidden','true');svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg','path'));bar.prepend(svg);
 hold={bar,btns,pill,svg,w:b0.offsetWidth,h:b0.offsetHeight,y:b0.offsetTop,minX:btns[0].offsetLeft,maxX:btns[btns.length-1].offsetLeft,x:b0.offsetLeft,grab:pd.start-b0.offsetLeft,b:0,bT:calm()?0:7,done:false};
 const cp=document.createElement('div');cp.className='pcopy';cp.setAttribute('aria-hidden','true');
 btns.forEach(x=>{const c=x.cloneNode(true);['data-act','data-v','role','aria-checked'].forEach(a=>c.removeAttribute(a));c.tabIndex=-1;Object.assign(c.style,{left:x.offsetLeft+'px',top:x.offsetTop+'px',width:x.offsetWidth+'px',height:x.offsetHeight+'px'});cp.appendChild(c)});
 pill.appendChild(cp);hold.copy=cp;pill.style.transition='none';bar.classList.add('held');
 if(!holdRaf)holdRaf=requestAnimationFrame(holdTick);
}
function moveHold(e){
 const h=hold;if(!h)return;h.x=clamp(e.clientX-h.grab,h.minX,h.maxX);
 let best=0,bd=1e9;h.btns.forEach((b,i)=>{const d=Math.abs(b.offsetLeft-h.x);if(d<bd){bd=d;best=i}});
 if(best!==pd.cur){pd.cur=best;[h.btns[best],h.copy&&h.copy.children[best]].forEach(z=>{if(!z)return;z.classList.remove('bub');void z.offsetWidth;z.classList.add('bub')});tick()}
 holdDraw();
}
function endHold(cancel){
 const h=hold,p=pd;if(!h)return;const idx=cancel?p.idx:p.cur,nb=h.btns[idx];
 if(h.copy){h.copy.remove();h.copy=null}h.done=true;h.bT=0;if(!holdRaf)holdRaf=requestAnimationFrame(holdTick);
 noClick=Date.now();glideMem['seg|'+(h.bar.dataset.key||'')]={x:h.x,y:h.y,w:h.w,h:h.h};h.pill.style.transition='';
 if(idx!==p.idx&&ACT[nb.dataset.act])ACT[nb.dataset.act](nb.dataset.v,nb);else syncGliders();
}
document.addEventListener('pointerdown',e=>{
 if(e.button>0)return;const b=e.target.closest&&e.target.closest('.seg>button[aria-checked="true"]');if(!b)return;
 const bar=b.parentElement,btns=qsa(':scope>button',bar),pill=bar.querySelector(':scope>.glider');
 if(!pill||btns.length<2)return;pd={bar,btns,pill,start:e.clientX,id:e.pointerId,on:false,idx:btns.indexOf(b),cur:btns.indexOf(b)};
},true);
document.addEventListener('pointermove',e=>{if(!pd||e.pointerId!==pd.id)return;if(!pd.on){if(Math.abs(e.clientX-pd.start)<6)return;startHold()}e.preventDefault();moveHold(e)},true);
document.addEventListener('pointerup',e=>{if(!pd||e.pointerId!==pd.id)return;if(pd.on)endHold(false);pd=null},true);
document.addEventListener('pointercancel',()=>{if(!pd)return;if(pd.on)endHold(true);pd=null},true);
document.addEventListener('click',e=>{if(noClick&&Date.now()-noClick<450&&e.target.closest&&e.target.closest('.seg')){noClick=0;e.stopPropagation();e.preventDefault()}},true);
/* arrow keys move between options in a bar */
document.addEventListener('keydown',e=>{
 const b=e.target.closest&&e.target.closest('.seg>button');if(!b||!/Arrow(Left|Right)/.test(e.key))return;
 const bs=qsa(':scope>button',b.parentElement),i=bs.indexOf(b),n=bs[(i+(e.key==='ArrowRight'?1:-1)+bs.length)%bs.length];
 e.preventDefault();n.click();setTimeout(()=>{const f=qsa(':scope>button',b.parentElement.isConnected?b.parentElement:document.body).find(x=>x.dataset.v===n.dataset.v);if(f)f.focus()},30);
});

/* ---------- Scrolling: progress line, cards that rise in, and on phones the card nearest a moving line glows ---------- */
let io=null;
function reveal(root=document){
 const els=qsa('.rv:not(.in)',root);
 if(calm()||!('IntersectionObserver' in window)){els.forEach(e=>e.classList.add('in'));return}
 io=io||new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -5% 0px'});
 let k=0;els.forEach(e=>{const r=e.getBoundingClientRect();e.style.setProperty('--d',(r.top<innerHeight?Math.min(k++,9)*60:0)+'ms');io.observe(e)});
}
const NEAR_SEL='#main .card,#main .rrow,#main .mrow';
let scRaf=0,nearEl=null,nearT=0;
function onScroll(){
 scRaf=0;const maxS=document.documentElement.scrollHeight-innerHeight,prog=maxS>0?clamp(scrollY/maxS,0,1):0;
 $('sprog').style.transform=`scaleX(${$('app').hidden?0:prog})`;
 if(matchMedia('(hover:hover)').matches||calm()||$('app').hidden)return;
 const top=80,bot=innerHeight-110,mid=top+(bot-top)*(maxS>0?prog:.5);let best=null,bd=1e9;
 qsa(NEAR_SEL).forEach(el=>{if(el.querySelector('.seg,input'))return;const r=el.getBoundingClientRect();if(!r.height||r.bottom<40||r.top>innerHeight-40)return;const d=Math.abs((r.top+r.bottom)/2-mid);if(d<bd){bd=d;best=el}});
 if(nearEl&&!document.contains(nearEl))nearEl=null;
 if(best!==nearEl){if(nearEl)nearEl.classList.remove('near');if(best)best.classList.add('near');nearEl=best}
 clearTimeout(nearT);nearT=setTimeout(()=>{if(nearEl){nearEl.classList.remove('near');nearEl=null}},1100);
}
addEventListener('scroll',()=>{if(!scRaf)scRaf=requestAnimationFrame(onScroll)},{passive:true});

/* ================= Sign in and create account ================= */
let authMode='in',fails=0,lockUntil=0,tkT=0,tkSeq=0;
const UN_RE=/^[A-Za-z0-9._-]+$/;
function showAuth(){
 $('app').hidden=true;$('wiz').hidden=true;$('auth').hidden=false;closeSheet(true);
 $('modeNote').textContent=Store.mode==='live'?'':'Preview mode: accounts and scores are saved on this device only.';
 paintAuth(0);
}
function paintAuth(dir){
 qsa('#authSeg>button').forEach(b=>b.setAttribute('aria-checked',String(b.dataset.v===authMode)));
 const up=authMode==='up';
 $('authPane').innerHTML=`<div class="pane" style="--from:${dir*18}px">
  <h1>${up?'Join the club':'Welcome back'}</h1>
  <p class="muted">${up?'Create your account, then set up your player profile.':'Sign in to see the rankings and log your scores.'}</p>
  <form id="aForm" novalidate autocomplete="on">
   ${up?`<label for="aName">Your name</label><input id="aName" name="name" autocomplete="name" maxlength="60" placeholder="e.g. Rhea Fernandes">`:''}
   <label for="aUser">Username</label>
   <input id="aUser" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="100" placeholder="${up?'Choose a username':'Your username'}">
   ${up?`<div class="fieldnote"><span id="uNote"></span><span id="uCount" class="num">0/100</span></div>`:''}
   <label for="aPass">${up?'Create a password':'Password'}</label>
   <div class="pw"><input id="aPass" name="password" type="password" autocomplete="${up?'new-password':'current-password'}" ${up?'minlength="6"':''}><button type="button" class="pwtoggle" id="pwT" aria-controls="aPass" aria-pressed="false">Show</button></div>
   ${up?`<div class="strength" aria-hidden="true"><i id="pwS"></i></div><div class="fieldnote"><span id="pwN">At least 6 characters.</span></div>`:''}
   <input id="aWeb" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
   <span class="sr" id="hvLabel">Verify you are human</span>
   <div class="slider" id="hv" role="slider" tabindex="0" aria-labelledby="hvLabel" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="Not verified"><svg class="strack" aria-hidden="true"><defs><clipPath id="hvClip"><path class="tp"/></clipPath></defs><path class="tp tbg"/><rect class="tlit" x="0" y="-12" height="80" clip-path="url(#hvClip)"/><path class="tp tline"/></svg><span class="stclip" aria-hidden="true"><span class="stext s1">Slide to verify</span><span class="stext s2">I'm not a robot</span></span><div class="knob" aria-hidden="true"><span class="kface">›</span></div></div>
   <p class="aerr" id="aErr" role="alert"></p>
   <button class="btn brand wide" id="aBtn" type="submit">${up?'Create account':'Sign in'}</button>
   ${up?'':`<p class="small muted" style="text-align:center;margin-top:14px">Forgot your password? <button type="button" class="btn link small" data-act="forgot">Get help</button></p>`}
  </form></div>`;
 vInit();syncGliders();
 $('pwT').onclick=()=>{const p=$('aPass'),s=p.type==='password';p.type=s?'text':'password';$('pwT').textContent=s?'Hide':'Show';$('pwT').setAttribute('aria-pressed',String(s))};
 $('aForm').onsubmit=e=>{e.preventDefault();up?doSignUp():doSignIn()};
 if(up){$('aUser').oninput=checkUser;$('aPass').oninput=paintStrength}
 setTimeout(()=>{const f=$(up?'aName':'aUser');if(f&&matchMedia('(hover:hover)').matches)f.focus()},80);
}
const aerr=(m,info)=>{const el=$('aErr');if(!el)return;el.textContent=m||'';el.classList.toggle('info',!!info)};
function userProblem(u){if(!u)return'Choose a username.';if(u.length<3)return'Use at least 3 characters.';if(u.length>100)return'Use 100 characters or fewer.';if(!UN_RE.test(u))return'Use letters, numbers, dots, dashes or underscores. No spaces.';return''}
function checkUser(){
 const u=$('aUser').value.trim(),n=$('uNote');$('uCount').textContent=$('aUser').value.length+'/100';clearTimeout(tkT);
 const bad=u?userProblem(u):'';n.className=bad?'bad':'';n.textContent=bad;if(bad||!u)return;
 n.textContent='Checking…';const seq=++tkSeq;
 tkT=setTimeout(async()=>{try{const t=await Store.taken(u);if(seq!==tkSeq)return;n.className=t?'bad':'ok';n.textContent=t?'This username is already taken. Try another one.':'✓ Available'}catch(e){if(seq===tkSeq)n.textContent=''}},350);
}
function paintStrength(){
 const p=$('aPass').value;let s=0;if(p.length>=6)s++;if(p.length>=10)s++;if(/[A-Z]/.test(p)&&/[a-z]/.test(p))s++;if(/\d/.test(p))s++;if(/[^A-Za-z0-9]/.test(p))s++;
 const i=$('pwS');i.style.width=(p?Math.max(12,s*20):0)+'%';i.style.background=s<2?'var(--bad)':s<4?'#ffc76b':'var(--good)';
 $('pwN').textContent=p.length<6?'At least 6 characters.':['Weak','Weak','Okay','Good','Strong','Very strong'][s]+' password.';
}
async function doSignIn(){
 if(Date.now()<lockUntil)return aerr(`Too many attempts. Try again in ${Math.ceil((lockUntil-Date.now())/1000)} seconds.`);
 const u=$('aUser').value.trim(),p=$('aPass').value;
 if(!u||!p)return aerr('Enter your username and password.');
 if(!V.ok)return aerr('Slide the handle to verify you are human first.');
 if($('aWeb').value)return aerr('Sign in failed. Refresh the page and try again.');
 busy(true,'Signing in…');
 try{S.uid=await Store.signIn(u,p)}
 catch(e){busy(false);$('aPass').value='';fails++;
  if(e.code==='confirm')return aerr('This account is waiting for email confirmation. Ask the club admin to turn off "Confirm email" in Supabase.');
  if(e.code!=='nomatch')return aerr('Could not reach the club database. Check your connection and try again.');
  if(fails>=5){fails=0;lockUntil=Date.now()+30000;vReset();return aerr('Too many attempts. Try again in 30 seconds.')}
  if(fails%3===0)vReset();return aerr("That username and password don't match. Check them and try again.")}
 fails=0;await enter(true);
}
async function doSignUp(){
 const n=$('aName').value.trim(),u=$('aUser').value.trim(),p=$('aPass').value;
 if(!n)return aerr('Enter your name.');
 const bad=userProblem(u);if(bad)return aerr(bad);
 if(p.length<6)return aerr('Your password needs at least 6 characters.');
 if(!V.ok)return aerr('Slide the handle to verify you are human first.');
 if($('aWeb').value)return aerr('Something went wrong. Refresh the page and try again.');
 busy(true,'Creating your account…');
 try{if(await Store.taken(u))throw errc('taken');S.uid=await Store.signUp(n,u,p)}
 catch(e){busy(false);
  if(e.code==='taken'){const el=$('uNote');if(el){el.className='bad';el.textContent='This username is already taken. Try another one.'}$('aUser').focus();return aerr('This username is already taken. Try another one.')}
  if(e.code==='confirm'){authMode='in';paintAuth(-1);return aerr('Account created. Email confirmation is switched on in Supabase, so ask the club admin to turn it off (see SETUP.md), then sign in.',true)}
  return aerr('Could not create your account. Check your connection and try again.')}
 await enter(true);
}
function busy(on,txt){const b=$('aBtn');if(!b)return;b.disabled=on;if(on){b.dataset.t=b.textContent;b.textContent=txt}else if(b.dataset.t)b.textContent=b.dataset.t}

/* Verify slider: drag the handle to the end. A person takes time and moves in many small steps;
   a script tends to jump straight there, fill the hidden field, or act the instant the page loads. */
const V={};
const vMax=()=>Math.max(1,V.el.clientWidth-V.knob.offsetWidth-10);
function vInit(){
 V.el=$('hv');V.knob=V.el.querySelector('.knob');V.shown=Date.now();vReset();
 V.el.addEventListener('pointerdown',e=>{if(V.ok||!e.target.closest('.knob'))return;e.preventDefault();cancelAnimationFrame(V.anim);
  V.drag=true;V.start=Date.now();V.moves=0;V.grab=e.clientX-V.pos*vMax();V.el.classList.add('drag');vBulge(7);try{V.el.setPointerCapture(e.pointerId)}catch(x){}});
 V.el.addEventListener('pointermove',e=>{if(!V.drag)return;const before=V.pos;vSet((e.clientX-V.grab)/vMax());V.moves++;if(Math.floor(before*6)!==Math.floor(V.pos*6))tick()});
 ['pointerup','pointercancel'].forEach(t=>V.el.addEventListener(t,()=>{if(!V.drag)return;V.drag=false;V.el.classList.remove('drag');vBulge(0);vFinish()}));
 V.el.addEventListener('keydown',e=>{if(V.ok)return;const k=e.key;
  if(k==='ArrowRight'||k==='ArrowUp'){e.preventDefault();if(!V.start)V.start=Date.now();V.moves++;vSet(V.pos+.1);if(V.pos>=1)vFinish()}
  else if(k==='ArrowLeft'||k==='ArrowDown'){e.preventDefault();vSet(V.pos-.1)}});
}
function vDraw(){
 const el=V.el,svg=el.querySelector('.strack');if(!svg||!el.clientWidth)return;
 const W=el.clientWidth,H=el.clientHeight,P=12,kw=V.knob.offsetWidth,px=V.pos*vMax(),kL=5+px,kR=kL+kw,cx=kL+kw/2,hw=kw*.85,f=n=>n.toFixed(1);
 svg.setAttribute('width',W);svg.setAttribute('height',H+2*P);svg.setAttribute('viewBox',`0 ${-P} ${W} ${H+2*P}`);
 qsa('.tp',svg).forEach(p=>p.setAttribute('d',warpPath(W,H,14,cx,hw,V.b||0)));
 svg.querySelector('.tlit').setAttribute('width',f(Math.max(0,V.ok?W:cx)));
 /* "Slide to verify" waits in the middle and is pushed out by the handle; "I'm not a robot" follows it in from the left */
 const s1=el.querySelector('.s1'),s2=el.querySelector('.s2'),gap=14,t1=s1.offsetWidth,t2=s2.offsetWidth;
 s1.style.transform=`translateX(${f(Math.max(kw+5+(W-kw-5-t1)/2,kR+gap))}px)`;
 const endKL=5+vMax();s2.style.transform=`translateX(${f(Math.min(Math.max(12,(endKL-t2)/2),kL-gap-t2))}px)`;
}
function vTick(){V.raf=0;const t=V.bT||0,c=V.b||0;V.b=c+(t-c)*.28;if(Math.abs(t-V.b)<.05)V.b=t;vDraw();if(V.b!==t)V.raf=requestAnimationFrame(vTick)}
function vBulge(t){V.bT=calm()?0:t;if(!V.raf)V.raf=requestAnimationFrame(vTick)}
function vSet(p){V.pos=clamp(p,0,1);V.knob.style.transform=`translateX(${V.pos*vMax()}px)`;V.el.setAttribute('aria-valuenow',Math.round(V.pos*100));vDraw()}
function vReset(){cancelAnimationFrame(V.anim);Object.assign(V,{ok:false,start:0,moves:0,pos:0,drag:false,b:0,bT:0});
 V.el.classList.remove('ok','drag');V.el.querySelector('.s2').textContent="I'm not a robot";V.el.setAttribute('aria-valuetext','Not verified');vSet(0)}
function vBack(){cancelAnimationFrame(V.anim);const from=V.pos,t0=performance.now(),D=calm()?1:Math.max(180,from*420);V.start=0;V.moves=0;
 const step=now=>{const k=Math.min(1,(now-t0)/D),e=1-Math.pow(1-k,3);vSet(from*(1-e));if(k<1)V.anim=requestAnimationFrame(step)};V.anim=requestAnimationFrame(step)}
function vFinish(){
 if(V.ok)return;if(V.pos<.96)return vBack();
 const human=Date.now()-V.start>350&&V.moves>=4&&Date.now()-V.shown>1200&&!$('aWeb').value;
 if(!human){vReset();return aerr('We could not verify you. Slide again, a little more slowly.')}
 V.ok=true;V.el.classList.add('ok');V.el.querySelector('.s2').textContent="I'm not a robot ✓";vSet(1);tick();
 V.el.setAttribute('aria-valuetext','Verified');if(/verify|Slide/.test($('aErr').textContent))aerr('');
}

/* ================= Entering the app ================= */
async function enter(fresh){
 try{await reload()}catch(e){toast('Could not load the club data. Check your connection.')}
 let p=me();
 if(!p&&Store.mode==='live'){try{const {data}=await sb.auth.getUser();const md=data.user&&data.user.user_metadata||{};
  if(md.username){p={id:S.uid,username:md.username,name:md.name||md.username,setup:false,created:new Date().toISOString()};await Store.saveProfile(p);S.profiles.push(p)}}catch(e){}}
 if(!p){await Store.signOut();S.uid=null;return showAuth()}
 if(!p.setup){if(fresh)splash('Let’s build your player profile',`Welcome, ${first(p)}`);return startWiz('setup')}
 if(fresh)splash(first(p),greet());
 showApp();
}
function showApp(){$('auth').hidden=true;$('wiz').hidden=true;$('app').hidden=false;render();}

/* ================= Profile set-up ================= */
let W=null,wLock=false;
const ICON={
 padel:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="14.5" cy="9.5" rx="6" ry="6.8" transform="rotate(40 14.5 9.5)"/><path d="M10.2 14.2 4 20.4"/><path d="M5.3 17.7l1.2 1.2"/><circle cx="13" cy="8" r=".6" fill="currentColor"/><circle cx="16" cy="9" r=".6" fill="currentColor"/><circle cx="14" cy="11.4" r=".6" fill="currentColor"/></svg>',
 pickleball:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8.5"/><g fill="currentColor" stroke="none"><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="7" r="1"/><circle cx="12" cy="17" r="1"/><circle cx="7" cy="12" r="1"/><circle cx="17" cy="12" r="1"/><circle cx="8.5" cy="8.5" r=".9"/><circle cx="15.5" cy="8.5" r=".9"/><circle cx="8.5" cy="15.5" r=".9"/><circle cx="15.5" cy="15.5" r=".9"/></g></svg>',
 check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
 back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
 mail:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7l8 6 8-6"/></svg>',
 nomail:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 4l16 16"/></svg>',
 sunrise:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M7 17a5 5 0 0 1 10 0M3 17h18M12 4v4M5.6 9.6l1.4 1.4M18.4 9.6 17 11M3 21h18"/></svg>',
 sun:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
 noon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="9" r="4.5"/><path d="M12 1.5v1.5M4 9H2.5M21.5 9H20M5.6 3.6l1 1M18.4 3.6l-1 1M5 18h14M8 21.5h8"/></svg>',
 sunset:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M7 16a5 5 0 0 1 10 0M3 16h18M12 9V5M9.5 7.5 12 5l2.5 2.5M5 20h14"/></svg>',
 moon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>',
 any:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
 upload:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>',
 search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
 bars:n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 19v-3" ${n<1?'opacity=".3"':''}/><path d="M12 19v-8" ${n<2?'opacity=".3"':''}/><path d="M18 19V5" ${n<3?'opacity=".3"':''}/></svg>`
};
const letter=t=>`<span style="font:500 17px var(--display)">${t}</span>`;
const HANDS=[['right','Right-handed','',letter('R')],['left','Left-handed','',letter('L')],['none','No preference','Comfortable with either hand',letter('R/L')]];
const TIMES=[['early','Early morning','6 to 9 am',ICON.sunrise],['morning','Morning','9 am to 12',ICON.sun],['afternoon','Afternoon','12 to 4 pm',ICON.noon],['evening','Evening','4 to 8 pm',ICON.sunset],['night','Night','8 to 11 pm',ICON.moon]];
const SIDES=[['left','Left side','The backhand side (revés)'],['right','Right side','The forehand side (drive)'],['either','Either side','Happy on both']];
const lbl=(arr,v)=>(arr.find(x=>x[0]===v)||[])[1]||'';

function startWiz(mode,only){
 const p=me();
 W={mode,only:only||null,i:0,dir:1,d:{avatar:p.avatar||null,sports:[...(p.sports||[])],hand:p.hand||'',invites:p.invites===undefined?null:p.invites,times:[...(p.times||[])],side:p.side||'',levels:JSON.parse(JSON.stringify(p.levels||{})),q:{}}};
 if(mode==='level')W.only.forEach(sp=>W.d.q[sp]={band:'',ans:[]});
 $('auth').hidden=true;$('app').hidden=true;$('wiz').hidden=false;window.scrollTo(0,0);closeSheet(true);paintWiz();
}
function wSteps(){
 const d=W.d,st=[];
 if(W.mode!=='level')st.push('avatar','sports','hand','invites','times','side');
 const lv=W.mode==='level'?W.only:W.mode==='setup'?(d.sports.length?d.sports:SP_KEYS):d.sports.filter(sp=>!(d.levels[sp]&&isFinite(+d.levels[sp].start)));
 lv.forEach(sp=>{d.q[sp]=d.q[sp]||{band:'',ans:[]};const b=d.q[sp].band;st.push('band:'+sp);
  const n=b?QS[sp][b].length:5;for(let i=0;i<n;i++)st.push('q:'+sp+':'+i);st.push('result:'+sp)});
 st.push(W.mode==='setup'?'done':'save');return st;
}
function opt(o){const role=o.multi?'aria-pressed':'aria-checked';
 return `<button type="button" class="opt${o.big?' big':''}" ${o.multi?'':'role="radio"'} ${role}="${!!o.on}" data-act="${o.act}" data-v="${esc(o.v)}">${o.icon?`<span class="oi">${o.icon}</span>`:''}<span class="ot"><b>${esc(o.title)}</b>${o.sub?`<span>${esc(o.sub)}</span>`:''}</span><span class="ock">${ICON.check}</span></button>`}
function courtSVG(side){
 const on=s=>side===s||side==='either'?' on':'';
 return `<svg class="cdiag" viewBox="0 0 220 150" aria-hidden="true">
  <rect class="half${on('left')}" x="10" y="20" width="100" height="120"/><rect class="half${on('right')}" x="110" y="20" width="100" height="120"/>
  <rect class="ln" x="10" y="20" width="200" height="120" rx="3"/><line class="ln" x1="110" y1="20" x2="110" y2="100"/><line class="ln" x1="10" y1="100" x2="210" y2="100"/>
  <line class="ln net" x1="4" y1="20" x2="216" y2="20"/>
  <text x="60" y="126" text-anchor="middle" fill="#fff" font-size="10" font-family="Manrope" opacity=".85">LEFT</text><text x="160" y="126" text-anchor="middle" fill="#fff" font-size="10" font-family="Manrope" opacity=".85">RIGHT</text>
  <g class="pl" style="transform:translate(${side==='right'?160:side==='left'?60:110}px,70px)"><circle r="9" fill="#dcf55a"/><circle r="3.5" fill="#1a1430"/></g>
  <text x="110" y="13" text-anchor="middle" fill="#dcf55a" font-size="8" font-family="Manrope" letter-spacing="2">NET</text></svg>`}
function wStep(key){
 const d=W.d,[kind,sp,qi]=key.split(':'),S_=sp&&SPORTS[sp];
 if(kind==='avatar'){
  const p=me(),pv=Object.assign({},p,{avatar:d.avatar});
  return{eyebrow:'Your profile',title:'Add a profile picture',sub:'Upload a photo, or pick one of the club avatars. You can change it any time.',valid:true,next:d.avatar?'Continue':'Skip for now',
   body:`<div class="avbig">${avHTML(pv,132)}</div>
   <label class="upload">${ICON.upload}<span>Upload a photo</span><input type="file" accept="image/*" id="wPhoto"></label>
   <div class="divider">or choose an avatar</div>
   <div class="avpick" role="radiogroup" aria-label="Club avatars">${AVATARS.map(a=>`<button type="button" role="radio" aria-checked="${!!(d.avatar&&d.avatar.kind==='preset'&&d.avatar.id===a.id)}" data-act="wAvatar" data-v="${a.id}" aria-label="Avatar ${a.id.replace(/\D/g,'')}">${avHTML({avatar:{kind:'preset',id:a.id}})}</button>`).join('')}</div>`}}
 if(kind==='sports')return{eyebrow:'Your game',title:'Which sports do you play?',sub:'Choose one or both. Each sport has its own level and its own rankings.',valid:d.sports.length>0,
  body:`<div class="opts two">${SP_KEYS.map(k=>opt({multi:1,big:1,act:'wSport',v:k,on:d.sports.includes(k),title:SPORTS[k].name,sub:k==='padel'?'Our purple court':'Our pickleball court',icon:ICON[k]})).join('')}</div>`};
 if(kind==='hand')return{eyebrow:'Your game',title:'Which hand do you play with?',sub:'Helps partners plan who covers the middle.',valid:!!d.hand,single:1,
  body:`<div class="opts" role="radiogroup">${HANDS.map(h=>opt({act:'wHand',v:h[0],on:d.hand===h[0],title:h[1],sub:h[2],icon:h[3]})).join('')}</div>`};
 if(kind==='invites')return{eyebrow:'Playing with others',title:'Accept game invites from other players?',sub:'Players looking for a fourth can find you and invite you to a game.',valid:d.invites!==null,single:1,
  body:`<div class="opts" role="radiogroup">${opt({act:'wInv',v:'yes',on:d.invites===true,title:'Yes, invite me',sub:'Show me as open to games',icon:ICON.mail})}${opt({act:'wInv',v:'no',on:d.invites===false,title:'Not right now',sub:'I’ll organise my own games',icon:ICON.nomail})}</div>`};
 if(kind==='times')return{eyebrow:'When you play',title:'What time of day do you like to play?',sub:'Choose all that suit you.',valid:d.times.length>0,
  body:`<div class="opts">${TIMES.map(t=>opt({multi:1,act:'wTime',v:t[0],on:d.times.includes(t[0]),title:t[1],sub:t[2],icon:t[3]})).join('')}</div>`};
 if(kind==='side')return{eyebrow:'On court',title:'Which side of the court do you prefer?',sub:'In doubles, each player covers one side. Facing the net, which is yours?',valid:!!d.side,single:1,
  body:`<div class="courtpick">${courtSVG(d.side)}<div class="opts" role="radiogroup">${SIDES.map(s=>opt({act:'wSide',v:s[0],on:d.side===s[0],title:s[1],sub:s[2]})).join('')}</div></div>`};
 if(kind==='band'){const q=d.q[sp],B=S_.bands;
  return{eyebrow:S_.name+' level',title:`What's your ${S_.name.toLowerCase()} level?`,sub:'Start with a rough idea. A few quick questions will pin down your number.',valid:!!q.band,single:1,
   body:`<div class="opts" role="radiogroup">${[['beginner','Beginner','Learning the shots and the rules'],['intermediate','Intermediate','Regular rallies, starting to play tactically'],['pro','Expert','Strong, competitive, tournament player']].map((b,i)=>opt({act:'wBand',v:sp+'|'+b[0],on:q.band===b[0],title:b[1],sub:`${b[2]} · ${fmtL(B[b[0]][0],1)} to ${fmtL(B[b[0]][1],1)}`,icon:ICON.bars(i+1)})).join('')}</div>`}}
 if(kind==='q'){const q=d.q[sp],list=QS[sp][q.band],it=list[+qi],cur=q.ans[+qi];
  return{eyebrow:`${S_.name} level · Question ${+qi+1} of ${list.length}`,title:it[0],sub:'',valid:cur!==undefined,single:1,
   body:`<div class="opts" role="radiogroup">${it[1].map((a,j)=>opt({act:'wAns',v:sp+'|'+qi+'|'+j,on:cur!==undefined&&q.pick&&q.pick[+qi]===j,title:a[0]})).join('')}</div><p class="qhint">Answer for how you play most of the time.</p>`}}
 if(kind==='result'){const q=d.q[sp],v=levelFrom(sp,q.band,q.ans),t=tierOf(sp,v),had=S.R[sp][S.uid]&&S.R[sp][S.uid].n;
  const segs=TIERS.map(([k,n])=>{const lo=k==='beginner'?S_.min:S_.cut[k==='intermediate'?0:1],hi=k==='pro'?S_.max:S_.cut[k==='beginner'?0:1];return`<span class="${k===t?'on':''}" style="flex:${hi-lo}"><em>${n}</em></span>`}).join('');
  return{eyebrow:`${S_.name} level`,title:'Your starting level',sub:'',valid:true,result:{sp,v},
   body:`<div class="lvl"><div class="big num" id="lvlNum">0.0</div><div class="tierchip"><span class="chip t-${t}">${TIER_NAME[t]} rankings</span></div>
   <div class="gauge">${segs}<i class="mark" id="lvlMark"></i></div>
   <p class="muted small" style="margin-top:34px">${S_.name} is rated from ${fmtL(S_.min,1)} to ${fmtL(S_.max,1)}. Your level now moves with every result you log: beat stronger players to climb faster.</p>
   ${had?'<p class="small" style="margin-top:10px;color:var(--ball)">Your matches will be recalculated from this new starting level.</p>':''}</div>`}}
 if(kind==='done'){const p=me();
  return{eyebrow:'All set',title:`You're on court, ${first(p)}.`,sub:'Your profile is ready. Log your first score to enter the rankings.',valid:true,next:'Enter the club',
   body:`<div class="avbig">${avHTML(Object.assign({},p,{avatar:d.avatar}),132)}</div>
   <div class="chips" style="justify-content:center;margin-top:16px">${d.sports.map(sp=>{const v=levelFrom(sp,d.q[sp].band,d.q[sp].ans);return`<span class="chip t-${tierOf(sp,v)}">${SPORTS[sp].name} ${fmtL(v,1)}</span>`}).join('')}
   <span class="chip">${esc(lbl(HANDS,d.hand))}</span><span class="chip">${esc(lbl(SIDES,d.side))}</span><span class="chip">${d.invites?'Open to invites':'Invites off'}</span></div>`}}
 if(kind==='save')return{eyebrow:'Nearly done',title:'Save your changes?',sub:'Your profile updates for everyone straight away.',valid:true,next:'Save',body:''};
 return{title:'',body:'',valid:true};
}
function paintWiz(anim=true){
 const st=wSteps();W.i=clamp(W.i,0,st.length-1);const key=st[W.i],s=wStep(key);
 const pct=Math.round((W.i+1)/st.length*100);
 $('wiz').innerHTML=`<div class="wtop"><button class="wback" data-act="wBack" aria-label="Back" ${W.i===0&&W.mode==='setup'?'disabled':''}>${ICON.back}</button>
  <div class="wprog"><div class="wbar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Profile set-up progress"><i style="width:${W.prevPct||0}%"></i></div><div class="wcount"><span>${esc(s.eyebrow||'')}</span><span class="num">${W.i+1} of ${st.length}</span></div></div></div>
  <div class="wbody"><div class="wstep${anim?'':' still'}${W.dir<0?' back':''}" ${anim?'':'style="animation:none"'}>
   <h1>${esc(s.title)}</h1>${s.sub?`<p class="muted">${esc(s.sub)}</p>`:''}${s.body}</div></div>
  <div class="wfoot">${W.mode!=='setup'&&W.i===0?`<button class="btn ghost" data-act="wCancel">Cancel</button>`:''}<button class="btn brand wide" data-act="wNext" ${s.valid?'':'disabled'}>${esc(s.next||'Continue')}</button></div>`;
 requestAnimationFrame(()=>{const b=$('wiz').querySelector('.wbar i');if(b)b.style.width=pct+'%';W.prevPct=pct});
 const ph=$('wPhoto');if(ph)ph.onchange=async()=>{try{W.d.avatar={kind:'img',src:await readPhoto(ph.files[0])};paintWiz(false);toast('Looking good.')}catch(e){toast(e.message)}};
 if(s.result&&anim)countUp(s.result.sp,s.result.v);else if(s.result){$('lvlNum').textContent=fmtL(s.result.v,1);markAt(s.result.sp,s.result.v)}
}
function markAt(sp,v){const S_=SPORTS[sp],m=$('lvlMark');if(m)m.style.left=`calc(${((v-S_.min)/(S_.max-S_.min)*100).toFixed(1)}% - 2px)`}
function countUp(sp,v){
 const el=$('lvlNum');if(!el)return;if(calm()){el.textContent=fmtL(v,1);markAt(sp,v);return}
 const t0=performance.now(),D=1300,from=SPORTS[sp].min;setTimeout(()=>markAt(sp,v),80);
 const step=now=>{const k=Math.min(1,(now-t0)/D),e=1-Math.pow(1-k,4);if(!document.contains(el))return;el.textContent=fmtL(from+(v-from)*e,1);if(k<1)requestAnimationFrame(step);else tick()};requestAnimationFrame(step);
}
function wGo(delta){W.dir=delta;W.i+=delta;window.scrollTo({top:0,behavior:calm()?'auto':'smooth'});paintWiz()}
function wPickThenNext(){paintWiz(false);if(wLock)return;wLock=true;tick();setTimeout(()=>{wLock=false;const s=wStep(wSteps()[W.i]);if(s.valid)wGo(1)},380)}
async function wFinish(){
 const d=W.d,p=me(),levels=Object.assign({},d.levels);
 Object.entries(d.q).forEach(([sp,q])=>{if(q.band&&q.ans.length===QS[sp][q.band].length)levels[sp]={start:levelFrom(sp,q.band,q.ans),band:q.band,at:new Date().toISOString()}});
 const np=Object.assign({},p,{avatar:d.avatar,sports:W.mode==='level'?[...new Set([...d.sports,...W.only])]:d.sports,hand:d.hand,invites:!!d.invites,times:d.times,side:d.side,levels,setup:true});
 const btn=$('wiz').querySelector('[data-act="wNext"]');if(btn){btn.disabled=true;btn.textContent='Saving…'}
 try{await Store.saveProfile(np)}catch(e){if(btn){btn.disabled=false;btn.textContent='Try again'}return toast('Could not save. Check your connection and try again.')}
 const i=S.profiles.findIndex(x=>x.id===np.id);S.profiles[i]=np;rate();
 const wasSetup=W.mode==='setup';W=null;
 if(wasSetup){splash(first(np),'Welcome to Racquet Culture');view.tab='home'}else{doneTick();toast('Profile updated')}
 showApp();
}

/* ================= App views ================= */
function render(){
 if(!me())return showAuth();
 after=()=>{};const t=view.tab,html={home:vHome,rank:vRank,add:vAdd,players:vPlayers,me:vMe}[t]();
 $('main').innerHTML=`<div class="view">${html}</div>`;
 $('meBtn').innerHTML=avHTML(me());
 qsa('#dock>button').forEach(b=>{if(b.dataset.v===t)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
 $('banner').innerHTML=Store.mode==='local'&&t==='home'?`<div class="banner"><b>Preview mode.</b> Accounts and scores stay on this device until the live database is connected (see SETUP.md). Then everyone shares one ranking.</div>`:'';
 syncGliders();reveal($('main'));after();onScroll();
}
let after=()=>{};
function go(t){if(t===view.tab&&t!=='add'){window.scrollTo({top:0,behavior:calm()?'auto':'smooth'});return}
 if(t==='add'&&view.tab!=='add')A=null;view.tab=t;after=()=>{};window.scrollTo(0,0);render()}
const mySports=()=>{const p=me();return(p.sports&&p.sports.length?p.sports:SP_KEYS)};

function spark(hist,sp){
 if(!hist||hist.length<1)return'';const pts=[hist[0].r-hist[0].d,...hist.map(h=>h.r)].slice(-16);if(pts.length<2)return'';
 const lo=Math.min(...pts),hi=Math.max(...pts),rng_=Math.max(.05,hi-lo),W_=300,H_=46;
 const xy=pts.map((v,i)=>[i/(pts.length-1)*W_,H_-4-((v-lo)/rng_)*(H_-10)]);
 const l=xy.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
 return `<svg class="spark" viewBox="0 0 ${W_} ${H_}" preserveAspectRatio="none" aria-hidden="true"><path class="a" d="${l} L${W_},${H_} L0,${H_} Z"/><path class="l" d="${l}"/></svg>`;
}
function levelCard(sp,id){
 const e=S.R[sp][id],S_=SPORTS[sp];
 if(!e)return `<div class="card lcard rv"><div class="lhead"><span class="eyebrow">${S_.name}</span></div><p class="muted" style="margin-top:12px">No level yet.</p><button class="btn ghost sm" style="margin-top:12px" data-act="retake" data-v="${sp}">Find my level</button></div>`;
 const t=tierOf(sp,e.r),rk=rankOf(sp,id);
 return `<div class="card lcard hov rv" role="button" tabindex="0" data-act="rankAt" data-v="${sp}"><div class="lhead"><span class="eyebrow">${S_.name}</span><span class="chip t-${t}">${TIER_NAME[t]}</span></div>
  <div class="lv num">${fmtL(e.r)}${e.n?`<small class="delta ${dcls(e.last)}">${fmtD(e.last)}</small>`:''}</div>
  <p class="small muted">${rk?`#${rk.pos} of ${rk.of} in ${TIER_NAME[t]} · `:''}${e.n?`${e.w} won, ${e.l} lost`:'Play a match to get ranked'}</p>${spark(e.hist,sp)}</div>`;
}
function slotName(s){if(!s)return'';if(s.uid){const p=prof(s.uid);return p?first(p)+(p.name&&p.name.trim().includes(' ')?' '+p.name.trim().split(/\s+/).pop()[0]+'.':''):'Former member'}return(s.name||'Guest')+' (guest)'}
function slotAv(s){if(s&&s.uid){const p=prof(s.uid);if(p)return avHTML(p)}return avHTML({name:s&&s.name||'G'})}
function matchRow(m,opts={}){
 const D=S.D[m.id],sets=m.sets||[],aw=m.winner==='a',mineD=D&&D.d&&D.d[opts.for||S.uid];
 const team=(t,w)=>`<div class="tm${w?' win':''}"><span class="avs">${m[t].map(slotAv).join('')}</span><span>${m[t].map(s=>esc(slotName(s))).join(' & ')}</span></div>`;
 return `<div class="mrow rv"><div class="side">${team('a',aw)}${team('b',!aw)}
  <div class="mmeta"><span>${SPORTS[m.sport].name} · ${esc(dateLabel(m.date))}</span>${mineD!==undefined?`<span class="delta ${dcls(mineD)}">${fmtD(mineD)}</span>`:''}</div>
  ${opts.del&&m.by===S.uid?`<button class="btn link small" style="margin-top:4px" data-act="delMatch" data-v="${esc(m.id)}">Delete this score</button>`:''}</div>
  <div class="sets num">${sets.map(s=>`<div><span class="${+s[0]>+s[1]?'w':'l'}">${+s[0]}</span><span class="${+s[1]>+s[0]?'w':'l'}">${+s[1]}</span></div>`).join('')}</div></div>`;
}
function vHome(){
 const p=me(),ms=S.matches.filter(okMatch).sort(byWhen).reverse(),mine=ms.filter(m=>[...m.a,...m.b].some(s=>s.uid===S.uid));
 const players=S.profiles.filter(x=>x.setup).length,open=S.profiles.filter(x=>x.setup&&x.invites&&x.id!==S.uid).length;
 return `<div class="card hero rv"><p class="eyebrow">${esc(greet())}</p><h1>${esc(first(p))}, ready to play?</h1>
  <p class="muted" style="margin-top:6px">${players} player${players===1?'':'s'} in the club · ${open} open to invites right now.</p>
  <div class="cta"><button class="btn ball" data-act="go" data-v="add">Log a score</button><button class="btn ghost" data-act="go" data-v="players">Find players</button></div></div>
  <div class="sec"><h2>Your levels</h2><button class="btn link small" data-act="go" data-v="rank">Rankings</button></div>
  <div class="grid2">${mySports().map(sp=>levelCard(sp,S.uid)).join('')}</div>
  <div class="sec"><h2>Your recent games</h2></div>
  <div class="list">${mine.slice(0,4).map(m=>matchRow(m)).join('')||`<div class="card empty rv"><b>No games yet</b>Played today? Log the score and your level starts to move.</div>`}</div>
  <div class="sec"><h2>Around the club</h2></div>
  <div class="list">${ms.filter(m=>!mine.includes(m)).slice(0,6).map(m=>matchRow(m,{for:'-'})).join('')||`<div class="card empty rv"><b>Quiet on court</b>Scores from everyone in the club will appear here.</div>`}</div>`;
}
function seg(key,label,items,cur,act){return `<div class="seg full" data-key="${key}" role="radiogroup" aria-label="${esc(label)}">${items.map(([v,n])=>`<button type="button" role="radio" aria-checked="${v===cur}" data-act="${act}" data-v="${v}">${esc(n)}</button>`).join('')}</div>`}
function vRank(){
 const ms=mySports();if(!view.rs)view.rs=ms[0];const sp=view.rs;
 if(!view.rt){const e=S.R[sp][S.uid];view.rt=e?tierOf(sp,e.r):'intermediate'}
 const t=view.rt,all=Object.entries(S.R[sp]).filter(([id])=>{const p=prof(id);return p&&p.setup}).map(([id,e])=>({id,e,p:prof(id)}));
 const inT=all.filter(x=>tierOf(sp,x.e.r)===t),ranked=inT.filter(x=>x.e.n).sort((a,b)=>b.e.r-a.e.r),wait=inT.filter(x=>!x.e.n).sort((a,b)=>b.e.r-a.e.r);
 const counts=Object.fromEntries(TIERS.map(([k])=>[k,all.filter(x=>x.e.n&&tierOf(sp,x.e.r)===k).length]));
 const row=(x,i)=>`<button class="rrow rv${x.id===S.uid?' mine':''}" data-act="player" data-v="${x.id}"><span class="rk">${i+1}</span>${avHTML(x.p)}<span class="nm"><b>${esc(x.p.name)}${x.p.demo?' <span class="chip" style="font-size:10px;padding:1px 7px">Demo</span>':''}</b><span>@${esc(x.p.username)} · ${x.e.w}–${x.e.l}</span></span><span class="sc"><b class="num">${fmtL(x.e.r)}</b><span class="delta ${dcls(x.e.last)}">${fmtD(x.e.last)}</span></span></button>`;
 const pod=ranked.slice(0,3),order=[1,0,2].filter(i=>pod[i]);
 const podium=pod.length>=3?`<div class="podium">${order.map(i=>{const x=pod[i];return`<button class="pod p${i+1} rv" data-act="player" data-v="${x.id}"><span class="medal">${i+1}</span><br>${avHTML(x.p)}<span class="pn">${esc(first(x.p))}</span><span class="pl num">${fmtL(x.e.r)}</span></button>`}).join('')}</div>`:'';
 return `<div class="hd"><div><p class="eyebrow">Community</p><h1>Rankings</h1></div></div>
  <div class="ctrls">${SP_KEYS.length>1?seg('rs','Sport',SP_KEYS.map(k=>[k,SPORTS[k].name]),sp,'rankSport'):''}
  ${seg('rt','Ranking',TIERS.map(([k,n])=>[k,`${n}${counts[k]?' · '+counts[k]:''}`]),t,'rankTier')}</div>
  <p class="small muted" style="margin:-4px 0 14px">${TIER_NAME[t]} ${SPORTS[sp].name.toLowerCase()}: levels ${t==='beginner'?'below '+fmtL(SPORTS[sp].cut[0],1):t==='intermediate'?fmtL(SPORTS[sp].cut[0],1)+' to '+fmtL(SPORTS[sp].cut[1]-.01):fmtL(SPORTS[sp].cut[1],1)+' and up'}. Players move up a ranking as their level rises.</p>
  ${podium}<div class="list">${(pod.length>=3?ranked.slice(3).map((x,i)=>row(x,i+3)):ranked.map(row)).join('')}</div>
  ${!ranked.length?`<div class="card empty rv"><b>No one ranked here yet</b>Log a score and the ranking fills up.</div>`:''}
  ${wait.length?`<div class="sec"><h3>Yet to play</h3><span class="small muted">${wait.length}</span></div><div class="list">${wait.map(x=>`<button class="rrow rv" data-act="player" data-v="${x.id}"><span class="rk">–</span>${avHTML(x.p)}<span class="nm"><b>${esc(x.p.name)}</b><span>@${esc(x.p.username)}</span></span><span class="sc"><b class="num">${fmtL(x.e.r,1)}</b></span></button>`).join('')}</div>`:''}`;
}

/* ---------- Log a score ---------- */
let A=null;
const addSports=()=>SP_KEYS.filter(k=>S.R[k][S.uid]);
function newA(){const sp=addSports()[0]||mySports()[0];return{sport:sp,format:'doubles',date:today(),a:[{uid:S.uid},null],b:[null,null],sets:[['',''],['',''],['','']],err:''}}
function fitFormat(){const n=A.format==='singles'?1:2;['a','b'].forEach(t=>{A[t]=A[t].slice(0,n);while(A[t].length<n)A[t].push(null)});if(!A.a[0])A.a[0]={uid:S.uid}}
function slotLevel(s){if(!s)return null;if(s.uid){const r=lvlOf(A.sport,s.uid);return r!=null?r:(s.level!=null?+s.level:null)}return s.level!=null?+s.level:null}
function slotHTML(t,i){
 const s=A[t][i],fixed=t==='a'&&i===0,lv=slotLevel(s);
 if(!s)return `<button type="button" class="slot" data-act="pick" data-v="${t}${i}"><span class="plus">+</span><span class="sn"><b>${t==='a'?'Add your partner':'Add opponent'}</b><span>Member or guest</span></span></button>`;
 return `<${fixed?'div':'button type="button"'} class="slot filled${fixed?' fixed':''}" ${fixed?'':`data-act="pick" data-v="${t}${i}"`}>${slotAv(s)}<span class="sn"><b>${esc(fixed?'You':slotName(s))}</b><span>${lv!=null?'Level '+fmtL(lv,s.uid?2:1):'Level needed'}${s.uid?'':' · entered'}</span></span></${fixed?'div':'button'}>`;
}
function vAdd(){
 if(!A)A=newA();fitFormat();const S_=SPORTS[A.sport];
 after=()=>{qsa('[data-set]').forEach(el=>el.oninput=()=>{const [r,c]=el.dataset.set.split(',');A.sets[+r][+c]=el.value.replace(/\D/g,'').slice(0,2);if(el.value!==A.sets[+r][+c])el.value=A.sets[+r][+c];paintFair()});
  const dt=$('mDate');if(dt)dt.onchange=()=>{A.date=dt.value};paintFair()};
 return `<div class="hd"><div><p class="eyebrow">After the game</p><h1>Log a score</h1></div></div>
 <div class="card rv">
  ${addSports().length>1?seg('as','Sport',addSports().map(k=>[k,SPORTS[k].name]),A.sport,'aSport'):`<p class="eyebrow">${S_.name}</p>`}
  ${SP_KEYS.filter(k=>!S.R[k][S.uid]).map(k=>`<p class="small muted" style="margin-top:10px">To log ${SPORTS[k].name.toLowerCase()} games, <button class="btn link small" data-act="retake" data-v="${k}">set your ${SPORTS[k].name.toLowerCase()} level</button> first.</p>`).join('')}
  ${A.sport==='pickleball'?`<div style="margin-top:10px">${seg('af','Format',[['doubles','Doubles'],['singles','Singles']],A.format,'aFormat')}</div>`:''}
  <label for="mDate">Date played</label><input type="date" id="mDate" value="${A.date}" max="${today()}">
 </div>
 <div class="card rv"><div class="teams">
  <div class="team"><p class="eyebrow">${A.format==='singles'?'You':'Your team'}</p>${A.a.map((_,i)=>slotHTML('a',i)).join('')}</div>
  <span class="vs">VS</span>
  <div class="team"><p class="eyebrow">${A.format==='singles'?'Opponent':'Opponents'}</p>${A.b.map((_,i)=>slotHTML('b',i)).join('')}</div>
 </div><p class="small muted" style="margin-top:12px">Members' levels fill in on their own. For anyone without an account, you enter their level so the points stay fair.</p></div>
 <div class="card rv"><h3>Score</h3><p class="small muted" style="margin:-4px 0 12px">Your team on the left. ${A.sport==='padel'?'Leave the third set empty if you played two.':'Add each game you played.'}</p>
  <div class="sets">${A.sets.map((s,r)=>`<div class="setrow"><span class="eyebrow">${S_.setName} ${r+1}</span><input inputmode="numeric" pattern="[0-9]*" maxlength="2" aria-label="${S_.setName} ${r+1}, your team" data-set="${r},0" value="${esc(s[0])}" placeholder="–"><i>–</i><input inputmode="numeric" pattern="[0-9]*" maxlength="2" aria-label="${S_.setName} ${r+1}, opponents" data-set="${r},1" value="${esc(s[1])}" placeholder="–"></div>`).join('')}</div></div>
 <div class="card fair rv" id="fair"></div>
 <p class="ferr" id="aErr2" role="alert"></p>
 <button class="btn brand wide" data-act="submitMatch" style="margin-top:6px">Save score</button>`;
}
function readSets(){
 const S_=SPORTS[A.sport],out=[];
 for(let r=0;r<A.sets.length;r++){const [x,y]=A.sets[r];if(x===''&&y==='')continue;if(x===''||y==='')return{err:`Fill in both scores for ${S_.setName.toLowerCase()} ${r+1}.`};
  const a=+x,b=+y;if(a===b)return{err:`${S_.setName} ${r+1} can't be a draw.`};
  if(A.sport==='padel'&&r<2&&(Math.max(a,b)>7||Math.max(a,b)<6))return{err:`Set ${r+1} looks unusual. A padel set ends at 6 or 7 games.`};out.push([a,b])}
 if(!out.length)return{err:'Enter the score.'};
 const wa=out.filter(s=>s[0]>s[1]).length,wb=out.length-wa;if(wa===wb)return{err:`Sets are level at ${wa}–${wb}. Add the deciding ${S_.setName.toLowerCase()}.`};
 return{sets:out,winner:wa>wb?'a':'b'};
}
function draft(){
 const sl=[...A.a,...A.b];if(sl.some(s=>!s||slotLevel(s)==null))return null;
 const c=s=>s.uid?{uid:s.uid,level:+fmtL(slotLevel(s))}:{name:s.name,level:+fmtL(s.level,1)};
 return{sport:A.sport,format:A.format,date:A.date,a:A.a.map(c),b:A.b.map(c)};
}
function paintFair(){
 const el=$('fair');if(!el)return;const m=draft();
 if(!m){el.innerHTML=`<h3>Fair points</h3><p class="small muted">Add all the players to see how many points this game is worth for each of you.</p>`;return}
 const ta=avg(m.a.map(s=>s.level)),tb=avg(m.b.map(s=>s.level)),ea=1/(1+Math.pow(10,(tb-ta)/SPORTS[m.sport].scale)),rs=readSets();
 let rows;
 if(rs.sets){const pv=preview(Object.assign({},m,{sets:rs.sets,winner:rs.winner}));
  rows=[...m.a,...m.b].filter(s=>s.uid).map(s=>`<div class="prow"><span>${s.uid===S.uid?'You':esc(slotName(s))}</span><span class="delta ${dcls(pv.d[s.uid])}">${fmtD(pv.d[s.uid])}</span></div>`).join('');
  rows=`<p class="small" style="margin:10px 0 4px"><b>${rs.winner==='a'?'Your team wins.':'Your opponents win.'}</b> Points from this result:</p>${rows}`}
 else{const w=preview(Object.assign({},m,{sets:[[1,0]],winner:'a'})),l=preview(Object.assign({},m,{sets:[[0,1]],winner:'b'}));
  rows=`<div class="prow"><span>If you win</span><span class="delta up">${fmtD(w.d[S.uid]*1.0)}</span></div><div class="prow"><span>If you lose</span><span class="delta down">${fmtD(l.d[S.uid])}</span></div><p class="tiny muted" style="margin-top:6px">Bigger wins move the number a little more.</p>`}
 el.innerHTML=`<h3>Fair points</h3><p class="small muted">Your team averages <b class="num">${fmtL(ta)}</b>, your opponents <b class="num">${fmtL(tb)}</b>. ${Math.abs(ta-tb)<.15?'An even match.':ta>tb?'You are the favourites, so a win earns less and a loss costs more.':'You are the underdogs, so a win earns more and a loss costs less.'}</p>
  <div class="bar" aria-hidden="true"><i style="width:${(ea*100).toFixed(0)}%"></i><b></b></div><p class="tiny muted">Expected chance your team wins: <b class="num">${Math.round(ea*100)}%</b></p>${rows}`;
}
async function submitMatch(){
 const err=m=>{$('aErr2').textContent=m;toast(m)};$('aErr2').textContent='';
 if(!A.date||A.date>today())return err('Choose the date you played.');
 const m=draft();if(!m)return err('Add every player, with a level for anyone who does not have one yet.');
 const ids=[...m.a,...m.b].filter(s=>s.uid).map(s=>s.uid);if(new Set(ids).size!==ids.length)return err('The same player is in the game twice.');
 const rs=readSets();if(rs.err)return err(rs.err);
 const rec=Object.assign(m,{id:'m_'+rid(),sets:rs.sets,winner:rs.winner,by:S.uid,at:new Date().toISOString()});
 const btn=document.querySelector('[data-act="submitMatch"]');btn.disabled=true;btn.textContent='Saving…';
 try{await Store.addMatch(rec)}catch(e){btn.disabled=false;btn.textContent='Save score';return err('Could not save the score. Check your connection and try again.')}
 S.matches.push(rec);rate();const d=S.D[rec.id]&&S.D[rec.id].d[S.uid];doneTick();
 toast(`Score saved. Your ${SPORTS[rec.sport].name.toLowerCase()} level ${d>0?'rises':'drops'} ${Math.abs(d||0).toFixed(2)} to ${fmtL(lvlOf(rec.sport,S.uid))}.`,3600);
 view.rs=rec.sport;view.rt=tierOf(rec.sport,lvlOf(rec.sport,S.uid));A=null;view.tab='rank';setTimeout(()=>{window.scrollTo(0,0);render()},500);
}

/* ---------- Players ---------- */
function vPlayers(){
 after=()=>{const q=$('pQ');if(q)q.oninput=()=>{view.pf.q=q.value;paintPlayers()};paintPlayers()};
 const f=view.pf,chip=(k,v,t)=>`<button type="button" class="fchip" aria-pressed="${f[k]===v}" data-act="pf" data-v="${k}|${v}">${t}</button>`;
 return `<div class="hd"><div><p class="eyebrow">Community</p><h1>Players</h1></div></div>
  <div class="search">${ICON.search}<input id="pQ" type="search" placeholder="Search by name or username" value="${esc(f.q)}" aria-label="Search players"></div>
  <div class="chips" style="margin:12px 0 18px">${chip('inv',true,'Open to invites')}${SP_KEYS.map(k=>chip('sport',k,SPORTS[k].name)).join('')}${TIMES.map(t=>chip('time',t[0],t[1])).join('')}</div>
  <div class="list" id="pList"></div>`;
}
function paintPlayers(){
 const f=view.pf,q=f.q.trim().toLowerCase(),el=$('pList');if(!el)return;
 const list=S.profiles.filter(p=>p.setup&&(!q||(p.name+' '+p.username).toLowerCase().includes(q))&&(!f.inv||p.invites)&&(!f.sport||(p.sports||[]).includes(f.sport))&&(!f.time||(p.times||[]).includes(f.time)))
  .sort((a,b)=>(a.id===S.uid)-(b.id===S.uid)||a.name.localeCompare(b.name));
 el.innerHTML=list.map(p=>`<div class="card pcard hov rv" role="button" tabindex="0" data-act="player" data-v="${p.id}">${avHTML(p)}<div class="pi"><b>${esc(p.name)}${p.id===S.uid?' <span class="muted small">(you)</span>':''}</b><span class="small muted">@${esc(p.username)}</span>
  <div class="tags">${(p.sports||[]).map(sp=>{const r=lvlOf(sp,p.id);return r!=null?`<span class="chip t-${tierOf(sp,r)}">${SPORTS[sp].name} ${fmtL(r,1)}</span>`:''}).join('')}${p.invites?'<span class="chip ball">Open to invites</span>':''}<span class="chip">${esc(lbl(SIDES,p.side))}</span></div></div></div>`).join('')
  ||`<div class="card empty rv"><b>No players match</b>Try fewer filters.</div>`;
 reveal(el);
}

/* ---------- My profile ---------- */
function vMe(){
 const p=me(),mine=S.matches.filter(okMatch).filter(m=>[...m.a,...m.b].some(s=>s.uid===S.uid)).sort(byWhen).reverse();
 const sw=(k,t,s)=>`<div class="setline"><div><b>${t}</b><p class="small muted">${s}</p></div><button class="switch" role="switch" aria-checked="${!!prefs[k]}" data-act="pref" data-v="${k}" aria-label="${t}"></button></div>`;
 return `<div class="card phead rv"><div class="avbig" style="width:112px;height:112px">${avHTML(p,112)}</div><h1 style="margin-top:12px">${esc(p.name)}</h1><p class="muted">@${esc(p.username)}</p>
  <div class="cta" style="justify-content:center"><button class="btn ghost sm" data-act="editProfile">Edit profile</button></div></div>
  <div class="sec"><h2>Levels</h2></div><div class="grid2">${mySports().map(sp=>levelCard(sp,S.uid)).join('')}</div>
  <div class="cta">${mySports().map(sp=>`<button class="btn ghost sm" data-act="retake" data-v="${sp}">Retake ${SPORTS[sp].name.toLowerCase()} questions</button>`).join('')}</div>
  <div class="sec"><h2>How you play</h2></div>
  <div class="card rv"><dl class="prefs"><dt>Sports</dt><dd>${(p.sports||[]).map(s=>SPORTS[s].name).join(' and ')||'–'}</dd><dt>Hand</dt><dd>${esc(lbl(HANDS,p.hand))||'–'}</dd><dt>Court side</dt><dd>${esc(lbl(SIDES,p.side))||'–'}</dd><dt>Plays</dt><dd>${(p.times||[]).map(t=>lbl(TIMES,t)).join(', ')||'–'}</dd><dt>Invites</dt><dd>${p.invites?'Open to invites':'Not right now'}</dd></dl></div>
  <div class="sec"><h2>Your games</h2><span class="small muted">${mine.length}</span></div>
  <div class="list">${mine.map(m=>matchRow(m,{del:1})).join('')||`<div class="card empty rv"><b>No games yet</b>Your scores and points will show here.</div>`}</div>
  <div class="sec"><h2>Settings</h2></div>
  <div class="card rv">${sw('calm','Reduce motion','Fewer animations and no sliding effects.')}${sw('haptics','Vibration','A light tap when you slide or confirm (phones that support it).')}</div>
  ${Store.mode==='local'?`<div class="card rv" style="margin-top:12px"><b>Preview mode</b><p class="small muted" style="margin:4px 0 12px">Everything is saved on this device only. To try the rankings, add some example players with made-up scores. They are marked Demo and can be removed.</p><div class="cta" style="margin-top:0"><button class="btn ghost sm" data-act="demoAdd">Add demo players</button><button class="btn ghost sm" data-act="demoClear">Remove demo players</button></div></div>`:''}
  <button class="btn danger wide" style="margin-top:22px" data-act="signOut">Sign out</button>`;
}

/* ---------- Sheets ---------- */
let sheetOnClose=null;
function openSheet(html,onReady){
 closeSheet(true);const bg=document.createElement('div');bg.className='sheetbg';bg.id='sheetBg';
 bg.innerHTML=`<div class="sheet" role="dialog" aria-modal="true"><div class="grab" aria-hidden="true"></div>${html}</div>`;
 bg.addEventListener('click',e=>{if(e.target===bg)closeSheet()});$('sheetRoot').appendChild(bg);if(onReady)onReady(bg);
 const f=bg.querySelector('input,button:not(.grab)');if(f&&matchMedia('(hover:hover)').matches)setTimeout(()=>f.focus(),60);
}
function closeSheet(now){const bg=$('sheetBg');if(!bg)return;if(now||calm()){bg.remove();return}bg.classList.add('out');setTimeout(()=>bg.remove(),300)}
function lvlInput(sp,val){const S_=SPORTS[sp];
 return `<div class="lvlin"><button type="button" class="step" data-act="lstep" data-v="-0.1" aria-label="Lower">−</button><input id="gLvl" type="number" inputmode="decimal" step="0.1" min="${S_.min}" max="${S_.max}" value="${val!=null?fmtL(val,1):''}" placeholder="${fmtL(avg(S_.bands.intermediate),1)}" aria-label="Level"><button type="button" class="step" data-act="lstep" data-v="0.1" aria-label="Higher">+</button></div>
  <div class="bandq">${TIERS.map(([k,n])=>`<button type="button" class="fchip" data-act="lband" data-v="${k}">${n} · ${fmtL(S_.bands[k][0],1)}–${fmtL(S_.bands[k][1],1)}</button>`).join('')}</div>
  <p class="tiny muted" style="margin-top:8px">${S_.name} levels run from ${fmtL(S_.min,1)} to ${fmtL(S_.max,1)}. Tap a band for its middle, then fine-tune.</p>`}
let pickT=null;
function openPicker(key){
 pickT={t:key[0],i:+key[1]};const sp=SPORTS[A.sport];
 openSheet(`<h2>Choose a player</h2><p class="muted small">${sp.name} · ${pickT.t==='a'?'Your team':'Opponents'}</p>
  <div class="search" style="margin-top:14px">${ICON.search}<input id="pkQ" type="search" placeholder="Search members" aria-label="Search members"></div>
  <div class="pickl" id="pkL"></div>
  <div class="divider">Playing with someone without an account?</div>
  <label for="gName">Their name</label><input id="gName" maxlength="40" placeholder="e.g. Sam" autocomplete="off">
  <label for="gLvl">Their ${sp.name.toLowerCase()} level</label>${lvlInput(A.sport,null)}
  <p class="ferr" id="gErr"></p><button class="btn brand wide" data-act="addGuest">Add guest</button>
  ${A[pickT.t][pickT.i]&&!(pickT.t==='a'&&pickT.i===0)?`<button class="btn link small" style="display:block;margin:12px auto 0" data-act="clearSlot">Remove this player</button>`:''}`,
 bg=>{const q=bg.querySelector('#pkQ');q.oninput=paintPick;paintPick()});
}
function paintPick(){
 const q=($('pkQ').value||'').trim().toLowerCase(),used=[...A.a,...A.b].filter(Boolean).map(s=>s.uid);
 const list=S.profiles.filter(p=>p.setup&&!used.includes(p.id)&&(!q||(p.name+' '+p.username).toLowerCase().includes(q))).sort((a,b)=>a.name.localeCompare(b.name)).slice(0,40);
 $('pkL').innerHTML=list.map(p=>{const r=lvlOf(A.sport,p.id);return`<button type="button" data-act="pickMember" data-v="${p.id}">${avHTML(p)}<span class="nm"><b>${esc(p.name)}</b><span>@${esc(p.username)}</span></span>${r!=null?`<span class="chip t-${tierOf(A.sport,r)} num">${fmtL(r)}</span>`:'<span class="chip">No level</span>'}</button>`}).join('')||`<p class="small muted" style="padding:8px 4px">No members found. Add them as a guest below.</p>`;
}
function readLvl(){const v=parseFloat(($('gLvl').value||'').replace(',','.'));const S_=SPORTS[A.sport];return isFinite(v)&&v>=S_.min&&v<=S_.max?Math.round(v*10)/10:null}
function askMemberLevel(id){
 const p=prof(id),sp=SPORTS[A.sport];
 openSheet(`<h2>${esc(first(p))}'s ${sp.name.toLowerCase()} level</h2><p class="muted small">${esc(p.name)} has not set a ${sp.name.toLowerCase()} level yet. Enter your best guess. It is only used for this game until they set their own.</p>
  <label for="gLvl">Level</label>${lvlInput(A.sport,null)}<p class="ferr" id="gErr"></p><button class="btn brand wide" data-act="memberLevel" data-v="${id}">Add ${esc(first(p))}</button>`);
}
function playerSheet(id){
 const p=prof(id);if(!p)return;const ms=S.matches.filter(okMatch).filter(m=>[...m.a,...m.b].some(s=>s.uid===id)).sort(byWhen).reverse().slice(0,5);
 openSheet(`<div style="text-align:center"><div class="avbig" style="width:96px;height:96px;margin-top:6px">${avHTML(p,96)}</div><h2 style="margin-top:12px">${esc(p.name)}</h2><p class="muted small">@${esc(p.username)}${p.demo?' · Demo player':''}</p></div>
  <div class="grid2" style="margin-top:16px">${(p.sports||[]).map(sp=>{const e=S.R[sp][id];if(!e)return'';const t=tierOf(sp,e.r),rk=rankOf(sp,id);
   return`<div class="card"><span class="eyebrow">${SPORTS[sp].name}</span><div style="font:500 30px var(--display);margin:6px 0 2px" class="num">${fmtL(e.r)}</div><span class="chip t-${t}">${TIER_NAME[t]}${rk?' · #'+rk.pos:''}</span><p class="tiny muted" style="margin-top:8px">${e.w} won · ${e.l} lost</p></div>`}).join('')}</div>
  <div class="card" style="margin-top:12px"><dl class="prefs"><dt>Hand</dt><dd>${esc(lbl(HANDS,p.hand))||'–'}</dd><dt>Court side</dt><dd>${esc(lbl(SIDES,p.side))||'–'}</dd><dt>Plays</dt><dd>${(p.times||[]).map(t=>lbl(TIMES,t)).join(', ')||'–'}</dd><dt>Invites</dt><dd>${p.invites?'Open to invites':'Not right now'}</dd></dl></div>
  ${ms.length?`<div class="sec"><h3>Recent games</h3></div><div class="list">${ms.map(m=>matchRow(m,{for:id})).join('')}</div>`:''}
  <button class="btn ghost wide" style="margin-top:16px" data-act="closeSheet">Close</button>`,bg=>qsa('.rv',bg).forEach(e=>e.classList.add('in')));
}
function confirmSheet(title,text,okLabel,act,v){
 openSheet(`<h2>${esc(title)}</h2><p class="muted" style="margin:6px 0 18px">${esc(text)}</p><div class="cta"><button class="btn ghost" data-act="closeSheet" style="flex:1">Cancel</button><button class="btn danger" data-act="${act}" data-v="${esc(v||'')}" style="flex:1">${esc(okLabel)}</button></div>`);
}

/* ---------- Demo players (preview mode only) ---------- */
const DEMO=[['Aarav Naik','aarav.n'],['Tanvi Kamat','tanvi_k'],['Rohan DSouza','rohan.dz'],['Kiara Fernandes','kiara.f'],['Vikram Prabhu','vikprabhu'],['Neha Sawant','neha.s'],['Dev Shetty','devshetty'],['Isha Pai','isha.pai'],['Kabir Menezes','kabir.m'],['Riya Gaonkar','riya.g'],['Aditya Rane','adi.rane'],['Sara Rodrigues','sara.r']];
async function demoAdd(){
 if(S.profiles.some(p=>p.demo))return toast('Demo players are already here.');
 const r=rng(42),ps=DEMO.map(([name,username],i)=>{const pl=+(1+r()*5).toFixed(1),pb=+(1.5+r()*3.8).toFixed(1),sports=i%4===3?['pickleball']:i%5===4?['padel']:['padel','pickleball'];
  const levels={};sports.forEach(sp=>levels[sp]={start:sp==='padel'?pl:pb,band:tierOf(sp,sp==='padel'?pl:pb),at:new Date().toISOString()});
  return{id:'demo_'+i,username,name,demo:true,setup:true,avatar:{kind:'preset',id:'px'+((i%12)+1)},sports,hand:['right','left','right','none'][i%4],invites:i%3!==0,times:[TIMES[i%5][0],TIMES[(i+2)%5][0]],side:['left','right','either'][i%3],levels}});
 const ms=[];
 for(let k=0;k<40;k++){const sp=r()>.45?'padel':'pickleball',pool=ps.filter(p=>p.sports.includes(sp)).map(p=>p.id);if(pool.length<4)continue;
  const pick=[];while(pick.length<4){const x=pool[Math.floor(r()*pool.length)];if(!pick.includes(x))pick.push(x)}
  const d=new Date(Date.now()-(40-k)*864e5*1.1),date=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const st=x=>ps.find(p=>p.id===x).levels[sp].start,sa=st(pick[0])+st(pick[1]),sbv=st(pick[2])+st(pick[3]),aw=r()<1/(1+Math.pow(10,(sbv-sa)/2/SPORTS[sp].scale));
  const g=n=>Math.floor(r()*n);let fs=sp==='padel'?(r()>.5?[[6,g(5)],[g(5),6],[6,g(5)]]:[[6,g(5)],[7,5]]):[[11,g(9)],[11,g(9)]];
  if(!aw)fs=fs.map(s=>[s[1],s[0]]);
  ms.push({id:'demo_m'+k,demo:true,sport:sp,format:'doubles',date,a:[{uid:pick[0]},{uid:pick[1]}],b:[{uid:pick[2]},{uid:pick[3]}],sets:fs,winner:aw?'a':'b',by:pick[0],at:d.toISOString()})}
 for(const p of ps)await Store.saveProfile(p);for(const m of ms)await Store.addMatch(m);await reload();render();toast('Added 12 demo players and 40 example games.');
}
async function demoClear(){
 ls.set('rc_profiles',ls.get('rc_profiles',[]).filter(p=>!p.demo));ls.set('rc_matches',ls.get('rc_matches',[]).filter(m=>!m.demo&&![...(m.a||[]),...(m.b||[])].some(s=>s.uid&&/^demo_/.test(s.uid))));
 await reload();render();toast('Demo players removed.');
}

/* ================= Actions ================= */
const ACT={
 authMode(v){if(v===authMode)return;authMode=v;paintAuth(v==='up'?1:-1)},
 forgot(){aerr(Store.mode==='live'?'Ask a club admin to reset it for you in the club database. Password reset by email is coming later.':'In preview mode, accounts live on this device. Ask a club admin, or create a new account.',true)},
 wBack(){if(W.i===0){if(W.mode!=='setup'){W=null;showApp()}return}wGo(-1)},
 wCancel(){W=null;showApp()},
 wNext(){const st=wSteps(),s=wStep(st[W.i]);if(!s.valid)return;if(W.i>=st.length-1)return wFinish();wGo(1)},
 wAvatar(v){W.d.avatar={kind:'preset',id:v};tick();paintWiz(false)},
 wSport(v){const a=W.d.sports;W.d.sports=a.includes(v)?a.filter(x=>x!==v):[...a,v];tick();paintWiz(false)},
 wHand(v){W.d.hand=v;wPickThenNext()},
 wInv(v){W.d.invites=v==='yes';wPickThenNext()},
 wTime(v){const a=W.d.times;W.d.times=a.includes(v)?a.filter(x=>x!==v):[...a,v];tick();paintWiz(false)},
 wSide(v){W.d.side=v;wPickThenNext()},
 wBand(v){const [sp,b]=v.split('|'),q=W.d.q[sp];if(q.band!==b){q.band=b;q.ans=[];q.pick=[]}wPickThenNext()},
 wAns(v){const [sp,qi,j]=v.split('|'),q=W.d.q[sp];q.pick=q.pick||[];q.pick[+qi]=+j;q.ans[+qi]=QS[sp][q.band][+qi][1][+j][1];wPickThenNext()},
 go(v){go(v)},
 rankSport(v){view.rs=v;const e=S.R[v][S.uid];view.rt=e?tierOf(v,e.r):view.rt;render()},
 rankTier(v){view.rt=v;render()},
 rankAt(v){view.rs=v;const e=S.R[v][S.uid];if(e)view.rt=tierOf(v,e.r);go('rank')},
 player(v){playerSheet(v)},
 closeSheet(){closeSheet()},
 pf(v){const [k,x]=v.split('|'),val=k==='inv'?true:x;view.pf[k]=view.pf[k]===val?(k==='inv'?false:''):val;qsa('.fchip[data-act="pf"]').forEach(b=>{const [kk,xx]=b.dataset.v.split('|');b.setAttribute('aria-pressed',String(view.pf[kk]===(kk==='inv'?true:xx)))});paintPlayers()},
 aSport(v){A.sport=v;if(v==='padel')A.format='doubles';A.sets=[['',''],['',''],['','']];['a','b'].forEach(t=>A[t]=A[t].map(s=>s&&s.uid?{uid:s.uid}:null));render()},
 aFormat(v){A.format=v;render()},
 pick(v){openPicker(v)},
 pickMember(id){if(lvlOf(A.sport,id)==null)return askMemberLevel(id);A[pickT.t][pickT.i]={uid:id};closeSheet();render()},
 memberLevel(id){const l=readLvl();if(l==null){$('gErr').textContent=`Enter a level between ${SPORTS[A.sport].min} and ${SPORTS[A.sport].max}.`;return}A[pickT.t][pickT.i]={uid:id,level:l};closeSheet();render()},
 addGuest(){const n=$('gName').value.trim(),l=readLvl();if(!n){$('gErr').textContent='Enter their name.';$('gName').focus();return}
  if(l==null){$('gErr').textContent=`Enter their level, between ${SPORTS[A.sport].min} and ${SPORTS[A.sport].max}.`;return}A[pickT.t][pickT.i]={name:n,level:l};closeSheet();render()},
 clearSlot(){A[pickT.t][pickT.i]=null;closeSheet();render()},
 lstep(v){const i=$('gLvl'),S_=SPORTS[A.sport],cur=parseFloat(i.value);i.value=fmtL(clamp((isFinite(cur)?cur:avg(S_.bands.intermediate))+ +v,S_.min,S_.max),1);tick()},
 lband(v){const b=SPORTS[A.sport].bands[v];$('gLvl').value=fmtL((b[0]+b[1])/2,1);tick()},
 submitMatch(){submitMatch()},
 delMatch(v){confirmSheet('Delete this score?','Everyone’s levels from this game are recalculated without it.','Delete','delMatchYes',v)},
 async delMatchYes(v){try{await Store.delMatch(v)}catch(e){return toast('Could not delete. Check your connection.')}S.matches=S.matches.filter(m=>m.id!==v);rate();closeSheet();render();toast('Score deleted')},
 editProfile(){startWiz('edit')},
 retake(v){startWiz('level',[v])},
 pref(v){setPref(v,!prefs[v]);render();if(v==='haptics'&&prefs.haptics)tick()},
 demoAdd(){demoAdd()},demoClear(){demoClear()},
 signOut(){confirmSheet('Sign out?','You can sign back in with your username and password.','Sign out','signOutYes')},
 async signOutYes(){closeSheet(true);await Store.signOut();S.uid=null;A=null;view.tab='home';authMode='in';showAuth()}
};
document.addEventListener('click',e=>{
 const el=e.target.closest&&e.target.closest('[data-act]');if(!el||el.disabled)return;const f=ACT[el.dataset.act];if(!f)return;
 if(el.tagName==='A')e.preventDefault();f(el.dataset.v,el,e);
});
document.addEventListener('keydown',e=>{
 if((e.key==='Enter'||e.key===' ')&&e.target.getAttribute&&e.target.getAttribute('role')==='button'&&e.target.dataset.act){e.preventDefault();e.target.click()}
 if(e.key==='Escape'&&$('sheetBg'))closeSheet();
 if(e.key==='Enter'&&(e.target.id==='gName'||e.target.id==='gLvl')){e.preventDefault();const b=document.querySelector('#sheetBg [data-act="addGuest"],#sheetBg [data-act="memberLevel"]');if(b)b.click()}
});

/* Changes from other players arrive live; never redraw while someone is typing or has a sheet open */
let rmT=0,rmPending=false;
function onRemote(){clearTimeout(rmT);rmT=setTimeout(async()=>{if(!S.uid)return;try{await reload()}catch(e){return}
 const a=document.activeElement,typing=a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName);
 if($('app').hidden||typing||$('sheetBg')||view.tab==='add'){rmPending=true;return}render()},400)}
document.addEventListener('focusout',()=>setTimeout(()=>{if(rmPending&&!$('app').hidden&&!$('sheetBg')&&view.tab!=='add'){rmPending=false;render()}},60));

/* ================= Start ================= */
(async function boot(){
 try{await Store.init()}catch(e){console.warn(e)}
 let id=null;try{id=await Store.session()}catch(e){}
 if(id){S.uid=id;await enter(false)}else showAuth();
})();
