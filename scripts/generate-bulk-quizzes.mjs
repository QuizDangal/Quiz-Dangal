#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const QUIZZES_PER_CATEGORY = 288;
const QUESTIONS_PER_QUIZ = 10;
const OPTIONS_PER_QUESTION = 4;

function getArg(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return function next() {
    value += 0x6d2b79f5;
    let result = Math.imul(value ^ (value >>> 15), value | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function shuffle(list, rng) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function uniqueValues(items) {
  const seen = new Set();
  const values = [];
  for (const item of items) {
    const key = getEnglishText(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    values.push(item);
  }
  return values;
}

function pickDistractors(pool, correct, count, rng) {
  const correctKey = getEnglishText(correct);
  const filtered = uniqueValues(pool).filter((item) => getEnglishText(item) !== correctKey);
  return shuffle(filtered, rng).slice(0, count);
}

function buildOptions(correct, pool, rng) {
  const distractors = pickDistractors(pool, correct, OPTIONS_PER_QUESTION - 1, rng);
  const rawOptions = shuffle([correct, ...distractors], rng).slice(0, OPTIONS_PER_QUESTION);
  return rawOptions.map((optionText) => ({
    option_text: toBilingualValue(optionText),
    is_correct: getEnglishText(optionText) === getEnglishText(correct),
  }));
}

function buildOpinionOptions(options, rng) {
  return shuffle(options, rng).map((optionText) => ({
    option_text: toBilingualValue(optionText),
    is_correct: false,
  }));
}

function chunk(array, size) {
  const chunks = [];
  for (let index = 0; index < array.length; index += size) {
    chunks.push(array.slice(index, index + size));
  }
  return chunks;
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function capitalizeFirst(value) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getEnglishText(value) {
  if (typeof value === 'string') return value;
  return String(value?.en || '');
}

function getHindiText(value) {
  if (typeof value === 'string') return translateTermToHindi(value);
  return String(value?.hi || translateTermToHindi(value?.en || ''));
}

function toBilingualText(hi, en) {
  const hiText = String(hi || '').trim();
  const enText = String(en || '').trim();
  return `${hiText || enText} / ${enText}`;
}

function toBilingualValue(value) {
  return toBilingualText(getHindiText(value), getEnglishText(value));
}

const OPINION_CONTEXT_HI = {
  'for a relaxed Sunday': 'आरामभरे रविवार के लिए',
  'after a hectic workday': 'भागदौड़ भरे कामकाजी दिन के बाद',
  'during a quick lunch break': 'छोटे लंच ब्रेक में',
  'for a weekend with friends': 'दोस्तों के साथ वीकेंड के लिए',
  'when you want pure comfort': 'जब सिर्फ कम्फर्ट चाहिए',
  'for a festive evening': 'त्योहारी शाम के लिए',
  'on a rainy day': 'बारिश वाले दिन',
  'for a summer outing': 'गर्मी की आउटिंग के लिए',
  'during a road trip halt': 'रोड ट्रिप के बीच रुकते समय',
  'for a family get-together': 'परिवारिक मिलन के लिए',
  'when you need a quick reset': 'जब तुरंत ताजगी चाहिए',
  'for a low-budget plan': 'लो-बजट प्लान के लिए',
  'for a premium experience': 'प्रीमियम अनुभव के लिए',
  'when you want something classic': 'जब क्लासिक विकल्प चाहिए',
  'for a last-minute plan': 'आखिरी समय के प्लान के लिए',
  'for an early morning start': 'सुबह की जल्दी शुरुआत के लिए',
  'for a late-night mood': 'लेट-नाइट मूड के लिए',
  'when you want maximum fun': 'जब सबसे ज्यादा मजा चाहिए',
  'for a no-stress choice': 'बिना टेंशन वाले चुनाव के लिए',
  'when speed matters most': 'जब स्पीड सबसे जरूरी हो',
  'for a social media worthy moment': 'सोशल मीडिया पर डालने लायक पल के लिए',
  'for a long holiday mood': 'लंबी छुट्टी वाले मूड के लिए',
  'when practicality matters more than style': 'जब स्टाइल से ज्यादा प्रैक्टिकल होना जरूरी हो',
  'for a small celebration': 'छोटी सेलिब्रेशन के लिए',
  'for a solo plan': 'सोलो प्लान के लिए',
  'for a group vibe': 'ग्रुप वाले माहौल के लिए',
  'when nostalgia wins': 'जब यादें भारी पड़ें',
  'for a monsoon evening': 'मॉनसून की शाम के लिए',
  'for a winter weekend': 'सर्दियों के वीकेंड के लिए',
  'when you just want the safest pick': 'जब बस सबसे सुरक्षित विकल्प चाहिए',
};

const OPINION_LABEL_HI = {
  'Breakfast Picks': 'नाश्ते की पसंद',
  'Evening Snacks': 'शाम के स्नैक्स',
  'Dessert Mood': 'डेजर्ट मूड',
  'Weekend Trips': 'वीकेंड ट्रिप्स',
  'Workout Style': 'वर्कआउट स्टाइल',
  'Movie Night': 'मूवी नाइट',
  'Music Vibe': 'म्यूजिक वाइब',
  'Tea Time': 'टी टाइम',
  'Festival Plans': 'फेस्टिवल प्लान्स',
  'Travel Mode': 'ट्रैवल मोड',
  'Smartphone Priority': 'स्मार्टफोन प्राथमिकता',
  'Social Media Habit': 'सोशल मीडिया आदत',
  'Cricket Viewing': 'क्रिकेट देखने का तरीका',
  'Cafe Orders': 'कैफे ऑर्डर्स',
  'Study Method': 'पढ़ाई का तरीका',
  'Office Break': 'ऑफिस ब्रेक',
  'Rainy Day Plan': 'बारिश वाले दिन का प्लान',
  'Fashion Choice': 'फैशन पसंद',
  'Late Night Snack': 'लेट-नाइट स्नैक',
  'Summer Drink': 'समर ड्रिंक',
  'Holiday Budget': 'हॉलिडे बजट',
  'Room Setup': 'रूम सेटअप',
  'Gift Preference': 'गिफ्ट पसंद',
  'Pet Pick': 'पेट पसंद',
};

const OPINION_PROMPT_HI = {
  'breakfast option': 'नाश्ते का विकल्प',
  'snack': 'स्नैक',
  'dessert': 'डेजर्ट',
  'weekend plan': 'वीकेंड प्लान',
  'fitness routine': 'फिटनेस रूटीन',
  'movie genre': 'मूवी जॉनर',
  'playlist mood': 'प्लेलिस्ट मूड',
  'tea-time combo': 'टी-टाइम कॉम्बो',
  'festival celebration style': 'फेस्टिवल सेलिब्रेशन स्टाइल',
  'travel mode': 'ट्रैवल मोड',
  'phone upgrade focus': 'फोन अपग्रेड की प्राथमिकता',
  'app to open first': 'सबसे पहले खोलने वाली ऐप',
  'match-day plan': 'मैच डे प्लान',
  'cafe order': 'कैफे ऑर्डर',
  'study style': 'स्टडी स्टाइल',
  'office-break habit': 'ऑफिस ब्रेक की आदत',
  'rainy-day activity': 'बारिश वाले दिन की एक्टिविटी',
  'daily style': 'डेली स्टाइल',
  'late-night snack': 'लेट-नाइट स्नैक',
  'summer drink': 'समर ड्रिंक',
  'holiday spending style': 'हॉलिडे खर्च करने का तरीका',
  'room upgrade': 'रूम अपग्रेड',
  'gift type': 'गिफ्ट का प्रकार',
  'pet choice': 'पेट चॉइस',
};

const TERM_HI_MAP = {
  'Masala dosa': 'मसाला डोसा',
  'Aloo paratha': 'आलू पराठा',
  'Poha': 'पोहा',
  'Idli sambar': 'इडली सांभर',
  'Samosa': 'समोसा',
  'Pani puri': 'पानी पुरी',
  'Sandwich': 'सैंडविच',
  'Momos': 'मोमोज',
  'Gulab jamun': 'गुलाब जामुन',
  'Ice cream': 'आइसक्रीम',
  'Brownie': 'ब्राउनी',
  'Rasgulla': 'रसगुल्ला',
  'Hill station escape': 'हिल स्टेशन ट्रिप',
  'Beach stay': 'बीच स्टे',
  'City food crawl': 'सिटी फूड ट्रेल',
  'Home staycation': 'घर पर स्टेकेशन',
  'Gym session': 'जिम सेशन',
  'Morning walk': 'मॉर्निंग वॉक',
  'Yoga': 'योग',
  'Sports with friends': 'दोस्तों के साथ स्पोर्ट्स',
  'Comedy': 'कॉमेडी',
  'Thriller': 'थ्रिलर',
  'Romance': 'रोमांस',
  'Action': 'एक्शन',
  '90s classics': '90s क्लासिक्स',
  'Lo-fi chill': 'लो-फाई चिल',
  'Punjabi beats': 'पंजाबी बीट्स',
  'Bollywood hits': 'बॉलीवुड हिट्स',
  'Chai with biscuits': 'चाय और बिस्किट',
  'Coffee and cake': 'कॉफी और केक',
  'Green tea': 'ग्रीन टी',
  'Cold coffee': 'कोल्ड कॉफी',
  'Family puja': 'फैमिली पूजा',
  'Food outing': 'फूड आउटिंग',
  'Travel break': 'ट्रैवल ब्रेक',
  'House party': 'हाउस पार्टी',
  'Train': 'ट्रेन',
  'Flight': 'फ्लाइट',
  'Road trip': 'रोड ट्रिप',
  'Bus': 'बस',
  'Battery life': 'बैटरी लाइफ',
  'Camera': 'कैमरा',
  'Performance': 'परफॉर्मेंस',
  'Design': 'डिज़ाइन',
  'Instagram': 'इंस्टाग्राम',
  'YouTube': 'यूट्यूब',
  'WhatsApp': 'व्हाट्सऐप',
  'X': 'एक्स',
  'Watch at home': 'घर पर देखना',
  'Watch with friends': 'दोस्तों के साथ देखना',
  'Follow live score only': 'सिर्फ लाइव स्कोर देखना',
  'Avoid spoilers till highlights': 'हाइलाइट्स तक स्पॉइलर से बचना',
  'Cappuccino': 'कैप्पुचीनो',
  'Mojito': 'मोजिटो',
  'Hot chocolate': 'हॉट चॉकलेट',
  'Handwritten notes': 'हाथ से लिखे नोट्स',
  'Video lessons': 'वीडियो लेसन',
  'Practice tests': 'प्रैक्टिस टेस्ट',
  'Group study': 'ग्रुप स्टडी',
  'Quick walk': 'क्विक वॉक',
  'Tea chat': 'चाय पर बातचीत',
  'Phone scroll': 'फोन स्क्रॉल',
  'Silent reset': 'शांत ब्रेक',
  'Sleep in': 'आराम से सोना',
  'Watch a movie': 'मूवी देखना',
  'Cook something special': 'कुछ खास पकाना',
  'Go for a drive': 'ड्राइव पर जाना',
  'Classic casual': 'क्लासिक कैजुअल',
  'Athleisure': 'एथलीजर',
  'Ethnic wear': 'एथनिक वियर',
  'Formal clean look': 'फॉर्मल क्लीन लुक',
  'Maggi': 'मैगी',
  'Popcorn': 'पॉपकॉर्न',
  'Fruit bowl': 'फ्रूट बाउल',
  'Cookies': 'कुकीज़',
  'Lassi': 'लस्सी',
  'Lemon soda': 'नींबू सोडा',
  'Sugarcane juice': 'गन्ने का जूस',
  'Coconut water': 'नारियल पानी',
  'Save aggressively': 'ज्यादा बचत करना',
  'Spend on food': 'खाने पर खर्च करना',
  'Spend on stay': 'स्टे पर खर्च करना',
  'Spend on experiences': 'अनुभवों पर खर्च करना',
  'Better lighting': 'बेहतर लाइटिंग',
  'More plants': 'ज्यादा पौधे',
  'Minimal decor': 'मिनिमल डेकोर',
  'Gaming corner': 'गेमिंग कॉर्नर',
  'Useful gadget': 'काम का गैजेट',
  'Personalized item': 'पर्सनलाइज्ड आइटम',
  'Gift card': 'गिफ्ट कार्ड',
  'Experience voucher': 'एक्सपीरियंस वाउचर',
  'Dog': 'कुत्ता',
  'Cat': 'बिल्ली',
  'Fish': 'मछली',
  'Bird': 'पक्षी',
  'Brainwave Blitz': 'ब्रेनवेव ब्लिट्ज',
  'Mastermind Marathon': 'मास्टरमाइंड मैराथन',
  'Rapid Recall Rally': 'रैपिड रिकॉल रैली',
  'Smart Score Sprint': 'स्मार्ट स्कोर स्प्रिंट',
  'Knowledge Knockout': 'नॉलेज नॉकआउट',
  'Exam Edge Express': 'एग्जाम एज एक्सप्रेस',
  'Sharp Mind Showdown': 'शार्प माइंड शोडाउन',
  'Quick Revision Clash': 'क्विक रिवीजन क्लैश',
  'Fact Hunter Arena': 'फैक्ट हंटर एरिना',
  'GK Power Play': 'जीके पावर प्ले',
  'Quiz Champ Circuit': 'क्विज़ चैम्प सर्किट',
  'Focus Mode Face-Off': 'फोकस मोड फेस-ऑफ',
  'Hot Take Arena': 'हॉट टेक एरिना',
  'Vibe Check Showdown': 'वाइब चेक शोडाउन',
  'Quick Choice Clash': 'क्विक चॉइस क्लैश',
  'Weekend Mood Battle': 'वीकेंड मूड बैटल',
  'Swipe Your Pick': 'स्वाइप योर पिक',
  'Crowd Favorite Face-Off': 'क्राउड फेवरेट फेस-ऑफ',
  'Taste Test Royale': 'टेस्ट टेस्ट रॉयल',
  'Your Vibe Verdict': 'योर वाइब वर्डिक्ट',
  'Instant Choice League': 'इंस्टेंट चॉइस लीग',
  'Pick One Pressure Test': 'पिक वन प्रेशर टेस्ट',
  'Heart Says This': 'दिल कहे यही',
  'No-Overthinking Round': 'नो-ओवरथिंकिंग राउंड',
  'Capitals, Science and History Mix': 'राजधानियां, विज्ञान और इतिहास मिक्स',
  'Static GK Power Round': 'स्टैटिक जीके पावर राउंड',
  'Exam-Style Accuracy Test': 'एग्जाम-स्टाइल एक्युरेसी टेस्ट',
  'Fast Facts and Smart Picks': 'फास्ट फैक्ट्स और स्मार्ट पिक्स',
  'India and World Knowledge Pack': 'भारत और विश्व ज्ञान पैक',
  'Moderate Level Challenge Set': 'मॉडरेट लेवल चैलेंज सेट',
  'Balanced Revision Mega Quiz': 'बैलेंस्ड रिवीजन मेगा क्विज़',
  'Culture, Geography and Polity Mix': 'संस्कृति, भूगोल और राजनीति मिक्स',
  'Serious Prep Quick Round': 'सीरियस प्रेप क्विक राउंड',
  'All-Rounder GK Battle': 'ऑल-राउंडर जीके बैटल',
  'Concepts, Dates and Capitals Mix': 'कांसेप्ट, तारीख और राजधानी मिक्स',
  'Scholar Mode Quiz Deck': 'स्कॉलर मोड क्विज़ डेक',
  'Precision Practice Power Set': 'प्रिसिजन प्रैक्टिस पावर सेट',
  'Confidence Booster GK Round': 'कॉन्फिडेंस बूस्टर जीके राउंड',
  'Competitive Exam Warm-Up': 'कॉम्पिटिटिव एग्जाम वॉर्म-अप',
  'Memory Test Mixed Bag': 'मेमोरी टेस्ट मिक्स्ड बैग',
  'Topical Static GK Sprint': 'टॉपिकल स्टैटिक जीके स्प्रिंट',
  'Smart Revision Battle': 'स्मार्ट रिवीजन बैटल',
  'Well-Rounded Knowledge Round': 'वेल-राउंडेड नॉलेज राउंड',
  'Moderate Difficulty Master Set': 'मॉडरेट डिफिकल्टी मास्टर सेट',
  'Quiz League Mixed Challenge': 'क्विज़ लीग मिक्स्ड चैलेंज',
  'Daily Prep Signature Round': 'डेली प्रेप सिग्नेचर राउंड',
  'Rank Booster GK Capsule': 'रैंक बूस्टर जीके कैप्सूल',
  'Strong Basics Challenge Pack': 'स्ट्रॉन्ग बेसिक्स चैलेंज पैक',
};

function translateTermToHindi(value) {
  const text = String(value || '').trim();
  return TERM_HI_MAP[text] || text;
}

function dedupeQuestionsByText(questions) {
  const seen = new Set();
  const unique = [];
  for (const question of questions) {
    const key = normalizeText(question.question_text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(question);
  }
  return unique;
}

function createPairQuestions(config) {
  const {
    facts,
    questionTemplates,
    answerPool,
    reverseTemplates = [],
    reverseAnswerPool = [],
    seed,
    topic,
  } = config;
  const rng = mulberry32(hashString(seed));
  const questions = [];

  for (const [left, right] of facts) {
    for (const template of questionTemplates) {
      const englishQuestion = template.en(left, right);
      const hindiQuestion = template.hi(left, right);
      questions.push({
        question_text: toBilingualText(hindiQuestion, englishQuestion),
        options: buildOptions(right, answerPool, rng),
        topic,
      });
    }
    for (const template of reverseTemplates) {
      const englishQuestion = template.en(left, right);
      const hindiQuestion = template.hi(left, right);
      questions.push({
        question_text: toBilingualText(hindiQuestion, englishQuestion),
        options: buildOptions(left, reverseAnswerPool, rng),
        topic,
      });
    }
  }

  return dedupeQuestionsByText(questions);
}

const opinionContexts = [
  'for a relaxed Sunday',
  'after a hectic workday',
  'during a quick lunch break',
  'for a weekend with friends',
  'when you want pure comfort',
  'for a festive evening',
  'on a rainy day',
  'for a summer outing',
  'during a road trip halt',
  'for a family get-together',
  'when you need a quick reset',
  'for a low-budget plan',
  'for a premium experience',
  'when you want something classic',
  'for a last-minute plan',
  'for an early morning start',
  'for a late-night mood',
  'when you want maximum fun',
  'for a no-stress choice',
  'when speed matters most',
  'for a social media worthy moment',
  'for a long holiday mood',
  'when practicality matters more than style',
  'for a small celebration',
  'for a solo plan',
  'for a group vibe',
  'when nostalgia wins',
  'for a monsoon evening',
  'for a winter weekend',
  'when you just want the safest pick',
];

const opinionStems = [
  (domain, context) => toBilingualText(
    `${OPINION_CONTEXT_HI[context]}, आप ${OPINION_PROMPT_HI[domain.prompt]} में क्या चुनेंगे?`,
    `${capitalizeFirst(context)}, which ${domain.prompt} would you pick?`
  ),
  (domain, context) => toBilingualText(
    `${OPINION_CONTEXT_HI[context]} ${OPINION_PROMPT_HI[domain.prompt]} में सबसे बेहतर क्या लगता है?`,
    `Which ${domain.prompt} feels like the best choice ${context}?`
  ),
  (domain, context) => toBilingualText(
    `अगर ${OPINION_CONTEXT_HI[context]} सिर्फ एक ${OPINION_PROMPT_HI[domain.prompt]} चुनना हो, तो आप क्या चुनेंगे?`,
    `If you had to choose only one ${domain.prompt} ${context}, what would it be?`
  ),
  (domain, context) => toBilingualText(
    `${OPINION_CONTEXT_HI[context]} ${OPINION_LABEL_HI[domain.label]} में सबसे आकर्षक क्या लगता है?`,
    `What sounds most appealing ${context} when it comes to ${domain.label.toLowerCase()}?`
  ),
];

const opinionTitleHooks = [
  'Hot Take Arena',
  'Vibe Check Showdown',
  'Quick Choice Clash',
  'Weekend Mood Battle',
  'Swipe Your Pick',
  'Crowd Favorite Face-Off',
  'Taste Test Royale',
  'Your Vibe Verdict',
  'Instant Choice League',
  'Pick One Pressure Test',
  'Heart Says This',
  'No-Overthinking Round',
];

const opinionDomains = [
  { label: 'Breakfast Picks', prompt: 'breakfast option', options: ['Masala dosa', 'Aloo paratha', 'Poha', 'Idli sambar'] },
  { label: 'Evening Snacks', prompt: 'snack', options: ['Samosa', 'Pani puri', 'Sandwich', 'Momos'] },
  { label: 'Dessert Mood', prompt: 'dessert', options: ['Gulab jamun', 'Ice cream', 'Brownie', 'Rasgulla'] },
  { label: 'Weekend Trips', prompt: 'weekend plan', options: ['Hill station escape', 'Beach stay', 'City food crawl', 'Home staycation'] },
  { label: 'Workout Style', prompt: 'fitness routine', options: ['Gym session', 'Morning walk', 'Yoga', 'Sports with friends'] },
  { label: 'Movie Night', prompt: 'movie genre', options: ['Comedy', 'Thriller', 'Romance', 'Action'] },
  { label: 'Music Vibe', prompt: 'playlist mood', options: ['90s classics', 'Lo-fi chill', 'Punjabi beats', 'Bollywood hits'] },
  { label: 'Tea Time', prompt: 'tea-time combo', options: ['Chai with biscuits', 'Coffee and cake', 'Green tea', 'Cold coffee'] },
  { label: 'Festival Plans', prompt: 'festival celebration style', options: ['Family puja', 'Food outing', 'Travel break', 'House party'] },
  { label: 'Travel Mode', prompt: 'travel mode', options: ['Train', 'Flight', 'Road trip', 'Bus'] },
  { label: 'Smartphone Priority', prompt: 'phone upgrade focus', options: ['Battery life', 'Camera', 'Performance', 'Design'] },
  { label: 'Social Media Habit', prompt: 'app to open first', options: ['Instagram', 'YouTube', 'WhatsApp', 'X'] },
  { label: 'Cricket Viewing', prompt: 'match-day plan', options: ['Watch at home', 'Watch with friends', 'Follow live score only', 'Avoid spoilers till highlights'] },
  { label: 'Cafe Orders', prompt: 'cafe order', options: ['Cappuccino', 'Cold coffee', 'Mojito', 'Hot chocolate'] },
  { label: 'Study Method', prompt: 'study style', options: ['Handwritten notes', 'Video lessons', 'Practice tests', 'Group study'] },
  { label: 'Office Break', prompt: 'office-break habit', options: ['Quick walk', 'Tea chat', 'Phone scroll', 'Silent reset'] },
  { label: 'Rainy Day Plan', prompt: 'rainy-day activity', options: ['Sleep in', 'Watch a movie', 'Cook something special', 'Go for a drive'] },
  { label: 'Fashion Choice', prompt: 'daily style', options: ['Classic casual', 'Athleisure', 'Ethnic wear', 'Formal clean look'] },
  { label: 'Late Night Snack', prompt: 'late-night snack', options: ['Maggi', 'Popcorn', 'Fruit bowl', 'Cookies'] },
  { label: 'Summer Drink', prompt: 'summer drink', options: ['Lassi', 'Lemon soda', 'Sugarcane juice', 'Coconut water'] },
  { label: 'Holiday Budget', prompt: 'holiday spending style', options: ['Save aggressively', 'Spend on food', 'Spend on stay', 'Spend on experiences'] },
  { label: 'Room Setup', prompt: 'room upgrade', options: ['Better lighting', 'More plants', 'Minimal decor', 'Gaming corner'] },
  { label: 'Gift Preference', prompt: 'gift type', options: ['Useful gadget', 'Personalized item', 'Gift card', 'Experience voucher'] },
  { label: 'Pet Pick', prompt: 'pet choice', options: ['Dog', 'Cat', 'Fish', 'Bird'] },
];

function generateOpinionQuestionGroups(seed) {
  return opinionDomains.map((domain) => {
    const rng = mulberry32(hashString(`opinion-bank:${seed}:${domain.label}`));
    const questions = [];

    for (const context of opinionContexts) {
      for (const stem of opinionStems) {
        questions.push({
          question_text: stem(domain, context),
          options: buildOpinionOptions(domain.options, rng),
          topic: domain.label,
        });
      }
    }

    const uniqueQuestions = dedupeQuestionsByText(questions);
    if (uniqueQuestions.length !== 120) {
      throw new Error(`Opinion domain ${domain.label} produced ${uniqueQuestions.length} unique questions instead of 120`);
    }

    return {
      domain,
      questions: shuffle(uniqueQuestions, rng),
    };
  });
}

const countryCapitalFacts = [
  ['India', 'New Delhi'], ['Australia', 'Canberra'], ['Brazil', 'Brasilia'], ['Canada', 'Ottawa'], ['China', 'Beijing'],
  ['France', 'Paris'], ['Germany', 'Berlin'], ['Italy', 'Rome'], ['Japan', 'Tokyo'], ['Russia', 'Moscow'],
  ['South Africa', 'Pretoria'], ['Spain', 'Madrid'], ['United Kingdom', 'London'], ['United States', 'Washington, D.C.'], ['Argentina', 'Buenos Aires'],
  ['Bangladesh', 'Dhaka'], ['Bhutan', 'Thimphu'], ['Nepal', 'Kathmandu'], ['Sri Lanka', 'Sri Jayawardenepura Kotte'], ['Pakistan', 'Islamabad'],
  ['Afghanistan', 'Kabul'], ['Indonesia', 'Jakarta'], ['Malaysia', 'Kuala Lumpur'], ['Singapore', 'Singapore'], ['Thailand', 'Bangkok'],
  ['Vietnam', 'Hanoi'], ['Philippines', 'Manila'], ['South Korea', 'Seoul'], ['North Korea', 'Pyongyang'], ['United Arab Emirates', 'Abu Dhabi'],
  ['Saudi Arabia', 'Riyadh'], ['Turkey', 'Ankara'], ['Egypt', 'Cairo'], ['Kenya', 'Nairobi'], ['Nigeria', 'Abuja'],
  ['Ethiopia', 'Addis Ababa'], ['Ghana', 'Accra'], ['Morocco', 'Rabat'], ['Israel', 'Jerusalem'], ['Iran', 'Tehran'],
  ['Iraq', 'Baghdad'], ['Mexico', 'Mexico City'], ['Chile', 'Santiago'], ['Colombia', 'Bogota'], ['Peru', 'Lima'],
  ['Venezuela', 'Caracas'], ['New Zealand', 'Wellington'], ['Fiji', 'Suva'], ['Norway', 'Oslo'], ['Sweden', 'Stockholm'],
  ['Finland', 'Helsinki'], ['Denmark', 'Copenhagen'], ['Netherlands', 'Amsterdam'], ['Belgium', 'Brussels'], ['Switzerland', 'Bern'],
  ['Austria', 'Vienna'], ['Portugal', 'Lisbon'], ['Greece', 'Athens'], ['Poland', 'Warsaw'], ['Ireland', 'Dublin'],
];

const countryCurrencyFacts = [
  ['India', 'Indian Rupee'], ['Japan', 'Yen'], ['China', 'Yuan'], ['United Kingdom', 'Pound Sterling'], ['United States', 'US Dollar'],
  ['Saudi Arabia', 'Saudi Riyal'], ['United Arab Emirates', 'UAE Dirham'], ['Nepal', 'Nepalese Rupee'], ['Bangladesh', 'Taka'], ['Sri Lanka', 'Sri Lankan Rupee'],
  ['Pakistan', 'Pakistani Rupee'], ['Thailand', 'Baht'], ['Indonesia', 'Rupiah'], ['Malaysia', 'Ringgit'], ['Vietnam', 'Dong'],
  ['Singapore', 'Singapore Dollar'], ['South Korea', 'Won'], ['South Africa', 'Rand'], ['Kenya', 'Kenyan Shilling'], ['Nigeria', 'Naira'],
  ['Egypt', 'Egyptian Pound'], ['Morocco', 'Moroccan Dirham'], ['Turkey', 'Turkish Lira'], ['Iran', 'Iranian Rial'], ['Russia', 'Russian Ruble'],
  ['Switzerland', 'Swiss Franc'], ['Australia', 'Australian Dollar'], ['Canada', 'Canadian Dollar'], ['New Zealand', 'New Zealand Dollar'], ['Brazil', 'Brazilian Real'],
  ['Mexico', 'Mexican Peso'], ['Argentina', 'Argentine Peso'], ['Chile', 'Chilean Peso'], ['Colombia', 'Colombian Peso'], ['Peru', 'Peruvian Sol'],
  ['France', 'Euro'], ['Germany', 'Euro'], ['Italy', 'Euro'], ['Spain', 'Euro'], ['Portugal', 'Euro'],
];

const stateCapitalFacts = [
  ['Andhra Pradesh', 'Amaravati'], ['Arunachal Pradesh', 'Itanagar'], ['Assam', 'Dispur'], ['Bihar', 'Patna'], ['Chhattisgarh', 'Raipur'],
  ['Goa', 'Panaji'], ['Gujarat', 'Gandhinagar'], ['Haryana', 'Chandigarh'], ['Himachal Pradesh', 'Shimla'], ['Jharkhand', 'Ranchi'],
  ['Karnataka', 'Bengaluru'], ['Kerala', 'Thiruvananthapuram'], ['Madhya Pradesh', 'Bhopal'], ['Maharashtra', 'Mumbai'], ['Manipur', 'Imphal'],
  ['Meghalaya', 'Shillong'], ['Mizoram', 'Aizawl'], ['Nagaland', 'Kohima'], ['Odisha', 'Bhubaneswar'], ['Punjab', 'Chandigarh'],
  ['Rajasthan', 'Jaipur'], ['Sikkim', 'Gangtok'], ['Tamil Nadu', 'Chennai'], ['Telangana', 'Hyderabad'], ['Tripura', 'Agartala'],
  ['Uttar Pradesh', 'Lucknow'], ['Uttarakhand', 'Dehradun'], ['West Bengal', 'Kolkata'],
];

const booksAuthorFacts = [
  ['Wings of Fire', 'A. P. J. Abdul Kalam'], ['The Discovery of India', 'Jawaharlal Nehru'], ['Gitanjali', 'Rabindranath Tagore'], ['Godan', 'Munshi Premchand'], ['Train to Pakistan', 'Khushwant Singh'],
  ['The White Tiger', 'Aravind Adiga'], ['Midnight\'s Children', 'Salman Rushdie'], ['Malgudi Days', 'R. K. Narayan'], ['A Suitable Boy', 'Vikram Seth'], ['The Guide', 'R. K. Narayan'],
  ['My Experiments with Truth', 'Mahatma Gandhi'], ['Ignited Minds', 'A. P. J. Abdul Kalam'], ['India After Gandhi', 'Ramachandra Guha'], ['A Brief History of Time', 'Stephen Hawking'], ['The Origin of Species', 'Charles Darwin'],
  ['Panchatantra', 'Vishnu Sharma'], ['Anandamath', 'Bankim Chandra Chattopadhyay'], ['The Argumentative Indian', 'Amartya Sen'], ['The Namesake', 'Jhumpa Lahiri'], ['The God of Small Things', 'Arundhati Roy'],
  ['Harry Potter and the Philosopher\'s Stone', 'J. K. Rowling'], ['Pride and Prejudice', 'Jane Austen'], ['Hamlet', 'William Shakespeare'], ['Macbeth', 'William Shakespeare'], ['War and Peace', 'Leo Tolstoy'],
  ['The Alchemist', 'Paulo Coelho'], ['The Old Man and the Sea', 'Ernest Hemingway'], ['1984', 'George Orwell'], ['Animal Farm', 'George Orwell'], ['The Diary of a Young Girl', 'Anne Frank'],
  ['To Kill a Mockingbird', 'Harper Lee'], ['The Great Gatsby', 'F. Scott Fitzgerald'], ['One Indian Girl', 'Chetan Bhagat'], ['Five Point Someone', 'Chetan Bhagat'], ['The Immortals of Meluha', 'Amish Tripathi'],
  ['Sapiens', 'Yuval Noah Harari'], ['The Hobbit', 'J. R. R. Tolkien'], ['Don Quixote', 'Miguel de Cervantes'], ['The Prince', 'Niccolo Machiavelli'], ['The Republic', 'Plato'],
];

const inventionFacts = [
  ['Telephone', 'Alexander Graham Bell'], ['Electric bulb', 'Thomas Edison'], ['Airplane', 'Wright brothers'], ['Printing press', 'Johannes Gutenberg'], ['Radio', 'Guglielmo Marconi'],
  ['Steam engine', 'James Watt'], ['Penicillin', 'Alexander Fleming'], ['Vaccination', 'Edward Jenner'], ['Television', 'John Logie Baird'], ['World Wide Web', 'Tim Berners-Lee'],
  ['Dynamite', 'Alfred Nobel'], ['Jet engine', 'Frank Whittle'], ['Battery', 'Alessandro Volta'], ['X-ray imaging', 'Wilhelm Conrad Roentgen'], ['Diesel engine', 'Rudolf Diesel'],
  ['Computer mouse', 'Douglas Engelbart'], ['Pasteurization', 'Louis Pasteur'], ['Sewing machine', 'Elias Howe'], ['Safety razor', 'King C. Gillette'], ['Helicopter design', 'Igor Sikorsky'],
  ['Ballpoint pen', 'Laszlo Biro'], ['Photography film', 'George Eastman'], ['Periodic table', 'Dmitri Mendeleev'], ['Braille script', 'Louis Braille'], ['Radar', 'Robert Watson-Watt'],
];

const parkStateFacts = [
  ['Jim Corbett National Park', 'Uttarakhand'], ['Kaziranga National Park', 'Assam'], ['Ranthambore National Park', 'Rajasthan'], ['Gir National Park', 'Gujarat'], ['Sundarbans National Park', 'West Bengal'],
  ['Kanha National Park', 'Madhya Pradesh'], ['Bandipur National Park', 'Karnataka'], ['Periyar National Park', 'Kerala'], ['Silent Valley National Park', 'Kerala'], ['Manas National Park', 'Assam'],
  ['Dachigam National Park', 'Jammu and Kashmir'], ['Simlipal National Park', 'Odisha'], ['Pench National Park', 'Madhya Pradesh'], ['Tadoba National Park', 'Maharashtra'], ['Sariska National Park', 'Rajasthan'],
  ['Namdapha National Park', 'Arunachal Pradesh'], ['Keibul Lamjao National Park', 'Manipur'], ['Valley of Flowers National Park', 'Uttarakhand'], ['Desert National Park', 'Rajasthan'], ['Nagarhole National Park', 'Karnataka'],
  ['Achanakmar National Park', 'Chhattisgarh'], ['Bhitarkanika National Park', 'Odisha'], ['Khangchendzonga National Park', 'Sikkim'], ['Great Himalayan National Park', 'Himachal Pradesh'], ['Madhav National Park', 'Madhya Pradesh'],
];

const danceStateFacts = [
  ['Bharatanatyam', 'Tamil Nadu'], ['Kathakali', 'Kerala'], ['Kathak', 'Uttar Pradesh'], ['Kuchipudi', 'Andhra Pradesh'], ['Odissi', 'Odisha'],
  ['Manipuri', 'Manipur'], ['Sattriya', 'Assam'], ['Bihu', 'Assam'], ['Garba', 'Gujarat'], ['Ghoomar', 'Rajasthan'],
  ['Lavani', 'Maharashtra'], ['Bhangra', 'Punjab'], ['Rouf', 'Jammu and Kashmir'], ['Yakshagana', 'Karnataka'], ['Chhau', 'Jharkhand'],
  ['Mohiniyattam', 'Kerala'], ['Kalbelia', 'Rajasthan'], ['Dandiya Raas', 'Gujarat'], ['Cheraw', 'Mizoram'], ['Hojagiri', 'Tripura'],
  ['Nati', 'Himachal Pradesh'], ['Dumhal', 'Jammu and Kashmir'], ['Perini', 'Telangana'], ['Jhumair', 'Jharkhand'], ['Karma', 'Chhattisgarh'],
];

const monumentCityFacts = [
  ['Taj Mahal', 'Agra'], ['Gateway of India', 'Mumbai'], ['Charminar', 'Hyderabad'], ['Qutub Minar', 'Delhi'], ['India Gate', 'Delhi'],
  ['Hawa Mahal', 'Jaipur'], ['Mysore Palace', 'Mysuru'], ['Victoria Memorial', 'Kolkata'], ['Golden Temple', 'Amritsar'], ['Brihadeeswara Temple', 'Thanjavur'],
  ['Konark Sun Temple', 'Konark'], ['Meenakshi Temple', 'Madurai'], ['Sanchi Stupa', 'Sanchi'], ['Ajanta Caves', 'Aurangabad'], ['Ellora Caves', 'Aurangabad'],
  ['Gol Gumbaz', 'Vijayapura'], ['Fatehpur Sikri', 'Agra'], ['Jantar Mantar', 'Jaipur'], ['Rani ki Vav', 'Patan'], ['Khajuraho Temples', 'Khajuraho'],
  ['Humayun\'s Tomb', 'Delhi'], ['Red Fort', 'Delhi'], ['Nalanda Mahavihara', 'Nalanda'], ['Buland Darwaza', 'Fatehpur Sikri'], ['Golconda Fort', 'Hyderabad'],
];

const riverOriginFacts = [
  ['Ganga', 'Gangotri Glacier'], ['Yamuna', 'Yamunotri Glacier'], ['Brahmaputra', 'Angsi Glacier'], ['Godavari', 'Trimbakeshwar'], ['Krishna', 'Mahabaleshwar'],
  ['Kaveri', 'Talakaveri'], ['Narmada', 'Amarkantak'], ['Tapti', 'Multai'], ['Mahanadi', 'Sihawa'], ['Sutlej', 'Rakshastal'],
  ['Beas', 'Beas Kund'], ['Ravi', 'Himalayas'], ['Chenab', 'Baralacha La'], ['Jhelum', 'Verinag'], ['Sabarmati', 'Aravalli Hills'],
  ['Luni', 'Aravalli Hills'], ['Son', 'Amarkantak'], ['Teesta', 'Tso Lhamo Lake'], ['Periyar', 'Sivagiri Hills'], ['Bhima', 'Bhimashankar'],
  ['Tungabhadra', 'Kudli'], ['Pennar', 'Nandi Hills'], ['Banas', 'Khamnor Hills'], ['Shipra', 'Kakri Bardi Hills'], ['Damodar', 'Chota Nagpur Plateau'],
];

const scienceUnitFacts = [
  ['Force', 'Newton'], ['Energy', 'Joule'], ['Power', 'Watt'], ['Pressure', 'Pascal'], ['Frequency', 'Hertz'],
  ['Electric current', 'Ampere'], ['Electric charge', 'Coulomb'], ['Potential difference', 'Volt'], ['Resistance', 'Ohm'], ['Capacitance', 'Farad'],
  ['Temperature', 'Kelvin'], ['Length', 'Metre'], ['Mass', 'Kilogram'], ['Time', 'Second'], ['Luminous intensity', 'Candela'],
  ['Amount of substance', 'Mole'], ['Magnetic flux', 'Weber'], ['Magnetic field strength', 'Tesla'], ['Inductance', 'Henry'], ['Work', 'Joule'],
  ['Momentum', 'Kilogram metre per second'], ['Density', 'Kilogram per cubic metre'], ['Plane angle', 'Radian'], ['Solid angle', 'Steradian'], ['Radioactivity', 'Becquerel'],
];

const elementSymbolFacts = [
  ['Hydrogen', 'H'], ['Helium', 'He'], ['Lithium', 'Li'], ['Beryllium', 'Be'], ['Boron', 'B'],
  ['Carbon', 'C'], ['Nitrogen', 'N'], ['Oxygen', 'O'], ['Fluorine', 'F'], ['Neon', 'Ne'],
  ['Sodium', 'Na'], ['Magnesium', 'Mg'], ['Aluminium', 'Al'], ['Silicon', 'Si'], ['Phosphorus', 'P'],
  ['Sulfur', 'S'], ['Chlorine', 'Cl'], ['Argon', 'Ar'], ['Potassium', 'K'], ['Calcium', 'Ca'],
  ['Iron', 'Fe'], ['Copper', 'Cu'], ['Zinc', 'Zn'], ['Silver', 'Ag'], ['Tin', 'Sn'],
  ['Iodine', 'I'], ['Gold', 'Au'], ['Mercury', 'Hg'], ['Lead', 'Pb'], ['Uranium', 'U'],
];

const historicalYearFacts = [
  ['Battle of Plassey', '1757'], ['First War of Indian Independence', '1857'], ['Jallianwala Bagh massacre', '1919'], ['Non-Cooperation Movement', '1920'], ['Dandi March', '1930'],
  ['Quit India Movement', '1942'], ['India became independent', '1947'], ['Constitution of India came into effect', '1950'], ['Green Revolution began in India', '1960s'], ['Pokhran-I nuclear test', '1974'],
  ['Emergency in India began', '1975'], ['Operation Flood launched', '1970'], ['Mandal Commission report submitted', '1980'], ['Economic liberalization in India', '1991'], ['Kargil War', '1999'],
  ['Right to Information Act enacted', '2005'], ['GST launched in India', '2017'], ['Chandrayaan-3 landing', '2023'], ['Partition of Bengal', '1905'], ['Simon Commission arrived in India', '1928'],
  ['Poona Pact', '1932'], ['Cabinet Mission Plan', '1946'], ['States Reorganisation Act', '1956'], ['Bank nationalization in India', '1969'], ['Pokhran-II nuclear tests', '1998'],
  ['Formation of Telangana', '2014'], ['First general elections in India', '1951-52'], ['Battle of Buxar', '1764'], ['Rowlatt Act passed', '1919'], ['Swadeshi Movement started', '1905'],
];

const organizationHqFacts = [
  ['United Nations', 'New York'], ['UNESCO', 'Paris'], ['WHO', 'Geneva'], ['UNICEF', 'New York'], ['World Bank', 'Washington, D.C.'],
  ['IMF', 'Washington, D.C.'], ['International Court of Justice', 'The Hague'], ['Asian Development Bank', 'Manila'], ['BRICS New Development Bank', 'Shanghai'], ['OPEC', 'Vienna'],
  ['NATO', 'Brussels'], ['European Union', 'Brussels'], ['Interpol', 'Lyon'], ['IOC', 'Lausanne'], ['FIFA', 'Zurich'],
  ['SAARC', 'Kathmandu'], ['ASEAN', 'Jakarta'], ['African Union', 'Addis Ababa'], ['WTO', 'Geneva'], ['Amnesty International', 'London'],
  ['Commonwealth Secretariat', 'London'], ['OECD', 'Paris'], ['IAEA', 'Vienna'], ['ILO', 'Geneva'], ['BIS', 'Basel'],
];

const sportsFacts = [
  ['Ranji Trophy', 'First-class cricket'], ['Duleep Trophy', 'First-class cricket'], ['Deodhar Trophy', 'List A cricket'], ['Vijay Hazare Trophy', 'Domestic one-day cricket'], ['Syed Mushtaq Ali Trophy', 'Domestic T20 cricket'],
  ['Thomas Cup', 'Men\'s badminton'], ['Uber Cup', 'Women\'s badminton'], ['Davis Cup', 'Men\'s tennis'], ['Billie Jean King Cup', 'Women\'s tennis'], ['Santosh Trophy', 'Indian football'],
  ['Durand Cup', 'Football'], ['Merdeka Cup', 'Football'], ['Ryder Cup', 'Golf'], ['Walker Cup', 'Golf'], ['Webb Ellis Cup', 'Rugby World Cup'],
  ['Stanley Cup', 'Ice hockey'], ['America\'s Cup', 'Yacht racing'], ['Sudirman Cup', 'Mixed team badminton'], ['BWF World Championships', 'Badminton'], ['ICC Champions Trophy', 'Cricket'],
  ['Ashes', 'Test cricket'], ['Wimbledon', 'Tennis'], ['French Open', 'Tennis'], ['BWF Thomas and Uber Finals', 'Badminton'], ['Sultan Azlan Shah Cup', 'Field hockey'],
];

const firstInIndiaFacts = [
  ['First President of India', 'Dr. Rajendra Prasad'], ['First Prime Minister of India', 'Jawaharlal Nehru'], ['First woman Prime Minister of India', 'Indira Gandhi'], ['First woman President of India', 'Pratibha Patil'], ['First Indian in space', 'Rakesh Sharma'],
  ['First Indian Nobel Prize winner', 'Rabindranath Tagore'], ['First Indian woman in space', 'Kalpana Chawla'], ['First Indian to win an individual Olympic gold', 'Abhinav Bindra'], ['First Chief Election Commissioner of India', 'Sukumar Sen'], ['First Home Minister of India', 'Sardar Vallabhbhai Patel'],
  ['First woman Governor of an Indian state', 'Sarojini Naidu'], ['First woman Chief Minister of an Indian state', 'Sucheta Kripalani'], ['First Indian woman to win an Olympic medal', 'Karnam Malleswari'], ['First Indian to win the Booker Prize', 'Arundhati Roy'], ['First Indian to receive the Bharat Ratna', 'C. Rajagopalachari'],
  ['First Chief Justice of India', 'H. J. Kania'], ['First Indian woman IPS officer', 'Kiran Bedi'], ['First Indian woman IAS officer', 'Anna Rajam Malhotra'], ['First Speaker of the Lok Sabha', 'G. V. Mavalankar'], ['First field marshal of India', 'Sam Manekshaw'],
  ['First woman judge of the Supreme Court of India', 'M. Fathima Beevi'], ['First Indian woman to climb Mount Everest', 'Bachendri Pal'], ['First Indian to swim across the English Channel', 'Mihir Sen'], ['First Indian woman to win Miss World', 'Reita Faria'], ['First Indian to win an Oscar', 'Bhanu Athaiya'],
];

const constitutionArticleFacts = [
  ['Article 14', 'Right to equality'], ['Article 15', 'Prohibition of discrimination'], ['Article 16', 'Equality of opportunity in public employment'], ['Article 17', 'Abolition of untouchability'], ['Article 19', 'Freedom of speech and expression'],
  ['Article 20', 'Protection in respect of conviction for offences'], ['Article 21', 'Right to life and personal liberty'], ['Article 21A', 'Right to education'], ['Article 22', 'Protection against arbitrary arrest and detention'], ['Article 23', 'Prohibition of human trafficking and forced labour'],
  ['Article 24', 'Prohibition of child labour in hazardous employment'], ['Article 25', 'Freedom of religion'], ['Article 29', 'Protection of cultural and educational interests'], ['Article 30', 'Rights of minorities to establish educational institutions'], ['Article 32', 'Right to constitutional remedies'],
  ['Article 40', 'Organization of village panchayats'], ['Article 44', 'Uniform civil code for citizens'], ['Article 45', 'Early childhood care and education'], ['Article 48A', 'Protection and improvement of environment'], ['Article 49', 'Protection of monuments and places of national importance'],
  ['Article 50', 'Separation of judiciary from executive'], ['Article 51A', 'Fundamental duties'], ['Article 54', 'Election of the President'], ['Article 61', 'Impeachment of the President'], ['Article 76', 'Attorney General for India'],
  ['Article 110', 'Money Bill'], ['Article 112', 'Annual financial statement'], ['Article 123', 'President\'s ordinance-making power'], ['Article 280', 'Finance Commission'], ['Article 324', 'Election Commission'],
];

function generateGKTopicGroups(seed) {
  return [
    {
      topic: 'World Capitals',
      questions: createPairQuestions({
        facts: countryCapitalFacts,
        questionTemplates: [
          { hi: (country) => `${translateTermToHindi(country)} की राजधानी क्या है?`, en: (country) => `What is the capital of ${country}?` },
          { hi: (country) => `${translateTermToHindi(country)} की राजधानी कौन-सा शहर है?`, en: (country) => `Which city is the capital of ${country}?` },
          { hi: (country) => `${translateTermToHindi(country)} की राजधानी कौन-सी है?`, en: (country) => `${country} has which capital city?` },
          { hi: (country) => `${translateTermToHindi(country)} की राजधानी पहचानिए।`, en: (country) => `Identify the capital city of ${country}.` },
          { hi: (country) => `${translateTermToHindi(country)} की सरकार का मुख्यालय किस शहर में है?`, en: (country) => `The seat of government of ${country} is which city?` },
        ],
        answerPool: countryCapitalFacts.map(([, capital]) => capital),
        reverseTemplates: [
          { hi: (country, capital) => `${translateTermToHindi(capital)} किस देश की राजधानी है?`, en: (country, capital) => `${capital} is the capital of which country?` },
          { hi: (country, capital) => `किस देश की राजधानी ${translateTermToHindi(capital)} है?`, en: (country, capital) => `Which country has ${capital} as its capital?` },
        ],
        reverseAnswerPool: countryCapitalFacts.map(([country]) => country),
        seed: `${seed}:country-capital`,
        topic: 'World Capitals',
      }),
    },
    {
      topic: 'World Currencies',
      questions: createPairQuestions({
        facts: countryCurrencyFacts,
        questionTemplates: [
          { hi: (country) => `${translateTermToHindi(country)} की मुद्रा क्या है?`, en: (country) => `What is the currency of ${country}?` },
          { hi: (country) => `${translateTermToHindi(country)} में कौन-सी मुद्रा चलती है?`, en: (country) => `Which currency is used in ${country}?` },
          { hi: (country) => `${translateTermToHindi(country)} आधिकारिक रूप से किस मुद्रा का उपयोग करता है?`, en: (country) => `${country} officially uses which currency?` },
          { hi: (country) => `${translateTermToHindi(country)} से जुड़ी मुद्रा पहचानिए।`, en: (country) => `Identify the currency linked with ${country}.` },
          { hi: (country) => `${translateTermToHindi(country)} में आमतौर पर किस मुद्रा में लेन-देन होता है?`, en: (country) => `People in ${country} commonly transact in which currency?` },
        ],
        answerPool: countryCurrencyFacts.map(([, currency]) => currency),
        seed: `${seed}:country-currency`,
        topic: 'World Currencies',
      }),
    },
    {
      topic: 'Indian State Capitals',
      questions: createPairQuestions({
        facts: stateCapitalFacts,
        questionTemplates: [
          { hi: (state) => `${translateTermToHindi(state)} की राजधानी क्या है?`, en: (state) => `What is the capital of ${state}?` },
          { hi: (state) => `${translateTermToHindi(state)} की राजधानी कौन-सा शहर है?`, en: (state) => `Which city serves as the capital of ${state}?` },
          { hi: (state) => `${translateTermToHindi(state)} की राजधानी कौन-सी है?`, en: (state) => `${state} has which capital city?` },
          { hi: (state) => `${translateTermToHindi(state)} की राजधानी पहचानिए।`, en: (state) => `Identify the capital city of ${state}.` },
          { hi: (state) => `${translateTermToHindi(state)} की प्रशासनिक राजधानी कौन-सी है?`, en: (state) => `The administrative capital of ${state} is which city?` },
        ],
        answerPool: stateCapitalFacts.map(([, capital]) => capital),
        reverseTemplates: [
          { hi: (state, capital) => `${translateTermToHindi(capital)} किस भारतीय राज्य की राजधानी है?`, en: (state, capital) => `${capital} is the capital of which Indian state?` },
          { hi: (state, capital) => `किस भारतीय राज्य की राजधानी ${translateTermToHindi(capital)} है?`, en: (state, capital) => `Which Indian state has ${capital} as its capital?` },
        ],
        reverseAnswerPool: stateCapitalFacts.map(([state]) => state),
        seed: `${seed}:state-capital`,
        topic: 'Indian State Capitals',
      }),
    },
    {
      topic: 'Books and Authors',
      questions: createPairQuestions({
        facts: booksAuthorFacts,
        questionTemplates: [
          { hi: (book) => `${translateTermToHindi(book)} किसने लिखी?`, en: (book) => `Who wrote ${book}?` },
          { hi: (book) => `${translateTermToHindi(book)} के लेखक कौन हैं?`, en: (book) => `${book} is authored by whom?` },
          { hi: (book) => `${translateTermToHindi(book)} के लेखक पहचानिए।`, en: (book) => `Identify the author of ${book}.` },
          { hi: (book) => `${translateTermToHindi(book)} किस लेखक से जुड़ी है?`, en: (book) => `Which writer is associated with ${book}?` },
          { hi: (book) => `${translateTermToHindi(book)} पुस्तक किसने लिखी थी?`, en: (book) => `The book ${book} was written by whom?` },
        ],
        answerPool: booksAuthorFacts.map(([, author]) => author),
        reverseTemplates: [
          { hi: (book, author) => `${translateTermToHindi(author)} ने इनमें से कौन-सी पुस्तक लिखी?`, en: (book, author) => `${author} wrote which of these books?` },
          { hi: (book, author) => `${translateTermToHindi(author)} किस शीर्षक से जुड़े हैं?`, en: (book, author) => `Which title is associated with ${author}?` },
        ],
        reverseAnswerPool: booksAuthorFacts.map(([book]) => book),
        seed: `${seed}:books`,
        topic: 'Books and Authors',
      }),
    },
    {
      topic: 'Inventions and Discoveries',
      questions: createPairQuestions({
        facts: inventionFacts,
        questionTemplates: [
          { hi: (item) => `${translateTermToHindi(item)} के आविष्कार का श्रेय किसे दिया जाता है?`, en: (item) => `Who is credited with inventing the ${item}?` },
          { hi: (item) => `${translateTermToHindi(item)} किस आविष्कारक से जुड़ा है?`, en: (item) => `The ${item} is associated with which inventor?` },
          { hi: (item) => `${translateTermToHindi(item)} से जुड़े आविष्कारक पहचानिए।`, en: (item) => `Identify the inventor linked to the ${item}.` },
          { hi: (item) => `${translateTermToHindi(item)} आम तौर पर किस आविष्कारक से जुड़ा माना जाता है?`, en: (item) => `Which inventor is commonly associated with the ${item}?` },
          { hi: (item) => `मानक जीके के अनुसार ${translateTermToHindi(item)} किसने विकसित किया?`, en: (item) => `Who developed the ${item} according to standard GK references?` },
        ],
        answerPool: inventionFacts.map(([, inventor]) => inventor),
        reverseTemplates: [
          { hi: (item, inventor) => `${translateTermToHindi(inventor)} इनमें से किस आविष्कार के लिए जाने जाते हैं?`, en: (item, inventor) => `${inventor} is best known for which of these inventions?` },
          { hi: (item, inventor) => `${translateTermToHindi(inventor)} से जुड़ा आविष्कार चुनिए।`, en: (item, inventor) => `Pick the invention associated with ${inventor}.` },
        ],
        reverseAnswerPool: inventionFacts.map(([item]) => item),
        seed: `${seed}:inventions`,
        topic: 'Inventions and Discoveries',
      }),
    },
    {
      topic: 'National Parks',
      questions: createPairQuestions({
        facts: parkStateFacts,
        questionTemplates: [
          { hi: (park) => `${translateTermToHindi(park)} किस राज्य में स्थित है?`, en: (park) => `${park} is located in which state?` },
          { hi: (park) => `${translateTermToHindi(park)} किस राज्य में पाया जाता है, पहचानिए।`, en: (park) => `Identify the state where ${park} is found.` },
          { hi: (park) => `${translateTermToHindi(park)} किस राज्य में है?`, en: (park) => `Which state is home to ${park}?` },
          { hi: (park) => `${translateTermToHindi(park)} किस भारतीय राज्य से संबंधित है?`, en: (park) => `${park} belongs to which Indian state?` },
          { hi: (park) => `${translateTermToHindi(park)} आपको किस राज्य में मिलेगा?`, en: (park) => `In which state would you find ${park}?` },
        ],
        answerPool: parkStateFacts.map(([, state]) => state),
        seed: `${seed}:parks`,
        topic: 'National Parks',
      }),
    },
    {
      topic: 'Dance and Culture',
      questions: createPairQuestions({
        facts: danceStateFacts,
        questionTemplates: [
          { hi: (dance) => `${translateTermToHindi(dance)} मुख्य रूप से किस राज्य से जुड़ा है?`, en: (dance) => `${dance} is mainly associated with which state?` },
          { hi: (dance) => `${translateTermToHindi(dance)} से जुड़ा भारतीय राज्य पहचानिए।`, en: (dance) => `Identify the Indian state linked with ${dance}.` },
          { hi: (dance) => `${translateTermToHindi(dance)} किस क्षेत्र या राज्य परंपरा से संबंधित है?`, en: (dance) => `${dance} belongs to which region or state tradition?` },
          { hi: (dance) => `${translateTermToHindi(dance)} के लिए कौन-सा राज्य सबसे अधिक जाना जाता है?`, en: (dance) => `Which state is best known for ${dance}?` },
          { hi: (dance) => `${translateTermToHindi(dance)} नृत्य किस राज्य से जुड़ा है?`, en: (dance) => `The dance form ${dance} is associated with which state?` },
        ],
        answerPool: danceStateFacts.map(([, state]) => state),
        seed: `${seed}:dance-state`,
        topic: 'Dance and Culture',
      }),
    },
    {
      topic: 'Monuments and Cities',
      questions: createPairQuestions({
        facts: monumentCityFacts,
        questionTemplates: [
          { hi: (monument) => `${translateTermToHindi(monument)} किस शहर में स्थित है?`, en: (monument) => `${monument} is located in which city?` },
          { hi: (monument) => `${translateTermToHindi(monument)} से जुड़ा शहर पहचानिए।`, en: (monument) => `Identify the city associated with ${monument}.` },
          { hi: (monument) => `${translateTermToHindi(monument)} आपको किस शहर में मिलेगा?`, en: (monument) => `In which city would you find ${monument}?` },
          { hi: (monument) => `${translateTermToHindi(monument)} किस शहर में स्थित है?`, en: (monument) => `${monument} stands in which city?` },
          { hi: (monument) => `${translateTermToHindi(monument)} स्मारक किस शहर में है?`, en: (monument) => `The monument ${monument} is in which city?` },
        ],
        answerPool: monumentCityFacts.map(([, city]) => city),
        reverseTemplates: [
          { hi: (monument, city) => `${translateTermToHindi(city)} किस स्मारक से जुड़ा है?`, en: (monument, city) => `${city} is associated with which monument from the options below?` },
          { hi: (monument, city) => `${translateTermToHindi(city)} में स्थित स्मारक चुनिए।`, en: (monument, city) => `Pick the monument located in ${city}.` },
        ],
        reverseAnswerPool: monumentCityFacts.map(([monument]) => monument),
        seed: `${seed}:monuments`,
        topic: 'Monuments and Cities',
      }),
    },
    {
      topic: 'Rivers and Origins',
      questions: createPairQuestions({
        facts: riverOriginFacts,
        questionTemplates: [
          { hi: (river) => `${translateTermToHindi(river)} नदी का उद्गम क्या है?`, en: (river) => `What is the origin of the ${river} river?` },
          { hi: (river) => `${translateTermToHindi(river)} किस स्थान से निकलती है?`, en: (river) => `${river} rises from which place?` },
          { hi: (river) => `${translateTermToHindi(river)} का स्रोत पहचानिए।`, en: (river) => `Identify the source of the ${river}.` },
          { hi: (river) => `${translateTermToHindi(river)} कहाँ से उत्पन्न होती है?`, en: (river) => `The ${river} originates from where?` },
          { hi: (river) => `${translateTermToHindi(river)} का स्रोत कौन-सा स्थान है?`, en: (river) => `Which location is the source of the ${river}?` },
        ],
        answerPool: riverOriginFacts.map(([, origin]) => origin),
        seed: `${seed}:rivers`,
        topic: 'Rivers and Origins',
      }),
    },
    {
      topic: 'Science Units',
      questions: createPairQuestions({
        facts: scienceUnitFacts,
        questionTemplates: [
          { hi: (quantity) => `${translateTermToHindi(quantity)} की SI इकाई क्या है?`, en: (quantity) => `What is the SI unit of ${quantity}?` },
          { hi: (quantity) => `${translateTermToHindi(quantity)} को मापने के लिए कौन-सी इकाई उपयोग होती है?`, en: (quantity) => `Which unit is used to measure ${quantity}?` },
          { hi: (quantity) => `${translateTermToHindi(quantity)} किस SI इकाई में मापा जाता है?`, en: (quantity) => `${quantity} is measured in which SI unit?` },
          { hi: (quantity) => `${translateTermToHindi(quantity)} की मानक इकाई पहचानिए।`, en: (quantity) => `Identify the standard unit of ${quantity}.` },
          { hi: (quantity) => `${translateTermToHindi(quantity)} के लिए SI इकाई निम्न में से कौन-सी है?`, en: (quantity) => `For ${quantity}, the SI unit is which of the following?` },
        ],
        answerPool: scienceUnitFacts.map(([, unit]) => unit),
        reverseTemplates: [
          { hi: (quantity, unit) => `${translateTermToHindi(unit)} किस राशि की SI इकाई है?`, en: (quantity, unit) => `${unit} is the SI unit of which quantity?` },
          { hi: (quantity, unit) => `${translateTermToHindi(unit)} में कौन-सी भौतिक राशि मापी जाती है?`, en: (quantity, unit) => `Which physical quantity is measured in ${unit}?` },
        ],
        reverseAnswerPool: scienceUnitFacts.map(([quantity]) => quantity),
        seed: `${seed}:science-units`,
        topic: 'Science Units',
      }),
    },
    {
      topic: 'Elements and Symbols',
      questions: createPairQuestions({
        facts: elementSymbolFacts,
        questionTemplates: [
          { hi: (element) => `${translateTermToHindi(element)} का रासायनिक प्रतीक क्या है?`, en: (element) => `What is the chemical symbol of ${element}?` },
          { hi: (element) => `${translateTermToHindi(element)} के लिए प्रयुक्त प्रतीक पहचानिए।`, en: (element) => `Identify the symbol used for ${element}.` },
          { hi: (element) => `${translateTermToHindi(element)} किस प्रतीक से दर्शाया जाता है?`, en: (element) => `${element} is represented by which symbol?` },
          { hi: (element) => `${translateTermToHindi(element)} का रासायनिक प्रतीक कौन-सा है?`, en: (element) => `Which chemical symbol belongs to ${element}?` },
          { hi: (element) => `${translateTermToHindi(element)} के लिए सही प्रतीक चुनिए।`, en: (element) => `Pick the correct symbol for ${element}.` },
        ],
        answerPool: elementSymbolFacts.map(([, symbol]) => symbol),
        reverseTemplates: [
          { hi: (element, symbol) => `${translateTermToHindi(symbol)} किस तत्व का प्रतीक है?`, en: (element, symbol) => `${symbol} stands for which element?` },
          { hi: (element, symbol) => `${translateTermToHindi(symbol)} प्रतीक किस तत्व के लिए है?`, en: (element, symbol) => `Which element uses the symbol ${symbol}?` },
        ],
        reverseAnswerPool: elementSymbolFacts.map(([element]) => element),
        seed: `${seed}:elements`,
        topic: 'Elements and Symbols',
      }),
    },
    {
      topic: 'Modern History',
      questions: createPairQuestions({
        facts: historicalYearFacts,
        questionTemplates: [
          { hi: (event) => `${translateTermToHindi(event)} किस वर्ष हुआ था?`, en: (event) => `In which year did ${event} take place?` },
          { hi: (event) => `${translateTermToHindi(event)} किस वर्ष हुआ?`, en: (event) => `${event} happened in which year?` },
          { hi: (event) => `${translateTermToHindi(event)} से जुड़ा वर्ष पहचानिए।`, en: (event) => `Identify the year associated with ${event}.` },
          { hi: (event) => `${translateTermToHindi(event)} किस वर्ष से जुड़ा है?`, en: (event) => `Which year is linked with ${event}?` },
          { hi: (event) => `${translateTermToHindi(event)} के लिए सही वर्ष चुनिए।`, en: (event) => `Pick the correct year for ${event}.` },
        ],
        answerPool: historicalYearFacts.map(([, year]) => year),
        reverseTemplates: [
          { hi: (event, year) => `${translateTermToHindi(year)} वर्ष किस घटना से जुड़ा है?`, en: (event, year) => `Which event is associated with the year ${year}?` },
          { hi: (event, year) => `${translateTermToHindi(year)} वर्ष सबसे अधिक किस घटना से संबंधित है?`, en: (event, year) => `The year ${year} is best linked to which event?` },
        ],
        reverseAnswerPool: historicalYearFacts.map(([event]) => event),
        seed: `${seed}:history`,
        topic: 'Modern History',
      }),
    },
    {
      topic: 'Organization Headquarters',
      questions: createPairQuestions({
        facts: organizationHqFacts,
        questionTemplates: [
          { hi: (org) => `${translateTermToHindi(org)} का मुख्यालय कहाँ है?`, en: (org) => `Where is the headquarters of ${org}?` },
          { hi: (org) => `${translateTermToHindi(org)} का मुख्यालय किस शहर में है?`, en: (org) => `${org} is headquartered in which city?` },
          { hi: (org) => `${translateTermToHindi(org)} के मुख्यालय वाला शहर पहचानिए।`, en: (org) => `Identify the headquarters city of ${org}.` },
          { hi: (org) => `${translateTermToHindi(org)} का मुख्यालय कौन-सा शहर होस्ट करता है?`, en: (org) => `Which city hosts the headquarters of ${org}?` },
          { hi: (org) => `${translateTermToHindi(org)} के मुख्यालय का स्थान चुनिए।`, en: (org) => `Pick the headquarters location of ${org}.` },
        ],
        answerPool: organizationHqFacts.map(([, city]) => city),
        reverseTemplates: [
          { hi: (org, city) => `${translateTermToHindi(city)} किस संगठन का मुख्यालय है?`, en: (org, city) => `${city} hosts the headquarters of which organization?` },
          { hi: (org, city) => `${translateTermToHindi(city)} में कौन-सा संगठन आधारित है?`, en: (org, city) => `Which organization is based in ${city}?` },
        ],
        reverseAnswerPool: organizationHqFacts.map(([org]) => org),
        seed: `${seed}:orgs`,
        topic: 'Organization Headquarters',
      }),
    },
    {
      topic: 'Sports GK',
      questions: createPairQuestions({
        facts: sportsFacts,
        questionTemplates: [
          { hi: (trophy) => `${translateTermToHindi(trophy)} किस खेल या प्रतियोगिता से जुड़ी है?`, en: (trophy) => `${trophy} is associated with which sport or competition?` },
          { hi: (trophy) => `${translateTermToHindi(trophy)} से जुड़ा खेल पहचानिए।`, en: (trophy) => `Identify the sport linked with ${trophy}.` },
          { hi: (trophy) => `${translateTermToHindi(trophy)} किस खेल क्षेत्र से संबंधित है?`, en: (trophy) => `${trophy} belongs to which sporting domain?` },
          { hi: (trophy) => `${translateTermToHindi(trophy)} किस खेल या टूर्नामेंट प्रकार से जुड़ी है?`, en: (trophy) => `Which game or tournament type is connected to ${trophy}?` },
          { hi: (trophy) => `${translateTermToHindi(trophy)} के लिए सही खेल संबंध चुनिए।`, en: (trophy) => `Pick the correct sporting association for ${trophy}.` },
        ],
        answerPool: sportsFacts.map(([, sport]) => sport),
        seed: `${seed}:sports`,
        topic: 'Sports GK',
      }),
    },
    {
      topic: 'First in India',
      questions: createPairQuestions({
        facts: firstInIndiaFacts,
        questionTemplates: [
          { hi: (title) => `${translateTermToHindi(title)} कौन थे?`, en: (title) => `${title} was who?` },
          { hi: (title) => `${translateTermToHindi(title)} से जुड़े व्यक्ति पहचानिए।`, en: (title) => `Identify the person associated with the title: ${title}.` },
          { hi: (title) => `${translateTermToHindi(title)} के रूप में किसे याद किया जाता है?`, en: (title) => `Who is remembered as the ${title.toLowerCase()}?` },
          { hi: (title) => `${translateTermToHindi(title)} के लिए सही नाम चुनिए।`, en: (title) => `Pick the correct name for: ${title}.` },
          { hi: (title) => `${translateTermToHindi(title)} का वर्णन किस व्यक्ति पर सही बैठता है?`, en: (title) => `Which person fits the description: ${title}?` },
        ],
        answerPool: firstInIndiaFacts.map(([, person]) => person),
        seed: `${seed}:firsts`,
        topic: 'First in India',
      }),
    },
    {
      topic: 'Constitution Articles',
      questions: createPairQuestions({
        facts: constitutionArticleFacts,
        questionTemplates: [
          { hi: (article) => `भारतीय संविधान का ${translateTermToHindi(article)} किससे संबंधित है?`, en: (article) => `${article} of the Indian Constitution is associated with what?` },
          { hi: (article) => `भारतीय संविधान में ${translateTermToHindi(article)} का विषय क्या है?`, en: (article) => `What is the subject of ${article} in the Indian Constitution?` },
          { hi: (article) => `${translateTermToHindi(article)} से जुड़ा संवैधानिक प्रावधान पहचानिए।`, en: (article) => `Identify the constitutional provision linked with ${article}.` },
          { hi: (article) => `${translateTermToHindi(article)} मुख्य रूप से किस विषय से संबंधित है?`, en: (article) => `${article} primarily deals with which matter?` },
          { hi: (article) => `${translateTermToHindi(article)} का सही विवरण चुनिए।`, en: (article) => `Pick the correct description of ${article}.` },
        ],
        answerPool: constitutionArticleFacts.map(([, subject]) => subject),
        reverseTemplates: [
          { hi: (article, subject) => `${translateTermToHindi(subject)} किस अनुच्छेद से जुड़ा है?`, en: (article, subject) => `Which article is associated with ${subject}?` },
          { hi: (article, subject) => `${translateTermToHindi(subject)} संविधान के किस अनुच्छेद से संबंधित है?`, en: (article, subject) => `${subject} is linked with which article of the Constitution?` },
        ],
        reverseAnswerPool: constitutionArticleFacts.map(([article]) => article),
        seed: `${seed}:constitution`,
        topic: 'Constitution Articles',
      }),
    },
  ].map((group) => ({
    topic: group.topic,
    questions: shuffle(group.questions, mulberry32(hashString(`${seed}:${group.topic}:shuffle`))),
  }));
}

const gkTitleHooks = [
  'Brainwave Blitz',
  'Mastermind Marathon',
  'Rapid Recall Rally',
  'Smart Score Sprint',
  'Knowledge Knockout',
  'Exam Edge Express',
  'Sharp Mind Showdown',
  'Quick Revision Clash',
  'Fact Hunter Arena',
  'GK Power Play',
  'Quiz Champ Circuit',
  'Focus Mode Face-Off',
];

const gkTitleThemes = [
  'Capitals, Science and History Mix',
  'Static GK Power Round',
  'Exam-Style Accuracy Test',
  'Fast Facts and Smart Picks',
  'India and World Knowledge Pack',
  'Moderate Level Challenge Set',
  'Balanced Revision Mega Quiz',
  'Culture, Geography and Polity Mix',
  'Serious Prep Quick Round',
  'All-Rounder GK Battle',
  'Concepts, Dates and Capitals Mix',
  'Scholar Mode Quiz Deck',
  'Precision Practice Power Set',
  'Confidence Booster GK Round',
  'Competitive Exam Warm-Up',
  'Memory Test Mixed Bag',
  'Topical Static GK Sprint',
  'Smart Revision Battle',
  'Well-Rounded Knowledge Round',
  'Moderate Difficulty Master Set',
  'Quiz League Mixed Challenge',
  'Daily Prep Signature Round',
  'Rank Booster GK Capsule',
  'Strong Basics Challenge Pack',
];

function buildOpinionQuizPayloads(seed) {
  const groups = generateOpinionQuestionGroups(seed);
  const quizzes = [];

  for (const { domain, questions } of groups) {
    const batches = chunk(questions, QUESTIONS_PER_QUIZ);
    if (batches.length !== 12 || batches.some((batch) => batch.length !== QUESTIONS_PER_QUIZ)) {
      throw new Error(`Opinion domain ${domain.label} could not be split into 12 full quizzes`);
    }

    for (let index = 0; index < batches.length; index += 1) {
      quizzes.push({
        title: toBilingualText(
          `${translateTermToHindi(opinionTitleHooks[index])}: ${OPINION_LABEL_HI[domain.label]}`,
          `${opinionTitleHooks[index]}: ${domain.label}`
        ),
        questions: batches[index].map((question) => ({
          question_text: question.question_text,
          options: question.options,
        })),
      });
    }
  }

  return quizzes;
}

function buildBalancedGKQuizPayloads(seed) {
  const topicGroups = generateGKTopicGroups(seed);
  const pools = topicGroups.map((group) => ({
    topic: group.topic,
    questions: [...group.questions],
  }));
  const quizzes = Array.from({ length: QUIZZES_PER_CATEGORY }, () => ({
    questions: [],
    topics: new Map(),
  }));

  for (let round = 0; round < QUESTIONS_PER_QUIZ; round += 1) {
    for (let quizIndex = 0; quizIndex < QUIZZES_PER_CATEGORY; quizIndex += 1) {
      const quiz = quizzes[quizIndex];
      const sortedPools = [...pools]
        .filter((pool) => pool.questions.length > 0)
        .sort((left, right) => {
          const leftCount = quiz.topics.get(left.topic) || 0;
          const rightCount = quiz.topics.get(right.topic) || 0;
          if (leftCount !== rightCount) return leftCount - rightCount;
          return right.questions.length - left.questions.length;
        });

      const selectedPool = sortedPools[0];
      if (!selectedPool) {
        throw new Error('GK pools exhausted before all quizzes were filled');
      }

      const question = selectedPool.questions.shift();
      quiz.questions.push({
        question_text: question.question_text,
        options: question.options,
      });
      quiz.topics.set(selectedPool.topic, (quiz.topics.get(selectedPool.topic) || 0) + 1);
    }
  }

  return quizzes.map((quiz, index) => ({
    title: toBilingualText(
      `${translateTermToHindi(gkTitleHooks[index % gkTitleHooks.length])}: ${translateTermToHindi(gkTitleThemes[Math.floor(index / gkTitleHooks.length)])}`,
      `${gkTitleHooks[index % gkTitleHooks.length]}: ${gkTitleThemes[Math.floor(index / gkTitleHooks.length)]}`
    ),
    questions: quiz.questions,
  }));
}

function validateQuizzes(category, quizzes) {
  if (quizzes.length !== QUIZZES_PER_CATEGORY) {
    throw new Error(`${category}: expected ${QUIZZES_PER_CATEGORY} quizzes, found ${quizzes.length}`);
  }

  const titleSet = new Set();
  const questionSet = new Set();

  for (let quizIndex = 0; quizIndex < quizzes.length; quizIndex += 1) {
    const quiz = quizzes[quizIndex];
    if (!quiz.title || !Array.isArray(quiz.questions) || quiz.questions.length !== QUESTIONS_PER_QUIZ) {
      throw new Error(`${category}: quiz ${quizIndex + 1} has invalid title or question shape`);
    }

    const normalizedTitle = normalizeText(quiz.title);
    if (titleSet.has(normalizedTitle)) {
      throw new Error(`${category}: duplicate title found -> ${quiz.title}`);
    }
    titleSet.add(normalizedTitle);

    for (let questionIndex = 0; questionIndex < quiz.questions.length; questionIndex += 1) {
      const question = quiz.questions[questionIndex];
      if (!question.question_text || !Array.isArray(question.options) || question.options.length !== OPTIONS_PER_QUESTION) {
        throw new Error(`${category}: quiz ${quizIndex + 1}, question ${questionIndex + 1} has invalid option shape`);
      }

      const normalizedQuestion = normalizeText(question.question_text);
      if (questionSet.has(normalizedQuestion)) {
        throw new Error(`${category}: duplicate question detected -> ${question.question_text}`);
      }
      questionSet.add(normalizedQuestion);

      const nonEmptyOptions = question.options.every((option) => option.option_text && typeof option.is_correct === 'boolean');
      if (!nonEmptyOptions) {
        throw new Error(`${category}: quiz ${quizIndex + 1}, question ${questionIndex + 1} has empty options`);
      }

      const optionTextSet = new Set(question.options.map((option) => normalizeText(option.option_text)));
      if (optionTextSet.size !== OPTIONS_PER_QUESTION) {
        throw new Error(`${category}: quiz ${quizIndex + 1}, question ${questionIndex + 1} has duplicate options`);
      }

      const correctCount = question.options.filter((option) => option.is_correct).length;
      if (category === 'gk' && correctCount !== 1) {
        throw new Error(`${category}: quiz ${quizIndex + 1}, question ${questionIndex + 1} must have exactly one correct answer`);
      }
      if (category === 'opinion' && correctCount !== 0) {
        throw new Error(`${category}: quiz ${quizIndex + 1}, question ${questionIndex + 1} must not have a correct answer`);
      }
    }
  }
}

function writeOutput(targetDate, category, quizzes) {
  const daySuffix = String(parseInt(targetDate.split('-')[2], 10));
  const outputDir = path.join(process.cwd(), 'bulk');
  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, `${category}_288_bilingual_${daySuffix}.json`);
  fs.writeFileSync(filePath, JSON.stringify(quizzes, null, 2));
  return filePath;
}

function main() {
  const targetDate = getArg('date') || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    throw new Error('Use --date=YYYY-MM-DD');
  }

  const opinionQuizzes = buildOpinionQuizPayloads(targetDate);
  const gkQuizzes = buildBalancedGKQuizPayloads(targetDate);

  validateQuizzes('opinion', opinionQuizzes);
  validateQuizzes('gk', gkQuizzes);

  const opinionPath = writeOutput(targetDate, 'opinion', opinionQuizzes);
  const gkPath = writeOutput(targetDate, 'gk', gkQuizzes);

  console.log(`Generated opinion quizzes: ${opinionQuizzes.length} -> ${opinionPath}`);
  console.log(`Generated GK quizzes: ${gkQuizzes.length} -> ${gkPath}`);
  console.log(`Opinion titles unique: ${new Set(opinionQuizzes.map((quiz) => quiz.title)).size}`);
  console.log(`GK titles unique: ${new Set(gkQuizzes.map((quiz) => quiz.title)).size}`);
}

main();
