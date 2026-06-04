import { useState, FormEvent } from "react";
import {
  Lock, Save, RotateCcw, X, Plus, Trash2, Star, Settings,
  Type, Palette, Eye, EyeOff, GripVertical, Film, Link2,
  Wand2, Upload, CheckCircle2, Monitor, Smartphone
} from "lucide-react";
import { motion } from "motion/react";
import { PortfolioData, SectionHeaders, DesignSettings } from "../types";
import { initialPortfolioData } from "./data";

// ── 이미지 압축 ──
const compress = (file: File, mW: number, mH: number, cb: (b: string) => void) => {
  const r = new FileReader();
  r.onload = e => {
    const raw = e.target?.result as string;
    if (file.type === "image/gif" || file.type === "image/svg+xml") { cb(raw); return; }
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > h) { if (w > mW) { h = Math.round(h*mW/w); w = mW; } }
      else { if (h > mH) { w = Math.round(w*mH/h); h = mH; } }
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      if (ctx) { ctx.drawImage(img,0,0,w,h); cb(c.toDataURL("image/jpeg", 0.75)); } else cb(raw);
    };
    img.src = raw;
  };
  r.readAsDataURL(file);
};

// ── Google Drive URL 정규화 ──
function normalizeImageUrl(url: string): string {
  if (!url) return url;
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w800`;
  const driveMatch2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (url.includes("drive.google.com") && driveMatch2) return `https://drive.google.com/thumbnail?id=${driveMatch2[1]}&sz=w800`;
  return url;
}

// ── URL 플랫폼 감지 ──
function detectPlatform(url: string): string {
  if (!url) return "";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "YouTube";
  if (url.includes("drive.google.com")) return "Google Drive";
  if (url.includes("cloudinary.com")) return "Cloudinary";
  if (url.includes("instagram.com")) return "Instagram";
  if (url.includes("vimeo.com")) return "Vimeo";
  if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i)) return "이미지 URL";
  if (url.match(/\.(mp4|mov|webm|avi)(\?|$)/i)) return "영상 URL";
  return "외부 링크";
}

// ── 줄바꿈 텍스트 → \n 이스케이프 변환 ──
const toStored = (v: string) => v.replace(/\n/g, "\\n");
const fromStored = (v: string) => (v || "").replace(/\\n/g, "\n");

const DEFAULT_DESIGN: DesignSettings = {
  primaryColor: "#0ea5e9", bgColor: "#ffffff", textColor: "#0f172a",
  cardBgColor: "#ffffff", navBgColor: "#ffffff",
  btnPrimaryColor: "#0ea5e9", btnPrimaryText: "#ffffff", btnPrimaryLabel: "포트폴리오",
  btnSecondaryColor: "#f0f9ff", btnSecondaryLabel: "연락망",
  heroBgType: "gradient", heroBgValue: "#e0f2fe",
  sectionOrder: ["about","projects","process","portfolio","skills","career","contact"],
  globalFontSize: "base",
};

const SECTION_LABELS: Record<string, string> = {
  about: "01 소개", projects: "02 프로젝트", process: "03 워크플로우",
  portfolio: "04 갤러리", skills: "05 역량/툴", career: "06 경력", contact: "07 연락"
};

const KNOWN_CATEGORIES = ["에고랩스", "스튜디오 피엘", "청년철거", "모빌리티커넥트", "채인컴퍼니"];

const URL_GUIDE = [
  { icon: "🖼️", name: "Google Drive 이미지", hint: "파일 → '링크 복사' → 붙여넣기", example: "https://drive.google.com/file/d/ABC123/view" },
  { icon: "▶️", name: "YouTube 영상", hint: "공유 → 링크 복사", example: "https://youtu.be/xxxxxxxxxxx" },
  { icon: "☁️", name: "Cloudinary", hint: "Media Library → URL 복사", example: "https://res.cloudinary.com/.../image.jpg" },
  { icon: "🌐", name: "직접 URL", hint: ".jpg .png .webp 등 직접 링크", example: "https://example.com/image.jpg" },
];

interface Props { data: PortfolioData; onSave: (d: PortfolioData) => void; onClose: () => void; onLogin?: () => void; }
type Tab = "design"|"sections"|"profile"|"stats"|"strengths"|"projects"|"process"|"skills"|"career"|"whyme"|"contact"|"portfolio"|"bulk"|"tools";

// ══ 텍스트 스타일 컨트롤 ══
function TextStyleControls({ label, value, onChange }: {
  label: string;
  value?: { fontSize?: string; fontWeight?: string; lineBreak?: boolean };
  onChange: (v: any) => void;
}) {
  const v = value || {};
  const inp = "w-full p-1.5 bg-white border border-slate-200 rounded text-xs focus:border-sky-400 focus:outline-none cursor-pointer";
  return (
    <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 space-y-2 mt-1">
      <p className="text-[9px] text-sky-600 font-black uppercase tracking-wider">{label} 스타일</p>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-[9px] text-slate-400 mb-0.5 font-bold uppercase">크기</label>
          <select className={inp} value={v.fontSize||""} onChange={e=>onChange({...v,fontSize:e.target.value||undefined})}>
            <option value="">기본</option>
            <option value="xs">극소(xs)</option>
            <option value="sm">소(sm)</option>
            <option value="base">중(base)</option>
            <option value="lg">대(lg)</option>
            <option value="xl">특대(xl)</option>
            <option value="2xl">2xl</option>
            <option value="3xl">3xl</option>
            <option value="4xl">4xl</option>
            <option value="5xl">5xl</option>
            <option value="6xl">6xl</option>
          </select>
        </div>
        <div>
          <label className="block text-[9px] text-slate-400 mb-0.5 font-bold uppercase">굵기</label>
          <select className={inp} value={v.fontWeight||""} onChange={e=>onChange({...v,fontWeight:e.target.value||undefined})}>
            <option value="">기본</option>
            <option value="normal">얇게</option>
            <option value="medium">보통</option>
            <option value="semibold">약간굵게</option>
            <option value="bold">굵게</option>
            <option value="black">매우굵게</option>
          </select>
        </div>
        <div className="flex flex-col justify-end pb-1">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={!!v.lineBreak} onChange={e=>onChange({...v,lineBreak:e.target.checked})} className="w-3.5 h-3.5 accent-sky-500" />
            <span className="text-[10px] text-slate-600 font-bold">줄바꿈</span>
          </label>
        </div>
      </div>
    </div>
  );
}

