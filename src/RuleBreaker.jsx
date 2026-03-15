import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const MIN_DISPLAY_MS = 300;
const PENALTY_MS     = 500;
const INVERSION_MS   = 2500;
const ADVANCE_MS     = 200;
const MAX_W          = "460px";

// ─────────────────────────────────────────────────────────────────────────────
// Word sets
// ─────────────────────────────────────────────────────────────────────────────
const SILENT_LETTER_WORDS = new Set([
  "KNIGHT","KNIFE","WRAP","GNOME","LAMB","THUMB","CLIMB",
  "GHOST","SWORD","KNOT","WRECK","GNAT","WRIST","KNEEL",
  "KNOCK","DUMB","COMB","NUMB","DEBT","DOUBT","WREN","WRITE","PSALM"
]);

const LIVING_THINGS = new Set([
  "TIGER","FERN","CEDAR","WASP","MOTH","MANTIS","VIPER","COBRA",
  "RAVEN","BISON","FUNGUS","OAK","ROSE","WOLF","SHARK","ELM",
  "MOSS","CROW","DEER","FINCH","MAPLE","OTTER","TROUT",
  "SALMON","BEETLE","SPIDER","TULIP","PINE","HERON","TOAD","ORCHID",
  "LYNX","CRANE","GECKO","CACTUS","NEWT","LARK","BADGER","MOLE",
  "PANDA","FALCON","PENGUIN","TREE","SNAKE","FROG","HAWK","WREN"
]);

// ─────────────────────────────────────────────────────────────────────────────
// Rule checkers
// ─────────────────────────────────────────────────────────────────────────────
const RULE_CHECKERS = {
  "Has more consonants than vowels": w => {
    const v = (w.match(/[AEIOU]/gi) || []).length;
    return (w.length - v) > v;
  },
  "Starts and ends with the same letter": w => {
    const u = w.toUpperCase();
    return u.length > 1 && u[0] === u[u.length - 1];
  },
  "No repeated letters": w => {
    const u = w.toUpperCase();
    return new Set(u).size === u.length;
  },
  "Contains a silent letter": w => SILENT_LETTER_WORDS.has(w.toUpperCase()),
  "All vowels are the same letter": w => {
    const v = w.toUpperCase().match(/[AEIOU]/g);
    if (!v || v.length === 0) return false;
    return new Set(v).size === 1;
  },
  "Is a living thing": w => LIVING_THINGS.has(w.toUpperCase()),
};

const WORD_CATEGORIES = {
  WOLF: "animal", HAWK: "animal", TIGER: "animal", COBRA: "animal", FINCH: "animal",
  HAMMER: "tool", WRENCH: "tool", DRILL: "tool", CHISEL: "tool",
  SCARLET: "color", CRIMSON: "color", AMBER: "color", TEAL: "color", INDIGO: "color",
  MARS: "planet", SATURN: "planet", VENUS: "planet", JUPITER: "planet",
  MANGO: "fruit", PEACH: "fruit", PLUM: "fruit", GRAPE: "fruit",
};

const PAIR_RULE_CHECKERS = {
  "Both words start with the same letter": (l, r) =>
    l.toUpperCase()[0] === r.toUpperCase()[0],
  "Both words belong to the same category": (l, r) => {
    const cl = WORD_CATEGORIES[l.toUpperCase()];
    const cr = WORD_CATEGORIES[r.toUpperCase()];
    return cl !== undefined && cl === cr;
  },
  "Both words are the same length": (l, r) => l.length === r.length,
};

