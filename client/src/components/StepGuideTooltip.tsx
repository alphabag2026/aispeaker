import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, X, Lightbulb, ChevronRight, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { registerTranslations } from "@/contexts/LanguageContext";

// ============ i18n ============
registerTranslations("ko", {
  "stepGuide.title": "단계 가이드",
  "stepGuide.tip": "팁",
  "stepGuide.gotIt": "확인했어요",
  "stepGuide.next": "다음",
  "stepGuide.step": "단계",
  // Step 1
  "stepGuide.step1.title": "아바타 선택",
  "stepGuide.step1.desc": "강의에 등장할 AI 아바타를 선택하세요. 여러 명의 아바타를 추가하여 다양한 역할을 부여할 수 있습니다.",
  "stepGuide.step1.tips.0": "프리셋 갤러리에서 다양한 스타일의 얼굴을 선택할 수 있어요",
  "stepGuide.step1.tips.1": "내 아바타 탭에서 직접 업로드하거나 AI로 생성할 수도 있어요",
  "stepGuide.step1.tips.2": "아바타 카드의 설정(⚙️) 버튼으로 이름, 역할, 음성을 커스터마이징하세요",
  // Step 2
  "stepGuide.step2.title": "스크립트 작성",
  "stepGuide.step2.desc": "AI가 자동으로 강의 스크립트를 생성합니다. 주제와 카테고리를 입력하면 전문적인 강의 대본이 만들어집니다.",
  "stepGuide.step2.tips.0": "주제를 입력하고 'AI 스크립트 생성' 버튼을 클릭하세요",
  "stepGuide.step2.tips.1": "생성된 스크립트는 섹션별로 자유롭게 편집할 수 있어요",
  "stepGuide.step2.tips.2": "각 섹션에 다른 아바타를 배정하여 대화형 강의를 만들 수 있어요",
  // Step 3
  "stepGuide.step3.title": "슬라이드 업로드",
  "stepGuide.step3.desc": "강의에 사용할 슬라이드(PPT/PDF/이미지)를 업로드하세요. 슬라이드가 스크립트와 함께 표시됩니다.",
  "stepGuide.step3.tips.0": "PDF, PPT, PNG, JPG 형식을 지원합니다",
  "stepGuide.step3.tips.1": "드래그 앤 드롭으로 순서를 변경할 수 있어요",
  "stepGuide.step3.tips.2": "슬라이드 없이도 스크립트만으로 강의를 제작할 수 있어요",
  // Step 4
  "stepGuide.step4.title": "매칭 에디터",
  "stepGuide.step4.desc": "스크립트와 슬라이드를 매칭하고, 주석(원, 화살표, 체크 등)을 추가하여 강의를 풍성하게 만드세요.",
  "stepGuide.step4.tips.0": "왼쪽 스크립트를 클릭하면 해당 슬라이드가 표시됩니다",
  "stepGuide.step4.tips.1": "주석 도구로 슬라이드 위에 강조 표시를 추가하세요",
  "stepGuide.step4.tips.2": "AI 레이아웃 추천 기능으로 최적의 배치를 자동 설정할 수 있어요",
  // Step 5
  "stepGuide.step5.title": "미리보기 & 설정",
  "stepGuide.step5.desc": "최종 결과물을 미리보고, 아바타 위치/크기, 배경 음악, 자막 등 세부 설정을 조정한 후 영상을 생성하세요.",
  "stepGuide.step5.tips.0": "아바타 위치와 크기를 슬라이드별로 조정할 수 있어요",
  "stepGuide.step5.tips.1": "배경 음악을 업로드하여 강의 분위기를 연출하세요",
  "stepGuide.step5.tips.2": "'최종 영상 생성' 버튼으로 MP4 영상을 제작할 수 있어요",
});

