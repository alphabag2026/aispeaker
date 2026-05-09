import fs from 'fs';

// New keys to add for format warning dialog
const formatWarningKeys = {
  ko: {
    "lectureBuilder.formatWarningTitle": "포맷 변경 경고",
    "lectureBuilder.formatWarningDesc": "이 프로젝트에는 이미 작업된 콘텐츠가 있습니다. 포맷을 변경하면 기존 슬라이드 배치와 스크립트 구조에 영향을 줄 수 있습니다.",
    "lectureBuilder.formatWarningImpact": "영향을 받을 수 있는 콘텐츠:",
    "lectureBuilder.formatWarningSlides": "슬라이드 {{count}}개",
    "lectureBuilder.formatWarningScripts": "스크립트 {{count}}개",
    "lectureBuilder.formatWarningCancel": "취소",
    "lectureBuilder.formatWarningConfirm": "변경 적용",
  },
  en: {
    "lectureBuilder.formatWarningTitle": "Format Change Warning",
    "lectureBuilder.formatWarningDesc": "This project already has existing content. Changing the format may affect the current slide layout and script structure.",
    "lectureBuilder.formatWarningImpact": "Content that may be affected:",
    "lectureBuilder.formatWarningSlides": "{{count}} slides",
    "lectureBuilder.formatWarningScripts": "{{count}} scripts",
    "lectureBuilder.formatWarningCancel": "Cancel",
    "lectureBuilder.formatWarningConfirm": "Apply Changes",
  },
  zh: {
    "lectureBuilder.formatWarningTitle": "格式更改警告",
    "lectureBuilder.formatWarningDesc": "此项目已有现有内容。更改格式可能会影响当前幻灯片布局和脚本结构。",
    "lectureBuilder.formatWarningImpact": "可能受影响的内容：",
    "lectureBuilder.formatWarningSlides": "{{count}}个幻灯片",
    "lectureBuilder.formatWarningScripts": "{{count}}个脚本",
    "lectureBuilder.formatWarningCancel": "取消",
    "lectureBuilder.formatWarningConfirm": "应用更改",
  },
  ja: {
    "lectureBuilder.formatWarningTitle": "フォーマット変更の警告",
    "lectureBuilder.formatWarningDesc": "このプロジェクトには既存のコンテンツがあります。フォーマットを変更すると、現在のスライドレイアウトとスクリプト構造に影響する可能性があります。",
    "lectureBuilder.formatWarningImpact": "影響を受ける可能性のあるコンテンツ：",
    "lectureBuilder.formatWarningSlides": "スライド{{count}}枚",
    "lectureBuilder.formatWarningScripts": "スクリプト{{count}}件",
    "lectureBuilder.formatWarningCancel": "キャンセル",
    "lectureBuilder.formatWarningConfirm": "変更を適用",
  },
  vi: {
    "lectureBuilder.formatWarningTitle": "Cảnh báo thay đổi định dạng",
    "lectureBuilder.formatWarningDesc": "Dự án này đã có nội dung. Thay đổi định dạng có thể ảnh hưởng đến bố cục slide và cấu trúc kịch bản hiện tại.",
    "lectureBuilder.formatWarningImpact": "Nội dung có thể bị ảnh hưởng:",
    "lectureBuilder.formatWarningSlides": "{{count}} slide",
    "lectureBuilder.formatWarningScripts": "{{count}} kịch bản",
    "lectureBuilder.formatWarningCancel": "Hủy",
    "lectureBuilder.formatWarningConfirm": "Áp dụng thay đổi",
  },
  th: {
    "lectureBuilder.formatWarningTitle": "คำเตือนการเปลี่ยนรูปแบบ",
    "lectureBuilder.formatWarningDesc": "โปรเจกต์นี้มีเนื้อหาอยู่แล้ว การเปลี่ยนรูปแบบอาจส่งผลต่อเลย์เอาต์สไลด์และโครงสร้างสคริปต์ปัจจุบัน",
    "lectureBuilder.formatWarningImpact": "เนื้อหาที่อาจได้รับผลกระทบ:",
    "lectureBuilder.formatWarningSlides": "สไลด์ {{count}} รายการ",
    "lectureBuilder.formatWarningScripts": "สคริปต์ {{count}} รายการ",
    "lectureBuilder.formatWarningCancel": "ยกเลิก",
    "lectureBuilder.formatWarningConfirm": "ใช้การเปลี่ยนแปลง",
  },
  id: {
    "lectureBuilder.formatWarningTitle": "Peringatan Perubahan Format",
    "lectureBuilder.formatWarningDesc": "Proyek ini sudah memiliki konten. Mengubah format dapat memengaruhi tata letak slide dan struktur skrip saat ini.",
    "lectureBuilder.formatWarningImpact": "Konten yang mungkin terpengaruh:",
    "lectureBuilder.formatWarningSlides": "{{count}} slide",
    "lectureBuilder.formatWarningScripts": "{{count}} skrip",
    "lectureBuilder.formatWarningCancel": "Batal",
    "lectureBuilder.formatWarningConfirm": "Terapkan Perubahan",
  },
  ms: {
    "lectureBuilder.formatWarningTitle": "Amaran Perubahan Format",
    "lectureBuilder.formatWarningDesc": "Projek ini sudah mempunyai kandungan. Menukar format mungkin menjejaskan susun atur slaid dan struktur skrip semasa.",
    "lectureBuilder.formatWarningImpact": "Kandungan yang mungkin terjejas:",
    "lectureBuilder.formatWarningSlides": "{{count}} slaid",
    "lectureBuilder.formatWarningScripts": "{{count}} skrip",
    "lectureBuilder.formatWarningCancel": "Batal",
    "lectureBuilder.formatWarningConfirm": "Gunakan Perubahan",
  },
  es: {
    "lectureBuilder.formatWarningTitle": "Advertencia de cambio de formato",
    "lectureBuilder.formatWarningDesc": "Este proyecto ya tiene contenido existente. Cambiar el formato puede afectar el diseño actual de diapositivas y la estructura del guión.",
    "lectureBuilder.formatWarningImpact": "Contenido que puede verse afectado:",
    "lectureBuilder.formatWarningSlides": "{{count}} diapositivas",
    "lectureBuilder.formatWarningScripts": "{{count}} guiones",
    "lectureBuilder.formatWarningCancel": "Cancelar",
    "lectureBuilder.formatWarningConfirm": "Aplicar cambios",
  },
  fr: {
    "lectureBuilder.formatWarningTitle": "Avertissement de changement de format",
    "lectureBuilder.formatWarningDesc": "Ce projet contient déjà du contenu. Changer le format peut affecter la mise en page actuelle des diapositives et la structure du script.",
    "lectureBuilder.formatWarningImpact": "Contenu pouvant être affecté :",
    "lectureBuilder.formatWarningSlides": "{{count}} diapositives",
    "lectureBuilder.formatWarningScripts": "{{count}} scripts",
    "lectureBuilder.formatWarningCancel": "Annuler",
    "lectureBuilder.formatWarningConfirm": "Appliquer les modifications",
  },
  de: {
    "lectureBuilder.formatWarningTitle": "Warnung bei Formatänderung",
    "lectureBuilder.formatWarningDesc": "Dieses Projekt enthält bereits Inhalte. Eine Formatänderung kann das aktuelle Folienlayout und die Skriptstruktur beeinflussen.",
    "lectureBuilder.formatWarningImpact": "Möglicherweise betroffene Inhalte:",
    "lectureBuilder.formatWarningSlides": "{{count}} Folien",
    "lectureBuilder.formatWarningScripts": "{{count}} Skripte",
    "lectureBuilder.formatWarningCancel": "Abbrechen",
    "lectureBuilder.formatWarningConfirm": "Änderungen anwenden",
  },
  pt: {
    "lectureBuilder.formatWarningTitle": "Aviso de alteração de formato",
    "lectureBuilder.formatWarningDesc": "Este projeto já possui conteúdo existente. Alterar o formato pode afetar o layout atual dos slides e a estrutura do roteiro.",
    "lectureBuilder.formatWarningImpact": "Conteúdo que pode ser afetado:",
    "lectureBuilder.formatWarningSlides": "{{count}} slides",
    "lectureBuilder.formatWarningScripts": "{{count}} roteiros",
    "lectureBuilder.formatWarningCancel": "Cancelar",
    "lectureBuilder.formatWarningConfirm": "Aplicar alterações",
  },
  ru: {
    "lectureBuilder.formatWarningTitle": "Предупреждение об изменении формата",
    "lectureBuilder.formatWarningDesc": "В этом проекте уже есть контент. Изменение формата может повлиять на текущую компоновку слайдов и структуру сценария.",
    "lectureBuilder.formatWarningImpact": "Контент, который может быть затронут:",
    "lectureBuilder.formatWarningSlides": "{{count}} слайдов",
    "lectureBuilder.formatWarningScripts": "{{count}} сценариев",
    "lectureBuilder.formatWarningCancel": "Отмена",
    "lectureBuilder.formatWarningConfirm": "Применить изменения",
  },
  ar: {
    "lectureBuilder.formatWarningTitle": "تحذير تغيير التنسيق",
    "lectureBuilder.formatWarningDesc": "يحتوي هذا المشروع بالفعل على محتوى. قد يؤثر تغيير التنسيق على تخطيط الشرائح الحالي وبنية النص.",
    "lectureBuilder.formatWarningImpact": "المحتوى الذي قد يتأثر:",
    "lectureBuilder.formatWarningSlides": "{{count}} شريحة",
    "lectureBuilder.formatWarningScripts": "{{count}} نص",
    "lectureBuilder.formatWarningCancel": "إلغاء",
    "lectureBuilder.formatWarningConfirm": "تطبيق التغييرات",
  },
  hi: {
    "lectureBuilder.formatWarningTitle": "प्रारूप परिवर्तन चेतावनी",
    "lectureBuilder.formatWarningDesc": "इस प्रोजेक्ट में पहले से सामग्री मौजूद है। प्रारूप बदलने से वर्तमान स्लाइड लेआउट और स्क्रिप्ट संरचना प्रभावित हो सकती है।",
    "lectureBuilder.formatWarningImpact": "प्रभावित हो सकने वाली सामग्री:",
    "lectureBuilder.formatWarningSlides": "{{count}} स्लाइड",
    "lectureBuilder.formatWarningScripts": "{{count}} स्क्रिप्ट",
    "lectureBuilder.formatWarningCancel": "रद्द करें",
    "lectureBuilder.formatWarningConfirm": "परिवर्तन लागू करें",
  },
  it: {
    "lectureBuilder.formatWarningTitle": "Avviso cambio formato",
    "lectureBuilder.formatWarningDesc": "Questo progetto ha già contenuti esistenti. Cambiare il formato potrebbe influire sul layout attuale delle slide e sulla struttura dello script.",
    "lectureBuilder.formatWarningImpact": "Contenuti che potrebbero essere interessati:",
    "lectureBuilder.formatWarningSlides": "{{count}} slide",
    "lectureBuilder.formatWarningScripts": "{{count}} script",
    "lectureBuilder.formatWarningCancel": "Annulla",
    "lectureBuilder.formatWarningConfirm": "Applica modifiche",
  },
  nl: {
    "lectureBuilder.formatWarningTitle": "Waarschuwing formaatwijziging",
    "lectureBuilder.formatWarningDesc": "Dit project heeft al bestaande inhoud. Het wijzigen van het formaat kan de huidige dia-indeling en scriptstructuur beïnvloeden.",
    "lectureBuilder.formatWarningImpact": "Inhoud die mogelijk wordt beïnvloed:",
    "lectureBuilder.formatWarningSlides": "{{count}} dia's",
    "lectureBuilder.formatWarningScripts": "{{count}} scripts",
    "lectureBuilder.formatWarningCancel": "Annuleren",
    "lectureBuilder.formatWarningConfirm": "Wijzigingen toepassen",
  },
  pl: {
    "lectureBuilder.formatWarningTitle": "Ostrzeżenie o zmianie formatu",
    "lectureBuilder.formatWarningDesc": "Ten projekt ma już istniejącą treść. Zmiana formatu może wpłynąć na obecny układ slajdów i strukturę skryptu.",
    "lectureBuilder.formatWarningImpact": "Treść, która może zostać zmieniona:",
    "lectureBuilder.formatWarningSlides": "{{count}} slajdów",
    "lectureBuilder.formatWarningScripts": "{{count}} skryptów",
    "lectureBuilder.formatWarningCancel": "Anuluj",
    "lectureBuilder.formatWarningConfirm": "Zastosuj zmiany",
  },
  sv: {
    "lectureBuilder.formatWarningTitle": "Varning för formatändring",
    "lectureBuilder.formatWarningDesc": "Detta projekt har redan befintligt innehåll. Att ändra formatet kan påverka den nuvarande bildlayouten och skriptstrukturen.",
    "lectureBuilder.formatWarningImpact": "Innehåll som kan påverkas:",
    "lectureBuilder.formatWarningSlides": "{{count}} bilder",
    "lectureBuilder.formatWarningScripts": "{{count}} skript",
    "lectureBuilder.formatWarningCancel": "Avbryt",
    "lectureBuilder.formatWarningConfirm": "Tillämpa ändringar",
  },
  tr: {
    "lectureBuilder.formatWarningTitle": "Format Değişikliği Uyarısı",
    "lectureBuilder.formatWarningDesc": "Bu projede zaten mevcut içerik var. Formatı değiştirmek mevcut slayt düzenini ve senaryo yapısını etkileyebilir.",
    "lectureBuilder.formatWarningImpact": "Etkilenebilecek içerik:",
    "lectureBuilder.formatWarningSlides": "{{count}} slayt",
    "lectureBuilder.formatWarningScripts": "{{count}} senaryo",
    "lectureBuilder.formatWarningCancel": "İptal",
    "lectureBuilder.formatWarningConfirm": "Değişiklikleri Uygula",
  },
};

