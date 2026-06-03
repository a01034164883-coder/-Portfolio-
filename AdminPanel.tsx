import { useState, FormEvent } from "react";
import {
  Lock, Save, RotateCcw, X, Plus, Trash2, Upload, Star, Settings,
  Type, Palette, Eye, EyeOff, GripVertical, Film, Inbox, Wand2, FolderOpen
} from "lucide-react";
import { motion } from "motion/react";
import { PortfolioData, SectionHeaders, DesignSettings } from "../types";
import { initialPortfolioData } from "../data";

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

interface Props { data: PortfolioData; onSave: (d: PortfolioData) => void; onClose: () => void; onLogin?: () => void; }
type Tab = "design"|"sections"|"profile"|"stats"|"strengths"|"projects"|"process"|"skills"|"career"|"whyme"|"contact"|"portfolio"|"bulk"|"tools";


// ══ 일괄 업로드 컴포넌트 ══
interface BulkItem {
  id: string;
  file: File;
  preview: string;
  title: string;
  category: string;
  workType: "image" | "video";
  videoUrl?: string;
  status: "pending" | "done" | "error";
}

const KNOWN_CATEGORIES = ["에고랩스", "스튜디오 피엘", "청년철거", "모빌리티커넥트", "채인컴퍼니"];

function guessCategory(filename: string): string {
  const f = filename.toLowerCase();
  if (f.includes("에고") || f.includes("ego") || f.includes("밸런스") || f.includes("스터디") || f.includes("메모리")) return "에고랩스";
  if (f.includes("피엘") || f.includes("pl") || f.includes("스튜디오")) return "스튜디오 피엘";
  if (f.includes("철거") || f.includes("청년")) return "청년철거";
  // 화물/용달 → 모빌리티커넥트
  if (f.includes("모빌") || f.includes("화물") || f.includes("용달")) return "모빌리티커넥트";
  // 파이(φ/π) 포장용기, 채인 → 채인컴퍼니
  if (f.includes("채인") || f.includes("chain") || f.includes("파이") || f.includes("포장") || f.includes("용기") || /\d+파이/.test(filename)) return "채인컴퍼니";
  return "에고랩스";
}

function guessTitle(filename: string): string {
  // 확장자 제거, 날짜 패턴 제거, 밑줄/하이픈을 공백으로
  let name = filename.replace(/\.[^.]+$/, "");
  name = name.replace(/^\d{6}[-_]?/, ""); // 날짜 prefix 제거
  name = name.replace(/[-_]/g, " ").trim();
  name = name.replace(/\s+/g, " ");
  return name || filename;
}