registerTranslations("en", {
  "stepGuide.title": "Step Guide",
  "stepGuide.tip": "Tip",
  "stepGuide.gotIt": "Got it",
  "stepGuide.next": "Next",
  "stepGuide.step": "Step",
  // Step 1
  "stepGuide.step1.title": "Select Avatar",
  "stepGuide.step1.desc": "Choose AI avatars for your lecture. You can add multiple avatars and assign different roles to each.",
  "stepGuide.step1.tips.0": "Browse various face styles from the preset gallery",
  "stepGuide.step1.tips.1": "Upload your own or generate with AI in the My Avatars tab",
  "stepGuide.step1.tips.2": "Use the settings (⚙️) button to customize name, role, and voice",
  // Step 2
  "stepGuide.step2.title": "Write Script",
  "stepGuide.step2.desc": "AI automatically generates lecture scripts. Enter a topic and category to create a professional lecture script.",
  "stepGuide.step2.tips.0": "Enter a topic and click 'Generate AI Script'",
  "stepGuide.step2.tips.1": "Edit generated scripts freely by section",
  "stepGuide.step2.tips.2": "Assign different avatars to sections for dialogue-style lectures",
  // Step 3
  "stepGuide.step3.title": "Upload Slides",
  "stepGuide.step3.desc": "Upload slides (PPT/PDF/images) for your lecture. Slides will be displayed alongside the script.",
  "stepGuide.step3.tips.0": "Supports PDF, PPT, PNG, and JPG formats",
  "stepGuide.step3.tips.1": "Drag and drop to reorder slides",
  "stepGuide.step3.tips.2": "You can create lectures with scripts only, without slides",
  // Step 4
  "stepGuide.step4.title": "Matching Editor",
  "stepGuide.step4.desc": "Match scripts with slides and add annotations (circles, arrows, checks) to enrich your lecture.",
  "stepGuide.step4.tips.0": "Click a script section to display the corresponding slide",
  "stepGuide.step4.tips.1": "Use annotation tools to add highlights on slides",
  "stepGuide.step4.tips.2": "Use AI layout recommendation for optimal placement",
  // Step 5
  "stepGuide.step5.title": "Preview & Settings",
  "stepGuide.step5.desc": "Preview the final result, adjust avatar position/size, background music, subtitles, and generate the video.",
  "stepGuide.step5.tips.0": "Adjust avatar position and size per slide",
  "stepGuide.step5.tips.1": "Upload background music to set the mood",
  "stepGuide.step5.tips.2": "Click 'Final Video Generation' to create your MP4 video",
});

registerTranslations("ja", {
  "stepGuide.title": "ステップガイド",
  "stepGuide.tip": "ヒント",
  "stepGuide.gotIt": "了解",
  "stepGuide.next": "次へ",
  "stepGuide.step": "ステップ",
  "stepGuide.step1.title": "アバター選択",
  "stepGuide.step1.desc": "講義に登場するAIアバターを選択してください。複数のアバターを追加して異なる役割を割り当てることができます。",
  "stepGuide.step1.tips.0": "プリセットギャラリーから様々なスタイルの顔を選択できます",
  "stepGuide.step1.tips.1": "マイアバタータブで直接アップロードまたはAI生成も可能です",
  "stepGuide.step1.tips.2": "設定(⚙️)ボタンで名前、役割、音声をカスタマイズしてください",
  "stepGuide.step2.title": "スクリプト作成",
  "stepGuide.step2.desc": "AIが自動で講義スクリプトを生成します。トピックとカテゴリを入力すると専門的な講義台本が作成されます。",
  "stepGuide.step2.tips.0": "トピックを入力して「AIスクリプト生成」ボタンをクリックしてください",
  "stepGuide.step2.tips.1": "生成されたスクリプトはセクションごとに自由に編集できます",
  "stepGuide.step2.tips.2": "各セクションに異なるアバターを割り当てて対話型講義を作成できます",
  "stepGuide.step3.title": "スライドアップロード",
  "stepGuide.step3.desc": "講義で使用するスライド（PPT/PDF/画像）をアップロードしてください。",
  "stepGuide.step3.tips.0": "PDF、PPT、PNG、JPG形式に対応しています",
  "stepGuide.step3.tips.1": "ドラッグ＆ドロップで順序を変更できます",
  "stepGuide.step3.tips.2": "スライドなしでもスクリプトだけで講義を制作できます",
  "stepGuide.step4.title": "マッチングエディター",
  "stepGuide.step4.desc": "スクリプトとスライドをマッチングし、注釈を追加して講義を豊かにしましょう。",
  "stepGuide.step4.tips.0": "左のスクリプトをクリックすると該当スライドが表示されます",
  "stepGuide.step4.tips.1": "注釈ツールでスライド上にハイライトを追加してください",
  "stepGuide.step4.tips.2": "AIレイアウト推薦機能で最適な配置を自動設定できます",
  "stepGuide.step5.title": "プレビュー＆設定",
  "stepGuide.step5.desc": "最終結果をプレビューし、アバター位置/サイズ、BGM、字幕などを調整して動画を生成してください。",
  "stepGuide.step5.tips.0": "スライドごとにアバターの位置とサイズを調整できます",
  "stepGuide.step5.tips.1": "BGMをアップロードして講義の雰囲気を演出しましょう",
  "stepGuide.step5.tips.2": "「最終動画生成」ボタンでMP4動画を制作できます",
});