// Avatar apply dialog keys
const avatarApplyKeys = {
  ko: {
    "avatarSettingsDialog.applySelected": "선택 적용",
    "avatarSettingsDialog.selectAtLeastOne": "최소 1개 아바타를 선택하세요",
  },
  en: {
    "avatarSettingsDialog.applySelected": "Apply Selected",
    "avatarSettingsDialog.selectAtLeastOne": "Please select at least 1 avatar",
  },
  zh: {
    "avatarSettingsDialog.applySelected": "应用所选",
    "avatarSettingsDialog.selectAtLeastOne": "请至少选择1个头像",
  },
  ja: {
    "avatarSettingsDialog.applySelected": "選択を適用",
    "avatarSettingsDialog.selectAtLeastOne": "少なくとも1つのアバターを選択してください",
  },
  vi: {
    "avatarSettingsDialog.applySelected": "Áp dụng đã chọn",
    "avatarSettingsDialog.selectAtLeastOne": "Vui lòng chọn ít nhất 1 avatar",
  },
  th: {
    "avatarSettingsDialog.applySelected": "ใช้ที่เลือก",
    "avatarSettingsDialog.selectAtLeastOne": "กรุณาเลือกอย่างน้อย 1 อวาตาร์",
  },
  id: {
    "avatarSettingsDialog.applySelected": "Terapkan Terpilih",
    "avatarSettingsDialog.selectAtLeastOne": "Pilih setidaknya 1 avatar",
  },
  ms: {
    "avatarSettingsDialog.applySelected": "Gunakan Terpilih",
    "avatarSettingsDialog.selectAtLeastOne": "Sila pilih sekurang-kurangnya 1 avatar",
  },
  es: {
    "avatarSettingsDialog.applySelected": "Aplicar seleccionados",
    "avatarSettingsDialog.selectAtLeastOne": "Seleccione al menos 1 avatar",
  },
  fr: {
    "avatarSettingsDialog.applySelected": "Appliquer la sélection",
    "avatarSettingsDialog.selectAtLeastOne": "Veuillez sélectionner au moins 1 avatar",
  },
  de: {
    "avatarSettingsDialog.applySelected": "Auswahl anwenden",
    "avatarSettingsDialog.selectAtLeastOne": "Bitte wählen Sie mindestens 1 Avatar",
  },
  pt: {
    "avatarSettingsDialog.applySelected": "Aplicar selecionados",
    "avatarSettingsDialog.selectAtLeastOne": "Selecione pelo menos 1 avatar",
  },
  ru: {
    "avatarSettingsDialog.applySelected": "Применить выбранные",
    "avatarSettingsDialog.selectAtLeastOne": "Выберите хотя бы 1 аватар",
  },
  ar: {
    "avatarSettingsDialog.applySelected": "تطبيق المحدد",
    "avatarSettingsDialog.selectAtLeastOne": "يرجى اختيار صورة رمزية واحدة على الأقل",
  },
  hi: {
    "avatarSettingsDialog.applySelected": "चयनित लागू करें",
    "avatarSettingsDialog.selectAtLeastOne": "कृपया कम से कम 1 अवतार चुनें",
  },
  it: {
    "avatarSettingsDialog.applySelected": "Applica selezionati",
    "avatarSettingsDialog.selectAtLeastOne": "Seleziona almeno 1 avatar",
  },
  nl: {
    "avatarSettingsDialog.applySelected": "Selectie toepassen",
    "avatarSettingsDialog.selectAtLeastOne": "Selecteer ten minste 1 avatar",
  },
  pl: {
    "avatarSettingsDialog.applySelected": "Zastosuj wybrane",
    "avatarSettingsDialog.selectAtLeastOne": "Wybierz co najmniej 1 awatar",
  },
  sv: {
    "avatarSettingsDialog.applySelected": "Tillämpa valda",
    "avatarSettingsDialog.selectAtLeastOne": "Välj minst 1 avatar",
  },
  tr: {
    "avatarSettingsDialog.applySelected": "Seçilenleri Uygula",
    "avatarSettingsDialog.selectAtLeastOne": "Lütfen en az 1 avatar seçin",
  },
};

