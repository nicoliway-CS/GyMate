import { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap');`;

const C = {
  bg: "#00061a",
  surface: "#000d2e",
  card: "#001240",
  cardHover: "#001a52",
  border: "#0a2060",
  borderBright: "#1a3a80",
  orange: "#FA4616",
  orangeGlow: "rgba(250,70,22,0.18)",
  orangeDim: "#c23510",
  blue: "#003087",
  blueBright: "#1155cc",
  blueGlow: "rgba(17,85,204,0.2)",
  text: "#e8edf8",
  textMuted: "#5a7aaa",
  textDim: "#2a4470",
  green: "#22c97a",
  red: "#ff4d6d",
  white: "#ffffff",
};

const EXERCISES = ["Bench Press", "Squat", "Deadlift", "OHP", "Barbell Row", "Curl"];

const mockRepData = [
  { rep:1, quality:88 }, { rep:2, quality:91 }, { rep:3, quality:85 },
  { rep:4, quality:80 }, { rep:5, quality:77 }, { rep:6, quality:72 },
  { rep:7, quality:68 }, { rep:8, quality:63 },
];

const mockWeekly = [
  { day:"MON", score:74 }, { day:"TUE", score:81 }, { day:"WED", score:0  },
  { day:"THU", score:88 }, { day:"FRI", score:76 }, { day:"SAT", score:92 }, { day:"SUN", score:0 },
];

// ── Tooltip ──────────────────────────────────────────────────────────────────
const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:C.card, border:`1px solid ${C.borderBright}`, borderRadius:8, padding:"8px 14px" }}>
      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:C.textMuted }}>{label}</div>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:C.orange, letterSpacing:1 }}>{payload[0].value}</div>
    </div>
  );
};

// ── Score Ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const r = 52, circ = 2 * Math.PI * r;
  const [anim, setAnim] = useState(0);
  useEffect(() => {
    let v = 0;
    const go = () => { v += 2; if (v <= score) { setAnim(v); requestAnimationFrame(go); } else setAnim(score); };
    setTimeout(() => requestAnimationFrame(go), 300);
  }, [score]);
  return (
    <div style={{ position:"relative", width:136, height:136, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <svg width="136" height="136" style={{ position:"absolute", transform:"rotate(-90deg)" }}>
        <circle cx="68" cy="68" r={r} fill="none" stroke={C.border} strokeWidth="7"/>
        <circle cx="68" cy="68" r={r} fill="none" stroke={C.orange} strokeWidth="7"
          strokeDasharray={`${(anim/100)*circ} ${circ}`} strokeLinecap="round"
          style={{ filter:`drop-shadow(0 0 8px ${C.orange})`, transition:"stroke-dasharray 0.05s" }}/>
      </svg>
      <div style={{ textAlign:"center", zIndex:1 }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, color:C.orange, letterSpacing:2, lineHeight:1 }}>{anim}</div>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:C.textMuted, letterSpacing:2 }}>SCORE</div>
      </div>
    </div>
  );
}

// ── Stat Box ──────────────────────────────────────────────────────────────────
function StatBox({ label, value, unit, hi }) {
  return (
    <div style={{ flex:1, background:hi?C.orangeGlow:C.surface, border:`1px solid ${hi?C.orange:C.border}`, borderRadius:10, padding:"10px 14px" }}>
      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:C.textMuted, letterSpacing:2, marginBottom:4 }}>{label}</div>
      <div style={{ display:"flex", alignItems:"baseline", gap:3 }}>
        <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, color:hi?C.orange:C.text, letterSpacing:1 }}>{value}</span>
        {unit && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:C.textMuted }}>{unit}</span>}
      </div>
    </div>
  );
}

// ── Input Field ───────────────────────────────────────────────────────────────
function Field({ label, type="text", placeholder, value, onChange, unit }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:C.textMuted, letterSpacing:2, display:"block", marginBottom:6 }}>{label.toUpperCase()}</label>
      <div style={{ position:"relative" }}>
        <input
          type={type} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)}
          onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
          style={{
            width:"100%", background:C.surface, border:`1px solid ${focused?C.orange:C.border}`,
            borderRadius:10, padding:`12px ${unit?"48px":"16px"} 12px 16px`,
            color:C.text, fontFamily:"'DM Sans',sans-serif", fontSize:14,
            outline:"none", boxSizing:"border-box", transition:"border-color 0.15s",
          }}
        />
        {unit && <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:C.textMuted }}>{unit}</span>}
      </div>
    </div>
  );
}

