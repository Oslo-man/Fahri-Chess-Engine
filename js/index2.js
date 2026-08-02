/* ---------- Mesin (Stockfish melalui worker cross-origin) ---------- */
let engine=null, engineReady=false;
const engineQueue=[]; // {fen, depth, onInfo, onDone}
let current=null;

const SF_URL='https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js';
/* Preferensi mesin: Stockfish 18 NNUE (wasm lokal) → Stockfish 10 (wasm lokal)
   → blob worker asm.js dari CDN (untuk file:// yang memblokir worker lokal). */
let SF_MODE=(location.protocol==='http:'||location.protocol==='https:')?'nnue-local':'asm-cdn';
function makeSF(){
  if(SF_MODE==='nnue-local'){
    try{ return new Worker('stockfish-18-lite-single.js'); }catch(e){ SF_MODE='wasm-local'; }
  }
  if(SF_MODE==='wasm-local'){
    try{ return new Worker('stockfish.wasm.js'); }catch(e){ SF_MODE='asm-cdn'; }
  }
  return new Worker(URL.createObjectURL(new Blob([`importScripts('${SF_URL}');`],{type:'application/javascript'})));
}
const SF_LABEL={'nnue-local':'Stockfish 18','wasm-local':'Stockfish 10','asm-cdn':'Stockfish 10 asm'};
let engineInitTimer=null;
function initEngine(){
  try{
    engine=makeSF();
  }catch(e){ setStatus('Mesin gagal dimuat'); return; }
  // jika mesin yang dipilih tidak melaporkan siap dengan cepat, turunkan ke rantai fallback
  clearTimeout(engineInitTimer);
  engineInitTimer=setTimeout(()=>{
    if(engineReady)return;
    if(SF_MODE==='nnue-local')SF_MODE='wasm-local';
    else if(SF_MODE==='wasm-local')SF_MODE='asm-cdn';
    else return;
    console.warn('engine slow to init — falling back to '+SF_MODE);
    try{engine&&engine.terminate();}catch(e){} engine=null; initEngine();
  }, 8000);
  engine.onmessage=onEngineMsg;
  engine.onerror=(e)=>{ console.error('engine error',e.message||e); setStatus('Terjadi kesalahan pada mesin — memuat ulang…'); recoverEngine(); };
  engine.postMessage('uci');
  engine.postMessage('setoption name MultiPV value 3'); // 3 baris teratas untuk tampilan panah
  engine.postMessage('isready');
}
function recoverEngine(){
  // worker crash: hentikan dan reset agar aplikasi tidak macet
  try{engine&&engine.terminate();}catch(e){}
  clearTimeout(watchdog);
  engineReady=false; engine=null;
  // selesaikan apa pun yang sedang berjalan agar await tidak menggantung
  const inflight=current; current=null; engineQueue.length=0;
  if(inflight&&inflight.onDone)inflight.onDone(null,inflight.last||{},inflight.lastByPv||{});
  setTimeout(initEngine,300);
}

/* ---------- Evaluasi cloud Lichess (evaluasi cache dalam untuk posisi buku) ---------- */
/* Mengembalikan {ev, bm, second, depth} dalam cp sudut pandang Putih, atau null jika tidak tersedia. */
async function cloudEval(fen, timeoutMs){
  const ctl=new AbortController(); const t=setTimeout(()=>ctl.abort(),timeoutMs||2000);
  try{
    const r=await fetch('https://lichess.org/api/cloud-eval?multiPv=2&fen='+encodeURIComponent(fen),{signal:ctl.signal});
    if(!r.ok) return null;
    const j=await r.json();
    if(!j.pvs||!j.pvs.length) return null;
    const val=pv=> pv.mate!==undefined ? (pv.mate>0?100000:-100000) : (pv.cp|0);
    const norm=u=>({e1h1:'e1g1',e1a1:'e1c1',e8h8:'e8g8',e8a8:'e8c8'}[u]||u); // notasi rokade lichess
    const bm=norm((j.pvs[0].moves||'').split(' ')[0]||'');
    return { ev:val(j.pvs[0]), bm:bm||null, second:j.pvs[1]!==undefined?val(j.pvs[1]):null, depth:j.depth };
  }catch(e){ return null; }
  finally{ clearTimeout(t); }
}
/* Mengambil evaluasi cloud untuk `count` posisi pertama; mengembalikan array sparse. */
async function cloudPrefetch(fens, count, deadlineMs){
  const n=Math.min(count,fens.length);
  const out=new Array(fens.length);
  const CONC=5; let idx=0;
  const deadline=Date.now()+deadlineMs;
  async function lane(){
    while(idx<n && Date.now()<deadline){
      const i=idx++;
      const r=await cloudEval(fens[i], Math.min(2000, Math.max(300, deadline-Date.now())));
      if(r)out[i]=r;
    }
  }
  await Promise.all(Array.from({length:CONC},lane));
  return out;
}

/* ---------- Kumpulan analisis paralel (dipakai oleh Ulasan Permainan) ---------- */
/* Menjalankan beberapa worker Stockfish dan menganalisis semua FEN secara bersamaan.
   Mengembalikan array {ev, bm, second} (ev/second = centipawn sudut pandang Putih).
   `preset`: array sparse hasil yang sudah diketahui (evaluasi cloud, dsb). */
function analyzePool(fens, depth, mpv, onProgress, preset){
  const total=fens.length;
  const results=new Array(total); // undefined = belum selesai
  const requeue=[];
  let next=0, filled=0;
  const workers=new Set();
  const POOL=Math.max(1, Math.min((navigator.hardwareConcurrency||2)-1, 12, total));

  // isi awal dari preset (evaluasi cloud dalam)
  if(preset)for(let i=0;i<total;i++){ if(preset[i]){results[i]=preset[i];filled++;} }
  // isi awal posisi akhir (tidak perlu mesin)
  for(let i=0;i<total;i++){
    if(results[i])continue;
    try{ const gg=new Chess(fens[i]);
      if(gg.game_over()){ results[i]={ev:gg.in_checkmate()?(gg.turn()==='w'?-100000:100000):0, bm:null, second:null}; filled++; }
    }catch(e){}
  }

  return new Promise(resolve=>{
    if(filled>=total){ onProgress&&onProgress(filled,total); resolve(results); return; }
    function record(i,val){ if(results[i]!==undefined)return false; results[i]=val; filled++; onProgress&&onProgress(filled,total); return true; }
    function done(){ workers.forEach(w=>{try{w.terminate();}catch(e){}}); resolve(results); }
    function feed(w){
      let i=-1;
      if(requeue.length) i=requeue.shift();
      else { while(next<total && results[next]!==undefined) next++; if(next<total) i=next++; }
      if(i<0){ try{w.terminate();}catch(e){} workers.delete(w); return; } // tidak ada pekerjaan tersisa untuk worker ini
      w.__idx=i; w.__byPv={};
      w.postMessage('position fen '+fens[i]);
      w.postMessage('go depth '+depth);
      clearTimeout(w.__wd);
      w.__wd=setTimeout(()=>{ // worker macet: antrekan ulang posisi ini dan ganti workernya
        requeue.push(i); try{w.terminate();}catch(e){} workers.delete(w); spawn();
      }, 15000+Math.max(0,depth-16)*4000); // pencarian dalam mendapat waktu lebih longgar
    }
    function handler(w){ return (e)=>{
      const line=typeof e.data==='string'?e.data:'';
      if(line==='readyok'){ feed(w); return; }
      if(line.startsWith('info') && line.includes(' pv ')){
        const idx=(line.match(/ multipv (\d+)/)||[])[1]||'1';
        const mate=line.match(/score mate (-?\d+)/), cp=line.match(/score cp (-?\d+)/);
        w.__byPv[idx]= mate?(+mate[1]>0?100000:-100000):(cp?+cp[1]:0);
        w.__bm=(line.match(/ pv (\S+)/)||[])[1]||w.__bm;
      } else if(line.startsWith('bestmove')){
        clearTimeout(w.__wd);
        const i=w.__idx, turn=fens[i].split(' ')[1], sign=turn==='b'?-1:1;
        const bm=line.split(/\s+/)[1];
        const s1=w.__byPv['1'], s2=w.__byPv['2'];
        record(i,{ ev: sign*(s1!==undefined?s1:0), bm:(bm&&bm!=='(none)')?bm:null, second: s2!==undefined?sign*s2:null });
        if(filled>=total){ done(); return; }
        feed(w);
      }
    };}
    function spawn(){
      let w; try{ w=makeSF(); }catch(e){ return; }
      w.__byPv={}; w.onmessage=handler(w);
      w.onerror=()=>{ if(w.__idx!==undefined && results[w.__idx]===undefined) requeue.push(w.__idx); try{w.terminate();}catch(e){} workers.delete(w); if(filled<total) spawn(); };
      workers.add(w);
      w.postMessage('uci');
      w.postMessage('setoption name MultiPV value '+mpv);
      w.postMessage('isready'); // -> readyok memicu feed pertama
    }
    for(let k=0;k<POOL;k++) spawn();
  });
}
function onEngineMsg(e){
  const line=typeof e.data==='string'?e.data:'';
  if(line==='readyok'||line.startsWith('uciok')){
    if(!engineReady){engineReady=true;clearTimeout(engineInitTimer);setStatus('Mesin siap · '+(SF_LABEL[SF_MODE]||SF_MODE));pump();}
    return;
  }
  if(!current) return;
  if(line.startsWith('info') && line.includes(' pv ')){
    const m={};
    const dM=line.match(/ depth (\d+)/); if(dM)m.depth=+dM[1];
    const cpM=line.match(/score cp (-?\d+)/); const mateM=line.match(/score mate (-?\d+)/);
    if(mateM){m.mate=+mateM[1];} else if(cpM){m.cp=+cpM[1];}
    const pvM=line.match(/ pv (.+)$/); if(pvM)m.pv=pvM[1].trim().split(/\s+/);
    const mpvM=line.match(/ multipv (\d+)/); const idx=mpvM?+mpvM[1]:1;
    if(idx===1)current.last=m;
    current.lastByPv=current.lastByPv||{};
    current.lastByPv[idx]=m;
    armWatchdog(); // ada kemajuan; reset timer keheningan
    if(current.onInfo)current.onInfo(m,current.lastByPv,idx);
  } else if(line.startsWith('bestmove')){
    finishCurrent(line.split(/\s+/)[1]);
  }
}
let watchdog=null;
function armWatchdog(){ clearTimeout(watchdog); watchdog=setTimeout(()=>{ console.warn('engine silent — moving on'); finishCurrent(null); }, 14000); }
function finishCurrent(bm){
  if(!current)return;
  clearTimeout(watchdog);
  const done=current; current=null;
  if(done.onDone)done.onDone(bm, done.last||{}, done.lastByPv||{});
  pump();
}
function analyze(fen,depth,onInfo,onDone){
  // ganti antrean yang tertunda dengan analisis otomatis; hanya simpan permintaan terbaru
  engineQueue.length=0;
  engineQueue.push({fen,depth,onInfo,onDone});
  if(current){engine.postMessage('stop');} else pump();
}
function pump(){
  if(!engineReady||current||!engineQueue.length)return;
  current=engineQueue.shift();
  current.lastByPv={};
  engine.postMessage('position fen '+current.fen);
  engine.postMessage('go depth '+current.depth);
  armWatchdog();
}
function setStatus(s){const el=document.getElementById('engineStatus');if(el)el.textContent=s;}