// Process LectureBuilder i18n file
const lbFile = 'client/src/i18n/pages/LectureBuilder.ts';
let lbContent = fs.readFileSync(lbFile, 'utf-8');

const languages = ['ko','en','zh','ja','vi','th','id','ms','es','fr','de','pt','ru','ar','hi','it','nl','pl','sv','tr'];

for (const lang of languages) {
  const keys = formatWarningKeys[lang];
  if (!keys) continue;
  
  // Find the formatChangeSuccess line for this language and add after it
  const searchStr = `"lectureBuilder.formatChangeSuccess"`;
  const lines = lbContent.split('\n');
  let inserted = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchStr) && !inserted) {
      // Check if this is the right language section by looking backwards for registerTranslations
      let foundLang = null;
      for (let j = i; j >= Math.max(0, i - 600); j--) {
        const match = lines[j].match(/registerTranslations\("(\w+)"/);
        if (match) { foundLang = match[1]; break; }
      }
      if (foundLang === lang) {
        const newLines = Object.entries(keys).map(([k, v]) => `  "${k}": "${v}",`);
        lines.splice(i + 1, 0, ...newLines);
        inserted = true;
      }
    }
  }
  lbContent = lines.join('\n');
}

fs.writeFileSync(lbFile, lbContent);
console.log('LectureBuilder i18n updated with format warning keys');

// Process AvatarSettingsDialog i18n file
const asFile = 'client/src/i18n/components/AvatarSettingsDialog.ts';
let asContent = fs.readFileSync(asFile, 'utf-8');

for (const lang of languages) {
  const keys = avatarApplyKeys[lang];
  if (!keys) continue;
  
  // Find the applyToAll line for this language
  const searchStr = `"avatarSettingsDialog.applyToAll"`;
  const lines = asContent.split('\n');
  let inserted = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchStr) && !inserted) {
      let foundLang = null;
      for (let j = i; j >= Math.max(0, i - 200); j--) {
        const match = lines[j].match(/registerTranslations\("(\w+)"/);
        if (match) { foundLang = match[1]; break; }
      }
      if (foundLang === lang) {
        const newLines = Object.entries(keys).map(([k, v]) => `  "${k}": "${v}",`);
        lines.splice(i + 1, 0, ...newLines);
        inserted = true;
      }
    }
  }
  asContent = lines.join('\n');
}

fs.writeFileSync(asFile, asContent);
console.log('AvatarSettingsDialog i18n updated with apply selected keys');
