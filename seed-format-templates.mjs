import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Personnel templates
const personnelTemplates = [
  {
    name: "1인 강사",
    description: "강사 1명이 단독으로 진행하는 기본 강의 형태입니다.",
    type: "PERSONNEL",
    icon: "User",
    themeColor: "blue",
    isRecommended: true,
    personnelConfig: JSON.stringify([{ role: "instructor", label: "강사", count: 1 }]),
    structure: "[]",
    category: "general",
    difficulty: "beginner",
    isBuiltIn: true,
  },
  {
    name: "강사 + MC",
    description: "강사와 MC가 함께 진행하는 대담형 강의입니다.",
    type: "PERSONNEL",
    icon: "Users",
    themeColor: "purple",
    isRecommended: false,
    personnelConfig: JSON.stringify([
      { role: "instructor", label: "강사", count: 1 },
      { role: "mc", label: "MC", count: 1 }
    ]),
    structure: "[]",
    category: "general",
    difficulty: "beginner",
    isBuiltIn: true,
  },
  {
    name: "패널 토론",
    description: "MC 1명과 패널리스트 2~3명이 참여하는 토론 형태입니다.",
    type: "PERSONNEL",
    icon: "UsersRound",
    themeColor: "cyan",
    isRecommended: false,
    personnelConfig: JSON.stringify([
      { role: "mc", label: "MC", count: 1 },
      { role: "panelist", label: "패널리스트", count: 3 }
    ]),
    structure: "[]",
    category: "general",
    difficulty: "intermediate",
    isBuiltIn: true,
  },
  {
    name: "강사 + 통역사",
    description: "강사와 통역사가 함께 진행하는 다국어 강의입니다.",
    type: "PERSONNEL",
    icon: "MessageSquare",
    themeColor: "green",
    isRecommended: false,
    personnelConfig: JSON.stringify([
      { role: "instructor", label: "강사", count: 1 },
      { role: "translator", label: "통역사", count: 1 }
    ]),
    structure: "[]",
    category: "general",
    difficulty: "beginner",
    isBuiltIn: true,
  },
];

// Style templates
const styleTemplates = [
  {
    name: "전면 강사 뷰",
    description: "강사가 화면 전체에 나오는 기본 레이아웃입니다.",
    type: "STYLE",
    icon: "Monitor",
    themeColor: "blue",
    isRecommended: true,
    styleConfig: JSON.stringify({ hasSlides: false, hasWhiteboard: false, hasPIP: false, layoutType: "fullscreen" }),
    structure: "[]",
    category: "general",
    difficulty: "beginner",
    isBuiltIn: true,
  },
  {
    name: "슬라이드 + 강사 PIP",
    description: "PPT 슬라이드가 메인이고 강사가 작은 화면으로 나옵니다.",
    type: "STYLE",
    icon: "Presentation",
    themeColor: "green",
    isRecommended: true,
    styleConfig: JSON.stringify({ hasSlides: true, hasWhiteboard: false, hasPIP: true, layoutType: "split" }),
    structure: "[]",
    category: "general",
    difficulty: "beginner",
    isBuiltIn: true,
  },
  {
    name: "슬라이드 전체 화면",
    description: "PPT 슬라이드만 전체 화면으로 표시합니다.",
    type: "STYLE",
    icon: "LayoutPanelLeft",
    themeColor: "indigo",
    isRecommended: false,
    styleConfig: JSON.stringify({ hasSlides: true, hasWhiteboard: false, hasPIP: false, layoutType: "fullscreen" }),
    structure: "[]",
    category: "general",
    difficulty: "beginner",
    isBuiltIn: true,
  },
  {
    name: "화이트보드 강의",
    description: "화이트보드에 직접 그리며 설명하는 강의 스타일입니다.",
    type: "STYLE",
    icon: "PenTool",
    themeColor: "amber",
    isRecommended: false,
    styleConfig: JSON.stringify({ hasSlides: false, hasWhiteboard: true, hasPIP: true, layoutType: "split" }),
    structure: "[]",
    category: "general",
    difficulty: "intermediate",
    isBuiltIn: true,
  },
  {
    name: "화면 공유",
    description: "화면 공유와 강사 PIP를 함께 사용하는 레이아웃입니다.",
    type: "STYLE",
    icon: "ScreenShare",
    themeColor: "violet",
    isRecommended: false,
    styleConfig: JSON.stringify({ hasSlides: false, hasWhiteboard: false, hasPIP: true, layoutType: "screenShare" }),
    structure: "[]",
    category: "general",
    difficulty: "beginner",
    isBuiltIn: true,
  },
];

// Insert templates
const insertTemplates = [
  {
    name: "Q&A 세션",
    description: "강의 중간이나 끝에 질의응답 시간을 추가합니다.",
    type: "INSERT",
    icon: "HelpCircle",
    themeColor: "orange",
    isRecommended: true,
    insertElements: JSON.stringify([{ type: "qa", label: "Q&A", position: "end", duration: 10 }]),
    structure: "[]",
    category: "general",
    difficulty: "beginner",
    isBuiltIn: true,
  },
  {
    name: "쉬는 시간",
    description: "긴 강의 중간에 휴식 시간을 삽입합니다.",
    type: "INSERT",
    icon: "Coffee",
    themeColor: "amber",
    isRecommended: false,
    insertElements: JSON.stringify([{ type: "break", label: "쉬는 시간", position: "middle", duration: 5 }]),
    structure: "[]",
    category: "general",
    difficulty: "beginner",
    isBuiltIn: true,
  },
  {
    name: "영상 클립 삽입",
    description: "강의 중간에 참고 영상을 삽입합니다.",
    type: "INSERT",
    icon: "Film",
    themeColor: "red",
    isRecommended: false,
    insertElements: JSON.stringify([{ type: "video", label: "영상 클립", position: "any", duration: 3 }]),
    structure: "[]",
    category: "general",
    difficulty: "beginner",
    isBuiltIn: true,
  },
  {
    name: "실습/퀴즈",
    description: "수강생이 직접 참여하는 실습이나 퀴즈를 추가합니다.",
    type: "INSERT",
    icon: "ListChecks",
    themeColor: "teal",
    isRecommended: false,
    insertElements: JSON.stringify([{ type: "practice", label: "실습/퀴즈", position: "any", duration: 10 }]),
    structure: "[]",
    category: "general",
    difficulty: "intermediate",
    isBuiltIn: true,
  },
];

const allTemplates = [...personnelTemplates, ...styleTemplates, ...insertTemplates];

for (const t of allTemplates) {
  try {
    await conn.execute(
      `INSERT INTO scriptTemplates (name, description, type, icon, themeColor, isRecommended, personnelConfig, styleConfig, insertElements, structure, category, difficulty, isBuiltIn) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [t.name, t.description, t.type, t.icon, t.themeColor, t.isRecommended || false, t.personnelConfig || null, t.styleConfig || null, t.insertElements || null, t.structure, t.category, t.difficulty, t.isBuiltIn]
    );
    console.log(`OK: ${t.type} - ${t.name}`);
  } catch (e) {
    console.log(`ERR: ${t.name} - ${e.message.substring(0, 80)}`);
  }
}

await conn.end();
console.log("Done! Seeded format templates.");