registerTranslations("zh", {
  "stepGuide.title": "步骤指南",
  "stepGuide.tip": "提示",
  "stepGuide.gotIt": "知道了",
  "stepGuide.next": "下一步",
  "stepGuide.step": "步骤",
  "stepGuide.step1.title": "选择头像",
  "stepGuide.step1.desc": "选择讲座中出现的AI头像。您可以添加多个头像并为每个头像分配不同的角色。",
  "stepGuide.step1.tips.0": "从预设画廊中浏览各种风格的面孔",
  "stepGuide.step1.tips.1": "在我的头像标签中直接上传或用AI生成",
  "stepGuide.step1.tips.2": "使用设置(⚙️)按钮自定义名称、角色和语音",
  "stepGuide.step2.title": "编写脚本",
  "stepGuide.step2.desc": "AI自动生成讲座脚本。输入主题和类别即可创建专业的讲座稿。",
  "stepGuide.step2.tips.0": "输入主题并点击'AI脚本生成'按钮",
  "stepGuide.step2.tips.1": "生成的脚本可以按章节自由编辑",
  "stepGuide.step2.tips.2": "为各章节分配不同的头像以创建对话式讲座",
  "stepGuide.step3.title": "上传幻灯片",
  "stepGuide.step3.desc": "上传讲座使用的幻灯片（PPT/PDF/图片）。幻灯片将与脚本一起显示。",
  "stepGuide.step3.tips.0": "支持PDF、PPT、PNG、JPG格式",
  "stepGuide.step3.tips.1": "拖放可以更改顺序",
  "stepGuide.step3.tips.2": "即使没有幻灯片也可以仅用脚本制作讲座",
  "stepGuide.step4.title": "匹配编辑器",
  "stepGuide.step4.desc": "将脚本与幻灯片匹配，添加注释（圆圈、箭头、勾选等）来丰富讲座。",
  "stepGuide.step4.tips.0": "点击左侧脚本即可显示对应的幻灯片",
  "stepGuide.step4.tips.1": "使用注释工具在幻灯片上添加高亮标记",
  "stepGuide.step4.tips.2": "使用AI布局推荐功能自动设置最佳布局",
  "stepGuide.step5.title": "预览与设置",
  "stepGuide.step5.desc": "预览最终结果，调整头像位置/大小、背景音乐、字幕等，然后生成视频。",
  "stepGuide.step5.tips.0": "可以按幻灯片调整头像的位置和大小",
  "stepGuide.step5.tips.1": "上传背景音乐来营造讲座氛围",
  "stepGuide.step5.tips.2": "点击'最终视频生成'按钮制作MP4视频",
});

// ============ Guide Data ============
interface StepGuideData {
  stepNumber: number;
  titleKey: string;
  descKey: string;
  tipKeys: string[];
}

