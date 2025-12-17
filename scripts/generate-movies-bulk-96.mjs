#!/usr/bin/env node
// Node 18+ | ES Module

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/* ---------------- CLI ARGS ----------------
Supports:
  node .\scripts\generate-movies-bulk-96.mjs --category movies --date 2025-12-18
Also supports: --key=value style
*/
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;

    // --key=value
    if (a.includes("=")) {
      const [k, ...rest] = a.split("=");
      out[k.replace(/^--/, "")] = rest.join("=") || true;
      continue;
    }

    // --key value
    const key = a.replace(/^--/, "");
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

const CATEGORY = String(args.category || "movies").trim().toLowerCase();
const DATE = String(args.date || new Date().toISOString().slice(0, 10)).trim();
const SEED = String(args.seed || `${CATEGORY}-${DATE}`).trim();
const OUT = String(args.out || `docs/bulk-${CATEGORY}-96-${DATE}.txt`).trim();

/* ---------------- RNG (seeded) ---------------- */
function makeRng(seed) {
  const hash = crypto.createHash("sha256").update(seed).digest();
  let state = hash.readUInt32LE(0) >>> 0;

  // xorshift32
  return function rand() {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

const rand = makeRng(SEED);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const letters = ["A", "B", "C", "D"]; 
const hiEn = (hi, en) => `${hi} / ${en}`;

/* ---------------- MOVIE DATA ----------------
IMPORTANT: Trend-specific facts tum yahin update/add kar sakte ho.
*/
const MOVIES = [
  {
    hi: "जवान",
    en: "Jawan",
    director: hiEn("एटली", "Atlee"),
    lead: hiEn("शाहरुख खान", "Shah Rukh Khan"),
    genres: [hiEn("एक्शन", "Action"), hiEn("थ्रिलर", "Thriller"), hiEn("ड्रामा", "Drama")],
    industry: hiEn("बॉलीवुड", "Bollywood"),
  },
  {
    hi: "पठान",
    en: "Pathaan",
    director: hiEn("सिद्धार्थ आनंद", "Siddharth Anand"),
    lead: hiEn("शाहरुख खान", "Shah Rukh Khan"),
    genres: [hiEn("एक्शन", "Action"), hiEn("स्पाई", "Spy"), hiEn("थ्रिलर", "Thriller")],
    industry: hiEn("बॉलीवुड", "Bollywood"),
  },
  {
    hi: "एनिमल",
    en: "Animal",
    director: hiEn("संदीप रेड्डी वांगा", "Sandeep Reddy Vanga"),
    lead: hiEn("रणबीर कपूर", "Ranbir Kapoor"),
    genres: [hiEn("क्राइम", "Crime"), hiEn("ड्रामा", "Drama"), hiEn("थ्रिलर", "Thriller")],
    industry: hiEn("बॉलीवुड", "Bollywood"),
  },
  {
    hi: "ओपेनहाइमर",
    en: "Oppenheimer",
    director: hiEn("क्रिस्टोफर नोलन", "Christopher Nolan"),
    lead: hiEn("सिलियन मर्फी", "Cillian Murphy"),
    genres: [hiEn("बायोपिक", "Biopic"), hiEn("ड्रामा", "Drama"), hiEn("ऐतिहासिक", "Historical")],
    industry: hiEn("हॉलीवुड", "Hollywood"),
  },
  {
    hi: "सालार",
    en: "Salaar",
    director: hiEn("प्रशांत नील", "Prashanth Neel"),
    lead: hiEn("प्रभास", "Prabhas"),
    genres: [hiEn("एक्शन", "Action"), hiEn("ड्रामा", "Drama"), hiEn("थ्रिलर", "Thriller")],
    industry: hiEn("भारतीय सिनेमा", "Indian cinema"),
  },
];

const COMMON_WRONG_DIRECTORS = [
  hiEn("राजकुमार हिरानी", "Rajkumar Hirani"),
  hiEn("रोहित शेट्टी", "Rohit Shetty"),
  hiEn("अनुराग कश्यप", "Anurag Kashyap"),
  hiEn("संजय लीला भंसाली", "Sanjay Leela Bhansali"),
  hiEn("जेम्स कैमरून", "James Cameron"),
  hiEn("स्टीवन स्पीलबर्ग", "Steven Spielberg"),
];

const COMMON_WRONG_ACTORS = [
  hiEn("आमिर खान", "Aamir Khan"),
  hiEn("सलमान खान", "Salman Khan"),
  hiEn("अजय देवगन", "Ajay Devgn"),
  hiEn("दीपिका पादुकोण", "Deepika Padukone"),
  hiEn("प्रियंका चोपड़ा", "Priyanka Chopra"),
  hiEn("टॉम क्रूज़", "Tom Cruise"),
];

const COMMON_GENRES = [
  hiEn("कॉमेडी", "Comedy"),
  hiEn("रोमांस", "Romance"),
  hiEn("हॉरर", "Horror"),
  hiEn("मिस्ट्री", "Mystery"),
  hiEn("एडवेंचर", "Adventure"),
  hiEn("फैंटेसी", "Fantasy"),
];

const MOVIE_TERMS = [
  { term: hiEn("ट्रेलर", "Trailer"), def: hiEn("फ़िल्म का प्रमोशनल प्रीव्यू", "Promotional preview of a film") },
  { term: hiEn("टीज़र", "Teaser"), def: hiEn("बहुत छोटा हाइप प्रीव्यू", "Very short hype preview") },
  { term: hiEn("सीक्वल", "Sequel"), def: hiEn("कहानी का अगला पार्ट", "Next part of a story") },
  { term: hiEn("प्रीक्वल", "Prequel"), def: hiEn("पहले की कहानी वाला पार्ट", "Part set before the original") },
  { term: hiEn("कैमियो", "Cameo"), def: hiEn("छोटी/स्पेशल उपस्थिति", "Short/special appearance") },
  { term: hiEn("प्लॉट ट्विस्ट", "Plot twist"), def: hiEn("कहानी में अचानक मोड़", "Sudden turn in the story") },
  { term: hiEn("पोस्ट-प्रोडक्शन", "Post-production"), def: hiEn("शूट के बाद एडिट/साउंड/कलर", "Work after shooting: edit/sound/color") },
  { term: hiEn("कलर ग्रेडिंग", "Color grading"), def: hiEn("वीडियो के रंग/टोन फाइनल करना", "Finalizing video colors/tones") },
];

/* ---------------- Question helpers ---------------- */
function uniqueOptions(correct, pool, n = 4) {
  const out = [correct];
  for (const v of shuffle(pool)) {
    if (out.length >= n) break;
    if (!out.includes(v)) out.push(v);
  }
  while (out.length < n) out.push(correct);
  return shuffle(out).slice(0, n);
}

function mcq(topicKey, q, correctOption, wrongPool) {
  const options = uniqueOptions(correctOption, wrongPool, 4);
  const answerIndex = options.indexOf(correctOption);
  return { topicKey, q, options, answerIndex };
}

function buildQuestions(movie) {
  const qs = [];

  qs.push(
    mcq(
      `dir:${movie.en}`,
      hiEn(`फ़िल्म ${movie.hi} के निर्देशक कौन हैं?`, `Who is the director of ${movie.en}?`),
      movie.director,
      COMMON_WRONG_DIRECTORS
    )
  );

  qs.push(
    mcq(
      `lead:${movie.en}`,
      hiEn(`फ़िल्म ${movie.hi} में मुख्य कलाकार कौन हैं?`, `Who is the lead in ${movie.en}?`),
      movie.lead,
      COMMON_WRONG_ACTORS
    )
  );

  qs.push(
    mcq(
      `genre1:${movie.en}`,
      hiEn(`फ़िल्म ${movie.hi} का मुख्य जॉनर क्या है?`, `What is the primary genre of ${movie.en}?`),
      movie.genres[0],
      COMMON_GENRES
    )
  );

  qs.push(
    mcq(
      `genre2:${movie.en}`,
      hiEn(`इनमें से कौन सा जॉनर ${movie.hi} से सबसे ज़्यादा मेल खाता है?`, `Which genre best fits ${movie.en}?`),
      movie.genres[1] || movie.genres[0],
      COMMON_GENRES
    )
  );

  qs.push(
    mcq(
      `industry:${movie.en}`,
      hiEn(`फ़िल्म ${movie.hi} किस इंडस्ट्री से जुड़ी है?`, `Which industry is ${movie.en} associated with?`),
      movie.industry,
      [hiEn("टॉलीवुड", "Tollywood"), hiEn("कोरियन सिनेमा", "Korean cinema"), hiEn("जापानी सिनेमा", "Japanese cinema"), hiEn("यूरोपीय सिनेमा", "European cinema")]
    )
  );

  for (let i = 0; i < 4; i++) {
    const correct = pick(MOVIE_TERMS);
    const wrongTerms = MOVIE_TERMS.filter((t) => t.term !== correct.term).map((t) => t.term);
    qs.push(
      mcq(
        `term:${correct.term}`,
        hiEn(`किस टर्म का मतलब है: ${correct.def}?`, `Which term means: ${correct.def}?`),
        correct.term,
        wrongTerms
      )
    );
  }

  qs.push(
    mcq(
      `craft:screenplay`,
      hiEn("फ़िल्म में डायलॉग/सीन लिखने वाले को क्या कहते हैं?", "Who writes the scenes/dialogue for a film?"),
      hiEn("पटकथा लेखक", "Screenwriter"),
      [hiEn("सिनेमैटोग्राफर", "Cinematographer"), hiEn("एडिटर", "Editor"), hiEn("साउंड डिज़ाइनर", "Sound designer")]
    )
  );

  qs.push(
    mcq(
      `craft:editor`,
      hiEn("फ़िल्म को कट करके फाइनल रूप देने वाला कौन होता है?", "Who assembles cuts into the final film?"),
      hiEn("एडिटर", "Editor"),
      [hiEn("निर्देशक", "Director"), hiEn("प्रोड्यूसर", "Producer"), hiEn("एक्टर", "Actor")]
    )
  );

  return qs;
}

/* ---------------- Titles ---------------- */
const titleTemplates = [
  (m, i) => hiEn(`${m.hi} ट्रेंडिंग क्विज़ #${i}`, `${m.en} Trending Quiz #${i}`),
  (m, i) => hiEn(`${m.hi} धमाकेदार राउंड #${i}`, `${m.en} Power Round #${i}`),
  (m, i) => hiEn(`${m.hi} फैन चैलेंज #${i}`, `${m.en} Fan Challenge #${i}`),
  (m, i) => hiEn(`${m.hi} मूवी मास्टर #${i}`, `${m.en} Movie Master #${i}`),
  (m, i) => hiEn(`${m.hi} क्विक-फायर #${i}`, `${m.en} Quick-Fire #${i}`),
  (m, i) => hiEn(`${m.hi} सुपरहिट स्पेशल #${i}`, `${m.en} Hit Special #${i}`),
];

/* ---------------- Generate ---------------- */
const omitAnswers = CATEGORY === "opinion";

let text = "";
for (let quizIndex = 1; quizIndex <= 96; quizIndex++) {
  const movie = pick(MOVIES);
  const title = pick(titleTemplates)(movie, quizIndex);

  text += `Quiz ${quizIndex}\n`;
  text += `Title: ${title}\n`;

  const allQs = buildQuestions(movie);

  const picked = [];
  const used = new Set();
  for (const q of shuffle(allQs)) {
    if (picked.length >= 10) break;
    const key = q.topicKey || q.q;
    if (used.has(key)) continue;
    used.add(key);
    picked.push(q);
  }

  let guard = 0;
  while (picked.length < 10 && guard++ < 500) {
    const q = pick(allQs);
    const key = q.topicKey || q.q;
    if (used.has(key)) continue;
    used.add(key);
    picked.push(q);
  }

  for (let qn = 0; qn < 10; qn++) {
    const item = picked[qn] || pick(allQs);
    text += `Q${qn + 1}. ${item.q}\n`;
    text += `A) ${item.options[0]}\n`;
    text += `B) ${item.options[1]}\n`;
    text += `C) ${item.options[2]}\n`;
    text += `D) ${item.options[3]}\n`;
    if (!omitAnswers) {
      text += `Answer: ${letters[item.answerIndex]}\n`;
    }
    text += `\n`;
  }

  text += `\n`;
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, text.trimEnd(), "utf8");
console.log(OUT);
