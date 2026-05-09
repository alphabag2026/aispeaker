import fs from 'fs';

const translations = {
  "fg.gallery_tab": {
    ko: "갤러리", en: "Gallery", zh: "画廊", ja: "ギャラリー", vi: "Bộ sưu tập", th: "แกลเลอรี",
    es: "Galería", fr: "Galerie", de: "Galerie", pt: "Galeria", ru: "Галерея", ar: "معرض",
    hi: "गैलरी", id: "Galeri", ms: "Galeri", tr: "Galeri", it: "Galleria", nl: "Galerij", pl: "Galeria", sv: "Galleri",
  },
  "fg.my_avatars_tab": {
    ko: "내 아바타", en: "My Avatars", zh: "我的头像", ja: "マイアバター", vi: "Avatar của tôi", th: "อวาตาร์ของฉัน",
    es: "Mis avatares", fr: "Mes avatars", de: "Meine Avatare", pt: "Meus avatares", ru: "Мои аватары", ar: "صوري الرمزية",
    hi: "मेरे अवतार", id: "Avatar saya", ms: "Avatar saya", tr: "Avatarlarım", it: "I miei avatar", nl: "Mijn avatars", pl: "Moje awatary", sv: "Mina avatarer",
  },
  "fg.my_avatars_title": {
    ko: "내 아바타 관리", en: "Manage My Avatars", zh: "管理我的头像", ja: "マイアバター管理", vi: "Quản lý avatar", th: "จัดการอวาตาร์",
    es: "Gestionar avatares", fr: "Gérer mes avatars", de: "Avatare verwalten", pt: "Gerenciar avatares", ru: "Управление аватарами", ar: "إدارة الصور الرمزية",
    hi: "अवतार प्रबंधित करें", id: "Kelola avatar", ms: "Urus avatar", tr: "Avatarları yönet", it: "Gestisci avatar", nl: "Avatars beheren", pl: "Zarządzaj awatarami", sv: "Hantera avatarer",
  },
  "fg.avatars_count": {
    ko: "개", en: "avatars", zh: "个", ja: "個", vi: "avatar", th: "อวาตาร์",
    es: "avatares", fr: "avatars", de: "Avatare", pt: "avatares", ru: "аватаров", ar: "صور رمزية",
    hi: "अवतार", id: "avatar", ms: "avatar", tr: "avatar", it: "avatar", nl: "avatars", pl: "awatarów", sv: "avatarer",
  },
  "fg.no_my_avatars": {
    ko: "아직 등록된 아바타가 없습니다. 스튜디오에서 아바타를 추가해보세요.", en: "No avatars yet. Add one from the studio.", zh: "还没有头像。请从工作室添加。", ja: "まだアバターがありません。スタジオから追加してください。",
    vi: "Chưa có avatar. Thêm từ studio.", th: "ยังไม่มีอวาตาร์ เพิ่มจากสตูดิโอ",
    es: "Sin avatares. Añade uno desde el estudio.", fr: "Pas d'avatars. Ajoutez-en depuis le studio.", de: "Keine Avatare. Fügen Sie einen aus dem Studio hinzu.", pt: "Sem avatares. Adicione um do estúdio.",
    ru: "Нет аватаров. Добавьте из студии.", ar: "لا توجد صور رمزية. أضف واحدة من الاستوديو.", hi: "कोई अवतार नहीं। स्टूडियो से जोड़ें।",
    id: "Belum ada avatar. Tambahkan dari studio.", ms: "Tiada avatar lagi. Tambah dari studio.", tr: "Henüz avatar yok. Stüdyodan ekleyin.",
    it: "Nessun avatar. Aggiungine uno dallo studio.", nl: "Nog geen avatars. Voeg er een toe vanuit de studio.", pl: "Brak awatarów. Dodaj ze studia.", sv: "Inga avatarer ännu. Lägg till en från studion.",
  },
  "fg.photo": {
    ko: "사진", en: "Photo", zh: "照片", ja: "写真", vi: "Ảnh", th: "รูปถ่าย",
    es: "Foto", fr: "Photo", de: "Foto", pt: "Foto", ru: "Фото", ar: "صورة",
    hi: "फ़ोटो", id: "Foto", ms: "Foto", tr: "Fotoğraf", it: "Foto", nl: "Foto", pl: "Zdjęcie", sv: "Foto",
  },
  "fg.custom": {
    ko: "커스텀", en: "Custom", zh: "自定义", ja: "カスタム", vi: "Tùy chỉnh", th: "กำหนดเอง",
    es: "Personalizado", fr: "Personnalisé", de: "Benutzerdefiniert", pt: "Personalizado", ru: "Пользовательский", ar: "مخصص",
    hi: "कस्टम", id: "Kustom", ms: "Tersuai", tr: "Özel", it: "Personalizzato", nl: "Aangepast", pl: "Niestandardowy", sv: "Anpassad",
  },
  "fg.default_voice": {
    ko: "기본 음성", en: "Default Voice", zh: "默认语音", ja: "デフォルト音声", vi: "Giọng mặc định", th: "เสียงเริ่มต้น",
    es: "Voz predeterminada", fr: "Voix par défaut", de: "Standardstimme", pt: "Voz padrão", ru: "Голос по умолчанию", ar: "الصوت الافتراضي",
    hi: "डिफ़ॉल्ट आवाज़", id: "Suara default", ms: "Suara lalai", tr: "Varsayılan ses", it: "Voce predefinita", nl: "Standaardstem", pl: "Domyślny głos", sv: "Standardröst",
  },
  "fg.set_default_voice": {
    ko: "설정", en: "Set", zh: "设置", ja: "設定", vi: "Đặt", th: "ตั้งค่า",
    es: "Configurar", fr: "Définir", de: "Festlegen", pt: "Definir", ru: "Установить", ar: "تعيين",
    hi: "सेट करें", id: "Atur", ms: "Tetapkan", tr: "Ayarla", it: "Imposta", nl: "Instellen", pl: "Ustaw", sv: "Ställ in",
  },
  "fg.default_voice_saved": {
    ko: "기본 음성이 저장되었습니다", en: "Default voice saved", zh: "默认语音已保存", ja: "デフォルト音声が保存されました", vi: "Đã lưu giọng mặc định", th: "บันทึกเสียงเริ่มต้นแล้ว",
    es: "Voz predeterminada guardada", fr: "Voix par défaut enregistrée", de: "Standardstimme gespeichert", pt: "Voz padrão salva", ru: "Голос по умолчанию сохранён", ar: "تم حفظ الصوت الافتراضي",
    hi: "डिफ़ॉल्ट आवाज़ सहेजी गई", id: "Suara default disimpan", ms: "Suara lalai disimpan", tr: "Varsayılan ses kaydedildi", it: "Voce predefinita salvata", nl: "Standaardstem opgeslagen", pl: "Domyślny głos zapisany", sv: "Standardröst sparad",
  },
  "fg.default_voice_failed": {
    ko: "기본 음성 저장에 실패했습니다", en: "Failed to save default voice", zh: "保存默认语音失败", ja: "デフォルト音声の保存に失敗しました", vi: "Lưu giọng mặc định thất bại", th: "บันทึกเสียงเริ่มต้นล้มเหลว",
    es: "Error al guardar la voz", fr: "Échec de l'enregistrement", de: "Speichern fehlgeschlagen", pt: "Falha ao salvar", ru: "Ошибка сохранения", ar: "فشل في الحفظ",
    hi: "सहेजने में विफल", id: "Gagal menyimpan", ms: "Gagal menyimpan", tr: "Kaydetme başarısız", it: "Salvataggio fallito", nl: "Opslaan mislukt", pl: "Zapisywanie nie powiodło się", sv: "Sparande misslyckades",
  },
};

const filePath = 'client/src/i18n/pages/FaceGallery.ts';
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
console.log('Done: FaceGallery i18n keys added');
