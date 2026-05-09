import fs from 'fs';

const translations = {
  "lectureBuilder.changeFormat": {
    ko: "포맷 변경",
    en: "Change Format",
    zh: "更改格式",
    ja: "フォーマット変更",
    vi: "Đổi định dạng",
    th: "เปลี่ยนรูปแบบ",
    id: "Ubah Format",
    ms: "Tukar Format",
    es: "Cambiar formato",
    fr: "Changer le format",
    de: "Format ändern",
    pt: "Alterar formato",
    ru: "Изменить формат",
    ar: "تغيير التنسيق",
    hi: "प्रारूप बदलें",
    it: "Cambia formato",
    nl: "Formaat wijzigen",
    pl: "Zmień format",
    sv: "Ändra format",
    tr: "Formatı değiştir",
  },
  "lectureBuilder.changeFormatTitle": {
    ko: "강의 포맷 설정 변경",
    en: "Change Lecture Format Settings",
    zh: "更改讲座格式设置",
    ja: "講義フォーマット設定変更",
    vi: "Thay đổi cài đặt định dạng bài giảng",
    th: "เปลี่ยนการตั้งค่ารูปแบบการบรรยาย",
    id: "Ubah Pengaturan Format Kuliah",
    ms: "Tukar Tetapan Format Kuliah",
    es: "Cambiar configuración de formato de clase",
    fr: "Modifier les paramètres de format du cours",
    de: "Vorlesungsformat-Einstellungen ändern",
    pt: "Alterar configurações de formato da aula",
    ru: "Изменить настройки формата лекции",
    ar: "تغيير إعدادات تنسيق المحاضرة",
    hi: "व्याख्यान प्रारूप सेटिंग बदलें",
    it: "Modifica impostazioni formato lezione",
    nl: "Collegeopmaak-instellingen wijzigen",
    pl: "Zmień ustawienia formatu wykładu",
    sv: "Ändra föreläsningsformatinställningar",
    tr: "Ders formatı ayarlarını değiştir",
  },
  "lectureBuilder.currentFormatInfo": {
    ko: "현재 저장된 포맷이 선택되어 있습니다. 변경하려면 새로운 포맷을 선택하세요.",
    en: "The currently saved format is selected. Choose a new format to change it.",
    zh: "当前已保存的格式已被选中。选择新格式进行更改。",
    ja: "現在保存されているフォーマットが選択されています。変更するには新しいフォーマットを選択してください。",
    vi: "Định dạng đã lưu hiện tại đang được chọn. Chọn định dạng mới để thay đổi.",
    th: "รูปแบบที่บันทึกไว้ถูกเลือกอยู่ เลือกรูปแบบใหม่เพื่อเปลี่ยน",
    id: "Format yang tersimpan saat ini dipilih. Pilih format baru untuk mengubahnya.",
    ms: "Format yang disimpan semasa dipilih. Pilih format baharu untuk menukarnya.",
    es: "El formato guardado actualmente está seleccionado. Elige un nuevo formato para cambiarlo.",
    fr: "Le format actuellement enregistré est sélectionné. Choisissez un nouveau format pour le modifier.",
    de: "Das aktuell gespeicherte Format ist ausgewählt. Wählen Sie ein neues Format zum Ändern.",
    pt: "O formato salvo atualmente está selecionado. Escolha um novo formato para alterá-lo.",
    ru: "Текущий сохранённый формат выбран. Выберите новый формат для изменения.",
    ar: "التنسيق المحفوظ حالياً محدد. اختر تنسيقاً جديداً لتغييره.",
    hi: "वर्तमान में सहेजा गया प्रारूप चयनित है। बदलने के लिए नया प्रारूप चुनें।",
    it: "Il formato attualmente salvato è selezionato. Scegli un nuovo formato per cambiarlo.",
    nl: "Het huidige opgeslagen formaat is geselecteerd. Kies een nieuw formaat om het te wijzigen.",
    pl: "Aktualnie zapisany format jest wybrany. Wybierz nowy format, aby go zmienić.",
    sv: "Det aktuellt sparade formatet är valt. Välj ett nytt format för att ändra det.",
    tr: "Şu anda kaydedilen format seçili. Değiştirmek için yeni bir format seçin.",
  },
  "lectureBuilder.formatChangeSuccess": {
    ko: "강의 포맷이 변경되었습니다",
    en: "Lecture format has been changed",
    zh: "讲座格式已更改",
    ja: "講義フォーマットが変更されました",
    vi: "Định dạng bài giảng đã được thay đổi",
    th: "รูปแบบการบรรยายถูกเปลี่ยนแล้ว",
    id: "Format kuliah telah diubah",
    ms: "Format kuliah telah ditukar",
    es: "El formato de la clase ha sido cambiado",
    fr: "Le format du cours a été modifié",
    de: "Das Vorlesungsformat wurde geändert",
    pt: "O formato da aula foi alterado",
    ru: "Формат лекции был изменён",
    ar: "تم تغيير تنسيق المحاضرة",
    hi: "व्याख्यान प्रारूप बदल दिया गया है",
    it: "Il formato della lezione è stato modificato",
    nl: "Het collegeopmaak is gewijzigd",
    pl: "Format wykładu został zmieniony",
    sv: "Föreläsningsformatet har ändrats",
    tr: "Ders formatı değiştirildi",
  },
};

const filePath = 'client/src/i18n/pages/LectureBuilder.ts';
let content = fs.readFileSync(filePath, 'utf-8');

const languages = ['ko', 'en', 'zh', 'ja', 'vi', 'th', 'id', 'ms', 'es', 'fr', 'de', 'pt', 'ru', 'ar', 'hi', 'it', 'nl', 'pl', 'sv', 'tr'];

for (const lang of languages) {
  // Find the closing }); for this language section
  const marker = `registerTranslations("${lang}", {`;
  const markerIdx = content.indexOf(marker);
  if (markerIdx === -1) {
    console.error(`Could not find marker for language: ${lang}`);
    continue;
  }
  
  // Find the closing }); after this marker
  let braceCount = 0;
  let closingIdx = -1;
  for (let i = markerIdx + marker.length; i < content.length; i++) {
    if (content[i] === '{') braceCount++;
    if (content[i] === '}') {
      if (braceCount === 0) {
        closingIdx = i;
        break;
      }
      braceCount--;
    }
  }
  
  if (closingIdx === -1) {
    console.error(`Could not find closing brace for language: ${lang}`);
    continue;
  }
  
  // Build new entries
  let newEntries = '';
  for (const [key, trans] of Object.entries(translations)) {
    if (trans[lang]) {
      newEntries += `  "${key}": "${trans[lang].replace(/"/g, '\\"')}",\n`;
    }
  }
  
  // Insert before the closing });
  content = content.slice(0, closingIdx) + newEntries + content.slice(closingIdx);
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Successfully added format change i18n keys to all 20 languages');
