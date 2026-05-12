/**
 * Add lectureFormatSelector.loadError and lectureFormatSelector.retry
 * to all 20 languages in the i18n file
 */
import fs from 'fs';

const filePath = './client/src/i18n/components/LectureFormatSelector.ts';
let content = fs.readFileSync(filePath, 'utf8');

const translations = {
  ko: { loadError: "포맷 데이터를 불러올 수 없습니다.", retry: "다시 시도" },
  en: { loadError: "Unable to load format data.", retry: "Retry" },
  zh: { loadError: "无法加载格式数据。", retry: "重试" },
  ja: { loadError: "フォーマットデータを読み込めません。", retry: "再試行" },
  vi: { loadError: "Không thể tải dữ liệu định dạng.", retry: "Thử lại" },
  th: { loadError: "ไม่สามารถโหลดข้อมูลรูปแบบได้", retry: "ลองอีกครั้ง" },
  id: { loadError: "Tidak dapat memuat data format.", retry: "Coba lagi" },
  ms: { loadError: "Tidak dapat memuatkan data format.", retry: "Cuba lagi" },
  es: { loadError: "No se pueden cargar los datos del formato.", retry: "Reintentar" },
  fr: { loadError: "Impossible de charger les données du format.", retry: "Réessayer" },
  de: { loadError: "Formatdaten können nicht geladen werden.", retry: "Erneut versuchen" },
  pt: { loadError: "Não foi possível carregar os dados do formato.", retry: "Tentar novamente" },
  ru: { loadError: "Не удалось загрузить данные формата.", retry: "Повторить" },
  ar: { loadError: "تعذر تحميل بيانات التنسيق.", retry: "إعادة المحاولة" },
  hi: { loadError: "प्रारूप डेटा लोड नहीं हो सका।", retry: "पुनः प्रयास करें" },
  it: { loadError: "Impossibile caricare i dati del formato.", retry: "Riprova" },
  nl: { loadError: "Kan formaatgegevens niet laden.", retry: "Opnieuw proberen" },
  pl: { loadError: "Nie można załadować danych formatu.", retry: "Ponów próbę" },
  sv: { loadError: "Kan inte ladda formatdata.", retry: "Försök igen" },
  tr: { loadError: "Format verileri yüklenemiyor.", retry: "Tekrar dene" },
};

// For each language, find the applyFormat line and add loadError/retry after it
for (const [lang, trans] of Object.entries(translations)) {
  // Check if loadError already exists for this lang
  const checkRegex = new RegExp(`"${lang}"[\\s\\S]*?"lectureFormatSelector\\.loadError"`);
  if (checkRegex.test(content)) {
    console.log(`${lang}: loadError already exists, skipping`);
    continue;
  }

  // Find the applyFormat line in this language's first block
  // Pattern: "lectureFormatSelector.applyFormat": "...", (or without trailing comma) followed by newline and });
  const searchStr = `"lectureFormatSelector.applyFormat"`;
  
  // Find all occurrences and pick the one in the right language block
  let startIdx = 0;
  let found = false;
  
  while (true) {
    const langBlockIdx = content.indexOf(`registerTranslations("${lang}", {`, startIdx);
    if (langBlockIdx === -1) break;
    
    // Find the closing }); for this block
    const blockEnd = content.indexOf('});', langBlockIdx);
    if (blockEnd === -1) break;
    
    // Check if this block contains applyFormat
    const blockContent = content.substring(langBlockIdx, blockEnd + 3);
    if (blockContent.includes(searchStr)) {
      // Insert loadError and retry before the });
      const insertPoint = blockEnd;
      const insertText = `  "lectureFormatSelector.loadError": "${trans.loadError}",\n  "lectureFormatSelector.retry": "${trans.retry}",\n`;
      content = content.substring(0, insertPoint) + insertText + content.substring(insertPoint);
      console.log(`${lang}: Added loadError and retry`);
      found = true;
      break;
    }
    
    startIdx = blockEnd + 3;
  }
  
  if (!found) {
    console.log(`${lang}: Could not find applyFormat block`);
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done! File updated.');
