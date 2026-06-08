// refresh
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
Menu, X, Sparkles, ArrowRight, Star, Play, Layers,
ThumbsUp, Settings, Calendar, CheckCircle2, Copy, Send,
Folder, Cloud, Eye, Camera, User, ExternalLink, Link2
} from "lucide-react";
import { PortfolioData, PortfolioWork, DesignSettings } from "./types";
import { initialPortfolioData } from "./data";
import AdminPanel from "./AdminPanel";

function useReveal(ref: React.RefObject<HTMLElement | null>) {
useEffect(() => {
const obs = new IntersectionObserver(
entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); }),
{ threshold: 0.08 }
);
ref.current?.querySelectorAll(".reveal").forEach(el => obs.observe(el));
return () => obs.disconnect();
});
}

const DEFAULT_DESIGN: DesignSettings = {
primaryColor: "#0ea5e9", bgColor: "#ffffff", textColor: "#0f172a",
cardBgColor: "#ffffff", navBgColor: "#ffffff",
btnPrimaryColor: "#0ea5e9", btnPrimaryText: "#ffffff", btnPrimaryLabel: "포트폴리오",
btnSecondaryColor: "#f0f9ff", btnSecondaryLabel: "연락망",
heroBgType: "gradient", heroBgValue: "#e0f2fe",
sectionOrder: ["about","projects","process","portfolio","skills","career","contact"],
globalFontSize: "base",
};

function normalizeImageUrl(url: string): string {
  if (!url) return url;
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w800`;
  const driveMatch2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (url.includes("drive.google.com") && driveMatch2) return `https://drive.google.com/thumbnail?id=${driveMatch2[1]}&sz=w800`;
  return url;
}

const SKILL_ICON_URLS: Record<string, string> = {
  "Figma": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/figma/figma-original.svg",
  "Photoshop": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/photoshop/photoshop-plain.svg",
  "Illustrator": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/illustrator/illustrator-plain.svg",
  "Premiere Pro": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/premierepro/premierepro-plain.svg",
  "After Effects": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/aftereffects/aftereffects-plain.svg",
  "InDesign": "https://cdn.simpleicons.org/adobeindesign",
  "XD": "https://cdn.simpleicons.org/adobexd",
  "Lightroom": "https://cdn.simpleicons.org/adobelightroom",
  "Instagram 운영": "https://cdn.simpleicons.org/instagram",
  "Instagram": "https://cdn.simpleicons.org/instagram",
  "YouTube": "https://cdn.simpleicons.org/youtube",
  "TikTok": "https://cdn.simpleicons.org/tiktok",
  "Facebook": "https://cdn.simpleicons.org/facebook",
  "Twitter": "https://cdn.simpleicons.org/x",
  "LinkedIn": "https://cdn.simpleicons.org/linkedin",
  "콘텐츠 기획": "https://cdn.simpleicons.org/notion",
  "Notion": "https://cdn.simpleicons.org/notion",
  "sns 운영": "https://cdn.simpleicons.org/instagram",
  "Slack": "https://cdn.simpleicons.org/slack",
  "Jira": "https://cdn.simpleicons.org/jira",
  "Google Analytics": "https://cdn.simpleicons.org/googleanalytics",
  "Google Ads": "https://cdn.simpleicons.org/googleads",
  "CapCut": "https://cdn.simpleicons.org/capcut",
  "Canva": "https://cdn.simpleicons.org/canva",
  "ChatGPT": "https://cdn.simpleicons.org/openai",
};

function SkillIcon({ name, size = 28 }: { name: string; size?: number }) {
  const url = SKILL_ICON_URLS[name];
  const [err, setErr] = useState(false);
  if (!url || err) {
    return (
      <div style={{ width: size, height: size, display:"flex", alignItems:"center", justifyContent:"center", fontSize: size * 0.55, fontWeight:900, color:"#64748b" }}>
        {name.charAt(0)}
      </div>
    );
  }
  return (
    <img src={url} alt={name} width={size} height={size} style={{ objectFit:"contain" }} onError={() => setErr(true)} />
  );
}

const renderText = (text: string, style?: { fontSize?: string; fontWeight?: string; lineBreak?: boolean }) => {
  const sizeMap: Record<string,string> = {
    "xs":"text-xs","sm":"text-sm","base":"text-base","lg":"text-lg","xl":"text-xl",
    "2xl":"text-2xl","3xl":"text-3xl","4xl":"text-4xl","5xl":"text-5xl","6xl":"text-6xl"
  };
  const weightMap: Record<string,string> = {
    normal:"font-normal",medium:"font-medium",semibold:"font-semibold",bold:"font-bold",black:"font-black"
  };
  const cls = [
    style?.fontSize ? sizeMap[style.fontSize]||"" : "",
    style?.fontWeight ? weightMap[style.fontWeight]||"" : "",
  ].filter(Boolean).join(" ");
  const hasBreak = text.includes("\\n") || style?.lineBreak;
  if (hasBreak) {
    return <>{text.split("\\n").map((line, i, arr) => (
      <span key={i} className={cls}>{line}{i < arr.length-1 && <br />}</span>
    ))}</>;
  }
  return <span className={cls}>{text}</span>;
};

const SUPABASE_URL  = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_URL)      || "https://siljvxlnrglzhfohnpjk.supabase.co";
const SUPABASE_ANON = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) || "sb_publishable_89jX8OrdSidIAPgetXAW6A_Oi4S1YSD";
const SUPABASE_TABLE = "portfolio_data";
const SUPABASE_ROW_ID = 1;
const DB_READY = SUPABASE_URL !== "YOUR_SUPABASE_URL" && SUPABASE_ANON !== "YOUR_SUPABASE_ANON_KEY";

