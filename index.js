// ============================================
// Wordly — script.js
// Handles: search/fetch, rendering results,
// theme toggle (dynamic styling), pinned words.
// ============================================

const API_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en/";
const STORAGE_KEY_THEME = "wordly-theme";
const STORAGE_KEY_PINS = "wordly-pinned-words";

// ---------- Category "lanes" (Requirement #3, extended: themed motion per word) ----------
// Since the dictionary API doesn't return a semantic category, we detect one
// ourselves by scanning the word + its definitions for themed keywords.
// Each lane gets its own seal color (light + dark variants) and signature animation.

const LANES = [
  {
    id: "nature",
    label: "Nature",
    glyph: "🌿",
    accent: "#4f7a5e",
    darkAccent: "#7fb894",
    badgeAnim: "badge-sway",
    keywords: ["plant", "tree", "leaf", "leaves", "flower", "forest", "grow", "garden", "root", "branch", "seed", "botan"],
  },
  {
    id: "animal",
    label: "Creature",
    glyph: "🐾",
    accent: "#8a5a3b",
    darkAccent: "#c98a5e",
    badgeAnim: "badge-bounce",
    keywords: ["animal", "creature", "bird", "mammal", "insect", "fish", "dog", "cat", "wild", "species", "beast"],
  },
  {
    id: "water",
    label: "Water",
    glyph: "〰",
    accent: "#3f6a86",
    darkAccent: "#6fa8c9",
    badgeAnim: "badge-ripple",
    keywords: ["water", "sea", "ocean", "river", "liquid", "wave", "rain", "flow", "lake", "stream"],
  },
  {
    id: "fire",
    label: "Fire",
    glyph: "🔥",
    accent: "#8a3324",
    darkAccent: "#d9573c",
    badgeAnim: "badge-flicker",
    keywords: ["fire", "flame", "burn", "heat", "hot", "blaze", "ember", "scorch"],
  },
  {
    id: "sky",
    label: "Sky",
    glyph: "☁",
    accent: "#6c85a3",
    darkAccent: "#9fb8d4",
    badgeAnim: "badge-drift",
    keywords: ["sky", "air", "wind", "cloud", "fly", "breeze", "atmosphere", "flight"],
  },
  {
    id: "night",
    label: "Night",
    glyph: "✦",
    accent: "#3c3566",
    darkAccent: "#8b7fc9",
    badgeAnim: "badge-twinkle",
    keywords: ["night", "dark", "shadow", "moon", "star", "midnight", "dusk"],
  },
  {
    id: "emotion",
    label: "Feeling",
    glyph: "♥",
    accent: "#9a4a63",
    darkAccent: "#d97a95",
    badgeAnim: "badge-pulse",
    keywords: ["feeling", "emotion", "love", "joy", "sad", "anger", "fear", "happy", "grief", "desire"],
  },
  {
    id: "mind",
    label: "Mind",
    glyph: "✳",
    accent: "#6b5b8a",
    darkAccent: "#a89bd4",
    badgeAnim: "badge-float",
    keywords: ["thought", "mind", "idea", "think", "knowledge", "belief", "memory", "reason", "wisdom"],
  },
  {
    id: "money",
    label: "Trade",
    glyph: "◆",
    accent: "#b08d57",
    darkAccent: "#e2c07d",
    badgeAnim: "badge-shimmer",
    keywords: ["money", "wealth", "gold", "coin", "rich", "value", "price", "trade", "fortune", "estate"],
  },
  {
    id: "music",
    label: "Music",
    glyph: "♪",
    accent: "#6a3f66",
    darkAccent: "#a869a3",
    badgeAnim: "badge-bob",
    keywords: ["music", "sound", "song", "rhythm", "melody", "tune", "instrument"],
  },
  {
    id: "motion",
    label: "Motion",
    glyph: "→",
    accent: "#b0752f",
    darkAccent: "#d99a4f",
    badgeAnim: "badge-dash",
    keywords: ["move", "movement", "action", "run", "quick", "motion", "force", "rush", "swift"],
  },
];

