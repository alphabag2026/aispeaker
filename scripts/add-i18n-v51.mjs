import { readFileSync, writeFileSync } from 'fs';

const filePath = 'client/src/i18n/components/AvatarSettingsDialog.ts';
let content = readFileSync(filePath, 'utf-8');

// New keys for v5.1 features
const newKeys = {
  ko: {
    "avatarSettingsDialog.speedControl": "속도 조절",
    "avatarSettingsDialog.pitchControl": "피치 조절",
    "avatarSettingsDialog.speed": "속도",
    "avatarSettingsDialog.pitch": "피치",
    "avatarSettingsDialog.speedSlow": "느리게",
    "avatarSettingsDialog.speedNormal": "보통",
    "avatarSettingsDialog.speedFast": "빠르게",
    "avatarSettingsDialog.pitchLow": "낮게",
    "avatarSettingsDialog.pitchNormal": "보통",
    "avatarSettingsDialog.pitchHigh": "높게",
    "avatarSettingsDialog.semitones": "반음",
    "avatarSettingsDialog.resetDefaults": "기본값으로 초기화",
    "avatarSettingsDialog.voiceTest": "음성 테스트",
    "avatarSettingsDialog.testWithEffects": "효과 적용 테스트",
    "avatarSettingsDialog.compareOriginal": "원본과 비교",
    "avatarSettingsDialog.testingVoice": "음성 테스트 중...",
    "avatarSettingsDialog.presetVoices": "기본 음성 프리셋",
    "avatarSettingsDialog.presetVoicesDesc": "클론 없이 바로 사용할 수 있는 5가지 추천 음성입니다.",
    "avatarSettingsDialog.selectPreset": "이 음성 선택",
    "avatarSettingsDialog.presetSelected": "기본 음성이 선택되었습니다",
    "avatarSettingsDialog.voiceEffects": "음성 효과",
    "avatarSettingsDialog.voiceEffectsDesc": "속도와 피치를 조절하여 원하는 음성 스타일을 만들어보세요.",
    "avatarSettingsDialog.previewWithEffects": "효과 적용 미리듣기",
    "avatarSettingsDialog.calm": "차분한",
    "avatarSettingsDialog.clear": "명확한",
    "avatarSettingsDialog.fresh": "상쾌한",
    "avatarSettingsDialog.deep": "깊은",
    "avatarSettingsDialog.warm": "따뜻한",
  },
  en: {
    "avatarSettingsDialog.speedControl": "Speed Control",
    "avatarSettingsDialog.pitchControl": "Pitch Control",
    "avatarSettingsDialog.speed": "Speed",
    "avatarSettingsDialog.pitch": "Pitch",
    "avatarSettingsDialog.speedSlow": "Slow",
    "avatarSettingsDialog.speedNormal": "Normal",
    "avatarSettingsDialog.speedFast": "Fast",
    "avatarSettingsDialog.pitchLow": "Low",
    "avatarSettingsDialog.pitchNormal": "Normal",
    "avatarSettingsDialog.pitchHigh": "High",
    "avatarSettingsDialog.semitones": "semitones",
    "avatarSettingsDialog.resetDefaults": "Reset to Defaults",
    "avatarSettingsDialog.voiceTest": "Voice Test",
    "avatarSettingsDialog.testWithEffects": "Test with Effects",
    "avatarSettingsDialog.compareOriginal": "Compare with Original",
    "avatarSettingsDialog.testingVoice": "Testing voice...",
    "avatarSettingsDialog.presetVoices": "Preset Voices",
    "avatarSettingsDialog.presetVoicesDesc": "5 recommended voices ready to use without cloning.",
    "avatarSettingsDialog.selectPreset": "Select this Voice",
    "avatarSettingsDialog.presetSelected": "Preset voice selected",
    "avatarSettingsDialog.voiceEffects": "Voice Effects",
    "avatarSettingsDialog.voiceEffectsDesc": "Adjust speed and pitch to create your desired voice style.",
    "avatarSettingsDialog.previewWithEffects": "Preview with Effects",
    "avatarSettingsDialog.calm": "Calm",
    "avatarSettingsDialog.clear": "Clear",
    "avatarSettingsDialog.fresh": "Fresh",
    "avatarSettingsDialog.deep": "Deep",
    "avatarSettingsDialog.warm": "Warm",
  },
  zh: {
    "avatarSettingsDialog.speedControl": "速度控制",
    "avatarSettingsDialog.pitchControl": "音高控制",
    "avatarSettingsDialog.speed": "速度",
    "avatarSettingsDialog.pitch": "音高",
    "avatarSettingsDialog.speedSlow": "慢速",
    "avatarSettingsDialog.speedNormal": "正常",
    "avatarSettingsDialog.speedFast": "快速",
    "avatarSettingsDialog.pitchLow": "低音",
    "avatarSettingsDialog.pitchNormal": "正常",
    "avatarSettingsDialog.pitchHigh": "高音",
    "avatarSettingsDialog.semitones": "半音",
    "avatarSettingsDialog.resetDefaults": "恢复默认",
    "avatarSettingsDialog.voiceTest": "语音测试",
    "avatarSettingsDialog.testWithEffects": "应用效果测试",
    "avatarSettingsDialog.compareOriginal": "与原声对比",
    "avatarSettingsDialog.testingVoice": "正在测试语音...",
    "avatarSettingsDialog.presetVoices": "预设语音",
    "avatarSettingsDialog.presetVoicesDesc": "无需克隆即可使用的5种推荐语音。",
    "avatarSettingsDialog.selectPreset": "选择此语音",
    "avatarSettingsDialog.presetSelected": "已选择预设语音",
    "avatarSettingsDialog.voiceEffects": "语音效果",
    "avatarSettingsDialog.voiceEffectsDesc": "调整速度和音高来创建您想要的语音风格。",
    "avatarSettingsDialog.previewWithEffects": "应用效果预览",
    "avatarSettingsDialog.calm": "沉稳",
    "avatarSettingsDialog.clear": "清晰",
    "avatarSettingsDialog.fresh": "清新",
    "avatarSettingsDialog.deep": "深沉",
    "avatarSettingsDialog.warm": "温暖",
  },
  ja: {
    "avatarSettingsDialog.speedControl": "速度調整",
    "avatarSettingsDialog.pitchControl": "ピッチ調整",
    "avatarSettingsDialog.speed": "速度",
    "avatarSettingsDialog.pitch": "ピッチ",
    "avatarSettingsDialog.speedSlow": "遅い",
    "avatarSettingsDialog.speedNormal": "普通",
    "avatarSettingsDialog.speedFast": "速い",
    "avatarSettingsDialog.pitchLow": "低い",
    "avatarSettingsDialog.pitchNormal": "普通",
    "avatarSettingsDialog.pitchHigh": "高い",
    "avatarSettingsDialog.semitones": "半音",
    "avatarSettingsDialog.resetDefaults": "デフォルトに戻す",
    "avatarSettingsDialog.voiceTest": "音声テスト",
    "avatarSettingsDialog.testWithEffects": "エフェクト付きテスト",
    "avatarSettingsDialog.compareOriginal": "オリジナルと比較",
    "avatarSettingsDialog.testingVoice": "音声テスト中...",
    "avatarSettingsDialog.presetVoices": "プリセット音声",
    "avatarSettingsDialog.presetVoicesDesc": "クローンなしですぐ使える5つのおすすめ音声です。",
    "avatarSettingsDialog.selectPreset": "この音声を選択",
    "avatarSettingsDialog.presetSelected": "プリセット音声が選択されました",
    "avatarSettingsDialog.voiceEffects": "音声エフェクト",
    "avatarSettingsDialog.voiceEffectsDesc": "速度とピッチを調整して好みの音声スタイルを作りましょう。",
    "avatarSettingsDialog.previewWithEffects": "エフェクト付きプレビュー",
    "avatarSettingsDialog.calm": "落ち着いた",
    "avatarSettingsDialog.clear": "明瞭な",
    "avatarSettingsDialog.fresh": "爽やかな",
    "avatarSettingsDialog.deep": "深みのある",
    "avatarSettingsDialog.warm": "温かい",
  },
  vi: {
    "avatarSettingsDialog.speedControl": "Điều chỉnh tốc độ",
    "avatarSettingsDialog.pitchControl": "Điều chỉnh cao độ",
    "avatarSettingsDialog.speed": "Tốc độ",
    "avatarSettingsDialog.pitch": "Cao độ",
    "avatarSettingsDialog.speedSlow": "Chậm",
    "avatarSettingsDialog.speedNormal": "Bình thường",
    "avatarSettingsDialog.speedFast": "Nhanh",
    "avatarSettingsDialog.pitchLow": "Thấp",
    "avatarSettingsDialog.pitchNormal": "Bình thường",
    "avatarSettingsDialog.pitchHigh": "Cao",
    "avatarSettingsDialog.semitones": "nửa cung",
    "avatarSettingsDialog.resetDefaults": "Đặt lại mặc định",
    "avatarSettingsDialog.voiceTest": "Kiểm tra giọng nói",
    "avatarSettingsDialog.testWithEffects": "Kiểm tra với hiệu ứng",
    "avatarSettingsDialog.compareOriginal": "So sánh với bản gốc",
    "avatarSettingsDialog.testingVoice": "Đang kiểm tra giọng nói...",
    "avatarSettingsDialog.presetVoices": "Giọng nói mặc định",
    "avatarSettingsDialog.presetVoicesDesc": "5 giọng nói đề xuất sẵn sàng sử dụng mà không cần nhân bản.",
    "avatarSettingsDialog.selectPreset": "Chọn giọng nói này",
    "avatarSettingsDialog.presetSelected": "Đã chọn giọng nói mặc định",
    "avatarSettingsDialog.voiceEffects": "Hiệu ứng giọng nói",
    "avatarSettingsDialog.voiceEffectsDesc": "Điều chỉnh tốc độ và cao độ để tạo phong cách giọng nói mong muốn.",
    "avatarSettingsDialog.previewWithEffects": "Xem trước với hiệu ứng",
    "avatarSettingsDialog.calm": "Bình tĩnh",
    "avatarSettingsDialog.clear": "Rõ ràng",
    "avatarSettingsDialog.fresh": "Tươi mới",
    "avatarSettingsDialog.deep": "Sâu lắng",
    "avatarSettingsDialog.warm": "Ấm áp",
  },
};

