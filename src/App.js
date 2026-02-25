import { useState, useEffect, useReducer, useRef } from "react";

// ── PIXEL SPRITE ENGINE ───────────────────────────────────────────────────────
const px = 6;
const SPRITES = {
  seedling:    { pixels:[[2,4,"stem"],[2,3,"stem"],[1,2,"leaf"],[2,2,"stem"],[3,2,"leaf"],[2,1,"leaf"]], w:5, h:6 },
  smallFlower: { pixels:[[2,5,"stem"],[2,4,"stem"],[2,3,"stem"],[1,2,"petal"],[2,2,"center"],[3,2,"petal"],[2,1,"petal"]], w:5, h:7 },
  flower:      { pixels:[[2,7,"stem"],[2,6,"stem"],[2,5,"stem"],[1,4,"leaf"],[3,4,"leaf"],[2,4,"stem"],[1,3,"petal"],[3,3,"petal"],[2,3,"petal"],[2,2,"center"],[1,2,"petal"],[3,2,"petal"],[2,1,"petal"]], w:5, h:9 },
  tree:        { pixels:[[3,9,"bark"],[3,8,"bark"],[3,7,"bark"],[2,6,"canopy"],[3,6,"canopy"],[4,6,"canopy"],[1,5,"canopy"],[2,5,"canopy"],[3,5,"canopy"],[4,5,"canopy"],[5,5,"canopy"],[1,4,"canopy"],[2,4,"canopy"],[3,4,"canopy"],[4,4,"canopy"],[5,4,"canopy"],[2,3,"canopy"],[3,3,"canopy"],[4,3,"canopy"],[3,2,"canopy"],[2,2,"canopyDark"],[4,2,"canopyDark"],[3,1,"canopyTip"]], w:7, h:11 },
  withered:    { pixels:[[2,6,"dead"],[2,5,"dead"],[1,4,"deadLeaf"],[3,4,"deadLeaf"],[2,4,"dead"],[2,3,"dead"],[1,2,"deadLeaf"],[3,2,"deadLeaf"]], w:5, h:8 },
};
const C = {
  stem:"#5a8a3c", leaf:"#6dbf4b", petal:"#f7b2d9", center:"#ffd166",
  canopy:"#4a9e5c", canopyDark:"#2d7a40", canopyTip:"#7dd96a",
  bark:"#8b5e3c", dead:"#7a6648", deadLeaf:"#5c4a30",
};

function Sprite({ type, scale = 1 }) {
  const sp = SPRITES[type]; if (!sp) return null;
  const s = px * scale;
  const shadow = sp.pixels.map(([col, row, k]) => `${col*s}px ${row*s}px 0 ${C[k]}`).join(",");
  return (
    <div style={{ position:"relative", width:sp.w*s, height:sp.h*s, flexShrink:0 }}>
      <div style={{ position:"absolute", width:s, height:s, boxShadow:shadow }} />
    </div>
  );
}

// ── DATA ──────────────────────────────────────────────────────────────────────
const GARDENS = [
  { id:"work",     name:"Work & Study", emoji:"💼", color:"#2d6b8f", light:"#e8f4fd", accent:"#5ba3d0" },
  { id:"health",   name:"Health",       emoji:"🌿", color:"#2d7a44", light:"#e8f8ee", accent:"#5abf78" },
  { id:"creative", name:"Creative",     emoji:"🎨", color:"#7b3fa0", light:"#f3e8fb", accent:"#b07dd6" },
  { id:"social",   name:"Social",       emoji:"✨", color:"#b06020", light:"#fdf0e0", accent:"#e09050" },
];
const STAGES = ["seedling","smallFlower","flower","tree"];
const mkPlant = (id, x, stage, dead=false) => ({ id, x, stage: dead?"withered":stage, dead });
const mkTask  = (id, text, gid, dur) => ({ id, text, gid, dur, status:"pending" });

