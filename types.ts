export interface Profile {
  name: string; engName: string; title: string;
  headline: string; subHeadline: string; idPhoto?: string; logo?: string;
}
export interface Stat { id: string; value: string; label: string; }
export interface CoreStrength { id: string; title: string; subtitle: string; points: string[]; }
export interface Project {
  id: string; title: string; category: string; tagline: string;
  problem: string; strategy: string; results: string[];
  imageType: "social"|"ad"|"shortform"|"figma";
}
export interface ProcessStep { id: string; phase: string; title: string; desc: string; }
export interface Skill { id: string; category: "Design"|"Video"|"Marketing"; name: string; rating: number; }
export interface Career { id: string; period: string; company: string; role: string; details: string[]; }
export interface Contact { email: string; phone?: string; }
export interface PortfolioWork {
  id: string; title: string; category: string; description: string;
  imageUrl: string; workType?: "image"|"video"; videoUrl?: string; videoBase64?: string;
}
export interface Tool { id: string; name: string; iconUrl: string; }

export interface TextStyle {
  fontSize?: string; fontWeight?: string; lineBreak?: boolean;
}
export interface SectionHeader {
  badge: string; title: string; subtitle: string;
  titleStyle?: TextStyle; subtitleStyle?: TextStyle;
  visible?: boolean;
}
export interface SectionHeaders {
  about: SectionHeader; projects: SectionHeader; process: SectionHeader;
  portfolio: SectionHeader; skills: SectionHeader; career: SectionHeader; contact: SectionHeader;
}

export interface DesignSettings {
  // 색상
  primaryColor: string;      // 포인트 컬러
  bgColor: string;           // 배경색
  textColor: string;         // 텍스트 기본색
  cardBgColor: string;       // 카드 배경색
  navBgColor: string;        // 네비 배경색
  // 버튼
  btnPrimaryColor: string;
  btnPrimaryText: string;
  btnPrimaryLabel: string;   // 버튼 텍스트
  btnSecondaryColor: string;
  btnSecondaryLabel: string;
  // 배경
  heroBgType: "gradient"|"color"|"image";
  heroBgValue: string;       // 색상 hex 또는 base64
  // 섹션 순서
  sectionOrder: string[];
  // 전체 폰트 크기
  globalFontSize: string;    // "sm"|"base"|"lg"
}

export interface PortfolioData {
  profile: Profile; stats: Stat[]; strengths: CoreStrength[]; projects: Project[];
  processSteps: ProcessStep[]; skills: Skill[]; careers: Career[]; contact: Contact;
  portfolioWorks: PortfolioWork[];
  whyMe: { title: string; description: string; points: string[]; };
  tools?: Tool[]; sections?: SectionHeaders;
  design?: DesignSettings;
}