async function dbLoad(): Promise<{ data: PortfolioData; updated_at: string } | null> {
  if (!DB_READY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?id=eq.${SUPABASE_ROW_ID}&select=data,updated_at`,
      { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
    );
    const rows = await res.json();
    const d = rows[0].data;
    if (!d || !d.profile) return null;
    return { data: d, updated_at: rows[0].updated_at ?? "" };
  } catch { return null; }
}

async function dbSave(d: PortfolioData): Promise<void> {
  if (!DB_READY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({ id: SUPABASE_ROW_ID, data: d }),
    });
  } catch {}
}

function isAdminAllowed(): boolean {
  return true;
}

export default function App() {
  const [data, setData] = useState<PortfolioData>(() => initialPortfolioData);
  const [adminOpen, setAdminOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [selectedWork, setSelectedWork] = useState<PortfolioWork | null>(null);
  const [selectedCat, setSelectedCat] = useState("all");
const [activeSection, setActiveSection] = useState<string | null>(null);
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<"idle"|"saving"|"saved"|"error"|"offline">("idle");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>("");
  const adminAllowed = isAdminAllowed();

  useEffect(() => {
    const logged = sessionStorage.getItem("ysk_admin_auth");
    if (logged === "true") setAdminLoggedIn(true);
  }, []);

  const D = { ...DEFAULT_DESIGN, ...(data.design || {}) };
  const primary = D.primaryColor;

  const aboutRef = useRef<HTMLElement>(null);
  const projRef = useRef<HTMLElement>(null);
  const procRef = useRef<HTMLElement>(null);
  const portRef = useRef<HTMLElement>(null);
  const skillRef = useRef<HTMLElement>(null);
  const careerRef = useRef<HTMLElement>(null);
  const contactRef = useRef<HTMLElement>(null);

  const sectionRefMap: Record<string, React.RefObject<HTMLElement | null>> = {
    about: aboutRef, projects: projRef, process: procRef,
    portfolio: portRef, skills: skillRef, career: careerRef, contact: contactRef,
  };

  useReveal(aboutRef); useReveal(projRef); useReveal(procRef);
  useReveal(portRef); useReveal(skillRef); useReveal(careerRef); useReveal(contactRef);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const remote = await dbLoad();
        if (remote) {
          const d = remote.data;
          if (!d.sections) d.sections = initialPortfolioData.sections;
          else d.sections = { ...initialPortfolioData.sections, ...d.sections };
          if (!d.design) d.design = initialPortfolioData.design;
          setData(d);
          setLastUpdatedAt(remote.updated_at);
          localStorage.setItem("ysk_final_v2", JSON.stringify(d));
          setSyncStatus(DB_READY ? "saved" : "offline");
          setLoading(false);
          return;
        }
      } catch {}
      try {
        const saved = localStorage.getItem("ysk_final_v2");
        if (saved) {
          const p = JSON.parse(saved);
          if (!p.sections) p.sections = initialPortfolioData.sections;
          else p.sections = { ...initialPortfolioData.sections, ...p.sections };
          if (!p.design) p.design = initialPortfolioData.design;
          setData(p);
        }
      } catch {}
      setSyncStatus(DB_READY ? "error" : "offline");
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!DB_READY) return;
    const poll = async () => {
      try {
        const remote = await dbLoad();
        if (!remote) return;
        setLastUpdatedAt(prev => {
          if (prev && remote.updated_at && remote.updated_at !== prev) {
            const d = remote.data;
            if (!d.sections) d.sections = initialPortfolioData.sections;
            else d.sections = { ...initialPortfolioData.sections, ...d.sections };
            if (!d.design) d.design = initialPortfolioData.design;
            setData(d);
            localStorage.setItem("ysk_final_v2", JSON.stringify(d));
          }
          return remote.updated_at ?? prev;
        });
      } catch {}
    };
    const timer = setInterval(poll, 5000);
    return () => clearInterval(timer);
  }, []);

  const saveData = (d: PortfolioData) => {
    setData(d);
    localStorage.setItem("ysk_final_v2", JSON.stringify(d));
    setSyncStatus("saving");
    dbSave(d).then(() => {
      setSyncStatus("saved");
      setLastUpdatedAt(new Date().toISOString());
      setTimeout(() => setSyncStatus("idle"), 3000);
    }).catch(() => setSyncStatus("error"));
  };

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
const handleScroll = () => {
      const scrollY = window.scrollY + window.innerHeight * 0.25;
      let current = "";
      for (const [id, ref] of Object.entries(sectionRefMap)) {
        const el = ref.current;
        if (!el) continue;
        if (scrollY >= el.offsetTop) current = id;
      }
      setActiveSection(current);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", D.primaryColor);
    root.style.setProperty("--primary-light", D.primaryColor + "20");
    root.style.setProperty("--bg", D.bgColor);
    root.style.setProperty("--text", D.textColor);
    root.style.setProperty("--card-bg", D.cardBgColor);
  }, [data.design]);

  const copyEmail = () => {
    navigator.clipboard.writeText(data.contact.email);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const getEmbed = (url: string) => {
    if (!url) return "";
    if (url.includes("youtube.com/embed/")) return url;
    if (url.includes("youtube.com/watch")) {
      try { const v = new URL(url).searchParams.get("v"); if (v) return `https://www.youtube.com/embed/${v}?autoplay=1`; } catch {}
    }
    if (url.includes("youtu.be/")) {
      try { const id = url.split("youtu.be/")[1]?.split("?")[0]; if (id) return `https://www.youtube.com/embed/${id}?autoplay=1`; } catch {}
    }
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    if (url.includes("vimeo.com")) {
      try { const id = url.split("vimeo.com/")[1]?.split("?")[0]; if (id) return `https://player.vimeo.com/video/${id}?autoplay=1`; } catch {}
    }
    return "";
  };

  const allCats = ["all", ...Array.from(new Set((data.portfolioWorks||[]).map(w => w.category)))];
  const filtered = selectedCat === "all" ? (data.portfolioWorks||[]) : (data.portfolioWorks||[]).filter(w => w.category === selectedCat);

  const navItems = [
    ["#about","about","01 소개"],["#projects","projects","02 프로젝트"],
    ["#process","process","03 워크플로우"],["#portfolio","portfolio","04 포트폴리오"],
    ["#skills","skills","05 역량/툴"],["#career","career","06 경력"],["#contact","contact","07 마무리"]
  ];

  const sectionOrder = D.sectionOrder || ["about","projects","process","portfolio","skills","career","contact"];

  const isVisible = (id: string) => {
    const sec = data.sections?.[id as keyof typeof data.sections];
    return sec ? (sec.visible !== false) : true;
  };

  // 프사 5번 연타 어드민 트리거
  const handlePhotoClick = () => {
    if (!adminAllowed) return;
    const now = Date.now();
    const key = "_adminClicks";
    const stored = JSON.parse(sessionStorage.getItem(key) || "[]");
    const recent = [...stored, now].filter(t => now - t < 2000);
    sessionStorage.setItem(key, JSON.stringify(recent));
    if (recent.length >= 5) {
      sessionStorage.removeItem(key);
      setAdminOpen(true);
    }
  };

  // 헤드라인 렌더링: 유수경/유수 → KCCHyerim, 流水 → Ma Shan Zheng, 나머지 → Pretendard
 const renderHeadline = (text: string) => {
   const hs = (data.profile as any)?.headlineStyle || {};
    const sizeMap: Record<string,string> = {
      xs:"0.75rem",sm:"0.875rem",base:"1rem",lg:"1.125rem",xl:"1.25rem",
      "2xl":"1.5rem","3xl":"1.875rem","4xl":"2.25rem","5xl":"3rem","6xl":"3.75rem"
    };
    const weightMap: Record<string,string> = {
      normal:"400",medium:"500",semibold:"600",bold:"700",black:"900"
    };
 const fontSize = hs.fontSize ? sizeMap[hs.fontSize] : undefined;
    const fontWeight = hs.fontWeight ? weightMap[hs.fontWeight] : undefined;
    const lineBreak = hs.lineBreak;
    const lines = text.split("\\n");
    return lines.map((line, li) => {
      const parts = line.split(/(유수경|유수|流水)/g);
      return (
        <span key={li}>
          {parts.map((part, i) => {
            if (part === "유수경" || part === "유수")
              return <span key={i} style={{ fontFamily: "'KCCHyerim', cursive", color: primary, ...(fontSize ? {fontSize} : {}) }}>{part}</span>;
            if (part === "流水")
              return <span key={i} style={{ fontFamily: "'Ma Shan Zheng', cursive", color: primary, ...(fontSize ? {fontSize} : {}) }}>{part}</span>;
            return <span key={i} style={{ fontFamily: "'Pretendard', sans-serif", ...(fontSize ? {fontSize} : {}), ...(fontWeight ? {fontWeight} : {}) }}>{part}</span>;
          })}
         {(li < lines.length - 1 || lineBreak) && <br />}
        </span>
      );
    });
  };

  const globalFontClass = D.globalFontSize === "sm" ? "text-sm" : D.globalFontSize === "lg" ? "text-lg" : "text-base";

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: D.bgColor }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: primary + "30", borderTopColor: primary }} />
        <p className="text-xs font-bold" style={{ color: primary }}>
          {DB_READY ? "클라우드에서 데이터 로딩 중..." : "로컬 데이터 로딩 중..."}
        </p>
      </div>
    </div>
  );

  return (
    <div
      className={`min-h-screen relative pb-12 overflow-x-hidden ${globalFontClass}`}
      style={{ background: D.bgColor, color: D.textColor, fontFamily: "'Pretendard', -apple-system, sans-serif" }}
    >
      {D.heroBgType === "gradient" && (
        <>
          <div className="cloud-blob cloud-blob-1" style={{ background: `radial-gradient(circle, ${primary}20 0%, transparent 70%)` }} />
          <div className="cloud-blob cloud-blob-2" style={{ background: `radial-gradient(circle, ${primary}12 0%, transparent 70%)` }} />
          <div className="cloud-blob cloud-blob-3" style={{ background: `radial-gradient(circle, ${primary}15 0%, transparent 70%)` }} />
        </>
      )}
      {D.heroBgType === "image" && D.heroBgValue && (
        <div className="fixed inset-0 z-0 pointer-events-none" style={{ backgroundImage: `url(${D.heroBgValue})`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.08 }} />
      )}

      <span className="fixed top-3 left-3 text-[10px] select-none hidden lg:block z-30 font-mono" style={{ color: primary + "99" }}>GRID REF: [YOO SUKYUNG v5.0]</span>
      <span className="fixed top-3 right-3 text-[10px] select-none hidden lg:block z-30 font-mono" style={{ color: primary + "99" }}>CONTENT DESIGNER & PERFORMANCE CREATIVE</span>

      {/* NAV */}
      <header
        className="sticky top-0 z-40 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(255,255,255,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          boxShadow: scrolled ? `0 1px 0 ${primary}20` : "none",
          borderBottom: scrolled ? `1px solid ${primary}15` : "none",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* 로고 — 어드민 트리거 없음 */}
          <a href="#about" className="flex items-center gap-2.5 group">
            <div>
              <div className="font-black text-sm tracking-tight leading-none" style={{ color: D.textColor }}>{data.profile.name} 포트폴리오</div>
              <div className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color: primary }}>{data.profile.title}</div>
            </div>
          </a>

          {/* 데스크탑 네비 */}
          <nav className="hidden lg:flex items-center gap-1 text-xs font-bold">
            {navItems.map(([href, id, label]) => {
              const isActive = activeSection !== null && activeSection === id;
              return (
                <a
                  key={href}
                  href={href}
                  className="py-1.5 px-3 rounded-full transition-all duration-200 font-bold"
                  style={{
                    background: isActive ? primary : "transparent",
                    color: isActive ? "#ffffff" : "#94a3b8",
                    fontWeight: isActive ? 800 : 600,
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = primary;
                      (e.currentTarget as HTMLElement).style.color = "#ffffff";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.color = "#94a3b8";
                    }
                  }}
                >{label}</a>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {DB_READY && syncStatus !== "idle" && (
              <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border transition-all"
                style={{
                  background: syncStatus==="saving" ? "#fef9c3" : syncStatus==="saved" ? "#dcfce7" : syncStatus==="error" ? "#fee2e2" : "#f1f5f9",
                  color:      syncStatus==="saving" ? "#854d0e" : syncStatus==="saved" ? "#166534" : syncStatus==="error" ? "#991b1b" : "#64748b",
                  borderColor:syncStatus==="saving" ? "#fde68a" : syncStatus==="saved" ? "#86efac" : syncStatus==="error" ? "#fca5a5" : "#e2e8f0",
                }}>
                {syncStatus==="saving" && <><span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"/>저장 중...</>}
                {syncStatus==="saved"  && <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>모든 기기 동기화 완료</>}
                {syncStatus==="error"  && <><span className="w-1.5 h-1.5 rounded-full bg-red-400"/>동기화 실패</>}
              </span>
            )}
            {!DB_READY && adminAllowed && (
              <span className="hidden lg:flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"/>Supabase 미연결 (로컬 전용)
              </span>
            )}
            {adminAllowed && (
              <button
                onClick={() => setAdminOpen(true)}
                className="py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border"
                style={{ background: primary + "15", borderColor: primary + "40", color: primary }}
              >
                <Settings className="w-3.5 h-3.5" /> 수정 [admin]
              </button>
            )}
            <a href="#contact" className="hidden md:inline-flex items-center py-1.5 px-4 rounded-lg text-xs font-black"
              style={{ background: D.btnPrimaryColor, color: D.btnPrimaryText }}>
              문의하기
            </a>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-1.5 border rounded text-sm" style={{ borderColor: primary + "40", color: primary }}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div initial={{ opacity:0,height:0 }} animate={{ opacity:1,height:"auto" }} exit={{ opacity:0,height:0 }}
              className="lg:hidden border-b p-4 shadow-lg" style={{ background: D.navBgColor, borderColor: primary + "20" }}>
              <nav className="flex flex-col gap-1">
                {navItems.map(([href, id, label]) => {
                  const isAct = activeSection === id;
                  return (
                    <a key={href} href={href} onClick={() => setMobileOpen(false)}
                      className="p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                      style={{ background: isAct ? primary+"18" : "transparent", color: isAct ? primary : D.textColor + "99" }}>
                      {isAct && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: primary }} />}
                      {label}
                    </a>
                  );
                })}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 스크롤 진행 표시바 */}
        <div className="h-0.5 w-full" style={{ background: primary + "15" }}>
          <motion.div className="h-full" style={{ background: primary }}
            animate={{ width: `${(navItems.findIndex(([,id]) => id === activeSection) + 1) / navItems.length * 100}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }} />
        </div>
      </header>

      {/* 섹션 렌더링 */}
      {sectionOrder.map(secId => {
        if (!isVisible(secId)) return null;
        const sec = data.sections?.[secId as keyof typeof data.sections];

        /* ABOUT */
        if (secId === "about") return (
          <section key="about" id="about" ref={aboutRef}
            className="pt-14 pb-20 lg:pt-20 lg:pb-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7 space-y-8 text-left">
                <div className="space-y-5 reveal">
                  <div className="badge" style={{ background: primary+"15", borderColor: primary+"30", color: primary }}>
                    <Sparkles className="w-3.5 h-3.5" />{sec?.badge || "01 | ABOUT"}
                  </div>
                  <div>
                    <div className="text-[11px] font-bold tracking-widest uppercase mb-2" style={{ color: primary }}>// PROFESSIONAL CREATIVE</div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight" style={{ color: D.textColor }}>
                      {renderHeadline(data.profile.headline)}
                    </h1>
                    <p className="text-sm font-bold mt-2" style={{ color: D.textColor + "88" }}>{data.profile.title}</p>
                  </div>
                  <div className="p-5 rounded-2xl border" style={{ background: D.cardBgColor, borderColor: primary + "20" }}>
                    <p className="text-sm font-light leading-relaxed" style={{ color: D.textColor + "cc" }}>
                      {data.profile.subHeadline?.split("\\n").map((line, i, arr) => (
                        <span key={i}>{line}{i < arr.length-1 && <br />}</span>
                      ))}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 reveal d1">
                  {data.stats.map(s => (
                    <div key={s.id} className="card p-3 text-center" style={{ background: D.cardBgColor }}>
                      <div className="text-xl font-black" style={{ color: primary }}>{s.value}</div>
                      <div className="text-[10px] font-light mt-0.5 leading-tight" style={{ color: D.textColor + "66" }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3 reveal d2">
                  <a href="#portfolio" className="py-3 px-6 text-sm rounded-xl flex items-center gap-2 font-black"
                    style={{ background: D.btnPrimaryColor, color: D.btnPrimaryText }}>
                    {D.btnPrimaryLabel} <ArrowRight className="w-4 h-4" />
                  </a>
                  <a href="#contact" className="py-3 px-6 text-sm rounded-xl font-semibold border"
                    style={{ background: D.btnSecondaryColor, color: primary, borderColor: primary + "30" }}>
                    {D.btnSecondaryLabel}
                  </a>
                </div>
              </div>

              {/* 프사 — 5번 연타 어드민 트리거 */}
              <div className="lg:col-span-5 flex justify-center lg:justify-end reveal d1">
                <div
                  className="relative w-full max-w-[300px] aspect-[4/5] rounded-3xl overflow-hidden group border shadow-lg"
                  style={{ background: primary + "10", borderColor: primary + "20", cursor: adminAllowed ? "pointer" : "default" }}
                  onClick={handlePhotoClick}
                >
                  {data.profile.idPhoto ? (
                    <img src={data.profile.idPhoto} alt={data.profile.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center" style={{ color: primary + "60" }}>
                      <User className="w-16 h-16 opacity-30 mb-2" />
                      <span className="text-xs font-bold" style={{ color: primary }}>사진을 업로드해 주세요</span>
                    </div>
                  )}
                  {/* 업로드 오버레이 — 어드민 로그인 시에만 */}
                  {adminLoggedIn && (
                    <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer">
                      <Camera className="w-6 h-6 mb-1.5 animate-bounce" />
                      <span className="text-xs font-bold">사진 업로드</span>
                      <input type="file" accept="image/*" className="hidden" onChange={e => {
                        const f = e.target.files?.[0]; if (!f) return;
                        const r = new FileReader(); r.onload = ev => saveData({ ...data, profile: { ...data.profile, idPhoto: ev.target?.result as string } });
                        r.readAsDataURL(f);
                      }} />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {data.strengths.map((s, i) => (
                <div key={s.id} className={`card p-5 text-left reveal d${Math.min(i+1,4)}`} style={{ background: D.cardBgColor }}>
                  <div className="text-xs font-black mb-0.5" style={{ color: primary }}>{s.title}</div>
                  <div className="text-[10px] mb-3" style={{ color: D.textColor + "66" }}>{s.subtitle}</div>
                  <ul className="space-y-1.5">
                    {s.points.map((pt, pi) => (
                      <li key={pi} className="flex gap-2 items-start text-xs font-light">
                        <span className="font-bold mt-0.5" style={{ color: primary }}>▪</span>
                        <span style={{ color: D.textColor + "cc" }}>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        );

        /* PROJECTS */
        if (secId === "projects") return (
          <section key="projects" id="projects" ref={projRef} className="py-20 relative z-10 border-t border-b"
            style={{ background: primary + "08", borderColor: primary + "15" }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="reveal mb-12">
                <div className="badge mb-3" style={{ background: primary+"15", borderColor: primary+"30", color: primary }}><Folder className="w-3.5 h-3.5" />{sec?.badge || "02 | CASE STUDY"}</div>
                <h2 className="text-2xl sm:text-4xl font-black tracking-tight" style={{ color: D.textColor }}>{renderText(sec?.title||"", sec?.titleStyle)}</h2>
                <p className="text-sm max-w-lg font-light mt-2 leading-relaxed" style={{ color: D.textColor + "88" }}>{renderText(sec?.subtitle||"", sec?.subtitleStyle)}</p>
              </div>
              <div className="space-y-8">
                {data.projects.map((proj, idx) => (
                  <div key={proj.id} className={`card p-6 sm:p-8 grid grid-cols-1 xl:grid-cols-12 gap-6 text-left reveal d${(idx%2)+1}`} style={{ background: D.cardBgColor }}>
                    <div className="xl:col-span-7 space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 font-bold rounded font-mono border" style={{ color: primary, background: primary+"15", borderColor: primary+"20" }}>{proj.category}</span>
                        <span className="text-[9px] font-mono" style={{ color: D.textColor + "44" }}>CASE 0{idx+1}</span>
                      </div>
                      <h3 className="text-xl font-black" style={{ color: D.textColor }}>{proj.title}</h3>
                      <p className="text-sm italic font-light" style={{ color: D.textColor + "88" }}>"{proj.tagline}"</p>
                      <div className="space-y-3 pt-3 border-t" style={{ borderColor: primary + "15" }}>
                        <div className="p-3.5 rounded-xl text-xs" style={{ background: "#fff1f2", border: "1px solid #fecdd3" }}>
                          <span className="font-bold text-[9px] text-rose-500 font-mono block mb-1">🚨 근본 문제점</span>
                          <p className="text-slate-700 font-light leading-relaxed">{proj.problem}</p>
                        </div>
                        <div className="p-3.5 rounded-xl text-xs border" style={{ background: primary+"08", borderColor: primary+"20" }}>
                          <span className="font-bold text-[9px] font-mono block mb-1" style={{ color: primary }}>⚙️ 개선 설계 & 솔루션</span>
                          <p className="font-light leading-relaxed" style={{ color: D.textColor + "aa" }}>{proj.strategy}</p>
                        </div>
                      </div>
                    </div>
                    <div className="xl:col-span-5 rounded-2xl p-5 flex flex-col gap-3 border" style={{ background: primary+"08", borderColor: primary+"15" }}>
                      <span className="text-[9px] font-black font-mono uppercase tracking-widest" style={{ color: primary }}>// 성과 결과</span>
                      {proj.results.map((r, ri) => (
                        <div key={ri} className="flex gap-2 items-start">
                          <span className="w-4 h-4 rounded text-[9px] flex items-center justify-center shrink-0 mt-0.5 font-bold" style={{ background: primary+"25", color: primary }}>✓</span>
                          <span className="text-xs font-light leading-relaxed" style={{ color: D.textColor + "cc" }}>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

        /* PROCESS */
        if (secId === "process") return (
          <section key="process" id="process" ref={procRef} className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="reveal mb-12">
              <div className="badge mb-3" style={{ background: primary+"15", borderColor: primary+"30", color: primary }}><Layers className="w-3.5 h-3.5" />{sec?.badge || "03 | WORKFLOW"}</div>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight" style={{ color: D.textColor }}>{renderText(sec?.title||"", sec?.titleStyle)}</h2>
              <p className="text-sm max-w-lg font-light mt-2" style={{ color: D.textColor + "88" }}>{renderText(sec?.subtitle||"", sec?.subtitleStyle)}</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-0">
              {data.processSteps.map((step, i) => (
                <div key={step.id} className={`process-step reveal d${(i%2)+1}`} style={{ borderLeftColor: primary }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black font-mono text-white px-2 py-0.5 rounded" style={{ background: primary }}>{step.phase}</span>
                    <h3 className="text-sm font-black" style={{ color: D.textColor }}>{step.title}</h3>
                  </div>
                  <p className="text-xs font-light leading-relaxed" style={{ color: D.textColor + "88" }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </section>
        );

        /* PORTFOLIO */
        if (secId === "portfolio") return (
          <section key="portfolio" id="portfolio" ref={portRef} className="py-20 relative z-10 border-t border-b"
            style={{ background: primary + "08", borderColor: primary + "15" }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 reveal">
                <div>
                  <div className="badge mb-3" style={{ background: primary+"15", borderColor: primary+"30", color: primary }}><Cloud className="w-3.5 h-3.5" />{sec?.badge || "04 | GALLERY"}</div>
                  <h2 className="text-2xl sm:text-4xl font-black tracking-tight" style={{ color: D.textColor }}>{renderText(sec?.title||"", sec?.titleStyle)}</h2>
                  <p className="text-sm max-w-2xl font-light mt-2 leading-relaxed" style={{ color: D.textColor + "88" }}>{renderText(sec?.subtitle||"", sec?.subtitleStyle)}</p>
                </div>
                {adminAllowed && (
                  <button onClick={() => setAdminOpen(true)} className="shrink-0 text-xs font-bold border px-3 py-2 rounded-xl cursor-pointer transition-colors"
                    style={{ color: primary, borderColor: primary+"30", background: primary+"10" }}>
                    📂 이미지 추가/편집
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-8">
                {allCats.map(cat => (
                  <button key={cat} onClick={() => setSelectedCat(cat)}
                    className="py-1.5 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer"
                    style={{
                      background: selectedCat===cat ? primary : "white",
                      color: selectedCat===cat ? "#fff" : D.textColor + "88",
                      borderColor: selectedCat===cat ? primary : primary + "20",
                    }}>
                    {cat==="all" ? "전체 (ALL)" : cat}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                {filtered.length === 0 ? (
                  <div className="py-16 text-center rounded-2xl border-2 border-dashed" style={{ borderColor: primary+"20" }}>
                    <p className="text-sm font-light" style={{ color: D.textColor + "44" }}>등록된 포트폴리오가 없습니다.</p>
                  </div>
                ) : filtered.map((work, i) => (
                  <div key={work.id}
                    className={`work-card relative bg-white border rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 reveal d${(i%3)+1}`}
                    style={{ borderColor: primary + "15", background: D.cardBgColor }}
                    onClick={() => setSelectedWork(work)}>
                    <div className="grid grid-cols-12 items-center">
                      <div className="col-span-3 sm:col-span-2 aspect-square sm:aspect-video overflow-hidden relative" style={{ background: primary + "10" }}>
                        <img src={normalizeImageUrl(work.imageUrl)} alt={work.title} referrerPolicy="no-referrer" className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.05]" />
                        {work.workType === "video" && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Play className="w-5 h-5 text-white fill-current" />
                          </div>
                        )}
                        <div className="work-overlay rounded-none"><Eye className="w-5 h-5 text-white" /></div>
                      </div>
                      <div className="col-span-9 sm:col-span-10 px-4 sm:px-6 py-4">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="text-[9px] font-black font-mono uppercase px-2 py-0.5 rounded border" style={{ color: primary, background: primary+"10", borderColor: primary+"20" }}>{work.category}</span>
                          {work.workType === "video" && <span className="text-[9px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded">VIDEO</span>}
                        </div>
                        <h3 className="text-sm sm:text-base font-black leading-snug mb-1" style={{ color: D.textColor }}>{work.title}</h3>
                        <p className="text-xs font-light leading-relaxed line-clamp-2 hidden sm:block" style={{ color: D.textColor + "88" }}>{work.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {selectedWork && (
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/85 backdrop-blur-sm"
                  onClick={() => setSelectedWork(null)}>
                  <motion.div initial={{ scale:0.95,y:16 }} animate={{ scale:1,y:0 }} exit={{ scale:0.95,y:16 }}
                    className="bg-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl"
                    onClick={e => e.stopPropagation()}>
                    <button onClick={() => setSelectedWork(null)} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-slate-100/80 flex items-center justify-center cursor-pointer"><X className="w-5 h-5 text-slate-600" /></button>
                    <div className="grid grid-cols-1 md:grid-cols-12">
                      <div className="md:col-span-8 bg-slate-50 flex items-center justify-center min-h-[300px] max-h-[70vh]">
                        {selectedWork.workType === "video" ? (
                          selectedWork.videoBase64 ? (
                            <video src={selectedWork.videoBase64} controls autoPlay className="w-full max-h-[70vh]" />
                          ) : selectedWork.videoUrl ? (
                            (() => { const em = getEmbed(selectedWork.videoUrl);
                              return em
                                ? <iframe src={em} title={selectedWork.title} className="w-full aspect-video" allow="autoplay; fullscreen" allowFullScreen />
                                : <video src={selectedWork.videoUrl} controls autoPlay className="w-full max-h-[70vh]" />;
                            })()
                          ) : null
                        ) : (
                          <img src={normalizeImageUrl(selectedWork.imageUrl)} alt={selectedWork.title} className="w-full h-full object-contain max-h-[70vh]" referrerPolicy="no-referrer" />
                        )}
                      </div>
                      <div className="md:col-span-4 p-6 flex flex-col justify-between min-h-[300px]">
                        <div className="space-y-3">
                          <span className="text-[9px] uppercase font-mono font-black px-2 py-0.5 rounded" style={{ color: primary, background: primary+"15" }}>{selectedWork.category}</span>
                          <h3 className="text-base font-black leading-snug" style={{ color: D.textColor }}>{selectedWork.title}</h3>
                          <p className="text-xs font-light leading-relaxed" style={{ color: D.textColor + "88" }}>{selectedWork.description}</p>
                          {selectedWork.links && selectedWork.links.length > 0 && (
                            <div className="pt-3 space-y-2 border-t" style={{ borderColor: primary + "20" }}>
                              <span className="text-[9px] font-black font-mono uppercase tracking-wider block" style={{ color: primary }}>// 링크</span>
                              {selectedWork.links.map((lnk, li) => (
                                <a key={li} href={lnk.url} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border w-full transition-all hover:scale-[1.02]"
                                  style={{ background: primary+"10", borderColor: primary+"30", color: primary }}>
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{lnk.label || lnk.type}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="text-[9px] font-mono uppercase tracking-wider pt-6 border-t text-center" style={{ color: primary + "66", borderColor: primary + "20" }}>YOO SU-KYUNG CREATIVE PORTFOLIO</p>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        );

        /* SKILLS */
        if (secId === "skills") return (
          <section key="skills" id="skills" ref={skillRef} className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="reveal mb-12">
              <div className="badge mb-3" style={{ background: primary+"15", borderColor: primary+"30", color: primary }}><Settings className="w-3.5 h-3.5" />{sec?.badge || "05 | SKILLS"}</div>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight" style={{ color: D.textColor }}>{renderText(sec?.title||"", sec?.titleStyle)}</h2>
              <p className="text-sm max-w-lg font-light mt-2" style={{ color: D.textColor + "88" }}>{renderText(sec?.subtitle||"", sec?.subtitleStyle)}</p>
            </div>
            <div className="card p-6 reveal" style={{ background: D.cardBgColor }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.skills.map(sk => (
                  <div key={sk.id} className="skill-row" style={{ background: primary+"08", borderColor: primary+"15" }}>
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden border" style={{ borderColor: primary+"15" }}>
                      <SkillIcon name={sk.name} size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black truncate" style={{ color: D.textColor }}>{sk.name}</span>
                        <div className="flex gap-0.5 shrink-0 ml-2">
                          {[1,2,3,4,5].map(n => <Star key={n} className={`w-2.5 h-2.5 ${n<=sk.rating?"fill-current":"opacity-20"}`} style={{ color: n<=sk.rating ? "#f59e0b" : D.textColor }} />)}
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: primary+"20" }}>
                        <div className="h-full rounded-full" style={{ width:`${(sk.rating/5)*100}%`, background: `linear-gradient(90deg, ${primary}, ${primary}cc)` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 card p-8 text-left reveal" style={{ background: D.cardBgColor }}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div>
                  <div className="badge mb-3" style={{ background: primary+"15", borderColor: primary+"30", color: primary }}><ThumbsUp className="w-3.5 h-3.5" />Why Me?</div>
                  <h3 className="text-xl font-black mt-3 leading-tight" style={{ color: D.textColor }}>{data.whyMe.title}</h3>
                  <p className="text-xs font-light mt-2 leading-relaxed" style={{ color: D.textColor + "88" }}>{data.whyMe.description}</p>
                </div>
                <div className="lg:col-span-2 space-y-3">
                  {data.whyMe.points.map((pt, i) => (
                    <div key={i} className="flex gap-3 p-3.5 rounded-xl border" style={{ background: primary+"08", borderColor: primary+"15" }}>
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: primary }} />
                      <span className="text-xs font-light leading-relaxed" style={{ color: D.textColor + "cc" }}>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );

        /* CAREER */
        if (secId === "career") return (
          <section key="career" id="career" ref={careerRef} className="py-20 relative z-10 border-t border-b"
            style={{ background: primary + "08", borderColor: primary + "15" }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="reveal mb-12">
                <div className="badge mb-3" style={{ background: primary+"15", borderColor: primary+"30", color: primary }}><Calendar className="w-3.5 h-3.5" />{sec?.badge || "06 | CAREER"}</div>
                <h2 className="text-2xl sm:text-4xl font-black tracking-tight" style={{ color: D.textColor }}>{renderText(sec?.title||"", sec?.titleStyle)}</h2>
                <p className="text-sm max-w-lg font-light mt-2" style={{ color: D.textColor + "88" }}>{renderText(sec?.subtitle||"", sec?.subtitleStyle)}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {data.careers.map((car, i) => (
                  <div key={car.id} className={`card p-6 sm:p-8 text-left reveal d${(i%2)+1} group`} style={{ background: D.cardBgColor }}>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black font-mono border" style={{ color: primary, background: primary+"12", borderColor: primary+"20" }}>{car.period}</span>
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border" style={{ color: primary, background: primary+"12", borderColor: primary+"20" }}>{car.role}</span>
                    </div>
                    <h3 className="text-lg font-black mb-4" style={{ color: D.textColor }}>{car.company}</h3>
                    <div className="space-y-2 pt-4 border-t" style={{ borderColor: primary + "15" }}>
                      {car.details.map((d, di) => (
                        <div key={di} className="flex gap-2 items-start text-xs font-light leading-relaxed">
                          <span className="font-bold mt-0.5" style={{ color: primary }}>▪</span>
                          <span style={{ color: D.textColor + "cc" }}>{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

        /* CONTACT */
        if (secId === "contact") return (
          <section key="contact" id="contact" ref={contactRef} className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="reveal mb-12">
              <div className="badge mb-3" style={{ background: primary+"15", borderColor: primary+"30", color: primary }}><Send className="w-3.5 h-3.5" />{sec?.badge || "07 | CONTACT"}</div>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight" style={{ color: D.textColor }}>{renderText(sec?.title||"", sec?.titleStyle)}</h2>
              <p className="text-sm max-w-lg font-light mt-2 leading-relaxed" style={{ color: D.textColor + "88" }}>{renderText(sec?.subtitle||"", sec?.subtitleStyle)}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="card p-6 sm:p-8 flex flex-col gap-5 text-left reveal d1" style={{ background: D.cardBgColor }}>
                <div>
                  <div className="badge mb-2" style={{ background: primary+"15", borderColor: primary+"30", color: primary }}>이메일</div>
                  <h3 className="text-lg font-black mt-2" style={{ color: D.textColor }}>서류 검토 & 채용 제안</h3>
                  <p className="text-xs font-light mt-1 leading-relaxed" style={{ color: D.textColor + "88" }}>채용 면접 일정이나 서류 심사 결과 등 공식 피드백 안내처입니다.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t" style={{ borderColor: primary+"15" }}>
                  <div>
                    <span className="text-[9px] uppercase font-mono font-black block mb-1" style={{ color: primary }}>NAVER EMAIL</span>
                    <span className="text-sm font-black font-mono" style={{ color: D.textColor }}>{data.contact.email}</span>
                  </div>
                  <button onClick={copyEmail} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black w-full sm:w-auto justify-center"
                    style={{ background: D.btnPrimaryColor, color: D.btnPrimaryText }}>
                    <Copy className="w-3.5 h-3.5" />{copied ? "복사 완료!" : "이메일 복사"}
                  </button>
                </div>
              </div>
              <div className="card p-6 sm:p-8 flex flex-col gap-5 text-left reveal d2" style={{ background: D.cardBgColor }}>
                <div>
                  <div className="badge mb-2" style={{ background: primary+"15", borderColor: primary+"30", color: primary }}>핸드폰</div>
                  <h3 className="text-lg font-black mt-2" style={{ color: D.textColor }}>다이렉트 직접 연락</h3>
                  <p className="text-xs font-light mt-1 leading-relaxed" style={{ color: D.textColor + "88" }}>신속한 면접 소집 연락이나 긴급 연락이 가능한 직접 연락처입니다.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t" style={{ borderColor: primary+"15" }}>
                  <div>
                    <span className="text-[9px] uppercase font-mono font-black block mb-1" style={{ color: primary }}>PHONE</span>
                    <span className="text-sm font-black font-mono" style={{ color: D.textColor }}>{data.contact.phone||"010-0000-0000"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border"
                    style={{ background: primary+"12", borderColor: primary+"25", color: primary }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />상시 연락 가능
                  </div>
                </div>
              </div>
            </div>
          </section>
        );

        return null;
      })}

      <footer className="py-6 text-center text-xs font-mono border-t max-w-7xl mx-auto px-4 select-none" style={{ borderColor: primary+"15", color: D.textColor + "44" }}>
        <p>© 2026 유수경 Yoo Su-kyung · Content Designer & Performance Creative</p>
        <p className="text-[10px] mt-1 font-bold uppercase" style={{ color: primary + "88" }}>{data.contact.email}</p>
      </footer>

      <AnimatePresence>
        {adminAllowed && adminOpen && (
          <AdminPanel
            data={data}
            onSave={saveData}
            onClose={() => setAdminOpen(false)}
            onLogin={() => {
              setAdminLoggedIn(true);
              sessionStorage.setItem("ysk_admin_auth", "true");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
