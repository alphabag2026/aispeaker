import fs from "fs";

const FILE = "client/src/i18n/components/AvatarSettingsDialog.ts";
let content = fs.readFileSync(FILE, "utf8");

const koKeys = {
  "avatarSettingsDialog.multiSampleSection": "다중 샘플 분석",
  "avatarSettingsDialog.multiSampleDesc": "여러 음성 샘플을 추가하여 더 정확한 음성 클론을 생성하세요",
  "avatarSettingsDialog.addMoreSamples": "추가 샘플 업로드",
  "avatarSettingsDialog.sampleCount": "샘플 수",
  "avatarSettingsDialog.combinedAnalysis": "결합 분석 실행",
  "avatarSettingsDialog.analyzingCombined": "다중 샘플 분석 중...",
  "avatarSettingsDialog.combinedAnalysisComplete": "결합 분석 완료! 매칭 정확도가 향상되었습니다",
  "avatarSettingsDialog.sampleAdded": "샘플이 추가되었습니다",
  "avatarSettingsDialog.sampleDeleted": "샘플이 삭제되었습니다",
  "avatarSettingsDialog.communityPresetsSection": "커뮤니티 프리셋",
  "avatarSettingsDialog.communityPresetsDesc": "다른 사용자들이 공유한 인기 음성 프리셋을 탐색하세요",
  "avatarSettingsDialog.browseCommunitySortPopular": "인기순",
  "avatarSettingsDialog.browseCommunitySortNewest": "최신순",
  "avatarSettingsDialog.browseCommunitySortMostUsed": "사용순",
  "avatarSettingsDialog.publishPreset": "커뮤니티에 공유",
  "avatarSettingsDialog.unpublishPreset": "공유 취소",
  "avatarSettingsDialog.presetPublished": "프리셋이 커뮤니티에 공유되었습니다",
  "avatarSettingsDialog.presetUnpublished": "프리셋 공유가 취소되었습니다",
  "avatarSettingsDialog.copyPreset": "내 프리셋으로 복사",
  "avatarSettingsDialog.presetCopied": "프리셋이 복사되었습니다",
  "avatarSettingsDialog.likes": "좋아요",
  "avatarSettingsDialog.uses": "사용",
  "avatarSettingsDialog.by": "작성자",
  "avatarSettingsDialog.noCommunityPresets": "아직 공유된 프리셋이 없습니다",
  "avatarSettingsDialog.realtimeAnalysisSection": "실시간 음성 분석",
  "avatarSettingsDialog.realtimeAnalysisDesc": "녹음하면 AI가 즉시 음성을 분석합니다",
  "avatarSettingsDialog.startRealtimeAnalysis": "실시간 분석 시작",
  "avatarSettingsDialog.analyzing": "분석 중...",
  "avatarSettingsDialog.analysisComplete": "분석 완료",
  "avatarSettingsDialog.voiceGenderResult": "성별",
  "avatarSettingsDialog.voiceAgeRange": "연령대",
  "avatarSettingsDialog.voicePitchResult": "음높이",
  "avatarSettingsDialog.voiceSpeedResult": "말하기 속도",
  "avatarSettingsDialog.voiceClarity": "명확도",
  "avatarSettingsDialog.voiceEmotion": "감정",
  "avatarSettingsDialog.bestMatchResult": "최적 매칭 음성",
  "avatarSettingsDialog.matchConfidenceResult": "매칭 정확도",
  "avatarSettingsDialog.searchPresets": "프리셋 검색...",
};

