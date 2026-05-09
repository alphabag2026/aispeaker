import fs from 'fs';

const filePath = './client/src/i18n/pages/LectureBuilder.ts';
let content = fs.readFileSync(filePath, 'utf-8');

const newKeys = {
  ko: {
    "lectureBuilder.noCloneVoiceYet": "아직 개인 클론 음성이 없습니다.",
    "lectureBuilder.createCloneVoice": "음성 클론 만들기",
    "lectureBuilder.myCloneVoices": "내 클론 음성",
  },
  en: {
    "lectureBuilder.noCloneVoiceYet": "No personal clone voices yet.",
    "lectureBuilder.createCloneVoice": "Create Voice Clone",
    "lectureBuilder.myCloneVoices": "My Clone Voices",
  },
  zh: {
    "lectureBuilder.noCloneVoiceYet": "暂无个人克隆语音。",
    "lectureBuilder.createCloneVoice": "创建语音克隆",
    "lectureBuilder.myCloneVoices": "我的克隆语音",
  },
  ja: {
    "lectureBuilder.noCloneVoiceYet": "個人クローン音声がまだありません。",
    "lectureBuilder.createCloneVoice": "音声クローンを作成",
    "lectureBuilder.myCloneVoices": "マイクローン音声",
  },
  vi: {
    "lectureBuilder.noCloneVoiceYet": "Chưa có giọng nói nhân bản cá nhân.",
    "lectureBuilder.createCloneVoice": "Tạo giọng nói nhân bản",
    "lectureBuilder.myCloneVoices": "Giọng nói nhân bản của tôi",
  },
  th: {
    "lectureBuilder.noCloneVoiceYet": "ยังไม่มีเสียงโคลนส่วนตัว",
    "lectureBuilder.createCloneVoice": "สร้างเสียงโคลน",
    "lectureBuilder.myCloneVoices": "เสียงโคลนของฉัน",
  },
  id: {
    "lectureBuilder.noCloneVoiceYet": "Belum ada suara klon pribadi.",
    "lectureBuilder.createCloneVoice": "Buat klon suara",
    "lectureBuilder.myCloneVoices": "Suara klon saya",
  },
  ms: {
    "lectureBuilder.noCloneVoiceYet": "Tiada suara klon peribadi lagi.",
    "lectureBuilder.createCloneVoice": "Cipta klon suara",
    "lectureBuilder.myCloneVoices": "Suara klon saya",
  },
  es: {
    "lectureBuilder.noCloneVoiceYet": "Aún no hay voces clonadas personales.",
    "lectureBuilder.createCloneVoice": "Crear clon de voz",
    "lectureBuilder.myCloneVoices": "Mis voces clonadas",
  },
  fr: {
    "lectureBuilder.noCloneVoiceYet": "Pas encore de voix clonée personnelle.",
    "lectureBuilder.createCloneVoice": "Créer un clone vocal",
    "lectureBuilder.myCloneVoices": "Mes voix clonées",
  },
  de: {
    "lectureBuilder.noCloneVoiceYet": "Noch keine persönlichen geklonten Stimmen.",
    "lectureBuilder.createCloneVoice": "Stimmklon erstellen",
    "lectureBuilder.myCloneVoices": "Meine geklonten Stimmen",
  },
  pt: {
    "lectureBuilder.noCloneVoiceYet": "Nenhuma voz clonada pessoal ainda.",
    "lectureBuilder.createCloneVoice": "Criar clone de voz",
    "lectureBuilder.myCloneVoices": "Minhas vozes clonadas",
  },
  ru: {
    "lectureBuilder.noCloneVoiceYet": "Личных клонированных голосов пока нет.",
    "lectureBuilder.createCloneVoice": "Создать клон голоса",
    "lectureBuilder.myCloneVoices": "Мои клонированные голоса",
  },
  ar: {
    "lectureBuilder.noCloneVoiceYet": "لا توجد أصوات مستنسخة شخصية بعد.",
    "lectureBuilder.createCloneVoice": "إنشاء استنساخ صوتي",
    "lectureBuilder.myCloneVoices": "أصواتي المستنسخة",
  },
  hi: {
    "lectureBuilder.noCloneVoiceYet": "अभी तक कोई व्यक्तिगत क्लोन आवाज नहीं।",
    "lectureBuilder.createCloneVoice": "वॉइस क्लोन बनाएं",
    "lectureBuilder.myCloneVoices": "मेरी क्लोन आवाजें",
  },
  it: {
    "lectureBuilder.noCloneVoiceYet": "Nessuna voce clonata personale ancora.",
    "lectureBuilder.createCloneVoice": "Crea clone vocale",
    "lectureBuilder.myCloneVoices": "Le mie voci clonate",
  },
  nl: {
    "lectureBuilder.noCloneVoiceYet": "Nog geen persoonlijke gekloonde stemmen.",
    "lectureBuilder.createCloneVoice": "Stemkloon maken",
    "lectureBuilder.myCloneVoices": "Mijn gekloonde stemmen",
  },
  pl: {
    "lectureBuilder.noCloneVoiceYet": "Brak osobistych sklonowanych głosów.",
    "lectureBuilder.createCloneVoice": "Utwórz klon głosu",
    "lectureBuilder.myCloneVoices": "Moje sklonowane głosy",
  },
  sv: {
    "lectureBuilder.noCloneVoiceYet": "Inga personliga klonade röster ännu.",
    "lectureBuilder.createCloneVoice": "Skapa röstklon",
    "lectureBuilder.myCloneVoices": "Mina klonade röster",
  },
  tr: {
    "lectureBuilder.noCloneVoiceYet": "Henüz kişisel klonlanmış ses yok.",
    "lectureBuilder.createCloneVoice": "Ses klonu oluştur",
    "lectureBuilder.myCloneVoices": "Klonlanmış seslerim",
  },
};

// Find the last key in each language block and add before });
const langOrder = ['ko','en','zh','ja','vi','th','id','ms','es','fr','de','pt','ru','ar','hi','it','nl','pl','sv','tr'];

for (const lang of langOrder) {
  const keys = newKeys[lang];
  if (!keys) continue;
  
  const regStart = `registerTranslations("${lang}"`;
  const startIdx = content.indexOf(regStart);
  if (startIdx === -1) {
    console.log(`❌ ${lang}: block not found`);
    continue;
  }
  
  // Find the closing }); for this block
  const closingIdx = content.indexOf('});', startIdx);
  if (closingIdx === -1) {
    console.log(`❌ ${lang}: closing not found`);
    continue;
  }
  
  const keyEntries = Object.entries(keys).map(([k, v]) => `  "${k}": "${v}",`).join('\n');
  content = content.slice(0, closingIdx) + keyEntries + '\n' + content.slice(closingIdx);
  console.log(`✅ ${lang}: ${Object.keys(keys).length} keys added`);
}

fs.writeFileSync(filePath, content);
console.log('\n✅ Done!');