// ─────────────────────────────────────────────────────────────────────────────
// Puzzle data
// ─────────────────────────────────────────────────────────────────────────────
const DAILY = {
  date: "March 13, 2026",
  number: "001",
  rounds: [
    {
      id: 0, label: "ROUND 1", name: "The Switch",
      type: "single", total: 30, inversionPoints: [15],
      rules: ["Has more consonants than vowels", "Starts and ends with the same letter"],
      words: [
        // ── Phase 0 (0–14): Has more consonants than vowels ──
        { word: "DRAFT",   shouldAccept: true  },
        { word: "OCEAN",   shouldAccept: false },
        { word: "BRIDGE",  shouldAccept: true  },
        { word: "AREA",    shouldAccept: false },
        { word: "FRESH",   shouldAccept: true  },
        { word: "AUDIO",   shouldAccept: false },
        { word: "STRONG",  shouldAccept: true  },
        { word: "OPEN",    shouldAccept: false },
        { word: "FROST",   shouldAccept: true  },
        { word: "EAGLE",   shouldAccept: false },
        { word: "CRISP",   shouldAccept: true  },
        { word: "ISSUE",   shouldAccept: false },
        { word: "BLEND",   shouldAccept: true  },
        { word: "SPRINT",  shouldAccept: true  },
        { word: "IDEAL",   shouldAccept: false },
        // ── Phase 1 (15–29): Starts and ends with the same letter ──
        { word: "AERIAL",  shouldAccept: false },
        { word: "KAYAK",   shouldAccept: true  },
        { word: "TABLE",   shouldAccept: false },
        { word: "CIVIC",   shouldAccept: true  },
        { word: "MAGIC",   shouldAccept: false },
        { word: "RADAR",   shouldAccept: true  },
        { word: "BROWN",   shouldAccept: false },
        { word: "LEVEL",   shouldAccept: true  },
        { word: "PHONE",   shouldAccept: false },
        { word: "ENTICE",  shouldAccept: true  },
        { word: "STORM",   shouldAccept: false },
        { word: "TENET",   shouldAccept: true  },
        { word: "PULP",    shouldAccept: true  },
        { word: "TREAT",   shouldAccept: true  },
        { word: "DRAWN",   shouldAccept: false },
      ]
    },
    {
      id: 1, label: "ROUND 2", name: "Pairs",
      type: "pairs", total: 30, inversionPoints: [10, 20],
      rules: [
        "Both words start with the same letter",
        "Both words belong to the same category",
        "Both words are the same length",
      ],
      pairs: [
        // ── Phase 0 (0–9): Both words start with the same letter ──
        { left: "SILVER",  right: "STORM",   shouldAccept: true  }, // S / S
        { left: "PLANET",  right: "PURPLE",  shouldAccept: true  }, // P / P
        { left: "FLAME",   right: "FROST",   shouldAccept: true  }, // F / F
        { left: "BRIDGE",  right: "BLANK",   shouldAccept: true  }, // B / B
        { left: "CRANE",   right: "CLOCK",   shouldAccept: true  }, // C / C
        { left: "TIGER",   right: "RIVER",   shouldAccept: false }, // T / R
        { left: "CLOUD",   right: "MARBLE",  shouldAccept: false }, // C / M
        { left: "GRAVE",   right: "TOWER",   shouldAccept: false }, // G / T
        { left: "SHARP",   right: "LEMON",   shouldAccept: false }, // S / L
        { left: "BRICK",   right: "OCEAN",   shouldAccept: false }, // B / O
        // ── Phase 1 (10–19): Both words belong to the same category ──
        { left: "WOLF",    right: "HAWK",    shouldAccept: true  }, // animal / animal
        { left: "HAMMER",  right: "WRENCH",  shouldAccept: true  }, // tool   / tool
        { left: "SCARLET", right: "CRIMSON", shouldAccept: true  }, // color  / color
        { left: "MARS",    right: "SATURN",  shouldAccept: true  }, // planet / planet
        { left: "MANGO",   right: "PEACH",   shouldAccept: true  }, // fruit  / fruit
        { left: "COBRA",   right: "DRILL",   shouldAccept: false }, // animal / tool
        { left: "INDIGO",  right: "WOLF",    shouldAccept: false }, // color  / animal
        { left: "VENUS",   right: "GRAPE",   shouldAccept: false }, // planet / fruit
        { left: "CHISEL",  right: "AMBER",   shouldAccept: false }, // tool   / color
        { left: "FINCH",   right: "JUPITER", shouldAccept: false }, // animal / planet
        // ── Phase 2 (20–29): Both words are the same length ──
        { left: "FROST",   right: "CRANE",   shouldAccept: true  }, // 5 / 5
        { left: "SILVER",  right: "BRIDGE",  shouldAccept: true  }, // 6 / 6
        { left: "MARBLE",  right: "PLANET",  shouldAccept: true  }, // 6 / 6
        { left: "STORM",   right: "BLANK",   shouldAccept: true  }, // 5 / 5
        { left: "SHARP",   right: "LEMON",   shouldAccept: true  }, // 5 / 5
        { left: "CROW",    right: "LEMON",   shouldAccept: false }, // 4 / 5
        { left: "PLUM",    right: "MARBLE",  shouldAccept: false }, // 4 / 6
        { left: "HAMMER",  right: "STORM",   shouldAccept: false }, // 6 / 5
        { left: "OCEAN",   right: "SILVER",  shouldAccept: false }, // 5 / 6
        { left: "WOLF",    right: "CRANE",   shouldAccept: false }, // 4 / 5
      ]
    },
    {
      id: 2, label: "ROUND 3", name: "Rule Breaker",
      type: "mixed", total: 40, inversionPoints: [10, 20, 30],
      rules: [
        "No repeated letters",
        "Contains a silent letter",
        "All vowels are the same letter",
        "Starts and ends with the same letter"
      ],
      items: [
        { format: "single", word: "BRANCH",                        shouldAccept: true  },
        { format: "single", word: "MAMMOTH",                       shouldAccept: false },
        { format: "pair",   left: "WORLD",   right: "STEAM",       shouldAccept: true  },
        { format: "single", word: "PEPPER",                        shouldAccept: false },
        { format: "pair",   left: "PLIGHT",  right: "COFFEE",      shouldAccept: false },
        { format: "single", word: "CLOVER",                        shouldAccept: true  },
        { format: "pair",   left: "RACECAR", right: "SLAY",        shouldAccept: false },
        { format: "single", word: "SPHINX",                        shouldAccept: true  },
        { format: "pair",   left: "FROST",   right: "BLAND",       shouldAccept: true  },
        { format: "single", word: "BALLOT",                        shouldAccept: false },
        { format: "single", word: "KNIGHT",                        shouldAccept: true  },
        { format: "single", word: "STONE",                         shouldAccept: false },
        { format: "pair",   left: "KNIFE",   right: "WRAP",        shouldAccept: true  },
        { format: "pair",   left: "TOWER",   right: "GNOME",       shouldAccept: false },
        { format: "single", word: "LAMB",                          shouldAccept: true  },
        { format: "single", word: "CRISP",                         shouldAccept: false },
        { format: "pair",   left: "GHOST",   right: "THUMB",       shouldAccept: true  },
        { format: "single", word: "WRIST",                         shouldAccept: true  },
        { format: "pair",   left: "BRAND",   right: "CLIMB",       shouldAccept: false },
        { format: "single", word: "DOUBT",                         shouldAccept: true  },
        { format: "single", word: "ROBOT",                         shouldAccept: true  },
        { format: "single", word: "PROBLEM",                       shouldAccept: false },
        { format: "pair",   left: "COTTON",  right: "COMMON",      shouldAccept: true  },
        { format: "pair",   left: "FOSSIL",  right: "TENNIS",      shouldAccept: false },
        { format: "single", word: "VIVID",                         shouldAccept: true  },
        { format: "single", word: "CONTENT",                       shouldAccept: false },
        { format: "pair",   left: "SENSES",  right: "PREFER",      shouldAccept: true  },
        { format: "single", word: "BLOSSOM",                       shouldAccept: true  },
        { format: "pair",   left: "MINIMUM", right: "DIVIDE",      shouldAccept: false },
        { format: "single", word: "BONBON",                        shouldAccept: true  },
        { format: "single", word: "KAYAK",                         shouldAccept: true  },
        { format: "single", word: "TABLE",                         shouldAccept: false },
        { format: "pair",   left: "CIVIC",   right: "RADAR",       shouldAccept: true  },
        { format: "pair",   left: "MAGIC",   right: "LEVEL",       shouldAccept: false },
        { format: "single", word: "ROTOR",                         shouldAccept: true  },
        { format: "single", word: "CLOUD",                         shouldAccept: false },
        { format: "pair",   left: "TENET",   right: "NOON",        shouldAccept: true  },
        { format: "single", word: "STORM",                         shouldAccept: false },
        { format: "pair",   left: "SWIMS",   right: "ENTICE",      shouldAccept: true  },
        { format: "single", word: "PHONE",                         shouldAccept: false },
      ]
    }
  ]
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function getItem(rd, i) {
  if (rd.type === "single") return rd.words[i];
  if (rd.type === "pairs")  return rd.pairs[i];
  return rd.items[i];
}

function getItemFormat(rd, item) {
  if (rd.type === "single") return "single";
  if (rd.type === "pairs")  return "pair";
  return item?.format ?? "single";
}

function formatTime(ms) {
  if (!ms || ms <= 0) return "0.0s";
  if (ms < 60000) return (ms / 1000).toFixed(1) + "s";
  const m = Math.floor(ms / 60000);
  const s = ((ms % 60000) / 1000).toFixed(1).padStart(4, "0");
  return `${m}:${s}`;
}

function getGrade(correct, total) {
  const p = correct / total;
  if (p === 1)   return "PERFECT";
  if (p >= 0.8)  return "SHARP";
  if (p >= 0.6)  return "SOLID";
  if (p >= 0.4)  return "LEARNING";
  return "MISSED IT";
}

function getOverallGrade(correct, total) {
  const p = correct / total;
  if (p === 1)   return "FLAWLESS";
  if (p >= 0.85) return "SHARP";
  if (p >= 0.65) return "SOLID";
  if (p >= 0.45) return "LEARNING";
  return "ROUGH DAY";
}

function wordFontSize(word, isPair) {
  const l = (word || "").length;
  if (isPair) {
    if (l <= 3) return "clamp(36px, 8vw, 52px)";
    if (l <= 4) return "clamp(30px, 7vw, 44px)";
    if (l <= 5) return "clamp(26px, 6vw, 38px)";
    if (l <= 6) return "clamp(22px, 5vw, 30px)";
    if (l <= 7) return "clamp(18px, 4vw, 24px)";
    if (l <= 8) return "clamp(15px, 3.5vw, 20px)";
    return "clamp(12px, 2.8vw, 16px)";
  }
  if (l <= 4)  return "clamp(56px, 12vw, 88px)";
  if (l <= 6)  return "clamp(44px, 9vw, 70px)";
  if (l <= 8)  return "clamp(34px, 7vw, 56px)";
  if (l <= 10) return "clamp(26px, 5.5vw, 42px)";
  return "clamp(20px, 4vw, 32px)";
}

// ─────────────────────────────────────────────────────────────────────────────
// Daily rotation
// Everyone gets the same puzzle each UTC day. Day number is days elapsed
// since the launch date (March 13 2026 = Day 001). The day number seeds a
// deterministic RNG (mulberry32) so the shuffle is identical for every player
// on the same UTC day, and different every day automatically.
// ─────────────────────────────────────────────────────────────────────────────
const LAUNCH_DATE_UTC = Date.UTC(2026, 2, 13); // March 13 2026, months are 0-indexed

function getUtcDayNumber() {
  const now = Date.now();
  return Math.floor((now - LAUNCH_DATE_UTC) / 86400000) + 1;
}

function getUtcDateString() {
  const d = new Date();
  return d.toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric", month: "long", day: "numeric",
  });
}

