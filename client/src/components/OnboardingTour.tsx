import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, FileText, Image, Layers, Eye,
  ChevronRight, ChevronLeft, X, Sparkles, Rocket
} from "lucide-react";
import { useLanguage, registerTranslations } from "@/contexts/LanguageContext";

// ============ i18n ============
registerTranslations("ko", {
  "onboarding.welcome": "강의 제작에 오신 것을 환영합니다!",
  "onboarding.welcomeDesc": "5단계로 AI 강의 영상을 쉽게 만들 수 있습니다. 각 단계를 안내해 드릴게요.",
  "onboarding.step1Title": "Step 1: 아바타 선택",
  "onboarding.step1Desc": "강의에 등장할 AI 아바타를 선택하세요. 프리셋에서 고르거나, 사진을 업로드하거나, AI로 새로운 얼굴을 생성할 수 있습니다. 이름, 역할, 음성도 커스터마이징 가능합니다.",
  "onboarding.step2Title": "Step 2: 스크립트 작성",
  "onboarding.step2Desc": "강의 스크립트를 작성하세요. AI가 주제에 맞는 스크립트를 자동 생성하거나, 직접 입력할 수 있습니다. 섹션별로 아바타를 지정하고, AI 교정/개선 기능을 활용하세요.",
  "onboarding.step3Title": "Step 3: 슬라이드 업로드",
  "onboarding.step3Desc": "강의에 사용할 슬라이드를 업로드하세요. PDF나 이미지 파일을 지원하며, 업로드 후 각 슬라이드를 스크립트 섹션과 매칭할 수 있습니다.",
  "onboarding.step4Title": "Step 4: 매칭 에디터",
  "onboarding.step4Desc": "슬라이드와 스크립트를 연결하는 타임라인 에디터입니다. 각 섹션에 맞는 슬라이드를 배치하고, 아바타 위치와 크기를 조정하세요. 주석 도구로 강조 표시도 가능합니다.",
  "onboarding.step5Title": "Step 5: 미리보기 & 생성",
  "onboarding.step5Desc": "최종 결과물을 미리보기하고, AI 영상을 생성하세요. 생성된 영상은 다운로드하거나 외부 플랫폼에서 사용할 수 있습니다.",
  "onboarding.next": "다음",
  "onboarding.prev": "이전",
  "onboarding.skip": "건너뛰기",
  "onboarding.finish": "시작하기",
  "onboarding.stepOf": "/ 6",
  "onboarding.dontShowAgain": "다시 보지 않기",
  "onboarding.tip": "팁",
  "onboarding.step1Tip": "최대 3명의 아바타를 추가하여 대화형 강의를 만들 수 있습니다.",
  "onboarding.step2Tip": "AI 자동 완성 기능으로 스크립트를 더 빠르게 작성하세요.",
  "onboarding.step3Tip": "슬라이드가 없어도 AI가 자동으로 배경을 생성합니다.",
  "onboarding.step4Tip": "드래그 앤 드롭으로 슬라이드 순서를 쉽게 변경할 수 있습니다.",
  "onboarding.step5Tip": "영상 생성에는 보통 2~5분이 소요됩니다.",
});

registerTranslations("en", {
  "onboarding.welcome": "Welcome to Lecture Builder!",
  "onboarding.welcomeDesc": "Create AI lecture videos in 5 easy steps. Let us guide you through each one.",
  "onboarding.step1Title": "Step 1: Choose Avatar",
  "onboarding.step1Desc": "Select an AI avatar for your lecture. Pick from presets, upload a photo, or generate a new face with AI. Customize name, role, and voice.",
  "onboarding.step2Title": "Step 2: Write Script",
  "onboarding.step2Desc": "Write your lecture script. AI can auto-generate scripts based on your topic, or type manually. Assign avatars per section and use AI proofreading.",
  "onboarding.step3Title": "Step 3: Upload Slides",
  "onboarding.step3Desc": "Upload slides for your lecture. Supports PDF and image files. After uploading, match each slide to a script section.",
  "onboarding.step4Title": "Step 4: Matching Editor",
  "onboarding.step4Desc": "Timeline editor to connect slides and scripts. Place slides for each section, adjust avatar position and size. Use annotation tools for highlights.",
  "onboarding.step5Title": "Step 5: Preview & Generate",
  "onboarding.step5Desc": "Preview the final result and generate your AI video. Download or use on external platforms.",
  "onboarding.next": "Next",
  "onboarding.prev": "Previous",
  "onboarding.skip": "Skip",
  "onboarding.finish": "Get Started",
  "onboarding.stepOf": "/ 6",
  "onboarding.dontShowAgain": "Don't show again",
  "onboarding.tip": "Tip",
  "onboarding.step1Tip": "Add up to 3 avatars for interactive multi-speaker lectures.",
  "onboarding.step2Tip": "Use AI autocomplete to write scripts faster.",
  "onboarding.step3Tip": "No slides? AI will auto-generate backgrounds for you.",
  "onboarding.step4Tip": "Drag and drop to easily reorder slides.",
  "onboarding.step5Tip": "Video generation typically takes 2-5 minutes.",
});

