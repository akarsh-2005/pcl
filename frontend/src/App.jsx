import{useState,useEffect,useRef,useCallback,useMemo}from"react";
import{BookOpen,Brain,Star,Trophy,Clock,Volume2,VolumeX,Square,Settings,X,Check,RotateCcw,Download,Trash2,Play,Pause,Sparkles,MessageSquare,FileText,Layers,BarChart3,GraduationCap,FlaskConical,Globe,Calculator,Music,Landmark,Monitor,BookMarked,TrendingUp,ArrowRight,RefreshCw,PanelLeftClose,PanelLeftOpen,Lightbulb,Award,Flame,AlertTriangle,Copy,CheckCheck,Sun,Moon,ChevronDown,User,Zap,Languages,Wand2,Target}from"lucide-react";
import{RadialBarChart,RadialBar,Cell,ResponsiveContainer}from"recharts";

const HF_KEY   =import.meta.env.VITE_HF_API_KEY||"";
const HF_MODEL =import.meta.env.VITE_HF_MODEL_ID||"";
const GROQ_KEY =import.meta.env.VITE_GROQ_API_KEY||"";
const LOCAL_URL=import.meta.env.VITE_LOCAL_URL||"";
const AI_MODEL ="llama-3.3-70b-versatile";
const ACTIVE_MODEL=HF_MODEL?HF_MODEL.split("/").pop():LOCAL_URL?"Local Model":"Llama 3.3 70B";

// ─── CHARACTER DATA ──────────────────────────────────────────
const CHARS={
  sage:{id:"sage",name:"Professor Sage",title:"The Wise Scholar",
    palette:{primary:"#C9A96E",accent:"#8B6914",glow:"rgba(201,169,110,0.35)",bg:"#1A1208",skin:"#C68642",hair:"#2C1810",robe:"#0F0A1E",eye:"#3D2B1F"},
    voice:{rate:.87,pitch:1.0,hints:["Google UK English Male","Daniel","Arthur"]},
    prompt:"You are Professor Sage — wise, Socratic, calm. Illuminate the deeper why behind every concept."},
  aria:{id:"aria",name:"Dr. Aria",title:"The Explorer",
    palette:{primary:"#E8A0BF",accent:"#C2185B",glow:"rgba(232,160,191,0.35)",bg:"#1A0812",skin:"#F5CBA7",hair:"#1A0520",robe:"#0D0620",eye:"#4A1060"},
    voice:{rate:.96,pitch:1.18,hints:["Google US English Female","Samantha","Victoria"]},
    prompt:"You are Dr. Aria — enthusiastic, curious. Make every topic an adventure with wow moments."},
  kai:{id:"kai",name:"Agent Kai",title:"The Strategist",
    palette:{primary:"#7EC8E3",accent:"#0277BD",glow:"rgba(126,200,227,0.35)",bg:"#000D1A",skin:"#8D5524",hair:"#0A0500",robe:"#020B1A",eye:"#01579B"},
    voice:{rate:.85,pitch:.92,hints:["Google UK English Male","Alex","Fred"]},
    prompt:"You are Agent Kai — sharp, strategic, analytical. Cut to the insight efficiently."},
  luna:{id:"luna",name:"Luna",title:"The Storyteller",
    palette:{primary:"#CE93D8",accent:"#7B1FA2",glow:"rgba(206,147,216,0.35)",bg:"#0D001A",skin:"#FFD0A0",hair:"#3A0050",robe:"#0A001F",eye:"#4A0072"},
    voice:{rate:.90,pitch:1.10,hints:["Google US English Female","Karen","Moira"]},
    prompt:"You are Luna — creative storyteller. Teach through vivid narratives and metaphors."},
  nova:{id:"nova",name:"Nova",title:"The Innovator",
    palette:{primary:"#80CBC4",accent:"#00695C",glow:"rgba(128,203,196,0.35)",bg:"#001A18",skin:"#E8C080",hair:"#041018",robe:"#021210",eye:"#004D40"},
    voice:{rate:.93,pitch:1.02,hints:["Google US English Female","Zira","Nicky"]},
    prompt:"You are Nova — futuristic systems thinker. Connect technology to every subject."},
};

// ─── LANGUAGE DATA ───────────────────────────────────────────
const LANGS={
  en:{name:"English",   native:"English",  flag:"🇬🇧",rtl:false,code:"en-GB"},
  es:{name:"Spanish",   native:"Español",  flag:"🇪🇸",rtl:false,code:"es-ES"},
  fr:{name:"French",    native:"Français", flag:"🇫🇷",rtl:false,code:"fr-FR"},
  de:{name:"German",    native:"Deutsch",  flag:"🇩🇪",rtl:false,code:"de-DE"},
  hi:{name:"Hindi",     native:"हिन्दी",   flag:"🇮🇳",rtl:false,code:"hi-IN"},
  ar:{name:"Arabic",    native:"العربية",  flag:"🇸🇦",rtl:true, code:"ar-SA"},
  zh:{name:"Chinese",   native:"中文",     flag:"🇨🇳",rtl:false,code:"zh-CN"},
  ja:{name:"Japanese",  native:"日本語",   flag:"🇯🇵",rtl:false,code:"ja-JP"},
  pt:{name:"Portuguese",native:"Português",flag:"🇧🇷",rtl:false,code:"pt-BR"},
  ru:{name:"Russian",   native:"Русский",  flag:"🇷🇺",rtl:false,code:"ru-RU"},
  ko:{name:"Korean",    native:"한국어",   flag:"🇰🇷",rtl:false,code:"ko-KR"},
  ta:{name:"Tamil",     native:"தமிழ்",   flag:"🇮🇳",rtl:false,code:"ta-IN"},
};
const LANG_INSTR={es:"Respond ENTIRELY in Spanish.",fr:"Respond ENTIRELY in French.",de:"Respond ENTIRELY in German.",hi:"Respond ENTIRELY in Hindi.",ar:"Respond ENTIRELY in Arabic.",zh:"Respond ENTIRELY in Chinese.",ja:"Respond ENTIRELY in Japanese.",pt:"Respond ENTIRELY in Portuguese.",ru:"Respond ENTIRELY in Russian.",ko:"Respond ENTIRELY in Korean.",ta:"Respond ENTIRELY in Tamil."};

const SUBJECTS=[
  {id:"all",label:"All Subjects",Icon:BookOpen},
  {id:"math",label:"Mathematics",Icon:Calculator},
  {id:"sci",label:"Science",Icon:FlaskConical},
  {id:"hist",label:"History",Icon:Landmark},
  {id:"tech",label:"Technology",Icon:Monitor},
  {id:"lit",label:"Language Arts",Icon:BookMarked},
  {id:"geo",label:"Geography",Icon:Globe},
  {id:"econ",label:"Economics",Icon:TrendingUp},
  {id:"art",label:"Art & Music",Icon:Music},
];
const LEVELS=[
  {id:"beginner",label:"Beginner",glyph:"○"},
  {id:"intermediate",label:"Intermediate",glyph:"◈"},
  {id:"advanced",label:"Advanced",glyph:"◆"},
];
const XP_LEVEL=500;

// ─── PREMIUM CSS ─────────────────────────────────────────────
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

:root{
  /* Refined dark luxury palette */
  --bg:#080708;
  --bg2:#0E0C0F;
  --bg3:#141118;
  --bg4:#1A1720;
  --bg5:#211E28;

  /* Gold accent system */
  --gold:#C9A96E;
  --gold2:#E8C88A;
  --gold3:#A8882E;
  --gold-dim:rgba(201,169,110,0.08);
  --gold-glow:rgba(201,169,110,0.18);
  --gold-border:rgba(201,169,110,0.22);

  /* Surfaces */
  --s1:rgba(255,255,255,0.022);
  --s2:rgba(255,255,255,0.042);
  --s3:rgba(255,255,255,0.068);
  --s4:rgba(255,255,255,0.10);

  /* Borders */
  --b1:rgba(255,255,255,0.055);
  --b2:rgba(255,255,255,0.095);
  --b3:rgba(255,255,255,0.15);

  /* Text */
  --t1:#EDE8E0;
  --t2:#9A9090;
  --t3:#584E4E;
  --t4:#2A2420;

  /* Semantic */
  --em:#7EB89A;  --emd:rgba(126,184,154,0.08);
  --wa:#D4A843;  --wad:rgba(212,168,67,0.08);
  --da:#C4627A;  --dad:rgba(196,98,122,0.08);
  --info:#7A9CC4;

  /* Character accent (changes per char) */
  --char-p:var(--gold);
  --char-glow:rgba(201,169,110,0.3);

  --r-s:6px; --r-m:12px; --r-l:18px; --r-xl:24px; --r-2xl:32px;
  --ff:'Cormorant Garamond',serif;
  --fb:'DM Sans',sans-serif;
  --fm:'DM Mono',monospace;
  --sh:0 2px 16px rgba(0,0,0,0.7),0 1px 3px rgba(0,0,0,0.5);
  --sh-xl:0 24px 80px rgba(0,0,0,0.85),0 8px 24px rgba(0,0,0,0.6);
}

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;overflow:hidden}
body{font-family:var(--fb);background:var(--bg);color:var(--t1);-webkit-font-smoothing:antialiased;font-size:14px}
::-webkit-scrollbar{width:2px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--b2);border-radius:2px}
::selection{background:var(--gold-dim)}
input,textarea,select,button{font-family:var(--fb);outline:none}

