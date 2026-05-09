import fs from 'fs';

const translations = {
  "avatarSettingsDialog.voiceAppliedToProject": {
    ko: "음성이 프로젝트에 적용되었습니다", en: "Voice applied to project", zh: "语音已应用到项目", ja: "音声がプロジェクトに適用されました", vi: "Đã áp dụng giọng nói cho dự án", th: "ใช้เสียงกับโปรเจกต์แล้ว",
    es: "Voz aplicada al proyecto", fr: "Voix appliquée au projet", de: "Stimme auf Projekt angewendet", pt: "Voz aplicada ao projeto", ru: "Голос применён к проекту", ar: "تم تطبيق الصوت على المشروع",
    hi: "आवाज़ प्रोजेक्ट पर लागू", id: "Suara diterapkan ke proyek", ms: "Suara digunakan pada projek", tr: "Ses projeye uygulandı", it: "Voce applicata al progetto", nl: "Stem toegepast op project", pl: "Głos zastosowany do projektu", sv: "Röst tillämpad på projekt",
  },
  "avatarSettingsDialog.applyToProjectTitle": {
    ko: "최근 프로젝트에 적용", en: "Apply to Recent Project", zh: "应用到最近项目", ja: "最近のプロジェクトに適用", vi: "Áp dụng cho dự án gần đây", th: "ใช้กับโปรเจกต์ล่าสุด",
    es: "Aplicar a proyecto reciente", fr: "Appliquer au projet récent", de: "Auf aktuelles Projekt anwenden", pt: "Aplicar ao projeto recente", ru: "Применить к недавнему проекту", ar: "تطبيق على المشروع الأخير",
    hi: "हाल के प्रोजेक्ट पर लागू करें", id: "Terapkan ke proyek terbaru", ms: "Gunakan pada projek terkini", tr: "Son projeye uygula", it: "Applica al progetto recente", nl: "Toepassen op recent project", pl: "Zastosuj do ostatniego projektu", sv: "Tillämpa på senaste projekt",
  },
  "avatarSettingsDialog.applyToProjectDesc": {
    ko: "새로 생성된 음성 클론을 최근 프로젝트의 아바타에 바로 적용할 수 있습니다.", en: "Apply the newly created voice clone to avatars in your recent projects.", zh: "将新创建的语音克隆应用到最近项目的头像。", ja: "新しく作成した音声クローンを最近のプロジェクトのアバターに適用できます。",
    vi: "Áp dụng giọng nói mới cho avatar trong dự án gần đây.", th: "ใช้เสียงโคลนใหม่กับอวาตาร์ในโปรเจกต์ล่าสุด",
    es: "Aplica el clon de voz a los avatares de tus proyectos recientes.", fr: "Appliquez le clone vocal aux avatars de vos projets récents.", de: "Wenden Sie den Stimmklon auf Avatare in Ihren aktuellen Projekten an.", pt: "Aplique o clone de voz aos avatares dos seus projetos recentes.",
    ru: "Примените клон голоса к аватарам в ваших недавних проектах.", ar: "طبّق استنساخ الصوت على الصور الرمزية في مشاريعك الأخيرة.", hi: "हाल के प्रोजेक्ट के अवतारों पर नया वॉइस क्लोन लागू करें।",
    id: "Terapkan klon suara baru ke avatar di proyek terbaru.", ms: "Gunakan klon suara baharu pada avatar dalam projek terkini.", tr: "Yeni ses klonunu son projenizdeki avatarlara uygulayın.",
    it: "Applica il clone vocale agli avatar nei tuoi progetti recenti.", nl: "Pas de nieuwe stemkloon toe op avatars in uw recente projecten.", pl: "Zastosuj nowy klon głosu do awatarów w ostatnich projektach.", sv: "Tillämpa den nya röstklonen på avatarer i dina senaste projekt.",
  },
  "avatarSettingsDialog.avatarsLabel": {
    ko: "아바타", en: "avatars", zh: "头像", ja: "アバター", vi: "avatar", th: "อวาตาร์",
    es: "avatares", fr: "avatars", de: "Avatare", pt: "avatares", ru: "аватаров", ar: "صور رمزية",
    hi: "अवतार", id: "avatar", ms: "avatar", tr: "avatar", it: "avatar", nl: "avatars", pl: "awatarów", sv: "avatarer",
  },
  "avatarSettingsDialog.applyToAll": {
    ko: "전체 아바타에 적용", en: "Apply to All Avatars", zh: "应用到所有头像", ja: "全アバターに適用", vi: "Áp dụng cho tất cả avatar", th: "ใช้กับอวาตาร์ทั้งหมด",
    es: "Aplicar a todos los avatares", fr: "Appliquer à tous les avatars", de: "Auf alle Avatare anwenden", pt: "Aplicar a todos os avatares", ru: "Применить ко всем аватарам", ar: "تطبيق على جميع الصور الرمزية",
    hi: "सभी अवतारों पर लागू करें", id: "Terapkan ke semua avatar", ms: "Gunakan pada semua avatar", tr: "Tüm avatarlara uygula", it: "Applica a tutti gli avatar", nl: "Toepassen op alle avatars", pl: "Zastosuj do wszystkich awatarów", sv: "Tillämpa på alla avatarer",
  },
  "avatarSettingsDialog.noProjectsToApply": {
    ko: "적용할 프로젝트가 없습니다.", en: "No projects to apply.", zh: "没有可应用的项目。", ja: "適用するプロジェクトがありません。", vi: "Không có dự án để áp dụng.", th: "ไม่มีโปรเจกต์ที่จะใช้",
    es: "No hay proyectos para aplicar.", fr: "Aucun projet à appliquer.", de: "Keine Projekte zum Anwenden.", pt: "Nenhum projeto para aplicar.", ru: "Нет проектов для применения.", ar: "لا توجد مشاريع للتطبيق.",
    hi: "लागू करने के लिए कोई प्रोजेक्ट नहीं।", id: "Tidak ada proyek untuk diterapkan.", ms: "Tiada projek untuk digunakan.", tr: "Uygulanacak proje yok.", it: "Nessun progetto da applicare.", nl: "Geen projecten om toe te passen.", pl: "Brak projektów do zastosowania.", sv: "Inga projekt att tillämpa.",
  },
  "avatarSettingsDialog.skipApply": {
    ko: "나중에 적용", en: "Apply Later", zh: "稍后应用", ja: "後で適用", vi: "Áp dụng sau", th: "ใช้ทีหลัง",
    es: "Aplicar después", fr: "Appliquer plus tard", de: "Später anwenden", pt: "Aplicar depois", ru: "Применить позже", ar: "تطبيق لاحقاً",
    hi: "बाद में लागू करें", id: "Terapkan nanti", ms: "Gunakan kemudian", tr: "Sonra uygula", it: "Applica dopo", nl: "Later toepassen", pl: "Zastosuj później", sv: "Tillämpa senare",
  },
};