registerTranslations("ja", {
  "onboarding.welcome": "講義ビルダーへようこそ！",
  "onboarding.welcomeDesc": "5つのステップでAI講義動画を簡単に作成できます。各ステップをご案内します。",
  "onboarding.step1Title": "Step 1: アバター選択",
  "onboarding.step1Desc": "講義に登場するAIアバターを選択してください。プリセットから選ぶか、写真をアップロードするか、AIで新しい顔を生成できます。",
  "onboarding.step2Title": "Step 2: スクリプト作成",
  "onboarding.step2Desc": "講義スクリプトを作成してください。AIがトピックに合わせて自動生成するか、手動で入力できます。",
  "onboarding.step3Title": "Step 3: スライドアップロード",
  "onboarding.step3Desc": "講義用のスライドをアップロードしてください。PDFや画像ファイルに対応しています。",
  "onboarding.step4Title": "Step 4: マッチングエディター",
  "onboarding.step4Desc": "スライドとスクリプトを接続するタイムラインエディターです。各セクションにスライドを配置してください。",
  "onboarding.step5Title": "Step 5: プレビュー＆生成",
  "onboarding.step5Desc": "最終結果をプレビューし、AI動画を生成してください。",
  "onboarding.next": "次へ",
  "onboarding.prev": "前へ",
  "onboarding.skip": "スキップ",
  "onboarding.finish": "始める",
  "onboarding.stepOf": "/ 6",
  "onboarding.dontShowAgain": "再表示しない",
  "onboarding.tip": "ヒント",
  "onboarding.step1Tip": "最大3人のアバターを追加してインタラクティブな講義を作成できます。",
  "onboarding.step2Tip": "AI自動補完機能でスクリプトをより速く作成できます。",
  "onboarding.step3Tip": "スライドがなくてもAIが自動的に背景を生成します。",
  "onboarding.step4Tip": "ドラッグ＆ドロップでスライドの順序を簡単に変更できます。",
  "onboarding.step5Tip": "動画生成には通常2〜5分かかります。",
});

registerTranslations("zh", {
  "onboarding.welcome": "欢迎使用讲座构建器！",
  "onboarding.welcomeDesc": "通过5个简单步骤创建AI讲座视频。让我们引导您完成每一步。",
  "onboarding.step1Title": "Step 1: 选择头像",
  "onboarding.step1Desc": "选择讲座中出现的AI头像。从预设中选择、上传照片或用AI生成新面孔。可自定义名称、角色和语音。",
  "onboarding.step2Title": "Step 2: 编写脚本",
  "onboarding.step2Desc": "编写讲座脚本。AI可根据主题自动生成脚本，也可手动输入。为每个部分分配头像并使用AI校对功能。",
  "onboarding.step3Title": "Step 3: 上传幻灯片",
  "onboarding.step3Desc": "上传讲座用的幻灯片。支持PDF和图片文件。上传后将每张幻灯片与脚本部分匹配。",
  "onboarding.step4Title": "Step 4: 匹配编辑器",
  "onboarding.step4Desc": "连接幻灯片和脚本的时间轴编辑器。为每个部分放置幻灯片，调整头像位置和大小。",
  "onboarding.step5Title": "Step 5: 预览和生成",
  "onboarding.step5Desc": "预览最终结果并生成AI视频。可下载或在外部平台使用。",
  "onboarding.next": "下一步",
  "onboarding.prev": "上一步",
  "onboarding.skip": "跳过",
  "onboarding.finish": "开始",
  "onboarding.stepOf": "/ 6",
  "onboarding.dontShowAgain": "不再显示",
  "onboarding.tip": "提示",
  "onboarding.step1Tip": "最多添加3个头像，创建互动式多人讲座。",
  "onboarding.step2Tip": "使用AI自动补全功能更快地编写脚本。",
  "onboarding.step3Tip": "没有幻灯片？AI会自动生成背景。",
  "onboarding.step4Tip": "拖放即可轻松重新排列幻灯片。",
  "onboarding.step5Tip": "视频生成通常需要2-5分钟。",
});