const enKeys = {
  "avatarSettingsDialog.multiSampleSection": "Multi-Sample Analysis",
  "avatarSettingsDialog.multiSampleDesc": "Add multiple voice samples for more accurate voice cloning",
  "avatarSettingsDialog.addMoreSamples": "Upload Additional Sample",
  "avatarSettingsDialog.sampleCount": "Samples",
  "avatarSettingsDialog.combinedAnalysis": "Run Combined Analysis",
  "avatarSettingsDialog.analyzingCombined": "Analyzing multiple samples...",
  "avatarSettingsDialog.combinedAnalysisComplete": "Combined analysis complete! Matching accuracy improved",
  "avatarSettingsDialog.sampleAdded": "Sample added",
  "avatarSettingsDialog.sampleDeleted": "Sample deleted",
  "avatarSettingsDialog.communityPresetsSection": "Community Presets",
  "avatarSettingsDialog.communityPresetsDesc": "Browse popular voice presets shared by other users",
  "avatarSettingsDialog.browseCommunitySortPopular": "Popular",
  "avatarSettingsDialog.browseCommunitySortNewest": "Newest",
  "avatarSettingsDialog.browseCommunitySortMostUsed": "Most Used",
  "avatarSettingsDialog.publishPreset": "Share to Community",
  "avatarSettingsDialog.unpublishPreset": "Unshare",
  "avatarSettingsDialog.presetPublished": "Preset shared to community",
  "avatarSettingsDialog.presetUnpublished": "Preset unshared",
  "avatarSettingsDialog.copyPreset": "Copy to My Presets",
  "avatarSettingsDialog.presetCopied": "Preset copied",
  "avatarSettingsDialog.likes": "Likes",
  "avatarSettingsDialog.uses": "Uses",
  "avatarSettingsDialog.by": "By",
  "avatarSettingsDialog.noCommunityPresets": "No shared presets yet",
  "avatarSettingsDialog.realtimeAnalysisSection": "Real-time Voice Analysis",
  "avatarSettingsDialog.realtimeAnalysisDesc": "Record and AI will instantly analyze your voice",
  "avatarSettingsDialog.startRealtimeAnalysis": "Start Real-time Analysis",
  "avatarSettingsDialog.analyzing": "Analyzing...",
  "avatarSettingsDialog.analysisComplete": "Analysis Complete",
  "avatarSettingsDialog.voiceGenderResult": "Gender",
  "avatarSettingsDialog.voiceAgeRange": "Age Range",
  "avatarSettingsDialog.voicePitchResult": "Pitch",
  "avatarSettingsDialog.voiceSpeedResult": "Speaking Speed",
  "avatarSettingsDialog.voiceClarity": "Clarity",
  "avatarSettingsDialog.voiceEmotion": "Emotion",
  "avatarSettingsDialog.bestMatchResult": "Best Match Voice",
  "avatarSettingsDialog.matchConfidenceResult": "Match Confidence",
  "avatarSettingsDialog.searchPresets": "Search presets...",
};

const zhKeys = {
  "avatarSettingsDialog.multiSampleSection": "多样本分析",
  "avatarSettingsDialog.multiSampleDesc": "添加多个语音样本以获得更准确的语音克隆",
  "avatarSettingsDialog.addMoreSamples": "上传额外样本",
  "avatarSettingsDialog.sampleCount": "样本数",
  "avatarSettingsDialog.combinedAnalysis": "运行组合分析",
  "avatarSettingsDialog.analyzingCombined": "正在分析多个样本...",
  "avatarSettingsDialog.combinedAnalysisComplete": "组合分析完成！匹配准确度已提高",
  "avatarSettingsDialog.sampleAdded": "样本已添加",
  "avatarSettingsDialog.sampleDeleted": "样本已删除",
  "avatarSettingsDialog.communityPresetsSection": "社区预设",
  "avatarSettingsDialog.communityPresetsDesc": "浏览其他用户分享的热门语音预设",
  "avatarSettingsDialog.browseCommunitySortPopular": "热门",
  "avatarSettingsDialog.browseCommunitySortNewest": "最新",
  "avatarSettingsDialog.browseCommunitySortMostUsed": "最常用",
  "avatarSettingsDialog.publishPreset": "分享到社区",
  "avatarSettingsDialog.unpublishPreset": "取消分享",
  "avatarSettingsDialog.presetPublished": "预设已分享到社区",
  "avatarSettingsDialog.presetUnpublished": "预设已取消分享",
  "avatarSettingsDialog.copyPreset": "复制到我的预设",
  "avatarSettingsDialog.presetCopied": "预设已复制",
  "avatarSettingsDialog.likes": "点赞",
  "avatarSettingsDialog.uses": "使用",
  "avatarSettingsDialog.by": "作者",
  "avatarSettingsDialog.noCommunityPresets": "暂无分享的预设",
  "avatarSettingsDialog.realtimeAnalysisSection": "实时语音分析",
  "avatarSettingsDialog.realtimeAnalysisDesc": "录音后AI将即时分析您的声音",
  "avatarSettingsDialog.startRealtimeAnalysis": "开始实时分析",
  "avatarSettingsDialog.analyzing": "分析中...",
  "avatarSettingsDialog.analysisComplete": "分析完成",
  "avatarSettingsDialog.voiceGenderResult": "性别",
  "avatarSettingsDialog.voiceAgeRange": "年龄段",
  "avatarSettingsDialog.voicePitchResult": "音高",
  "avatarSettingsDialog.voiceSpeedResult": "语速",
  "avatarSettingsDialog.voiceClarity": "清晰度",
  "avatarSettingsDialog.voiceEmotion": "情感",
  "avatarSettingsDialog.bestMatchResult": "最佳匹配语音",
  "avatarSettingsDialog.matchConfidenceResult": "匹配置信度",
  "avatarSettingsDialog.searchPresets": "搜索预设...",
};