// Scores every lane against the word's combined text and returns the best match,
// or null if nothing scores above zero.
function detectLane(entry) {
  const textParts = [entry.word];
  (entry.meanings || []).forEach((meaning) => {
    (meaning.definitions || []).forEach((def) => {
      textParts.push(def.definition || "");
      textParts.push(def.example || "");
    });
  });
  const haystack = textParts.join(" ").toLowerCase();

  let bestLane = null;
  let bestScore = 0;

  LANES.forEach((lane) => {
    let score = 0;
    lane.keywords.forEach((keyword) => {
      if (haystack.includes(keyword)) score += 1;
    });
    if (score > bestScore) {
      bestScore = score;
      bestLane = lane;
    }
  });

  return bestLane;
}

const form = document.getElementById("search-form");
const input = document.getElementById("word-input");
const resultsEl = document.getElementById("results");
const savedWordsEl = document.getElementById("saved-words");
const themeToggle = document.getElementById("theme-toggle");

// ---------- Theme (Requirement #3: dynamically style the page via JS) ----------

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeToggle.setAttribute("aria-pressed", theme === "dark");
  localStorage.setItem(STORAGE_KEY_THEME, theme);
}

function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY_THEME);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (prefersDark ? "dark" : "light"));
}

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
});

// ---------- Pinned / saved words ----------

function getPinnedWords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_PINS)) || [];
  } catch {
    return [];
  }
}

function togglePinnedWord(word) {
  const pins = getPinnedWords();
  const index = pins.indexOf(word);
  if (index === -1) {
    pins.push(word);
  } else {
    pins.splice(index, 1);
  }
  localStorage.setItem(STORAGE_KEY_PINS, JSON.stringify(pins));
  renderPinnedWords();
}

function renderPinnedWords() {
  const pins = getPinnedWords();
  savedWordsEl.innerHTML = "";

  pins.forEach((word) => {
    const li = document.createElement("li");
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "pin-chip";
    chip.textContent = `★ ${word}`;
    chip.setAttribute("aria-label", `Look up pinned word ${word}`);
    chip.addEventListener("click", () => {
      input.value = word;
      lookupWord(word);
    });
    li.appendChild(chip);
    savedWordsEl.appendChild(li);
  });
}

// ---------- Rendering helpers ----------

function showLoading() {
  resultsEl.innerHTML = `
    <div class="loading-card">
      Pulling the card
      <span class="dots"><span>.</span><span>.</span><span>.</span></span>
    </div>
  `;
}

function showNotFound(word) {
  resultsEl.innerHTML = `
    <div class="word-card not-found-card">
      <span class="stamp">Not Found</span>
      <p>No card on file for “${escapeHtml(word)}.” Check the spelling, or try another word.</p>
    </div>
  `;
}

function showNetworkError() {
  resultsEl.innerHTML = `
    <div class="word-card not-found-card">
      <span class="stamp">Drawer Stuck</span>
      <p>Something went wrong reaching the catalog. Please try again in a moment.</p>
    </div>
  `;
}

// Basic escaping so a searched word can never break out into markup
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Finds the first phonetics entry that actually has an audio file
function findAudioUrl(entry) {
  const withAudio = (entry.phonetics || []).find((p) => p.audio);
  return withAudio ? withAudio.audio : null;
}

function findPhoneticText(entry) {
  if (entry.phonetic) return entry.phonetic;
  const withText = (entry.phonetics || []).find((p) => p.text);
  return withText ? withText.text : null;
}

