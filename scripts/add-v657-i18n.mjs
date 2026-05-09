import fs from 'fs';

// LectureBuilder i18n - format migration keys
const lbKeys = {
  ko: {
    "lectureBuilder.formatMigrateOption": "스크립트 자동 재배치",
    "lectureBuilder.formatMigrateDesc": "기존 스크립트를 새 포맷에 맞게 자동으로 재배치합니다. 스크립트 내용은 보존됩니다.",
    "lectureBuilder.formatMigrateBtn": "재배치 후 변경",
  },
  en: {
    "lectureBuilder.formatMigrateOption": "Auto-migrate scripts",
    "lectureBuilder.formatMigrateDesc": "Automatically rearrange existing scripts to fit the new format. Script content will be preserved.",
    "lectureBuilder.formatMigrateBtn": "Migrate & Apply",
  },
  zh: {
    "lectureBuilder.formatMigrateOption": "自动迁移脚本",
    "lectureBuilder.formatMigrateDesc": "自动将现有脚本重新排列以适应新格式。脚本内容将被保留。",
    "lectureBuilder.formatMigrateBtn": "迁移并应用",
  },
  ja: {
    "lectureBuilder.formatMigrateOption": "スクリプト自動再配置",
    "lectureBuilder.formatMigrateDesc": "既存のスクリプトを新しいフォーマットに合わせて自動的に再配置します。スクリプトの内容は保持されます。",
    "lectureBuilder.formatMigrateBtn": "再配置して変更",
  },
  vi: {
    "lectureBuilder.formatMigrateOption": "Tự động di chuyển kịch bản",
    "lectureBuilder.formatMigrateDesc": "Tự động sắp xếp lại các kịch bản hiện có để phù hợp với định dạng mới. Nội dung kịch bản sẽ được giữ nguyên.",
    "lectureBuilder.formatMigrateBtn": "Di chuyển & Áp dụng",
  },
  th: {
    "lectureBuilder.formatMigrateOption": "ย้ายสคริปต์อัตโนมัติ",
    "lectureBuilder.formatMigrateDesc": "จัดเรียงสคริปต์ที่มีอยู่ใหม่โดยอัตโนมัติให้เข้ากับรูปแบบใหม่ เนื้อหาสคริปต์จะถูกเก็บรักษาไว้",
    "lectureBuilder.formatMigrateBtn": "ย้ายและใช้งาน",
  },
  id: {
    "lectureBuilder.formatMigrateOption": "Migrasi skrip otomatis",
    "lectureBuilder.formatMigrateDesc": "Secara otomatis mengatur ulang skrip yang ada agar sesuai dengan format baru. Konten skrip akan dipertahankan.",
    "lectureBuilder.formatMigrateBtn": "Migrasi & Terapkan",
  },
  ms: {
    "lectureBuilder.formatMigrateOption": "Migrasi skrip automatik",
    "lectureBuilder.formatMigrateDesc": "Susun semula skrip sedia ada secara automatik untuk format baharu. Kandungan skrip akan dikekalkan.",
    "lectureBuilder.formatMigrateBtn": "Migrasi & Gunakan",
  },
  fr: {
    "lectureBuilder.formatMigrateOption": "Migration auto des scripts",
    "lectureBuilder.formatMigrateDesc": "Réorganise automatiquement les scripts existants pour le nouveau format. Le contenu sera préservé.",
    "lectureBuilder.formatMigrateBtn": "Migrer et appliquer",
  },
  de: {
    "lectureBuilder.formatMigrateOption": "Skripte automatisch migrieren",
    "lectureBuilder.formatMigrateDesc": "Vorhandene Skripte automatisch für das neue Format neu anordnen. Skriptinhalte bleiben erhalten.",
    "lectureBuilder.formatMigrateBtn": "Migrieren & Anwenden",
  },
  es: {
    "lectureBuilder.formatMigrateOption": "Migrar scripts automáticamente",
    "lectureBuilder.formatMigrateDesc": "Reorganiza automáticamente los scripts existentes para el nuevo formato. El contenido se conservará.",
    "lectureBuilder.formatMigrateBtn": "Migrar y aplicar",
  },
  pt: {
    "lectureBuilder.formatMigrateOption": "Migrar scripts automaticamente",
    "lectureBuilder.formatMigrateDesc": "Reorganiza automaticamente os scripts existentes para o novo formato. O conteúdo será preservado.",
    "lectureBuilder.formatMigrateBtn": "Migrar e aplicar",
  },
  ru: {
    "lectureBuilder.formatMigrateOption": "Автоперенос скриптов",
    "lectureBuilder.formatMigrateDesc": "Автоматически перестроить существующие скрипты под новый формат. Содержимое скриптов будет сохранено.",
    "lectureBuilder.formatMigrateBtn": "Перенести и применить",
  },
  ar: {
    "lectureBuilder.formatMigrateOption": "نقل النصوص تلقائياً",
    "lectureBuilder.formatMigrateDesc": "إعادة ترتيب النصوص الحالية تلقائياً لتتناسب مع التنسيق الجديد. سيتم الحفاظ على المحتوى.",
    "lectureBuilder.formatMigrateBtn": "نقل وتطبيق",
  },
  hi: {
    "lectureBuilder.formatMigrateOption": "स्क्रिप्ट स्वचालित माइग्रेशन",
    "lectureBuilder.formatMigrateDesc": "मौजूदा स्क्रिप्ट को नए प्रारूप में स्वचालित रूप से पुनर्व्यवस्थित करें। स्क्रिप्ट सामग्री संरक्षित रहेगी।",
    "lectureBuilder.formatMigrateBtn": "माइग्रेट और लागू करें",
  },
  bn: {
    "lectureBuilder.formatMigrateOption": "স্ক্রিপ্ট স্বয়ংক্রিয় স্থানান্তর",
    "lectureBuilder.formatMigrateDesc": "বিদ্যমান স্ক্রিপ্টগুলি নতুন ফর্ম্যাটে স্বয়ংক্রিয়ভাবে পুনর্বিন্যাস করুন। স্ক্রিপ্ট বিষয়বস্তু সংরক্ষিত থাকবে।",
    "lectureBuilder.formatMigrateBtn": "স্থানান্তর ও প্রয়োগ",
  },
  tr: {
    "lectureBuilder.formatMigrateOption": "Betikleri otomatik taşı",
    "lectureBuilder.formatMigrateDesc": "Mevcut betikleri yeni formata uygun şekilde otomatik olarak yeniden düzenler. Betik içeriği korunur.",
    "lectureBuilder.formatMigrateBtn": "Taşı ve Uygula",
  },
  pl: {
    "lectureBuilder.formatMigrateOption": "Automatyczna migracja skryptów",
    "lectureBuilder.formatMigrateDesc": "Automatycznie przeorganizuj istniejące skrypty do nowego formatu. Zawartość skryptów zostanie zachowana.",
    "lectureBuilder.formatMigrateBtn": "Migruj i zastosuj",
  },
  it: {
    "lectureBuilder.formatMigrateOption": "Migrazione automatica script",
    "lectureBuilder.formatMigrateDesc": "Riorganizza automaticamente gli script esistenti per il nuovo formato. Il contenuto verrà preservato.",
    "lectureBuilder.formatMigrateBtn": "Migra e applica",
  },
  nl: {
    "lectureBuilder.formatMigrateOption": "Scripts automatisch migreren",
    "lectureBuilder.formatMigrateDesc": "Bestaande scripts automatisch herschikken voor het nieuwe formaat. Scriptinhoud blijft behouden.",
    "lectureBuilder.formatMigrateBtn": "Migreren & toepassen",
  },
};

