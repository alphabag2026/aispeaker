import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  // Create table if not exists
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS lectureFormatTemplates (
      id int AUTO_INCREMENT NOT NULL,
      name varchar(255) NOT NULL,
      description text,
      category enum('personnel','style','insert') NOT NULL,
      icon varchar(64),
      colorTheme varchar(64) DEFAULT 'blue',
      personnelConfig json,
      styleConfig json,
      insertElements json,
      defaultScriptTemplate text,
      previewImageUrl text,
      sortOrder int DEFAULT 0,
      isActive boolean DEFAULT true,
      isSystem boolean DEFAULT true,
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT lectureFormatTemplates_id PRIMARY KEY(id)
    )
  `);
  console.log("Table created/verified");

  // Check if seed data already exists
  const [rows] = await conn.execute("SELECT COUNT(*) as cnt FROM lectureFormatTemplates WHERE isSystem = true");
  if (rows[0].cnt > 0) {
    console.log("Seed data already exists, skipping");
    await conn.end();
    return;
  }

  // ============ PERSONNEL TEMPLATES ============
  const personnelTemplates = [
    {
      name: "강사 단독",
      description: "강사 1명이 단독으로 진행하는 기본 강의 형태입니다. PPT 또는 화이트보드와 함께 사용할 수 있습니다.",
      category: "personnel",
      icon: "User",
      colorTheme: "blue",
      personnelConfig: JSON.stringify([
        { role: "instructor", label: "강사", count: 1, required: true }
      ]),
      styleConfig: JSON.stringify({ layoutType: "single", avatarPosition: "bottom-right", avatarSize: "medium" }),
      insertElements: null,
      defaultScriptTemplate: "안녕하세요, 오늘 강의를 진행할 [강사명]입니다.\n\n[강의 주제]에 대해 알아보겠습니다.\n\n---\n\n[본문 내용]\n\n---\n\n오늘 강의를 마치겠습니다. 감사합니다.",
      sortOrder: 1,
    },
    {
      name: "강사 + MC + 통역 (3인 구성)",
      description: "강사, 사회자(MC), 통역사 3명이 함께 진행하는 국제 강의 포맷입니다. 다국어 강의에 적합합니다.",
      category: "personnel",
      icon: "Users",
      colorTheme: "purple",
      personnelConfig: JSON.stringify([
        { role: "instructor", label: "강사", count: 1, required: true },
        { role: "host", label: "MC (사회자)", count: 1, required: true },
        { role: "translator", label: "통역사", count: 1, required: true }
      ]),
      styleConfig: JSON.stringify({ layoutType: "multi", avatarPosition: "bottom-right", avatarSize: "small" }),
      insertElements: JSON.stringify([
        { type: "intro", label: "MC 오프닝", defaultDuration: 30, position: "start" },
        { type: "transition", label: "통역 전환", defaultDuration: 5, position: "between" },
        { type: "outro", label: "MC 클로징", defaultDuration: 30, position: "end" }
      ]),
      defaultScriptTemplate: "[MC] 안녕하세요, 오늘 강의의 사회를 맡은 [MC명]입니다.\n오늘은 [강사명] 강사님을 모시고 [주제]에 대해 알아보겠습니다.\n\n[강사] 감사합니다. [주제]에 대해 설명드리겠습니다.\n\n[통역] (통역 내용)\n\n---\n\n[MC] 오늘 강의를 마치겠습니다. 감사합니다.",
      sortOrder: 2,
    },
    {
      name: "강사 + 게스트 대담",
      description: "강사와 게스트가 대담 형식으로 진행하는 인터뷰/토크쇼 스타일 강의입니다.",
      category: "personnel",
      icon: "MessageSquare",
      colorTheme: "green",
      personnelConfig: JSON.stringify([
        { role: "instructor", label: "진행자", count: 1, required: true },
        { role: "guest", label: "게스트", count: 1, required: true }
      ]),
      styleConfig: JSON.stringify({ layoutType: "split", avatarPosition: "bottom-center", avatarSize: "medium" }),
      insertElements: JSON.stringify([
        { type: "intro", label: "게스트 소개", defaultDuration: 20, position: "start" },
        { type: "qa", label: "Q&A 세션", defaultDuration: 60, position: "middle" }
      ]),
      defaultScriptTemplate: "[진행자] 안녕하세요, 오늘은 특별한 게스트를 모셨습니다.\n[게스트명]님을 소개합니다.\n\n[게스트] 안녕하세요, 반갑습니다.\n\n[진행자] 먼저 [주제]에 대해 어떻게 생각하시나요?\n\n[게스트] ...\n\n---\n\n[진행자] 좋은 말씀 감사합니다.",
      sortOrder: 3,
    },
    {
      name: "패널 토론 (4인)",
      description: "진행자 1명과 패널 3명이 참여하는 토론 형식입니다. 다양한 관점을 제시하는 강의에 적합합니다.",
      category: "personnel",
      icon: "UsersRound",
      colorTheme: "orange",
      personnelConfig: JSON.stringify([
        { role: "host", label: "진행자", count: 1, required: true },
        { role: "panelist", label: "패널리스트", count: 3, required: true }
      ]),
      styleConfig: JSON.stringify({ layoutType: "grid", avatarPosition: "bottom-center", avatarSize: "small" }),
      insertElements: JSON.stringify([
        { type: "intro", label: "패널 소개", defaultDuration: 40, position: "start" },
        { type: "topic", label: "주제 전환", defaultDuration: 10, position: "between" },
        { type: "vote", label: "투표/의견 정리", defaultDuration: 20, position: "end" }
      ]),
      defaultScriptTemplate: "[진행자] 안녕하세요, 오늘의 토론 주제는 [주제]입니다.\n패널을 소개하겠습니다.\n\n[패널1] 안녕하세요, [소속/직함]의 [이름]입니다.\n[패널2] 안녕하세요, [소속/직함]의 [이름]입니다.\n[패널3] 안녕하세요, [소속/직함]의 [이름]입니다.\n\n[진행자] 첫 번째 질문입니다...",
      sortOrder: 4,
    },
  ];

  // ============ STYLE TEMPLATES ============
  const styleTemplates = [
    {
      name: "PPT 슬라이드 강의",
      description: "PPT/PDF 슬라이드를 배경으로 강사가 설명하는 가장 일반적인 강의 형태입니다.",
      category: "style",
      icon: "Presentation",
      colorTheme: "blue",
      personnelConfig: null,
      styleConfig: JSON.stringify({ layoutType: "slides", hasSlides: true, hasWhiteboard: false, hasPIP: true, avatarPosition: "bottom-right", avatarSize: "medium", slideTransition: "fade" }),
      insertElements: null,
      defaultScriptTemplate: null,
      sortOrder: 10,
    },
    {
      name: "화이트보드 강의",
      description: "화이트보드에 직접 그리며 설명하는 강의 형태입니다. 수학, 과학 등 시각적 설명이 필요한 강의에 적합합니다.",
      category: "style",
      icon: "PenTool",
      colorTheme: "green",
      personnelConfig: null,
      styleConfig: JSON.stringify({ layoutType: "whiteboard", hasSlides: false, hasWhiteboard: true, hasPIP: true, avatarPosition: "bottom-left", avatarSize: "small", bgColor: "#ffffff" }),
      insertElements: null,
      defaultScriptTemplate: null,
      sortOrder: 11,
    },
    {
      name: "PPT + 화이트보드 혼합",
      description: "슬라이드 설명과 화이트보드 필기를 번갈아 사용하는 혼합형 강의입니다.",
      category: "style",
      icon: "LayoutPanelLeft",
      colorTheme: "purple",
      personnelConfig: null,
      styleConfig: JSON.stringify({ layoutType: "hybrid", hasSlides: true, hasWhiteboard: true, hasPIP: true, avatarPosition: "bottom-right", avatarSize: "small", slideTransition: "slide" }),
      insertElements: null,
      defaultScriptTemplate: null,
      sortOrder: 12,
    },
    {
      name: "전면 강사 (토크쇼)",
      description: "강사가 화면 전체에 나오는 토크쇼 스타일입니다. 배경 이미지를 설정할 수 있습니다.",
      category: "style",
      icon: "Monitor",
      colorTheme: "red",
      personnelConfig: null,
      styleConfig: JSON.stringify({ layoutType: "fullscreen", hasSlides: false, hasWhiteboard: false, hasPIP: false, avatarPosition: "center", avatarSize: "large", bgType: "virtual" }),
      insertElements: null,
      defaultScriptTemplate: null,
      sortOrder: 13,
    },
    {
      name: "화면 공유 + 해설",
      description: "화면 녹화/데모 영상 위에 강사가 해설하는 형태입니다. 소프트웨어 튜토리얼에 적합합니다.",
      category: "style",
      icon: "ScreenShare",
      colorTheme: "cyan",
      personnelConfig: null,
      styleConfig: JSON.stringify({ layoutType: "screencast", hasSlides: false, hasWhiteboard: false, hasPIP: true, avatarPosition: "bottom-right", avatarSize: "small", screenSource: "upload" }),
      insertElements: null,
      defaultScriptTemplate: null,
      sortOrder: 14,
    },
  ];

  // ============ INSERT ELEMENT TEMPLATES ============
  const insertTemplates = [
    {
      name: "질문자 삽입",
      description: "강의 중간에 청중의 질문을 삽입합니다. 질문자 아바타가 등장하여 질문하고 강사가 답변합니다.",
      category: "insert",
      icon: "HelpCircle",
      colorTheme: "yellow",
      personnelConfig: JSON.stringify([
        { role: "questioner", label: "질문자", count: 1, required: false }
      ]),
      styleConfig: JSON.stringify({ layoutType: "overlay", position: "bottom-left", size: "small", animation: "slide-in" }),
      insertElements: JSON.stringify([
        { type: "question", label: "질문", defaultDuration: 15, position: "any" },
        { type: "answer", label: "답변", defaultDuration: 30, position: "after-question" }
      ]),
      defaultScriptTemplate: "[질문자] [질문 내용을 입력하세요]\n\n[강사] 좋은 질문입니다. [답변 내용을 입력하세요]",
      sortOrder: 20,
    },
    {
      name: "휴식/전환 화면",
      description: "강의 중간에 잠시 쉬어가는 화면을 삽입합니다. 타이머와 배경음악을 설정할 수 있습니다.",
      category: "insert",
      icon: "Coffee",
      colorTheme: "amber",
      personnelConfig: null,
      styleConfig: JSON.stringify({ layoutType: "break", bgType: "gradient", showTimer: true, defaultBgMusic: true }),
      insertElements: JSON.stringify([
        { type: "break", label: "휴식 시간", defaultDuration: 60, position: "any" }
      ]),
      defaultScriptTemplate: null,
      sortOrder: 21,
    },
    {
      name: "데모 영상 삽입",
      description: "강의 중간에 사전 녹화된 데모 영상이나 외부 영상을 삽입합니다.",
      category: "insert",
      icon: "Film",
      colorTheme: "indigo",
      personnelConfig: null,
      styleConfig: JSON.stringify({ layoutType: "video-insert", fullscreen: true, showControls: false }),
      insertElements: JSON.stringify([
        { type: "demo", label: "데모 영상", defaultDuration: 120, position: "any" }
      ]),
      defaultScriptTemplate: "[강사] 이제 실제 데모를 보여드리겠습니다.\n\n(데모 영상 재생)\n\n[강사] 보신 것처럼...",
      sortOrder: 22,
    },
    {
      name: "요약 슬라이드",
      description: "섹션이 끝날 때마다 핵심 내용을 정리하는 요약 슬라이드를 삽입합니다.",
      category: "insert",
      icon: "ListChecks",
      colorTheme: "teal",
      personnelConfig: null,
      styleConfig: JSON.stringify({ layoutType: "summary", bgType: "branded", animation: "fade-in" }),
      insertElements: JSON.stringify([
        { type: "summary", label: "핵심 요약", defaultDuration: 20, position: "section-end" }
      ]),
      defaultScriptTemplate: "[강사] 지금까지 배운 내용을 정리하겠습니다.\n\n핵심 포인트 1: ...\n핵심 포인트 2: ...\n핵심 포인트 3: ...",
      sortOrder: 23,
    },
    {
      name: "퀴즈/투표",
      description: "강의 중간에 퀴즈나 투표를 삽입하여 참여도를 높입니다.",
      category: "insert",
      icon: "CircleHelp",
      colorTheme: "pink",
      personnelConfig: null,
      styleConfig: JSON.stringify({ layoutType: "quiz", showTimer: true, showOptions: true }),
      insertElements: JSON.stringify([
        { type: "quiz", label: "퀴즈", defaultDuration: 30, position: "any" }
      ]),
      defaultScriptTemplate: "[강사] 여기서 간단한 퀴즈를 풀어보겠습니다.\n\n질문: [질문 내용]\n\nA) [보기1]\nB) [보기2]\nC) [보기3]\nD) [보기4]\n\n[강사] 정답은... [정답]입니다!",
      sortOrder: 24,
    },
    {
      name: "인트로/아웃트로",
      description: "강의 시작과 끝에 브랜딩된 인트로/아웃트로 영상을 삽입합니다.",
      category: "insert",
      icon: "Clapperboard",
      colorTheme: "violet",
      personnelConfig: null,
      styleConfig: JSON.stringify({ layoutType: "branded", bgType: "video", showLogo: true }),
      insertElements: JSON.stringify([
        { type: "intro", label: "인트로", defaultDuration: 10, position: "start" },
        { type: "outro", label: "아웃트로", defaultDuration: 15, position: "end" }
      ]),
      defaultScriptTemplate: null,
      sortOrder: 25,
    },
  ];

  const allTemplates = [...personnelTemplates, ...styleTemplates, ...insertTemplates];
  
  for (const t of allTemplates) {
    await conn.execute(
      `INSERT INTO lectureFormatTemplates (name, description, category, icon, colorTheme, personnelConfig, styleConfig, insertElements, defaultScriptTemplate, sortOrder, isActive, isSystem) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, true)`,
      [t.name, t.description, t.category, t.icon, t.colorTheme, t.personnelConfig, t.styleConfig ? JSON.stringify(JSON.parse(t.styleConfig)) : null, t.insertElements ? JSON.stringify(JSON.parse(t.insertElements)) : null, t.defaultScriptTemplate, t.sortOrder]
    );
  }
  
  console.log(`Inserted ${allTemplates.length} format templates`);
  await conn.end();
}

main().catch(console.error);