// ══ 일괄 URL 입력 탭 ══
function BulkUrlTab({ draft, setDraft }: { draft: PortfolioData; setDraft: (d: PortfolioData) => void; }) {
  const [rows, setRows] = useState<{ id: string; url: string; thumbUrl: string; title: string; category: string; workType: "image"|"video"; desc: string; }[]>([
    { id: `r-${Date.now()}`, url: "", thumbUrl: "", title: "", category: KNOWN_CATEGORIES[0], workType: "image", desc: "" }
  ]);
  const [done, setDone] = useState(false);
  const [globalCat, setGlobalCat] = useState("");

  const addRow = () => setRows(prev => [...prev, { id: `r-${Date.now()}-${Math.random()}`, url: "", thumbUrl: "", title: "", category: KNOWN_CATEGORIES[0], workType: "image", desc: "" }]);
  const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id));
  const updateRow = (id: string, changes: Partial<typeof rows[0]>) => setRows(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r));

  const handleUrlChange = (id: string, url: string) => {
    const isVideo = url.includes("youtube.com") || url.includes("youtu.be") || url.includes("vimeo.com") || !!url.match(/\.(mp4|mov|webm)(\?|$)/i);
    updateRow(id, { url, workType: isVideo ? "video" : "image" });
  };

  const handlePasteMultiple = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData("text");
    const urls = text.split(/\n/).map(l => l.trim()).filter(Boolean);
    if (urls.length > 1) {
      e.preventDefault();
      const newRows = urls.map(url => ({
        id: `r-${Date.now()}-${Math.random()}`,
        url, thumbUrl: "",
        title: url.split("/").pop()?.replace(/[?#].*$/, "").replace(/\.[^.]+$/, "") || "작품",
        category: KNOWN_CATEGORIES[0],
        workType: (url.includes("youtube.com") || url.includes("youtu.be") || !!url.match(/\.(mp4|mov)$/i)) ? "video" as const : "image" as const,
        desc: "",
      }));
      setRows(prev => [...prev.filter(r => r.url), ...newRows]);
    }
  };

  const applyGlobalCat = () => { if (globalCat) setRows(prev => prev.map(r => ({ ...r, category: globalCat }))); };

  const addAll = () => {
    const valid = rows.filter(r => r.url.trim());
    if (!valid.length) return;
    const newWorks = valid.map(r => ({
      id: r.id,
      title: r.title || "작품",
      category: r.category,
      description: r.desc || `${r.category} 포트폴리오`,
      imageUrl: r.workType === "image" ? normalizeImageUrl(r.url) : normalizeImageUrl(r.thumbUrl),
      workType: r.workType,
      videoUrl: r.workType === "video" ? r.url : undefined,
    }));
    setDraft({ ...draft, portfolioWorks: [...(draft.portfolioWorks || []), ...newWorks] });
    setDone(true);
  };

  const inp = "w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-sky-400 focus:outline-none";
  const lbl = "block text-[9px] text-slate-400 mb-0.5 uppercase tracking-wider font-bold";

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-2 border-b border-sky-100 pb-2">
        <Link2 className="w-4 h-4 text-sky-500" />
        <h3 className="text-sky-600 font-black text-sm">URL 링크로 일괄 추가</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {URL_GUIDE.map(g => (
          <div key={g.name} className="bg-sky-50 border border-sky-100 rounded-xl p-3 space-y-1">
            <p className="text-xs font-black text-slate-700">{g.icon} {g.name}</p>
            <p className="text-[10px] text-slate-500">{g.hint}</p>
            <p className="text-[9px] text-slate-400 font-mono truncate">{g.example}</p>
          </div>
        ))}
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
        <p className="text-xs font-black text-amber-700 mb-1">⚡ 여러 URL 한번에 붙여넣기</p>
        <p className="text-[10px] text-amber-600">URL들을 줄바꿈으로 구분해서 첫 번째 칸에 붙여넣으면 자동으로 여러 행 생성</p>
      </div>
      <div className="flex gap-2 items-center bg-slate-50 border border-sky-100 rounded-xl p-3">
        <Wand2 className="w-4 h-4 text-sky-500 shrink-0" />
        <span className="text-xs font-bold text-slate-700 shrink-0">전체 카테고리:</span>
        <select className={inp + " flex-1"} value={globalCat} onChange={e => setGlobalCat(e.target.value)}>
          <option value="">선택...</option>
          {KNOWN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={applyGlobalCat} className="shrink-0 px-3 py-1.5 bg-sky-500 text-white text-xs font-black rounded-lg">적용</button>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-slate-600">총 {rows.length}개</span>
          <button onClick={addRow} className="flex items-center gap-1 px-3 py-1.5 bg-sky-50 text-sky-600 text-xs rounded-lg border border-sky-200 font-bold"><Plus className="w-3 h-3" />행 추가</button>
        </div>
        {rows.map((row, idx) => (
          <div key={row.id} className="bg-white border border-sky-100 rounded-xl p-3 space-y-2">
            <div className="grid gap-2 items-start" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 28px" }}>
              <div>
                <label className={lbl}>URL</label>
                <textarea rows={2} className={inp + " resize-none"} placeholder="https://drive.google.com/... 또는 https://youtu.be/..."
                  value={row.url} onChange={e => handleUrlChange(row.id, e.target.value)}
                  onPaste={idx === 0 ? handlePasteMultiple : undefined} />
                {row.url && <span className="text-[9px] mt-0.5 block font-bold text-sky-500">🔗 {detectPlatform(row.url)}</span>}
              </div>
              <div><label className={lbl}>제목</label><input className={inp} placeholder="작품 제목" value={row.title} onChange={e => updateRow(row.id, { title: e.target.value })} /></div>
              <div><label className={lbl}>카테고리</label>
                <select className={inp} value={row.category} onChange={e => updateRow(row.id, { category: e.target.value })}>
                  {KNOWN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="기타">기타</option>
                </select>
              </div>
              <div><label className={lbl}>타입</label>
                <select className={inp} value={row.workType} onChange={e => updateRow(row.id, { workType: e.target.value as "image"|"video" })}>
                  <option value="image">🖼️ 이미지</option>
                  <option value="video">▶️ 영상</option>
                </select>
              </div>
              <button onClick={() => removeRow(row.id)} className="mt-4 text-slate-300 hover:text-red-400"><X className="w-4 h-4" /></button>
            </div>
            {row.workType === "video" && (
              <div><label className={lbl}>썸네일 이미지 URL (선택)</label>
                <input className={inp} placeholder="https://..." value={row.thumbUrl} onChange={e => updateRow(row.id, { thumbUrl: e.target.value })} />
              </div>
            )}
            <div><label className={lbl}>설명 (선택)</label>
              <input className={inp} placeholder="간단한 설명..." value={row.desc} onChange={e => updateRow(row.id, { desc: e.target.value })} />
            </div>
          </div>
        ))}
      </div>
      {!done ? (
        <button onClick={addAll} className="w-full py-3 rounded-xl font-black text-white text-sm hover:opacity-90" style={{ background: "#0ea5e9" }}>
          ✨ {rows.filter(r => r.url.trim()).length}개 포트폴리오에 추가하기
        </button>
      ) : (
        <div className="text-center space-y-3 py-4">
          <div className="flex items-center justify-center gap-2 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" /><p className="font-black text-sm">추가 완료! 저장 버튼을 눌러 반영하세요.</p>
          </div>
          <button onClick={() => { setRows([{ id: `r-${Date.now()}`, url: "", thumbUrl: "", title: "", category: KNOWN_CATEGORIES[0], workType: "image", desc: "" }]); setDone(false); }}
            className="px-4 py-2 bg-sky-50 border border-sky-200 text-sky-600 rounded-xl text-xs font-bold">+ 더 추가하기</button>
        </div>
      )}
    </div>
  );
}

// ══ 디자인 미리보기 패널 ══
function DesignPreview({ D }: { D: DesignSettings & { primaryColor: string } }) {
  const p = D.primaryColor;
  return (
    <div className="sticky top-0 w-72 shrink-0 border-l border-sky-100 bg-slate-50 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-sky-100">
        <Monitor className="w-3.5 h-3.5 text-sky-500" />
        <span className="text-[10px] font-black text-sky-600 uppercase tracking-wider">실시간 미리보기</span>
      </div>

      {/* 네비바 미리보기 */}
      <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
        <div className="h-8 flex items-center px-3 gap-2" style={{ background: D.navBgColor || "#fff" }}>
          <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[8px] font-black" style={{ background: p }}>유</div>
          <div className="flex gap-1.5 flex-1">
            {["소개","프로젝트","스킬"].map((t,i) => (
              <span key={t} className="text-[7px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: i===0 ? p : "transparent", color: i===0 ? "#fff" : D.textColor+"99" }}>{t}</span>
            ))}
          </div>
          <span className="text-[7px] px-2 py-0.5 rounded font-black text-white" style={{ background: D.btnPrimaryColor }}>{D.btnPrimaryLabel||"버튼"}</span>
        </div>
        {/* 진행바 */}
        <div className="h-0.5 w-full" style={{ background: p+"20" }}>
          <div className="h-full w-1/3 rounded-full" style={{ background: p }} />
        </div>
      </div>

      {/* 히어로 섹션 미리보기 */}
      <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
        <div className="p-3 space-y-2" style={{ background: D.bgColor }}>
          <div className="text-[8px] font-black px-1.5 py-0.5 rounded-full w-fit border" style={{ color: p, background: p+"15", borderColor: p+"30" }}>01 | ABOUT</div>
          <div className="text-[11px] font-black leading-tight" style={{ color: D.textColor }}>콘텐츠 크리에이터<br/><span style={{ color: p }}>유수경</span></div>
          <div className="flex gap-1.5">
            <span className="text-[8px] px-2 py-1 rounded font-black text-white" style={{ background: D.btnPrimaryColor }}>{D.btnPrimaryLabel||"포트폴리오"}</span>
            <span className="text-[8px] px-2 py-1 rounded font-semibold border" style={{ background: D.btnSecondaryColor, color: p, borderColor: p+"30" }}>{D.btnSecondaryLabel||"연락망"}</span>
          </div>
        </div>
      </div>

      {/* 카드 미리보기 */}
      <div className="rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3 space-y-2" style={{ background: D.cardBgColor }}>
          <div className="text-[9px] font-black" style={{ color: D.textColor }}>스킬 카드 미리보기</div>
          {["Figma", "After Effects", "Premiere Pro"].map(s => (
            <div key={s} className="flex items-center gap-2 p-1.5 rounded-lg" style={{ background: p+"10", border: `1px solid ${p}20` }}>
              <div className="w-5 h-5 rounded bg-white flex items-center justify-center text-[7px] font-black border" style={{ color: p, borderColor: p+"20" }}>A</div>
              <span className="text-[8px] font-bold flex-1" style={{ color: D.textColor }}>{s}</span>
              <div className="h-1 w-10 rounded-full overflow-hidden" style={{ background: p+"20" }}>
                <div className="h-full rounded-full w-4/5" style={{ background: p }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 색상 팔레트 */}
      <div className="space-y-1.5">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">현재 색상</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            [D.primaryColor,"포인트"],
            [D.bgColor,"배경"],
            [D.textColor,"텍스트"],
            [D.cardBgColor,"카드"],
            [D.btnPrimaryColor,"버튼"],
          ].map(([color, name]) => (
            <div key={name} className="flex items-center gap-1">
              <div className="w-4 h-4 rounded border border-slate-200 shadow-sm" style={{ background: color }} />
              <span className="text-[8px] text-slate-500">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminPanel({ data, onSave, onClose, onLogin }: Props) {
  const [pw, setPw] = useState(""); const [auth, setAuth] = useState(false); const [err, setErr] = useState("");
  const [tab, setTab] = useState<Tab>("bulk");
  const [draft, setDraft] = useState<PortfolioData>(() => JSON.parse(JSON.stringify(data)));
  const [showPreview, setShowPreview] = useState(false);

  const login = (e: FormEvent) => {
    e.preventDefault();
    if (pw === "0119") { setAuth(true); setErr(""); onLogin?.(); }
    else setErr("비밀번호 오류");
  };

  const save = () => { onSave(draft); onClose(); };
  const reset = () => { if(confirm("초기화할까요?")) setDraft(JSON.parse(JSON.stringify(initialPortfolioData))); };

  const D = { ...DEFAULT_DESIGN, ...(draft.design||{}) };
  const upDesign = (k: keyof DesignSettings, v: any) => setDraft({ ...draft, design: { ...D, [k]: v } });

  const inp = "w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:border-sky-400 focus:outline-none";
  const lbl = "block text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-bold";

  // 섹션 업데이트 헬퍼
  const upSection = (sec: keyof SectionHeaders, key: string, val: any) => {
    const d = JSON.parse(JSON.stringify(draft));
    if (!d.sections) d.sections = JSON.parse(JSON.stringify(initialPortfolioData.sections));
    d.sections[sec][key] = val;
    setDraft(d);
  };

  const tabs: {id:Tab;label:string}[] = [
    {id:"bulk",label:"🔗 URL로 추가"},
    {id:"portfolio",label:"📂 포트폴리오"},
    {id:"design",label:"🎨 디자인"},
    {id:"sections",label:"📝 섹션 텍스트"},
    {id:"profile",label:"👤 프로필"},
    {id:"stats",label:"📊 통계"},
    {id:"strengths",label:"💪 강점"},
    {id:"projects",label:"📁 케이스"},
    {id:"process",label:"⚙️ 프로세스"},
    {id:"skills",label:"🛠️ 스킬"},
    {id:"career",label:"🏢 경력"},
    {id:"whyme",label:"✨ Why Me"},
    {id:"contact",label:"📞 연락처"},
    {id:"tools",label:"🔧 도구"},
  ];

  if (!auth) return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur flex items-center justify-center p-4">
      <div className="bg-white border border-sky-100 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-2 mb-6"><Lock className="w-4 h-4 text-sky-500"/><h2 className="text-slate-800 font-black text-lg">관리자 로그인</h2></div>
        <form onSubmit={login} className="space-y-4">
          <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="비밀번호 입력" className={inp}/>
          {err && <p className="text-red-500 text-xs">{err}</p>}
          <button type="submit" className="w-full py-2.5 text-sm rounded-xl font-black text-white" style={{background:"#0ea5e9"}}>확인</button>
        </form>
        <button onClick={onClose} className="mt-3 w-full text-slate-400 text-xs hover:text-slate-600">취소</button>
      </div>
    </motion.div>
  );

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-[100] bg-white flex flex-col">

      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-sky-100 bg-white shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-sky-500"/>
          <span className="text-slate-800 font-black text-sm">포트폴리오 편집</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${showPreview ? "bg-sky-500 text-white border-sky-600" : "bg-sky-50 border-sky-200 text-sky-600"}`}>
            <Monitor className="w-3 h-3"/>미리보기 {showPreview ? "ON" : "OFF"}
          </button>
          <button onClick={reset} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-600 rounded-lg text-xs hover:bg-orange-100">
            <RotateCcw className="w-3 h-3"/>초기화
          </button>
          <button onClick={save} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-black text-white" style={{background:"#0ea5e9"}}>
            <Save className="w-3 h-3"/>저장
          </button>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center bg-slate-100 rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-500">
            <X className="w-4 h-4"/>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 사이드바 */}
        <nav className="w-36 shrink-0 border-r border-sky-100 bg-slate-50 overflow-y-auto">
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`w-full text-left px-3 py-2.5 text-xs font-bold transition-all ${tab===t.id?"bg-sky-500 text-white":"text-slate-500 hover:text-slate-800 hover:bg-white"}`}>
              {t.label}
            </button>
          ))}
        </nav>

        {/* 메인 */}
        <main className="flex-1 overflow-y-auto p-6 bg-white">

          {/* ══ URL로 일괄 추가 ══ */}
          {tab==="bulk" && <BulkUrlTab draft={draft} setDraft={setDraft} />}

          {/* ══ 포트폴리오 ══ */}
          {tab==="portfolio" && (
            <div className="space-y-5 max-w-2xl">
              <div className="flex justify-between items-center border-b border-sky-100 pb-2">
                <h3 className="text-sky-600 font-black text-sm">포트폴리오 작품</h3>
                <button onClick={()=>setDraft({...draft,portfolioWorks:[...(draft.portfolioWorks||[]),{id:`w-${Date.now()}`,title:"새 작품",category:KNOWN_CATEGORIES[0],description:"",imageUrl:"",workType:"image"}]})}
                  className="flex items-center gap-1 px-3 py-1.5 bg-sky-50 text-sky-600 text-xs rounded-lg border border-sky-200 font-bold"><Plus className="w-3 h-3"/>추가</button>
              </div>
              <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 text-xs text-slate-600">
                <p className="font-black text-sky-700 mb-1">💡 URL 입력 가이드</p>
                <p>· Google Drive: 파일 우클릭 → 공유 → 링크 복사</p>
                <p>· YouTube: 공유 버튼 → 링크 복사</p>
              </div>
              {(draft.portfolioWorks||[]).map((w,i)=>(
                <div key={w.id} className="bg-slate-50 border border-sky-100 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sky-500 text-xs font-black">작품 {i+1}</span>
                    <button onClick={()=>setDraft({...draft,portfolioWorks:(draft.portfolioWorks||[]).filter((_,idx)=>idx!==i)})} className="text-red-400"><Trash2 className="w-3.5 h-3.5"/></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2"><label className={lbl}>제목</label><input className={inp} value={w.title} onChange={e=>{const a=[...(draft.portfolioWorks||[])];a[i]={...a[i],title:e.target.value};setDraft({...draft,portfolioWorks:a});}}/></div>
                    <div><label className={lbl}>카테고리</label>
                      <select className={inp+" text-xs cursor-pointer"} value={w.category} onChange={e=>{const a=[...(draft.portfolioWorks||[])];a[i]={...a[i],category:e.target.value};setDraft({...draft,portfolioWorks:a});}}>
                        {KNOWN_CATEGORIES.map(c=><option key={c}>{c}</option>)}
                        <option value="기타">기타</option>
                      </select>
                    </div>
                    <div><label className={lbl}>타입</label>
                      <select className={inp+" cursor-pointer text-xs"} value={w.workType||"image"} onChange={e=>{const a=[...(draft.portfolioWorks||[])];a[i]={...a[i],workType:e.target.value as any,videoUrl:undefined};setDraft({...draft,portfolioWorks:a});}}>
                        <option value="image">🖼️ 이미지</option><option value="video">▶️ 영상</option>
                      </select>
                    </div>
                    <div className="col-span-2"><label className={lbl}>설명</label><textarea rows={2} className={inp+" resize-none"} value={w.description} onChange={e=>{const a=[...(draft.portfolioWorks||[])];a[i]={...a[i],description:e.target.value};setDraft({...draft,portfolioWorks:a});}}/></div>
                  </div>
                  {w.workType!=="video" && (
                    <div>
                      <label className={lbl}>🔗 이미지 URL</label>
                      <input type="text" className={inp} placeholder="https://drive.google.com/file/d/.../view" value={w.imageUrl}
                        onChange={e=>{const a=[...(draft.portfolioWorks||[])];a[i]={...a[i],imageUrl:normalizeImageUrl(e.target.value)};setDraft({...draft,portfolioWorks:a});}}/>
                      {w.imageUrl && (
                        <div className="mt-2 flex items-center gap-2">
                          <img src={w.imageUrl} className="w-20 h-14 rounded-lg object-cover border border-sky-200" alt="prev" onError={e=>(e.currentTarget.style.display="none")}/>
                          <span className="text-[10px] text-sky-600 font-bold">{detectPlatform(w.imageUrl)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {w.workType==="video" && (
                    <div className="space-y-2">
                      <div>
                        <label className={lbl}>▶️ 영상 URL</label>
                        <input type="text" className={inp} placeholder="https://youtu.be/xxx"
                          value={w.videoUrl||""} onChange={e=>{const a=[...(draft.portfolioWorks||[])];a[i]={...a[i],videoUrl:e.target.value};setDraft({...draft,portfolioWorks:a});}}/>
                        {w.videoUrl && <span className="text-[10px] text-sky-600 font-bold mt-0.5 block">🔗 {detectPlatform(w.videoUrl)}</span>}
                      </div>
                      <div>
                        <label className={lbl}>🖼️ 썸네일 URL</label>
                        <input type="text" className={inp} placeholder="https://drive.google.com/file/d/.../view"
                          value={w.imageUrl} onChange={e=>{const a=[...(draft.portfolioWorks||[])];a[i]={...a[i],imageUrl:normalizeImageUrl(e.target.value)};setDraft({...draft,portfolioWorks:a});}}/>
                        {w.imageUrl && <img src={w.imageUrl} className="mt-2 w-20 h-14 rounded-lg object-cover border border-sky-200" alt="thumb" onError={e=>(e.currentTarget.style.display="none")}/>}
                      </div>
                    </div>
                  )}
                  {/* ── 외부 링크 (PPT / SNS 등) ── */}
                  <div>
                    <label className={lbl}>🔗 외부 링크 (PPT / SNS / Figma 등)</label>
                    <div className="space-y-2">
                      {(w.links||[]).map((lnk,li)=>(
                        <div key={li} className="flex gap-2 items-center">
                          <select className={inp+" w-28 shrink-0 text-xs cursor-pointer"} value={lnk.type}
                            onChange={e=>{const a=[...(draft.portfolioWorks||[])];const ls=[...(a[i].links||[])];ls[li]={...ls[li],type:e.target.value as any};a[i]={...a[i],links:ls};setDraft({...draft,portfolioWorks:a});}}>
                            <option value="ppt">📊 PPT</option>
                            <option value="instagram">📱 Instagram</option>
                            <option value="youtube">▶ YouTube</option>
                            <option value="behance">🅱 Behance</option>
                            <option value="figma">🎨 Figma</option>
                            <option value="other">🔗 기타</option>
                          </select>
                          <input className={inp+" flex-1"} placeholder="버튼 텍스트 (예: PPT 보기)" value={lnk.label}
                            onChange={e=>{const a=[...(draft.portfolioWorks||[])];const ls=[...(a[i].links||[])];ls[li]={...ls[li],label:e.target.value};a[i]={...a[i],links:ls};setDraft({...draft,portfolioWorks:a});}}/>
                          <input className={inp+" flex-1"} placeholder="https://..." value={lnk.url}
                            onChange={e=>{const a=[...(draft.portfolioWorks||[])];const ls=[...(a[i].links||[])];ls[li]={...ls[li],url:e.target.value};a[i]={...a[i],links:ls};setDraft({...draft,portfolioWorks:a});}}/>
                          <button onClick={()=>{const a=[...(draft.portfolioWorks||[])];a[i]={...a[i],links:(a[i].links||[]).filter((_,idx)=>idx!==li)};setDraft({...draft,portfolioWorks:a});}} className="text-red-400 shrink-0 font-bold">✕</button>
                        </div>
                      ))}
                      <button onClick={()=>{const a=[...(draft.portfolioWorks||[])];a[i]={...a[i],links:[...(a[i].links||[]),{label:"",url:"",type:"other" as const}]};setDraft({...draft,portfolioWorks:a});}}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg border border-sky-200 text-sky-600 bg-sky-50 hover:bg-sky-100 transition-colors cursor-pointer">
                        + 링크 추가
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ══ 디자인 ══ */}
          {tab==="design" && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-sky-600 font-black text-sm border-b border-sky-100 pb-2 flex items-center gap-2"><Palette className="w-4 h-4"/>디자인 설정</h3>

              {/* 색상 */}
              <div className="bg-slate-50 border border-sky-100 rounded-2xl p-5 space-y-4">
                <p className="text-xs font-black text-slate-700">🎨 색상</p>
                <div className="grid grid-cols-2 gap-4">
                  {([
                    ["primaryColor","포인트 컬러"],["bgColor","배경색"],
                    ["textColor","텍스트색"],["cardBgColor","카드 배경"],
                    ["navBgColor","네비 배경"],["btnPrimaryColor","메인 버튼색"],
                    ["btnSecondaryColor","보조 버튼색"],["btnPrimaryText","버튼 텍스트색"],
                  ] as [keyof DesignSettings, string][]).map(([k,label])=>(
                    <div key={k} className="flex items-center gap-3">
                      <input type="color" value={(D[k] as string)||"#000000"} onChange={e=>upDesign(k,e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 p-0.5 shrink-0"/>
                      <div className="min-w-0">
                        <label className={lbl}>{label}</label>
                        <input className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs font-mono" value={(D[k] as string)||""} onChange={e=>upDesign(k,e.target.value)}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 버튼 텍스트 */}
              <div className="bg-slate-50 border border-sky-100 rounded-2xl p-5 space-y-3">
                <p className="text-xs font-black text-slate-700">🔘 버튼 라벨</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lbl}>메인 버튼</label><input className={inp} value={D.btnPrimaryLabel} onChange={e=>upDesign("btnPrimaryLabel",e.target.value)}/></div>
                  <div><label className={lbl}>보조 버튼</label><input className={inp} value={D.btnSecondaryLabel} onChange={e=>upDesign("btnSecondaryLabel",e.target.value)}/></div>
                </div>
                <div className="flex gap-3 pt-1">
                  <button className="py-2 px-5 rounded-xl text-sm font-black" style={{background:D.btnPrimaryColor,color:D.btnPrimaryText}}>{D.btnPrimaryLabel}</button>
                  <button className="py-2 px-5 rounded-xl text-sm font-semibold border" style={{background:D.btnSecondaryColor,color:D.primaryColor,borderColor:D.primaryColor+"30"}}>{D.btnSecondaryLabel}</button>
                </div>
              </div>

              {/* 배경 */}
              <div className="bg-slate-50 border border-sky-100 rounded-2xl p-5 space-y-3">
                <p className="text-xs font-black text-slate-700">🖼️ 배경 스타일</p>
                <div className="flex gap-3">
                  {([["gradient","그라디언트"],["color","단색"],["image","이미지URL"]] as const).map(([v,l])=>(
                    <button key={v} onClick={()=>upDesign("heroBgType",v)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${D.heroBgType===v?"bg-sky-500 text-white border-sky-600":"bg-white text-slate-600 border-slate-200"}`}>{l}</button>
                  ))}
                </div>
                {D.heroBgType==="color" && (
                  <div className="flex items-center gap-3">
                    <input type="color" value={D.heroBgValue||"#e0f2fe"} onChange={e=>upDesign("heroBgValue",e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border p-0.5"/>
                    <input className={inp} value={D.heroBgValue||""} onChange={e=>upDesign("heroBgValue",e.target.value)}/>
                  </div>
                )}
                {D.heroBgType==="image" && (
                  <div><label className={lbl}>배경 이미지 URL</label>
                    <input className={inp} placeholder="https://..." value={D.heroBgValue||""} onChange={e=>upDesign("heroBgValue",normalizeImageUrl(e.target.value))}/>
                  </div>
                )}
              </div>

              {/* 전체 폰트 크기 */}
              <div className="bg-slate-50 border border-sky-100 rounded-2xl p-5 space-y-3">
                <p className="text-xs font-black text-slate-700">🔤 전체 기본 폰트 크기</p>
                <div className="flex gap-3">
                  {([["sm","작게(sm)"],["base","기본(base)"],["lg","크게(lg)"]] as const).map(([v,l])=>(
                    <button key={v} onClick={()=>upDesign("globalFontSize",v)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold border ${D.globalFontSize===v?"bg-sky-500 text-white border-sky-600":"bg-white text-slate-600 border-slate-200"}`}>{l}</button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400">※ 섹션별 개별 크기는 📝 섹션 텍스트 탭에서 조절</p>
              </div>

              {/* 섹션 순서/보이기 */}
              <div className="bg-slate-50 border border-sky-100 rounded-2xl p-5 space-y-3">
                <p className="text-xs font-black text-slate-700">📋 섹션 순서 & 보이기/숨기기</p>
                <div className="space-y-2">
                  {(D.sectionOrder||[]).map((secId,idx) => {
                    const secData = draft.sections?.[secId as keyof SectionHeaders];
                    const visible = secData ? (secData.visible !== false) : true;
                    return (
                      <div key={secId} className="flex items-center gap-2 bg-white border border-sky-100 rounded-xl px-3 py-2">
                        <GripVertical className="w-4 h-4 text-slate-300 shrink-0"/>
                        <span className="text-xs font-bold text-slate-700 flex-1">{SECTION_LABELS[secId]||secId}</span>
                        <div className="flex gap-1">
                          <button onClick={()=>{const a=[...(D.sectionOrder||[])];if(idx>0){[a[idx-1],a[idx]]=[a[idx],a[idx-1]];upDesign("sectionOrder",a);}}} className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 hover:bg-sky-100 text-slate-500 text-xs font-black">↑</button>
                          <button onClick={()=>{const a=[...(D.sectionOrder||[])];if(idx<a.length-1){[a[idx+1],a[idx]]=[a[idx],a[idx+1]];upDesign("sectionOrder",a);}}} className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 hover:bg-sky-100 text-slate-500 text-xs font-black">↓</button>
                          <button onClick={()=>{const d=JSON.parse(JSON.stringify(draft));if(!d.sections)d.sections=JSON.parse(JSON.stringify(initialPortfolioData.sections));d.sections[secId].visible=!visible;setDraft(d);}}
                            className={`w-6 h-6 flex items-center justify-center rounded text-xs ${visible?"bg-sky-100 text-sky-600":"bg-slate-200 text-slate-400"}`}>
                            {visible?<Eye className="w-3.5 h-3.5"/>:<EyeOff className="w-3.5 h-3.5"/>}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ══ 섹션 텍스트 편집 ══ */}
          {tab==="sections" && (
            <div className="space-y-5 max-w-2xl">
              <div className="flex items-center gap-2 border-b border-sky-100 pb-2">
                <Type className="w-4 h-4 text-sky-500"/>
                <h3 className="text-sky-600 font-black text-sm">섹션별 텍스트 · 폰트 크기 편집</h3>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                💡 Enter키로 줄바꿈하면 실제 사이트에도 그대로 반영됩니다.
              </div>
              {(Object.keys(draft.sections||{}) as Array<keyof SectionHeaders>).map(sec=>(
                <div key={sec} className="bg-slate-50 border border-sky-100 rounded-2xl p-5 space-y-3">
                  <span className="bg-sky-500 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase">{SECTION_LABELS[sec]||sec}</span>
                  <div>
                    <label className={lbl}>뱃지 텍스트</label>
                    <input className={inp} value={draft.sections?.[sec]?.badge||""} onChange={e=>upSection(sec,"badge",e.target.value)}/>
                  </div>
                  <div>
                    <label className={lbl}>제목 <span className="text-sky-400 normal-case font-normal">(Enter = 줄바꿈)</span></label>
                    <textarea rows={2} className={inp+" resize-none"}
                      value={fromStored(draft.sections?.[sec]?.title||"")}
                      onChange={e=>upSection(sec,"title",toStored(e.target.value))}/>
                    <TextStyleControls label="제목" value={draft.sections?.[sec]?.titleStyle}
                      onChange={v=>upSection(sec,"titleStyle",v)}/>
                  </div>
                  <div>
                    <label className={lbl}>소제목 <span className="text-sky-400 normal-case font-normal">(Enter = 줄바꿈)</span></label>
                    <textarea rows={3} className={inp+" resize-none"}
                      value={fromStored(draft.sections?.[sec]?.subtitle||"")}
                      onChange={e=>upSection(sec,"subtitle",toStored(e.target.value))}/>
                    <TextStyleControls label="소제목" value={draft.sections?.[sec]?.subtitleStyle}
                      onChange={v=>upSection(sec,"subtitleStyle",v)}/>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ══ 프로필 ══ */}
          {tab==="profile" && (
            <div className="space-y-4 max-w-xl">
              <h3 className="text-sky-600 font-black text-sm border-b border-sky-100 pb-2">기본 프로필</h3>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                💡 Enter키로 줄바꿈하면 사이트에 그대로 반영됩니다.
              </div>
              <div><label className={lbl}>이름</label><input className={inp} value={draft.profile.name||""} onChange={e=>setDraft({...draft,profile:{...draft.profile,name:e.target.value}})}/></div>
              <div><label className={lbl}>영문 이름</label><input className={inp} value={draft.profile.engName||""} onChange={e=>setDraft({...draft,profile:{...draft.profile,engName:e.target.value}})}/></div>
              <div><label className={lbl}>직함</label><input className={inp} value={draft.profile.title||""} onChange={e=>setDraft({...draft,profile:{...draft.profile,title:e.target.value}})}/></div>
              <div>
                <label className={lbl}>헤드라인 <span className="text-sky-400 normal-case font-normal">(Enter = 줄바꿈)</span></label>
                <textarea rows={3} className={inp+" resize-none"}
                  value={fromStored(draft.profile.headline||"")}
                  onChange={e=>setDraft({...draft,profile:{...draft.profile,headline:toStored(e.target.value)}})}/>
              </div>
              <div>
                <label className={lbl}>서브 헤드라인 <span className="text-sky-400 normal-case font-normal">(Enter = 줄바꿈)</span></label>
                <textarea rows={4} className={inp+" resize-none"}
                  value={fromStored(draft.profile.subHeadline||"")}
                  onChange={e=>setDraft({...draft,profile:{...draft.profile,subHeadline:toStored(e.target.value)}})}/>
              </div>
              <div>
                <label className={lbl}>프로필 사진</label>
                <div className="space-y-2 mt-1">
                  {draft.profile.idPhoto && <img src={draft.profile.idPhoto} className="w-16 h-20 rounded-xl object-cover border border-sky-200" alt="prev"/>}
                  <div><label className={lbl}>사진 URL (Google Drive / Cloudinary)</label>
                    <input className={inp} placeholder="https://drive.google.com/file/d/.../view" value={draft.profile.idPhoto||""}
                      onChange={e=>setDraft({...draft,profile:{...draft.profile,idPhoto:normalizeImageUrl(e.target.value)}})}/>
                  </div>
                  <p className="text-[10px] text-slate-400">또는</p>
                  <label className="flex items-center gap-2 px-3 py-2 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-600 cursor-pointer hover:bg-sky-100 font-bold w-fit">
                    <Upload className="w-3.5 h-3.5"/>직접 업로드 (소용량)
                    <input type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)compress(f,800,1000,b=>setDraft({...draft,profile:{...draft.profile,idPhoto:b}}));}}/>
                  </label>
                  {draft.profile.idPhoto && <button onClick={()=>setDraft({...draft,profile:{...draft.profile,idPhoto:""}})} className="text-xs text-red-400">삭제</button>}
                </div>
              </div>
            </div>
          )}

          {/* ══ 통계 ══ */}
          {tab==="stats" && (
            <div className="space-y-4 max-w-xl">
              <div className="flex justify-between items-center border-b border-sky-100 pb-2">
                <h3 className="text-sky-600 font-black text-sm">통계 수치</h3>
                <button onClick={()=>setDraft({...draft,stats:[...draft.stats,{id:`s-${Date.now()}`,value:"0",label:"항목"}]})}
                  className="flex items-center gap-1 px-3 py-1.5 bg-sky-50 text-sky-600 text-xs rounded-lg border border-sky-200 font-bold"><Plus className="w-3 h-3"/>추가</button>
              </div>
              {draft.stats.map((s,i)=>(
                <div key={s.id} className="bg-slate-50 border border-sky-100 rounded-xl p-3 grid grid-cols-2 gap-2">
                  <div><label className={lbl}>값</label><input className={inp} value={s.value} onChange={e=>{const a=[...draft.stats];a[i]={...a[i],value:e.target.value};setDraft({...draft,stats:a});}}/></div>
                  <div><label className={lbl}>레이블</label><input className={inp} value={s.label} onChange={e=>{const a=[...draft.stats];a[i]={...a[i],label:e.target.value};setDraft({...draft,stats:a});}}/></div>
                  <button onClick={()=>setDraft({...draft,stats:draft.stats.filter((_,idx)=>idx!==i)})} className="col-span-2 text-xs text-red-400 flex items-center gap-1"><Trash2 className="w-3 h-3"/>삭제</button>
                </div>
              ))}
            </div>
          )}

          {/* ══ 강점 ══ */}
          {tab==="strengths" && (
            <div className="space-y-5 max-w-xl">
              <h3 className="text-sky-600 font-black text-sm border-b border-sky-100 pb-2">강점 카드</h3>
              {draft.strengths.map((s,i)=>(
                <div key={s.id} className="bg-slate-50 border border-sky-100 rounded-xl p-4 space-y-3">
                  <span className="text-sky-500 text-xs font-black">강점 {i+1}</span>
                  <div><label className={lbl}>제목</label><input className={inp} value={s.title} onChange={e=>{const a=[...draft.strengths];a[i]={...a[i],title:e.target.value};setDraft({...draft,strengths:a});}}/></div>
                  <div><label className={lbl}>소제목</label><input className={inp} value={s.subtitle} onChange={e=>{const a=[...draft.strengths];a[i]={...a[i],subtitle:e.target.value};setDraft({...draft,strengths:a});}}/></div>
                  <div>
                    <div className="flex justify-between mb-1"><label className={lbl}>포인트</label>
                      <button onClick={()=>{const a=[...draft.strengths];a[i].points.push("새 포인트");setDraft({...draft,strengths:a});}} className="text-xs text-sky-500 font-bold flex items-center gap-0.5"><Plus className="w-3 h-3"/>추가</button></div>
                    {s.points.map((pt,pi)=>(
                      <div key={pi} className="flex gap-2 mb-1.5">
                        <input className={inp+" flex-1"} value={pt} onChange={e=>{const a=[...draft.strengths];const ps=[...a[i].points];ps[pi]=e.target.value;a[i]={...a[i],points:ps};setDraft({...draft,strengths:a});}}/>
                        <button onClick={()=>{const a=[...draft.strengths];a[i].points=a[i].points.filter((_,idx)=>idx!==pi);setDraft({...draft,strengths:a});}} className="text-red-400"><Trash2 className="w-3.5 h-3.5"/></button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ══ 케이스 ══ */}
          {tab==="projects" && (
            <div className="space-y-5 max-w-2xl">
              <div className="flex justify-between items-center border-b border-sky-100 pb-2">
                <h3 className="text-sky-600 font-black text-sm">케이스 스터디</h3>
                <button onClick={()=>setDraft({...draft,projects:[...draft.projects,{id:`p-${Date.now()}`,title:"새 프로젝트",category:"Category",tagline:"",problem:"",strategy:"",results:[],imageType:"ad"}]})}
                  className="flex items-center gap-1 px-3 py-1.5 bg-sky-50 text-sky-600 text-xs rounded-lg border border-sky-200 font-bold"><Plus className="w-3 h-3"/>추가</button>
              </div>
              {draft.projects.map((p,i)=>(
                <div key={p.id} className="bg-slate-50 border border-sky-100 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between"><span className="text-sky-500 text-xs font-black">프로젝트 {i+1}</span>
                    <button onClick={()=>setDraft({...draft,projects:draft.projects.filter((_,idx)=>idx!==i)})} className="text-red-400"><Trash2 className="w-3.5 h-3.5"/></button></div>
                  {(["title","category","tagline","problem","strategy"] as const).map(k=>(
                    <div key={k}><label className={lbl}>{k==="title"?"제목":k==="category"?"카테고리":k==="tagline"?"태그라인":k==="problem"?"문제점":"전략"}</label>
                      {k==="problem"||k==="strategy"||k==="tagline"
                        ?<textarea rows={2} className={inp+" resize-none"} value={p[k]} onChange={e=>{const a=[...draft.projects];(a[i] as any)[k]=e.target.value;setDraft({...draft,projects:a});}}/>
                        :<input className={inp} value={p[k]} onChange={e=>{const a=[...draft.projects];(a[i] as any)[k]=e.target.value;setDraft({...draft,projects:a});}}/>}
                    </div>
                  ))}
                  <div>
                    <div className="flex justify-between mb-1"><label className={lbl}>성과 결과</label>
                      <button onClick={()=>{const a=[...draft.projects];a[i].results.push("새 결과");setDraft({...draft,projects:a});}} className="text-xs text-sky-500 font-bold flex items-center gap-0.5"><Plus className="w-3 h-3"/>추가</button></div>
                    {p.results.map((r,ri)=>(
                      <div key={ri} className="flex gap-2 mb-1.5">
                        <input className={inp+" flex-1"} value={r} onChange={e=>{const a=[...draft.projects];const rs=[...a[i].results];rs[ri]=e.target.value;a[i]={...a[i],results:rs};setDraft({...draft,projects:a});}}/>
                        <button onClick={()=>{const a=[...draft.projects];a[i].results=a[i].results.filter((_,idx)=>idx!==ri);setDraft({...draft,projects:a});}} className="text-red-400 shrink-0"><Trash2 className="w-3.5 h-3.5"/></button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ══ 프로세스 ══ */}
          {tab==="process" && (
            <div className="space-y-4 max-w-2xl">
              <div className="flex justify-between items-center border-b border-sky-100 pb-2">
                <h3 className="text-sky-600 font-black text-sm">워크플로우</h3>
                <button onClick={()=>setDraft({...draft,processSteps:[...draft.processSteps,{id:`proc-${Date.now()}`,phase:`0${draft.processSteps.length+1}`,title:"새 단계",desc:""}]})}
                  className="flex items-center gap-1 px-3 py-1.5 bg-sky-50 text-sky-600 text-xs rounded-lg border border-sky-200 font-bold"><Plus className="w-3 h-3"/>추가</button>
              </div>
              {draft.processSteps.map((s,i)=>(
                <div key={s.id} className="bg-slate-50 border border-sky-100 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between"><span className="bg-sky-500 text-white text-[9px] font-black px-2 py-0.5 rounded">Step {s.phase}</span>
                    <button onClick={()=>setDraft({...draft,processSteps:draft.processSteps.filter((_,idx)=>idx!==i)})} className="text-red-400"><Trash2 className="w-3.5 h-3.5"/></button></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className={lbl}>번호</label><input className={inp} value={s.phase} onChange={e=>{const a=[...draft.processSteps];a[i]={...a[i],phase:e.target.value};setDraft({...draft,processSteps:a});}}/></div>
                    <div><label className={lbl}>제목</label><input className={inp} value={s.title} onChange={e=>{const a=[...draft.processSteps];a[i]={...a[i],title:e.target.value};setDraft({...draft,processSteps:a});}}/></div>
                    <div className="col-span-2"><label className={lbl}>본문</label><textarea rows={4} className={inp+" resize-none"} value={s.desc} onChange={e=>{const a=[...draft.processSteps];a[i]={...a[i],desc:e.target.value};setDraft({...draft,processSteps:a});}}/></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ══ 스킬 ══ */}
          {tab==="skills" && (
            <div className="space-y-4 max-w-xl">
              <div className="flex justify-between items-center border-b border-sky-100 pb-2">
                <h3 className="text-sky-600 font-black text-sm">스킬</h3>
                <button onClick={()=>setDraft({...draft,skills:[...draft.skills,{id:`sk-${Date.now()}`,category:"Design",name:"새 기술",rating:3}]})}
                  className="flex items-center gap-1 px-3 py-1.5 bg-sky-50 text-sky-600 text-xs rounded-lg border border-sky-200 font-bold"><Plus className="w-3 h-3"/>추가</button>
              </div>
              {draft.skills.map((s,i)=>(
                <div key={s.id} className="bg-slate-50 border border-sky-100 rounded-xl p-3 grid grid-cols-3 gap-2 items-end">
                  <div><label className={lbl}>이름</label><input className={inp} value={s.name} onChange={e=>{const a=[...draft.skills];a[i]={...a[i],name:e.target.value};setDraft({...draft,skills:a});}}/></div>
                  <div><label className={lbl}>카테고리</label>
                    <select className={inp+" cursor-pointer text-xs"} value={s.category} onChange={e=>{const a=[...draft.skills];a[i]={...a[i],category:e.target.value as any};setDraft({...draft,skills:a});}}>
                      {["Design","Video","Marketing"].map(v=><option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div><label className={lbl}>숙련도</label>
                    <div className="flex gap-0.5 pt-1.5">
                      {[1,2,3,4,5].map(n=><button key={n} onClick={()=>{const a=[...draft.skills];a[i]={...a[i],rating:n};setDraft({...draft,skills:a});}} className={`w-5 h-5 ${n<=s.rating?"text-amber-400":"text-slate-200"}`}><Star className="w-full h-full" fill={n<=s.rating?"currentColor":"none"}/></button>)}
                    </div>
                  </div>
                  <button onClick={()=>setDraft({...draft,skills:draft.skills.filter((_,idx)=>idx!==i)})} className="col-span-3 text-xs text-red-400 flex items-center gap-1 mt-1"><Trash2 className="w-3 h-3"/>삭제</button>
                </div>
              ))}
            </div>
          )}

          {/* ══ 경력 ══ */}
          {tab==="career" && (
            <div className="space-y-5 max-w-xl">
              <div className="flex justify-between items-center border-b border-sky-100 pb-2">
                <h3 className="text-sky-600 font-black text-sm">경력</h3>
                <button onClick={()=>setDraft({...draft,careers:[...draft.careers,{id:`c-${Date.now()}`,period:"20XX — 현재",company:"회사명",role:"광고 디자이너",details:[]}]})}
                  className="flex items-center gap-1 px-3 py-1.5 bg-sky-50 text-sky-600 text-xs rounded-lg border border-sky-200 font-bold"><Plus className="w-3 h-3"/>추가</button>
              </div>
              {draft.careers.map((c,i)=>(
                <div key={c.id} className="bg-slate-50 border border-sky-100 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between"><span className="text-sky-500 text-xs font-black">경력 {i+1}</span>
                    <button onClick={()=>setDraft({...draft,careers:draft.careers.filter((_,idx)=>idx!==i)})} className="text-red-400"><Trash2 className="w-3.5 h-3.5"/></button></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className={lbl}>기간</label><input className={inp} value={c.period} onChange={e=>{const a=[...draft.careers];a[i]={...a[i],period:e.target.value};setDraft({...draft,careers:a});}}/></div>
                    <div><label className={lbl}>직무</label><input className={inp} value={c.role} onChange={e=>{const a=[...draft.careers];a[i]={...a[i],role:e.target.value};setDraft({...draft,careers:a});}}/></div>
                    <div className="col-span-2"><label className={lbl}>회사명</label><input className={inp} value={c.company} onChange={e=>{const a=[...draft.careers];a[i]={...a[i],company:e.target.value};setDraft({...draft,careers:a});}}/></div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1"><label className={lbl}>업무 내용</label>
                      <button onClick={()=>{const a=[...draft.careers];a[i].details.push("새 업무");setDraft({...draft,careers:a});}} className="text-xs text-sky-500 font-bold flex items-center gap-0.5"><Plus className="w-3 h-3"/>추가</button></div>
                    {c.details.map((d,di)=>(
                      <div key={di} className="flex gap-2 mb-1.5">
                        <input className={inp+" flex-1"} value={d} onChange={e=>{const a=[...draft.careers];const ds=[...a[i].details];ds[di]=e.target.value;a[i]={...a[i],details:ds};setDraft({...draft,careers:a});}}/>
                        <button onClick={()=>{const a=[...draft.careers];a[i].details=a[i].details.filter((_,idx)=>idx!==di);setDraft({...draft,careers:a});}} className="text-red-400 shrink-0"><Trash2 className="w-3.5 h-3.5"/></button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ══ Why Me ══ */}
          {tab==="whyme" && (
            <div className="space-y-4 max-w-xl">
              <h3 className="text-sky-600 font-black text-sm border-b border-sky-100 pb-2">Why Me</h3>
              <div><label className={lbl}>제목</label><input className={inp} value={draft.whyMe.title} onChange={e=>setDraft({...draft,whyMe:{...draft.whyMe,title:e.target.value}})}/></div>
              <div><label className={lbl}>본문</label><textarea rows={3} className={inp+" resize-none"} value={draft.whyMe.description} onChange={e=>setDraft({...draft,whyMe:{...draft.whyMe,description:e.target.value}})}/></div>
              <div>
                <label className={lbl}>포인트</label>
                {draft.whyMe.points.map((p,i)=>(
                  <div key={i} className="flex gap-2 mb-2">
                    <textarea rows={2} className={inp+" flex-1 resize-none"} value={p} onChange={e=>{const a=[...draft.whyMe.points];a[i]=e.target.value;setDraft({...draft,whyMe:{...draft.whyMe,points:a}});}}/>
                    <button onClick={()=>setDraft({...draft,whyMe:{...draft.whyMe,points:draft.whyMe.points.filter((_,idx)=>idx!==i)}})} className="text-red-400 shrink-0"><Trash2 className="w-3.5 h-3.5"/></button>
                  </div>
                ))}
                <button onClick={()=>setDraft({...draft,whyMe:{...draft.whyMe,points:[...draft.whyMe.points,"새 포인트"]}})} className="flex items-center gap-1 text-xs text-sky-500 font-bold"><Plus className="w-3 h-3"/>추가</button>
              </div>
            </div>
          )}

          {/* ══ 연락처 ══ */}
          {tab==="contact" && (
            <div className="space-y-4 max-w-sm">
              <h3 className="text-sky-600 font-black text-sm border-b border-sky-100 pb-2">연락처</h3>
              <div><label className={lbl}>이메일</label><input className={inp} value={draft.contact.email} onChange={e=>setDraft({...draft,contact:{...draft.contact,email:e.target.value}})}/></div>
              <div><label className={lbl}>핸드폰</label><input className={inp} value={draft.contact.phone||""} onChange={e=>setDraft({...draft,contact:{...draft.contact,phone:e.target.value}})}/></div>
            </div>
          )}

          {/* ══ 도구 ══ */}
          {tab==="tools" && (
            <div className="space-y-4 max-w-xl">
              <div className="flex justify-between items-center border-b border-sky-100 pb-2">
                <h3 className="text-sky-600 font-black text-sm">사용 도구</h3>
                <button onClick={()=>setDraft({...draft,tools:[...(draft.tools||[]),{id:`t-${Date.now()}`,name:"새 도구",iconUrl:""}]})}
                  className="flex items-center gap-1 px-3 py-1.5 bg-sky-50 text-sky-600 text-xs rounded-lg border border-sky-200 font-bold"><Plus className="w-3 h-3"/>추가</button>
              </div>
              {(draft.tools||[]).map((t,i)=>(
                <div key={t.id} className="bg-slate-50 border border-sky-100 rounded-xl p-3 grid grid-cols-2 gap-2">
                  <div><label className={lbl}>이름</label><input className={inp} value={t.name} onChange={e=>{const a=[...(draft.tools||[])];a[i]={...a[i],name:e.target.value};setDraft({...draft,tools:a});}}/></div>
                  <div><label className={lbl}>아이콘 URL</label><input className={inp} value={t.iconUrl} onChange={e=>{const a=[...(draft.tools||[])];a[i]={...a[i],iconUrl:e.target.value};setDraft({...draft,tools:a});}}/></div>
                  <button onClick={()=>setDraft({...draft,tools:(draft.tools||[]).filter((_,idx)=>idx!==i)})} className="col-span-2 text-xs text-red-400 flex items-center gap-1"><Trash2 className="w-3 h-3"/>삭제</button>
                </div>
              ))}
            </div>
          )}

        </main>

        {/* ══ 디자인 실시간 미리보기 패널 ══ */}
        {showPreview && <DesignPreview D={D as any} />}
      </div>
    </motion.div>
  );
}