@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn{from{transform:translateX(110%);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.015)}}
@keyframes shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}
@keyframes notchIn{from{transform:scale(0.94) translateY(-4px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
@keyframes goldShimmer{0%{opacity:0.4}50%{opacity:1}100%{opacity:0.4}}
@keyframes confettiFall{from{transform:translateY(-20px) rotate(0deg);opacity:1}to{transform:translateY(105vh) rotate(720deg);opacity:0}}
@keyframes avatarGlow{0%,100%{filter:drop-shadow(0 0 6px var(--char-glow))}50%{filter:drop-shadow(0 0 14px var(--char-glow))}}
@keyframes mouthTalk{0%,100%{d:path("M38 57 Q50 63 62 57")}50%{d:path("M38 57 Q50 66 62 57")}}

.msg{animation:fadeUp .2s ease-out}
.toast{animation:slideIn .36s cubic-bezier(.175,.885,.32,1.3)}
.pop{animation:notchIn .2s ease-out}
.lbl{font-size:8.5px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--t3);font-family:var(--fm)}

/* PREMIUM BUTTONS */
.btn-primary{
  background:linear-gradient(135deg,var(--gold) 0%,var(--gold3) 100%);
  color:#080708;border:none;border-radius:var(--r-l);
  padding:10px 22px;font-size:12.5px;font-weight:600;
  cursor:pointer;font-family:var(--fb);
  transition:all .2s;
  box-shadow:0 4px 20px rgba(201,169,110,0.25),inset 0 1px 0 rgba(255,255,255,0.2)
}
.btn-primary:hover:not(:disabled){
  transform:translateY(-1px);
  box-shadow:0 8px 32px rgba(201,169,110,0.35),inset 0 1px 0 rgba(255,255,255,0.25)
}
.btn-primary:disabled{background:var(--s2);color:var(--t3);cursor:not-allowed;box-shadow:none}
.btn-ghost{
  background:var(--s1);color:var(--t2);
  border:1px solid var(--b2);border-radius:var(--r-s);
  padding:7px 14px;font-size:11.5px;font-weight:500;
  cursor:pointer;font-family:var(--fb);transition:all .15s;
  backdrop-filter:blur(8px)
}
.btn-ghost:hover{background:var(--s3);color:var(--t1);border-color:var(--b3)}
.btn-icon{
  background:var(--s1);border:1px solid var(--b1);border-radius:var(--r-s);
  padding:7px;color:var(--t3);cursor:pointer;
  display:flex;align-items:center;justify-content:center;transition:all .15s
}
.btn-icon:hover{background:var(--s3);border-color:var(--b2);color:var(--t2)}
.btn-icon.active{background:var(--gold-dim);border-color:var(--gold-border);color:var(--gold)}

/* LUXURY GLASS */
.glass{
  background:linear-gradient(145deg,rgba(255,255,255,0.032),rgba(255,255,255,0.012));
  backdrop-filter:blur(28px) saturate(140%);
  border:1px solid var(--b1);border-radius:var(--r-m)
}
.glass-gold{
  background:linear-gradient(145deg,rgba(201,169,110,0.06),rgba(201,169,110,0.02));
  backdrop-filter:blur(28px);
  border:1px solid var(--gold-border);border-radius:var(--r-m)
}
.shimmer{
  background:linear-gradient(90deg,var(--s1) 0%,var(--s3) 50%,var(--s1) 100%);
  background-size:600px 100%;animation:shimmer 1.8s ease-in-out infinite
}

/* GOLD DIVIDER */
.divider{height:1px;background:linear-gradient(90deg,transparent,var(--gold-border),transparent);margin:2px 0}
`;

// ─── HUMAN AVATAR SVG ────────────────────────────────────────
// Realistic human face SVG for each character
function HumanAvatar({charId,mood,size=100,speaking=false}){
  const ch=CHARS[charId]||CHARS.sage;
  const p=ch.palette;
  const s=size;
  const isSpeak=mood==="speaking"||speaking;
  const isThink=mood==="thinking";
  const isEx=mood==="excited";
  const isIdle=!isSpeak&&!isThink&&!isEx;

  // Eye expressions
  const eyeScaleY=isThink?0.6:isEx?1.2:1;
  // Brow positions
  const browOffset=isThink?-2:isEx?-4:0;
  // Mouth shape
  const mouthPath=isSpeak
    ?"M38 57 Q50 65 62 57 Q50 70 38 57"
    :isEx
      ?"M36 55 Q50 66 64 55"
      :"M40 56 Q50 61 60 56";

  const glowColor=isThink?"#D4A843":isEx?p.accent:p.primary;

  return(
    <div style={{width:s,height:s,position:"relative",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
      {/* Ambient glow ring */}
      <div style={{
        position:"absolute",inset:-4,borderRadius:"50%",
        background:`radial-gradient(circle,${p.glow},transparent 65%)`,
        animation:"goldShimmer 3s ease-in-out infinite"
      }}/>
      <svg
        width={s} height={s}
        viewBox="0 0 100 100"
        style={{
          animation:"float 4s ease-in-out infinite",
          filter:`drop-shadow(0 4px 12px ${p.glow})`
        }}
      >
        <defs>
          {/* Head gradient for 3D feel */}
          <radialGradient id={`headGrad-${charId}`} cx="38%" cy="32%" r="65%">
            <stop offset="0%" stopColor={`color-mix(in srgb,${p.skin} 80%,#fff 20%)`}/>
            <stop offset="60%" stopColor={p.skin}/>
            <stop offset="100%" stopColor={`color-mix(in srgb,${p.skin} 80%,#200 20%)`}/>
          </radialGradient>
          {/* Hair gradient */}
          <radialGradient id={`hairGrad-${charId}`} cx="45%" cy="20%" r="70%">
            <stop offset="0%" stopColor={`color-mix(in srgb,${p.hair} 70%,#666 30%)`}/>
            <stop offset="100%" stopColor={p.hair}/>
          </radialGradient>
          {/* Cloth gradient */}
          <linearGradient id={`clothGrad-${charId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={`color-mix(in srgb,${p.robe} 80%,${p.primary} 20%)`}/>
            <stop offset="100%" stopColor={p.robe}/>
          </linearGradient>
          {/* Eye iris gradient */}
          <radialGradient id={`irisGrad-${charId}`} cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor={`color-mix(in srgb,${p.eye} 60%,#88f 40%)`}/>
            <stop offset="100%" stopColor={p.eye}/>
          </radialGradient>
          {/* Gold accent gradient */}
          <linearGradient id={`goldGrad-${charId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={p.primary}/>
            <stop offset="100%" stopColor={p.accent}/>
          </linearGradient>
        </defs>

        {/* ── BACKGROUND CIRCLE */}
        <circle cx="50" cy="50" r="48" fill={p.robe} opacity="0.95"/>
        <circle cx="50" cy="50" r="48" fill="none" stroke={p.primary} strokeWidth="1.5" opacity="0.6"/>
        {/* Inner accent ring */}
        <circle cx="50" cy="50" r="45" fill="none" stroke={p.primary} strokeWidth="0.4" opacity="0.3"/>

        {/* ── SHOULDERS / COLLAR */}
        <ellipse cx="50" cy="92" rx="36" ry="22" fill={`url(#clothGrad-${charId})`}/>
        {/* Collar V */}
        <path d="M38 80 L50 90 L62 80" fill="none" stroke={p.primary} strokeWidth="1.2" opacity="0.7"/>
        {/* Collar trim line */}
        <path d="M32 82 Q50 95 68 82" fill="none" stroke={p.primary} strokeWidth="0.6" opacity="0.4"/>

        {/* ── NECK */}
        <rect x="43" y="70" width="14" height="16" rx="5"
          fill={`url(#headGrad-${charId})`} opacity="0.9"/>
        {/* Neck shadow */}
        <rect x="43" y="76" width="14" height="6" rx="2"
          fill="rgba(0,0,0,0.15)"/>

        {/* ── HEAD */}
        <ellipse cx="50" cy="46" rx="27" ry="31"
          fill={`url(#headGrad-${charId})`}/>
        {/* Head highlight */}
        <ellipse cx="42" cy="34" rx="9" ry="7"
          fill="rgba(255,255,255,0.12)" style={{filter:"blur(3px)"}}/>

        {/* ── HAIR (back) */}
        <ellipse cx="50" cy="20" rx="27" ry="18" fill={`url(#hairGrad-${charId})`}/>

        {/* ── EARS */}
        <ellipse cx="23.5" cy="47" rx="4" ry="5.5"
          fill={`url(#headGrad-${charId})`}/>
        <ellipse cx="23.5" cy="47" rx="2.5" ry="3.5"
          fill="rgba(0,0,0,0.12)"/>
        <ellipse cx="76.5" cy="47" rx="4" ry="5.5"
          fill={`url(#headGrad-${charId})`}/>
        <ellipse cx="76.5" cy="47" rx="2.5" ry="3.5"
          fill="rgba(0,0,0,0.12)"/>

        {/* ── HAIR (front overlay) */}
        <path d={
          charId==="aria"
            ?"M24 28 Q28 14 50 15 Q72 14 76 28 Q72 18 50 17 Q28 18 24 28 Z"
            :charId==="luna"
              ?"M22 34 Q24 12 50 13 Q76 12 78 34 Q74 16 50 15 Q26 16 22 34 Z"
              :charId==="nova"
                ?"M26 26 Q30 10 50 12 Q70 10 74 26 Q68 14 50 13 Q32 14 26 26 Z"
                :"M24 30 Q27 12 50 14 Q73 12 76 30 Q70 16 50 15 Q30 16 24 30 Z"
        } fill={`url(#hairGrad-${charId})`}/>

        {/* ── EYEBROWS */}
        <g transform={`translate(0,${browOffset})`} style={{transition:"transform 0.3s"}}>
          {/* Left brow */}
          <path d={isThink?"M32 35 Q40 31 44 33":"M32 34 Q39 30 44 32"}
            fill="none" stroke={p.hair} strokeWidth="1.8" strokeLinecap="round" opacity="0.9"/>
          {/* Right brow */}
          <path d={isThink?"M56 33 Q60 31 68 35":"M56 32 Q61 30 68 34"}
            fill="none" stroke={p.hair} strokeWidth="1.8" strokeLinecap="round" opacity="0.9"/>
        </g>

        {/* ── EYES */}
        {/* Left eye white */}
        <ellipse cx="38" cy="44" rx="6.5" ry={5*eyeScaleY}
          fill="rgba(240,235,225,0.95)"
          style={{transition:"ry 0.3s"}}/>
        {/* Left iris */}
        <ellipse cx="38" cy="44" rx="4.2" ry={3.5*eyeScaleY}
          fill={`url(#irisGrad-${charId})`}
          style={{transition:"ry 0.3s"}}/>
        {/* Left pupil */}
        <ellipse cx="38.5" cy="44" rx="2" ry={2*eyeScaleY}
          fill="#0A0608"
          style={{transition:"ry 0.3s"}}/>
        {/* Left eye catchlight */}
        <circle cx="40" cy="42.5" r="1" fill="rgba(255,255,255,0.85)"/>
        <circle cx="37" cy="45" r="0.5" fill="rgba(255,255,255,0.4)"/>
        {/* Left eyelid */}
        <path d="M31.5 44 Q38 39 44.5 44" fill="none" stroke={p.skin} strokeWidth="0.5" opacity="0.6"/>

        {/* Right eye white */}
        <ellipse cx="62" cy="44" rx="6.5" ry={5*eyeScaleY}
          fill="rgba(240,235,225,0.95)"
          style={{transition:"ry 0.3s"}}/>
        {/* Right iris */}
        <ellipse cx="62" cy="44" rx="4.2" ry={3.5*eyeScaleY}
          fill={`url(#irisGrad-${charId})`}
          style={{transition:"ry 0.3s"}}/>
        {/* Right pupil */}
        <ellipse cx="62.5" cy="44" rx="2" ry={2*eyeScaleY}
          fill="#0A0608"
          style={{transition:"ry 0.3s"}}/>
        {/* Right eye catchlight */}
        <circle cx="64" cy="42.5" r="1" fill="rgba(255,255,255,0.85)"/>
        <circle cx="61" cy="45" r="0.5" fill="rgba(255,255,255,0.4)"/>
        {/* Right eyelid */}
        <path d="M55.5 44 Q62 39 68.5 44" fill="none" stroke={p.skin} strokeWidth="0.5" opacity="0.6"/>

        {/* ── NOSE */}
        <path d="M50 45 L47.5 52 Q50 54 52.5 52 Z"
          fill="rgba(0,0,0,0.09)" opacity="0.7"/>
        <path d="M48 53 Q50 55.5 52 53"
          fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="1" strokeLinecap="round"/>
        {/* Nose highlight */}
        <circle cx="49.5" cy="50" r="1.2" fill="rgba(255,255,255,0.12)"/>

        {/* ── MOUTH */}
        <path d={mouthPath}
          fill={isSpeak?"rgba(30,12,8,0.85)":"none"}
          stroke={isSpeak||isEx?"rgba(0,0,0,0.3)":p.skin}
          strokeWidth={isSpeak||isEx?"1.5":"1"}
          strokeLinecap="round"
          style={{transition:"d 0.25s,fill 0.25s"}}
          opacity="0.9"/>
        {/* Upper lip shadow */}
        <path d="M40 55.5 Q45 53.5 50 54 Q55 53.5 60 55.5"
          fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="0.8"/>
        {/* Lip highlight */}
        {(isSpeak||isEx)&&<ellipse cx="50" cy="57" rx="5" ry="1.5" fill="rgba(255,255,255,0.12)"/>}

        {/* ── CHEEK blush subtle */}
        <ellipse cx="31" cy="50" rx="6" ry="4" fill={p.skin} opacity="0.15"/>
        <ellipse cx="69" cy="50" rx="6" ry="4" fill={p.skin} opacity="0.15"/>

        {/* ── SPECIAL CHARACTER ACCESSORIES */}
        {charId==="sage"&&(
          /* Glasses */
          <g opacity="0.8">
            <rect x="31" y="41" width="13" height="8" rx="3"
              fill="none" stroke={p.primary} strokeWidth="0.8"/>
            <rect x="56" y="41" width="13" height="8" rx="3"
              fill="none" stroke={p.primary} strokeWidth="0.8"/>
            <line x1="44" y1="44.5" x2="56" y2="44.5"
              stroke={p.primary} strokeWidth="0.8"/>
            <line x1="22" y1="44" x2="31" y2="44"
              stroke={p.primary} strokeWidth="0.6"/>
            <line x1="69" y1="44" x2="78" y2="44"
              stroke={p.primary} strokeWidth="0.6"/>
          </g>
        )}
        {charId==="aria"&&(
          /* Hair highlight/clip */
          <g opacity="0.7">
            <path d="M66 22 Q72 18 74 25" fill="none" stroke={p.primary} strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="72" cy="19" r="2" fill={p.primary} opacity="0.8"/>
          </g>
        )}
        {charId==="kai"&&(
          /* Subtle earpiece */
          <g>
            <path d="M77 44 Q81 44 82 47 Q82 50 79 51"
              fill="none" stroke={p.primary} strokeWidth="0.8" opacity="0.6"/>
            <circle cx="78" cy="47" r="1" fill={p.primary} opacity="0.7"/>
          </g>
        )}
        {charId==="luna"&&(
          /* Star decoration */
          <g opacity="0.75">
            <path d="M72 18 L73.2 21.6 L77 21.6 L74 23.8 L75.2 27.4 L72 25.2 L68.8 27.4 L70 23.8 L67 21.6 L70.8 21.6 Z"
              fill={p.primary} opacity="0.8"/>
          </g>
        )}
        {charId==="nova"&&(
          /* Tech dot on forehead */
          <g>
            <circle cx="50" cy="27" r="2" fill={p.primary} opacity="0.5"/>
            <circle cx="50" cy="27" r="1" fill={p.primary} opacity="0.9"/>
          </g>
        )}

        {/* ── COLLAR / OUTFIT DETAILS */}
        {/* Accent line on collar */}
        <path d="M36 82 Q50 93 64 82"
          fill="none" stroke={`url(#goldGrad-${charId})`} strokeWidth="0.8" opacity="0.6"/>

        {/* ── STATUS DOT */}
        <circle cx="78" cy="76" r="5"
          fill={isThink?"#D4A843":isEx?p.accent:p.primary} opacity="0.9"/>
        <circle cx="78" cy="76" r="5"
          fill="none" stroke="var(--bg2)" strokeWidth="2"/>
        <circle cx="78" cy="76" r="2.5"
          fill="rgba(255,255,255,0.6)"
          style={{animation:"pulse 1.6s ease-in-out infinite"}}/>
      </svg>
    </div>
  );
}

// ─── MOOD BADGE ──────────────────────────────────────────────
function MoodBadge({charId,mood,speaking}){
  const ch=CHARS[charId]||CHARS.sage;
  const labels={idle:"Ready",thinking:"Thinking…",speaking:"Teaching",excited:"Engaged"};
  const col=mood==="thinking"?"var(--wa)":mood==="excited"?ch.palette.accent:ch.palette.primary;
  return(
    <div style={{display:"flex",alignItems:"center",gap:5,background:"var(--s2)",backdropFilter:"blur(12px)",border:`1px solid ${col}33`,borderRadius:100,padding:"4px 12px 4px 8px",transition:"all .4s"}}>
      <div style={{width:5,height:5,borderRadius:"50%",background:col,animation:"pulse 1.4s infinite",boxShadow:`0 0 6px ${col}`}}/>
      <span style={{fontSize:9,fontWeight:600,color:col,letterSpacing:.6,fontFamily:"var(--fm)"}}>{labels[mood]||"Ready"}</span>
    </div>
  );
}

// ─── AI CALL ─────────────────────────────────────────────────
async function callAI(messages,system,signal){
  const all=[{role:"system",content:system},...messages];
  if(HF_KEY&&HF_MODEL){
    try{
      const r=await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}/v1/chat/completions`,{method:"POST",signal,headers:{"Content-Type":"application/json",Authorization:`Bearer ${HF_KEY}`},body:JSON.stringify({model:HF_MODEL,messages:all,max_tokens:1300,temperature:.72,stream:false})});
      if(r.ok)return(await r.json()).choices?.[0]?.message?.content||"";
    }catch(e){if(e.name==="AbortError")throw e;}
  }
  if(GROQ_KEY){
    const r=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",signal,headers:{"Content-Type":"application/json",Authorization:`Bearer ${GROQ_KEY}`},body:JSON.stringify({model:AI_MODEL,messages:all,max_tokens:1300,temperature:.72})});
    if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e?.error?.message||`HTTP ${r.status}`);}
    return(await r.json()).choices?.[0]?.message?.content||"";
  }
  if(LOCAL_URL){
    const r=await fetch(`${LOCAL_URL}/v1/chat/completions`,{method:"POST",signal,headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"local",messages:all,max_tokens:1300})});
    if(!r.ok)throw new Error(`Local ${r.status}`);
    return(await r.json()).choices?.[0]?.message?.content||"";
  }
  throw new Error("No AI provider configured. Add VITE_GROQ_API_KEY to frontend/.env");
}

const tryParse=r=>{try{return JSON.parse(r.replace(/```json|```/g,"").trim());}catch{return null;}};
const md2html=t=>t
  .replace(/\*\*(.*?)\*\*/g,`<strong style="color:var(--t1);font-weight:600">$1</strong>`)
  .replace(/\*(.*?)\*/g,`<em style="color:var(--gold);font-style:normal;font-weight:500">$1</em>`)
  .replace(/`(.*?)`/g,`<code style="font-family:var(--fm);font-size:.82em;background:var(--s2);border:1px solid var(--b1);padding:1px 6px;border-radius:4px;color:var(--gold2)">$1</code>`)
  .replace(/\n\n/g,`</p><p style="margin-top:10px">`)
  .replace(/\n/g,"<br>");
const stripMD=t=>t.replace(/\*\*/g,"").replace(/\*/g,"").replace(/<[^>]+>/g,"").trim();
function usePersist(k,d){
  const[v,s]=useState(()=>{try{const r=localStorage.getItem(`nx3_${k}`);return r?JSON.parse(r):d;}catch{return d;}});
  useEffect(()=>{try{localStorage.setItem(`nx3_${k}`,JSON.stringify(v));}catch{}},[k,v]);
  return[v,s];
}

// ─── QUICK TOPICS ────────────────────────────────────────────
const QUICK=[
  {q:"What is Artificial Intelligence?",sub:"Tech"},
  {q:"How does photosynthesis work?",sub:"Bio"},
  {q:"Explain the Pythagorean theorem",sub:"Math"},
  {q:"What caused World War I?",sub:"Hist"},
  {q:"How does gravity work?",sub:"Physics"},
  {q:"What is supply and demand?",sub:"Econ"},
  {q:"How does DNA work?",sub:"Bio"},
  {q:"Explain recursion in programming",sub:"Tech"},
];

// ─── SYSTEM PROMPT ───────────────────────────────────────────
const LEVEL_INSTR={
  beginner:"Use everyday analogies. Define every term. Short sentences. One concept at a time. Be encouraging.",
  intermediate:"Balance depth with examples. Show cause-effect. Connect to prior knowledge.",
  advanced:"Technical precision. Nuance, formal definitions, edge cases, open questions. Treat as peer.",
};
function buildSystem(char,level,subj,lang,name){
  const ch=CHARS[char]||CHARS.sage;
  const li=LEVEL_INSTR[level]||LEVEL_INSTR.intermediate;
  const langI=lang!=="en"&&LANG_INSTR[lang]?`\nCRITICAL: ${LANG_INSTR[lang]} All JSON fields in that language.`:"";
  return`${ch.prompt}\nStudent: ${name} | Level: ${level} | Subject: ${subj}\n${li}\nAddress ${name} by name once naturally. Use **bold** key terms, *italic* nuance. Explanation arc: hook→concept→example→insight.${langI}\n\nVISUAL: Always generate a rich self-contained HTML visual (diagram/table/flow/formula). Dark bg (#0A0810). Gold/teal accents. Max 550 chars. Inline CSS only. NEVER return null.\n\nJSON only (no fences):\n{"explanation":"2-4 paragraphs **bold** *italic*","visual":"HTML visual","keyNote":"single takeaway","followUp":"Socratic question","topic":"3-5 word name","difficulty":5}`;
}

// ─── TIMER ───────────────────────────────────────────────────
const MODES={focus:{l:"Focus",m:25,c:"var(--gold)"},short:{l:"Short",m:5,c:"var(--em)"},long:{l:"Long",m:15,c:"var(--info)"}};
function Timer({onDone}){
  const[mode,setMode]=useState("focus");
  const[secs,setSecs]=useState(25*60);
  const[run,setRun]=useState(false);
  const ref=useRef();
  const cfg=MODES[mode];
  const total=cfg.m*60;
  const pct=(total-secs)/total*100;
  const R=32,C=2*Math.PI*R;
  const mm=String(Math.floor(secs/60)).padStart(2,"0");
  const ss=String(secs%60).padStart(2,"0");
  useEffect(()=>{if(run){ref.current=setInterval(()=>setSecs(s=>{if(s<=1){clearInterval(ref.current);setRun(false);onDone?.(mode);return 0;}return s-1;}),1000);}else clearInterval(ref.current);return()=>clearInterval(ref.current);},[run,mode]);
  return(
    <div className="glass" style={{padding:14}}>
      <p className="lbl" style={{marginBottom:10}}>Pomodoro Timer</p>
      <div style={{display:"flex",gap:3,marginBottom:12,background:"var(--s1)",borderRadius:"var(--r-s)",padding:3}}>
        {Object.entries(MODES).map(([k,v])=>(
          <button key={k} onClick={()=>{setRun(false);setMode(k);setSecs(v.m*60);}}
            style={{flex:1,padding:"4px 2px",background:mode===k?`${v.c}14`:"transparent",border:`1px solid ${mode===k?`${v.c}25`:"transparent"}`,borderRadius:5,color:mode===k?v.c:"var(--t3)",fontSize:8.5,fontWeight:600,cursor:"pointer",fontFamily:"var(--fm)",textTransform:"uppercase",letterSpacing:.5,transition:"all .2s"}}>
            {v.l}
          </button>
        ))}
      </div>
      <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
        <svg width="88" height="88" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={R} fill="none" stroke="var(--s2)" strokeWidth="4"/>
          <circle cx="44" cy="44" r={R} fill="none" stroke={cfg.c} strokeWidth="4" strokeDasharray={C} strokeDashoffset={C*(1-pct/100)} strokeLinecap="round" transform="rotate(-90 44 44)" style={{transition:"stroke-dashoffset .9s linear"}}/>
          <text x="44" y="40" textAnchor="middle" fill="var(--t1)" fontSize="16" fontWeight="600" fontFamily="var(--fm)">{mm}:{ss}</text>
          <text x="44" y="54" textAnchor="middle" fill="var(--t3)" fontSize="6.5" fontWeight="600" letterSpacing="2" fontFamily="var(--fm)">{cfg.l.toUpperCase()}</text>
        </svg>
      </div>
      <div style={{display:"flex",gap:6}}>
        <button onClick={()=>setRun(r=>!r)} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:5,background:run?"var(--dad)":"var(--gold-dim)",border:`1px solid ${run?"rgba(196,98,122,.25)":"var(--gold-border)"}`,color:run?"var(--da)":"var(--gold)",borderRadius:"var(--r-s)",padding:8,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"var(--fb)",transition:"all .2s"}}>
          {run?<><Pause size={11}/>Pause</>:<><Play size={11}/>Start</>}
        </button>
        <button className="btn-icon" onClick={()=>{setRun(false);setSecs(cfg.m*60);}}><RotateCcw size={12}/></button>
      </div>
    </div>
  );
}

// ─── QUIZ ────────────────────────────────────────────────────
function Quiz({data,onDone}){
  const[sel,setSel]=useState({});
  const[sub,setSub]=useState(false);
  const[anim,setAnim]=useState(0);
  const score=data.questions.reduce((a,q,i)=>a+(sel[i]===q.answer?1:0),0);
  const pct=Math.round(score/data.questions.length*100);
  useEffect(()=>{if(!sub)return;let i=0;const t=setInterval(()=>{i+=2;setAnim(Math.min(i,pct));if(i>=pct)clearInterval(t);},12);return()=>clearInterval(t);},[sub,pct]);
  const all=Object.keys(sel).length===data.questions.length;
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <span style={{fontFamily:"var(--ff)",fontSize:16,fontWeight:600,color:"var(--t1)"}}>{data.topic}</span>
        <span style={{fontSize:10,color:"var(--t3)",fontFamily:"var(--fm)"}}>{data.questions.length} Questions</span>
      </div>
      {data.questions.map((q,i)=>(
        <div key={i} style={{background:sub?(sel[i]===q.answer?"rgba(126,184,154,0.06)":"rgba(196,98,122,0.06)"):"var(--s1)",border:`1px solid ${sub?(sel[i]===q.answer?"rgba(126,184,154,0.2)":"rgba(196,98,122,0.2)"):"var(--b1)"}`,borderRadius:"var(--r-m)",padding:12,marginBottom:8,transition:"all .2s"}}>
          <p style={{fontSize:12.5,color:"var(--t1)",fontWeight:500,marginBottom:8,lineHeight:1.7}}>
            <span style={{color:"var(--t3)",marginRight:5,fontFamily:"var(--fm)",fontSize:10}}>Q{i+1}.</span>{q.question}
          </p>
          {q.options.map((op,j)=>{
            const ch=sel[i]===j,ok=sub&&j===q.answer,bad=sub&&ch&&j!==q.answer;
            return(
              <button key={j} onClick={()=>!sub&&setSel(s=>({...s,[i]:j}))}
                style={{display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",background:ok?"rgba(126,184,154,0.08)":bad?"rgba(196,98,122,0.08)":ch?"var(--gold-dim)":"var(--s1)",border:`1px solid ${ok?"rgba(126,184,154,0.28)":bad?"rgba(196,98,122,0.28)":ch?"var(--gold-border)":"var(--b1)"}`,color:ok?"var(--em)":bad?"var(--da)":ch?"var(--gold)":"var(--t2)",borderRadius:"var(--r-s)",padding:"8px 10px",fontSize:12,cursor:sub?"default":"pointer",marginBottom:4,transition:"all .15s",fontFamily:"var(--fb)"}}>
                <span style={{width:20,height:20,borderRadius:"50%",flexShrink:0,background:ok?"var(--em)":bad?"var(--da)":ch?"var(--gold)":"var(--s2)",border:`1px solid ${ok?"var(--em)":bad?"var(--da)":ch?"var(--gold)":"var(--b2)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:ok||bad||ch?"#080708":"var(--t3)"}}>
                  {ok?<Check size={9} strokeWidth={3}/>:bad?<X size={9} strokeWidth={3}/>:String.fromCharCode(65+j)}
                </span>{op}
              </button>
            );
          })}
          {sub&&<div style={{fontSize:10.5,color:"var(--t2)",marginTop:8,padding:"7px 10px",background:"var(--s1)",borderRadius:"var(--r-s)",lineHeight:1.7,borderLeft:"2px solid var(--gold-border)"}}>
            <Lightbulb size={10} style={{display:"inline",marginRight:4,color:"var(--wa)"}}/>{q.explanation}
          </div>}
        </div>
      ))}
      {!sub
        ?<button className="btn-primary" disabled={!all} onClick={()=>setSub(true)} style={{width:"100%",padding:11}}>
          {all?"Submit Answers":`${data.questions.length-Object.keys(sel).length} remaining`}
        </button>
        :<div style={{background:pct>=80?"var(--emd)":"var(--wad)",border:`1px solid ${pct>=80?"rgba(126,184,154,0.2)":"rgba(212,168,67,0.2)"}`,borderRadius:"var(--r-xl)",padding:22,textAlign:"center"}}>
          <div style={{fontFamily:"var(--fm)",fontSize:48,fontWeight:700,color:pct>=80?"var(--em)":"var(--wa)",letterSpacing:-2,lineHeight:1,marginBottom:6}}>{anim}%</div>
          <p style={{fontSize:11,color:"var(--t3)",marginBottom:5}}>{score}/{data.questions.length} correct</p>
          <p style={{fontSize:14,fontFamily:"var(--ff)",fontWeight:600,color:pct>=80?"var(--em)":"var(--wa)",marginBottom:16}}>{pct===100?"Perfect Score":pct>=80?"Excellent":pct>=60?"Good Effort":"Keep Practising"}</p>
          <button className="btn-primary" onClick={()=>onDone(pct)}>Complete · +{pct} XP</button>
        </div>
      }
    </div>
  );
}

// ─── FLASHCARDS ──────────────────────────────────────────────
function Flashcards({cards}){
  const[idx,setIdx]=useState(0);
  const[flip,setFlip]=useState(false);
  const[known,setKnown]=useState(new Set());
  const[done,setDone]=useState(false);
  const card=cards[idx];
  if(done)return(
    <div style={{textAlign:"center",padding:"28px 12px"}}>
      <div style={{width:52,height:52,background:"var(--emd)",border:"1px solid rgba(126,184,154,0.2)",borderRadius:"var(--r-xl)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}><Trophy size={22} style={{color:"var(--em)"}}/></div>
      <h3 style={{fontFamily:"var(--ff)",fontSize:20,fontWeight:600,marginBottom:5}}>Round Complete</h3>
      <p style={{fontSize:11,color:"var(--t3)",marginBottom:20}}>{known.size}/{cards.length} mastered</p>
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {known.size<cards.length&&<button className="btn-primary" onClick={()=>{setIdx(0);setFlip(false);setDone(false);}}>Review Remaining ({cards.length-known.size})</button>}
        <button className="btn-ghost" onClick={()=>{setIdx(0);setFlip(false);setKnown(new Set());setDone(false);}} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><RefreshCw size={11}/>Restart</button>
      </div>
    </div>
  );
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <span style={{fontSize:10,color:"var(--t3)",fontFamily:"var(--fm)"}}>{idx+1} / {cards.length}</span>
        <span style={{fontSize:10,color:"var(--em)",fontWeight:600,display:"flex",alignItems:"center",gap:3}}><Check size={9}/>{known.size} mastered</span>
      </div>
      <div style={{height:2,background:"var(--s2)",borderRadius:2,marginBottom:12,overflow:"hidden"}}>
        <div style={{height:"100%",background:"linear-gradient(90deg,var(--gold),var(--gold3))",borderRadius:2,width:`${idx/cards.length*100}%`,transition:"width .4s"}}/>
      </div>
      <div style={{perspective:1000,marginBottom:12,cursor:"pointer"}} onClick={()=>setFlip(f=>!f)}>
        <div style={{minHeight:150,transformStyle:"preserve-3d",transform:flip?"rotateY(180deg)":"rotateY(0deg)",transition:"transform .5s cubic-bezier(.4,0,.2,1)",position:"relative"}}>
          <div style={{position:"absolute",inset:0,backfaceVisibility:"hidden",background:"var(--s2)",border:"1px solid var(--b2)",borderRadius:"var(--r-xl)",padding:20,display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center"}}>
            <div><p className="lbl" style={{color:"var(--t4)",marginBottom:8}}>Question — tap to reveal</p><p style={{fontSize:13,color:"var(--t1)",lineHeight:1.8}}>{card.question}</p></div>
          </div>
          <div style={{position:"absolute",inset:0,backfaceVisibility:"hidden",transform:"rotateY(180deg)",background:"var(--gold-dim)",border:"1px solid var(--gold-border)",borderRadius:"var(--r-xl)",padding:20,display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center"}}>
            <div><p className="lbl" style={{color:"var(--gold3)",marginBottom:8}}>Answer</p><p style={{fontSize:12.5,color:"var(--t1)",lineHeight:1.8}}>{card.answer}</p></div>
          </div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
        <button onClick={()=>{setFlip(false);setTimeout(()=>idx<cards.length-1?setIdx(i=>i+1):setDone(true),100);}}
          style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5,background:"var(--dad)",border:"1px solid rgba(196,98,122,0.2)",color:"var(--da)",borderRadius:"var(--r-m)",padding:10,fontSize:11.5,fontWeight:600,cursor:"pointer",fontFamily:"var(--fb)"}}>
          <X size={12}/>Still Learning
        </button>
        <button onClick={()=>{setKnown(s=>new Set([...s,idx]));setFlip(false);setTimeout(()=>idx<cards.length-1?setIdx(i=>i+1):setDone(true),100);}}
          style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5,background:"var(--emd)",border:"1px solid rgba(126,184,154,0.2)",color:"var(--em)",borderRadius:"var(--r-m)",padding:10,fontSize:11.5,fontWeight:600,cursor:"pointer",fontFamily:"var(--fb)"}}>
          <Check size={12}/>Got It
        </button>
      </div>
    </div>
  );
}

// ─── CONFETTI ────────────────────────────────────────────────
const CONF=Array.from({length:40},(_,i)=>({id:i,x:Math.random()*100,delay:Math.random()*1.2,color:["#C9A96E","#8B6914","#7EB89A","#C4627A","#CE93D8","#7EC8E3"][i%6],size:4+Math.random()*6,sq:Math.random()>.5}));
function Confetti({on}){if(!on)return null;return(<div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:9999,overflow:"hidden"}}>{CONF.map(p=><div key={p.id} style={{position:"absolute",left:`${p.x}%`,top:-20,width:p.size,height:p.size,borderRadius:p.sq?"3px":"50%",background:p.color,animation:`confettiFall 2.8s ${p.delay}s ease-in forwards`}}/>)}</div>);}

// ─── TOAST ───────────────────────────────────────────────────
function Toast({data,onClose}){
  useEffect(()=>{if(!data)return;const t=setTimeout(onClose,5000);return()=>clearTimeout(t);},[data]);
  if(!data)return null;
  const{Icon,label,desc,xp,col}=data;
  return(
    <div className="toast" style={{position:"fixed",top:66,right:16,zIndex:9998,background:"var(--bg3)",backdropFilter:"blur(32px)",border:"1px solid var(--b2)",borderTop:`2px solid ${col}`,borderRadius:"var(--r-xl)",padding:"14px 16px",display:"flex",gap:12,alignItems:"center",boxShadow:"var(--sh-xl)",maxWidth:300}}>
      <div style={{width:38,height:38,background:`${col}14`,border:`1px solid ${col}22`,borderRadius:"var(--r-m)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <Icon size={16} style={{color:col}}/>
      </div>
      <div style={{flex:1}}>
        <p className="lbl" style={{color:col,marginBottom:2}}>Achievement Unlocked</p>
        <p style={{fontSize:13,fontWeight:600,color:"var(--t1)",marginBottom:1}}>{label}</p>
        <p style={{fontSize:10,color:"var(--t3)"}}>{desc} · <span style={{color:"var(--gold)",fontWeight:600,fontFamily:"var(--fm)"}}>+{xp} XP</span></p>
      </div>
      <button className="btn-icon" onClick={onClose}><X size={11}/></button>
    </div>
  );
}

// ─── COPY BTN ────────────────────────────────────────────────
function CopyBtn({text}){
  const[cp,setCp]=useState(false);
  return(<button onClick={()=>{navigator.clipboard?.writeText(text).then(()=>{setCp(true);setTimeout(()=>setCp(false),2000);});}} style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:5,padding:"3px 7px",color:cp?"var(--em)":"var(--t3)",cursor:"pointer",fontSize:9.5,display:"flex",alignItems:"center",gap:3,fontFamily:"var(--fb)",transition:"all .15s"}}>{cp?<><CheckCheck size={9}/>Copied</>:<><Copy size={9}/>Copy</>}</button>);
}

// ─── ACHIEVEMENTS ────────────────────────────────────────────
const ACHS=[
  {id:"q1",Icon:MessageSquare,label:"First Steps",desc:"Asked first question",xp:50,col:"var(--info)"},
  {id:"q5",Icon:Flame,label:"On Fire",desc:"5 questions asked",xp:100,col:"var(--wa)"},
  {id:"q10",Icon:Brain,label:"Scholar",desc:"10 questions asked",xp:200,col:"#CE93D8"},
  {id:"q25",Icon:Sparkles,label:"Polymath",desc:"25 questions asked",xp:400,col:"var(--gold)"},
  {id:"quiz1",Icon:FileText,label:"Quiz Taker",desc:"Completed first quiz",xp:75,col:"var(--wa)"},
  {id:"perfect",Icon:Trophy,label:"Perfect Score",desc:"100% on a quiz",xp:150,col:"var(--gold)"},
  {id:"notes",Icon:BookOpen,label:"Note Keeper",desc:"5 notes saved",xp:80,col:"var(--em)"},
  {id:"cards",Icon:Layers,label:"Flash Master",desc:"Flashcards completed",xp:60,col:"#CE93D8"},
  {id:"focus1",Icon:Clock,label:"Focused",desc:"1 focus session done",xp:120,col:"var(--em)"},
  {id:"multi",Icon:Globe,label:"Multilingual",desc:"Changed language",xp:100,col:"var(--info)"},
  {id:"chars",Icon:User,label:"Director",desc:"Tried all characters",xp:200,col:"var(--da)"},
];

// ─── ONBOARDING ──────────────────────────────────────────────
function Onboard({onDone}){
  const[step,setStep]=useState(0);
  const[name,setName]=useState("");
  const[subj,setSubj]=useState("all");
  const[lvl,setLvl]=useState("intermediate");
  const[char,setChar]=useState("sage");
  const[lang,setLang]=useState("en");
  const ref=useRef();
  useEffect(()=>{if(step===1)setTimeout(()=>ref.current?.focus(),120);},[step]);

  const steps=[
    /* 0 Welcome */
    <div key="w" style={{display:"flex",flexDirection:"column",alignItems:"center",gap:18}}>
      <div style={{position:"relative",width:120,height:120}}>
        <div style={{position:"absolute",inset:-12,borderRadius:"50%",background:"radial-gradient(circle,rgba(201,169,110,0.15),transparent 70%)",animation:"goldShimmer 2.5s infinite"}}/>
        <HumanAvatar charId="sage" mood="excited" size={120}/>
      </div>
      <p style={{fontSize:14,color:"var(--t2)",textAlign:"center",lineHeight:1.9,maxWidth:380,fontFamily:"var(--ff)",fontStyle:"italic"}}>
        "Your personal AI academy — five expert tutors, twelve languages, real-time voice, and interactive learning tools. Completely free."
      </p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,maxWidth:380,width:"100%"}}>
        {[[Brain,"AI-Powered"],[Globe,"12 Languages"],[User,"5 Tutors"],[Volume2,"Voice"],[Layers,"Flashcards"],[Trophy,"Achievements"]].map(([I,l])=>(
          <div key={l} style={{background:"var(--s1)",border:"1px solid var(--b1)",borderRadius:"var(--r-m)",padding:"12px 8px",textAlign:"center",transition:"all .2s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--gold-border)";e.currentTarget.style.background="var(--gold-dim)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--b1)";e.currentTarget.style.background="var(--s1)";}}>
            <I size={14} style={{color:"var(--gold)",display:"block",margin:"0 auto 5px"}}/><span style={{fontSize:9.5,color:"var(--t2)",fontWeight:500}}>{l}</span>
          </div>
        ))}
      </div>
    </div>,
    /* 1 Name */
    <div key="n" style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
      <div style={{width:56,height:56,background:"var(--gold-dim)",border:"1px solid var(--gold-border)",borderRadius:"var(--r-xl)",display:"flex",alignItems:"center",justifyContent:"center"}}><User size={22} style={{color:"var(--gold)"}}/></div>
      <input ref={ref} value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&name.trim()&&setStep(2)} placeholder="Your name…"
        style={{background:"var(--s2)",border:"1.5px solid var(--b2)",borderRadius:"var(--r-xl)",padding:"14px 22px",color:"var(--t1)",fontSize:16,width:"100%",maxWidth:300,textAlign:"center",fontFamily:"var(--ff)",letterSpacing:".5px",transition:"border-color .2s"}}
        onFocus={e=>{e.target.style.borderColor="var(--gold-border)";}}
        onBlur={e=>{e.target.style.borderColor="var(--b2)";}}/>
      <p style={{fontSize:11,color:"var(--t3)"}}>Your tutor will address you personally throughout your lessons.</p>
    </div>,
    /* 2 Character */
    <div key="c" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,maxWidth:480,width:"100%"}}>
      {Object.values(CHARS).map(ch=>{const sel=char===ch.id;return(
        <button key={ch.id} onClick={()=>setChar(ch.id)}
          style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,background:sel?"var(--gold-dim)":"var(--s1)",border:`1.5px solid ${sel?"var(--gold-border)":"var(--b1)"}`,borderRadius:"var(--r-l)",padding:"16px 8px",cursor:"pointer",transition:"all .25s",transform:sel?"scale(1.04)":"scale(1)"}}>
          <HumanAvatar charId={ch.id} mood={sel?"excited":"idle"} size={60}/>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:11.5,fontWeight:600,color:sel?"var(--gold)":"var(--t1)",fontFamily:"var(--ff)"}}>{ch.name}</div>
            <div style={{fontSize:9,color:"var(--t3)",marginTop:2}}>{ch.title}</div>
          </div>
        </button>
      );})}
    </div>,
    /* 3 Language */
    <div key="l" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7,maxWidth:480,width:"100%"}}>
      {Object.entries(LANGS).map(([code,l])=>{const sel=lang===code;return(
        <button key={code} onClick={()=>setLang(code)}
          style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,background:sel?"var(--gold-dim)":"var(--s1)",border:`1.5px solid ${sel?"var(--gold-border)":"var(--b1)"}`,borderRadius:"var(--r-m)",padding:"10px 5px",cursor:"pointer",transition:"all .2s",transform:sel?"scale(1.04)":"scale(1)"}}>
          <span style={{fontSize:20}}>{l.flag}</span>
          <span style={{fontSize:8.5,fontWeight:600,color:sel?"var(--gold)":"var(--t2)"}}>{l.native}</span>
        </button>
      );})}
    </div>,
    /* 4 Subject + Level */
    <div key="sl" style={{display:"flex",flexDirection:"column",gap:16,maxWidth:440,width:"100%"}}>
      <div>
        <p className="lbl" style={{marginBottom:10}}>Subject Focus</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7}}>
          {SUBJECTS.map(({id,label,Icon})=>{const sel=subj===id;return(
            <button key={id} onClick={()=>setSubj(id)}
              style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,background:sel?"var(--gold-dim)":"var(--s1)",border:`1.5px solid ${sel?"var(--gold-border)":"var(--b1)"}`,borderRadius:"var(--r-m)",padding:"12px 6px",cursor:"pointer",transition:"all .2s"}}>
              <Icon size={14} style={{color:sel?"var(--gold)":"var(--t3)"}}/>
              <span style={{fontSize:9.5,color:sel?"var(--t1)":"var(--t3)",fontWeight:sel?600:400,textAlign:"center",lineHeight:1.4}}>{label}</span>
            </button>
          );})}
        </div>
      </div>
      <div>
        <p className="lbl" style={{marginBottom:10}}>Expertise Level</p>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {LEVELS.map(({id,label,glyph})=>{const sel=lvl===id;return(
            <button key={id} onClick={()=>setLvl(id)}
              style={{display:"flex",alignItems:"center",gap:12,background:sel?"var(--gold-dim)":"var(--s1)",border:`1.5px solid ${sel?"var(--gold-border)":"var(--b1)"}`,borderRadius:"var(--r-xl)",padding:"14px 18px",cursor:"pointer",transition:"all .2s"}}>
              <span style={{fontFamily:"var(--fm)",fontSize:15,color:sel?"var(--gold)":"var(--t4)",width:22,textAlign:"center"}}>{glyph}</span>
              <span style={{fontSize:13,fontWeight:500,color:"var(--t1)",flex:1,textAlign:"left"}}>{label}</span>
              {sel&&<div style={{width:18,height:18,background:"var(--gold)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}><Check size={10} color="#080708" strokeWidth={3}/></div>}
            </button>
          );})}
        </div>
      </div>
    </div>,
  ];
  const titles=["Welcome to NEXUS","What's your name?","Choose your tutor","Select a language","Customise your path"];
  const ok=step===0||(step===1&&name.trim())||step>1;
  return(
    <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px 16px",background:"var(--bg)",overflowY:"auto"}}>
      <style>{CSS}</style>
      {/* Premium ambient */}
      <div style={{position:"fixed",inset:0,background:"radial-gradient(ellipse 60% 50% at 30% 20%,rgba(201,169,110,0.04),transparent),radial-gradient(ellipse 50% 40% at 80% 80%,rgba(126,184,154,0.03),transparent)",pointerEvents:"none"}}/>
      {/* Fine grain texture lines */}
      <div style={{position:"fixed",inset:0,backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 60px,rgba(201,169,110,0.012) 60px,rgba(201,169,110,0.012) 61px)",pointerEvents:"none"}}/>

      <div className="glass" style={{padding:"36px 36px",maxWidth:580,width:"100%",boxShadow:"var(--sh-xl)",position:"relative",zIndex:1,border:"1px solid var(--b1)"}}>
        {/* Gold top accent */}
        <div style={{position:"absolute",top:0,left:"20%",right:"20%",height:"1px",background:"linear-gradient(90deg,transparent,var(--gold),transparent)"}}/>

        {/* Step indicators */}
        <div style={{display:"flex",gap:5,marginBottom:28,justifyContent:"center"}}>
          {steps.map((_,i)=><div key={i} style={{height:"2px",borderRadius:2,background:i<=step?"linear-gradient(90deg,var(--gold),var(--gold3))":"var(--b1)",width:i===step?52:i<step?24:14,transition:"all .35s"}}/>)}
        </div>
        <div style={{textAlign:"center",marginBottom:22}}>
          <p className="lbl" style={{color:"var(--gold3)",marginBottom:8}}>Step {step+1} of {steps.length}</p>
          <h2 style={{fontFamily:"var(--ff)",fontSize:28,fontWeight:600,color:"var(--t1)",letterSpacing:"-.3px",fontStyle:"italic"}}>{titles[step]}</h2>
        </div>
        <div style={{marginBottom:26}}>{steps[step]}</div>
        <div style={{display:"flex",gap:8,justifyContent:"center"}}>
          {step>0&&<button className="btn-ghost" onClick={()=>setStep(s=>s-1)}>Back</button>}
          <button className="btn-primary" disabled={!ok}
            onClick={()=>step===steps.length-1?onDone({name:name.trim()||"Student",subject:subj,level:lvl,charId:char,lang}):setStep(s=>s+1)}
            style={{flex:1,maxWidth:240,display:"flex",alignItems:"center",justifyContent:"center",gap:7,padding:"13px 26px",fontSize:13,borderRadius:"var(--r-l)"}}>
            {step===steps.length-1?<><Sparkles size={13}/>Begin Learning</>:<>Continue<ArrowRight size={12}/></>}
          </button>
        </div>
        {/* Bottom accent */}
        <div style={{position:"absolute",bottom:0,left:"30%",right:"30%",height:"1px",background:"linear-gradient(90deg,transparent,var(--gold-border),transparent)"}}/>
      </div>
    </div>
  );
}

// ─── STAT MINI ───────────────────────────────────────────────
function StatMini({Icon:I,label,value,col}){
  return(
    <div style={{background:"var(--s1)",border:"1px solid var(--b1)",borderRadius:"var(--r-m)",padding:"9px 11px"}}>
      <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:4}}>
        <I size={9} style={{color:col||"var(--t3)"}}/><span className="lbl">{label}</span>
      </div>
      <div style={{fontFamily:"var(--fm)",fontSize:18,fontWeight:600,color:col||"var(--t1)",letterSpacing:-1}}>{value}</div>
    </div>
  );
}

function Spinner({col="var(--gold)"}){
  return(<div style={{width:32,height:32,border:"2px solid var(--s2)",borderTopColor:col,borderRadius:"50%",animation:"spin .85s linear infinite",margin:"0 auto"}}/>);
}

// ═══════════════════════════════════════════════════════════════
// ─── MAIN APP ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
export default function App(){
  if(!GROQ_KEY&&!HF_KEY&&!LOCAL_URL)return(
    <div><style>{CSS}</style>
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)",padding:24}}>
      <div className="glass" style={{padding:48,maxWidth:480,width:"100%",textAlign:"center",boxShadow:"var(--sh-xl)",border:"1px solid var(--b1)"}}>
        <div style={{position:"absolute",top:0,left:"20%",right:"20%",height:"1px",background:"linear-gradient(90deg,transparent,var(--gold-border),transparent)"}}/>
        <AlertTriangle size={28} color="var(--wa)" style={{margin:"0 auto 18px",display:"block"}}/>
        <h2 style={{fontFamily:"var(--ff)",fontSize:26,fontWeight:600,marginBottom:10,fontStyle:"italic"}}>API Key Required</h2>
        <p style={{fontSize:13,color:"var(--t2)",lineHeight:1.9,marginBottom:20}}>Get a free key at <strong style={{color:"var(--gold)"}}>console.groq.com/keys</strong> — no credit card needed.</p>
        <div style={{background:"var(--bg)",border:"1px solid var(--b2)",borderRadius:"var(--r-m)",padding:"12px 16px",textAlign:"left"}}>
          <pre style={{fontFamily:"var(--fm)",fontSize:12,color:"var(--em)"}}>VITE_GROQ_API_KEY=gsk_xxxxx</pre>
        </div>
        <p style={{fontSize:11,color:"var(--t3)",marginTop:12}}>Add to <code style={{fontSize:11,fontFamily:"var(--fm)"}}>frontend/.env</code> and restart</p>
      </div>
    </div></div>
  );

  const[boarded,setBoarded]=usePersist("ob3",false);
  const[profile,setProfile]=usePersist("pr3",{name:"Student",subject:"all",level:"intermediate",charId:"sage",lang:"en"});
  const[xp,setXP]=usePersist("xp3",0);
  const[earned,setEarned]=usePersist("ac3",[]);
  const[qCount,setQCount]=usePersist("qc3",0);
  const[focusN,setFocusN]=usePersist("fn3",0);
  const[notes,setNotes]=usePersist("nt3",[]);

  const[messages,setMessages]=useState([]);
  const[input,setInput]=useState("");
  const[mood,setMood]=useState("idle");
  const[speaking,setSpeaking]=useState(false);
  const[loading,setLoading]=useState(false);
  const[visual,setVisual]=useState(null);
  const[voiceOn,setVoiceOn]=useState(true);
  const[sidebar,setSidebar]=useState(true);
  const[tab,setTab]=useState("notes");
  const[toast,setToast]=useState(null);
  const[confetti,setConfetti]=useState(false);
  const[error,setError]=useState(null);
  const[history,setHistory]=useState([]);
  const[cards,setCards]=useState([]);
  const[quiz,setQuiz]=useState(null);
  const[summary,setSummary]=useState("");
  const[quizLoad,setQuizLoad]=useState(false);
  const[topic,setTopic]=useState("");
  const[gen,setGen]=useState(null);

  const[showChar,setShowChar]=useState(false);
  const[showLang,setShowLang]=useState(false);
  const[showSettings,setShowSettings]=useState(false);
  const[showSubj,setShowSubj]=useState(false);
  const[showLevel,setShowLevel]=useState(false);
  const[usedChars,setUsedChars]=usePersist("uc3",[]);

  const chatRef=useRef();
  const inputRef=useRef();
  const abortRef=useRef();
  const synthRef=useRef(typeof window!=="undefined"?window.speechSynthesis:null);

  const achSet=useMemo(()=>new Set(Array.isArray(earned)?earned:[]),[earned]);
  const level=Math.floor(xp/XP_LEVEL)+1;
  const xpInLv=xp%XP_LEVEL;
  const xpPct=(xpInLv/XP_LEVEL)*100;
  const ch=CHARS[profile.charId]||CHARS.sage;
  const curLang=LANGS[profile.lang]||LANGS.en;
  const isRTL=curLang.rtl;

  useEffect(()=>{document.body.style.direction=isRTL?"rtl":"ltr";},[isRTL]);

  useEffect(()=>{
    if(!boarded)return;
    const sl=SUBJECTS.find(s=>s.id===profile.subject)?.label||"All Subjects";
    const ll=LEVELS.find(l=>l.id===profile.level)?.label||"Intermediate";
    setMessages([{role:"assistant",content:`Welcome, **${profile.name}**. I'm ${ch.name} — ${ch.title}.\n\nI'm here to guide you through **${sl}** at the **${ll}** level in ${curLang.name}. Every question unlocks a deeper understanding — ask me anything and I'll illuminate it with visuals, voice, and interactive tools.\n\nWhat shall we explore today?`}]);
  },[boarded]);

  useEffect(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight;},[messages,loading]);

  useEffect(()=>{
    const h=e=>{
      if((e.metaKey||e.ctrlKey)&&e.key==="k"){e.preventDefault();inputRef.current?.focus();}
      if((e.metaKey||e.ctrlKey)&&e.key==="b"){e.preventDefault();setSidebar(s=>!s);}
      if(e.key==="Escape"){setShowChar(false);setShowLang(false);setShowSettings(false);setShowSubj(false);setShowLevel(false);}
    };
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[]);

  const unlock=useCallback((id)=>{
    if(achSet.has(id))return;
    const a=ACHS.find(a=>a.id===id);
    if(!a)return;
    setEarned(p=>{const arr=Array.isArray(p)?p:[];return arr.includes(id)?arr:[...arr,id];});
    setToast(a);
    setXP(x=>x+a.xp);
  },[achSet,setEarned,setXP]);

  useEffect(()=>{
    if(qCount===1)unlock("q1");
    if(qCount===5)unlock("q5");
    if(qCount===10)unlock("q10");
    if(qCount>=25)unlock("q25");
    if(notes.length>=5)unlock("notes");
    if(focusN>=1)unlock("focus1");
  },[qCount,notes.length,focusN]);

  const speak=useCallback((text)=>{
    if(!voiceOn||!synthRef.current)return;
    synthRef.current.cancel();
    const clean=text.replace(/\*\*/g,"").replace(/\*/g,"").replace(/<[^>]+>/g,"").replace(/&/g," and ").slice(0,600);
    const utt=new SpeechSynthesisUtterance(clean);
    const vc=ch.voice;
    utt.rate=vc.rate;utt.pitch=vc.pitch;utt.volume=.9;
    utt.lang=curLang.code||"en-GB";
    const voices=synthRef.current.getVoices();
    const found=vc.hints.reduce((a,h)=>a||voices.find(v=>v.name.includes(h.split(" ")[0])&&v.lang.startsWith(curLang.code?.split("-")[0]||"en")),null)
      ||voices.find(v=>v.lang.startsWith(curLang.code?.split("-")[0]||"en"));
    if(found)utt.voice=found;
    utt.onstart=()=>{setSpeaking(true);setMood("speaking");};
    utt.onend=utt.onerror=()=>{setSpeaking(false);setMood("idle");};
    synthRef.current.speak(utt);
  },[voiceOn,ch,curLang]);

  const stopSpeak=()=>{synthRef.current?.cancel();setSpeaking(false);setMood("idle");};

  const send=async()=>{
    const q=input.trim();
    if(!q||loading)return;
    setInput("");setError(null);
    const nm=[...messages,{role:"user",content:q}];
    setMessages(nm);setLoading(true);setMood("thinking");
    abortRef.current=new AbortController();
    try{
      const system=buildSystem(profile.charId,profile.level,SUBJECTS.find(s=>s.id===profile.subject)?.label||"All Subjects",profile.lang,profile.name);
      const clean=nm.map(m=>({role:m.role,content:stripMD(m.content)}));
      const raw=await callAI(clean,system,abortRef.current.signal);
      const parsed=tryParse(raw);
      if(!parsed){
        setMessages(p=>[...p,{role:"assistant",content:raw}]);
        setMood("idle");
      }else{
        const{explanation="",visual:viz=null,keyNote=null,followUp=null,topic:tp="this topic"}=parsed;
        const reply=explanation+(followUp?`\n\n*${followUp}*`:"");
        setMessages(p=>[...p,{role:"assistant",content:reply}]);
        setVisual(viz||null);setTopic(tp);setMood("excited");
        if(keyNote)setNotes(p=>[...(Array.isArray(p)?p:[]),{text:`[${tp}] ${keyNote}`,time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}]);
        setHistory(p=>[...p,{q,a:explanation,topic:tp}]);
        setQCount(c=>c+1);setXP(x=>x+25);setQuiz(null);
        setTimeout(()=>speak(explanation),300);
      }
    }catch(e){
      if(e.name==="AbortError")return;
      setError(`Error: ${e.message}`);
      setMessages(p=>[...p,{role:"assistant",content:"I had trouble connecting. Please check your API key and try again."}]);
      setMood("idle");
    }finally{setLoading(false);}
  };

  const genQuiz=async()=>{
    if(!topic)return;
    setQuizLoad(true);setTab("quiz");setQuiz(null);setGen("quiz");
    try{
      const langI=profile.lang!=="en"?`All questions in ${curLang.name} language.`:"";
      const raw=await callAI([{role:"user",content:`Create a ${profile.level} quiz on: ${topic}`}],
        `You are ${ch.name}. Generate 4 quiz questions at ${profile.level} level on "${topic}". ${langI}\nJSON only:\n{"topic":"${topic}","questions":[{"question":"...","options":["A","B","C","D"],"answer":0,"explanation":"..."}]}`,1400);
      const p=tryParse(raw);
      if(p?.questions?.length){const v=p.questions.filter(q=>q.question&&Array.isArray(q.options)&&q.options.length===4&&typeof q.answer==="number"&&q.explanation);if(v.length){setQuiz({...p,questions:v});unlock("quiz1");}}
    }catch(e){setError(`Quiz: ${e.message}`);}
    finally{setQuizLoad(false);setGen(null);}
  };

  const genCards=async()=>{
    if(!history.length)return;
    setTab("flashcards");setCards([]);setGen("cards");
    try{
      const langI=profile.lang!=="en"?`All cards in ${curLang.name}.`:"";
      const content=history.slice(-8).map(h=>`[${h.topic}] ${h.a?.slice(0,220)||h.q}`).join("\n---\n");
      const raw=await callAI([{role:"user",content:"Create 8 flashcards."}],
        `You are ${ch.name}. Create 8 educational flashcards. ${langI}\nJSON only: {"cards":[{"question":"...","answer":"...","type":"definition","topic":"..."}]}\n\nContent:\n${content}`,1600);
      const p=tryParse(raw);
      if(p?.cards?.length){const v=p.cards.filter(c=>c.question?.trim()&&c.answer?.trim());if(v.length){setCards(v);unlock("cards");}}
    }catch(e){setError(`Cards: ${e.message}`);}
    finally{setGen(null);}
  };

  const genSummary=async()=>{
    setTab("summary");
    if(!history.length){setSummary("Study a few topics first, then I'll craft a personalised session summary for you.");return;}
    setSummary("");setGen("summary");
    try{
      const langI=profile.lang!=="en"?`Write entirely in ${curLang.name}.`:"";
      const hist=history.slice(-10).map((h,i)=>`Q${i+1}[${h.topic}]: ${h.q}\nA: ${h.a?.slice(0,280)}`).join("\n\n");
      const raw=await callAI([{role:"user",content:`Summarize for ${profile.name}.`}],
        `You are ${ch.name}. Write a personalised study summary for ${profile.name}. ${langI}\nSections: KEY CONCEPTS | DEFINITIONS | TAKEAWAYS | CONNECTIONS | NEXT STEPS | ENCOURAGEMENT\n400 words. Elegant, warm prose.\n\n${hist}`,1000);
      setSummary(raw.trim());
    }catch(e){setSummary(`Error: ${e.message}`);}
    finally{setGen(null);}
  };

  const exportNotes=()=>{
    const lines=[`NEXUS AI — Study Notes`,"─".repeat(40),`Student: ${profile.name}`,`Tutor: ${ch.name}`,`Language: ${curLang.name}`,`Date: ${new Date().toLocaleDateString()}`,`Level ${level} · ${xp} XP`,"",
      ...notes.map((n,i)=>`${i+1}. [${n.time}] ${n.text}`),"",`Topics covered:`,...history.map(h=>`  — ${h.topic}`)];
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([lines.join("\n")],{type:"text/plain"}));
    a.download=`nexus-notes-${Date.now()}.txt`;a.click();
    setXP(x=>x+10);
  };

  if(!boarded)return(<div><style>{CSS}</style><Onboard onDone={p=>{setProfile(p);setBoarded(true);}}/></div>);

  return(
    <div style={{height:"100vh",display:"flex",flexDirection:"column",background:"var(--bg)",color:"var(--t1)",overflow:"hidden",direction:isRTL?"rtl":"ltr"}}>
      <style>{CSS}</style>
      <Confetti on={confetti}/>
      <Toast data={toast} onClose={()=>setToast(null)}/>

      {/* Luxury ambient */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}>
        <div style={{position:"absolute",top:"-20%",left:"10%",width:"50%",height:"50%",background:"radial-gradient(circle,rgba(201,169,110,0.028),transparent 65%)",filter:"blur(60px)"}}/>
        <div style={{position:"absolute",bottom:"-15%",right:"5%",width:"45%",height:"45%",background:"radial-gradient(circle,rgba(126,184,154,0.022),transparent 65%)",filter:"blur(60px)"}}/>
        {/* Horizontal line */}
        <div style={{position:"absolute",top:"45%",left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,rgba(201,169,110,0.04),transparent)"}}/>
        {/* Fine grain */}
        <div style={{position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 80px,rgba(201,169,110,0.008) 80px,rgba(201,169,110,0.008) 81px)",opacity:1}}/>
      </div>

      {/* ═══ HEADER ════════════════════════════════════════════ */}
      <header style={{height:52,flexShrink:0,position:"relative",zIndex:100,background:"rgba(8,7,8,0.94)",backdropFilter:"blur(40px) saturate(180%)",borderBottom:"1px solid var(--b1)",display:"flex",alignItems:"center",padding:"0 16px",gap:10}}>
        {/* Gold top line */}
        <div style={{position:"absolute",top:0,left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,rgba(201,169,110,0.35),transparent)"}}/>

        <button className="btn-icon" onClick={()=>setSidebar(s=>!s)}>
          {sidebar?<PanelLeftClose size={13}/>:<PanelLeftOpen size={13}/>}
        </button>

        {/* Brand */}
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <div style={{width:26,height:26,borderRadius:6,background:"linear-gradient(135deg,var(--gold),var(--gold3))",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 12px rgba(201,169,110,0.3)"}}>
            <GraduationCap size={14} color="#080708"/>
          </div>
          <span style={{fontFamily:"var(--ff)",fontSize:17,fontWeight:600,letterSpacing:"1px",color:"var(--t1)",fontStyle:"italic"}}>NEXUS <span style={{color:"var(--gold)"}}>AI</span></span>
        </div>

        {/* Gold divider */}
        <div style={{width:"1px",height:16,background:"linear-gradient(180deg,transparent,var(--gold-border),transparent)",flexShrink:0,marginLeft:2}}/>

        {/* XP progress */}
        <div style={{flex:1,maxWidth:180,minWidth:80}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:9,fontWeight:600,color:"var(--gold)",display:"flex",alignItems:"center",gap:2,fontFamily:"var(--fm)"}}><Star size={8} style={{fill:"var(--gold)",color:"var(--gold)"}}/>Lv {level}</span>
            <span style={{fontSize:8,color:"var(--t3)",fontFamily:"var(--fm)"}}>{xpInLv}/{XP_LEVEL}</span>
          </div>
          <div style={{height:"2px",background:"var(--s2)",borderRadius:1,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${xpPct}%`,borderRadius:1,background:"linear-gradient(90deg,var(--gold),var(--gold3))",transition:"width .7s",boxShadow:"0 0 6px rgba(201,169,110,0.4)"}}/>
          </div>
        </div>

        {/* Right controls */}
        <div style={{display:"flex",gap:6,alignItems:"center",marginLeft:"auto"}}>

          {/* CHARACTER SWITCHER */}
          <div style={{position:"relative"}}>
            <button onClick={()=>{setShowChar(s=>!s);setShowLang(false);setShowSubj(false);setShowLevel(false);setShowSettings(false);}}
              style={{display:"flex",alignItems:"center",gap:6,background:"var(--s1)",border:`1px solid ${showChar?"var(--gold-border)":"var(--b1)"}`,borderRadius:"var(--r-s)",padding:"3px 8px 3px 4px",cursor:"pointer",transition:"all .2s"}}>
              <HumanAvatar charId={profile.charId} mood={mood} speaking={speaking} size={22}/>
              <span style={{fontSize:10,fontWeight:500,color:"var(--t1)",fontFamily:"var(--ff)"}}>{ch.name}</span>
              <ChevronDown size={9} style={{color:"var(--t3)"}}/>
            </button>
            {showChar&&(
              <div className="pop" style={{position:"absolute",top:42,right:0,background:"rgba(8,7,8,0.97)",backdropFilter:"blur(40px)",border:"1px solid var(--b2)",borderRadius:"var(--r-xl)",padding:12,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,zIndex:200,boxShadow:"var(--sh-xl)",minWidth:250}}>
                <div style={{position:"absolute",top:0,left:"20%",right:"20%",height:"1px",background:"linear-gradient(90deg,transparent,var(--gold-border),transparent)"}}/>
                {Object.values(CHARS).map(c=>(
                  <button key={c.id}
                    onClick={()=>{setProfile(p=>({...p,charId:c.id}));setShowChar(false);if(!usedChars.includes(c.id)){const u=[...usedChars,c.id];setUsedChars(u);if(u.length>=Object.keys(CHARS).length)unlock("chars");}}}
                    style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,background:profile.charId===c.id?"var(--gold-dim)":"transparent",border:`1px solid ${profile.charId===c.id?"var(--gold-border)":"var(--b1)"}`,borderRadius:"var(--r-m)",padding:"10px 6px",cursor:"pointer",transition:"all .2s"}}>
                    <HumanAvatar charId={c.id} mood={profile.charId===c.id?"excited":"idle"} size={42}/>
                    <span style={{fontSize:9,fontWeight:600,color:profile.charId===c.id?"var(--gold)":"var(--t2)",textAlign:"center",fontFamily:"var(--ff)"}}>{c.name}</span>
                    <span style={{fontSize:7.5,color:"var(--t4)"}}>{c.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* LANGUAGE SWITCHER */}
          <div style={{position:"relative"}}>
            <button onClick={()=>{setShowLang(s=>!s);setShowChar(false);setShowSubj(false);setShowLevel(false);setShowSettings(false);}}
              style={{display:"flex",alignItems:"center",gap:5,background:"var(--s1)",border:"1px solid var(--b1)",borderRadius:"var(--r-s)",padding:"5px 8px",cursor:"pointer"}}>
              <span style={{fontSize:13}}>{curLang.flag}</span>
              <span style={{fontSize:10,color:"var(--t2)",fontWeight:500}}>{curLang.native}</span>
              <ChevronDown size={9} style={{color:"var(--t3)"}}/>
            </button>
            {showLang&&(
              <div className="pop" style={{position:"absolute",top:38,right:0,background:"rgba(8,7,8,0.97)",backdropFilter:"blur(40px)",border:"1px solid var(--b2)",borderRadius:"var(--r-xl)",padding:10,display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,zIndex:200,boxShadow:"var(--sh-xl)",minWidth:260}}>
                {Object.entries(LANGS).map(([code,l])=>(
                  <button key={code}
                    onClick={()=>{setProfile(p=>({...p,lang:code}));setShowLang(false);if(code!=="en")unlock("multi");}}
                    style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:profile.lang===code?"var(--gold-dim)":"transparent",border:`1px solid ${profile.lang===code?"var(--gold-border)":"transparent"}`,borderRadius:"var(--r-s)",padding:"7px 4px",cursor:"pointer",transition:"all .18s"}}>
                    <span style={{fontSize:16}}>{l.flag}</span>
                    <span style={{fontSize:8.5,color:profile.lang===code?"var(--gold)":"var(--t3)",fontWeight:profile.lang===code?600:400,textAlign:"center"}}>{l.native}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* SUBJECT */}
          <div style={{position:"relative"}}>
            <button onClick={()=>{setShowSubj(s=>!s);setShowChar(false);setShowLang(false);setShowLevel(false);setShowSettings(false);}}
              style={{display:"flex",alignItems:"center",gap:5,background:"var(--s1)",border:"1px solid var(--b1)",borderRadius:"var(--r-s)",padding:"5px 9px",cursor:"pointer"}}>
              {(()=>{const S=SUBJECTS.find(s=>s.id===profile.subject)||SUBJECTS[0];return<S.Icon size={11} style={{color:"var(--gold)"}}/>;})()}
              <span style={{fontSize:10,color:"var(--t2)"}}>{SUBJECTS.find(s=>s.id===profile.subject)?.label||"All"}</span>
              <ChevronDown size={9} style={{color:"var(--t3)"}}/>
            </button>
            {showSubj&&(
              <div className="pop" style={{position:"absolute",top:36,right:0,background:"rgba(8,7,8,0.97)",backdropFilter:"blur(40px)",border:"1px solid var(--b2)",borderRadius:"var(--r-xl)",padding:10,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5,zIndex:200,boxShadow:"var(--sh-xl)",minWidth:290}}>
                {SUBJECTS.map(({id,label,Icon})=>(
                  <button key={id} onClick={()=>{setProfile(p=>({...p,subject:id}));setShowSubj(false);}}
                    style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,background:profile.subject===id?"var(--gold-dim)":"transparent",border:`1px solid ${profile.subject===id?"var(--gold-border)":"var(--b1)"}`,borderRadius:"var(--r-m)",padding:"10px 6px",cursor:"pointer",transition:"all .18s"}}>
                    <Icon size={14} style={{color:profile.subject===id?"var(--gold)":"var(--t3)"}}/>
                    <span style={{fontSize:9.5,color:profile.subject===id?"var(--t1)":"var(--t3)",textAlign:"center",lineHeight:1.4}}>{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* LEVEL */}
          <div style={{position:"relative"}}>
            <button onClick={()=>{setShowLevel(s=>!s);setShowChar(false);setShowLang(false);setShowSubj(false);setShowSettings(false);}}
              style={{display:"flex",alignItems:"center",gap:5,background:"var(--s1)",border:"1px solid var(--b1)",borderRadius:"var(--r-s)",padding:"5px 9px",cursor:"pointer"}}>
              <span style={{fontFamily:"var(--fm)",fontSize:11,color:"var(--gold)"}}>{LEVELS.find(l=>l.id===profile.level)?.glyph||"◈"}</span>
              <span style={{fontSize:10,color:"var(--t2)"}}>{LEVELS.find(l=>l.id===profile.level)?.label||"Intermediate"}</span>
              <ChevronDown size={9} style={{color:"var(--t3)"}}/>
            </button>
            {showLevel&&(
              <div className="pop" style={{position:"absolute",top:36,right:0,background:"rgba(8,7,8,0.97)",backdropFilter:"blur(40px)",border:"1px solid var(--b2)",borderRadius:"var(--r-xl)",padding:10,display:"flex",flexDirection:"column",gap:5,zIndex:200,boxShadow:"var(--sh-xl)",minWidth:190}}>
                {LEVELS.map(({id,label,glyph})=>(
                  <button key={id} onClick={()=>{setProfile(p=>({...p,level:id}));setShowLevel(false);}}
                    style={{display:"flex",alignItems:"center",gap:10,background:profile.level===id?"var(--gold-dim)":"transparent",border:`1px solid ${profile.level===id?"var(--gold-border)":"transparent"}`,borderRadius:"var(--r-m)",padding:"10px 12px",cursor:"pointer",transition:"all .18s"}}>
                    <span style={{fontFamily:"var(--fm)",fontSize:14,color:profile.level===id?"var(--gold)":"var(--t3)",width:18,textAlign:"center"}}>{glyph}</span>
                    <span style={{fontSize:12,fontWeight:profile.level===id?500:400,color:"var(--t1)"}}>{label}</span>
                    {profile.level===id&&<Check size={11} style={{color:"var(--gold)",marginLeft:"auto"}}/>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Voice */}
          <button className={`btn-icon${voiceOn?" active":""}`} onClick={()=>{setVoiceOn(v=>!v);if(speaking)stopSpeak();}}>
            {voiceOn?<Volume2 size={13}/>:<VolumeX size={13}/>}
          </button>
          {speaking&&<button className="btn-icon" onClick={stopSpeak} style={{borderColor:"rgba(196,98,122,0.25)",color:"var(--da)"}}><Square size={11}/></button>}

          {/* Settings */}
          <div style={{position:"relative"}}>
            <button className={`btn-icon${showSettings?" active":""}`}
              onClick={()=>{setShowSettings(s=>!s);setShowChar(false);setShowLang(false);setShowSubj(false);setShowLevel(false);}}>
              <Settings size={13}/>
            </button>
            {showSettings&&(
              <div className="pop" style={{position:"absolute",top:42,right:0,background:"rgba(8,7,8,0.97)",backdropFilter:"blur(40px)",border:"1px solid var(--b2)",borderRadius:"var(--r-xl)",padding:16,minWidth:230,boxShadow:"var(--sh-xl)",zIndex:200}}>
                <p className="lbl" style={{marginBottom:12,color:"var(--gold3)"}}>Account</p>
                <div style={{background:"var(--s1)",border:"1px solid var(--b1)",borderRadius:"var(--r-m)",padding:"10px 14px",marginBottom:12,fontSize:11.5,color:"var(--t2)",lineHeight:2}}>
                  <div>Student: <span style={{color:"var(--t1)",fontWeight:500,fontFamily:"var(--ff)",fontStyle:"italic"}}>{profile.name}</span></div>
                  <div>XP: <span style={{color:"var(--gold)",fontWeight:600,fontFamily:"var(--fm)"}}>{xp.toLocaleString()}</span></div>
                  <div>Level: <span style={{color:"var(--gold2)",fontWeight:600}}>{level}</span></div>
                  <div>Model: <span style={{color:"var(--t3)",fontFamily:"var(--fm)",fontSize:10}}>{ACTIVE_MODEL}</span></div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  <button className="btn-ghost" style={{color:"var(--da)",borderColor:"rgba(196,98,122,0.18)",fontSize:11,display:"flex",alignItems:"center",gap:5}}
                    onClick={()=>{if(window.confirm("Reset all progress?")){ setXP(0);setEarned([]);setQCount(0);setFocusN(0);setNotes([]);setShowSettings(false); }}}>
                    <Trash2 size={11}/>Reset Progress
                  </button>
                  <button className="btn-ghost" style={{fontSize:11,display:"flex",alignItems:"center",gap:5}}
                    onClick={()=>{setBoarded(false);setShowSettings(false);}}>
                    <RefreshCw size={11}/>Redo Setup
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Live indicator */}
          <div style={{display:"flex",alignItems:"center",gap:4,padding:"3px 9px",background:"rgba(126,184,154,0.07)",border:"1px solid rgba(126,184,154,0.16)",borderRadius:100}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:"var(--em)",animation:"pulse 2s infinite",boxShadow:"0 0 4px var(--em)"}}/>
            <span style={{fontSize:8,fontWeight:600,color:"var(--em)",letterSpacing:.8,fontFamily:"var(--fm)"}}>LIVE</span>
          </div>
        </div>
      </header>

      {/* Click-away */}
      {(showChar||showLang||showSubj||showLevel||showSettings)&&
        <div style={{position:"fixed",inset:0,zIndex:99}} onClick={()=>{setShowChar(false);setShowLang(false);setShowSubj(false);setShowLevel(false);setShowSettings(false);}}/>
      }

      {/* ═══ BODY ═══════════════════════════════════════════════ */}
      <div style={{flex:1,display:"grid",minHeight:0,position:"relative",zIndex:1,gridTemplateColumns:`${sidebar?"264px":"0px"} 1fr 308px`,transition:"grid-template-columns .3s cubic-bezier(.4,0,.2,1)"}}>

        {/* ── LEFT SIDEBAR ── */}
        <aside style={{background:"rgba(10,9,10,0.7)",backdropFilter:"blur(28px)",borderRight:"1px solid var(--b1)",display:"flex",flexDirection:"column",gap:14,overflowY:"auto",overflowX:"hidden",padding:sidebar?"15px 14px":0,opacity:sidebar?1:0,transition:"padding .3s,opacity .22s",scrollbarWidth:"thin"}}>
          {sidebar&&(<>
            {/* Avatar + status */}
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,paddingTop:4}}>
              <div style={{position:"relative"}}>
                <div style={{position:"absolute",inset:-14,borderRadius:"50%",background:`radial-gradient(circle,${ch.palette.glow},transparent 65%)`,animation:"goldShimmer 3s infinite"}}/>
                <HumanAvatar charId={profile.charId} mood={mood} speaking={speaking} size={100}/>
              </div>
              <MoodBadge charId={profile.charId} mood={mood} speaking={speaking}/>
              <div className="glass-gold" style={{padding:"7px 14px",fontSize:10.5,color:"var(--t3)",textAlign:"center",lineHeight:1.7,width:"100%",fontFamily:"var(--ff)",fontStyle:"italic"}}>
                {loading?`${ch.name} is preparing your lesson…`:speaking?`${ch.name} is speaking…`:`${ch.name} — ${ch.title}`}
              </div>
            </div>

            <div className="divider"/>

            {/* XP card */}
            <div className="glass" style={{padding:12}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{position:"relative",width:52,height:52,flexShrink:0}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart innerRadius={16} outerRadius={24} startAngle={90} endAngle={-270} data={[{v:xpPct},{v:100-xpPct}]}>
                      <defs>
                        <linearGradient id="xpg" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="var(--gold)"/>
                          <stop offset="100%" stopColor="var(--gold3)"/>
                        </linearGradient>
                      </defs>
                      <RadialBar dataKey="v" cornerRadius={8} background={{fill:"var(--s2)"}}>
                        <Cell fill="url(#xpg)"/>
                        <Cell fill="transparent"/>
                      </RadialBar>
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
                    <span style={{fontFamily:"var(--fm)",fontSize:11,fontWeight:600,color:"var(--t1)",lineHeight:1}}>{level}</span>
                    <span style={{fontSize:6,color:"var(--t3)",fontWeight:600,letterSpacing:1}}>LVL</span>
                  </div>
                </div>
                <div style={{flex:1}}>
                  <p className="lbl" style={{marginBottom:5}}>Progress</p>
                  <p style={{fontSize:11,color:"var(--t1)",fontWeight:500,marginBottom:1,fontFamily:"var(--fm)"}}>{xp.toLocaleString()} XP</p>
                  <p style={{fontSize:9.5,color:"var(--t3)"}}>{XP_LEVEL-xpInLv} to Level {level+1}</p>
                  <div style={{marginTop:7,height:"2px",background:"var(--s2)",borderRadius:2}}>
                    <div style={{height:"100%",width:`${xpPct}%`,background:"linear-gradient(90deg,var(--gold),var(--gold3))",borderRadius:2,transition:"width .7s"}}/>
                  </div>
                </div>
              </div>
            </div>

            {/* Timer */}
            <Timer onComplete={m=>{if(m==="focus"){const n=focusN+1;setFocusN(n);setXP(x=>x+60);unlock("focus1");setConfetti(true);setTimeout(()=>setConfetti(false),3500);}}}/>

            {/* Stats */}
            <div>
              <p className="lbl" style={{marginBottom:8}}>Session</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                <StatMini Icon={MessageSquare} label="Questions" value={qCount} col="var(--info)"/>
                <StatMini Icon={BookOpen} label="Notes" value={notes.length} col="var(--em)"/>
                <StatMini Icon={Star} label="XP" value={xp.toLocaleString()} col="var(--gold)"/>
                <StatMini Icon={Clock} label="Focus" value={`${focusN}×`} col="#CE93D8"/>
              </div>
            </div>

            {/* Quick topics */}
            <div>
              <p className="lbl" style={{marginBottom:8}}>Quick Start</p>
              <div style={{display:"flex",flexDirection:"column",gap:3}}>
                {QUICK.map((t,i)=>(
                  <button key={i} onClick={()=>{setInput(t.q);inputRef.current?.focus();}}
                    style={{display:"flex",alignItems:"center",gap:7,width:"100%",textAlign:"left",background:"var(--s1)",border:"1px solid var(--b1)",color:"var(--t3)",borderRadius:"var(--r-s)",padding:"5px 9px",fontSize:10.5,cursor:"pointer",fontFamily:"var(--fb)",transition:"all .15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.background="var(--s2)";e.currentTarget.style.color="var(--t1)";e.currentTarget.style.borderColor="var(--gold-border)";e.currentTarget.style.transform="translateX(2px)";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="var(--s1)";e.currentTarget.style.color="var(--t3)";e.currentTarget.style.borderColor="var(--b1)";e.currentTarget.style.transform="translateX(0)";}}>
                    <span style={{fontSize:7.5,fontWeight:600,letterSpacing:.5,textTransform:"uppercase",color:"var(--gold3)",minWidth:32,fontFamily:"var(--fm)"}}>{t.sub}</span>
                    <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{t.q}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Achievements */}
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <p className="lbl">Achievements</p>
                <span style={{fontSize:8.5,color:"var(--t4)",fontFamily:"var(--fm)"}}>{achSet.size}/{ACHS.length}</span>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {ACHS.map(a=>{const done=achSet.has(a.id);return(
                  <div key={a.id} title={done?`${a.label}: ${a.desc} (+${a.xp}XP)`:`Locked: ${a.label}`}
                    style={{width:30,height:30,borderRadius:"var(--r-s)",background:done?`${a.col}12`:"var(--s1)",border:`1px solid ${done?`${a.col}22`:"var(--b1)"}`,display:"flex",alignItems:"center",justifyContent:"center",opacity:done?1:.2,transition:"all .25s",cursor:"default",boxShadow:done?`0 0 6px ${a.col}15`:"none"}}>
                    <a.Icon size={12} style={{color:done?a.col:"var(--t4)"}}/>
                  </div>
                );})}
              </div>
            </div>
          </>)}
        </aside>

        {/* ── CHAT ── */}
        <main style={{display:"flex",flexDirection:"column",minHeight:0}}>
          <div ref={chatRef} style={{flex:1,overflowY:"auto",padding:"28px 24px",display:"flex",flexDirection:"column",gap:18}}>
            {messages.map((m,i)=>(
              <div key={i} className="msg" style={{display:"flex",flexDirection:m.role==="user"?"row-reverse":"row",gap:10,alignItems:"flex-start"}}>
                <div style={{width:28,height:28,borderRadius:"var(--r-s)",flexShrink:0,overflow:"hidden",boxShadow:"0 2px 10px rgba(0,0,0,0.5)"}}>
                  {m.role==="user"
                    ?<div style={{width:"100%",height:"100%",background:"linear-gradient(135deg,var(--gold),var(--gold3))",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <span style={{fontSize:11,fontWeight:700,color:"#080708",fontFamily:"var(--fm)"}}>{profile.name[0]?.toUpperCase()||"U"}</span>
                    </div>
                    :<HumanAvatar charId={profile.charId} mood="idle" size={28}/>
                  }
                </div>
                <div style={{
                  maxWidth:"75%",
                  background:m.role==="user"
                    ?"linear-gradient(135deg,rgba(201,169,110,0.14),rgba(168,136,46,0.10))"
                    :"linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))",
                  backdropFilter:m.role==="user"?"none":"blur(20px)",
                  borderRadius:m.role==="user"?"var(--r-xl) 4px var(--r-xl) var(--r-xl)":"4px var(--r-xl) var(--r-xl) var(--r-xl)",
                  padding:"12px 16px",
                  fontSize:13.5,lineHeight:1.85,
                  border:m.role==="user"?"1px solid var(--gold-border)":"1px solid var(--b2)",
                  color:"var(--t1)",
                  boxShadow:m.role==="user"?"0 4px 20px rgba(201,169,110,0.08)":"var(--sh)"
                }} dangerouslySetInnerHTML={{__html:`<p style="margin:0">${md2html(m.content)}</p>`}}/>
              </div>
            ))}

            {loading&&(
              <div className="msg" style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                <div style={{width:28,height:28,borderRadius:"var(--r-s)",overflow:"hidden"}}>
                  <HumanAvatar charId={profile.charId} mood="thinking" size={28}/>
                </div>
                <div style={{background:"linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))",backdropFilter:"blur(20px)",border:"1px solid var(--b2)",borderRadius:"4px var(--r-xl) var(--r-xl) var(--r-xl)",padding:"13px 16px",display:"flex",gap:5,alignItems:"center"}}>
                  {[0,1,2].map(j=><div key={j} style={{width:6,height:6,borderRadius:"50%",background:"var(--gold)",opacity:0.7,animation:`pulse ${.6+j*.18}s infinite`}}/>)}
                  <button onClick={()=>abortRef.current?.abort()}
                    style={{marginLeft:10,background:"none",border:"none",color:"var(--t3)",cursor:"pointer",fontSize:10.5,fontFamily:"var(--fb)",transition:"color .15s"}}
                    onMouseEnter={e=>e.currentTarget.style.color="var(--da)"}
                    onMouseLeave={e=>e.currentTarget.style.color="var(--t3)"}>
                    <X size={10}/> Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Action chips */}
            {!loading&&topic&&messages.length>1&&(
              <div style={{display:"flex",justifyContent:"center",gap:6,flexWrap:"wrap",padding:"2px 0"}}>
                {[
                  {l:`Quiz: "${topic.slice(0,16)}"`,col:"var(--wa)",fn:genQuiz,I:FileText},
                  {l:"Flashcards",col:"#CE93D8",fn:genCards,I:Layers},
                  {l:"Summary",col:"var(--em)",fn:genSummary,I:BarChart3},
                ].map(({l,col,fn,I})=>(
                  <button key={l} onClick={fn} disabled={!!gen}
                    style={{display:"flex",alignItems:"center",gap:4,background:"var(--s1)",backdropFilter:"blur(12px)",border:`1px solid ${col}22`,color:col,borderRadius:100,padding:"5px 13px",fontSize:10.5,fontWeight:500,cursor:"pointer",fontFamily:"var(--fb)",transition:"all .18s",opacity:gen?.65:1}}
                    onMouseEnter={e=>{if(!gen){e.currentTarget.style.background=`${col}0D`;e.currentTarget.style.borderColor=`${col}44`;e.currentTarget.style.transform="translateY(-1px)";}}}
                    onMouseLeave={e=>{e.currentTarget.style.background="var(--s1)";e.currentTarget.style.borderColor=`${col}22`;e.currentTarget.style.transform="translateY(0)";}}>
                    <I size={10}/>{l}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Error */}
          {error&&(
            <div style={{margin:"0 24px 8px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--dad)",border:"1px solid rgba(196,98,122,0.2)",borderRadius:"var(--r-m)",padding:"7px 12px"}}>
              <span style={{fontSize:11.5,color:"var(--da)",display:"flex",alignItems:"center",gap:4}}><AlertTriangle size={10}/>{error}</span>
              <button className="btn-icon" onClick={()=>setError(null)} style={{borderColor:"rgba(196,98,122,0.2)",color:"var(--da)"}}><X size={10}/></button>
            </div>
          )}

          {/* Input */}
          <div style={{padding:"10px 24px 16px",background:"rgba(8,7,8,0.88)",backdropFilter:"blur(32px)",borderTop:"1px solid var(--b1)",flexShrink:0}}>
            {/* Gold top accent */}
            <div style={{height:"1px",background:"linear-gradient(90deg,transparent,rgba(201,169,110,0.12),transparent)",marginBottom:10}}/>
            <div style={{display:"flex",gap:10,alignItems:"flex-end",background:"linear-gradient(145deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))",backdropFilter:"blur(16px)",borderRadius:"var(--r-xl)",border:"1px solid var(--b2)",padding:"10px 12px",transition:"border-color .25s,box-shadow .25s"}}
              onFocusCapture={e=>{e.currentTarget.style.borderColor="var(--gold-border)";e.currentTarget.style.boxShadow="0 0 0 3px rgba(201,169,110,0.07)";}}
              onBlurCapture={e=>{e.currentTarget.style.borderColor="var(--b2)";e.currentTarget.style.boxShadow="none";}}>
              <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
                placeholder={`Ask about ${SUBJECTS.find(s=>s.id===profile.subject)?.label||"any subject"} in ${curLang.name}…`}
                rows={2} dir={isRTL?"rtl":"ltr"}
                style={{flex:1,background:"transparent",border:"none",color:"var(--t1)",fontSize:14,lineHeight:1.7,fontFamily:"var(--ff)",resize:"none",fontStyle:"italic",letterSpacing:".2px"}}/>
              <button onClick={send} disabled={loading||!input.trim()} className="btn-primary"
                style={{flexShrink:0,padding:"9px 14px",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"var(--r-m)",minWidth:42}}>
                {loading
                  ?<div style={{width:13,height:13,border:"2px solid rgba(0,0,0,0.25)",borderTopColor:"#080708",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
                  :<ArrowRight size={14}/>
                }
              </button>
            </div>
            <div style={{display:"flex",justifyContent:"center",gap:14,marginTop:7}}>
              {[["⌘K","focus"],["⌘B","sidebar"],["↵","send"],["⇧↵","new line"]].map(([k,h])=>(
                <span key={k} style={{fontSize:9,color:"var(--t4)",display:"flex",alignItems:"center",gap:3}}>
                  <kbd style={{background:"var(--s2)",border:"1px solid var(--b1)",borderRadius:3,padding:"1px 5px",fontFamily:"var(--fm)",fontSize:8.5,color:"var(--t3)"}}>{k}</kbd>{h}
                </span>
              ))}
            </div>
          </div>
        </main>

        {/* ── RIGHT PANEL ── */}
        <aside style={{display:"flex",flexDirection:"column",minHeight:0,background:"rgba(10,9,10,0.6)",backdropFilter:"blur(28px)",borderLeft:"1px solid var(--b1)"}}>
          {/* Visual Aid */}
          <div style={{padding:12,borderBottom:"1px solid var(--b1)",flexShrink:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <p className="lbl">Visual Aid</p>
                {visual&&<div style={{width:4,height:4,borderRadius:"50%",background:"var(--em)",animation:"pulse 2s infinite",boxShadow:"0 0 4px var(--em)"}}/>}
              </div>
              {visual&&<CopyBtn text={visual}/>}
            </div>
            <div style={{minHeight:178,maxHeight:240,background:"#060508",borderRadius:"var(--r-xl)",border:`1px solid ${visual?"var(--gold-border)":"var(--b1)"}`,overflow:"auto",transition:"border-color .4s",position:"relative"}}>
              {visual
                ?<div style={{padding:12,width:"100%"}} dangerouslySetInnerHTML={{__html:visual}}/>
                :loading
                  ?<div style={{padding:14,display:"flex",flexDirection:"column",gap:8}}>
                    {[100,72,88,55].map((w,i)=><div key={i} style={{height:8,width:`${w}%`,borderRadius:4,backgroundImage:"linear-gradient(90deg,var(--s1) 0%,var(--s3) 50%,var(--s1) 100%)",backgroundSize:"600px 100%",animation:`shimmer 1.8s ${i*.18}s infinite linear`}}/>)}
                    <div style={{display:"flex",gap:7,marginTop:4}}>
                      {["rgba(201,169,110,0.14)","rgba(126,184,154,0.12)","rgba(122,156,196,0.12)"].map((bg,i)=>(
                        <div key={i} style={{flex:1,height:32,borderRadius:8,background:bg,backgroundImage:"linear-gradient(90deg,transparent,rgba(255,255,255,0.03),transparent)",backgroundSize:"600px 100%",animation:`shimmer 1.8s ${i*.28}s infinite linear`}}/>
                      ))}
                    </div>
                  </div>
                  :<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:178,gap:14}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      {[{l:"Concept",c:"var(--gold)"},{l:"Example",c:"var(--em)"},{l:"Insight",c:"var(--info)"}].map((n,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:6}}>
                          {i>0&&<div style={{width:12,height:"1px",background:"var(--b2)"}}/>}
                          <div style={{background:`${n.c}0D`,border:`1px solid ${n.c}20`,borderRadius:5,padding:"4px 9px",fontSize:9.5,color:n.c,fontWeight:500}}>{n.l}</div>
                        </div>
                      ))}
                    </div>
                    <p style={{fontSize:10,color:"var(--t3)",textAlign:"center",lineHeight:1.8,fontFamily:"var(--ff)",fontStyle:"italic"}}>Ask a question to generate<br/>an AI diagram here</p>
                  </div>
              }
            </div>
          </div>

          {/* Tabs */}
          <div style={{display:"flex",background:"var(--s1)",borderBottom:"1px solid var(--b1)",flexShrink:0,padding:"3px 3px 0"}}>
            {[{k:"notes",I:BookOpen,l:"Notes",b:notes.length},{k:"quiz",I:FileText,l:"Quiz",b:null},{k:"flashcards",I:Layers,l:"Cards",b:cards.length},{k:"summary",I:BarChart3,l:"Summary",b:null}].map(t=>(
              <button key={t.k} onClick={()=>t.k==="summary"?genSummary():setTab(t.k)}
                style={{flex:1,padding:"7px 2px 6px",background:"transparent",border:"none",fontFamily:"var(--fb)",borderBottom:`1.5px solid ${tab===t.k?"var(--gold)":"transparent"}`,color:tab===t.k?"var(--gold)":"var(--t4)",fontSize:8.5,fontWeight:600,cursor:"pointer",letterSpacing:.5,textTransform:"uppercase",position:"relative",transition:"color .2s",display:"flex",alignItems:"center",justifyContent:"center",gap:3}}>
                <t.I size={10}/>{t.l}
                {t.b!=null&&t.b>0&&<span style={{position:"absolute",top:3,right:1,background:"var(--gold3)",color:"#080708",borderRadius:100,width:13,height:13,fontSize:7,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontFamily:"var(--fm)"}}>{t.b}</span>}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{flex:1,overflowY:"auto",padding:12}}>
            {tab==="notes"&&(
              notes.length===0
                ?<div style={{textAlign:"center",padding:"32px 10px"}}>
                  <BookMarked size={18} style={{color:"var(--t4)",display:"block",margin:"0 auto 12px"}}/>
                  <p style={{fontSize:14,fontWeight:600,color:"var(--t2)",marginBottom:5,fontFamily:"var(--ff)",fontStyle:"italic"}}>No notes yet</p>
                  <p style={{fontSize:10.5,color:"var(--t3)",lineHeight:1.85}}>Key takeaways appear here automatically after each lesson.</p>
                </div>
                :<div>
                  {notes.map((n,i)=>(
                    <div key={i}
                      style={{background:"var(--s1)",border:"1px solid var(--b1)",borderLeft:"2px solid var(--gold3)",borderRadius:"0 var(--r-m) var(--r-m) 0",padding:"9px 12px",marginBottom:7,transition:"background .2s"}}
                      onMouseEnter={e=>e.currentTarget.style.background="var(--s2)"}
                      onMouseLeave={e=>e.currentTarget.style.background="var(--s1)"}>
                      <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:4}}>
                        <span className="lbl" style={{color:"var(--gold3)"}}>Note {i+1}</span>
                        <span style={{fontSize:8.5,color:"var(--t4)",fontFamily:"var(--fm)",marginLeft:"auto"}}>{n.time}</span>
                      </div>
                      <p style={{fontSize:10.5,color:"var(--t2)",lineHeight:1.8}}>{n.text}</p>
                    </div>
                  ))}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:10}}>
                    <button className="btn-ghost" onClick={exportNotes} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,fontSize:10.5}}><Download size={10}/>Export</button>
                    <button className="btn-ghost" onClick={()=>{if(window.confirm("Clear all notes?"))setNotes([]);}} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,fontSize:10.5,color:"var(--da)",borderColor:"rgba(196,98,122,0.18)"}}><Trash2 size={10}/>Clear</button>
                  </div>
                </div>
            )}
            {tab==="quiz"&&(
              quizLoad
                ?<div style={{textAlign:"center",padding:"40px 12px"}}><Spinner col="var(--wa)"/><p style={{fontSize:11.5,color:"var(--t3)",marginTop:12,fontFamily:"var(--ff)",fontStyle:"italic"}}>Generating quiz…</p></div>
                :quiz
                  ?<Quiz data={quiz} onDone={p=>{setXP(x=>x+Math.round(p));if(p===100){unlock("perfect");setConfetti(true);setTimeout(()=>setConfetti(false),3500);}setTimeout(()=>setQuiz(null),2800);}}/>
                  :<div style={{textAlign:"center",padding:"32px 10px"}}>
                    <FileText size={18} style={{color:"var(--t4)",display:"block",margin:"0 auto 12px"}}/>
                    <p style={{fontSize:14,fontWeight:600,color:"var(--t2)",marginBottom:5,fontFamily:"var(--ff)",fontStyle:"italic"}}>No quiz yet</p>
                    <p style={{fontSize:10.5,color:"var(--t3)",lineHeight:1.85,marginBottom:16}}>Learn a topic, then test your knowledge.</p>
                    {topic&&<button className="btn-primary" onClick={genQuiz} style={{fontSize:12,padding:"9px 20px",borderRadius:"var(--r-m)"}}>Generate Quiz</button>}
                  </div>
            )}
            {tab==="flashcards"&&(
              gen==="cards"&&!cards.length
                ?<div style={{textAlign:"center",padding:"40px 12px"}}><Spinner col="#CE93D8"/><p style={{fontSize:11.5,color:"var(--t3)",marginTop:12,fontFamily:"var(--ff)",fontStyle:"italic"}}>Generating flashcards…</p></div>
                :!cards.length
                  ?<div style={{textAlign:"center",padding:"32px 10px"}}>
                    <Layers size={18} style={{color:"var(--t4)",display:"block",margin:"0 auto 12px"}}/>
                    <p style={{fontSize:14,fontWeight:600,color:"var(--t2)",marginBottom:5,fontFamily:"var(--ff)",fontStyle:"italic"}}>No flashcards yet</p>
                    <p style={{fontSize:10.5,color:"var(--t3)",lineHeight:1.85,marginBottom:16}}>Generate cards from your session topics.</p>
                    {history.length>0&&<button className="btn-primary" onClick={genCards} style={{fontSize:12,padding:"9px 20px",borderRadius:"var(--r-m)"}}>Generate Cards</button>}
                  </div>
                  :<><Flashcards cards={cards}/><button className="btn-ghost" onClick={()=>setCards([])} style={{width:"100%",marginTop:10,fontSize:10.5,display:"flex",alignItems:"center",justifyContent:"center",gap:4}}><Trash2 size={10}/>Clear Cards</button></>
            )}
            {tab==="summary"&&(
              gen==="summary"&&!summary
                ?<div style={{textAlign:"center",padding:"40px 12px"}}><Spinner col="var(--em)"/><p style={{fontSize:11.5,color:"var(--t3)",marginTop:12,fontFamily:"var(--ff)",fontStyle:"italic"}}>Writing summary…</p></div>
                :summary
                  ?<div style={{fontSize:11.5,color:"var(--t2)",lineHeight:2.1,whiteSpace:"pre-wrap",fontFamily:"var(--ff)",fontStyle:"italic"}}>{summary}</div>
                  :<div style={{textAlign:"center",padding:"32px 10px"}}>
                    <BarChart3 size={18} style={{color:"var(--t4)",display:"block",margin:"0 auto 12px"}}/>
                    <p style={{fontSize:14,fontWeight:600,color:"var(--t2)",marginBottom:5,fontFamily:"var(--ff)",fontStyle:"italic"}}>No summary yet</p>
                    <p style={{fontSize:10.5,color:"var(--t3)",lineHeight:1.85}}>After studying, generate a personalised session summary.</p>
                  </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}