const STORAGE_KEY = "aispeaker-onboarding-completed";

const STEP_ICONS = [Rocket, Users, FileText, Image, Layers, Eye];
const STEP_COLORS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-indigo-500 to-blue-600",
];

interface Props {
  onComplete: () => void;
  forceShow?: boolean;
}

export default function OnboardingTour({ onComplete, forceShow }: Props) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dontShow, setDontShow] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (forceShow) {
      setVisible(true);
      setStep(0);
      return;
    }
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      setVisible(true);
    }
  }, [forceShow]);

  const steps = [
    { titleKey: "onboarding.welcome", descKey: "onboarding.welcomeDesc", tipKey: "" },
    { titleKey: "onboarding.step1Title", descKey: "onboarding.step1Desc", tipKey: "onboarding.step1Tip" },
    { titleKey: "onboarding.step2Title", descKey: "onboarding.step2Desc", tipKey: "onboarding.step2Tip" },
    { titleKey: "onboarding.step3Title", descKey: "onboarding.step3Desc", tipKey: "onboarding.step3Tip" },
    { titleKey: "onboarding.step4Title", descKey: "onboarding.step4Desc", tipKey: "onboarding.step4Tip" },
    { titleKey: "onboarding.step5Title", descKey: "onboarding.step5Desc", tipKey: "onboarding.step5Tip" },
  ];

  const handleClose = useCallback(() => {
    if (dontShow) {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    setVisible(false);
    onComplete();
  }, [dontShow, onComplete]);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem(STORAGE_KEY, "true");
      setVisible(false);
      onComplete();
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  if (!visible) return null;

  const currentStep = steps[step];
  const StepIcon = STEP_ICONS[step];
  const gradientColor = STEP_COLORS[step];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Card */}
      <div ref={cardRef} className="relative z-10 w-full max-w-lg mx-4 animate-in zoom-in-95 duration-300">
        <Card className="overflow-hidden border-0 shadow-2xl">
          {/* Gradient Header */}
          <div className={`bg-gradient-to-r ${gradientColor} p-6 pb-8 relative overflow-hidden`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_70%)]" />
            <button
              className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors"
              onClick={handleClose}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                <StepIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <Badge className="bg-white/20 text-white border-0 text-[10px] mb-1">
                  {step + 1} {t("onboarding.stepOf")}
                </Badge>
                <h2 className="text-xl font-bold text-white">{t(currentStep.titleKey)}</h2>
              </div>
            </div>
          </div>

          <CardContent className="p-6 space-y-4">
            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t(currentStep.descKey)}
            </p>

            {/* Tip */}
            {currentStep.tipKey && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-semibold text-primary">{t("onboarding.tip")}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{t(currentStep.tipKey)}</p>
                </div>
              </div>
            )}

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-1.5 py-2">
              {steps.map((_, i) => (
                <button
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/40" : "w-1.5 bg-muted-foreground/20"
                  }`}
                  onClick={() => setStep(i)}
                />
              ))}
            </div>

            {/* Don't show again checkbox */}
            {step === 0 && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={dontShow}
                  onChange={(e) => setDontShow(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-border accent-primary"
                />
                {t("onboarding.dontShowAgain")}
              </label>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-1">
              <Button variant="ghost" size="sm" onClick={handleClose} className="text-muted-foreground">
                {t("onboarding.skip")}
              </Button>
              <div className="flex gap-2">
                {step > 0 && (
                  <Button variant="outline" size="sm" onClick={handlePrev} className="gap-1">
                    <ChevronLeft className="w-3.5 h-3.5" /> {t("onboarding.prev")}
                  </Button>
                )}
                <Button size="sm" onClick={handleNext} className="gap-1">
                  {step === steps.length - 1 ? (
                    <><Rocket className="w-3.5 h-3.5" /> {t("onboarding.finish")}</>
                  ) : (
                    <>{t("onboarding.next")} <ChevronRight className="w-3.5 h-3.5" /></>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