// FaceGallery i18n - role keys
const fgKeys = {
  ko: {
    "fg.default_role": "기본 역할",
    "fg.role_instructor": "강사",
    "fg.role_host": "호스트",
    "fg.role_guest": "게스트",
    "fg.role_narrator": "내레이터",
  },
  en: {
    "fg.default_role": "Default Role",
    "fg.role_instructor": "Instructor",
    "fg.role_host": "Host",
    "fg.role_guest": "Guest",
    "fg.role_narrator": "Narrator",
  },
  zh: {
    "fg.default_role": "默认角色",
    "fg.role_instructor": "讲师",
    "fg.role_host": "主持人",
    "fg.role_guest": "嘉宾",
    "fg.role_narrator": "旁白",
  },
  ja: {
    "fg.default_role": "デフォルト役割",
    "fg.role_instructor": "講師",
    "fg.role_host": "ホスト",
    "fg.role_guest": "ゲスト",
    "fg.role_narrator": "ナレーター",
  },
  vi: {
    "fg.default_role": "Vai trò mặc định",
    "fg.role_instructor": "Giảng viên",
    "fg.role_host": "Người dẫn",
    "fg.role_guest": "Khách mời",
    "fg.role_narrator": "Người kể",
  },
  th: {
    "fg.default_role": "บทบาทเริ่มต้น",
    "fg.role_instructor": "ผู้สอน",
    "fg.role_host": "พิธีกร",
    "fg.role_guest": "แขกรับเชิญ",
    "fg.role_narrator": "ผู้บรรยาย",
  },
  id: {
    "fg.default_role": "Peran Default",
    "fg.role_instructor": "Instruktur",
    "fg.role_host": "Pembawa Acara",
    "fg.role_guest": "Tamu",
    "fg.role_narrator": "Narator",
  },
  ms: {
    "fg.default_role": "Peranan Lalai",
    "fg.role_instructor": "Pengajar",
    "fg.role_host": "Hos",
    "fg.role_guest": "Tetamu",
    "fg.role_narrator": "Pencerita",
  },
  fr: {
    "fg.default_role": "Rôle par défaut",
    "fg.role_instructor": "Instructeur",
    "fg.role_host": "Animateur",
    "fg.role_guest": "Invité",
    "fg.role_narrator": "Narrateur",
  },
  de: {
    "fg.default_role": "Standardrolle",
    "fg.role_instructor": "Dozent",
    "fg.role_host": "Moderator",
    "fg.role_guest": "Gast",
    "fg.role_narrator": "Erzähler",
  },
  es: {
    "fg.default_role": "Rol predeterminado",
    "fg.role_instructor": "Instructor",
    "fg.role_host": "Presentador",
    "fg.role_guest": "Invitado",
    "fg.role_narrator": "Narrador",
  },
  pt: {
    "fg.default_role": "Papel padrão",
    "fg.role_instructor": "Instrutor",
    "fg.role_host": "Apresentador",
    "fg.role_guest": "Convidado",
    "fg.role_narrator": "Narrador",
  },
  ru: {
    "fg.default_role": "Роль по умолчанию",
    "fg.role_instructor": "Преподаватель",
    "fg.role_host": "Ведущий",
    "fg.role_guest": "Гость",
    "fg.role_narrator": "Диктор",
  },
  ar: {
    "fg.default_role": "الدور الافتراضي",
    "fg.role_instructor": "المحاضر",
    "fg.role_host": "المقدم",
    "fg.role_guest": "الضيف",
    "fg.role_narrator": "الراوي",
  },
  hi: {
    "fg.default_role": "डिफ़ॉल्ट भूमिका",
    "fg.role_instructor": "प्रशिक्षक",
    "fg.role_host": "होस्ट",
    "fg.role_guest": "अतिथि",
    "fg.role_narrator": "वर्णनकर्ता",
  },
  bn: {
    "fg.default_role": "ডিফল্ট ভূমিকা",
    "fg.role_instructor": "প্রশিক্ষক",
    "fg.role_host": "হোস্ট",
    "fg.role_guest": "অতিথি",
    "fg.role_narrator": "বর্ণনাকারী",
  },
  tr: {
    "fg.default_role": "Varsayılan Rol",
    "fg.role_instructor": "Eğitmen",
    "fg.role_host": "Sunucu",
    "fg.role_guest": "Konuk",
    "fg.role_narrator": "Anlatıcı",
  },
  pl: {
    "fg.default_role": "Domyślna rola",
    "fg.role_instructor": "Instruktor",
    "fg.role_host": "Prowadzący",
    "fg.role_guest": "Gość",
    "fg.role_narrator": "Narrator",
  },
  it: {
    "fg.default_role": "Ruolo predefinito",
    "fg.role_instructor": "Istruttore",
    "fg.role_host": "Conduttore",
    "fg.role_guest": "Ospite",
    "fg.role_narrator": "Narratore",
  },
  nl: {
    "fg.default_role": "Standaardrol",
    "fg.role_instructor": "Docent",
    "fg.role_host": "Presentator",
    "fg.role_guest": "Gast",
    "fg.role_narrator": "Verteller",
  },
};