/* ---------- Suara langkah (klik kayu sintetis, tanpa berkas audio) ---------- */
let audioCtx=null, noiseBuf=null;
function getNoise(){
  if(noiseBuf)return noiseBuf;
  const len=Math.floor(audioCtx.sampleRate*0.2);
  noiseBuf=audioCtx.createBuffer(1,len,audioCtx.sampleRate);
  const d=noiseBuf.getChannelData(0);
  for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
  return noiseBuf;
}
/* Ketukan kayu = transien noise tajam + beberapa mode resonansi teredam (sintesis modal) */
function tap({t=0,vol=0.5,base=420,partials=[1,2.0,3.1],decay=0.085,attackFilt=2200,attackVol=0.5}={}){
  const now=audioCtx.currentTime+t;
  // transien noise pendek (serangan "ketukan")
  const src=audioCtx.createBufferSource(); src.buffer=getNoise();
  const bp=audioCtx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=attackFilt; bp.Q.value=1.2;
  const ng=audioCtx.createGain();
  ng.gain.setValueAtTime(vol*attackVol,now);
  ng.gain.exponentialRampToValueAtTime(0.0006,now+0.018);
  src.connect(bp); bp.connect(ng); ng.connect(audioCtx.destination);
  src.start(now); src.stop(now+0.03);
  // mode kayu resonan: partial sinus yang meluruh
  partials.forEach((mult,i)=>{
    const o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.type='sine'; o.frequency.value=base*mult;
    const amp=vol*(i===0?0.9:0.45/i); // partial lebih tinggi lebih pelan
    const d=decay*(i===0?1:0.7/Math.sqrt(i+1)); // partial lebih tinggi meluruh lebih cepat
    g.gain.setValueAtTime(amp,now);
    g.gain.exponentialRampToValueAtTime(0.0006,now+d);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(now); o.stop(now+d+0.02);
  });
}
function sfxSynth(type){
  try{
    audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==='suspended')audioCtx.resume();
    switch(type){
      // base lebih rendah + decay lebih panjang = "clack" lebih berat
      case 'capture': tap({vol:0.6,base:300,partials:[1,2.1,3.0,4.2],decay:0.12,attackFilt:1700,attackVol:0.7}); break;
      case 'castle':  tap({vol:0.5,base:420,decay:0.08}); tap({t:0.085,vol:0.45,base:400,decay:0.08}); break;
      case 'check':   tap({vol:0.5,base:440,decay:0.09}); tap({t:0.0,vol:0.2,base:1200,partials:[1,2.4],decay:0.05,attackVol:0.2}); break;
      case 'promote': tap({vol:0.5,base:430,decay:0.09}); tap({t:0.06,vol:0.3,base:880,partials:[1,2.5],decay:0.07,attackVol:0.2}); break;
      case 'end':     tap({vol:0.5,base:240,partials:[1,2.0,3.0],decay:0.16,attackFilt:1400}); tap({t:0.13,vol:0.45,base:200,decay:0.18}); break;
      default:        tap({vol:0.5,base:430,partials:[1,2.0,3.1],decay:0.075,attackFilt:2200}); // langkah
    }
  }catch(e){}
}

/* ---------- Berkas suara dari ./sounds/ (nama gaya chess.com) ---------- */
/* Tiap jenis mendapat kumpulan kecil elemen <audio> agar langkah cepat bisa tumpang tindih.
   Berkas yang hilang/gagal jatuh kembali ke ketukan sintetis. */
const SOUND_MAP={
  move:'sounds/move-self.mp3',
  capture:'sounds/capture.mp3',
  castle:'sounds/castle.mp3',
  check:'sounds/move-check.mp3',
  promote:'sounds/promote.mp3',
  end:'sounds/move-check.mp3', // tidak ada suara akhir khusus
};
const soundBank={}; // jenis -> {pool:[Audio], idx, ok}
function initSounds(){
  for(const [type,src] of Object.entries(SOUND_MAP)){
    const bank={pool:[],idx:0,ok:false};
    soundBank[type]=bank;
    try{
      for(let i=0;i<3;i++){ const a=new Audio(src); a.preload='auto'; bank.pool.push(a); }
      bank.pool[0].addEventListener('canplaythrough',()=>{bank.ok=true;},{once:true});
      bank.pool[0].addEventListener('loadeddata',()=>{bank.ok=true;},{once:true});
      bank.pool[0].addEventListener('error',()=>{bank.ok=false;},{once:true});
    }catch(e){}
  }
}
function sfx(type){
  const bank=soundBank[type]||soundBank.move;
  if(!bank||!bank.ok){ sfxSynth(type); return; }
  try{
    const a=bank.pool[bank.idx++%bank.pool.length];
    a.pause(); a.currentTime=0; a.volume=0.9;
    a.playbackRate=(type==='end')?0.85:1; // lebih dalam untuk skakmat
    const p=a.play(); if(p&&p.catch)p.catch(()=>{});
  }catch(e){ sfxSynth(type); }
}
function sfxFor(mv){
  if(!mv){sfx('move');return;}
  if(mv.san&&mv.san.includes('#')){sfx('end');return;}
  if(mv.san&&mv.san.includes('+')){sfx('check');return;}
  if(mv.flags&&(mv.flags.includes('k')||mv.flags.includes('q'))){sfx('castle');return;}
  if(mv.flags&&mv.flags.includes('p')){sfx('promote');return;}
  sfx(mv.captured?'capture':'move');
}

/* ---------- Status permainan ---------- */
const game=new Chess();
let history=[];      // daftar langkah SAN yang dimuat (untuk navigasi pgn)
let ply=0;           // indeks posisi saat ini ketika menavigasi permainan yang dimuat
let loadedMode=false;// true saat melihat permainan yang diimpor
let flipped=false;
let selected=null;   // kotak yang dipilih
let excursionPly=null; // ply saat pengguna meninggalkan jalur permainan untuk mencoba langkah sendiri
let liveAnal=null;     // data mesin terbaru untuk posisi saat ini {fen, evW, best, secondEvW}
let pendingJudge=null; // pengguna baru saja melangkah; klasifikasikan setelah analisis posisi baru selesai
let liveBadge=null;    // {sq, cat} lencana kualitas untuk langkah yang dicoba pengguna
let reviewData=null; // analisis per-ply
let reviewAccuracy=null; // {w, b} akurasi permainan %
let reviewEvals=null;    // cp sudut pandang Putih per posisi (plies+1)
let reviewBookHits=null; // per posisi: true jika ditemukan di cloud lichess (evaluasi buku dalam)
let reviewPhases=null;   // fase permainan per langkah: 'opening'|'middlegame'|'endgame'
let reviewMoveAcc=null;  // akurasi (0-100) per langkah, searah dengan fullHistory
let gameMeta=null;       // {opening, eco, bookPlies}

const FILES=['a','b','c','d','e','f','g','h'];
const PIECE_SVG = {
  'wK': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path stroke-linejoin="miter" d="M22.5 11.63V6M20 8h5"/><path fill="#fff" stroke-linecap="butt" stroke-linejoin="miter" d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"/><path fill="#fff" d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7"/><path d="M12.5 30c5.5-3 14.5-3 20 0M12.5 33.5c5.5-3 14.5-3 20 0M12.5 37c5.5-3 14.5-3 20 0"/></g></svg>`,
  'wQ': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM24.5 7.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 9a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM33 9a2 2 0 1 1-4 0 2 2 0 1 1 4 0z"/><path stroke-linecap="butt" d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-14V25L6 14l3 12z"/><path stroke-linecap="butt" d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/><path fill="none" d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0"/></g></svg>`,
  'wR': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path stroke-linecap="butt" d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5"/><path d="M34 14l-3 3H14l-3-3"/><path stroke-linecap="butt" stroke-linejoin="miter" d="M31 17v12.5H14V17"/><path d="M31 29.5l1.5 2.5h-20l1.5-2.5"/><path fill="none" stroke-linejoin="miter" d="M11 14h23"/></g></svg>`,
  'wB': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><g fill="#fff" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path stroke-linejoin="miter" d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5"/></g></svg>`,
  'wN': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path fill="#fff" d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/><path fill="#fff" d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"/><path fill="#000" d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zM14.933 15.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z"/></g></svg>`,
  'wP': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  'bK': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path stroke-linejoin="miter" d="M22.5 11.63V6M20 8h5"/><path fill="#000" stroke-linecap="butt" stroke-linejoin="miter" d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"/><path fill="#000" d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7"/><path stroke="#fff" stroke-width="1.5" d="M12.5 30c5.5-3 14.5-3 20 0M12.5 33.5c5.5-3 14.5-3 20 0M12.5 37c5.5-3 14.5-3 20 0"/><path fill="none" stroke="#fff" stroke-width="1" d="M20.5 25s3-5 2.5-8.5M24.5 25s-3-5-2.5-8.5"/></g></svg>`,
  'bQ': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><g fill="#000" stroke="none"><circle cx="6" cy="12" r="2.75"/><circle cx="14" cy="9" r="2.75"/><circle cx="22.5" cy="8" r="2.75"/><circle cx="31" cy="9" r="2.75"/><circle cx="39" cy="12" r="2.75"/></g><path fill="#000" stroke-linecap="butt" d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z"/><path fill="#000" stroke-linecap="butt" d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/><path fill="none" stroke="#fff" d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0"/></g></svg>`,
  'bR': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path fill="#000" stroke-linecap="butt" d="M9 39h27v-3H9v3zM12.5 32l1.5-2.5h17l1.5 2.5h-20zM12 36v-4h21v4H12z"/><path fill="#000" stroke-linecap="butt" stroke-linejoin="miter" d="M14 29.5v-13h17v13H14z"/><path fill="#000" stroke-linecap="butt" d="M14 16.5L11 14h23l-3 2.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z"/><path fill="none" stroke="#fff" stroke-linejoin="miter" stroke-width="1" d="M12 35.5h21M13 31.5h19M14 29.5h17M14 16.5h17M11 14h23"/></g></svg>`,
  'bB': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><g fill="#000" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path stroke="#fff" stroke-linejoin="miter" d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5"/></g></svg>`,
  'bN': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path fill="#000" stroke="#333" d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/><path fill="#000" stroke="#333" d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"/><circle cx="9" cy="25.5" r="1.5" fill="#fff"/><ellipse cx="14.5" cy="15.5" rx="1.5" ry="3" fill="#fff" transform="rotate(30 14.5 15.5)"/><path fill="none" stroke="#555" stroke-width="1" d="M25 10.5c4 1 7 3 9 7M27 14c2 1 4 3 5 6"/></g></svg>`,
  'bP': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#000" stroke="#333" stroke-width="1.5" stroke-linecap="round"/></svg>`
};