// mulberry32 — fast, deterministic seeded RNG.
// Returns a function that produces the next pseudo-random float [0, 1).
function makePrng(seed) {
  let s = seed >>> 0;
  return function() {
    s += 0x6D2B79F5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Seeded Fisher-Yates — uses the shared prng instead of Math.random().
function seededShuffle(arr, prng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffleRoundItems(rd, prng) {
  // Shuffle each phase segment independently so items never cross a rule boundary.
  const arr = rd.type === "single" ? rd.words
            : rd.type === "pairs"  ? rd.pairs
            : rd.items;

  const boundaries = [...rd.inversionPoints, arr.length];
  let start = 0;
  const shuffled = [];
  for (const end of boundaries) {
    shuffled.push(...seededShuffle(arr.slice(start, end), prng));
    start = end;
  }

  if (rd.type === "single") return { ...rd, words: shuffled };
  if (rd.type === "pairs")  return { ...rd, pairs: shuffled };
  return { ...rd, items: shuffled };
}

// ─────────────────────────────────────────────────────────────────────────────
// Daily puzzle loader
// Fetches today's puzzle from /puzzles.json by UTC day number.
// Falls back to day 1 if today's puzzle isn't in the file yet.
// The seeded shuffle runs client-side so every player gets the same order.
// ─────────────────────────────────────────────────────────────────────────────
async function loadDailyPuzzle() {
  const dayNumber = getUtcDayNumber();
  const res       = await fetch("/puzzles.json");
  const all       = await res.json();
  const raw       = all[dayNumber] ?? all[1];
  const prng      = makePrng(dayNumber);
  return {
    ...raw,
    rounds: raw.rounds.map(rd => shuffleRoundItems(rd, prng)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Global styles
// FIX 1: Moved into Shell so these rules are always present in the DOM.
// Previously only injected inside IntroScreen — body color/background were
// lost the moment IntroScreen unmounted, causing black text on all screens.
// ─────────────────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Konkhmer+Sleokchher&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  html, body, #root { height: 100%; background: #111111; color: #FFFFFF; }
  body { font-family: 'Konkhmer Sleokchher', sans-serif; overflow: hidden; }
  button { cursor: pointer; border: none; font-family: 'Konkhmer Sleokchher', sans-serif; }

  @keyframes flashGreen { 0%,100%{background:#111111} 50%{background:rgba(46,204,113,0.18)} }
  @keyframes flashRed   { 0%,100%{background:#111111} 50%{background:rgba(255,64,96,0.18)} }
  @keyframes wordIn     { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
  @keyframes pulse      { 0%,100%{opacity:1} 50%{opacity:0.35} }

  .rb-backdrop {
    width: 100%; height: 100dvh;
    background: #111111;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }

  .rb-card {
    width: 100%; height: 100%;
    background: #111111; color: #FFFFFF;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 24px 20px;
    position: relative; overflow: hidden;
  }

  .rb-skip {
    position: absolute; top: 16px; right: 16px;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.2); border-radius: 4px;
    color: rgba(255,255,255,0.35);
    font-family: 'Konkhmer Sleokchher', sans-serif;
    font-size: 11px; padding: 6px 12px; letter-spacing: 0.06em;
    cursor: pointer; z-index: 10;
  }

  @media (min-width: 768px) {
    html, body, #root { overflow: hidden; }

    .rb-backdrop {
      background: #0C0C0C;
      background-image: radial-gradient(circle, rgba(255,255,255,0.15) 1.5px, transparent 1.5px);
      background-size: 24px 24px;
    }

    .rb-card {
      width: 400px;
      height: min(820px, 92dvh);
      border: 1px solid rgba(255,255,255,0.13);
      border-radius: 16px;
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: none;
    }
    .rb-card::-webkit-scrollbar { display: none; }

    .rb-skip { top: 14px; right: 14px; }

    /* Title capped so BREAKER! never overflows the 400px card */
    .rb-title { font-size: 72px !important; }
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI
// ─────────────────────────────────────────────────────────────────────────────
function Shell({ children, flash, onSkip }) {
  const anim = flash === "green" ? "flashGreen 0.45s ease"
             : flash === "red"   ? "flashRed 0.45s ease"
             : "none";
  return (
    <div className="rb-backdrop">
      <style>{STYLES}</style>
      <div className="rb-card" style={{ animation: anim }}>
        {onSkip && (
          <button className="rb-skip" onClick={onSkip}>SKIP →</button>
        )}
        {children}
      </div>
    </div>
  );
}

function RoundLabel({ label, name, large }) {
  const size = large ? "clamp(22px,5vw,32px)" : "clamp(14px,2vw,18px)";
  return (
    <div style={{ textAlign: "center", marginBottom: "4px" }}>
      <span style={{ fontFamily: "'Konkhmer Sleokchher',sans-serif", fontWeight: 700, fontSize: size, color: "#FFFFFF", letterSpacing: "0.05em" }}>
        {label}:{" "}
      </span>
      <span style={{ fontFamily: "'Konkhmer Sleokchher',sans-serif", fontWeight: 700, fontSize: size, color: "#FF4060" }}>
        {name}
      </span>
    </div>
  );
}

function RuleBox({ rule }) {
  return (
    <div style={{
      width: "100%", maxWidth: MAX_W, border: "2px solid #FFFFFF",
      borderRadius: "4px", padding: "clamp(20px,4vw,32px) clamp(16px,3vw,28px)",
      textAlign: "center", background: "#111111",
    }}>
      <span style={{ fontFamily: "'Konkhmer Sleokchher',sans-serif", fontWeight: 500, fontSize: "clamp(16px,2.5vw,24px)", color: "#FFFFFF", lineHeight: 1.4, display: "block" }}>
        {rule}
      </span>
    </div>
  );
}

function WordBox({ children, style }) {
  return (
    <div style={{
      width: "100%", maxWidth: MAX_W, border: "2px solid #FFFFFF",
      borderRadius: "4px", display: "flex", alignItems: "center",
      justifyContent: "center", minHeight: "clamp(110px,18vw,160px)",
      background: "#111111", ...style,
    }}>
      {children}
    </div>
  );
}

function ActionButtons({ onRuleBreak, onAccept, disabled }) {
  return (
    <div style={{ display: "flex", gap: "12px", width: "100%", maxWidth: MAX_W }}>
      <button onClick={onRuleBreak} disabled={disabled} style={{
        flex: 1, padding: "clamp(14px,2.5vw,20px) 8px",
        background: "transparent", border: "2px solid #FF4060", borderRadius: "4px",
        color: "#FF4060", fontFamily: "'Konkhmer Sleokchher',sans-serif", fontWeight: 700,
        fontSize: "clamp(12px,1.8vw,16px)", letterSpacing: "0.04em",
        opacity: disabled ? 0.45 : 1, transition: "opacity 0.15s",
      }}>
        RULE BREAK!
      </button>
      <button onClick={onAccept} disabled={disabled} style={{
        flex: 1, padding: "clamp(14px,2.5vw,20px) 8px",
        background: "transparent", border: "2px solid #2ECC71", borderRadius: "4px",
        color: "#2ECC71", fontFamily: "'Konkhmer Sleokchher',sans-serif", fontWeight: 700,
        fontSize: "clamp(12px,1.8vw,16px)", letterSpacing: "0.04em",
        opacity: disabled ? 0.45 : 1, transition: "opacity 0.15s",
      }}>
        ACCEPT
      </button>
    </div>
  );
}

// FIX 3: noTransition prop. The rule-switch bar is driven by RAF.
// Without noTransition, the CSS transition interpolates from the previous
// bar value (e.g. 1.0) down to 0 when switchPct resets, appearing to go
// backward. With noTransition, the bar is always exactly where RAF put it.
function ProgressBar({ value, color = "#FFFFFF", noTransition = false }) {
  return (
    <div style={{ width: "100%", maxWidth: MAX_W, height: "3px", background: "rgba(255,255,255,0.12)", borderRadius: "2px", overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${Math.min(value, 1) * 100}%`,
        background: color, borderRadius: "2px",
        transition: noTransition ? "none" : "width 0.15s ease",
      }} />
    </div>
  );
}

function PlayButton({ onClick, label = "PLAY" }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", maxWidth: MAX_W, padding: "clamp(16px,2.5vw,22px)",
      background: "#FF4060", border: "none", borderRadius: "4px",
      color: "#FFFFFF", fontFamily: "'Konkhmer Sleokchher',sans-serif", fontWeight: 700,
      fontSize: "clamp(13px,1.8vw,17px)", letterSpacing: "0.1em",
    }}>
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Intro screen
// ─────────────────────────────────────────────────────────────────────────────
function IntroScreen({ onPlay, puzzle }) {
  return (
    <Shell>
      <div style={{ width: "100%", maxWidth: MAX_W, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", paddingTop: "8px", paddingBottom: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "clamp(11px,1.4vw,14px)", color: "#FFFFFF", fontWeight: 500, letterSpacing: "0.02em" }}>
          <span>{puzzle.date}</span>
          <span>DAILY #{puzzle.number}</span>
        </div>

        <div style={{ textAlign: "center" }}>
          <div className="rb-title" style={{ fontFamily: "'Konkhmer Sleokchher',sans-serif", fontSize: "clamp(52px,12vw,96px)", lineHeight: 0.95, color: "#FFFFFF", letterSpacing: "0.01em" }}>RULE</div>
          <div className="rb-title" style={{ fontFamily: "'Konkhmer Sleokchher',sans-serif", fontSize: "clamp(52px,12vw,96px)", lineHeight: 0.95, color: "#FF4060", letterSpacing: "0.01em" }}>BREAKER!</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(10px,2vw,16px)", textAlign: "center" }}>
          <p style={{ fontSize: "clamp(14px,2vw,18px)", fontWeight: 500, lineHeight: 1.5, color: "#FFFFFF" }}>A rule appears. Words follow.</p>
          <p style={{ fontSize: "clamp(14px,2vw,18px)", fontWeight: 500, lineHeight: 1.5, color: "#FFFFFF" }}>
            Do they fit? <span style={{ color: "#2ECC71", fontWeight: 700 }}>ACCEPT</span>. Don't? <span style={{ color: "#FF4060", fontWeight: 700 }}>RULE BREAK!</span>
          </p>
        </div>

        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "clamp(14px,2vw,18px)", fontWeight: 700, marginBottom: "6px", color: "#FFFFFF" }}>Three rounds. Clock is running.</p>
          <p style={{ fontSize: "clamp(13px,1.6vw,16px)", color: "#888888", fontWeight: 400 }}>New puzzle every day.</p>
        </div>

        <PlayButton onClick={onPlay} label="PLAY" />
      </div>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Round intro screen
// ─────────────────────────────────────────────────────────────────────────────
function RoundIntroScreen({ rd, onReady, onSkip }) {
  const pStyle = { fontSize: "clamp(14px,2vw,18px)", fontWeight: 500, lineHeight: 1.5, color: "#FFFFFF", textAlign: "center" };

  return (
    <Shell onSkip={onSkip}>
      <div style={{ width: "100%", maxWidth: MAX_W, display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", paddingTop: "8px", paddingBottom: "8px" }}>
        <div />
        <div style={{ textAlign: "center" }}>
          <RoundLabel label={rd.label} name={rd.name} large />
          <div style={{ height: "clamp(24px,4vw,48px)" }} />

          {rd.id === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "clamp(10px,1.8vw,16px)" }}>
              <p style={pStyle}>You'll see <span style={{ fontWeight: 700 }}>30 words</span>, one at a time.</p>
              <p style={pStyle}>
                If the word satisfies the rule, <span style={{ color: "#2ECC71", fontWeight: 700 }}>ACCEPT</span>.<br />
                If it doesn't, <span style={{ color: "#FF4060", fontWeight: 700 }}>RULE BREAK!</span>
              </p>
              <p style={{ ...pStyle, color: "#FF4060", fontWeight: 700 }}>The rule will switch once. Adapt fast.</p>
            </div>
          )}

          {rd.id === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "clamp(10px,1.8vw,16px)" }}>
              <p style={pStyle}>Two words will appear side by side.</p>
              <p style={pStyle}><span style={{ color: "#2ECC71", fontWeight: 700 }}>ACCEPT</span> if both satisfy the rule.<br /><span style={{ color: "#FF4060", fontWeight: 700 }}>RULE BREAK!</span> if they don't.</p>
              <p style={pStyle}>You'll see <span style={{ fontWeight: 700 }}>30 pairs</span> across <span style={{ color: "#FF4060", fontWeight: 700 }}>3 rules</span>.</p>
              <p style={{ ...pStyle, color: "#FF4060" }}>The rule switches twice. Stay sharp.</p>
            </div>
          )}

          {rd.id === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "clamp(10px,1.8vw,16px)" }}>
              <p style={pStyle}><span style={{ fontWeight: 700 }}>40 items.</span> Singles and pairs, mixed together.</p>
              <p style={pStyle}><span style={{ color: "#FF4060", fontWeight: 700 }}>3 rule switches.</span> Adapt or fall behind.</p>
              <p style={{ ...pStyle, color: "#2ECC71", fontWeight: 700 }}>Good luck.</p>
            </div>
          )}
        </div>

        <PlayButton onClick={onReady} label="READY" />
      </div>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule reveal screen (countdown)
// ─────────────────────────────────────────────────────────────────────────────
function RuleScreen({ rd, rule, countdown, onSkip }) {
  return (
    <Shell onSkip={onSkip}>
      <div style={{ width: "100%", maxWidth: MAX_W, display: "flex", flexDirection: "column", alignItems: "center", gap: "clamp(16px,3vw,28px)" }}>
        <RoundLabel label={rd.label} name={rd.name} />
        <div style={{ height: "clamp(8px,2vw,20px)" }} />
        <p style={{ fontSize: "clamp(11px,1.4vw,14px)", color: "#888888", fontWeight: 500, letterSpacing: "0.12em", alignSelf: "center" }}>
          TODAY'S RULE:
        </p>
        <div style={{ width: "100%" }}>
          <RuleBox rule={rule} />
        </div>
        <p style={{ alignSelf: "center", fontSize: "clamp(13px,1.8vw,17px)", color: "#FF4060", fontWeight: 700, letterSpacing: "0.08em", animation: "pulse 1s ease infinite" }}>
          STARTING IN {countdown}…
        </p>
      </div>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule switch overlay
// ─────────────────────────────────────────────────────────────────────────────
function RuleSwitchScreen({ newRule, progress, onSkip }) {
  return (
    <Shell onSkip={onSkip}>
      <div style={{ width: "100%", maxWidth: MAX_W, display: "flex", flexDirection: "column", alignItems: "center", gap: "clamp(16px,3vw,28px)" }}>
        <p style={{ fontSize: "clamp(14px,2vw,18px)", color: "#FF4060", fontWeight: 700, letterSpacing: "0.1em" }}>
          RULE CHANGE:
        </p>
        <RuleBox rule={newRule} />
        <div style={{ width: "100%", marginTop: "4px" }}>
          <ProgressBar value={progress} color="#2ECC71" noTransition />
        </div>
      </div>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Game screen
// FIX 2: No more early return for null displayItem.
// Previously a different collapsed layout was returned when displayItem=null,
// causing a layout reflow (and visible jump) on every single word transition.
// Now the full layout is always rendered. The word area uses opacity:0 during
// the brief blank frame between words, keeping layout stable. wordKey on each
// word span re-triggers the CSS wordIn animation for a clean fade-in.
// ─────────────────────────────────────────────────────────────────────────────
function GameScreen({ rd, rule, displayItem, wordKey, active, flash, progress, onAnswer, onSkip }) {
  const fmt    = displayItem ? getItemFormat(rd, displayItem) : "single";
  const isPair = fmt === "pair";

  return (
    <Shell flash={flash} onSkip={onSkip}>
      <div style={{ width: "100%", maxWidth: MAX_W, display: "flex", flexDirection: "column", alignItems: "center", gap: "clamp(12px,2vw,18px)" }}>

        <RoundLabel label={rd.label} name={rd.name} />
        <ProgressBar value={progress} />

        <p style={{ fontSize: "clamp(12px,1.6vw,16px)", color: "#FF4060", fontWeight: 500, lineHeight: 1.4, minHeight: "1.4em", textAlign: "center" }}>
          {rule}
        </p>

        {/* Word area — margin adds breathing room above/below the box */}
        <div style={{ width: "100%", opacity: displayItem ? 1 : 0, transition: displayItem ? "opacity 0.06s ease" : "none", margin: "clamp(8px,2vw,20px) 0" }}>
          {!isPair ? (
            <WordBox>
              <span key={wordKey} style={{ fontFamily: "'Konkhmer Sleokchher',sans-serif", fontSize: wordFontSize(displayItem?.word ?? "", false), color: "#FFFFFF", letterSpacing: "0.02em", animation: "wordIn 0.12s ease forwards", display: "block" }}>
                {displayItem?.word ?? ""}
              </span>
            </WordBox>
          ) : (
            /* Single box, vertical white divider down the centre — matches mockup */
            <div style={{
              width: "100%", maxWidth: MAX_W,
              border: "2px solid #FFFFFF", borderRadius: "4px",
              display: "flex", alignItems: "stretch",
              minHeight: "clamp(110px,18vw,160px)", background: "#111111",
            }}>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 10px" }}>
                <span key={wordKey + "L"} style={{ fontFamily: "'Konkhmer Sleokchher',sans-serif", fontSize: wordFontSize(displayItem?.left ?? "", true), color: "#FFFFFF", letterSpacing: "0.02em", animation: "wordIn 0.12s ease forwards", display: "block", textAlign: "center", whiteSpace: "nowrap" }}>
                  {displayItem?.left ?? ""}
                </span>
              </div>
              <div style={{ width: "2px", background: "#FFFFFF", flexShrink: 0 }} />
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 10px" }}>
                <span key={wordKey + "R"} style={{ fontFamily: "'Konkhmer Sleokchher',sans-serif", fontSize: wordFontSize(displayItem?.right ?? "", true), color: "#FFFFFF", letterSpacing: "0.02em", animation: "wordIn 0.12s ease forwards", display: "block", textAlign: "center", whiteSpace: "nowrap" }}>
                  {displayItem?.right ?? ""}
                </span>
              </div>
            </div>
          )}
        </div>

        <ActionButtons disabled={!active} onRuleBreak={() => onAnswer(false)} onAccept={() => onAnswer(true)} />
      </div>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Results screen
// ─────────────────────────────────────────────────────────────────────────────
function ResultsScreen({ allResults, times, puzzle }) {
  const [copied, setCopied] = useState(false);
  const [review, setReview] = useState(null);

  const totalCorrect = allResults.flat().filter(x => x.correct).length;
  const totalItems   = puzzle.rounds.reduce((a, r) => a + r.total, 0);
  const totalTime    = times.reduce((a, b) => a + b, 0);
  const overallGrade = getOverallGrade(totalCorrect, totalItems);

  function buildShare() {
    const lines = [`RULE BREAKER! #${puzzle.number}`, ""];
    puzzle.rounds.forEach((r, i) => {
      const res     = allResults[i] || [];
      const correct = res.filter(x => x.correct).length;
      const dots    = res.map(x => x.correct ? "🟢" : "🔴").join("");
      lines.push(`${r.label}: ${r.name}`);
      lines.push(dots);
      lines.push(`${formatTime(times[i])} · ${correct}/${r.total} · ${getGrade(correct, r.total)}`);
      lines.push("");
    });
    lines.push(`Total: ${formatTime(totalTime)}`);
    lines.push("https://rule-breaker-three.vercel.app/");
    return lines.join("\n");
  }

  function handleShare() {
    navigator.clipboard.writeText(buildShare())
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => {});
  }

  return (
    <Shell>
      <div style={{ width: "100%", maxWidth: MAX_W, display: "flex", flexDirection: "column", height: "100%", paddingTop: "8px", paddingBottom: "8px", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "clamp(11px,1.4vw,14px)", color: "#FFFFFF", fontWeight: 500, marginBottom: "clamp(14px,2.5vw,24px)" }}>
            <span>{puzzle.date}</span>
            <span>DAILY #{puzzle.number}</span>
          </div>
          <div style={{ fontFamily: "'Konkhmer Sleokchher',sans-serif", fontSize: "clamp(36px,8vw,60px)", color: "#FFFFFF", lineHeight: 1 }}>
            {overallGrade}
          </div>
          <p style={{ fontSize: "clamp(12px,1.6vw,15px)", color: "#888888", marginTop: "6px" }}>
            {totalCorrect}/{totalItems} correct · {formatTime(totalTime)}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {puzzle.rounds.map((r, i) => {
            const res     = allResults[i] || [];
            const correct = res.filter(x => x.correct).length;
            const grade   = getGrade(correct, r.total);
            const dots    = res.map(x => x.correct ? "🟢" : "🔴").join("");
            return (
              <button key={i} onClick={() => setReview(i)} style={{ width: "100%", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", padding: "14px 16px", textAlign: "left", cursor: "pointer", color: "#FFFFFF" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontWeight: 700, fontSize: "clamp(12px,1.6vw,15px)", color: "#FFFFFF" }}>
                    {r.label}: <span style={{ color: "#FF4060" }}>{r.name}</span>
                  </span>
                  <span style={{ fontWeight: 700, fontSize: "clamp(12px,1.6vw,15px)", color: "#FFFFFF" }}>{grade}</span>
                </div>
                <div style={{ fontSize: "clamp(10px,1.4vw,13px)", color: "#888888", marginBottom: "6px" }}>
                  {correct}/{r.total} · {formatTime(times[i])}
                </div>
                <div style={{ fontSize: "11px", lineHeight: 1.6, wordBreak: "break-all" }}>
                  {dots}
                </div>
              </button>
            );
          })}
        </div>

        <PlayButton onClick={handleShare} label={copied ? "COPIED!" : "SHARE RESULTS"} />
      </div>

      {review !== null && (
        <ReviewModal roundIdx={review} results={allResults[review] || []} onClose={() => setReview(null)} puzzle={puzzle} />
      )}
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Review modal
// ─────────────────────────────────────────────────────────────────────────────
function ReviewModal({ roundIdx, results, onClose, puzzle }) {
  const rd = puzzle.rounds[roundIdx];
  let currentPhase = 0;

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.94)", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 100, overflowY: "auto", padding: "24px 20px", color: "#FFFFFF" }}>
      <div style={{ width: "100%", maxWidth: MAX_W }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <span style={{ fontWeight: 700, fontSize: "clamp(14px,2vw,17px)", color: "#FFFFFF" }}>
            {rd.label}: <span style={{ color: "#FF4060" }}>{rd.name}</span>
          </span>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "4px", color: "#FFFFFF", padding: "8px 16px", fontSize: "13px", fontWeight: 600 }}>
            CLOSE
          </button>
        </div>

        <div style={{ textAlign: "center", padding: "8px 0 12px", color: "#888888", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "4px" }}>
          RULE: {rd.rules[0]}
        </div>

        {results.map((r, i) => {
          const item = r.item;
          const inv  = rd.inversionPoints.includes(i);
          if (inv) currentPhase++;
          const fmt  = getItemFormat(rd, item);
          const wordDisplay = fmt === "pair" ? `${item.left} · ${item.right}` : item.word;

          return (
            <div key={i}>
              {inv && (
                <div style={{ textAlign: "center", padding: "10px 0", color: "#FF4060", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", borderTop: "1px solid rgba(255,64,96,0.25)", borderBottom: "1px solid rgba(255,64,96,0.25)", margin: "8px 0" }}>
                  RULE CHANGE: {rd.rules[currentPhase]}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize: "14px", flexShrink: 0 }}>{r.correct ? "🟢" : "🔴"}</span>
                <span style={{ fontFamily: "'Konkhmer Sleokchher',sans-serif", fontSize: fmt === "pair" ? "clamp(13px,1.8vw,16px)" : "clamp(16px,2.2vw,20px)", color: r.correct ? "#FFFFFF" : "rgba(255,255,255,0.35)", flex: 1 }}>
                  {wordDisplay}
                </span>
                <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em", flexShrink: 0, color: item.shouldAccept ? "#2ECC71" : "#FF4060" }}>
                  {item.shouldAccept ? "ACCEPT" : "RULE BREAK"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function RuleBreaker() {
  const [PUZZLE,      setPUZZLE]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [screen,      setScreen]      = useState("intro");
  const [round,       setRound]       = useState(0);
  const [idx,         setIdx]         = useState(0);
  const [phase,       setPhase]       = useState(0);
  const [displayItem, setDisplayItem] = useState(null);
  const [wordKey,     setWordKey]     = useState(0);
  const [flash,       setFlash]       = useState(null);
  const [active,      setActive]      = useState(false);
  const [countdown,   setCountdown]   = useState(3);
  const [switchPct,   setSwitchPct]   = useState(0);
  const [allResults,  setAllResults]  = useState([[], [], []]);
  const [times,       setTimes]       = useState([0, 0, 0]);

  const startRef = useRef(null);
  const animRef  = useRef(null);

  // Fetch today's puzzle on mount
  useEffect(() => {
    loadDailyPuzzle()
      .then(puzzle => { setPUZZLE(puzzle); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const rd   = PUZZLE ? (PUZZLE.rounds[round] ?? PUZZLE.rounds[0]) : null;
  const rule = rd ? (rd.rules[phase] ?? rd.rules[0]) : "";
  const prog = rd ? idx / rd.total : 0;

  function loadItem(roundData, itemIdx) {
    setDisplayItem(null);   // word area opacity → 0 immediately
    setFlash(null);
    setActive(false);
    // Double RAF: guarantees iOS Safari paints the blank frame before new word
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setDisplayItem(getItem(roundData, itemIdx));
        setWordKey(k => k + 1);
        setTimeout(() => setActive(true), MIN_DISPLAY_MS);
      })
    );
  }

  function doAdvance(r, i, p) {
    const roundData = PUZZLE.rounds[r];
    const next = i + 1;

    if (next >= roundData.total) {
      const elapsed = Date.now() - startRef.current;
      setTimes(prev => { const n = [...prev]; n[r] = elapsed; return n; });
      if (r >= 2) {
        setScreen("results");
      } else {
        setRound(r + 1);
        setIdx(0);
        setPhase(0);
        setScreen("round_intro");
      }
      return;
    }

    if (roundData.inversionPoints.includes(next)) {
      setPhase(p + 1);
      setIdx(next);
      setScreen("rule_switch");
      return;
    }

    setIdx(next);
    loadItem(roundData, next);
  }

  function handleAnswer(accepted) {
    if (!active || !displayItem) return;
    setActive(false);
    const correct = accepted === displayItem.shouldAccept;
    setFlash(correct ? "green" : "red");
    const r = round, i = idx, p = phase;
    setAllResults(prev => {
      const n = prev.map(a => [...a]);
      n[r].push({ correct, item: displayItem });
      return n;
    });
    setTimeout(() => {
      setFlash(null);
      doAdvance(r, i, p);
    }, correct ? ADVANCE_MS : PENALTY_MS);
  }

  // Rule reveal countdown
  useEffect(() => {
    if (screen !== "rule") return;
    setCountdown(3);
    const t1 = setTimeout(() => setCountdown(2), 1000);
    const t2 = setTimeout(() => setCountdown(1), 2000);
    const t3 = setTimeout(() => {
      const r         = round;
      const roundData = PUZZLE.rounds[r];
      startRef.current = Date.now();
      setIdx(0);
      setPhase(0);
      setScreen("game");
      loadItem(roundData, 0);
    }, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [screen]); // eslint-disable-line

  // Rule switch RAF progress bar
  useEffect(() => {
    if (screen !== "rule_switch") return;
    setSwitchPct(0);
    const startT    = Date.now();
    const capturedR = round;
    const capturedI = idx;

    function tick() {
      const pct = Math.min((Date.now() - startT) / INVERSION_MS, 1);
      setSwitchPct(pct);
      if (pct < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(animRef.current);
        const roundData = PUZZLE.rounds[capturedR];
        setScreen("game");
        loadItem(roundData, capturedI);
      }
    }

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [screen]); // eslint-disable-line

  function handleSkip() {
    if (screen === "intro") {
      setRound(0); setScreen("round_intro");
    } else if (screen === "round_intro") {
      setScreen("rule");
    } else if (screen === "rule") {
      startRef.current = Date.now();
      setIdx(0); setPhase(0);
      setScreen("game");
      loadItem(PUZZLE.rounds[round], 0);
    } else if (screen === "rule_switch") {
      cancelAnimationFrame(animRef.current);
      setScreen("game");
      loadItem(PUZZLE.rounds[round], idx);
    } else if (screen === "game") {
      const elapsed = Date.now() - (startRef.current ?? Date.now());
      setTimes(prev => { const n = [...prev]; n[round] = elapsed; return n; });
      if (round >= 2) {
        setScreen("results");
      } else {
        setRound(round + 1);
        setIdx(0); setPhase(0);
        setScreen("round_intro");
      }
    }
  }

  // Loading screen
  if (loading || !PUZZLE) {
    return (
      <div className="rb-backdrop">
        <style>{STYLES}</style>
        <div className="rb-card" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Konkhmer Sleokchher',sans-serif", fontSize: "clamp(32px,8vw,52px)", color: "#FFFFFF", lineHeight: 0.95, marginBottom: "20px" }}>
              RULE<br /><span style={{ color: "#FF4060" }}>BREAKER!</span>
            </div>
            <p style={{ color: "#888888", fontSize: "13px", animation: "pulse 1.2s ease infinite" }}>
              Loading today's puzzle…
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "intro")       return <IntroScreen onPlay={() => { setRound(0); setScreen("round_intro"); }} puzzle={PUZZLE} />;
  if (screen === "round_intro") return <RoundIntroScreen rd={rd} onReady={() => setScreen("rule")} onSkip={handleSkip} />;
  if (screen === "rule")        return <RuleScreen rd={rd} rule={rule} countdown={countdown} onSkip={handleSkip} />;
  if (screen === "rule_switch") return <RuleSwitchScreen newRule={rd.rules[phase] ?? rd.rules[rd.rules.length - 1]} progress={switchPct} onSkip={handleSkip} />;
  if (screen === "game")        return <GameScreen rd={rd} rule={rule} displayItem={displayItem} wordKey={wordKey} active={active} flash={flash} progress={prog} onAnswer={handleAnswer} onSkip={handleSkip} />;
  if (screen === "results")     return <ResultsScreen allResults={allResults} times={times} puzzle={PUZZLE} />;
  return null;
}
