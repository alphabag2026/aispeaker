import { readFileSync, writeFileSync } from 'fs';

const filePath = 'client/src/i18n/components/AvatarSettingsDialog.ts';
let content = readFileSync(filePath, 'utf-8');

// New keys per language
const newKeys = {
  zh: {
    "avatarSettingsDialog.voiceCloneAnalyzing": "AI正在分析您的声音...",
    "avatarSettingsDialog.voiceCloneAnalyzingDesc": "分析上传声音的特征，匹配最相似的AI声音。",
    "avatarSettingsDialog.voiceCloneReady": "声音克隆准备完成！",
    "avatarSettingsDialog.matchedVoice": "匹配的AI声音",
    "avatarSettingsDialog.analysisResult": "分析结果",
    "avatarSettingsDialog.confidence": "匹配准确度",
    "avatarSettingsDialog.voiceGender": "性别",
    "avatarSettingsDialog.voiceTone": "音调",
    "avatarSettingsDialog.voiceStyle": "风格",
    "avatarSettingsDialog.matchReason": "匹配原因",
    "avatarSettingsDialog.useThisClone": "使用此克隆声音",
    "avatarSettingsDialog.cloneSelected": "已选择克隆声音",
    "avatarSettingsDialog.uploadVoiceFile": "上传声音文件",
    "avatarSettingsDialog.uploadVoiceDesc": "上传讲师的实际声音文件，AI将分析并自动匹配最相似的声音。",
    "avatarSettingsDialog.selectVoiceFile": "选择声音文件",
    "avatarSettingsDialog.fileSizeLimit": "文件大小必须在100MB以下。",
    "avatarSettingsDialog.fileLoaded": "文件已加载。",
    "avatarSettingsDialog.sampleAudio": "原始样本",
    "avatarSettingsDialog.listenSample": "听原始",
    "avatarSettingsDialog.listenClone": "听克隆",
  },
  ja: {
    "avatarSettingsDialog.voiceCloneAnalyzing": "AIが音声を分析中です...",
    "avatarSettingsDialog.voiceCloneAnalyzingDesc": "アップロードされた音声の特性を分析し、最も類似したAI音声をマッチングします。",
    "avatarSettingsDialog.voiceCloneReady": "音声クローン準備完了！",
    "avatarSettingsDialog.matchedVoice": "マッチしたAI音声",
    "avatarSettingsDialog.analysisResult": "分析結果",
    "avatarSettingsDialog.confidence": "マッチ精度",
    "avatarSettingsDialog.voiceGender": "性別",
    "avatarSettingsDialog.voiceTone": "トーン",
    "avatarSettingsDialog.voiceStyle": "スタイル",
    "avatarSettingsDialog.matchReason": "マッチ理由",
    "avatarSettingsDialog.useThisClone": "このクローン音声を使用",
    "avatarSettingsDialog.cloneSelected": "クローン音声が選択されました",
    "avatarSettingsDialog.uploadVoiceFile": "音声ファイルをアップロード",
    "avatarSettingsDialog.uploadVoiceDesc": "講師の実際の音声ファイルをアップロードすると、AIが分析して最も類似した音声を自動マッチングします。",
    "avatarSettingsDialog.selectVoiceFile": "音声ファイルを選択",
    "avatarSettingsDialog.fileSizeLimit": "ファイルサイズは100MB以下である必要があります。",
    "avatarSettingsDialog.fileLoaded": "ファイルが読み込まれました。",
    "avatarSettingsDialog.sampleAudio": "オリジナルサンプル",
    "avatarSettingsDialog.listenSample": "オリジナルを聴く",
    "avatarSettingsDialog.listenClone": "クローンを聴く",
  },
  vi: {
    "avatarSettingsDialog.voiceCloneAnalyzing": "AI đang phân tích giọng nói của bạn...",
    "avatarSettingsDialog.voiceCloneAnalyzingDesc": "Phân tích đặc điểm của giọng nói đã tải lên để khớp với giọng AI tương tự nhất.",
    "avatarSettingsDialog.voiceCloneReady": "Bản sao giọng nói đã sẵn sàng!",
    "avatarSettingsDialog.matchedVoice": "Giọng AI đã khớp",
    "avatarSettingsDialog.analysisResult": "Kết quả phân tích",
    "avatarSettingsDialog.confidence": "Độ chính xác khớp",
    "avatarSettingsDialog.voiceGender": "Giới tính",
    "avatarSettingsDialog.voiceTone": "Tông",
    "avatarSettingsDialog.voiceStyle": "Phong cách",
    "avatarSettingsDialog.matchReason": "Lý do khớp",
    "avatarSettingsDialog.useThisClone": "Sử dụng giọng sao chép này",
    "avatarSettingsDialog.cloneSelected": "Đã chọn giọng sao chép",
    "avatarSettingsDialog.uploadVoiceFile": "Tải lên tệp giọng nói",
    "avatarSettingsDialog.uploadVoiceDesc": "Tải lên tệp giọng nói thực tế của giảng viên, AI sẽ phân tích và tự động khớp giọng tương tự nhất.",
    "avatarSettingsDialog.selectVoiceFile": "Chọn tệp giọng nói",
    "avatarSettingsDialog.fileSizeLimit": "Kích thước tệp phải dưới 100MB.",
    "avatarSettingsDialog.fileLoaded": "Tệp đã được tải.",
    "avatarSettingsDialog.sampleAudio": "Mẫu gốc",
    "avatarSettingsDialog.listenSample": "Nghe gốc",
    "avatarSettingsDialog.listenClone": "Nghe bản sao",
  },
  th: {
    "avatarSettingsDialog.voiceCloneAnalyzing": "AI กำลังวิเคราะห์เสียงของคุณ...",
    "avatarSettingsDialog.voiceCloneAnalyzingDesc": "วิเคราะห์คุณลักษณะของเสียงที่อัปโหลดเพื่อจับคู่กับเสียง AI ที่คล้ายที่สุด",
    "avatarSettingsDialog.voiceCloneReady": "โคลนเสียงพร้อมแล้ว!",
    "avatarSettingsDialog.matchedVoice": "เสียง AI ที่จับคู่",
    "avatarSettingsDialog.analysisResult": "ผลการวิเคราะห์",
    "avatarSettingsDialog.confidence": "ความแม่นยำในการจับคู่",
    "avatarSettingsDialog.voiceGender": "เพศ",
    "avatarSettingsDialog.voiceTone": "โทน",
    "avatarSettingsDialog.voiceStyle": "สไตล์",
    "avatarSettingsDialog.matchReason": "เหตุผลในการจับคู่",
    "avatarSettingsDialog.useThisClone": "ใช้เสียงโคลนนี้",
    "avatarSettingsDialog.cloneSelected": "เลือกเสียงโคลนแล้ว",
    "avatarSettingsDialog.uploadVoiceFile": "อัปโหลดไฟล์เสียง",
    "avatarSettingsDialog.uploadVoiceDesc": "อัปโหลดไฟล์เสียงจริงของผู้สอน AI จะวิเคราะห์และจับคู่เสียงที่คล้ายที่สุดโดยอัตโนมัติ",
    "avatarSettingsDialog.selectVoiceFile": "เลือกไฟล์เสียง",
    "avatarSettingsDialog.fileSizeLimit": "ขนาดไฟล์ต้องไม่เกิน 100MB",
    "avatarSettingsDialog.fileLoaded": "โหลดไฟล์แล้ว",
    "avatarSettingsDialog.sampleAudio": "ตัวอย่างต้นฉบับ",
    "avatarSettingsDialog.listenSample": "ฟังต้นฉบับ",
    "avatarSettingsDialog.listenClone": "ฟังโคลน",
  },
};