/* ---------- Render papan ---------- */
const boardEl=document.getElementById('board');
/* Lencana kualitas di sudut, ukurannya diambil dari kotak yang benar-benar dirender (gaya chess.com). */
function boardBadge(cell,meta){
  const cs=boardEl.getBoundingClientRect().width/8;
  const bs=Math.max(18,Math.round(cs*0.44));
  const b=document.createElement('img');
  b.className='movebadge';
  b.style.background=meta.color;
  b.src=meta.img; b.alt=meta.label; b.title=meta.label;
  b.onerror=()=>iconFallback(b,meta);
  b.style.width=b.style.height=b.style.minWidth=bs+'px';
  b.style.borderWidth=Math.max(2,Math.round(bs*0.08))+'px';
  b.style.top=Math.round(-bs*0.18)+'px';
  b.style.right=Math.round(-bs*0.18)+'px';
  cell.appendChild(b);
}
function render(){
  boardEl.innerHTML='';
  const board=game.board(); // [rank8..rank1][file a..h]
  const last=game.history({verbose:true}).slice(-1)[0];
  const order=flipped? [...Array(8).keys()].reverse():[...Array(8).keys()];
  const fileOrder=flipped?[...Array(8).keys()].reverse():[...Array(8).keys()];
  for(const r of order){
    for(const f of fileOrder){
      const sq=document.createElement('div');
      const sqName=FILES[f]+(8-r);
      const dark=(r+f)%2===1;
      sq.className='sq '+(dark?'d':'l');
      sq.dataset.sq=sqName;
      const cell=board[r][f];
      if(cell){
        const p=document.createElement('span');
        p.className='piece '+(cell.color==='w'?'w':'b');
        p.innerHTML=PIECE_SVG[cell.color+cell.type.toUpperCase()];
        sq.appendChild(p);
      }
      if(last && (last.from===sqName||last.to===sqName)) sq.classList.add('lastmove');
      if(selected===sqName) sq.classList.add('sel');
      // koordinat
      if((flipped?r===0:r===7)){const c=document.createElement('span');c.className='coord file';c.textContent=FILES[f];sq.appendChild(c);}
      if((flipped?f===7:f===0)){const c=document.createElement('span');c.className='coord rank';c.textContent=8-r;sq.appendChild(c);}
      sq.addEventListener('pointerdown',(e)=>onSquarePointerDown(e,sqName));
      boardEl.appendChild(sq);
    }
  }
  // titik langkah legal untuk kotak terpilih
  if(selected){
    const moves=game.moves({square:selected,verbose:true});
    for(const mv of moves){
      const target=boardEl.querySelector(`[data-sq="${mv.to}"]`);
      if(target){const d=document.createElement('span');d.className=mv.captured?'ring':'dot';target.appendChild(d);}
    }
  }
  // lencana kualitas langkah yang membentuk posisi saat ini (setelah Ulasan)
  if(reviewData && loadedMode && ply>0 && reviewData[ply-1] && last){
    const meta=CATS[reviewData[ply-1].cat];
    const cell=boardEl.querySelector(`[data-sq="${last.to}"]`);
    if(meta && cell) boardBadge(cell,meta);
  }
  // lencana penilaian langsung untuk langkah yang baru dicoba pengguna (mode main / eksplorasi)
  if(liveBadge && !loadedMode){
    const meta=CATS[liveBadge.cat];
    const cell=boardEl.querySelector(`[data-sq="${liveBadge.sq}"]`);
    if(meta && cell) boardBadge(cell,meta);
  }
  // "Kembali ke permainan" hanya muncul saat mencoba langkah sendiri di luar permainan yang dimuat
  const rg=document.getElementById('returnGame');
  if(rg)rg.style.display=(fullHistory&&excursionPly!==null)?'block':'none';
  updateFenOut();
}

/* ---------- Animasi gerakan bidak (geser, seperti chess.com/lichess) ---------- */
/* Menerbangkan klon dari fromSq ke toSq sementara bidak asli (sudah dirender di toSq) disembunyikan. */
function animatePiece(fromSq,toSq){
  const toCell=boardEl.querySelector(`[data-sq="${toSq}"]`);
  const fromCell=boardEl.querySelector(`[data-sq="${fromSq}"]`);
  const pieceEl=toCell&&toCell.querySelector('.piece');
  if(!pieceEl||!fromCell)return;
  const a=fromCell.getBoundingClientRect(), b=toCell.getBoundingClientRect();
  const c=pieceEl.cloneNode(true);
  c.className=pieceEl.className+' anim-piece';
  c.style.left=a.left+'px'; c.style.top=a.top+'px';
  c.style.width=a.width+'px'; c.style.height=a.height+'px';
  c.style.fontSize=(a.width*0.82)+'px';
  document.body.appendChild(c);
  pieceEl.style.visibility='hidden';
  requestAnimationFrame(()=>{ c.style.transform=`translate(${b.left-a.left}px,${b.top-a.top}px)`; });
  setTimeout(()=>{ c.remove(); pieceEl.style.visibility=''; },200);
}
/* Animasikan objek langkah verbose chess.js setelah render(); reverse=true menggesernya mundur (undo/nav-back). */
function animateMoveObj(mv,reverse){
  if(!mv)return;
  animatePiece(reverse?mv.to:mv.from, reverse?mv.from:mv.to);
  if(mv.flags&&(mv.flags.includes('k')||mv.flags.includes('q'))){ // rokade: benteng juga bergeser
    const rank=mv.color==='w'?'1':'8';
    const rf=(mv.flags.includes('k')?'h':'a')+rank;
    const rt=(mv.flags.includes('k')?'f':'d')+rank;
    animatePiece(reverse?rt:rf, reverse?rf:rt);
  }
}
/* Objek langkah verbose pada indeks ply (basis-0) dari permainan yang dimuat. */
function verboseMoveAt(idx){
  if(!fullHistory||idx<0||idx>=fullHistory.length)return null;
  const t=new Chess(); if(startFen)t.load(startFen);
  for(let i=0;i<=idx;i++)t.move(fullHistory[i]);
  return t.history({verbose:true}).slice(-1)[0]||null;
}

/* ---------- Interaksi bidak: klik-klik DAN seret untuk melangkah ---------- */
let drag=null; // {from, startX, startY, clone, srcPiece, cell, moved}
function tryMove(from,to,noAnim){
  const mv=game.moves({square:from,verbose:true}).find(m=>m.to===to);
  if(!mv)return false;
  // langkah sendiri pertama saat permainan dimuat = meninggalkan jalur permainan; ingat di mana
  if(fullHistory && excursionPly===null) excursionPly=ply;
  // simpan analisis posisi saat ini sebelum langkah mengubahnya
  const fenBefore=game.fen();
  const snap=(liveAnal&&liveAnal.fen===fenBefore)?liveAnal:null;
  const legalCount=game.moves().length;
  const hist=game.history({verbose:true});
  const prevMv=hist.length?hist[hist.length-1]:null;
  let promo;
  if(mv.flags.includes('p')){promo=(prompt('Promosi ke (q,r,b,n)?','q')||'q').toLowerCase();}
  const made=game.move({from,to,promotion:promo||'q'});
  sfxFor(made);
  selected=null;
  clearJudge();
  const capVal=PVAL[made.captured]||0;
  if(made.san.includes('#')){ // skakmat terjadi: tidak perlu menunggu mesin
    const sac=isSacrifice(game.fen(),made.color,made.to,capVal);
    setTimeout(()=>showJudge(made.san,made.to,sac?'brilliant':'best'),0);
  } else if(snap&&snap.best&&!game.game_over()){
    pendingJudge={fenAfter:game.fen(), beforeEvW:snap.evW, best:snap.best, secondEvW:snap.secondEvW,
      moverWhite:made.color==='w', to:made.to, san:made.san,
      playedUci:(made.from+made.to+(made.promotion||'')).toLowerCase(),
      sac:isSacrifice(game.fen(),made.color,made.to,capVal),
      trivialRecap:!!(made.captured&&prevMv&&prevMv.captured&&prevMv.to===made.to),
      legalCount};
  }
  afterMove();
  if(!noAnim)animateMoveObj(made,false);
  return true;
}
function squareFromPoint(x,y){
  const r=boardEl.getBoundingClientRect();
  let f=Math.floor((x-r.left)/r.width*8), rk=Math.floor((y-r.top)/r.height*8);
  if(f<0||f>7||rk<0||rk>7)return null;
  if(flipped){f=7-f;rk=7-rk;}
  return FILES[f]+(8-rk);
}
function onSquarePointerDown(e,sq){
  if(e.button!==undefined && e.button!==0)return; // hanya tombol kiri / sentuh
  if(loadedMode) loadedMode=false; // mulai berinteraksi => keluar dari mode navigasi di posisi saat ini
  // klik-langkah ke target legal dari pilihan saat ini
  if(selected && selected!==sq && tryMove(selected,sq))return;
  const piece=game.get(sq);
  if(piece && piece.color===game.turn()){
    selected=sq; render();
    // siapkan kemungkinan seret bidak ini
    drag={from:sq, startX:e.clientX, startY:e.clientY, clone:null, srcPiece:null, cell:0, moved:false};
    document.addEventListener('pointermove',onDragMove);
    document.addEventListener('pointerup',onDragUp);
    e.preventDefault();
  } else if(selected){ selected=null; render(); }
}
function onDragMove(e){
  if(!drag)return;
  if(!drag.moved){
    if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<5)return; // klik, belum menyeret
    drag.moved=true;
    const srcSq=boardEl.querySelector(`[data-sq="${drag.from}"]`);
    const pieceEl=srcSq&&srcSq.querySelector('.piece');
    if(pieceEl){
      const cell=boardEl.getBoundingClientRect().width/8;
      const c=pieceEl.cloneNode(true);
      c.classList.add('drag-clone');
      c.style.fontSize=(cell*0.82)+'px';
      c.style.width=c.style.height=cell+'px';
      document.body.appendChild(c);
      drag.clone=c; drag.cell=cell;
      drag.srcPiece=pieceEl; pieceEl.style.opacity='0.25';
    }
  }
  if(drag.clone){
    drag.clone.style.left=(e.clientX-drag.cell/2)+'px';
    drag.clone.style.top=(e.clientY-drag.cell/2)+'px';
  }
}
function onDragUp(e){
  document.removeEventListener('pointermove',onDragMove);
  document.removeEventListener('pointerup',onDragUp);
  const d=drag; drag=null;
  if(!d)return;
  if(d.clone)d.clone.remove();
  if(d.srcPiece)d.srcPiece.style.opacity='';
  if(!d.moved)return; // klik sederhana: pilihan + titik sudah ditampilkan
  const target=squareFromPoint(e.clientX,e.clientY);
  if(!(target && target!==d.from && tryMove(d.from,target,true))) render(); // kembalikan bidak (drag = tanpa animasi geser)
}

function afterMove(){
  render();
  rebuildMoveList();
  triggerAnalysis();
}

/* ---------- Pemicu analisis + bar evaluasi ---------- */
let lastEval={cp:0};
function triggerAnalysis(){
  if(!engineReady){return;}
  if(!document.getElementById('autoAnalyze').checked){clearArrow();return;}
  const fen=game.fen();
  const depth=+document.getElementById('depthSel').value;
  const turn=game.turn();
  setBest('berpikir…','');
  const sv=p=>p.mate!==undefined?(p.mate>0?100000:-100000):(p.cp||0);
  const toW=s=>turn==='b'?-s:s;
  analyze(fen,depth,(m,byPv,idx)=>{
    if(idx===1){ // bar evaluasi + baris terbaik hanya mengikuti baris mesin teratas
      showEval(m,turn);
      const dt=document.getElementById('depthText'); if(dt)dt.textContent='(d'+(m.depth||'')+')';
      if(m.pv) setBest(prettyPV(fen,m.pv.slice(0,1))[0]||m.pv[0], prettyPV(fen,m.pv.slice(0,6)).join(' '));
    }
    if(byPv){ // simpan snapshot analisis posisi ini (dipakai untuk menilai langkah berikutnya yang dicoba)
      liveAnal={fen, evW:byPv[1]?toW(sv(byPv[1])):0,
        best:(byPv[1]&&byPv[1].pv)?byPv[1].pv[0]:null,
        secondEvW:byPv[2]?toW(sv(byPv[2])):null};
    }
    if(byPv && document.getElementById('showArrow').checked){
      // alternatif hanya mendapat panah jika dekat dengan langkah terbaik:
      // selisih <=3 win% -> jelas layak dimainkan (0.5), <=8 -> cukup baik (0.3), lebih buruk -> disembunyikan
      const val=p=>p.mate!==undefined?(p.mate>0?100000:-100000):(p.cp||0);
      const arrows=[];
      if(byPv[1]&&byPv[1].pv){
        arrows.push({uci:byPv[1].pv[0],o:0.85,w:0.18});
        const w1=winPct(val(byPv[1]));
        for(const k of [2,3]){
          const p=byPv[k]; if(!p||!p.pv)continue;
          const gap=w1-winPct(val(p));
          if(gap<=3)      arrows.push({uci:p.pv[0],o:0.5,w:0.14});
          else if(gap<=8) arrows.push({uci:p.pv[0],o:0.3,w:0.12});
        }
      }
      if(arrows.length)drawArrows(arrows);
    }
  },(bm,m)=>{
    showEval(m,turn);
    const dt2=document.getElementById('depthText'); if(dt2)dt2.textContent='(final d'+(m.depth||'')+')';
    const afterEvW=toW(sv(m));
    if(liveAnal&&liveAnal.fen===fen)liveAnal.evW=afterEvW;
    // nilai langkah yang baru dicoba pengguna, setelah posisinya selesai dianalisis penuh
    if(pendingJudge && pendingJudge.fenAfter===fen){
      const j=pendingJudge; pendingJudge=null;
      const sign=j.moverWhite?1:-1;
      const wb=winPct(sign*j.beforeEvW), wa=winPct(sign*afterEvW);
      const gapWl=(j.secondEvW!=null)?(wb-winPct(sign*j.secondEvW)):0;
      const cat=classify({wl:wb-wa, gapWl,
        isBest:j.playedUci.slice(0,4)===(j.best||'').slice(0,4),
        sac:j.sac, trivialRecap:j.trivialRecap,
        evalAfterMover:sign*afterEvW, evalBeforeMover:sign*j.beforeEvW,
        legalCount:j.legalCount, isBook:false});
      showJudge(j.san, j.to, cat);
    }
  });
}
function showJudge(san,sq,cat){
  liveBadge={sq, cat};
  render();
  const mcat=CATS[cat];
  const jt=document.getElementById('judgeText');
  if(jt)jt.innerHTML=`Langkah Anda <b>${san}</b> <img class="rs-icon-inline" src="${mcat.img}" alt="${mcat.label}" title="${mcat.label}" onerror="iconFallback(this,'${cat}')">`;
}
function clearJudge(){
  liveBadge=null; pendingJudge=null;
  const jt=document.getElementById('judgeText'); if(jt)jt.textContent='';
}