// AvatarSettingsDialog i18n - apply history key
const asdKeys = {
  ko: { "avatarSettingsDialog.applyHistory": "적용 이력" },
  en: { "avatarSettingsDialog.applyHistory": "Apply History" },
  zh: { "avatarSettingsDialog.applyHistory": "应用历史" },
  ja: { "avatarSettingsDialog.applyHistory": "適用履歴" },
  vi: { "avatarSettingsDialog.applyHistory": "Lịch sử áp dụng" },
  th: { "avatarSettingsDialog.applyHistory": "ประวัติการใช้งาน" },
  id: { "avatarSettingsDialog.applyHistory": "Riwayat Penerapan" },
  ms: { "avatarSettingsDialog.applyHistory": "Sejarah Penggunaan" },
  fr: { "avatarSettingsDialog.applyHistory": "Historique d'application" },
  de: { "avatarSettingsDialog.applyHistory": "Anwendungsverlauf" },
  es: { "avatarSettingsDialog.applyHistory": "Historial de aplicación" },
  pt: { "avatarSettingsDialog.applyHistory": "Histórico de aplicação" },
  ru: { "avatarSettingsDialog.applyHistory": "История применения" },
  ar: { "avatarSettingsDialog.applyHistory": "سجل التطبيق" },
  hi: { "avatarSettingsDialog.applyHistory": "लागू इतिहास" },
  bn: { "avatarSettingsDialog.applyHistory": "প্রয়োগের ইতিহাস" },
  tr: { "avatarSettingsDialog.applyHistory": "Uygulama Geçmişi" },
  pl: { "avatarSettingsDialog.applyHistory": "Historia zastosowań" },
  it: { "avatarSettingsDialog.applyHistory": "Cronologia applicazioni" },
  nl: { "avatarSettingsDialog.applyHistory": "Toepassingsgeschiedenis" },
};

