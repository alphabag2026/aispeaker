import { readFileSync, writeFileSync } from "fs";

const FILE = "client/src/i18n/components/AvatarSettingsDialog.ts";
let content = readFileSync(FILE, "utf-8");

const keys = {
  "avatarSettingsDialog.abTestSection": {
    ko: "🔊 A/B 비교 테스트", en: "🔊 A/B Comparison Test", zh: "🔊 A/B 对比测试", ja: "🔊 A/B比較テスト", vi: "🔊 So sánh A/B"
  },
  "avatarSettingsDialog.abTestDesc": {
    ko: "원본 음성 샘플과 클론 음성을 나란히 비교해 보세요", en: "Compare original voice sample and cloned voice side by side", zh: "并排比较原始语音样本和克隆语音", ja: "オリジナル音声とクローン音声を並べて比較", vi: "So sánh mẫu giọng gốc và giọng nhân bản"
  },
  "avatarSettingsDialog.originalSample": {
    ko: "원본 샘플", en: "Original Sample", zh: "原始样本", ja: "オリジナルサンプル", vi: "Mẫu gốc"
  },
  "avatarSettingsDialog.clonedVoice": {
    ko: "클론 음성", en: "Cloned Voice", zh: "克隆语音", ja: "クローン音声", vi: "Giọng nhân bản"
  },
  "avatarSettingsDialog.playOriginal": {
    ko: "원본 재생", en: "Play Original", zh: "播放原始", ja: "オリジナル再生", vi: "Phát gốc"
  },
  "avatarSettingsDialog.playClone": {
    ko: "클론 재생", en: "Play Clone", zh: "播放克隆", ja: "クローン再生", vi: "Phát nhân bản"
  },
  "avatarSettingsDialog.selectCloneForAB": {
    ko: "A/B 테스트를 위해 클론 음성을 선택해주세요", en: "Select a clone voice for A/B testing", zh: "请选择克隆语音进行A/B测试", ja: "A/Bテスト用にクローン音声を選択してください", vi: "Chọn giọng nhân bản để thử A/B"
  },
  "avatarSettingsDialog.savedPresets": {
    ko: "💾 저장된 프리셋", en: "💾 Saved Presets", zh: "💾 已保存预设", ja: "💾 保存済みプリセット", vi: "💾 Cài đặt đã lưu"
  },
  "avatarSettingsDialog.noSavedPresets": {
    ko: "저장된 프리셋이 없습니다", en: "No saved presets", zh: "没有已保存的预设", ja: "保存済みプリセットなし", vi: "Không có cài đặt đã lưu"
  },
  "avatarSettingsDialog.saveAsPreset": {
    ko: "현재 설정을 프리셋으로 저장", en: "Save current settings as preset", zh: "将当前设置保存为预设", ja: "現在の設定をプリセットとして保存", vi: "Lưu cài đặt hiện tại"
  },
  "avatarSettingsDialog.presetName": {
    ko: "프리셋 이름", en: "Preset Name", zh: "预设名称", ja: "プリセット名", vi: "Tên cài đặt"
  },
  "avatarSettingsDialog.enterPresetName": {
    ko: "프리셋 이름을 입력하세요", en: "Enter preset name", zh: "输入预设名称", ja: "プリセット名を入力", vi: "Nhập tên cài đặt"
  },
  "avatarSettingsDialog.savePreset": {
    ko: "프리셋 저장", en: "Save Preset", zh: "保存预设", ja: "プリセット保存", vi: "Lưu"
  },
  "avatarSettingsDialog.presetSaved": {
    ko: "프리셋이 저장되었습니다", en: "Preset saved", zh: "预设已保存", ja: "プリセットが保存されました", vi: "Đã lưu cài đặt"
  },
  "avatarSettingsDialog.presetDeleted": {
    ko: "프리셋이 삭제되었습니다", en: "Preset deleted", zh: "预设已删除", ja: "プリセットが削除されました", vi: "Đã xóa cài đặt"
  },
  "avatarSettingsDialog.presetLoaded": {
    ko: "프리셋이 적용되었습니다", en: "Preset loaded", zh: "预设已应用", ja: "プリセットが適用されました", vi: "Đã áp dụng cài đặt"
  },
  "avatarSettingsDialog.confirmDeletePreset": {
    ko: "이 프리셋을 삭제하시겠습니까?", en: "Delete this preset?", zh: "删除此预设？", ja: "このプリセットを削除しますか？", vi: "Xóa cài đặt này?"
  },
};

const allLangs = ["ko","en","zh","ja","vi","th","id","ms","es","fr","de","pt","ru","ar","hi","it","nl","pl","sv","tr"];

for (const lang of allLangs) {
  const pattern = `registerTranslations("${lang}", {`;
  const idx = content.indexOf(pattern);
  if (idx === -1) { console.log(`SKIP: ${lang} not found`); continue; }
  
  let braceCount = 0;
  let closeIdx = -1;
  for (let i = idx + pattern.length; i < content.length; i++) {
    if (content[i] === '{') braceCount++;
    if (content[i] === '}') {
      if (braceCount === 0) { closeIdx = i; break; }
      braceCount--;
    }
  }
  if (closeIdx === -1) { console.log(`SKIP: closing brace not found for ${lang}`); continue; }
  
  const entries = Object.entries(keys).map(([k, vals]) => {
    const val = vals[lang] || vals.en;
    return `  "${k}": "${val.replace(/"/g, '\\"')}"`;
  }).join(",\n");
  
  content = content.slice(0, closeIdx) + ",\n" + entries + "\n" + content.slice(closeIdx);
  console.log(`Added ${Object.keys(keys).length} keys to ${lang}`);
}

writeFileSync(FILE, content);
console.log("Done!");