const INIT = {
  view:"forest", garden:null, xp:0, streak:0, resultType:null,
  timer:{ running:false, elapsed:0, total:0, taskId:null },
  gardens:{
    work:     { plants:[
      mkPlant("p1",  60,  "tree"),
      mkPlant("p2",  150, "flower"),
      mkPlant("p3",  240, "tree"),
      mkPlant("p4",  330, "smallFlower"),
      mkPlant("p5",  420, "flower"),
      mkPlant("p6",  510, "seedling"),
      mkPlant("p7",  600, "smallFlower"),
      mkPlant("p8",  110, "withered", true),
      mkPlant("p9",  370, "tree"),
      mkPlant("p10", 480, "flower"),
    ] },
    health:   { plants:[mkPlant("p4",100,"tree"),  mkPlant("p5",280,"smallFlower")] },
    creative: { plants:[mkPlant("p6",130,"smallFlower"), mkPlant("p7",320,"withered",true)] },
    social:   { plants:[] },
  },
  tasks:[
    mkTask("t1","Read for 25 minutes","work",25),
    mkTask("t2","Morning jog","health",30),
    mkTask("t3","Sketch something","creative",20),
    mkTask("t4","Call a friend","social",15),
    mkTask("t5","Deep work block","work",45),
  ],
};

function reducer(s, a) {
  switch(a.type) {
    case "GOTO":   return { ...s, view:"garden", garden:a.id };
    case "BACK":   return { ...s, view:"forest", garden:null };
    case "START": {
      const t = s.tasks.find(t=>t.id===a.id);
      return { ...s, view:"focus", timer:{ running:true, elapsed:0, total:t.dur*60, taskId:a.id } };
    }
    case "TICK": {
      if (!s.timer.running) return s;
      const e = s.timer.elapsed + 1;
      if (e >= s.timer.total) return { ...s, timer:{ ...s.timer, running:false, elapsed:s.timer.total } };
      return { ...s, timer:{ ...s.timer, elapsed:e } };
    }
    case "PAUSE":  return { ...s, timer:{ ...s.timer, running:!s.timer.running } };
    case "FAST_FORWARD": {
      const step = Math.ceil(s.timer.total * 0.1);
      const newElapsed = Math.min(s.timer.elapsed + step, s.timer.total);
      return { ...s, timer:{ ...s.timer, elapsed: newElapsed, running: newElapsed < s.timer.total } };
    }
    case "COMPLETE": {
      const t    = s.tasks.find(t=>t.id===s.timer.taskId);
      const prog = s.timer.total > 0 ? s.timer.elapsed/s.timer.total : 1;
      const stage= STAGES[Math.min(Math.floor(prog*4),3)];
      const plant= mkPlant(`p${Date.now()}`, 60+Math.random()*500, stage);
      return { ...s, view:"result", resultType:"done",
        tasks: s.tasks.map(t=>t.id===s.timer.taskId?{...t,status:"done"}:t),
        gardens: { ...s.gardens, [t.gid]:{ plants:[...s.gardens[t.gid].plants, plant] } },
        xp: s.xp+25, streak: s.streak+1, garden: t.gid,
        timer:{ running:false, elapsed:0, total:0, taskId:null } };
    }
    case "FAIL": {
      const tid  = a.id || s.timer.taskId;
      const t    = s.tasks.find(t=>t.id===tid);
      const plant= mkPlant(`w${Date.now()}`, 60+Math.random()*500, "withered", true);
      return { ...s, view:"result", resultType:"fail",
        tasks: s.tasks.map(t=>t.id===tid?{...t,status:"failed"}:t),
        gardens: { ...s.gardens, [t.gid]:{ plants:[...s.gardens[t.gid].plants, plant] } },
        garden: t.gid, timer:{ running:false, elapsed:0, total:0, taskId:null } };
    }
    case "DISMISS":   return { ...s, view: s.garden?"garden":"forest", resultType:null };
    case "ADD_TASK":  return { ...s, tasks:[...s.tasks, mkTask(`t${Date.now()}`,a.text,a.gid,a.dur)] };
    default: return s;
  }
}