function showEval(m,turn){
  let cp;
  if(m.mate!==undefined){cp=(m.mate>0?1:-1)*100000;}
  else if(m.cp!==undefined){cp=m.cp;}
  else return;
  // skor dari sudut pandang pihak yang jalan; konversi ke sudut pandang Putih
  if(turn==='b') cp=-cp;
  lastEval=m.mate!==undefined?{mate:turn==='b'?-m.mate:m.mate}:{cp};
  const fill=document.getElementById('evalfill');
  const text=document.getElementById('evaltext');
  let pct, label;
  if(lastEval.mate!==undefined){
    pct=lastEval.mate>0?100:0; label='M'+Math.abs(lastEval.mate);
  } else {
    const e=lastEval.cp/100;
    pct=50+50*(2/(1+Math.exp(-0.4*e))-1);
    label=(e>=0?'+':'')+e.toFixed(1);
  }
  lastEvalPaint={pct,label};
  paintEvalBar();
}
/* Mewarnai bar agar bagian Putih berada di sisi Putih pada papan (terbalik sesuai sudut pandang). */
let lastEvalPaint={pct:50,label:'0.0'};
function paintEvalBar(){
  const fill=document.getElementById('evalfill');
  const text=document.getElementById('evaltext');
  const {pct,label}=lastEvalPaint;
  fill.style.height=pct+'%';
  if(flipped){ fill.style.top='0'; fill.style.bottom='auto'; }   // sudut pandang Hitam: putih di atas
  else{ fill.style.top='auto'; fill.style.bottom='0'; }          // sudut pandang Putih: putih di bawah
  text.textContent=label;
  const atBottom = flipped ? pct>=50 : pct<50; // label berada di ujung sisi yang lebih gelap (kalah)
  text.style.top=atBottom?'auto':'4px';
  text.style.bottom=atBottom?'4px':'auto';
}
function setBest(a,b){const bt=document.getElementById('bestText');if(bt)bt.textContent=a;const pv=document.getElementById('pvText');if(pv)pv.textContent=b;}

/* mengubah daftar langkah UCI menjadi SAN, memakai game sementara dari fen */
function prettyPV(fen,uciList){
  const tmp=new Chess(fen);const out=[];
  for(const u of uciList){
    const mv=tmp.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u.slice(4,5)||'q'});
    if(!mv)break;out.push(mv.san);
  }
  return out;
}

/* ---------- Panah ---------- */
const svg=document.getElementById('arrowsvg');
function sqToXY(sq){
  let f=FILES.indexOf(sq[0]), r=8-(+sq[1]);
  if(flipped){f=7-f;r=7-r;}
  return {x:f+0.5,y:r+0.5};
}
let lastArrows=null;
/* Menggambar panah dari [{uci, o (opacity), w (width)}]. Isi marker solid dan opacity grup elemen
   garis mencakup badan + kepala bersamaan, sehingga selalu selaras. */
function drawArrows(list){
  const clean=(list||[]).filter(a=>a&&a.uci&&a.uci.length>=4).slice(0,3);
  if(!clean.length){clearArrow();return;}
  lastArrows=clean;
  let defs='<defs>', lines=[];
  clean.forEach((a,k)=>{
    const p1=sqToXY(a.uci.slice(0,2)), p2=sqToXY(a.uci.slice(2,4));
    defs+=`<marker id="ah${k}" markerWidth="3" markerHeight="3" refX="1.5" refY="1.5" orient="auto">
      <path d="M0,0 L3,1.5 L0,3 Z" fill="#d4af37"/></marker>`;
    lines.push(`<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#d4af37" stroke-width="${a.w}"
      opacity="${a.o}" marker-end="url(#ah${k})" stroke-linecap="round"/>`);
  });
  svg.innerHTML=defs+'</defs>'+lines.reverse().join(''); // panah terbaik digambar terakhir = di atas
}
function drawArrow(uci){drawArrows([{uci,o:0.85,w:0.18}]);}
function clearArrow(){svg.innerHTML='';lastArrows=null;}

/* ---------- Daftar langkah / navigasi untuk permainan yang dimuat ---------- */
function rebuildMoveList(){
  history=game.history();
  ply=history.length;
  const el=document.getElementById('moveList');
  el.innerHTML=renderMoveSpans(history,ply);
  bindMoveSpans(el);
}
function renderMoveSpans(moves,curPly){
  let html='';
  for(let i=0;i<moves.length;i++){
    if(i%2===0) html+=`<span class="num">${i/2+1}.</span>`;
    html+=`<span class="mv${i+1===curPly?' cur':''}" data-ply="${i+1}">${moves[i]}</span>`;
  }
  return html||'<span class="small">Belum ada langkah.</span>';
}
function bindMoveSpans(el){
  el.querySelectorAll('.mv').forEach(s=>s.addEventListener('click',()=>gotoPly(+s.dataset.ply)));
}
function gotoPly(n){
  // bangun ulang posisi dari riwayat lengkap hingga n
  const full=fullHistory;
  if(!full)return;
  const prevPly=ply;
  game.reset();
  if(startFen) game.load(startFen);
  for(let i=0;i<n;i++) game.move(full[i]);
  ply=n; loadedMode=true; selected=null; excursionPly=null; clearJudge();
  if(n>0) sfxFor(game.history({verbose:true}).slice(-1)[0]);
  render();
  if(Math.abs(n-prevPly)===1){ // satu langkah: geser bidak
    const idx=Math.max(n,prevPly)-1;
    const mv=(n>prevPly)?game.history({verbose:true})[idx]:verboseMoveAt(idx);
    if(mv)animateMoveObj(mv, n<prevPly);
  }
  document.getElementById('moveList').innerHTML=renderMoveSpans(full,ply);
  bindMoveSpans(document.getElementById('moveList'));
  highlightReview();
  triggerAnalysis();
}
let fullHistory=null, startFen=null;

/* ---------- Tombol navigasi ---------- */
document.getElementById('navStart').onclick=()=>{ if(fullHistory)gotoPly(0); };
document.getElementById('navEnd').onclick=()=>{ if(fullHistory)gotoPly(fullHistory.length); };
document.getElementById('navPrev').onclick=()=>{
  if(fullHistory && excursionPly===null){ if(ply>0)gotoPly(ply-1); }
  else { const und=game.undo(); selected=null; clearJudge(); sfx('move'); afterMove(); if(und)animateMoveObj(und,true); }
};
document.getElementById('navNext').onclick=()=>{ if(fullHistory&&excursionPly===null&&ply<fullHistory.length)gotoPly(ply+1); };
document.getElementById('returnGame').onclick=()=>{
  if(!fullHistory)return;
  const back=Math.max(0,Math.min(excursionPly??fullHistory.length,fullHistory.length));
  gotoPly(back); // membangun ulang jalur permainan asli; juga membersihkan excursionPly
};
document.getElementById('navFlip').onclick=()=>{
  flipped=!flipped;render();paintEvalBar();
  if(lastArrows&&document.getElementById('showArrow').checked)drawArrows(lastArrows);
};

/* checkbox panah: sembunyikan/tampilkan langsung tanpa menunggu analisis berikutnya */
document.getElementById('showArrow').addEventListener('change',(e)=>{
  if(!e.target.checked){const keep=lastArrows;svg.innerHTML='';lastArrows=keep;}
  else if(lastArrows)drawArrows(lastArrows);
});

/* ---------- Tab ---------- */
function switchTab(name){
  document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('active',x.dataset.tab===name));
  document.querySelectorAll('.tabpane').forEach(x=>x.classList.toggle('active',x.id==='tab-'+name));
}
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));

/* ---------- Tab Main ---------- */
document.getElementById('newGame').onclick=()=>{
  game.reset();fullHistory=null;startFen=null;loadedMode=false;selected=null;reviewData=null;reviewPhases=null;reviewMoveAcc=null;excursionPly=null;clearJudge();
  clearArrow();render();rebuildMoveList();triggerAnalysis();
};

/* ---------- Pemuatan PGN (bersama) ---------- */
function loadGameFromPgn(pgn){
  if(!pgn)return false;
  const g=new Chess();
  if(!g.load_pgn(pgn,{sloppy:true})){return false;}
  fullHistory=g.history();
  startFen=null;
  const fenH=pgn.match(/\[FEN "([^"]+)"\]/);
  if(fenH){startFen=fenH[1];}
  gameMeta=startFen?{opening:null,eco:null,bookPlies:0,white:null,black:null,result:null}:extractGameMeta(pgn,fullHistory);
  game.reset(); if(startFen)game.load(startFen);
  ply=0;loadedMode=true;reviewData=null;reviewEvals=null;reviewAccuracy=null;reviewPhases=null;reviewMoveAcc=null;selected=null;excursionPly=null;clearJudge();
  document.getElementById('reviewList').innerHTML='';
  render();
  document.getElementById('moveList').innerHTML=renderMoveSpans(fullHistory,0);
  bindMoveSpans(document.getElementById('moveList'));
  gotoPly(fullHistory.length); // lompat ke akhir
  return true;
}
document.getElementById('loadPgn').onclick=()=>{
  const pgn=document.getElementById('pgnInput').value.trim();
  if(!loadGameFromPgn(pgn))alert('PGN tersebut tidak dapat dibaca.');
};