function addKeysToFile(filePath, keysMap) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const langs = Object.keys(keysMap);
  for (const lang of langs) {
    const keys = keysMap[lang];
    for (const [key, value] of Object.entries(keys)) {
      if (content.includes(`"${key}"`)) continue;
      // Find the language section and add before its closing
      const langPattern = new RegExp(`(export const ${lang}\\s*=\\s*\\{[\\s\\S]*?)(\\n\\};)`, 'm');
      const match = content.match(langPattern);
      if (match) {
        const escapedValue = JSON.stringify(value);
        content = content.replace(langPattern, `$1\n  "${key}": ${escapedValue},$2`);
      }
    }
  }
  fs.writeFileSync(filePath, content);
}

// Add to LectureBuilder i18n
const lbI18nPath = 'client/src/i18n/pages/LectureBuilder.ts';
if (fs.existsSync(lbI18nPath)) {
  addKeysToFile(lbI18nPath, lbKeys);
  console.log('Added format migration keys to LectureBuilder i18n');
}

// Add to FaceGallery i18n
const fgI18nPath = 'client/src/i18n/pages/FaceGallery.ts';
if (fs.existsSync(fgI18nPath)) {
  addKeysToFile(fgI18nPath, fgKeys);
  console.log('Added role keys to FaceGallery i18n');
}

// Add to AvatarSettingsDialog i18n
const asdI18nPath = 'client/src/i18n/components/AvatarSettingsDialog.ts';
if (fs.existsSync(asdI18nPath)) {
  addKeysToFile(asdI18nPath, asdKeys);
  console.log('Added apply history key to AvatarSettingsDialog i18n');
}

console.log('Done!');