// ── SHARED STYLES ─────────────────────────────────────────────────────────────
const F = "'Press Start 2P', monospace";
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0b0b14; }
  @keyframes sway    { 0%{transform:rotate(-2deg)} 100%{transform:rotate(2deg)} }
  @keyframes pop     { 0%{transform:scale(0)} 65%{transform:scale(1.25)} 100%{transform:scale(1)} }
  @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.5} }
  @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
  @keyframes float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  ::-webkit-scrollbar { width:6px; background:#111 }
  ::-webkit-scrollbar-thumb { background:#333; border-radius:3px }
`;

const Btn = ({ children, onClick, color="#4a9e5c", textColor="#fff", style={} }) => (
  <button onClick={onClick} style={{
    background: color, border:"none", color: textColor,
    fontFamily: F, fontSize:13, padding:"14px 22px",
    cursor:"pointer", letterSpacing:1, lineHeight:1.4,
    transition:"transform .1s, opacity .1s",
    ...style,
  }}
  onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.04)";e.currentTarget.style.opacity=".92"}}
  onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.opacity="1"}}
  onMouseDown={e=>e.currentTarget.style.transform="scale(.97)"}
  onMouseUp={e=>e.currentTarget.style.transform="scale(1.04)"}
  >{children}</button>
);

// ── FOREST VIEW ───────────────────────────────────────────────────────────────
function ForestView({ s, dispatch }) {
  const totalHealthy = Object.values(s.gardens).reduce((a,g)=>a+g.plants.filter(p=>!p.dead).length,0);
  const totalPlants  = Object.values(s.gardens).reduce((a,g)=>a+g.plants.length,0);

  return (
    <div style={{ fontFamily:F, background:"#0b0b14", minHeight:"100vh", animation:"slideUp .35s ease" }}>
      <style>{CSS}</style>

      {/* ── HERO BANNER ── */}
      <div style={{ position:"relative", height:200, overflow:"hidden",
        background:"linear-gradient(180deg,#0a2a4a 0%,#1a5c3a 60%,#2d8a50 100%)",
        borderBottom:"4px solid #1a6b35" }}>

        {/* Stars */}
        {[[8,12],[60,8],[130,20],[200,5],[310,15],[420,8],[510,18],[600,10],[680,14]].map(([x,y],i)=>(
          <div key={i} style={{position:"absolute",left:x,top:y,width:3,height:3,background:"#fff",opacity:.6+i*.04}}/>
        ))}

        {/* Pixel clouds */}
        {[[40,30],[230,22],[480,35],[640,18]].map(([x,y],i)=>(
          <div key={i} style={{position:"absolute",left:x,top:y,display:"flex"}}>
            {[14,22,18,14].map((w,j)=>(
              <div key={j} style={{width:w,height:12,background:"rgba(255,255,255,.18)",marginRight:j<3?-3:0}}/>
            ))}
          </div>
        ))}

        {/* Tree silhouettes */}
        {[0,55,115,185,260,340,415,490,565,635,700].map((x,i)=>(
          <div key={i} style={{position:"absolute",bottom:0,left:x,width:0,height:0,
            borderLeft:"20px solid transparent",borderRight:"20px solid transparent",
            borderBottom:`${55+(i%4)*20}px solid ${["#0d4a22","#155e2c","#1a7535","#0a3d1a"][i%4]}`}}/>
        ))}

        {/* Moon */}
        <div style={{position:"absolute",top:18,right:48,width:36,height:36,
          background:"#fffbe8",borderRadius:"50%",
          boxShadow:"0 0 20px rgba(255,245,180,.5)"}}/>

        {/* Title */}
        <div style={{position:"absolute",top:20,left:"50%",transform:"translateX(-50%)",textAlign:"center",whiteSpace:"nowrap"}}>
          <div style={{fontSize:20,color:"#fff",textShadow:"2px 2px 0 #0a3d1a,4px 4px 0 rgba(0,0,0,.3)",letterSpacing:2,animation:"float 4s ease infinite"}}>
            🌲 MyGardens 🌲
          </div>
          <div style={{fontSize:9,color:"#a8e6bf",marginTop:10,letterSpacing:3,textShadow:"1px 1px 0 #0a3d1a"}}>
            YOUR LIVING FOREST
          </div>
        </div>
      </div>

      {/* ── XP BAR ── */}
      <div style={{background:"#13132b",padding:"12px 20px",display:"flex",alignItems:"center",gap:14,
        borderBottom:"3px solid #ffd166"}}>
        <span style={{fontSize:10,color:"#ffd166",whiteSpace:"nowrap"}}>⭐ XP {s.xp}</span>
        <div style={{flex:1,height:12,background:"#1e1e3a",border:"2px solid #333",borderRadius:0}}>
          <div style={{width:`${s.xp%100}%`,height:"100%",
            background:"linear-gradient(90deg,#f7a800,#ffd166)",
            transition:"width .6s ease"}}/>
        </div>
        <div style={{display:"flex",gap:16,flexShrink:0}}>
          <span style={{fontSize:10,color:"#ff8c69"}}>🔥 {s.streak} streak</span>
          <span style={{fontSize:10,color:"#88e0a0"}}>🌿 {totalHealthy}/{totalPlants}</span>
        </div>
      </div>

      {/* ── GARDEN GRID ── */}
      <div style={{padding:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {GARDENS.map(g => {
          const gd = s.gardens[g.id];
          const healthy = gd.plants.filter(p=>!p.dead).length;
          const pct = gd.plants.length ? Math.round(healthy/gd.plants.length*100) : 0;
          const barColor = pct>65?"#4dbb6e":pct>35?"#f7c948":"#e05050";
          return (
            <div key={g.id} onClick={()=>dispatch({type:"GOTO",id:g.id})}
              style={{ background:g.light, cursor:"pointer", borderRadius:0,
                border:`3px solid ${g.color}`, borderBottom:`6px solid ${g.color}`,
                padding:"18px 16px 14px", position:"relative", overflow:"hidden",
                minHeight:160, transition:"transform .15s, box-shadow .15s" }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=`0 8px 24px ${g.color}55`}}
              onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none"}}>

              {/* mini plants */}
              <div style={{position:"absolute",bottom:0,right:8,display:"flex",gap:4,alignItems:"flex-end"}}>
                {gd.plants.slice(0,4).map(p=>(
                  <Sprite key={p.id} type={p.stage} scale={0.75}/>
                ))}
                {!gd.plants.length && <div style={{fontSize:26,opacity:.2,marginBottom:6}}>🌱</div>}
              </div>

              <div style={{fontSize:13,color:g.color,marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:20}}>{g.emoji}</span> {g.name}
              </div>
              <div style={{fontSize:10,color:"#666",marginBottom:12}}>{gd.plants.length} plants growing</div>

              {/* health bar */}
              <div style={{height:8,background:"rgba(0,0,0,.12)",border:`2px solid ${g.color}55`}}>
                <div style={{width:`${pct||4}%`,height:"100%",background:barColor,transition:"width .6s"}}/>
              </div>
              <div style={{fontSize:9,color:"#888",marginTop:6}}>{pct}% thriving</div>

              {/* arrow */}
              <div style={{position:"absolute",top:14,right:14,fontSize:16,color:g.color,opacity:.5}}>›</div>
            </div>
          );
        })}
      </div>

      {/* ── TODAY'S QUESTS ── */}
      <div style={{padding:"0 16px 20px"}}>
        <div style={{background:"#13132b",border:"2px solid #222",padding:"16px"}}>
          <div style={{fontSize:12,color:"#ffd166",marginBottom:14,letterSpacing:2}}>📋 TODAY'S QUESTS</div>
          {s.tasks.filter(t=>t.status==="pending").slice(0,5).map(t => {
            const g = GARDENS.find(g=>g.id===t.gid);
            return (
              <div key={t.id} onClick={()=>dispatch({type:"START",id:t.id})}
                style={{ display:"flex", alignItems:"center", gap:12,
                  padding:"14px 16px", marginBottom:6, cursor:"pointer",
                  background:"rgba(255,255,255,.04)", borderLeft:`4px solid ${g.color}`,
                  transition:"background .15s, transform .1s" }}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.1)";e.currentTarget.style.transform="translateX(4px)"}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.04)";e.currentTarget.style.transform="translateX(0)"}}>
                <span style={{fontSize:18}}>{g.emoji}</span>
                <span style={{flex:1,fontSize:10,color:"#ddd",lineHeight:1.6}}>{t.text}</span>
                <span style={{fontSize:9,color:"#666",marginRight:8}}>{t.dur}m</span>
                <span style={{fontSize:14,color:g.color}}>▶</span>
              </div>
            );
          })}
          {!s.tasks.filter(t=>t.status==="pending").length && (
            <div style={{fontSize:11,color:"#4a9e5c",textAlign:"center",padding:16,lineHeight:2}}>
              ✨ All quests complete today!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── GARDEN VIEW ───────────────────────────────────────────────────────────────
function GardenView({ s, dispatch, openModal }) {
  const g  = GARDENS.find(g=>g.id===s.garden);
  const gd = s.gardens[s.garden];
  const tasks = s.tasks.filter(t=>t.gid===s.garden);

  return (
    <div style={{ fontFamily:F, background:"#0b0b14", minHeight:"100vh", animation:"slideUp .3s ease" }}>
      <style>{CSS}</style>

      {/* header */}
      <div style={{ background:g.color, padding:"14px 18px", display:"flex", alignItems:"center", gap:12 }}>
        <Btn onClick={()=>dispatch({type:"BACK"})} color="rgba(0,0,0,.35)" style={{fontSize:11,padding:"10px 16px"}}>← BACK</Btn>
        <span style={{fontSize:14,color:"#fff",marginLeft:4}}>{g.emoji} {g.name}</span>
        <span style={{marginLeft:"auto",fontSize:10,color:"rgba(255,255,255,.8)"}}>
          {gd.plants.filter(p=>!p.dead).length} healthy
        </span>
      </div>

      {/* garden canvas */}
      <div style={{ width:"100%", height:300, position:"relative", overflow:"hidden",
        background:`linear-gradient(180deg,${g.light} 0%,#c8efc8 65%,#9dd89d 100%)`,
        borderBottom:"5px solid #3a7d44" }}>

        {/* sky dots */}
        {[[60,20],[180,35],[350,18],[520,28],[650,12]].map(([x,y],i)=>(
          <div key={i} style={{position:"absolute",left:x,top:y,width:5,height:5,background:"rgba(255,255,255,.55)",borderRadius:"50%"}}/>
        ))}

        {/* plants */}
        {gd.plants.map(p => (
          <div key={p.id} style={{
            position:"absolute", left:Math.min(p.x, 640), bottom:44,
            animation: p.dead?"none":"sway 3.5s ease-in-out infinite alternate",
          }}>
            <Sprite type={p.stage} scale={p.stage==="tree"?2.2:1.8}/>
          </div>
        ))}

        {/* empty state */}
        {!gd.plants.length && (
          <div style={{position:"absolute",top:"38%",left:"50%",transform:"translate(-50%,-50%)",
            textAlign:"center",fontSize:10,color:"#888",lineHeight:2.4}}>
            No plants yet!<br/>Complete a task to<br/>grow your first 🌱
          </div>
        )}

        {/* ground */}
        <div style={{position:"absolute",bottom:0,width:"100%",height:44,
          background:"linear-gradient(180deg,#4a9a3c,#3a7a2c)",
          borderTop:"4px solid rgba(0,0,0,.2)"}}/>
      </div>

      {/* tasks panel */}
      <div style={{padding:"16px 16px 24px",background:"#0b0b14"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <span style={{fontSize:12,color:g.color,letterSpacing:2}}>TASKS</span>
          <Btn onClick={openModal} color={g.color} style={{fontSize:10,padding:"10px 18px"}}>+ NEW TASK</Btn>
        </div>

        {tasks.map(t => {
          const done   = t.status==="done";
          const failed = t.status==="failed";
          return (
            <div key={t.id} style={{
              display:"flex", alignItems:"center", gap:12,
              padding:"16px", marginBottom:8,
              background: done?"rgba(74,158,92,.12)":failed?"rgba(192,57,43,.12)":"rgba(255,255,255,.04)",
              borderLeft:`5px solid ${done?"#4a9e5c":failed?"#c0392b":g.color}`,
              transition:"background .15s"
            }}>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:done?"#5abf78":failed?"#e05050":"#ddd",lineHeight:1.7}}>
                  {done?"✓ ":failed?"✗ ":""}{t.text}
                </div>
                <div style={{fontSize:9,color:"#555",marginTop:5}}>{t.dur} min focus</div>
              </div>
              {t.status==="pending" && (
                <div style={{display:"flex",gap:8,flexShrink:0}}>
                  <Btn onClick={()=>dispatch({type:"START",id:t.id})} color="#4a9e5c" style={{fontSize:10,padding:"10px 16px"}}>▶ GO</Btn>
                  <Btn onClick={()=>dispatch({type:"FAIL",id:t.id})} color="rgba(180,40,40,.5)"
                    style={{fontSize:10,padding:"10px 12px",border:"2px solid #c0392b"}}>✗</Btn>
                </div>
              )}
            </div>
          );
        })}
        {!tasks.length && (
          <div style={{fontSize:10,color:"#444",textAlign:"center",padding:20,lineHeight:2}}>
            No tasks in this garden yet.<br/>Tap + NEW TASK to begin.
          </div>
        )}
      </div>
    </div>
  );
}