/* ---------- Impor permainan (Chess.com + Lichess) ---------- */
let ccGames=[];
/* Mendeteksi situs + nama pengguna dari tautan yang ditempel; nama pengguna biasa jatuh ke pilihan Situs. */
function detectSite(v){
  v=(v||'').trim();
  let m=v.match(/lichess\.org\/@\/([^/?#\s]+)/i);
  if(m)return{user:m[1].toLowerCase(),site:'lichess'};
  m=v.match(/chess\.com\/(?:member|members|user)\/([^/?#\s]+)/i);
  if(m)return{user:m[1].toLowerCase(),site:'chesscom'};
  return{user:v.replace(/^@/,'').toLowerCase(),site:null};
}
async function ccApi(url){
  const r=await fetch(url,{headers:{'Accept':'application/json'}});
  if(!r.ok)throw new Error('HTTP '+r.status);
  return r.json();
}
/* Setiap fetcher menandai permainan dengan _source, _me (nama pengguna Anda), _ts (ms) untuk digabungkan. */
async function fetchChessCom(user){
  let archiveUrl=document.getElementById('ccMonth').value;
  if(!archiveUrl){
    const arch=await ccApi(`https://api.chess.com/pub/player/${user}/games/archives`);
    if(!arch.archives.length)return[];
    archiveUrl=arch.archives[arch.archives.length-1];
  }
  const data=await ccApi(archiveUrl);
  return (data.games||[]).filter(g=>g.pgn)
    .map(g=>Object.assign(g,{_source:'chesscom',_me:user,_ts:(g.end_time||0)*1000}));
}
/* Lichess: aliran ND-JSON dari permainan terakhir pengguna, dipetakan ke bentuk chess.com. */
async function fetchLichess(user){
  const r=await fetch(`https://lichess.org/api/games/user/${user}?max=30&pgnInJson=true&opening=true`,
    {headers:{'Accept':'application/x-ndjson'}});
  if(!r.ok)throw new Error('HTTP '+r.status);
  const text=await r.text();
  return text.trim().split('\n').filter(Boolean).map(l=>{
    const j=JSON.parse(l);
    const side=c=>{
      const p=(j.players&&j.players[c])||{};
      return{ username:p.user?p.user.name:(p.aiLevel?'Stockfish AI':'?'),
              rating:p.rating||'',
              result:j.winner===c?'win':(j.winner?'loss':'draw') };
    };
    return{ pgn:j.pgn, time_class:j.speed||'', white:side('white'), black:side('black'),
            _source:'lichess', _me:user, _ts:j.createdAt||0 };
  }).filter(g=>g.pgn);
}
document.getElementById('ccUserCc').addEventListener('change',populateMonths);
async function populateMonths(){
  const det=detectSite(document.getElementById('ccUserCc').value);
  const sel=document.getElementById('ccMonth');
  sel.innerHTML='<option value="">terbaru</option>';
  if(!det.user||det.site==='lichess')return;
  try{
    const data=await ccApi(`https://api.chess.com/pub/player/${det.user}/games/archives`);
    [...data.archives].reverse().slice(0,24).forEach(u=>{
      const mm=u.match(/(\d{4})\/(\d{2})$/);
      if(mm){const o=document.createElement('option');o.value=u;o.textContent=`${mm[1]}-${mm[2]}`;sel.appendChild(o);}
    });
  }catch(e){/* diam; tombol ambil akan melaporkan */}
}
document.getElementById('ccFetch').onclick=async()=>{
  const ccRaw=document.getElementById('ccUserCc').value.trim();
  const liRaw=document.getElementById('ccUserLi').value.trim();
  try{ localStorage.setItem('cc_user_cc',ccRaw); localStorage.setItem('cc_user_li',liRaw); }catch(e){}
  const st=document.getElementById('ccStatus'), list=document.getElementById('ccList');
  list.innerHTML='';
  // bangun tugas pengambilan; tautan yang ditempel menentukan kotak mana yang dipakai
  const tasks=[];
  if(ccRaw){ const d=detectSite(ccRaw); tasks.push({user:d.user, site:d.site||'chesscom'}); }
  if(liRaw){ const d=detectSite(liRaw); tasks.push({user:d.user, site:d.site||'lichess'}); }
  if(!tasks.length){ st.textContent='Masukkan nama pengguna Chess.com dan/atau Lichess.'; return; }
  st.textContent='Mengambil permainan…';
  const results=await Promise.all(tasks.map(async t=>{
    try{ const games = t.site==='lichess'? await fetchLichess(t.user) : await fetchChessCom(t.user);
      return {ok:true, site:t.site, user:t.user, games}; }
    catch(e){ return {ok:false, site:t.site, user:t.user, err:e.message, games:[]}; }
  }));
  ccGames = results.flatMap(r=>r.games).sort((a,b)=>b._ts-a._ts); // digabung, terbaru lebih dulu
  const nm=s=>s==='lichess'?'Lichess':'Chess.com';
  const parts=results.map(r=> r.ok?`${r.games.length} dari ${nm(r.site)}`:`${nm(r.site)} gagal (${r.err})`);
  if(!ccGames.length){ st.textContent='Tidak ada permainan ditemukan. '+parts.join(' · '); return; }
  st.textContent=`${ccGames.length} permainan · ${parts.join(' · ')} — klik salah satu.`;
  renderCcList(st,list);
};
function renderCcList(st,list){
  const srcTag=s=>`<span class="src src-${s==='lichess'?'li':'cc'}">${s==='lichess'?'Li':'CC'}</span>`;
  list.innerHTML=ccGames.map((g,i)=>{
      const w=g.white||{},b=g.black||{}, me=g._me;
      const res=w.result==='win'?'1-0':b.result==='win'?'0-1':'½-½';
      const youAreWhite=w.username&&w.username.toLowerCase()===me;
      const yourRes=youAreWhite?w.result:b.result;
      const outcome=res==='½-½'?'D':(yourRes==='win'?'W':'L');
      const tag=outcome==='W'?'best':outcome==='L'?'blunder':'inacc';
      const yourScore=outcome==='D'?'½-½':outcome==='W'?'1-0':'0-1';
      const wn=w.username||'?',bn=b.username||'?';
      const wLabel=youAreWhite?`<b>${esc(wn)}</b>`:esc(wn);
      const bLabel=!youAreWhite?`<b>${esc(bn)}</b>`:esc(bn);
      return `<div class="ccgame" data-i="${i}" style="padding:6px 8px;border-radius:6px;cursor:pointer">
        ${srcTag(g._source)} <span class="tag ${tag}">${outcome}</span>
        ${wLabel} (${w.rating||'?'}) vs ${bLabel} (${b.rating||'?'})
        <span class="num">${yourScore} · ${g.time_class||''}</span></div>`;
    }).join('');
    list.querySelectorAll('.ccgame').forEach(el=>{
      el.onmouseenter=()=>el.style.background='var(--panel3)';
      el.onmouseleave=()=>el.style.background='';
      el.onclick=()=>{
        const g=ccGames[+el.dataset.i];
        if(loadGameFromPgn(g.pgn)){
          const blackIsUser=(g.black&&g.black.username&&g.black.username.toLowerCase()===g._me);
          if(blackIsUser!==flipped){flipped=blackIsUser;render();paintEvalBar();}
          st.textContent='Dimuat — menganalisis…';
          switchTab('review');
          document.getElementById('runReview').click();
        }
      };
    });
}
function esc(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}

/* ---------- Tab FEN ---------- */
document.getElementById('loadFen').onclick=()=>{
  const fen=document.getElementById('fenInput').value.trim();
  if(!game.load(fen)){alert('FEN tidak valid.');return;}
  fullHistory=null;startFen=fen;loadedMode=false;selected=null;clearJudge();
  render();rebuildMoveList();triggerAnalysis();
};
document.getElementById('copyFen').onclick=()=>{navigator.clipboard.writeText(game.fen());setStatus('FEN disalin');};
function updateFenOut(){const o=document.getElementById('fenOut');if(o)o.textContent=game.fen();}

/* ---------- Deteksi pembukaan ---------- */
/* Buku pembukaan ringkas: [urutan SAN, nama]. Kecocokan prefiks terpanjang menang. */
const OPENINGS=[
  ["e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7","Ruy Lopez: Closed"],
  ["e4 e5 Nf3 Nc6 Bb5 a6 Ba4","Ruy Lopez: Morphy Defense"],
  ["e4 e5 Nf3 Nc6 Bb5 a6 Bxc6","Ruy Lopez: Exchange Variation"],
  ["e4 e5 Nf3 Nc6 Bb5 Nf6","Ruy Lopez: Berlin Defense"],
  ["e4 e5 Nf3 Nc6 Bb5","Ruy Lopez"],
  ["e4 e5 Nf3 Nc6 Bc4 Bc5 b4","Italian: Evans Gambit"],
  ["e4 e5 Nf3 Nc6 Bc4 Bc5","Italian: Giuoco Piano"],
  ["e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5","Italian: Fried Liver Attack"],
  ["e4 e5 Nf3 Nc6 Bc4 Nf6","Italian: Two Knights Defense"],
  ["e4 e5 Nf3 Nc6 Bc4","Italian Game"],
  ["e4 e5 Nf3 Nc6 d4 exd4 Nxd4","Scotch Game"],
  ["e4 e5 Nf3 Nc6 d4","Scotch Game"],
  ["e4 e5 Nf3 Nc6 Nc3 Nf6","Four Knights Game"],
  ["e4 e5 Nf3 Nf6","Petrov Defense"],
  ["e4 e5 Nf3 d6","Philidor Defense"],
  ["e4 e5 Bc4","Bishop's Opening"],
  ["e4 e5 Nc3","Vienna Game"],
  ["e4 e5 f4","King's Gambit"],
  ["e4 e5 d4 exd4 Qxd4","Center Game"],
  ["e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6","Sicilian: Najdorf"],
  ["e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6","Sicilian: Dragon"],
  ["e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6","Sicilian: Accelerated Dragon"],
  ["e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5","Sicilian: Sveshnikov"],
  ["e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6","Sicilian: Kan"],
  ["e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6","Sicilian: Taimanov"],
  ["e4 c5 Nf3 d6","Sicilian Defense"],
  ["e4 c5 Nf3 Nc6","Sicilian Defense"],
  ["e4 c5 Nf3 e6","Sicilian Defense"],
  ["e4 c5 c3","Sicilian: Alapin"],
  ["e4 c5 Nc3","Sicilian: Closed"],
  ["e4 c5 d4 cxd4 c3","Sicilian: Smith-Morra Gambit"],
  ["e4 c5","Sicilian Defense"],
  ["e4 e6 d4 d5 Nc3 Bb4","French: Winawer"],
  ["e4 e6 d4 d5 Nc3 Nf6","French: Classical"],
  ["e4 e6 d4 d5 e5","French: Advance"],
  ["e4 e6 d4 d5 exd5","French: Exchange"],
  ["e4 e6 d4 d5 Nd2","French: Tarrasch"],
  ["e4 e6","French Defense"],
  ["e4 c6 d4 d5 e5","Caro-Kann: Advance"],
  ["e4 c6 d4 d5 exd5","Caro-Kann: Exchange"],
  ["e4 c6 d4 d5 Nc3 dxe4 Nxe4","Caro-Kann: Classical"],
  ["e4 c6","Caro-Kann Defense"],
  ["e4 d5 exd5 Qxd5","Scandinavian Defense"],
  ["e4 d5","Scandinavian Defense"],
  ["e4 Nf6","Alekhine Defense"],
  ["e4 d6 d4 Nf6","Pirc Defense"],
  ["e4 d6","Pirc Defense"],
  ["e4 g6","Modern Defense"],
  ["d4 d5 c4 e6 Nc3 Nf6","Queen's Gambit Declined"],
  ["d4 d5 c4 e6","Queen's Gambit Declined"],
  ["d4 d5 c4 dxc4","Queen's Gambit Accepted"],
  ["d4 d5 c4 c6","Slav Defense"],
  ["d4 d5 c4","Queen's Gambit"],
  ["d4 Nf6 c4 e6 Nc3 Bb4","Nimzo-Indian Defense"],
  ["d4 Nf6 c4 e6 Nf3 b6","Queen's Indian Defense"],
  ["d4 Nf6 c4 e6 g3","Catalan Opening"],
  ["d4 Nf6 c4 g6 Nc3 d5","Grünfeld Defense"],
  ["d4 Nf6 c4 g6","King's Indian Defense"],
  ["d4 Nf6 c4 c5 d5 b5","Benko Gambit"],
  ["d4 Nf6 c4 c5 d5 e6","Benoni Defense"],
  ["d4 f5","Dutch Defense"],
  ["d4 Nf6 Bg5","Trompowsky Attack"],
  ["d4 d5 Bf4","London System"],
  ["d4 Nf6 Nf3 d5 Bf4","London System"],
  ["d4 Nf6 Nf3 g6 Bf4","London System"],
  ["d4 Nf6 Nf3 e6 Bf4","London System"],
  ["d4 d5 Nf3 Nf6 e3 e6 Bd3","Colle System"],
  ["d4 d5 e4","Blackmar-Diemer Gambit"],
  ["d4 d5","Queen's Pawn Game"],
  ["d4 Nf6","Indian Game"],
  ["c4 e5","English: Reversed Sicilian"],
  ["c4 c5","English: Symmetrical"],
  ["c4","English Opening"],
  ["Nf3 d5 g3","King's Indian Attack"],
  ["Nf3 d5 c4","Réti Opening"],
  ["Nf3","Réti Opening"],
  ["b3","Nimzo-Larsen Attack"],
  ["f4","Bird's Opening"],
  ["g3","King's Fianchetto Opening"],
  ["b4","Polish Opening"],
  ["e4","King's Pawn Opening"],
  ["d4","Queen's Pawn Opening"],
];
function detectOpening(sans){
  let best=null;
  for(const [line,name] of OPENINGS){
    const toks=line.split(' ');
    if(toks.length>sans.length) continue;
    if(toks.every((t,i)=>t===sans[i])){
      if(!best||toks.length>best.plies) best={name, plies:toks.length};
    }
  }
  return best; // {name, plies} atau null
}
function extractGameMeta(pgn, sans){
  const meta={opening:null, eco:null, bookPlies:0, white:null, black:null, result:null};
  const wH=pgn.match(/\[White "([^"]+)"\]/); if(wH&&wH[1]!=='?')meta.white=wH[1];
  const bH=pgn.match(/\[Black "([^"]+)"\]/); if(bH&&bH[1]!=='?')meta.black=bH[1];
  const rH=pgn.match(/\[Result "([^"]+)"\]/); if(rH&&rH[1]!=='*')meta.result=rH[1];
  const eco=pgn.match(/\[ECO "([^"]+)"\]/); if(eco)meta.eco=eco[1];
  const op=pgn.match(/\[Opening "([^"]+)"\]/); if(op&&op[1]!=='?')meta.opening=op[1];
  if(!meta.opening){
    const u=pgn.match(/\[ECOUrl "https?:\/\/www\.chess\.com\/openings\/([^"]+)"\]/);
    if(u){ // "Ruy-Lopez-Opening-Morphy-Defense...3.Bb5-a6" → potong pada token nomor-langkah pertama
      const toks=decodeURIComponent(u[1]).split('-');
      const words=[]; for(const t of toks){ if(/^\d/.test(t))break; words.push(t); }
      if(words.length)meta.opening=words.join(' ');
    }
  }
  const hit=detectOpening(sans);
  if(hit){ meta.bookPlies=hit.plies; if(!meta.opening)meta.opening=hit.name; }
  return meta;
}

/* ---------- Metadata klasifikasi kualitas langkah ---------- */
const CATS={
  brilliant:{label:'Brilian',icon:'!!',img:'image/brilliant.png',color:'#1aa6a6',group:'good'},
  great:{label:'Bagus',icon:'!',img:'image/great.png',color:'#3b8fd4',group:'good'},
  best:{label:'Terbaik',icon:'★',img:'image/best.png',color:'#5fb35f',group:'good'},
  excellent:{label:'Sangat Baik',icon:'✓',img:'image/excellent.png',color:'#8ab84a',group:'good'},
  good:{label:'Baik',icon:'○',img:'image/good.png',color:'#a9b34a',group:'good'},
  book:{label:'Buku',icon:'▦',img:'image/book.png',color:'#b07a3c',group:'good'},
  inaccuracy:{label:'Tidak Akurat',icon:'?!',img:'image/inaccuracy.png',color:'#e0c04a',group:'bad'},
  mistake:{label:'Kesalahan',icon:'?',img:'image/mistake.png',color:'#e08a3c',group:'bad'},
  miss:{label:'Terlewat',icon:'✗',img:'image/miss.png',color:'#e0654a',group:'bad'},
  blunder:{label:'Blunder',icon:'??',img:'image/blunder.png',color:'#d24a4a',group:'bad'},
};
const GOOD_ORDER=['brilliant','great','best','excellent','good','book'];
const BAD_ORDER=['inaccuracy','mistake','blunder','miss'];
const ALL_ORDER=GOOD_ORDER.concat(BAD_ORDER);
const PHASE_LABEL={opening:'Pembukaan',middlegame:'Permainan Tengah',endgame:'Permainan Akhir'};
const PHASE_ORDER=['opening','middlegame','endgame'];
/* Jika berkas gambar label langkah belum ada/nama-nya belum cocok, jangan biarkan ikon hilang begitu
   saja — tampilkan lencana bulat berwarna dengan simbol sebagai cadangan, memakai ukuran & posisi
   (inline style) yang sama persis dengan elemen <img> aslinya. */
function iconFallback(img,metaOrKey){
  const m=(typeof metaOrKey==='string')?CATS[metaOrKey]:metaOrKey;
  if(!m||!img||!img.parentNode)return;
  const span=document.createElement('span');
  span.className=img.className+' icon-fallback';
  span.style.cssText=img.style.cssText;
  span.style.background=m.color;
  span.title=m.label;
  span.textContent=m.icon;
  img.replaceWith(span);
}
const PVAL={p:1,n:3,b:3,r:5,q:9,k:0};
/* win% dari centipawn — model Lichess */
const winPct=cp=>50+50*(2/(1+Math.exp(-0.00368208*Math.max(-10000,Math.min(10000,cp))))-1);
const accColorOf=v=>v>=90?'#5fb35f':v>=80?'#8ab84a':v>=70?'#e0c04a':v>=55?'#e08a3c':'#d24a4a';
const estEloOf=v=>(v==null)?null:Math.max(100,Math.min(3000,Math.round(500+Math.pow(Math.max(0,v-50),1.5)*6)));
function catCounts(){
  const counts={w:{},b:{}};
  ALL_ORDER.forEach(ct=>{counts.w[ct]=0;counts.b[ct]=0;});
  if(reviewData)for(const d of reviewData){ if(d)counts[d.moverWhite?'w':'b'][d.cat]++; }
  return counts;
}
/* akurasi permainan = campuran rata-rata dan rata-rata harmonik (gaya lichess) — blunder berbobot berat */
function gameAcc(list){
  if(!list.length)return null;
  const m=list.reduce((a,b)=>a+b,0)/list.length;
  const h=list.length/list.reduce((a,b)=>a+1/Math.max(b,5),0);
  return (m+h)/2;
}
/* akurasi gabungan untuk sekumpulan indeks langkah (dipakai untuk akurasi per fase) */
function gameAccFor(indices){
  if(!indices.length||!reviewMoveAcc)return null;
  return gameAcc(indices.map(i=>reviewMoveAcc[i]));
}
/* total nilai bidak non-pion/non-raja di papan (dipakai untuk mendeteksi fase permainan akhir) */
function nonPawnMaterial(fen){
  let total=0;
  try{
    const g=new Chess(fen);
    for(const row of g.board())for(const cell of row){ if(cell&&cell.type!=='p'&&cell.type!=='k')total+=PVAL[cell.type]||0; }
  }catch(e){}
  return total;
}
/* menandai setiap langkah sebagai 'opening'|'middlegame'|'endgame' berdasarkan panjang buku
   pembukaan dan total material non-pion yang tersisa di papan */
function computePhases(fens, bookPlies){
  const n=fens.length-1;
  const openEnd=Math.min(Math.max(bookPlies||0,8),24);
  let endgameStart=n;
  for(let i=0;i<fens.length;i++){
    if(nonPawnMaterial(fens[i])<=13){ endgameStart=i; break; }
  }
  const phases=new Array(n);
  for(let i=0;i<n;i++){
    if(i<openEnd && i<endgameStart) phases[i]='opening';
    else if(i<endgameStart) phases[i]='middlegame';
    else phases[i]='endgame';
  }
  return phases;
}
/* memetakan akurasi (0-100) ke satu kategori label sebagai "nilai" ringkas untuk sebuah fase permainan */
function phaseGradeCat(acc){
  if(acc==null) return null;
  if(acc>=97) return 'best';
  if(acc>=90) return 'excellent';
  if(acc>=80) return 'great';
  if(acc>=65) return 'good';
  if(acc>=50) return 'inaccuracy';
  if(acc>=30) return 'mistake';
  return 'blunder';
}

/* ---------- Kartu laporan sebagai gambar untuk dibagikan ---------- */
function buildReportCard(){
  const W=720,H=920,c=document.createElement('canvas');c.width=W;c.height=H;
  const x=c.getContext('2d');
  // latar belakang + glow merek
  const bg=x.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#2c2825');bg.addColorStop(1,'#1a1815');
  x.fillStyle=bg;x.fillRect(0,0,W,H);
  const glow=x.createRadialGradient(W*0.75,60,10,W*0.75,60,420);
  glow.addColorStop(0,'rgba(212,175,55,0.22)');glow.addColorStop(1,'rgba(212,175,55,0)');
  x.fillStyle=glow;x.fillRect(0,0,W,H);
  // judul
  const tg=x.createLinearGradient(W*0.2,0,W*0.8,0);tg.addColorStop(0,'#d4af37');tg.addColorStop(1,'#f0d060');
  x.textAlign='center';
  x.font='800 38px Georgia,serif';x.fillStyle=tg;
  x.fillText('Nusantara Chess Game Review',W/2,66);
  x.font='600 14px Georgia,serif';x.fillStyle='#b8b2a8';
  x.fillText('LAPORAN PERMAINAN',W/2,94);
  // pemain + pembukaan
  const wName=(gameMeta&&gameMeta.white)||'Putih', bName=(gameMeta&&gameMeta.black)||'Hitam';
  x.font='700 24px Georgia,serif';x.fillStyle='#ffffff';
  x.fillText(`${wName}  vs  ${bName}`,W/2,148);
  let y=176;
  if(gameMeta&&gameMeta.result){x.font='600 16px Georgia,serif';x.fillStyle='#b8b2a8';x.fillText(gameMeta.result,W/2,y);y+=28;}
  if(gameMeta&&gameMeta.opening){x.font='600 15px Georgia,serif';x.fillStyle='#d4af37';x.fillText('‎  '+gameMeta.opening,W/2,y);}
  // blok akurasi
  const drawAcc=(cx,label,v)=>{
    x.font='600 15px Georgia,serif';x.fillStyle='#b8b2a8';x.fillText(label,cx,258);
    x.font='800 44px Georgia,serif';x.fillStyle=(v==null)?'#b8b2a8':accColorOf(v);
    x.fillText(v==null?'—':v.toFixed(1)+'%',cx,306);
    const e=estEloOf(v);
    x.font='600 14px Georgia,serif';x.fillStyle='#b8b2a8';
    x.fillText(e==null?'':'≈ '+e+' Elo',cx,330);
  };
  drawAcc(W*0.3,'PUTIH',reviewAccuracy&&reviewAccuracy.w);
  drawAcc(W*0.7,'HITAM',reviewAccuracy&&reviewAccuracy.b);
  // tabel kategori
  const counts=catCounts();
  const cats=ALL_ORDER;
  let ty=384;
  x.font='700 13px Georgia,serif';x.fillStyle='#b8b2a8';
  x.textAlign='right';x.fillText('P',W-190,ty);x.fillText('H',W-120,ty);
  ty+=24;
  for(const ct of cats){
    const m=CATS[ct];
    // lingkaran ikon
    x.beginPath();x.arc(190,ty-5,10,0,7);x.fillStyle=m.color;x.fill();
    x.font='800 9px Georgia,serif';x.fillStyle='#fff';x.textAlign='center';x.fillText(m.icon,190,ty-2);
    x.font='600 15px Georgia,serif';x.fillStyle='#e8e4dc';x.textAlign='left';x.fillText(m.label,212,ty);
    x.font='700 15px Georgia,serif';x.fillStyle=m.color;x.textAlign='right';
    x.fillText(String(counts.w[ct]),W-190,ty);x.fillText(String(counts.b[ct]),W-120,ty);
    ty+=26;
  }
  // grafik evaluasi
  const gx=60,gy=650,gw=W-120,gh=160;
  x.fillStyle='#100f0e';x.fillRect(gx,gy,gw,gh);
  if(reviewEvals&&reviewEvals.length>1){
    const n=reviewEvals.length;
    const px=i=>gx+i/(n-1)*gw, py=cp=>gy+gh-(winPct(cp)/100)*gh;
    x.beginPath();x.moveTo(gx,gy+gh);
    for(let i=0;i<n;i++)x.lineTo(px(i),py(reviewEvals[i]));
    x.lineTo(gx+gw,gy+gh);x.closePath();
    x.fillStyle='rgba(221,208,178,0.92)';x.fill();
    x.strokeStyle='rgba(255,255,255,0.18)';x.setLineDash([4,4]);
    x.beginPath();x.moveTo(gx,gy+gh/2);x.lineTo(gx+gw,gy+gh/2);x.stroke();x.setLineDash([]);
    const DOT={brilliant:1,great:1,inaccuracy:1,mistake:1,miss:1,blunder:1};
    for(let i=0;i<reviewData.length;i++){
      const d=reviewData[i];
      if(d&&DOT[d.cat]){
        x.beginPath();x.arc(px(i+1),py(reviewEvals[i+1]),4.5,0,7);
        x.fillStyle=CATS[d.cat].color;x.fill();
        x.strokeStyle='#262626';x.lineWidth=1.5;x.stroke();
      }
    }
  }
  // footer
  x.textAlign='center';x.font='600 14px Georgia,serif';x.fillStyle='#b8b2a8';
  x.fillText('Ulasan permainan catur gratis — Nusantara Chess Game Review',W/2,H-36);
  return c;
}
async function shareReport(){
  if(!reviewData){alert('Jalankan pemindaian terlebih dahulu.');return;}
  const canvas=buildReportCard();
  canvas.toBlob(async blob=>{
    if(!blob)return;
    let copied=false;
    try{
      if(navigator.clipboard&&window.ClipboardItem){
        await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);copied=true;
      }
    }catch(e){}
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download='laporan-ulasan-catur.png';a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),5000);
    setStatus(copied?'Kartu laporan disalin & diunduh':'Kartu laporan diunduh');
  },'image/png');
}

/* Pemeriksaan pengorbanan: apakah bidak yang baru dipindahkan mover ke `toSq` diberikan untuk
   kerugian material bersih (>=2)? Hanya menghitung bidak sungguhan (minor+), dan hanya bidak
   yang dipindah — sehingga material lain yang menggantung tidak salah memicu "brilliant". */
/* capturedVal = nilai yang ditangkap langkah ini sendiri (agar sebuah tukar/rekapture tidak dianggap sebagai pengorbanan). */
function isSacrifice(fenAfter, mover, toSq, capturedVal){
  let g;
  try{ g=new Chess(fenAfter); }catch(e){ return false; }
  if(g.turn()===mover) return false;            // lawan harus jalan
  const piece=g.get(toSq); if(!piece) return false;
  const V=PVAL[piece.type]||0; if(V<3) return false; // hanya korbankan bidak sungguhan (minor+)
  const caps=g.moves({verbose:true}).filter(m=>m.to===toSq && m.captured);
  if(!caps.length) return false;                // bidak yang dipindah bahkan tidak diserang
  const gained=capturedVal||0;                  // material yang sudah dimenangkan langkah ini
  let bestNet=99;                               // lawan memilih garis terburuk untuk mover
  for(const c of caps){
    const g2=new Chess(fenAfter); g2.move({from:c.from,to:c.to,promotion:'q'});
    let W=0; // bisakah mover merekapture di kotak itu?
    g2.moves({verbose:true}).filter(m=>m.to===toSq && m.captured)
      .forEach(r=>{ W=Math.max(W, PVAL[r.captured]||0); });
    const net = gained - V + W;                  // material bersih: menang − bidak hilang + rekapture
    if(net<bestNet) bestNet=net;
  }
  return bestNet <= -2;                          // berakhir minimal minor piece lebih sedikit = pengorbanan nyata
}
/* Klasifikasi berdasarkan kehilangan win-probability (wl, 0-100) — otomatis melonggarkan di posisi
   yang sudah menentukan di mana perubahan cp besar tidak mengubah hasil. */
function classify(d){
  const wl=Math.max(0,d.wl);
  // brilliant = pengorbanan (hampir) terbaik yang membawa ke skakmat paksa, atau memenangkan
  // keunggulan material/posisional yang jelas (dan Anda belum sedang menghancurkan). Korban ratu untuk mat = kasus model.
  const sacMates   = d.evalAfterMover>=90000;                       // pengorbanan memaksa skakmat
  const sacWins    = d.evalAfterMover>=150 && d.evalBeforeMover<=300; // pengorbanan menghasilkan keunggulan nyata
  if(d.sac && (d.isBest||wl<=2) && !d.isBook && (sacMates||sacWins)) return 'brilliant';
  // great = satu-satunya langkah yang menyelamatkan/mempertahankan permainan (terbaik-kedua runtuh), atau
  // langkah sulit ditemukan yang memberi keunggulan material menang. Rekapture rutin tidak pernah memenuhi syarat.
  const onlyMove   = d.gapWl>=14 && d.evalAfterMover>=-50;          // unik: semua yang lain kalah
  const winsMat    = d.gapWl>=10 && d.evalAfterMover>=200;          // tidak jelas dan pasti menang setelahnya
  if(d.isBest && !d.sac && !d.trivialRecap && d.legalCount>1 && wl<=1.5 && (onlyMove||winsMat)) return 'great';
  if(d.isBook && wl<=6) return 'book';
  if(d.isBest || wl<=0.5) return 'best';  // langkah #1 mesin, atau yang kehilangan ~0 win% (seri/noise)
  if(wl<=2.5) return 'excellent';         // jelas mendekati terbaik
  if(wl<=6)   return 'good';
  if(wl<=11)  return 'inaccuracy';
  // Miss: Anda punya posisi menang (>=80% win) dan membiarkan bagian besar lepas, tapi masih
  // tidak kalah (>=45%). Melewatkan kesempatan mematikan, bukan membuang permainan.
  const winBefore=winPct(d.evalBeforeMover), winAfter=winPct(d.evalAfterMover);
  if(winBefore>=80 && winAfter>=45) return 'miss';
  if(wl<=20)  return 'mistake';
  return 'blunder';
}

/* ---------- Ulasan Permainan ---------- */
document.getElementById('runReview').onclick=async()=>{
  if(!fullHistory||!fullHistory.length){alert('Muat permainan pada tab Impor atau PGN terlebih dahulu.');return;}
  const depth=+document.getElementById('reviewDepth').value;
  const prog=document.getElementById('progress');const bar=document.getElementById('progressbar');
  prog.style.display='block';
  reviewData=new Array(fullHistory.length).fill(null);

  // bangun fens + langkah verbose
  const base=new Chess(); if(startFen)base.load(startFen);
  const fens=[base.fen()]; const verbose=[];
  for(const san of fullHistory){const mv=base.move(san); verbose.push(mv); fens.push(base.fen());}

  // 1) evaluasi cache dalam dari cloud lichess untuk posisi pembukaan/buku (depth 40-70)
  bar.style.width='2%';
  let cloud=new Array(fens.length);
  try{ cloud=await cloudPrefetch(fens, 24, 4000); }catch(e){}
  reviewBookHits=cloud.map(c=>!!c);
  // 2) kumpulan mesin menutupi semua yang tidak dicakup cloud
  const res=await analyzePool(fens, depth, 2, (n,t)=>{ bar.style.width=Math.round(n/t*100)+'%'; }, cloud);
  const evals=res.map(r=>r?r.ev:0);            // cp sudut pandang Putih
  const bestUci=res.map(r=>r?r.bm:null);
  const second=res.map(r=>r?r.second:null);    // cp sudut pandang Putih dari terbaik-kedua, atau null
  reviewEvals=evals;

  const moveAcc=(wb,wa)=>{ const a=103.1668*Math.exp(-0.04354*Math.max(0,wb-wa))-3.1669; return Math.max(0,Math.min(100,a)); };
  const accsW=[], accsB=[];
  reviewPhases=computePhases(fens, gameMeta&&gameMeta.bookPlies);
  reviewMoveAcc=new Array(fullHistory.length);

  for(let i=0;i<fullHistory.length;i++){
    const moverWhite=(fens[i].split(' ')[1]==='w');
    const sign=moverWhite?1:-1;
    const before=evals[i], after=evals[i+1];
    const cl = sign*(before-after);                 // centipawn loss (sudut pandang mover)
    const evalAfterMover = sign*after;
    const wb=winPct(sign*before), wa=winPct(sign*after);
    const wl=wb-wa;                                 // win% yang hilang akibat langkah ini
    const playedUci=(verbose[i].from+verbose[i].to+(verbose[i].promotion||'')).toLowerCase();
    const isBest = bestUci[i] && playedUci.slice(0,4)===bestUci[i].slice(0,4);
    let gapWl=0;                                    // selisih win% antara terbaik dan terbaik-kedua
    if(second[i]!==null) gapWl=winPct(sign*before)-winPct(sign*second[i]);
    let legalCount=2;
    try{ legalCount=new Chess(fens[i]).moves().length; }catch(e){}
    const sac = isSacrifice(fens[i+1], moverWhite?'w':'b', verbose[i].to, PVAL[verbose[i].captured]||0);
    // rekapture rutin pada kotak yang baru ditangkap lawan — tidak pernah "Hebat"
    const prev=i>0?verbose[i-1]:null;
    const trivialRecap=!!(verbose[i].captured && prev && prev.captured && prev.to===verbose[i].to);
    // "book" = di dalam jalur pembukaan yang cocok, atau posisi awal permainan standar yang ditemukan di
    // cache cloud lichess (permainan FEN kustom tidak pernah mendapat label buku — cache cloud menyimpan posisi apa pun)
    const isBook = (gameMeta && i<gameMeta.bookPlies) || (!startFen && i<20 && reviewBookHits && reviewBookHits[i+1]);
    const cat = classify({wl, gapWl, isBest, sac, trivialRecap, evalAfterMover, evalBeforeMover:sign*before, legalCount, isBook});
    reviewData[i]={cat, cl:Math.round(cl), moverWhite, to:verbose[i].to};
    reviewMoveAcc[i]=moveAcc(wb,wa);
    (moverWhite?accsW:accsB).push(reviewMoveAcc[i]);
  }
  reviewAccuracy={ w: gameAcc(accsW), b: gameAcc(accsB) };

  prog.style.display='none';bar.style.width='0';
  renderReview();
  gotoPly(0); // pemindaian selesai — mulai ulasan dari langkah 0
};

function renderReview(){
  const el=document.getElementById('reviewList');
  if(!reviewData){el.innerHTML='';return;}
  const counts={w:{},b:{}};
  ALL_ORDER.forEach(c=>{counts.w[c]=0;counts.b[c]=0;});
  for(let i=0;i<fullHistory.length;i++){
    const d=reviewData[i]; if(!d)continue;
    counts[d.moverWhite?'w':'b'][d.cat]++;
  }
  // daftar statistik langkah tunggal (Bagus + Buruk digabung), ikon berupa gambar
  const catRows=ALL_ORDER.map(c=>{
    const m=CATS[c];
    return `<div class="rs-row">
      <span class="rs-label">${m.label}</span>
      <span class="rs-count">${counts.w[c]}</span>
      <img class="rs-icon" src="${m.img}" alt="${m.label}" title="${m.label}" onerror="iconFallback(this,'${c}')">
      <span class="rs-count">${counts.b[c]}</span></div>`;
  }).join('');

  // kotak dua-kolom generik (dipakai untuk Akurasi & Rating Permainan) — profil pemain = Putih/Hitam saja
  const twoColBox=(title,wText,bText,wColor,bColor)=>`<div class="acc-box">
    <div class="acc-title">${title}</div>
    <div class="acc-grid">
      <div class="acc-cell"><div class="acc-label">Putih</div><div class="acc-val" style="color:${wColor||'var(--text)'}">${wText}</div></div>
      <div class="acc-cell"><div class="acc-label">Hitam</div><div class="acc-val" style="color:${bColor||'var(--text)'}">${bText}</div></div>
    </div>
  </div>`;

  const accuracy=reviewAccuracy?twoColBox('Akurasi',
    reviewAccuracy.w==null?'—':reviewAccuracy.w.toFixed(1)+'%',
    reviewAccuracy.b==null?'—':reviewAccuracy.b.toFixed(1)+'%',
    reviewAccuracy.w==null?null:accColorOf(reviewAccuracy.w),
    reviewAccuracy.b==null?null:accColorOf(reviewAccuracy.b)):'';

  const wElo=estEloOf(reviewAccuracy&&reviewAccuracy.w), bElo=estEloOf(reviewAccuracy&&reviewAccuracy.b);
  const ratingBox=reviewAccuracy?twoColBox('Rating Permainan',
    wElo==null?'—':String(wElo), bElo==null?'—':String(bElo)):'';

  // nama pembukaan
  const openingHtml=(gameMeta&&gameMeta.opening)?
    `<div class="opening-line">‎  ${esc(gameMeta.opening)}${gameMeta.eco?` <span class="num">(${esc(gameMeta.eco)})</span>`:''}</div>`:'';

  // grafik evaluasi (garis win%, area Putih, titik berwarna pada langkah penting)
  let graphHtml='';
  if(reviewEvals&&reviewEvals.length>1){
    const n=reviewEvals.length, W=440, H=100;
    const X=i=>(i/(n-1))*W, Y=cp=>H-(winPct(cp)/100)*H;
    let path=`M0,${H}`;
    for(let i=0;i<n;i++)path+=` L${X(i).toFixed(1)},${Y(reviewEvals[i]).toFixed(1)}`;
    path+=` L${W},${H} Z`;
    let line='';
    for(let i=0;i<n;i++)line+=(i?' L':'M')+X(i).toFixed(1)+','+Y(reviewEvals[i]).toFixed(1);
    let dots='';
    const DOT={brilliant:1,great:1,inaccuracy:1,mistake:1,miss:1,blunder:1};
    for(let i=0;i<fullHistory.length;i++){
      const d=reviewData[i];
      if(d&&DOT[d.cat])dots+=`<circle cx="${X(i+1).toFixed(1)}" cy="${Y(reviewEvals[i+1]).toFixed(1)}" r="3.4" fill="${CATS[d.cat].color}" stroke="#262626" stroke-width="1.2"><title>${i%2?'':(i/2+1)+'. '}${fullHistory[i]} — ${CATS[d.cat].label}</title></circle>`;
    }
    graphHtml=`<div class="graph-box"><svg id="evalGraph" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <rect x="0" y="0" width="${W}" height="${H}" fill="#100f0e"/>
      <line x1="0" y1="${H/2}" x2="${W}" y2="${H/2}" stroke="#4a4540" stroke-width="0.8" stroke-dasharray="4 4"/>
      <path d="${path}" fill="#ddd0b2" fill-opacity="0.9"/>
      <path d="${line}" fill="none" stroke="#a89a80" stroke-width="1"/>
      <line id="graphMarker" x1="${X(ply).toFixed(1)}" y1="0" x2="${X(ply).toFixed(1)}" y2="${H}" stroke="var(--accent)" stroke-width="1.6"/>
      ${dots}
    </svg></div>`;
  }

  // fase permainan: Pembukaan / Permainan Tengah / Permainan Akhir — satu label langkah (berdasarkan
  // akurasi fase tsb) per sisi; menekan ikon menampilkan box kecil berisi akurasinya
  let phaseHtml='';
  if(reviewPhases){
    const phaseRows=PHASE_ORDER.map(key=>{
      const idxs=[]; for(let i=0;i<fullHistory.length;i++) if(reviewPhases[i]===key) idxs.push(i);
      const wAcc=gameAccFor(idxs.filter(i=>reviewData[i].moverWhite));
      const bAcc=gameAccFor(idxs.filter(i=>!reviewData[i].moverWhite));
      const wCat=phaseGradeCat(wAcc), bCat=phaseGradeCat(bAcc);
      const gradeBtn=(side,cat)=>{
        if(!cat) return `<span class="phase-grade-btn empty">—</span>`;
        const m=CATS[cat];
        return `<button type="button" class="phase-grade-btn" data-phase="${key}" data-side="${side}">
          <img src="${m.img}" alt="${m.label}" title="${side==='w'?'Putih':'Hitam'} · ${m.label}" onerror="iconFallback(this,'${cat}')"></button>`;
      };
      return `<div class="phase-row">
        <span class="rs-label">${PHASE_LABEL[key]}</span>
        ${gradeBtn('w',wCat)}
        ${gradeBtn('b',bCat)}
      </div>`;
    }).join('');
    phaseHtml=`<div class="phase-box">${phaseRows}</div>`;
  }

  let movesHtml='';
  for(let i=0;i<fullHistory.length;i++){
    const d=reviewData[i]; const m=d?CATS[d.cat]:null;
    if(i%2===0)movesHtml+=`<span class="num">${i/2+1}.</span>`;
    const badge=m?` <img class="rs-icon-inline" src="${m.img}" alt="${m.label}" title="${m.label}" onerror="iconFallback(this,'${d.cat}')">`:'';
    movesHtml+=`<span class="mv" data-ply="${i+1}">${fullHistory[i]}${badge}</span>`;
  }
  const shareBtn=reviewAccuracy?`<button class="btn" id="shareBtn" style="width:100%;margin:10px 0 0">📤 Bagikan kartu laporan</button>`:'';
  el.innerHTML=openingHtml+graphHtml
    +accuracy
    +`<div class="section-title">Statistik Langkah</div><div class="rs-list">${catRows}</div>`
    +ratingBox
    +`<div class="section-title">Fase Permainan</div>${phaseHtml}`
    +`<div id="labelDetailBox" class="ld-box"></div>`
    +`<div class="section-title">Riwayat Langkah</div><div>${movesHtml}</div>`
    +shareBtn;
  const sb=document.getElementById('shareBtn'); if(sb)sb.onclick=shareReport;
  el.querySelectorAll('.mv').forEach(s=>s.addEventListener('click',()=>gotoPly(+s.dataset.ply)));
  el.querySelectorAll('.phase-grade-btn[data-phase]').forEach(b=>b.addEventListener('click',()=>showPhaseAccuracy(b.dataset.phase,b.dataset.side)));
  const svg=document.getElementById('evalGraph');
  if(svg)svg.addEventListener('click',(e)=>{
    const r=svg.getBoundingClientRect();
    const i=Math.round((e.clientX-r.left)/r.width*(reviewEvals.length-1));
    gotoPly(Math.max(0,Math.min(reviewEvals.length-1,i)));
  });
  highlightReview();
}
/* Menampilkan box kecil berisi akurasi untuk satu sisi pada satu fase permainan,
   dipicu dengan menekan ikon label langkah pada bagian Fase Permainan. */
function showPhaseAccuracy(phase,side){
  const box=document.getElementById('labelDetailBox');
  if(!box||!reviewPhases)return;
  const idxs=[]; for(let i=0;i<fullHistory.length;i++) if(reviewPhases[i]===phase && reviewData[i].moverWhite===(side==='w')) idxs.push(i);
  const acc=gameAccFor(idxs);
  const cat=phaseGradeCat(acc);
  const m=cat?CATS[cat]:null;
  box.innerHTML=`<div class="ld-head">${m?`<img src="${m.img}" alt="${m.label}" onerror="iconFallback(this,'${cat}')">`:''}<b>${PHASE_LABEL[phase]} · ${side==='w'?'Putih':'Hitam'}</b>
      <button type="button" class="ld-close" id="ldClose">×</button></div>
    <div class="ld-stats"><span>Akurasi fase ini: <b>${acc==null?'—':acc.toFixed(1)+'%'}</b>${m?` · ${m.label}`:''}</span>
    <span>${idxs.length} langkah dihitung pada fase ini</span></div>`;
  box.style.display='block';
  const closeBtn=document.getElementById('ldClose');
  if(closeBtn)closeBtn.onclick=()=>{box.style.display='none';};
  box.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function highlightReview(){
  // sinkronkan penanda grafik + langkah saat ini di daftar langkah ulasan
  const mk=document.getElementById('graphMarker');
  if(mk&&reviewEvals&&reviewEvals.length>1){
    const x=(ply/(reviewEvals.length-1))*440;
    mk.setAttribute('x1',x);mk.setAttribute('x2',x);
  }
  document.querySelectorAll('#reviewList .mv').forEach(s=>s.classList.toggle('cur',+s.dataset.ply===ply));
}

/* scroll mouse di atas papan: scroll atas = langkah berikutnya, scroll bawah = langkah sebelumnya */
let wheelAcc=0;
document.querySelector('.boardbox').addEventListener('wheel',e=>{
  if(!fullHistory)return; // hanya saat permainan sedang dimuat
  e.preventDefault();
  if(wheelAcc!==0 && Math.sign(e.deltaY)!==Math.sign(wheelAcc)) wheelAcc=0; // ganti arah mereset
  wheelAcc+=e.deltaY;
  let steps=0;
  while(wheelAcc<=-80 && steps<2){ wheelAcc+=80; steps++; document.getElementById('navNext').click(); }
  steps=0;
  while(wheelAcc>=80 && steps<2){ wheelAcc-=80; steps++; document.getElementById('navPrev').click(); }
},{passive:false});

/* navigasi keyboard */
document.addEventListener('keydown',e=>{
  if(e.target.tagName==='TEXTAREA'||e.target.tagName==='INPUT')return;
  if(e.key==='ArrowLeft')document.getElementById('navPrev').click();
  if(e.key==='ArrowRight')document.getElementById('navNext').click();
  if(e.key==='f')document.getElementById('navFlip').click();
});

/* ---------- boot ---------- */
try{
  const cc=localStorage.getItem('cc_user_cc')||localStorage.getItem('cc_user')||'';
  const li=localStorage.getItem('cc_user_li')||'';
  if(cc)document.getElementById('ccUserCc').value=cc;
  if(li)document.getElementById('ccUserLi').value=li;
  if(cc)populateMonths();
}catch(e){}
render();
rebuildMoveList();
initSounds();
initEngine();
setTimeout(()=>{ if(engineReady)triggerAnalysis(); else setTimeout(triggerAnalysis,1500); },800);

/* mendaftarkan service worker (app shell offline) — hanya http/https, bukan file:// */
if('serviceWorker' in navigator && location.protocol.startsWith('http')){
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
}