// For remaining languages, use English as fallback
const otherLangs = ['id', 'ms', 'es', 'fr', 'de', 'pt', 'ru', 'ar', 'hi', 'it', 'nl', 'pl', 'sv', 'tr'];
for (const lang of otherLangs) {
  newKeys[lang] = newKeys['en'] || {
    "avatarSettingsDialog.voiceCloneAnalyzing": "AI is analyzing your voice...",
    "avatarSettingsDialog.voiceCloneAnalyzingDesc": "Analyzing the characteristics of the uploaded voice to match the most similar AI voice.",
    "avatarSettingsDialog.voiceCloneReady": "Voice clone ready!",
    "avatarSettingsDialog.matchedVoice": "Matched AI Voice",
    "avatarSettingsDialog.analysisResult": "Analysis Result",
    "avatarSettingsDialog.confidence": "Match Confidence",
    "avatarSettingsDialog.voiceGender": "Gender",
    "avatarSettingsDialog.voiceTone": "Tone",
    "avatarSettingsDialog.voiceStyle": "Style",
    "avatarSettingsDialog.matchReason": "Match Reason",
    "avatarSettingsDialog.useThisClone": "Use This Clone Voice",
    "avatarSettingsDialog.cloneSelected": "Clone voice has been selected",
    "avatarSettingsDialog.uploadVoiceFile": "Upload Voice File",
    "avatarSettingsDialog.uploadVoiceDesc": "Upload the instructor's actual voice file and AI will analyze and auto-match the most similar voice.",
    "avatarSettingsDialog.selectVoiceFile": "Select Voice File",
    "avatarSettingsDialog.fileSizeLimit": "File size must be under 100MB.",
    "avatarSettingsDialog.fileLoaded": "File loaded.",
    "avatarSettingsDialog.sampleAudio": "Original Sample",
    "avatarSettingsDialog.listenSample": "Listen Original",
    "avatarSettingsDialog.listenClone": "Listen Clone",
  };
}

// Insert new keys before each closing }); for each language
for (const [lang, keys] of Object.entries(newKeys)) {
  // Find the pattern: "avatarSettingsDialog.save": "...",\n}); followed by registerTranslations("nextLang" or end
  const savePattern = new RegExp(
    `(registerTranslations\\("${lang}",\\s*\\{[\\s\\S]*?"avatarSettingsDialog\\.save":\\s*"[^"]*",)\\n(\\}\\);)`,
    ''
  );
  
  const match = content.match(savePattern);
  if (match) {
    const keysStr = Object.entries(keys).map(([k, v]) => `  "${k}": "${v}",`).join('\n');
    content = content.replace(savePattern, `$1\n${keysStr}\n$2`);
    console.log(`✅ Added keys for ${lang}`);
  } else {
    console.log(`⚠️  Could not find pattern for ${lang}`);
  }
}

writeFileSync(filePath, content, 'utf-8');
console.log('Done!');