function BulkUploadTab({ draft, setDraft, compress }: {
  draft: PortfolioData;
  setDraft: (d: PortfolioData) => void;
  compress: (f: File, mW: number, mH: number, cb: (b: string) => void) => void;
}) {
  const [items, setItems] = useState<BulkItem[]>([]);
  const [globalCat, setGlobalCat] = useState("");
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newItems: BulkItem[] = [];
    Array.from(files).forEach(file => {
      const isVideo = file.type.startsWith("video/");
      const item: BulkItem = {
        id: `bulk-${Date.now()}-${Math.random()}`,
        file,
        preview: "",
        title: guessTitle(file.name),
        category: guessCategory(file.name),
        workType: isVideo ? "video" : "image",
        status: "pending",
      };
      newItems.push(item);

      if (!isVideo) {
        const reader = new FileReader();
        reader.onload = e => {
          setItems(prev => prev.map(i => i.id === item.id ? { ...i, preview: e.target?.result as string } : i));
        };
        reader.readAsDataURL(file);
      }
    });
    setItems(prev => [...prev, ...newItems]);
    setDone(false);
  };

  const updateItem = (id: string, changes: Partial<BulkItem>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...changes } : i));
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const applyGlobalCat = () => {
    if (!globalCat) return;
    setItems(prev => prev.map(i => ({ ...i, category: globalCat })));
  };

  const processAndAdd = async () => {
    setProcessing(true);
    const newWorks: PortfolioWork[] = [];

    for (const item of items) {
      try {
        let imageUrl = item.preview;
        let videoBase64: string | undefined;

        if (item.workType === "video") {
          await new Promise<void>(resolve => {
            const reader = new FileReader();
            reader.onload = e => {
              if (item.file.size <= 50 * 1024 * 1024) {
                videoBase64 = e.target?.result as string;
              }
              resolve();
            };
            reader.readAsDataURL(item.file);
          });
          // 동영상 썸네일은 비워둠 (나중에 추가 가능)
          imageUrl = imageUrl || "";
        } else if (!imageUrl) {
          await new Promise<void>(resolve => {
            compress(item.file, 1000, 1000, b => { imageUrl = b; resolve(); });
          });
        }

        newWorks.push({
          id: item.id,
          title: item.title,
          category: item.category,
          description: `${item.category} 포트폴리오 — ${item.title}`,
          imageUrl,
          workType: item.workType,
          videoBase64,
        } as any);

        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "done" } : i));
      } catch {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "error" } : i));
      }
    }

    setDraft({
      ...draft,
      portfolioWorks: [...(draft.portfolioWorks || []), ...newWorks],
    });
    setProcessing(false);
    setDone(true);
  };

  const inp = "w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:border-sky-400 focus:outline-none";

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-2 border-b border-sky-100 pb-2">
        <Inbox className="w-4 h-4 text-sky-500" />
        <h3 className="text-sky-600 font-black text-sm">일괄 업로드 & 자동 정리</h3>
      </div>

      <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 text-xs text-slate-600 space-y-1">
        <p className="font-bold text-sky-700">💡 자동 분류 기준</p>
        <p>· 파일명에 <strong>에고/ego/밸런스/스터디/메모리</strong> → 에고랩스</p>
        <p>· 파일명에 <strong>피엘/pl/스튜디오</strong> → 스튜디오 피엘</p>
        <p>· 파일명에 <strong>철거/청년</strong> → 청년철거</p>
        <p>· 파일명에 <strong>모빌</strong> → 모빌리티커넥트</p>
        <p>· 제목은 파일명 기반으로 자동 생성, 수정 가능</p>
      </div>

      {/* 드래그앤드롭 업로드 존 */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        className="border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer"
        style={{ borderColor: dragOver ? "#0ea5e9" : "#bae6fd", background: dragOver ? "#f0f9ff" : "#f8fafc" }}
        onClick={() => document.getElementById("bulk-input")?.click()}
      >
        <FolderOpen className="w-10 h-10 mx-auto mb-3 text-sky-300" />
        <p className="font-black text-slate-700 text-sm">클릭하거나 파일을 여기에 드래그하세요</p>
        <p className="text-xs text-slate-400 mt-1">이미지(jpg, png, gif) + 동영상(mp4, mov) 한번에 가능</p>
        <p className="text-xs text-slate-400">여러 파일 동시 선택 가능</p>
        <input id="bulk-input" type="file" multiple accept="image/*,video/*" className="hidden"
          onChange={e => handleFiles(e.target.files)} />
      </div>

      {items.length > 0 && (
        <>
          {/* 전체 카테고리 일괄 변경 */}
          <div className="flex gap-2 items-center bg-slate-50 border border-sky-100 rounded-xl p-3">
            <Wand2 className="w-4 h-4 text-sky-500 shrink-0" />
            <span className="text-xs font-bold text-slate-700 shrink-0">전체 카테고리 일괄 변경:</span>
            <select className={inp + " flex-1"} value={globalCat} onChange={e => setGlobalCat(e.target.value)}>
              <option value="">선택...</option>
              {KNOWN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={applyGlobalCat}
              className="shrink-0 px-3 py-1.5 bg-sky-500 text-white text-xs font-black rounded-lg hover:bg-sky-600">
              적용
            </button>
          </div>

          {/* 파일 목록 */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-600">총 {items.length}개 파일</span>
              <button onClick={() => setItems([])} className="text-xs text-red-400 hover:text-red-600">전체 삭제</button>
            </div>

            {items.map((item, i) => (
              <div key={item.id} className={`bg-white border rounded-xl p-3 flex gap-3 items-start ${
                item.status === "done" ? "border-emerald-200 bg-emerald-50" :
                item.status === "error" ? "border-red-200 bg-red-50" : "border-sky-100"
              }`}>
                {/* 미리보기 */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
                  {item.workType === "video" ? (
                    <Film className="w-8 h-8 text-slate-400" />
                  ) : item.preview ? (
                    <img src={item.preview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>

                {/* 편집 필드 */}
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input className={inp} value={item.title} placeholder="제목"
                        onChange={e => updateItem(item.id, { title: e.target.value })} />
                    </div>
                    <select className={inp + " w-36 shrink-0"} value={item.category}
                      onChange={e => updateItem(item.id, { category: e.target.value })}>
                      {KNOWN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="기타">기타</option>
                    </select>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                      item.workType === "video" ? "bg-purple-100 text-purple-600" : "bg-sky-100 text-sky-600"
                    }`}>{item.workType === "video" ? "🎬 동영상" : "🖼️ 이미지"}</span>
                    <span className="text-[9px] text-slate-400">{(item.file.size / 1024).toFixed(0)}KB</span>
                    {item.status === "done" && <span className="text-[9px] text-emerald-600 font-bold">✓ 추가완료</span>}
                    {item.status === "error" && <span className="text-[9px] text-red-500 font-bold">✗ 오류</span>}
                  </div>
                </div>

                <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-400 shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* 추가 버튼 */}
          {!done ? (
            <button onClick={processAndAdd} disabled={processing}
              className="w-full py-3 rounded-xl font-black text-white text-sm transition-all"
              style={{ background: processing ? "#94a3b8" : "#0ea5e9" }}>
              {processing ? "처리 중... 잠시만 기다려주세요" : `✨ ${items.filter(i => i.status === "pending").length}개 포트폴리오에 추가하기`}
            </button>
          ) : (
            <div className="text-center space-y-3">
              <p className="text-emerald-600 font-black text-sm">✓ {items.filter(i => i.status === "done").length}개 모두 추가됐습니다!</p>
              <p className="text-xs text-slate-500">저장 버튼을 눌러야 최종 반영됩니다.</p>
              <button onClick={() => { setItems([]); setDone(false); }}
                className="px-4 py-2 bg-sky-50 border border-sky-200 text-sky-600 rounded-xl text-xs font-bold hover:bg-sky-100">
                + 더 추가하기
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function AdminPanel({ data, onSave, onClose, onLogin }: Props) {
  const [pw, setPw] = useState(""); const [auth, setAuth] = useState(false); const [err, setErr] = useState("");
  const [tab, setTab] = useState<Tab>("design");
  const [draft, setDraft] = useState<PortfolioData>(() => JSON.parse(JSON.stringify(data)));
  const [dragIdx, setDragIdx] = useState<number|null>(null);

  const login = (e: FormEvent) => {
    e.preventDefault();
    if (pw === "0119") {
      setAuth(true);
      setErr("");
      onLogin?.(); // 로그인 성공 알림
    } else setErr("비밀번호 오류");
  };
  const save = () => { onSave(draft); onClose(); };
  const reset = () => { if(confirm("초기화할까요?")) setDraft(JSON.parse(JSON.stringify(initialPortfolioData))); };

  const D = { ...DEFAULT_DESIGN, ...(draft.design||{}) };
  const upDesign = (k: keyof DesignSettings, v: any) => setDraft({ ...draft, design: { ...D, [k]: v } });

  const inp = "w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:border-sky-400 focus:outline-none";
  const lbl = "block text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-bold";

  const tabs: {id:Tab;label:string;icon:string}[] = [
    {id:"bulk",label:"📦 일괄업로드",icon:""},
    {id:"design",label:"🎨 디자인",icon:""},
    {id:"sections",label:"📝 섹션편집",icon:""},
    {id:"profile",label:"프로필",icon:""},
    {id:"stats",label:"통계",icon:""},
    {id:"strengths",label:"강점",icon:""},
    {id:"projects",label:"케이스",icon:""},
    {id:"process",label:"프로세스",icon:""},
    {id:"skills",label:"스킬",icon:""},
    {id:"career",label:"경력",icon:""},
    {id:"whyme",label:"Why Me",icon:""},
    {id:"contact",label:"연락처",icon:""},
    {id:"portfolio",label:"포트폴리오",icon:""},
    {id:"tools",label:"도구",icon:""},
  ];

  // 텍스트 스타일 컨트롤
  const TextStyleControls = ({ label, value, onChange }: {
    label: string;
    value?: { fontSize?: string; fontWeight?: string; lineBreak?: boolean };
    onChange: (v: any) => void;
  }) => {
    const v = value || {};
    return (
      <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 space-y-2 mt-1">
        <p className="text-[9px] text-sky-600 font-black uppercase tracking-wider">{label} 스타일</p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={lbl}>크기</label>
            <select className={inp + " text-xs cursor-pointer"} value={v.fontSize||""} onChange={e=>onChange({...v,fontSize:e.target.value||undefined})}>
              <option value="">기본</option>
              <option value="sm">작게</option><option value="base">보통</option>
              <option value="lg">크게</option><option value="xl">더 크게</option>
              <option value="2xl">2xl</option><option value="3xl">3xl</option>
              <option value="4xl">4xl</option><option value="5xl">최대</option>
            </select>
          </div>
          <div>
            <label className={lbl}>굵기</label>
            <select className={inp + " text-xs cursor-pointer"} value={v.fontWeight||""} onChange={e=>onChange({...v,fontWeight:e.target.value||undefined})}>
              <option value="">기본</option><option value="normal">얇게</option>
              <option value="medium">보통</option><option value="bold">굵게</option><option value="black">매우 굵게</option>
            </select>
          </div>
          <div className="flex flex-col justify-end pb-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={!!v.lineBreak} onChange={e=>onChange({...v,lineBreak:e.target.checked})} className="w-4 h-4 accent-sky-500" />
              <span className="text-xs text-slate-600 font-bold">줄바꿈</span>
            </label>
            <p className="text-[9px] text-slate-400 mt-0.5">\n으로 줄바꿈</p>
          </div>
        </div>
      </div>
    );
  };

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
        <div className="flex items-center gap-2"><Settings className="w-4 h-4 text-sky-500"/><span className="text-slate-800 font-black text-sm">포트폴리오 편집</span></div>
        <div className="flex gap-2">
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

        {/* 메인 컨텐츠 */}
        <main className="flex-1 overflow-y-auto p-6 bg-white">

          {/* ══ 디자인 탭 ══ */}
          {tab==="design" && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-sky-600 font-black text-sm border-b border-sky-100 pb-2 flex items-center gap-2"><Palette className="w-4 h-4"/>디자인 설정</h3>

              {/* 색상 */}
              <div className="bg-slate-50 border border-sky-100 rounded-2xl p-5 space-y-4">
                <p className="text-xs font-black text-slate-700">🎨 색상</p>
                <div className="grid grid-cols-2 gap-4">
                  {([
                    ["primaryColor","포인트 컬러"],["bgColor","배경색"],
                    ["textColor","텍스트 기본색"],["cardBgColor","카드 배경색"],["navBgColor","네비 배경색"],
                    ["btnPrimaryColor","버튼 기본 색상"],["btnSecondaryColor","버튼 보조 색상"],
                  ] as [keyof DesignSettings, string][]).map(([k,label])=>(
                    <div key={k} className="flex items-center gap-3">
                      <input type="color" value={(D[k] as string)||"#000000"} onChange={e=>upDesign(k,e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 p-0.5" />
                      <div>
                        <label className={lbl}>{label}</label>
                        <input className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs font-mono" value={(D[k] as string)||""} onChange={e=>upDesign(k,e.target.value)} />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-3">
                    <input type="color" value={D.btnPrimaryText||"#ffffff"} onChange={e=>upDesign("btnPrimaryText",e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 p-0.5" />
                    <div>
                      <label className={lbl}>버튼 텍스트 색</label>
                      <input className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs font-mono" value={D.btnPrimaryText||""} onChange={e=>upDesign("btnPrimaryText",e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              {/* 버튼 텍스트 */}
              <div className="bg-slate-50 border border-sky-100 rounded-2xl p-5 space-y-3">
                <p className="text-xs font-black text-slate-700">🔘 버튼 텍스트</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lbl}>메인 버튼 텍스트</label><input className={inp} value={D.btnPrimaryLabel} onChange={e=>upDesign("btnPrimaryLabel",e.target.value)}/></div>
                  <div><label className={lbl}>보조 버튼 텍스트</label><input className={inp} value={D.btnSecondaryLabel} onChange={e=>upDesign("btnSecondaryLabel",e.target.value)}/></div>
                </div>
                {/* 미리보기 */}
                <div className="flex gap-3 pt-2">
                  <button className="py-2 px-5 rounded-xl text-sm font-black" style={{background:D.btnPrimaryColor,color:D.btnPrimaryText}}>{D.btnPrimaryLabel}</button>
                  <button className="py-2 px-5 rounded-xl text-sm font-semibold border" style={{background:D.btnSecondaryColor,color:D.primaryColor,borderColor:D.primaryColor+"30"}}>{D.btnSecondaryLabel}</button>
                </div>
              </div>

              {/* 배경 */}
              <div className="bg-slate-50 border border-sky-100 rounded-2xl p-5 space-y-3">
                <p className="text-xs font-black text-slate-700">🖼️ 배경 스타일</p>
                <div className="flex gap-3">
                  {([["gradient","그라디언트"],["color","단색"],["image","이미지"]] as const).map(([v,l])=>(
                    <button key={v} onClick={()=>upDesign("heroBgType",v)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${D.heroBgType===v?"bg-sky-500 text-white border-sky-600":"bg-white text-slate-600 border-slate-200"}`}>
                      {l}
                    </button>
                  ))}
                </div>
                {D.heroBgType==="color" && (
                  <div className="flex items-center gap-3">
                    <input type="color" value={D.heroBgValue||"#e0f2fe"} onChange={e=>upDesign("heroBgValue",e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border p-0.5" />
                    <input className={inp} value={D.heroBgValue||""} onChange={e=>upDesign("heroBgValue",e.target.value)} />
                  </div>
                )}
                {D.heroBgType==="image" && (
                  <div>
                    <label className="flex items-center gap-2 px-3 py-2 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-600 cursor-pointer hover:bg-sky-100 font-bold w-fit">
                      <Upload className="w-3.5 h-3.5"/>배경 이미지 업로드
                      <input type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)compress(f,1920,1080,b=>upDesign("heroBgValue",b));}}/>
                    </label>
                    {D.heroBgValue && <img src={D.heroBgValue} className="mt-2 w-full h-24 object-cover rounded-xl border border-sky-100" alt="bg preview"/>}
                  </div>
                )}
              </div>

              {/* 전체 폰트 크기 */}
              <div className="bg-slate-50 border border-sky-100 rounded-2xl p-5 space-y-3">
                <p className="text-xs font-black text-slate-700">🔤 전체 폰트 크기</p>
                <div className="flex gap-3">
                  {([["sm","작게"],["base","기본"],["lg","크게"]] as const).map(([v,l])=>(
                    <button key={v} onClick={()=>upDesign("globalFontSize",v)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold border ${D.globalFontSize===v?"bg-sky-500 text-white border-sky-600":"bg-white text-slate-600 border-slate-200"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* 섹션 순서 + 보이기/숨기기 */}
              <div className="bg-slate-50 border border-sky-100 rounded-2xl p-5 space-y-3">
                <p className="text-xs font-black text-slate-700">📋 섹션 순서 & 보이기/숨기기</p>
                <p className="text-[10px] text-slate-400">위아래 버튼으로 순서 변경, 눈 아이콘으로 보이기/숨기기</p>
                <div className="space-y-2">
                  {(D.sectionOrder||[]).map((secId, idx) => {
                    const secData = draft.sections?.[secId as keyof SectionHeaders];
                    const visible = secData ? (secData.visible !== false) : true;
                    return (
                      <div key={secId} className="flex items-center gap-2 bg-white border border-sky-100 rounded-xl px-3 py-2">
                        <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
                        <span className="text-xs font-bold text-slate-700 flex-1">{SECTION_LABELS[secId]||secId}</span>
                        <div className="flex gap-1">
                          <button onClick={() => {
                            const arr = [...(D.sectionOrder||[])];
                            if(idx>0){[arr[idx-1],arr[idx]]=[arr[idx],arr[idx-1]];upDesign("sectionOrder",arr);}
                          }} className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 hover:bg-sky-100 text-slate-500 hover:text-sky-600 text-xs font-black">↑</button>
                          <button onClick={() => {
                            const arr = [...(D.sectionOrder||[])];
                            if(idx<arr.length-1){[arr[idx+1],arr[idx]]=[arr[idx],arr[idx+1]];upDesign("sectionOrder",arr);}
                          }} className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 hover:bg-sky-100 text-slate-500 hover:text-sky-600 text-xs font-black">↓</button>
                          <button onClick={() => {
                            const d = JSON.parse(JSON.stringify(draft));
                            if(!d.sections) d.sections = JSON.parse(JSON.stringify(initialPortfolioData.sections));
                            d.sections[secId].visible = !visible;
                            setDraft(d);
                          }} className={`w-6 h-6 flex items-center justify-center rounded text-xs ${visible?"bg-sky-100 text-sky-600":"bg-slate-200 text-slate-400"}`}>
                            {visible ? <Eye className="w-3.5 h-3.5"/> : <EyeOff className="w-3.5 h-3.5"/>}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ══ 섹션 제목/소제목 편집 ══ */}
          {tab==="sections" && (
            <div className="space-y-5 max-w-2xl">
              <div className="flex items-center gap-2 border-b border-sky-100 pb-2">
                <Type className="w-4 h-4 text-sky-500"/>
                <h3 className="text-sky-600 font-black text-sm">섹션 제목 · 소제목 · 본문 편집</h3>
              </div>
              {(Object.keys(draft.sections||{}) as Array<keyof SectionHeaders>).map(sec=>(
                <div key={sec} className="bg-slate-50 border border-sky-100 rounded-2xl p-5 space-y-3">
                  <span className="bg-sky-500 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase">{SECTION_LABELS[sec]||sec}</span>
                  <div><label className={lbl}>뱃지 (상단 작은 태그)</label>
                    <input className={inp} value={draft.sections?.[sec]?.badge||""} onChange={e=>{
                      const d=JSON.parse(JSON.stringify(draft));
                      if(!d.sections)d.sections=JSON.parse(JSON.stringify(initialPortfolioData.sections));
                      d.sections[sec].badge=e.target.value;setDraft(d);
                    }}/>
                  </div>
                  <div><label className={lbl}>제목</label>
                    <input className={inp} value={draft.sections?.[sec]?.title||""} onChange={e=>{
                      const d=JSON.parse(JSON.stringify(draft));
                      if(!d.sections)d.sections=JSON.parse(JSON.stringify(initialPortfolioData.sections));
                      d.sections[sec].title=e.target.value;setDraft(d);
                    }}/>
                    <TextStyleControls label="제목" value={draft.sections?.[sec]?.titleStyle}
                      onChange={v=>{const d=JSON.parse(JSON.stringify(draft));if(!d.sections)d.sections=JSON.parse(JSON.stringify(initialPortfolioData.sections));d.sections[sec].titleStyle=v;setDraft(d);}}/>
                  </div>
                  <div><label className={lbl}>소제목 / 본문 <span className="text-sky-400 normal-case">(줄바꿈: \n 입력)</span></label>
                    <textarea rows={3} className={inp+" resize-none"} value={draft.sections?.[sec]?.subtitle||""} onChange={e=>{
                      const d=JSON.parse(JSON.stringify(draft));
                      if(!d.sections)d.sections=JSON.parse(JSON.stringify(initialPortfolioData.sections));
                      d.sections[sec].subtitle=e.target.value;setDraft(d);
                    }}/>
                    <TextStyleControls label="소제목" value={draft.sections?.[sec]?.subtitleStyle}
                      onChange={v=>{const d=JSON.parse(JSON.stringify(draft));if(!d.sections)d.sections=JSON.parse(JSON.stringify(initialPortfolioData.sections));d.sections[sec].subtitleStyle=v;setDraft(d);}}/>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ══ 프로필 ══ */}
          {tab==="profile" && (
            <div className="space-y-4 max-w-xl">
              <h3 className="text-sky-600 font-black text-sm border-b border-sky-100 pb-2">기본 프로필</h3>
              {(["name","engName","title"] as const).map(k=>(
                <div key={k}><label className={lbl}>{k}</label><input className={inp} value={draft.profile[k]||""} onChange={e=>setDraft({...draft,profile:{...draft.profile,[k]:e.target.value}})}/></div>
              ))}
              <div><label className={lbl}>헤드라인 <span className="text-sky-400 normal-case">(유수경, 유수(流水) → 자동 KCC 폰트 적용)</span></label>
                <textarea rows={3} className={inp+" resize-none"} value={draft.profile.headline||""} onChange={e=>setDraft({...draft,profile:{...draft.profile,headline:e.target.value}})}/>
              </div>
              <div><label className={lbl}>서브 헤드라인</label>
                <textarea rows={3} className={inp+" resize-none"} value={draft.profile.subHeadline||""} onChange={e=>setDraft({...draft,profile:{...draft.profile,subHeadline:e.target.value}})}/>
              </div>
              <div>
                <label className={lbl}>프로필 사진</label>
                <div className="flex gap-3 items-center mt-1">
                  {draft.profile.idPhoto && <img src={draft.profile.idPhoto} className="w-16 h-20 rounded-xl object-cover border border-sky-200" alt="prev"/>}
                  <label className="flex items-center gap-2 px-3 py-2 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-600 cursor-pointer hover:bg-sky-100 font-bold">
                    <Upload className="w-3.5 h-3.5"/>사진 업로드
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
                <button onClick={()=>setDraft({...draft,careers:[...draft.careers,{id:`c-${Date.now()}`,period:"20XX — 현재",company:"회사명",role:"광고 디자이너 & 콘텐츠 디자이너",details:[]}]})}
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

          {/* ══ 포트폴리오 ══ */}
          {tab==="portfolio" && (
            <div className="space-y-5 max-w-2xl">
              <div className="flex justify-between items-center border-b border-sky-100 pb-2">
                <h3 className="text-sky-600 font-black text-sm">포트폴리오 작품</h3>
                <button onClick={()=>setDraft({...draft,portfolioWorks:[...(draft.portfolioWorks||[]),{id:`w-${Date.now()}`,title:"새 작품",category:"카테고리",description:"",imageUrl:"",workType:"image"}]})}
                  className="flex items-center gap-1 px-3 py-1.5 bg-sky-50 text-sky-600 text-xs rounded-lg border border-sky-200 font-bold"><Plus className="w-3 h-3"/>추가</button>
              </div>
              {(draft.portfolioWorks||[]).map((w,i)=>(
                <div key={w.id} className="bg-slate-50 border border-sky-100 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between"><span className="text-sky-500 text-xs font-black">작품 {i+1}</span>
                    <button onClick={()=>setDraft({...draft,portfolioWorks:(draft.portfolioWorks||[]).filter((_,idx)=>idx!==i)})} className="text-red-400"><Trash2 className="w-3.5 h-3.5"/></button></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2"><label className={lbl}>제목</label><input className={inp} value={w.title} onChange={e=>{const a=[...(draft.portfolioWorks||[])];a[i]={...a[i],title:e.target.value};setDraft({...draft,portfolioWorks:a});}}/></div>
                    <div><label className={lbl}>카테고리</label><input className={inp} value={w.category} onChange={e=>{const a=[...(draft.portfolioWorks||[])];a[i]={...a[i],category:e.target.value};setDraft({...draft,portfolioWorks:a});}}/></div>
                    <div><label className={lbl}>타입</label>
                      <select className={inp+" cursor-pointer text-xs"} value={w.workType||"image"} onChange={e=>{const a=[...(draft.portfolioWorks||[])];a[i]={...a[i],workType:e.target.value as any,videoBase64:undefined};setDraft({...draft,portfolioWorks:a});}}>
                        <option value="image">이미지</option><option value="video">동영상</option>
                      </select>
                    </div>
                    <div className="col-span-2"><label className={lbl}>설명</label><textarea rows={2} className={inp+" resize-none"} value={w.description} onChange={e=>{const a=[...(draft.portfolioWorks||[])];a[i]={...a[i],description:e.target.value};setDraft({...draft,portfolioWorks:a});}}/></div>
                  </div>

                  {/* 이미지 업로드 */}
                  {w.workType!=="video" && (
                    <div>
                      <label className={lbl}>이미지</label>
                      <div className="flex gap-3 items-center mb-2">
                        {w.imageUrl && <img src={w.imageUrl} className="w-16 h-12 rounded-lg object-cover border border-sky-200" alt="prev" onError={e=>(e.currentTarget.style.display="none")}/>}
                        <label className="flex items-center gap-2 px-3 py-2 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-600 cursor-pointer hover:bg-sky-100 font-bold">
                          <Upload className="w-3.5 h-3.5"/>이미지 업로드
                          <input type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)compress(f,1000,1050,b=>{const a=[...(draft.portfolioWorks||[])];a[i]={...a[i],imageUrl:b};setDraft({...draft,portfolioWorks:a});});}}/>
                        </label>
                      </div>
                      <input type="text" className={inp} placeholder="또는 이미지 URL 입력" value={w.imageUrl} onChange={e=>{const a=[...(draft.portfolioWorks||[])];a[i]={...a[i],imageUrl:e.target.value};setDraft({...draft,portfolioWorks:a});}}/>
                    </div>
                  )}

                  {/* 동영상 업로드 */}
                  {w.workType==="video" && (
                    <div className="space-y-2">
                      <label className={lbl}><Film className="w-3 h-3 inline mr-1"/>동영상 (컴퓨터에서 직접 업로드)</label>
                      <label className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-600 cursor-pointer hover:bg-purple-100 font-bold w-fit">
                        <Upload className="w-3.5 h-3.5"/>동영상 파일 업로드 (mp4, mov 등)
                        <input type="file" accept="video/*" className="hidden" onChange={e=>{
                          const f=e.target.files?.[0]; if(!f) return;
                          if(f.size > 50*1024*1024){alert("50MB 이하 파일만 업로드 가능합니다.");return;}
                          const r=new FileReader();
                          r.onload=ev=>{const a=[...(draft.portfolioWorks||[])];a[i]={...a[i],videoBase64:ev.target?.result as string,imageUrl:a[i].imageUrl||""};setDraft({...draft,portfolioWorks:a});};
                          r.readAsDataURL(f);
                        }}/>
                      </label>
                      {w.videoBase64 && <p className="text-xs text-emerald-600 font-bold">✓ 동영상 업로드 완료</p>}
                      <div>
                        <label className={lbl}>또는 URL 입력 (YouTube, Vimeo 등)</label>
                        <input type="text" className={inp} placeholder="https://youtube.com/watch?v=..." value={w.videoUrl||""} onChange={e=>{const a=[...(draft.portfolioWorks||[])];a[i]={...a[i],videoUrl:e.target.value};setDraft({...draft,portfolioWorks:a});}}/>
                      </div>
                      <div>
                        <label className={lbl}>썸네일 이미지</label>
                        <div className="flex gap-2 items-center">
                          {w.imageUrl && <img src={w.imageUrl} className="w-14 h-10 rounded-lg object-cover border border-sky-200" alt="thumb" onError={e=>(e.currentTarget.style.display="none")}/>}
                          <label className="flex items-center gap-2 px-3 py-2 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-600 cursor-pointer hover:bg-sky-100 font-bold">
                            <Upload className="w-3 h-3"/>썸네일 업로드
                            <input type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)compress(f,600,400,b=>{const a=[...(draft.portfolioWorks||[])];a[i]={...a[i],imageUrl:b};setDraft({...draft,portfolioWorks:a});});}}/>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ══ 일괄 업로드 ══ */}
          {tab==="bulk" && (
            <BulkUploadTab draft={draft} setDraft={setDraft} compress={compress} />
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
      </div>
    </motion.div>
  );
}