// ── FOCUS TIMER ───────────────────────────────────────────────────────────────
function FocusView({ s, dispatch }) {
  const t     = s.tasks.find(t=>t.id===s.timer.taskId);
  const g     = GARDENS.find(g=>g.id===t?.gid);
  const prog  = s.timer.total > 0 ? Math.min(s.timer.elapsed/s.timer.total,1) : 0;
  const rem   = Math.max(s.timer.total - s.timer.elapsed, 0);
  const stage = STAGES[Math.min(Math.floor(prog*4),3)];
  const mm    = String(Math.floor(rem/60)).padStart(2,"0");
  const ss    = String(rem%60).padStart(2,"0");

  return (
    <div style={{ fontFamily:F, background:"#070d14", minHeight:"100vh", animation:"slideUp .3s ease" }}>
      <style>{CSS}</style>
      <div style={{ background:g?.color||"#333", padding:"14px 18px", display:"flex", alignItems:"center" }}>
        <span style={{fontSize:13,color:"#fff"}}>{g?.emoji} FOCUS SESSION</span>
        <span style={{marginLeft:"auto",fontSize:10,color:"rgba(255,255,255,.65)",maxWidth:260,
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t?.text}</span>
      </div>

      <div style={{
        minHeight:"calc(100vh - 52px)",
        background:"linear-gradient(160deg,#050c18 0%,#0d2035 45%,#0a1f10 100%)",
        display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", gap:32, padding:"32px 20px"
      }}>

        {/* plant preview */}
        <div style={{
          background:"rgba(255,255,255,.04)",
          border:"2px solid rgba(255,255,255,.08)",
          padding:"28px 48px",
          display:"flex", flexDirection:"column", alignItems:"center", gap:12
        }}>
          <div style={{fontSize:10,color:"rgba(255,255,255,.35)",letterSpacing:3,marginBottom:6}}>GROWING...</div>
          <Sprite type={stage} scale={3.2}/>
          <div style={{fontSize:10,color:"rgba(255,255,255,.28)",marginTop:6,letterSpacing:2}}>
            {stage.replace("smallFlower","SMALL FLOWER").toUpperCase()}
          </div>
        </div>

        {/* timer */}
        <div style={{
          fontSize:58, color:"#ffd166", letterSpacing:6,
          textShadow:`0 0 30px rgba(255,209,102,.55), 0 0 60px rgba(255,209,102,.2)`,
          animation: s.timer.running ? "pulse 2.5s ease infinite" : "none"
        }}>
          {mm}:{ss}
        </div>

        {/* progress bar */}
        <div style={{width:"min(420px,90vw)"}}>
          <div style={{height:14,background:"rgba(255,255,255,.08)",border:"2px solid rgba(255,255,255,.12)",marginBottom:10}}>
            <div style={{
              width:`${prog*100}%`, height:"100%",
              background:"linear-gradient(90deg,#2d8a50,#ffd166)",
              transition:"width 1s linear"
            }}/>
          </div>
          <div style={{fontSize:10,color:"rgba(255,255,255,.35)",textAlign:"center"}}>
            {Math.round(prog*100)}% complete
          </div>
        </div>

        {/* demo fast-forward strip */}
        <div style={{
          display:"flex", flexDirection:"column", alignItems:"center", gap:10,
          padding:"14px 20px", border:"2px dashed rgba(255,209,102,.3)",
          background:"rgba(255,209,102,.04)", width:"min(420px,90vw)"
        }}>
          <div style={{fontSize:9,color:"rgba(255,209,102,.6)",letterSpacing:2}}>⚡ DEMO MODE</div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <Btn onClick={()=>dispatch({type:"FAST_FORWARD"})}
              color="rgba(255,209,102,.15)"
              style={{fontSize:11,padding:"12px 20px",border:"2px solid rgba(255,209,102,.4)",color:"#ffd166"}}>
              ⏩ +10%
            </Btn>
            <Btn onClick={()=>{ for(let i=0;i<10;i++) dispatch({type:"FAST_FORWARD"}); }}
              color="rgba(255,209,102,.15)"
              style={{fontSize:11,padding:"12px 20px",border:"2px solid rgba(255,209,102,.4)",color:"#ffd166"}}>
              ⏭ FILL ALL
            </Btn>
          </div>
          <div style={{fontSize:8,color:"rgba(255,255,255,.2)",letterSpacing:1}}>tap to advance progress bar</div>
        </div>

        {/* controls */}
        <div style={{display:"flex",gap:14,flexWrap:"wrap",justifyContent:"center"}}>
          <Btn onClick={()=>dispatch({type:"PAUSE"})}
            color={s.timer.running?"#c0392b":"#2d8a50"}
            style={{fontSize:12,padding:"16px 28px"}}>
            {s.timer.running?"⏸  PAUSE":"▶  RESUME"}
          </Btn>
          <Btn onClick={()=>dispatch({type:"COMPLETE"})}
            color="#ffd166" textColor="#0d1a0d"
            style={{fontSize:12,padding:"16px 28px"}}>
            ✓  DONE!
          </Btn>
          <Btn onClick={()=>dispatch({type:"FAIL"})}
            color="rgba(255,255,255,.05)"
            style={{fontSize:11,padding:"16px 22px",border:"2px solid rgba(255,255,255,.15)",color:"rgba(255,255,255,.4)"}}>
            QUIT
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── RESULT SCREEN ─────────────────────────────────────────────────────────────
function ResultView({ s, dispatch }) {
  const ok = s.resultType === "done";
  return (
    <div style={{
      fontFamily:F, minHeight:"100vh", animation:"slideUp .3s ease",
      background: ok ? "radial-gradient(ellipse at center,#0d3a1a 0%,#060d06 100%)"
                     : "radial-gradient(ellipse at center,#2a0a0a 0%,#0a0608 100%)",
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", gap:24, padding:"40px 24px", textAlign:"center"
    }}>
      <style>{CSS}</style>
      <div style={{fontSize:72,animation:"pop .6s ease forwards",lineHeight:1}}>{ok?"🌸":"🥀"}</div>
      <div style={{fontSize:18,color:ok?"#5abf78":"#e05050",letterSpacing:1,lineHeight:1.5}}>
        {ok?"TASK COMPLETE!":"TASK FAILED"}
      </div>
      <div style={{fontSize:11,color:"#666",maxWidth:300,lineHeight:2.4}}>
        {ok?"A new plant has bloomed in your garden!\n+25 XP earned.":"A withered plant now marks this attempt in your garden."}
      </div>
      <div style={{animation:"pop .7s .1s ease both",marginTop:8}}>
        <Sprite type={ok?"flower":"withered"} scale={4.5}/>
      </div>
      <Btn onClick={()=>dispatch({type:"DISMISS"})}
        color={ok?"#2d8a50":"#5a1818"}
        style={{fontSize:13,padding:"18px 36px",marginTop:12}}>
        CONTINUE →
      </Btn>
    </div>
  );
}

// ── ADD TASK MODAL ────────────────────────────────────────────────────────────
function Modal({ gardenId, onAdd, onClose }) {
  const [text, setText] = useState("");
  const [dur,  setDur]  = useState(25);
  const g = GARDENS.find(g=>g.id===gardenId);

  const submit = () => {
    if (!text.trim()) return;
    onAdd(text, dur);
    setText(""); 
  };

  return (
    <div style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,.88)",
      display:"flex",alignItems:"center",justifyContent:"center",
      zIndex:999,fontFamily:F,padding:20
    }}>
      <div style={{
        background:"#14142a",width:"min(400px,100%)",
        border:`3px solid ${g.color}`,borderBottom:`6px solid ${g.color}`,
        padding:28
      }}>
        <div style={{fontSize:12,color:g.color,marginBottom:18,letterSpacing:1}}>
          {g.emoji} NEW TASK — {g.name}
        </div>
        <input
          value={text} onChange={e=>setText(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&submit()}
          placeholder="What will you do?"
          autoFocus
          style={{
            width:"100%",background:"rgba(255,255,255,.07)",
            border:"2px solid #333",color:"#fff",
            padding:"12px 14px",fontSize:11,fontFamily:F,
            marginBottom:16,outline:"none",lineHeight:1.5
          }}
        />
        <div style={{fontSize:10,color:"#666",marginBottom:10,letterSpacing:1}}>SESSION LENGTH</div>
        <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
          {[15,25,30,45,60].map(d=>(
            <button key={d} onClick={()=>setDur(d)} style={{
              background: dur===d ? g.color : "rgba(255,255,255,.06)",
              border: `2px solid ${dur===d?g.color:"#333"}`,
              color: dur===d?"#fff":"#888",
              fontSize:10,padding:"10px 14px",cursor:"pointer",fontFamily:F,
              transition:"all .15s"
            }}>{d}m</button>
          ))}
        </div>
        <div style={{display:"flex",gap:10}}>
          <Btn onClick={submit} color={g.color} style={{flex:1,fontSize:11,padding:"14px"}}>🌱 PLANT IT</Btn>
          <Btn onClick={onClose} color="rgba(255,255,255,.06)"
            style={{fontSize:11,padding:"14px 18px",border:"2px solid #333",color:"#666"}}>✗</Btn>
        </div>
      </div>
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function MyGardens() {
  const [s, dispatch] = useReducer(reducer, INIT);
  const [modal, setModal] = useState(false);
  const timerRef = useRef();

  useEffect(()=>{
    if (s.timer.running) timerRef.current = setInterval(()=>dispatch({type:"TICK"}), 1000);
    else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [s.timer.running]);

  return (
    <>
      {s.view==="forest"  && <ForestView s={s} dispatch={dispatch}/>}
      {s.view==="garden"  && <GardenView s={s} dispatch={dispatch} openModal={()=>setModal(true)}/>}
      {s.view==="focus"   && <FocusView  s={s} dispatch={dispatch}/>}
      {s.view==="result"  && <ResultView s={s} dispatch={dispatch}/>}
      {modal && s.view==="garden" && (
        <Modal
          gardenId={s.garden}
          onAdd={(text,dur)=>{ dispatch({type:"ADD_TASK",text,gid:s.garden,dur}); setModal(false); }}
          onClose={()=>setModal(false)}
        />
      )}
    </>
  );
}