// For remaining languages, use English as base
const remainingLangs = ['th','id','ms','es','fr','de','pt','ru','ar','hi','it','nl','pl','sv','tr'];
const translations = {
  th: { speedControl:"ควบคุมความเร็ว", pitchControl:"ควบคุมระดับเสียง", speed:"ความเร็ว", pitch:"ระดับเสียง", speedSlow:"ช้า", speedNormal:"ปกติ", speedFast:"เร็ว", pitchLow:"ต่ำ", pitchNormal:"ปกติ", pitchHigh:"สูง", semitones:"ครึ่งเสียง", resetDefaults:"รีเซ็ตค่าเริ่มต้น", voiceTest:"ทดสอบเสียง", testWithEffects:"ทดสอบพร้อมเอฟเฟกต์", compareOriginal:"เปรียบเทียบกับต้นฉบับ", testingVoice:"กำลังทดสอบเสียง...", presetVoices:"เสียงพรีเซ็ต", presetVoicesDesc:"5 เสียงแนะนำพร้อมใช้งานโดยไม่ต้องโคลน", selectPreset:"เลือกเสียงนี้", presetSelected:"เลือกเสียงพรีเซ็ตแล้ว", voiceEffects:"เอฟเฟกต์เสียง", voiceEffectsDesc:"ปรับความเร็วและระดับเสียงเพื่อสร้างสไตล์เสียงที่ต้องการ", previewWithEffects:"ดูตัวอย่างพร้อมเอฟเฟกต์", calm:"สงบ", clear:"ชัดเจน", fresh:"สดใส", deep:"ลึก", warm:"อบอุ่น" },
  id: { speedControl:"Kontrol Kecepatan", pitchControl:"Kontrol Nada", speed:"Kecepatan", pitch:"Nada", speedSlow:"Lambat", speedNormal:"Normal", speedFast:"Cepat", pitchLow:"Rendah", pitchNormal:"Normal", pitchHigh:"Tinggi", semitones:"seminada", resetDefaults:"Atur Ulang", voiceTest:"Tes Suara", testWithEffects:"Tes dengan Efek", compareOriginal:"Bandingkan dengan Asli", testingVoice:"Menguji suara...", presetVoices:"Suara Preset", presetVoicesDesc:"5 suara rekomendasi siap pakai tanpa kloning.", selectPreset:"Pilih Suara Ini", presetSelected:"Suara preset dipilih", voiceEffects:"Efek Suara", voiceEffectsDesc:"Sesuaikan kecepatan dan nada untuk membuat gaya suara yang diinginkan.", previewWithEffects:"Pratinjau dengan Efek", calm:"Tenang", clear:"Jelas", fresh:"Segar", deep:"Dalam", warm:"Hangat" },
  ms: { speedControl:"Kawalan Kelajuan", pitchControl:"Kawalan Nada", speed:"Kelajuan", pitch:"Nada", speedSlow:"Perlahan", speedNormal:"Normal", speedFast:"Laju", pitchLow:"Rendah", pitchNormal:"Normal", pitchHigh:"Tinggi", semitones:"semiton", resetDefaults:"Set Semula", voiceTest:"Ujian Suara", testWithEffects:"Ujian dengan Kesan", compareOriginal:"Bandingkan dengan Asal", testingVoice:"Menguji suara...", presetVoices:"Suara Pratetap", presetVoicesDesc:"5 suara disyorkan sedia untuk digunakan tanpa pengklonan.", selectPreset:"Pilih Suara Ini", presetSelected:"Suara pratetap dipilih", voiceEffects:"Kesan Suara", voiceEffectsDesc:"Laraskan kelajuan dan nada untuk mencipta gaya suara yang diingini.", previewWithEffects:"Pratonton dengan Kesan", calm:"Tenang", clear:"Jelas", fresh:"Segar", deep:"Dalam", warm:"Hangat" },
  es: { speedControl:"Control de Velocidad", pitchControl:"Control de Tono", speed:"Velocidad", pitch:"Tono", speedSlow:"Lento", speedNormal:"Normal", speedFast:"Rápido", pitchLow:"Bajo", pitchNormal:"Normal", pitchHigh:"Alto", semitones:"semitonos", resetDefaults:"Restablecer", voiceTest:"Prueba de Voz", testWithEffects:"Probar con Efectos", compareOriginal:"Comparar con Original", testingVoice:"Probando voz...", presetVoices:"Voces Predefinidas", presetVoicesDesc:"5 voces recomendadas listas para usar sin clonación.", selectPreset:"Seleccionar esta Voz", presetSelected:"Voz predefinida seleccionada", voiceEffects:"Efectos de Voz", voiceEffectsDesc:"Ajusta velocidad y tono para crear tu estilo de voz deseado.", previewWithEffects:"Vista previa con Efectos", calm:"Calmado", clear:"Claro", fresh:"Fresco", deep:"Profundo", warm:"Cálido" },
  fr: { speedControl:"Contrôle de Vitesse", pitchControl:"Contrôle de Tonalité", speed:"Vitesse", pitch:"Tonalité", speedSlow:"Lent", speedNormal:"Normal", speedFast:"Rapide", pitchLow:"Bas", pitchNormal:"Normal", pitchHigh:"Haut", semitones:"demi-tons", resetDefaults:"Réinitialiser", voiceTest:"Test Vocal", testWithEffects:"Tester avec Effets", compareOriginal:"Comparer avec l'Original", testingVoice:"Test de la voix...", presetVoices:"Voix Prédéfinies", presetVoicesDesc:"5 voix recommandées prêtes à l'emploi sans clonage.", selectPreset:"Sélectionner cette Voix", presetSelected:"Voix prédéfinie sélectionnée", voiceEffects:"Effets Vocaux", voiceEffectsDesc:"Ajustez la vitesse et la tonalité pour créer votre style vocal souhaité.", previewWithEffects:"Aperçu avec Effets", calm:"Calme", clear:"Clair", fresh:"Frais", deep:"Profond", warm:"Chaleureux" },
  de: { speedControl:"Geschwindigkeitskontrolle", pitchControl:"Tonhöhenkontrolle", speed:"Geschwindigkeit", pitch:"Tonhöhe", speedSlow:"Langsam", speedNormal:"Normal", speedFast:"Schnell", pitchLow:"Tief", pitchNormal:"Normal", pitchHigh:"Hoch", semitones:"Halbtöne", resetDefaults:"Zurücksetzen", voiceTest:"Stimmtest", testWithEffects:"Mit Effekten testen", compareOriginal:"Mit Original vergleichen", testingVoice:"Stimme wird getestet...", presetVoices:"Voreingestellte Stimmen", presetVoicesDesc:"5 empfohlene Stimmen ohne Klonen sofort einsatzbereit.", selectPreset:"Diese Stimme wählen", presetSelected:"Voreingestellte Stimme ausgewählt", voiceEffects:"Stimmeffekte", voiceEffectsDesc:"Passen Sie Geschwindigkeit und Tonhöhe an, um Ihren gewünschten Stimmstil zu erstellen.", previewWithEffects:"Vorschau mit Effekten", calm:"Ruhig", clear:"Klar", fresh:"Frisch", deep:"Tief", warm:"Warm" },
  pt: { speedControl:"Controle de Velocidade", pitchControl:"Controle de Tom", speed:"Velocidade", pitch:"Tom", speedSlow:"Lento", speedNormal:"Normal", speedFast:"Rápido", pitchLow:"Baixo", pitchNormal:"Normal", pitchHigh:"Alto", semitones:"semitons", resetDefaults:"Redefinir", voiceTest:"Teste de Voz", testWithEffects:"Testar com Efeitos", compareOriginal:"Comparar com Original", testingVoice:"Testando voz...", presetVoices:"Vozes Predefinidas", presetVoicesDesc:"5 vozes recomendadas prontas para uso sem clonagem.", selectPreset:"Selecionar esta Voz", presetSelected:"Voz predefinida selecionada", voiceEffects:"Efeitos de Voz", voiceEffectsDesc:"Ajuste velocidade e tom para criar o estilo de voz desejado.", previewWithEffects:"Pré-visualizar com Efeitos", calm:"Calmo", clear:"Claro", fresh:"Fresco", deep:"Profundo", warm:"Quente" },
  ru: { speedControl:"Управление скоростью", pitchControl:"Управление высотой", speed:"Скорость", pitch:"Высота", speedSlow:"Медленно", speedNormal:"Нормально", speedFast:"Быстро", pitchLow:"Низко", pitchNormal:"Нормально", pitchHigh:"Высоко", semitones:"полутонов", resetDefaults:"Сбросить", voiceTest:"Тест голоса", testWithEffects:"Тест с эффектами", compareOriginal:"Сравнить с оригиналом", testingVoice:"Тестирование голоса...", presetVoices:"Предустановленные голоса", presetVoicesDesc:"5 рекомендуемых голосов, готовых к использованию без клонирования.", selectPreset:"Выбрать этот голос", presetSelected:"Предустановленный голос выбран", voiceEffects:"Голосовые эффекты", voiceEffectsDesc:"Настройте скорость и высоту для создания желаемого стиля голоса.", previewWithEffects:"Предпросмотр с эффектами", calm:"Спокойный", clear:"Чёткий", fresh:"Свежий", deep:"Глубокий", warm:"Тёплый" },
  ar: { speedControl:"التحكم في السرعة", pitchControl:"التحكم في النغمة", speed:"السرعة", pitch:"النغمة", speedSlow:"بطيء", speedNormal:"عادي", speedFast:"سريع", pitchLow:"منخفض", pitchNormal:"عادي", pitchHigh:"مرتفع", semitones:"نصف نغمة", resetDefaults:"إعادة تعيين", voiceTest:"اختبار الصوت", testWithEffects:"اختبار مع المؤثرات", compareOriginal:"مقارنة مع الأصل", testingVoice:"جاري اختبار الصوت...", presetVoices:"أصوات مسبقة", presetVoicesDesc:"5 أصوات موصى بها جاهزة للاستخدام بدون استنساخ.", selectPreset:"اختر هذا الصوت", presetSelected:"تم اختيار الصوت المسبق", voiceEffects:"مؤثرات صوتية", voiceEffectsDesc:"اضبط السرعة والنغمة لإنشاء نمط الصوت المطلوب.", previewWithEffects:"معاينة مع المؤثرات", calm:"هادئ", clear:"واضح", fresh:"منعش", deep:"عميق", warm:"دافئ" },
  hi: { speedControl:"गति नियंत्रण", pitchControl:"पिच नियंत्रण", speed:"गति", pitch:"पिच", speedSlow:"धीमा", speedNormal:"सामान्य", speedFast:"तेज़", pitchLow:"नीचा", pitchNormal:"सामान्य", pitchHigh:"ऊँचा", semitones:"सेमीटोन", resetDefaults:"रीसेट करें", voiceTest:"आवाज़ परीक्षण", testWithEffects:"प्रभावों के साथ परीक्षण", compareOriginal:"मूल से तुलना करें", testingVoice:"आवाज़ का परीक्षण हो रहा है...", presetVoices:"प्रीसेट आवाज़ें", presetVoicesDesc:"क्लोनिंग के बिना उपयोग के लिए 5 अनुशंसित आवाज़ें।", selectPreset:"यह आवाज़ चुनें", presetSelected:"प्रीसेट आवाज़ चुनी गई", voiceEffects:"आवाज़ प्रभाव", voiceEffectsDesc:"अपनी वांछित आवाज़ शैली बनाने के लिए गति और पिच समायोजित करें।", previewWithEffects:"प्रभावों के साथ पूर्वावलोकन", calm:"शांत", clear:"स्पष्ट", fresh:"ताज़ा", deep:"गहरा", warm:"गर्म" },
  it: { speedControl:"Controllo Velocità", pitchControl:"Controllo Tonalità", speed:"Velocità", pitch:"Tonalità", speedSlow:"Lento", speedNormal:"Normale", speedFast:"Veloce", pitchLow:"Basso", pitchNormal:"Normale", pitchHigh:"Alto", semitones:"semitoni", resetDefaults:"Ripristina", voiceTest:"Test Vocale", testWithEffects:"Test con Effetti", compareOriginal:"Confronta con Originale", testingVoice:"Test della voce...", presetVoices:"Voci Predefinite", presetVoicesDesc:"5 voci consigliate pronte all'uso senza clonazione.", selectPreset:"Seleziona questa Voce", presetSelected:"Voce predefinita selezionata", voiceEffects:"Effetti Vocali", voiceEffectsDesc:"Regola velocità e tonalità per creare lo stile vocale desiderato.", previewWithEffects:"Anteprima con Effetti", calm:"Calmo", clear:"Chiaro", fresh:"Fresco", deep:"Profondo", warm:"Caldo" },
  nl: { speedControl:"Snelheidsregeling", pitchControl:"Toonhoogteregeling", speed:"Snelheid", pitch:"Toonhoogte", speedSlow:"Langzaam", speedNormal:"Normaal", speedFast:"Snel", pitchLow:"Laag", pitchNormal:"Normaal", pitchHigh:"Hoog", semitones:"halftonen", resetDefaults:"Herstellen", voiceTest:"Stemtest", testWithEffects:"Test met Effecten", compareOriginal:"Vergelijk met Origineel", testingVoice:"Stem wordt getest...", presetVoices:"Vooringestelde Stemmen", presetVoicesDesc:"5 aanbevolen stemmen klaar voor gebruik zonder klonen.", selectPreset:"Kies deze Stem", presetSelected:"Vooringestelde stem geselecteerd", voiceEffects:"Stemeffecten", voiceEffectsDesc:"Pas snelheid en toonhoogte aan om uw gewenste stemstijl te creëren.", previewWithEffects:"Voorbeeld met Effecten", calm:"Kalm", clear:"Helder", fresh:"Fris", deep:"Diep", warm:"Warm" },
  pl: { speedControl:"Kontrola Prędkości", pitchControl:"Kontrola Wysokości", speed:"Prędkość", pitch:"Wysokość", speedSlow:"Wolno", speedNormal:"Normalnie", speedFast:"Szybko", pitchLow:"Nisko", pitchNormal:"Normalnie", pitchHigh:"Wysoko", semitones:"półtonów", resetDefaults:"Resetuj", voiceTest:"Test Głosu", testWithEffects:"Test z Efektami", compareOriginal:"Porównaj z Oryginałem", testingVoice:"Testowanie głosu...", presetVoices:"Głosy Predefiniowane", presetVoicesDesc:"5 polecanych głosów gotowych do użycia bez klonowania.", selectPreset:"Wybierz ten Głos", presetSelected:"Wybrany głos predefiniowany", voiceEffects:"Efekty Głosowe", voiceEffectsDesc:"Dostosuj prędkość i wysokość, aby stworzyć pożądany styl głosu.", previewWithEffects:"Podgląd z Efektami", calm:"Spokojny", clear:"Wyraźny", fresh:"Świeży", deep:"Głęboki", warm:"Ciepły" },
  sv: { speedControl:"Hastighetskontroll", pitchControl:"Tonhöjdskontroll", speed:"Hastighet", pitch:"Tonhöjd", speedSlow:"Långsam", speedNormal:"Normal", speedFast:"Snabb", pitchLow:"Låg", pitchNormal:"Normal", pitchHigh:"Hög", semitones:"halvtoner", resetDefaults:"Återställ", voiceTest:"Rösttest", testWithEffects:"Testa med Effekter", compareOriginal:"Jämför med Original", testingVoice:"Testar röst...", presetVoices:"Förinställda Röster", presetVoicesDesc:"5 rekommenderade röster redo att använda utan kloning.", selectPreset:"Välj denna Röst", presetSelected:"Förinställd röst vald", voiceEffects:"Rösteffekter", voiceEffectsDesc:"Justera hastighet och tonhöjd för att skapa din önskade röststil.", previewWithEffects:"Förhandsgranska med Effekter", calm:"Lugn", clear:"Tydlig", fresh:"Fräsch", deep:"Djup", warm:"Varm" },
  tr: { speedControl:"Hız Kontrolü", pitchControl:"Perde Kontrolü", speed:"Hız", pitch:"Perde", speedSlow:"Yavaş", speedNormal:"Normal", speedFast:"Hızlı", pitchLow:"Düşük", pitchNormal:"Normal", pitchHigh:"Yüksek", semitones:"yarım ton", resetDefaults:"Sıfırla", voiceTest:"Ses Testi", testWithEffects:"Efektlerle Test", compareOriginal:"Orijinalle Karşılaştır", testingVoice:"Ses test ediliyor...", presetVoices:"Hazır Sesler", presetVoicesDesc:"Klonlama olmadan kullanıma hazır 5 önerilen ses.", selectPreset:"Bu Sesi Seç", presetSelected:"Hazır ses seçildi", voiceEffects:"Ses Efektleri", voiceEffectsDesc:"İstediğiniz ses stilini oluşturmak için hız ve perdeyi ayarlayın.", previewWithEffects:"Efektlerle Önizleme", calm:"Sakin", clear:"Net", fresh:"Taze", deep:"Derin", warm:"Sıcak" },
};