const STEP_GUIDES: StepGuideData[] = [
  {
    stepNumber: 1,
    titleKey: "stepGuide.step1.title",
    descKey: "stepGuide.step1.desc",
    tipKeys: ["stepGuide.step1.tips.0", "stepGuide.step1.tips.1", "stepGuide.step1.tips.2"],
  },
  {
    stepNumber: 2,
    titleKey: "stepGuide.step2.title",
    descKey: "stepGuide.step2.desc",
    tipKeys: ["stepGuide.step2.tips.0", "stepGuide.step2.tips.1", "stepGuide.step2.tips.2"],
  },
  {
    stepNumber: 3,
    titleKey: "stepGuide.step3.title",
    descKey: "stepGuide.step3.desc",
    tipKeys: ["stepGuide.step3.tips.0", "stepGuide.step3.tips.1", "stepGuide.step3.tips.2"],
  },
  {
    stepNumber: 4,
    titleKey: "stepGuide.step4.title",
    descKey: "stepGuide.step4.desc",
    tipKeys: ["stepGuide.step4.tips.0", "stepGuide.step4.tips.1", "stepGuide.step4.tips.2"],
  },
  {
    stepNumber: 5,
    titleKey: "stepGuide.step5.title",
    descKey: "stepGuide.step5.desc",
    tipKeys: ["stepGuide.step5.tips.0", "stepGuide.step5.tips.1", "stepGuide.step5.tips.2"],
  },
];

// ============ Component ============
const STORAGE_KEY = "aispeaker-guide-dismissed";

interface StepGuideTooltipProps {
  currentStep: number;
}

export default function StepGuideTooltip({ currentStep }: StepGuideTooltipProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Record<number, boolean>>({});
  const [currentTip, setCurrentTip] = useState(0);

  const guide = STEP_GUIDES.find((g) => g.stepNumber === currentStep);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setDismissed(JSON.parse(stored));
      }
    } catch {}
  }, []);

  // Auto-show on first visit to a step
  useEffect(() => {
    if (guide && !dismissed[currentStep]) {
      const timer = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(timer);
    } else {
      setOpen(false);
    }
    setCurrentTip(0);
  }, [currentStep, guide, dismissed]);

  const handleDismiss = () => {
    setOpen(false);
    const updated = { ...dismissed, [currentStep]: true };
    setDismissed(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  if (!guide) return null;

  const tips = guide.tipKeys;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative w-8 h-8 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
          onClick={() => setOpen(!open)}
        >
          <HelpCircle className="w-5 h-5" />
          {!dismissed[currentStep] && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="w-80 p-0 border-primary/20 bg-card shadow-xl"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
              {t("stepGuide.step")} {guide.stepNumber}
            </Badge>
            <span className="font-semibold text-sm">{t(guide.titleKey)}</span>
          </div>
          <Button variant="ghost" size="icon" className="w-6 h-6" onClick={handleDismiss}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Description */}
        <div className="px-4 pb-3">
          <p className="text-sm text-muted-foreground leading-relaxed">{t(guide.descKey)}</p>
        </div>

        {/* Tips */}
        <div className="border-t border-border/50 px-4 py-3 space-y-2">
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-medium text-amber-500">{t("stepGuide.tip")}</span>
          </div>
          {tips.map((tipKey, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 text-xs transition-all ${
                i === currentTip ? "text-foreground" : "text-muted-foreground/60"
              }`}
            >
              <CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                i === currentTip ? "text-primary" : "text-muted-foreground/40"
              }`} />
              <span className="leading-relaxed">{t(tipKey)}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 px-4 py-2.5 flex items-center justify-between">
          <div className="flex gap-1">
            {tips.map((_, i) => (
              <button
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === currentTip ? "bg-primary" : "bg-muted-foreground/30"
                }`}
                onClick={() => setCurrentTip(i)}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {currentTip < tips.length - 1 ? (
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setCurrentTip(currentTip + 1)}>
                {t("stepGuide.next")} <ChevronRight className="w-3 h-3" />
              </Button>
            ) : (
              <Button size="sm" className="h-7 text-xs" onClick={handleDismiss}>
                {t("stepGuide.gotIt")}
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