const jaKeys = {
  "avatarSettingsDialog.multiSampleSection": "マルチサンプル分析",
  "avatarSettingsDialog.multiSampleDesc": "複数の音声サンプルを追加してより正確な音声クローンを作成",
  "avatarSettingsDialog.addMoreSamples": "追加サンプルをアップロード",
  "avatarSettingsDialog.sampleCount": "サンプル数",
  "avatarSettingsDialog.combinedAnalysis": "統合分析を実行",
  "avatarSettingsDialog.analyzingCombined": "複数サンプルを分析中...",
  "avatarSettingsDialog.combinedAnalysisComplete": "統合分析完了！マッチング精度が向上しました",
  "avatarSettingsDialog.sampleAdded": "サンプルが追加されました",
  "avatarSettingsDialog.sampleDeleted": "サンプルが削除されました",
  "avatarSettingsDialog.communityPresetsSection": "コミュニティプリセット",
  "avatarSettingsDialog.communityPresetsDesc": "他のユーザーが共有した人気の音声プリセットを閲覧",
  "avatarSettingsDialog.browseCommunitySortPopular": "人気順",
  "avatarSettingsDialog.browseCommunitySortNewest": "新着順",
  "avatarSettingsDialog.browseCommunitySortMostUsed": "使用順",
  "avatarSettingsDialog.publishPreset": "コミュニティに共有",
  "avatarSettingsDialog.unpublishPreset": "共有解除",
  "avatarSettingsDialog.presetPublished": "プリセットがコミュニティに共有されました",
  "avatarSettingsDialog.presetUnpublished": "プリセットの共有が解除されました",
  "avatarSettingsDialog.copyPreset": "マイプリセットにコピー",
  "avatarSettingsDialog.presetCopied": "プリセットがコピーされました",
  "avatarSettingsDialog.likes": "いいね",
  "avatarSettingsDialog.uses": "使用",
  "avatarSettingsDialog.by": "作成者",
  "avatarSettingsDialog.noCommunityPresets": "まだ共有されたプリセットはありません",
  "avatarSettingsDialog.realtimeAnalysisSection": "リアルタイム音声分析",
  "avatarSettingsDialog.realtimeAnalysisDesc": "録音するとAIが即座に音声を分析します",
  "avatarSettingsDialog.startRealtimeAnalysis": "リアルタイム分析開始",
  "avatarSettingsDialog.analyzing": "分析中...",
  "avatarSettingsDialog.analysisComplete": "分析完了",
  "avatarSettingsDialog.voiceGenderResult": "性別",
  "avatarSettingsDialog.voiceAgeRange": "年齢層",
  "avatarSettingsDialog.voicePitchResult": "音の高さ",
  "avatarSettingsDialog.voiceSpeedResult": "話す速度",
  "avatarSettingsDialog.voiceClarity": "明瞭度",
  "avatarSettingsDialog.voiceEmotion": "感情",
  "avatarSettingsDialog.bestMatchResult": "最適マッチ音声",
  "avatarSettingsDialog.matchConfidenceResult": "マッチ精度",
  "avatarSettingsDialog.searchPresets": "プリセットを検索...",
};

const allTranslations = { ko: koKeys, en: enKeys, zh: zhKeys, ja: jaKeys };

// Add English fallback for other languages
const otherLangs = ["vi","th","id","ms","tl","hi","bn","ar","pt","es","fr","de","ru","tr","uk","pl"];
for (const lang of otherLangs) {
  allTranslations[lang] = { ...enKeys };
}

function addKeysToLang(langCode, keys) {
  const searchStr = 'registerTranslations("' + langCode + '", {';
  const startIdx = content.indexOf(searchStr);
  if (startIdx === -1) {
    console.log("Skipping " + langCode + ": block not found");
    return;
  }
  
  // Find closing });
  let braceCount = 0;
  let closeIdx = -1;
  for (let i = startIdx + searchStr.length - 1; i < content.length; i++) {
    if (content[i] === "{") braceCount++;
    if (content[i] === "}") {
      braceCount--;
      if (braceCount === 0) {
        closeIdx = i;
        break;
      }
    }
  }
  
  if (closeIdx === -1) {
    console.log("Skipping " + langCode + ": closing brace not found");
    return;
  }
  
  const blockContent = content.substring(startIdx, closeIdx);
  const newEntries = [];
  for (const [k, v] of Object.entries(keys)) {
    // Check if key already exists in block
    if (!blockContent.includes('"' + k + '"')) {
      newEntries.push('  "' + k + '": "' + v.replace(/"/g, '\\"') + '",');
    }
  }
  
  if (newEntries.length === 0) {
    console.log("Skipping " + langCode + ": all keys exist");
    return;
  }
  
  content = content.substring(0, closeIdx) + "\n" + newEntries.join("\n") + "\n" + content.substring(closeIdx);
  console.log("Added " + newEntries.length + " keys for " + langCode);
}

for (const [lang, keys] of Object.entries(allTranslations)) {
  addKeysToLang(lang, keys);
}

fs.writeFileSync(FILE, content);
console.log("Done!");