const filePath = 'client/src/i18n/components/AvatarSettingsDialog.ts';
let content = fs.readFileSync(filePath, 'utf-8');

const languages = ['ko', 'en', 'zh', 'ja', 'vi', 'th', 'es', 'fr', 'de', 'pt', 'ru', 'ar', 'hi', 'id', 'ms', 'tr', 'it', 'nl', 'pl', 'sv'];

for (const lang of languages) {
  const marker = `registerTranslations("${lang}", {`;
  const markerIdx = content.indexOf(marker);
  if (markerIdx === -1) { console.error(`Missing: ${lang}`); continue; }
  let braceCount = 0;
  let closingIdx = -1;
  for (let i = markerIdx + marker.length; i < content.length; i++) {
    if (content[i] === '{') braceCount++;
    if (content[i] === '}') {
      if (braceCount === 0) { closingIdx = i; break; }
      braceCount--;
    }
  }
  if (closingIdx === -1) { console.error(`No closing: ${lang}`); continue; }
  let newEntries = '';
  for (const [key, trans] of Object.entries(translations)) {
    if (trans[lang]) {
      newEntries += `  "${key}": "${trans[lang].replace(/"/g, '\\"')}",\n`;
    }
  }
  content = content.slice(0, closingIdx) + newEntries + content.slice(closingIdx);
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Done: AvatarSettingsDialog i18n keys added');