function renderEntry(entry) {
  const word = entry.word;
  const phoneticText = findPhoneticText(entry);
  const audioUrl = findAudioUrl(entry);
  const isPinned = getPinnedWords().includes(word);

  const meaningsHtml = (entry.meanings || [])
    .map((meaning) => renderMeaning(meaning))
    .join("");

  const lane = detectLane(entry);
  const firstPartOfSpeech = entry.meanings?.[0]?.partOfSpeech;
  // The tab always carries real information: the detected category when we
  // have one, otherwise the word's part of speech — never a meaningless count.
  const tabLabel = lane ? lane.label : firstPartOfSpeech || "Entry";

  // Pass BOTH a light and dark accent so CSS can pick the right one based on
  // the current theme (see .word-card / html[data-theme="dark"] .word-card in style.css).
  const cardStyle = lane
    ? ` style="--lane-accent-light: ${lane.accent}; --lane-accent-dark: ${lane.darkAccent};"`
    : "";

  const badgeHtml = lane
    ? `<span class="lane-badge ${lane.badgeAnim}" title="Filed under: ${lane.label}" aria-hidden="true">${lane.glyph}</span>`
    : "";

  // A handful of the lane's glyph drifting quietly across the card. Clipped
  // to the card's own notched shape, so it never spills outside it.
  const driftHtml = lane
    ? [0, 1, 2]
        .map(
          (i) =>
            `<span class="lane-drift lane-drift-${i}" aria-hidden="true">${lane.glyph}</span>`
        )
        .join("")
    : "";

  resultsEl.innerHTML = `
    <article class="word-card"${cardStyle}>
      <span class="grommet" aria-hidden="true"></span>
      <span class="card-tab">${escapeHtml(tabLabel)}</span>
      ${driftHtml}
      ${badgeHtml}

      <div class="card-head">
        <h2 class="card-word">${escapeHtml(word)}</h2>
        ${phoneticText ? `<span class="card-phonetic">${escapeHtml(phoneticText)}</span>` : ""}
        ${
          audioUrl
            ? `<button type="button" class="audio-button" aria-label="Play pronunciation of ${escapeHtml(word)}">🔊</button>`
            : ""
        }
        <button
          type="button"
          class="pin-button"
          aria-pressed="${isPinned}"
          aria-label="${isPinned ? "Unpin" : "Pin"} ${escapeHtml(word)}"
        >${isPinned ? "★" : "☆"}</button>
      </div>

      ${meaningsHtml || `<p class="fallback-note">No definitions were returned for this word.</p>`}
    </article>
  `;

  // Wire up audio playback
  const audioBtn = resultsEl.querySelector(".audio-button");
  if (audioBtn && audioUrl) {
    const audio = new Audio(audioUrl);
    audioBtn.addEventListener("click", () => {
      audio.currentTime = 0;
      audio.play();
      audioBtn.classList.add("playing");
      setTimeout(() => audioBtn.classList.remove("playing"), 700);
    });
  }

  // Wire up pin toggle
  const pinBtn = resultsEl.querySelector(".pin-button");
  pinBtn.addEventListener("click", () => {
    togglePinnedWord(word);
    const nowPinned = getPinnedWords().includes(word);
    pinBtn.setAttribute("aria-pressed", nowPinned);
    pinBtn.textContent = nowPinned ? "★" : "☆";
  });
}

function renderMeaning(meaning) {
  const partOfSpeech = meaning.partOfSpeech || "unlabeled";
  const definitions = meaning.definitions || [];

  const definitionItems = definitions
    .slice(0, 4)
    .map((def) => {
      const example = def.example
        ? `<span class="definition-example">${escapeHtml(def.example)}</span>`
        : "";
      return `<li>${escapeHtml(def.definition)}${example}</li>`;
    })
    .join("");

  // Gather synonyms from the meaning level and its definitions, deduplicated
  const synonymSet = new Set(meaning.synonyms || []);
  definitions.forEach((def) => (def.synonyms || []).forEach((s) => synonymSet.add(s)));
  const synonyms = Array.from(synonymSet).slice(0, 8);

  const synonymsHtml = synonyms.length
    ? `
      <div class="synonym-row">
        <span class="synonym-row-label">Also known as</span>
        ${synonyms.map((s) => `<span class="synonym-tag">${escapeHtml(s)}</span>`).join("")}
      </div>
    `
    : `<p class="fallback-note">No synonyms on file for this sense.</p>`;

  return `
    <div class="meaning-block">
      <p class="part-of-speech">${escapeHtml(partOfSpeech)}</p>
      <ol class="definition-list">${definitionItems}</ol>
      ${synonymsHtml}
    </div>
  `;
}

// ---------- Fetch / lookup ----------

async function lookupWord(rawWord) {
  const word = rawWord.trim().toLowerCase();

  if (!word) {
    resultsEl.innerHTML = `<p class="empty-state">Type a word to file it under.</p>`;
    return;
  }

  showLoading();

  try {
    const response = await fetch(`${API_BASE}${encodeURIComponent(word)}`);

    if (response.status === 404) {
      showNotFound(word);
      return;
    }

    if (!response.ok) {
      showNetworkError();
      return;
    }

    const data = await response.json();
    renderEntry(data[0]);
  } catch (error) {
    // Covers offline / DNS / CORS-style failures
    showNetworkError();
  }
}

// ---------- Event listeners ----------

form.addEventListener("submit", (event) => {
  event.preventDefault();
  lookupWord(input.value);
});

// ---------- Init ----------

initTheme();
renderPinnedWords();