// Process each language
for (const [lang, keys] of Object.entries(newKeys)) {
  // Find the closing }); for this language block
  const regex = new RegExp(`(registerTranslations\\("${lang}",\\s*\\{[\\s\\S]*?)(\\}\\);)`);
  const match = content.match(regex);
  if (match) {
    const entries = Object.entries(keys).map(([k, v]) => `  "${k}": "${v.replace(/"/g, '\\"')}",`).join('\n');
    content = content.replace(regex, `$1${entries}\n$2`);
    console.log(`Added ${Object.keys(keys).length} keys to ${lang}`);
  } else {
    console.log(`WARNING: Could not find ${lang} block`);
  }
}

// Process remaining languages
for (const lang of remainingLangs) {
  const langKeys = translations[lang];
  if (!langKeys) { console.log(`No translations for ${lang}`); continue; }
  
  const regex = new RegExp(`(registerTranslations\\("${lang}",\\s*\\{[\\s\\S]*?)(\\}\\);)`);
  const match = content.match(regex);
  if (match) {
    const prefix = "avatarSettingsDialog.";
    const entries = Object.entries(langKeys).map(([k, v]) => `  "${prefix}${k}": "${v.replace(/"/g, '\\"')}",`).join('\n');
    content = content.replace(regex, `$1${entries}\n$2`);
    console.log(`Added ${Object.keys(langKeys).length} keys to ${lang}`);
  } else {
    console.log(`WARNING: Could not find ${lang} block`);
  }
}

writeFileSync(filePath, content, 'utf-8');
console.log('Done!');