// ── Onboarding ────────────────────────────────────────────────────────────────
function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ name:"", email:"", university:"University of Florida", age:"", weight:"", height:"" });
  const set = (k, v) => setF(p => ({ ...p, [k]:v }));

  const valid = [
    f.name && f.email && f.university,
    f.age && f.weight && f.height
  ][step];

  return (
    <div style={{ position:"fixed", inset:0, zIndex:999, background:"rgba(0,6,26,0.97)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ position:"absolute", top:"-15%", left:"-10%", width:500, height:500, borderRadius:"50%", background:C.orangeGlow, filter:"blur(80px)", pointerEvents:"none" }}/>
      <div style={{ position:"absolute", bottom:"-15%", right:"-10%", width:500, height:500, borderRadius:"50%", background:C.blueGlow, filter:"blur(80px)", pointerEvents:"none" }}/>

      <div style={{ background:C.card, border:`1px solid ${C.borderBright}`, borderRadius:20, padding:"40px 44px", width:"100%", maxWidth:460, position:"relative", zIndex:1, boxShadow:`0 0 60px rgba(250,70,22,0.12)`, animation:"fadeUp 0.4s ease" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:28 }}>
          <div style={{ width:42, height:42, borderRadius:10, background:`linear-gradient(135deg,${C.orange},${C.orangeDim})`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:C.white, letterSpacing:1 }}>GM</div>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:3, color:C.white }}>GY<span style={{ color:C.orange }}>MATE</span></div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:C.textMuted, letterSpacing:2 }}>UNIVERSITY OF FLORIDA</div>
          </div>
        </div>

        <div style={{ display:"flex", gap:6, marginBottom:28 }}>
          {[0,1].map(i => (
            <div key={i} style={{ flex:1, height:3, borderRadius:2, background:i<=step?C.orange:C.border, transition:"background 0.3s" }}/>
          ))}
        </div>

        {step===0 && <>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, letterSpacing:2, marginBottom:4 }}>Welcome to GyMate</div>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMuted, marginBottom:24 }}>Set up your athlete profile to get started</div>
          <Field label="Full Name" placeholder="Alex Chen" value={f.name} onChange={v=>set("name",v)}/>
          <Field label="University Email" type="email" placeholder="gator@ufl.edu" value={f.email} onChange={v=>set("email",v)}/>
          <Field label="University" placeholder="University of Florida" value={f.university} onChange={v=>set("university",v)}/>
        </>}

        {step===1 && <>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, letterSpacing:2, marginBottom:4 }}>Your Body Stats</div>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:C.textMuted, marginBottom:24 }}>Used to compute your efficiency score accurately</div>
          <Field label="Age" type="number" placeholder="21" value={f.age} onChange={v=>set("age",v)} unit="yrs"/>
          <Field label="Body Weight" type="number" placeholder="165" value={f.weight} onChange={v=>set("weight",v)} unit="lbs"/>
          <Field label="Height" type="number" placeholder="70" value={f.height} onChange={v=>set("height",v)} unit="in"/>
        </>}

        <div style={{ display:"flex", gap:10, marginTop:28 }}>
          {step>0 && (
            <button onClick={()=>setStep(s=>s-1)} style={{ flex:1, padding:"13px", borderRadius:12, cursor:"pointer", background:"transparent", border:`1px solid ${C.border}`, color:C.textMuted, fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:14 }}>Back</button>
          )}
          <button
            disabled={!valid}
            onClick={async ()=>{ 
              if(step<1) { 
                setStep(s=>s+1); 
              } else {
                await fetch("http://127.0.0.1:8000/users", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(f)
                });
                localStorage.setItem("gymate_user", JSON.stringify(f));
                onComplete(f);
              }
            }}
            style={{
              flex:2, padding:"13px", borderRadius:12, border:"none",
              cursor:valid?"pointer":"not-allowed",
              background:valid?C.orange:C.border, color:C.white,
              fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:2,
              boxShadow:valid?`0 4px 20px rgba(250,70,22,0.35)`:"none",
              transition:"all 0.2s",
            }}>{step<1?"NEXT →":"LET'S GO →"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const BACKEND    = "http://127.0.0.1:8000";
const USER_EMAIL = "nicolasliwayaven@ufl.edu";
// Exercise keys that match what the Pi sends
const PI_EXERCISES = ["Squat", "Bench", "Lat Pull-Dwn"];

// Build leaderboards with dynamic user name
function buildLeaderboards(userName) {
  const u = userName || "You";
  // abbreviate to First L. format
  const parts = u.trim().split(" ");
  const short  = parts.length > 1 ? `${parts[0]} ${parts[parts.length-1][0]}.` : parts[0];

  return {
    "Bench Press": [
      { rank:1, name:"Jordan M.", score:96, weight:"225 lbs", delta:"+2" },
      { rank:2, name:"Priya S.",  score:94, weight:"185 lbs", delta:"+1" },
      { rank:3, name:"Tyler R.",  score:91, weight:"205 lbs", delta:"-1" },
      { rank:4, name:short,       score:88, weight:"175 lbs", delta:"+3", isUser:true },
      { rank:5, name:"Sam K.",    score:85, weight:"195 lbs", delta:"0"  },
      { rank:6, name:"Dana L.",   score:83, weight:"165 lbs", delta:"-2" },
    ],
    "Squat": [
      { rank:1, name:"Marcus T.", score:98, weight:"315 lbs", delta:"+1" },
      { rank:2, name:short,       score:93, weight:"275 lbs", delta:"+2", isUser:true },
      { rank:3, name:"Priya S.",  score:90, weight:"225 lbs", delta:"0"  },
      { rank:4, name:"Jordan M.", score:87, weight:"295 lbs", delta:"-1" },
      { rank:5, name:"Riley B.",  score:84, weight:"245 lbs", delta:"+1" },
    ],
    "Deadlift": [
      { rank:1, name:"Tyler R.",  score:97, weight:"405 lbs", delta:"0"  },
      { rank:2, name:"Sam K.",    score:92, weight:"365 lbs", delta:"+2" },
      { rank:3, name:short,       score:89, weight:"315 lbs", delta:"-1", isUser:true },
      { rank:4, name:"Marcus T.", score:86, weight:"385 lbs", delta:"+1" },
    ],
    "OHP": [
      { rank:1, name:short,       score:91, weight:"135 lbs", delta:"+4", isUser:true },
      { rank:2, name:"Dana L.",   score:88, weight:"115 lbs", delta:"+1" },
      { rank:3, name:"Riley B.",  score:85, weight:"125 lbs", delta:"-1" },
      { rank:4, name:"Priya S.",  score:82, weight:"95 lbs",  delta:"0"  },
    ],
    "Barbell Row": [
      { rank:1, name:"Sam K.",    score:94, weight:"225 lbs", delta:"+1" },
      { rank:2, name:"Jordan M.", score:90, weight:"205 lbs", delta:"0"  },
      { rank:3, name:short,       score:84, weight:"185 lbs", delta:"+2", isUser:true },
    ],
    "Curl": [
      { rank:1, name:"Dana L.",   score:93, weight:"55 lbs",  delta:"+3" },
      { rank:2, name:"Riley B.",  score:88, weight:"50 lbs",  delta:"+1" },
      { rank:3, name:short,       score:82, weight:"45 lbs",  delta:"0",  isUser:true },
      { rank:4, name:"Priya S.",  score:79, weight:"40 lbs",  delta:"-1" },
    ],
  };
}

function buildMostActive(userName) {
  const u = userName || "You";
  const parts = u.trim().split(" ");
  const short  = parts.length > 1 ? `${parts[0]} ${parts[parts.length-1][0]}.` : parts[0];
  return [
    { rank:1, name:"Marcus T.", sessions:52, streak:14, totalReps:1840 },
    { rank:2, name:"Priya S.",  sessions:47, streak:10, totalReps:1620 },
    { rank:3, name:"Sam K.",    sessions:44, streak:9,  totalReps:1510 },
    { rank:4, name:short,       sessions:38, streak:7,  totalReps:1290, isUser:true },
    { rank:5, name:"Tyler R.",  sessions:35, streak:5,  totalReps:1180 },
    { rank:6, name:"Jordan M.", sessions:31, streak:4,  totalReps:1040 },
    { rank:7, name:"Dana L.",   sessions:28, streak:3,  totalReps:960  },
  ];
}

export default function GyMateDashboard() {
  const [user, setUser] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(true);

  useEffect(() => {
    const cached = localStorage.getItem("gymate_user");
    if (cached) {
      const parsed = JSON.parse(cached);
      fetch(`${BACKEND}/users/${parsed.email}`)
        .then(r => r.json())
        .then(data => {
          if (data) { setUser(data); setShowOnboarding(false); }
        });
    }
  }, []);

  const [tab, setTab] = useState("dashboard");
  const [lbEx, setLbEx] = useState("Bench Press");

  // Session
  const [liveOn, setLiveOn] = useState(false);
  const [liveReps, setLiveReps] = useState(0);
  const [livePulse, setLivePulse] = useState(false);
  const [selEx, setSelEx] = useState("Bench Press");
  const [sets, setSets] = useState([]);
  const [setWeight, setSetWeight] = useState("");
  const [setRepsVal, setSetRepsVal] = useState("");
  const liveRef = useRef(null);

  // ── Last session from backend ─────────────────────────────────────────────
  const [lastSession, setLastSession] = useState(null);

  useEffect(() => {
    fetch(`${BACKEND}/sessions/${USER_EMAIL}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const sorted = [...data].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
          setLastSession(sorted[0]);
        }
      })
      .catch(() => {});
  }, []);

  // ── Real session data from backend ───────────────────────────────────────
  const [sessionData, setSessionData] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    if (tab !== "history") return;
    setLoadingSessions(true);
    fetch(`${BACKEND}/sessions/${USER_EMAIL}`)
      .then(r => r.json())
      .then(data => { setSessionData(Array.isArray(data) ? data : []); setLoadingSessions(false); })
      .catch(() => { setSessionData([]); setLoadingSessions(false); });
  }, [tab]);

  useEffect(() => {
    if (liveOn) {
      liveRef.current = setInterval(() => {
        setLiveReps(r => r+1); setLivePulse(true);
        setTimeout(() => setLivePulse(false), 300);
      }, 2200);
    } else {
      clearInterval(liveRef.current); setLiveReps(0);
    }
    return () => clearInterval(liveRef.current);
  }, [liveOn]);

  const addSet = () => {
    if (!setWeight || !setRepsVal) return;
    setSets(s => [...s, { weight:setWeight, reps:setRepsVal, id:Date.now() }]);
    setSetRepsVal("");
  };

  const TABS = ["dashboard","session","leaderboard","history"];

  // build leaderboards dynamically using real user name
  const mockLeaderboards    = buildLeaderboards(user?.name);
  const mostActiveLeaderboard = buildMostActive(user?.name);

  return (
    <>
      <style>{FONTS}</style>
      <style>{`
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:${C.bg}; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:${C.border}; border-radius:2px; }
        input::placeholder { color:${C.textDim}; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(250,70,22,0.4)} 50%{box-shadow:0 0 0 14px rgba(250,70,22,0)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .nav-tab:hover { background:${C.orangeGlow} !important; color:${C.orange} !important; }
        .ex-btn:hover  { background:${C.orangeGlow} !important; border-color:${C.orange} !important; color:${C.orange} !important; }
        .lb-pill:hover { color:${C.orange} !important; }
        .row-h:hover   { background:${C.cardHover} !important; }
      `}</style>

      {showOnboarding && <Onboarding onComplete={f=>{ setUser(f); setShowOnboarding(false); }}/>}

      <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'DM Sans',sans-serif", display:"flex", flexDirection:"column" }}>

        {/* ── Nav ── */}
        <nav style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 28px", borderBottom:`1px solid ${C.border}`, background:C.surface, position:"sticky", top:0, zIndex:50 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:34, height:34, background:`linear-gradient(135deg,${C.orange},${C.orangeDim})`, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:15, color:C.white, letterSpacing:1 }}>GM</div>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:2 }}>GY<span style={{ color:C.orange }}>MATE</span></span>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:C.textMuted, letterSpacing:2, marginLeft:4, paddingLeft:12, borderLeft:`1px solid ${C.border}` }}>UNIVERSITY OF FLORIDA</span>
          </div>
          <div style={{ display:"flex", gap:4 }}>
            {TABS.map(t => (
              <button key={t} className="nav-tab" onClick={()=>setTab(t)} style={{
                background:tab===t?C.orangeGlow:"transparent",
                color:tab===t?C.orange:C.textMuted,
                border:`1px solid ${tab===t?C.orange:"transparent"}`,
                borderRadius:8, padding:"6px 14px", cursor:"pointer",
                fontFamily:"'JetBrains Mono',monospace", fontSize:9, letterSpacing:1,
                textTransform:"uppercase", transition:"all 0.15s",
              }}>{t}</button>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {user && <>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:13, fontWeight:600 }}>{user.name||"Athlete"}</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:C.textMuted }}>UFL</div>
              </div>
              <div style={{ width:34, height:34, borderRadius:"50%", background:`linear-gradient(135deg,${C.orange},${C.blue})`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color:C.white }}>
                {(user.name||"A").split(" ").map(n=>n[0]).join("").slice(0,2)}
              </div>
              <button
                onClick={() => { localStorage.removeItem("gymate_user"); setUser(null); setShowOnboarding(true); }}
                style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 12px", color:C.textMuted, fontFamily:"'JetBrains Mono',monospace", fontSize:9, letterSpacing:1, cursor:"pointer" }}
              >SIGN OUT</button>
            </>}
          </div>
        </nav>

        {/* ── Content ── */}
        <div style={{ flex:1, padding:"24px 28px", maxWidth:1240, margin:"0 auto", width:"100%" }}>

          {/* ════════ DASHBOARD ════════ */}
          {tab==="dashboard" && (
            <div style={{ display:"flex", flexDirection:"column", gap:20, animation:"fadeUp 0.4s ease" }}>
              <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
                <div style={{ flex:2, minWidth:280, background:C.card, border:`1px solid ${C.borderBright}`, borderRadius:16, padding:"26px 28px", display:"flex", alignItems:"center", gap:24, position:"relative", overflow:"hidden" }}>
                  <div style={{ position:"absolute", top:-40, right:-40, width:220, height:220, borderRadius:"50%", background:C.orangeGlow, filter:"blur(50px)" }}/>
                  <ScoreRing score={lastSession ? Math.round((lastSession.good_reps / Math.max(lastSession.good_reps + lastSession.bad_reps, 1)) * 100) : 0}/>
                  <div style={{ zIndex:1 }}>
                    {lastSession ? <>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:C.orange, letterSpacing:2, marginBottom:8 }}>
                        LAST SESSION · {new Date(lastSession.timestamp).toLocaleDateString("en-US",{month:"short",day:"numeric"}).toUpperCase()}
                      </div>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:32, letterSpacing:2, lineHeight:1 }}>{lastSession.exercise}</div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:C.textMuted, marginTop:6 }}>
                        {lastSession.total_sets} sets · {lastSession.good_reps + lastSession.bad_reps} reps · {lastSession.good_reps} good / {lastSession.bad_reps} bad
                      </div>
                      <div style={{ marginTop:14, display:"inline-flex", alignItems:"center", gap:6, background:C.orangeGlow, border:`1px solid ${C.orange}`, borderRadius:20, padding:"4px 12px" }}>
                        <span>✅</span>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:C.orange, fontWeight:700 }}>
                          {Math.round((lastSession.good_reps / Math.max(lastSession.good_reps + lastSession.bad_reps, 1)) * 100)}% GOOD REPS
                        </span>
                      </div>
                    </> : <>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:C.textMuted, letterSpacing:2, marginBottom:8 }}>NO SESSIONS YET</div>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:2, lineHeight:1, color:C.textMuted }}>Complete a workout</div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:C.textMuted, marginTop:6 }}>on the wristband to see data here</div>
                    </>}
                  </div>
                </div>
                <div style={{ flex:1, minWidth:200, background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:"20px", display:"flex", flexDirection:"column", gap:10 }}>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:C.textMuted, letterSpacing:2, marginBottom:2 }}>YOUR PROFILE</div>
                  <div style={{ display:"flex", gap:8 }}><StatBox label="Rank" value="#4" hi/><StatBox label="Sessions" value="38"/></div>
                  <div style={{ display:"flex", gap:8 }}><StatBox label="Body Wt" value={user?.weight||"165"} unit="lbs"/><StatBox label="Age" value={user?.age||"21"} unit="yr"/></div>
                </div>
              </div>

              <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
                <div style={{ flex:3, minWidth:300, background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:"20px 24px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:18 }}>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:2 }}>Weekly Efficiency</div>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:C.textMuted, letterSpacing:1 }}>THIS WEEK</div>
                  </div>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={mockWeekly} barSize={30}>
                      <XAxis dataKey="day" tick={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, fill:C.textMuted }} axisLine={false} tickLine={false}/>
                      <YAxis hide domain={[0,100]}/>
                      <Tooltip content={<Tip/>} cursor={{ fill:"rgba(255,255,255,0.02)" }}/>
                      <Bar dataKey="score" radius={[4,4,0,0]}>
                        {mockWeekly.map((e,i)=>(
                          <Cell key={i} fill={e.score===0?C.border:e.score>=88?C.orange:C.blueBright}/>
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ flex:2, minWidth:240, background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:"20px 24px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:18 }}>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:2 }}>Rep Quality</div>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:C.textMuted, letterSpacing:1 }}>LAST SESSION</div>
                  </div>
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={mockRepData}>
                      <XAxis dataKey="rep" tick={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, fill:C.textMuted }} axisLine={false} tickLine={false}/>
                      <YAxis hide domain={[50,100]}/>
                      <Tooltip content={<Tip/>}/>
                      <Line type="monotone" dataKey="quality" stroke={C.orange} strokeWidth={2.5}
                        dot={{ fill:C.orange, r:3, strokeWidth:0 }}
                        activeDot={{ r:5, fill:C.orange, filter:`drop-shadow(0 0 4px ${C.orange})` }}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:"22px 24px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                  <div>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:2 }}>🏃 Most Active — UF Campus</div>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:C.textMuted, letterSpacing:1, marginTop:2 }}>RANKED BY SESSIONS THIS SEMESTER</div>
                  </div>
                  <button onClick={()=>setTab("leaderboard")} style={{ background:"transparent", border:"none", color:C.orange, fontFamily:"'JetBrains Mono',monospace", fontSize:9, letterSpacing:1, cursor:"pointer" }}>VIEW ALL →</button>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"36px 1fr 80px 70px 100px", gap:12, padding:"0 12px", marginBottom:8 }}>
                  {["#","ATHLETE","SESSIONS","STREAK","TOTAL REPS"].map(h=>(
                    <div key={h} style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:C.textMuted, letterSpacing:1 }}>{h}</div>
                  ))}
                </div>
                {mostActiveLeaderboard.slice(0,5).map((e,i)=>(
                  <div key={i} className="row-h" style={{
                    display:"grid", gridTemplateColumns:"36px 1fr 80px 70px 100px", gap:12,
                    padding:"11px 12px", borderRadius:10,
                    background:e.isUser?C.orangeGlow:"transparent",
                    border:`1px solid ${e.isUser?C.orange:"transparent"}`,
                    alignItems:"center", transition:"background 0.15s",
                    animation:`fadeUp 0.3s ease ${i*0.05}s both`,
                  }}>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1, color:i===0?"#ffd700":i===1?"#c0c0c0":i===2?"#cd7f32":C.textMuted }}>{e.rank}</div>
                    <div style={{ fontWeight:600, fontSize:13, color:e.isUser?C.orange:C.text }}>{e.name}{e.isUser&&<span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:C.orange, marginLeft:6 }}>YOU</span>}</div>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:e.isUser?C.orange:C.text, letterSpacing:1 }}>{e.sessions}</div>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:C.textMuted }}>🔥 {e.streak}d</div>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:C.textMuted }}>{e.totalReps.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════════ SESSION ════════ */}
          {tab==="session" && (
            <div style={{ display:"flex", flexDirection:"column", gap:20, animation:"fadeUp 0.4s ease" }}>
              <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:280, background:C.card, border:`1px solid ${liveOn?C.orange:C.border}`, borderRadius:16, padding:"28px", display:"flex", flexDirection:"column", alignItems:"center", gap:20, boxShadow:liveOn?`0 0 40px ${C.orangeGlow}`:"none", transition:"all 0.3s" }}>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:C.textMuted, letterSpacing:2, display:"flex", alignItems:"center", gap:6 }}>
                    {liveOn && <div style={{ width:6, height:6, borderRadius:"50%", background:C.orange, animation:"blink 1s infinite" }}/>}
                    LIVE SESSION
                  </div>
                  <div style={{ width:164, height:164, borderRadius:"50%", border:`3px solid ${liveOn?C.orange:C.border}`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", animation:livePulse?"pulse 0.3s ease":"none", boxShadow:liveOn?`0 0 24px ${C.orangeGlow}`:"none", transition:"all 0.3s" }}>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:60, color:liveOn?C.orange:C.textMuted, lineHeight:1, letterSpacing:2 }}>{liveReps}</div>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:C.textMuted, letterSpacing:3 }}>REPS</div>
                  </div>
                  <div style={{ display:"flex", gap:8, width:"100%" }}>
                    <StatBox label="Speed" value={liveOn?"0.87":"--"} unit="m/s" hi={liveOn}/>
                    <StatBox label="ROM" value={liveOn?"94":"--"} unit="°"/>
                  </div>
                  <button onClick={()=>setLiveOn(v=>!v)} style={{ width:"100%", padding:"14px", borderRadius:12, border:"none", cursor:"pointer", background:liveOn?C.red:C.orange, color:C.white, fontFamily:"'Bebas Neue',sans-serif", fontSize:17, letterSpacing:2, boxShadow:liveOn?`0 4px 20px rgba(255,77,109,0.4)`:`0 4px 20px rgba(250,70,22,0.35)`, transition:"all 0.2s" }}>{liveOn?"⏹ STOP SESSION":"⚡ START SESSION"}</button>
                </div>

                <div style={{ flex:1.4, minWidth:300, display:"flex", flexDirection:"column", gap:16 }}>
                  <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:"20px" }}>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:C.textMuted, letterSpacing:2, marginBottom:12 }}>SELECT EXERCISE</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                      {EXERCISES.map(ex=>(
                        <button key={ex} className="ex-btn" onClick={()=>setSelEx(ex)} style={{ background:selEx===ex?C.orangeGlow:C.surface, border:`1px solid ${selEx===ex?C.orange:C.border}`, borderRadius:10, padding:"11px 14px", cursor:"pointer", color:selEx===ex?C.orange:C.text, fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:13, textAlign:"left", transition:"all 0.15s" }}>{ex}</button>
                      ))}
                    </div>
                  </div>

                  <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:"20px", flex:1 }}>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:C.textMuted, letterSpacing:2, marginBottom:12 }}>LOG A SET — {selEx.toUpperCase()}</div>
                    <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                      <div style={{ flex:1, position:"relative" }}>
                        <input type="number" placeholder="Weight" value={setWeight} onChange={e=>setSetWeight(e.target.value)}
                          style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 44px 10px 12px", color:C.text, fontFamily:"'DM Sans',sans-serif", fontSize:13, outline:"none" }}
                          onFocus={e=>e.target.style.borderColor=C.orange} onBlur={e=>e.target.style.borderColor=C.border}/>
                        <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:C.textMuted }}>lbs</span>
                      </div>
                      <div style={{ flex:1, position:"relative" }}>
                        <input type="number" placeholder="Reps" value={setRepsVal} onChange={e=>setSetRepsVal(e.target.value)}
                          style={{ width:"100%", background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 44px 10px 12px", color:C.text, fontFamily:"'DM Sans',sans-serif", fontSize:13, outline:"none" }}
                          onFocus={e=>e.target.style.borderColor=C.orange} onBlur={e=>e.target.style.borderColor=C.border}/>
                        <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:C.textMuted }}>reps</span>
                      </div>
                      <button onClick={addSet} style={{ background:C.orange, border:"none", borderRadius:8, padding:"10px 16px", color:C.white, fontFamily:"'Bebas Neue',sans-serif", fontSize:15, letterSpacing:1, cursor:"pointer" }}>ADD</button>
                    </div>
                    {sets.length===0
                      ? <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:C.textDim, textAlign:"center", padding:"16px 0" }}>No sets logged — enter weight &amp; reps above</div>
                      : <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:180, overflowY:"auto" }}>
                          {sets.map((s,i)=>(
                            <div key={s.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 14px" }}>
                              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:C.textMuted }}>SET {i+1}</span>
                              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:C.orange, letterSpacing:1 }}>{s.weight} lbs</span>
                              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:C.text }}>× {s.reps} reps</span>
                              <button onClick={()=>setSets(prev=>prev.filter(x=>x.id!==s.id))} style={{ background:"transparent", border:"none", color:C.textMuted, cursor:"pointer", fontSize:13 }}>✕</button>
                            </div>
                          ))}
                        </div>
                    }
                  </div>
                </div>
              </div>

              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:"20px 24px" }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:2, marginBottom:16 }}>Rep Timeline — Last Session</div>
                <div style={{ display:"flex", gap:8, alignItems:"flex-end", height:80 }}>
                  {mockRepData.map((r,i)=>(
                    <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                      <div style={{ width:"100%", borderRadius:"3px 3px 0 0", height:`${(r.quality/100)*60}px`, background:r.quality>=85?C.orange:r.quality>=70?C.blueBright:C.red }}/>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:C.textMuted }}>{r.rep}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:"flex", gap:16, marginTop:10 }}>
                  {[{c:C.orange,l:"Excellent 85+"},{c:C.blueBright,l:"Good 70–84"},{c:C.red,l:"Needs work <70"}].map(x=>(
                    <div key={x.l} style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <div style={{ width:8, height:8, borderRadius:2, background:x.c }}/>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:C.textMuted }}>{x.l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════ LEADERBOARD ════════ */}
          {tab==="leaderboard" && (
            <div style={{ display:"flex", flexDirection:"column", gap:20, animation:"fadeUp 0.4s ease" }}>
              <div style={{ background:C.card, border:`1px solid ${C.borderBright}`, borderRadius:16, padding:"24px 26px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:2 }}>🏆 UF Leaderboards</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:C.textMuted, letterSpacing:1, marginTop:4 }}>WEEKLY EFFICIENCY RANKINGS · UNIVERSITY OF FLORIDA</div>
                </div>
                <div style={{ background:C.orangeGlow, border:`1px solid ${C.orange}`, borderRadius:10, padding:"10px 18px", textAlign:"center" }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:C.orange, letterSpacing:2, lineHeight:1 }}>#4</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:C.textMuted, letterSpacing:1 }}>YOUR RANK</div>
                </div>
              </div>

              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {EXERCISES.map(ex=>(
                  <button key={ex} className="lb-pill" onClick={()=>setLbEx(ex)} style={{
                    background:lbEx===ex?C.orange:C.card, border:`1px solid ${lbEx===ex?C.orange:C.border}`,
                    borderRadius:20, padding:"8px 18px", cursor:"pointer",
                    color:lbEx===ex?C.white:C.textMuted,
                    fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:13, transition:"all 0.15s",
                  }}>{ex}</button>
                ))}
              </div>

              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:"20px 24px" }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:2, marginBottom:14, color:C.orange }}>{lbEx}</div>
                <div style={{ display:"grid", gridTemplateColumns:"44px 1fr 120px 70px 50px", gap:14, padding:"0 12px", marginBottom:8 }}>
                  {["RANK","ATHLETE","WEIGHT","SCORE","Δ"].map(h=>(
                    <div key={h} style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:C.textMuted, letterSpacing:1 }}>{h}</div>
                  ))}
                </div>
                {(mockLeaderboards[lbEx]||[]).map((e,i)=>(
                  <div key={i} className="row-h" style={{
                    display:"grid", gridTemplateColumns:"44px 1fr 120px 70px 50px", gap:14,
                    padding:"13px 12px", borderRadius:12, marginBottom:6,
                    background:e.isUser?C.orangeGlow:C.surface, border:`1px solid ${e.isUser?C.orange:C.border}`,
                    alignItems:"center", transition:"background 0.15s", animation:`fadeUp 0.3s ease ${i*0.06}s both`,
                  }}>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:1, color:e.rank===1?"#ffd700":e.rank===2?"#c0c0c0":e.rank===3?"#cd7f32":C.textMuted }}>
                      {e.rank===1?"🥇":e.rank===2?"🥈":e.rank===3?"🥉":`#${e.rank}`}
                    </div>
                    <div style={{ fontWeight:600, fontSize:14, color:e.isUser?C.orange:C.text }}>
                      {e.name}
                      {e.isUser && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, marginLeft:8, color:C.orange, background:C.orangeGlow, padding:"2px 6px", borderRadius:4 }}>YOU</span>}
                    </div>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:C.textMuted }}>{e.weight}</div>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:1, color:e.isUser?C.orange:C.text }}>{e.score}</div>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, fontWeight:700, color:e.delta.startsWith("+")?C.green:e.delta==="0"?C.textMuted:C.red }}>{e.delta}</div>
                  </div>
                ))}
              </div>

              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:"20px 24px" }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:2, marginBottom:14 }}>🏃 Most Active — All Time</div>
                <div style={{ display:"grid", gridTemplateColumns:"44px 1fr 90px 80px 110px", gap:14, padding:"0 12px", marginBottom:8 }}>
                  {["RANK","ATHLETE","SESSIONS","STREAK","TOTAL REPS"].map(h=>(
                    <div key={h} style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:C.textMuted, letterSpacing:1 }}>{h}</div>
                  ))}
                </div>
                {mostActiveLeaderboard.map((e,i)=>(
                  <div key={i} className="row-h" style={{
                    display:"grid", gridTemplateColumns:"44px 1fr 90px 80px 110px", gap:14,
                    padding:"12px 12px", borderRadius:12, marginBottom:6,
                    background:e.isUser?C.orangeGlow:C.surface, border:`1px solid ${e.isUser?C.orange:C.border}`,
                    alignItems:"center", transition:"background 0.15s", animation:`fadeUp 0.3s ease ${i*0.05}s both`,
                  }}>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:1, color:e.rank===1?"#ffd700":e.rank===2?"#c0c0c0":e.rank===3?"#cd7f32":C.textMuted }}>
                      {e.rank<=3?["🥇","🥈","🥉"][e.rank-1]:`#${e.rank}`}
                    </div>
                    <div style={{ fontWeight:600, fontSize:13, color:e.isUser?C.orange:C.text }}>
                      {e.name}
                      {e.isUser && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, marginLeft:8, color:C.orange, background:C.orangeGlow, padding:"2px 6px", borderRadius:4 }}>YOU</span>}
                    </div>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:e.isUser?C.orange:C.text, letterSpacing:1 }}>{e.sessions}</div>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:C.textMuted }}>🔥 {e.streak}d</div>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:C.textMuted }}>{e.totalReps.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════════ HISTORY — real data from backend ════════ */}
          {tab==="history" && (()=>{
            const byExercise = {};
            PI_EXERCISES.forEach(ex => {
              byExercise[ex] = sessionData
                .filter(s => s.exercise === ex)
                .sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp))
                .map((s, i) => ({
                  session:    `Session ${i + 1}`,
                  time:       new Date(s.timestamp).toLocaleDateString("en-US",{month:"short",day:"numeric"}),
                  good_reps:  s.good_reps,
                  bad_reps:   s.bad_reps,
                  total_sets: s.total_sets,
                  total_reps: s.good_reps + s.bad_reps,
                  good_pct:   s.good_reps + s.bad_reps > 0
                    ? Math.round((s.good_reps / (s.good_reps + s.bad_reps)) * 100)
                    : 0,
                }));
            });

            const hasAnyData = PI_EXERCISES.some(ex => byExercise[ex].length > 0);

            // Custom tooltip for the stacked chart
            const HistoryTip = ({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const good = payload.find(p => p.dataKey === "good_reps");
              const bad  = payload.find(p => p.dataKey === "bad_reps");
              const total = (good?.value || 0) + (bad?.value || 0);
              const pct   = total > 0 ? Math.round((good?.value / total) * 100) : 0;
              return (
                <div style={{ background:C.card, border:`1px solid ${C.borderBright}`, borderRadius:12, padding:"12px 16px", minWidth:140 }}>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:C.textMuted, marginBottom:8 }}>{label}</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", gap:16 }}>
                      <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.green }}>✓ Good reps</span>
                      <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:C.green }}>{good?.value || 0}</span>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", gap:16 }}>
                      <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.red }}>✗ Bad reps</span>
                      <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:C.red }}>{bad?.value || 0}</span>
                    </div>
                    <div style={{ borderTop:`1px solid ${C.border}`, marginTop:4, paddingTop:6, display:"flex", justifyContent:"space-between" }}>
                      <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMuted }}>Form score</span>
                      <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:pct>=70?C.orange:C.red }}>{pct}%</span>
                    </div>
                  </div>
                </div>
              );
            };

            return (
              <div style={{ display:"flex", flexDirection:"column", gap:24, animation:"fadeUp 0.4s ease" }}>

                {/* Header */}
                <div style={{ background:C.card, border:`1px solid ${C.borderBright}`, borderRadius:16, padding:"20px 26px" }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:2 }}>Session History</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:C.textMuted, letterSpacing:1, marginTop:4 }}>
                    {loadingSessions ? "LOADING FROM DATABASE..." : `${sessionData.length} SESSIONS RECORDED · ${USER_EMAIL}`}
                  </div>
                </div>

                {loadingSessions && (
                  <div style={{ textAlign:"center", padding:60, color:C.textMuted, fontFamily:"'JetBrains Mono',monospace", fontSize:11 }}>
                    Fetching from backend...
                  </div>
                )}

                {!loadingSessions && !hasAnyData && (
                  <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:48, textAlign:"center" }}>
                    <div style={{ fontSize:36, marginBottom:12 }}>🏋️</div>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:2, marginBottom:8 }}>No Sessions Yet</div>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:C.textMuted }}>Complete a workout on the wristband to see your data here.</div>
                  </div>
                )}

                {!loadingSessions && PI_EXERCISES.map(ex => {
                  const data = byExercise[ex];
                  if (data.length === 0) return null;

                  const totalGood     = data.reduce((s,d) => s + d.good_reps,  0);
                  const totalBad      = data.reduce((s,d) => s + d.bad_reps,   0);
                  const totalSets     = data.reduce((s,d) => s + d.total_sets, 0);
                  const totalReps     = totalGood + totalBad;
                  const overallPct    = totalReps > 0 ? Math.round((totalGood / totalReps) * 100) : 0;
                  const avgGoodPerSet = totalSets > 0 ? (totalGood / totalSets).toFixed(1) : "—";
                  const avgBadPerSet  = totalSets > 0 ? (totalBad  / totalSets).toFixed(1) : "—";

                  return (
                    <div key={ex} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:"24px 28px" }}>

                      {/* Title + overall form score */}
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
                        <div>
                          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:2, color:C.orange }}>{ex}</div>
                          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:C.textMuted, letterSpacing:1, marginTop:2 }}>
                            {data.length} SESSION{data.length!==1?"S":""} · {totalReps} TOTAL REPS · {totalSets} SETS
                          </div>
                        </div>
                        {/* Big form score circle */}
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ position:"relative", width:72, height:72 }}>
                            <svg width="72" height="72" style={{ transform:"rotate(-90deg)" }}>
                              <circle cx="36" cy="36" r="30" fill="none" stroke={C.border} strokeWidth="5"/>
                              <circle cx="36" cy="36" r="30" fill="none"
                                stroke={overallPct>=70?C.green:C.red} strokeWidth="5"
                                strokeDasharray={`${(overallPct/100)*188} 188`} strokeLinecap="round"/>
                            </svg>
                            <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:overallPct>=70?C.green:C.red, lineHeight:1 }}>{overallPct}%</div>
                            </div>
                          </div>
                          <div>
                            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, letterSpacing:1, color:C.text }}>FORM SCORE</div>
                            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:C.textMuted, marginTop:2 }}>overall good rep %</div>
                          </div>
                        </div>
                      </div>

                      {/* 4 stat pills */}
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:10, marginBottom:24 }}>
                        {[
                          { label:"Good Reps", value:totalGood, color:C.green, sub:"total" },
                          { label:"Bad Reps",  value:totalBad,  color:C.red,   sub:"total" },
                          { label:"Avg Good / Set", value:avgGoodPerSet, color:C.green, sub:"per set avg" },
                          { label:"Avg Bad / Set",  value:avgBadPerSet,  color:C.red,   sub:"per set avg" },
                        ].map(s => (
                          <div key={s.label} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px" }}>
                            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:C.textMuted, letterSpacing:1, marginBottom:6 }}>{s.label.toUpperCase()}</div>
                            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:s.color, letterSpacing:1, lineHeight:1 }}>{s.value}</div>
                            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:7, color:C.textDim, marginTop:4 }}>{s.sub}</div>
                          </div>
                        ))}
                      </div>

                      {/* Chart title */}
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:C.textMuted, letterSpacing:2, marginBottom:12 }}>
                        GOOD vs BAD REPS PER SESSION
                      </div>

                      {/* Stacked bar chart — good reps on bottom, bad on top */}
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={data} barSize={data.length === 1 ? 60 : undefined} barCategoryGap="30%">
                          <XAxis
                            dataKey="time"
                            tick={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, fill:C.textMuted }}
                            axisLine={false} tickLine={false}
                          />
                          <YAxis
                            tick={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, fill:C.textMuted }}
                            axisLine={false} tickLine={false} width={24}
                            label={{ value:"reps", angle:-90, position:"insideLeft", fill:C.textMuted, fontFamily:"'JetBrains Mono',monospace", fontSize:8, dy:20 }}
                          />
                          <Tooltip content={<HistoryTip/>} cursor={{ fill:"rgba(255,255,255,0.03)" }}/>
                          <Bar dataKey="good_reps" name="Good Reps" stackId="a" fill={C.green} radius={[0,0,0,0]}/>
                          <Bar dataKey="bad_reps"  name="Bad Reps"  stackId="a" fill={C.red}   radius={[4,4,0,0]}/>
                        </BarChart>
                      </ResponsiveContainer>

                      {/* Legend */}
                      <div style={{ display:"flex", gap:20, marginTop:10 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <div style={{ width:12, height:12, borderRadius:2, background:C.green }}/>
                          <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMuted }}>Good reps — correct form &amp; timing</span>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <div style={{ width:12, height:12, borderRadius:2, background:C.red }}/>
                          <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:C.textMuted }}>Bad reps — too fast or too slow</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

        </div>

        {/* Footer */}
        <div style={{ borderTop:`1px solid ${C.border}`, padding:"12px 28px", display:"flex", justifyContent:"space-between", alignItems:"center", background:C.surface }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:C.textMuted, letterSpacing:1 }}>GYMATE v0.1 · DESIGNATHON 2026 · UNIVERSITY OF FLORIDA</div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:C.orange, animation:"blink 2s infinite" }}/>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:C.textMuted, letterSpacing:1 }}>WRISTBAND CONNECTED</span>
          </div>
        </div>
      </div>
    </>
  );
}

