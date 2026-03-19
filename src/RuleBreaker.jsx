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

// ─────────────────────────────────────────────────────────────────────────────
// Streak / stats helpers (localStorage)
// ─────────────────────────────────────────────────────────────────────────────
const STATS_KEY = "rb_stats";

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? JSON.parse(raw) : { lastPlayedDay: null, streak: 0, bestStreak: 0, bestTime: null, totalPlayed: 0, history: {} };
  } catch { return { lastPlayedDay: null, streak: 0, bestStreak: 0, bestTime: null, totalPlayed: 0, history: {} }; }
}

function saveStats(stats) {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch {}
}

function recordResult(dayNumber, grade, totalTime, correct, total) {
  const stats = loadStats();
  const yesterday = dayNumber - 1;
  const newStreak = stats.lastPlayedDay === yesterday
    ? stats.streak + 1
    : stats.lastPlayedDay === dayNumber
    ? stats.streak
    : 1;
  const isNewBest = stats.bestTime === null || totalTime < stats.bestTime;
  const updated = {
    lastPlayedDay: dayNumber,
    streak:        newStreak,
    bestStreak:    Math.max(stats.bestStreak, newStreak),
    bestTime:      isNewBest ? totalTime : stats.bestTime,
    totalPlayed:   stats.totalPlayed + 1,
    history: {
      ...stats.history,
      [dayNumber]: { grade, time: totalTime, correct, total, isNewBest },
    },
  };
  saveStats(updated);
  return updated;
}

function msUntilNextUtcMidnight() {
  const now  = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return next - now;
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase — anonymous time submission + daily stats
// ─────────────────────────────────────────────────────────────────────────────
const SB_URL = "https://hvnuhcltsgheuktuacta.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2bnVoY2x0c2doZXVrdHVhY3RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MTI4NjIsImV4cCI6MjA4OTM4ODg2Mn0.c89rwv0wmmd3tcXRxDXLc2hNPnxX1lG6FGSKVNv37g4";

async function submitCompletion(dayNumber, totalTimeMs, correct) {
  try {
    await fetch(`${SB_URL}/rest/v1/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SB_KEY,
        "Authorization": `Bearer ${SB_KEY}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ day_number: dayNumber, total_time_ms: totalTimeMs, correct }),
    });
  } catch {}
}

async function fetchDayStats(dayNumber, myTimeMs) {
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/completions?day_number=eq.${dayNumber}&select=total_time_ms`,
      {
        headers: {
          "apikey": SB_KEY,
          "Authorization": `Bearer ${SB_KEY}`,
        },
      }
    );
    const rows = await res.json();
    if (!rows || rows.length === 0) return null;
    const times       = rows.map(r => r.total_time_ms).sort((a, b) => a - b);
    const avg         = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const fastest     = times[0];
    const slower      = times.filter(t => t > myTimeMs).length;
    const percentile  = Math.round((slower / times.length) * 100);
    const totalPlayers = times.length;
    return { percentile, avg, fastest, totalPlayers };
  } catch { return null; }
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
  const prng      = makePrng(dayNumber);
  const res = await fetch("/puzzles.json");
  if (!res.ok) throw new Error("fetch failed");
  const all = await res.json();
  const raw = all[dayNumber] ?? all[1];
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

    /* Title capped so BREAKER! never overflows the 400px card */
    .rb-title { font-size: 72px !important; }
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI
// ─────────────────────────────────────────────────────────────────────────────
function Shell({ children, flash }) {
  const anim = flash === "green" ? "flashGreen 0.45s ease"
             : flash === "red"   ? "flashRed 0.45s ease"
             : "none";
  return (
    <div className="rb-backdrop">
      <style>{STYLES}</style>
      <div className="rb-card" style={{ animation: anim }}>
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
        <div style={{ display: "flex", justifyContent: "flex-end", fontSize: "clamp(11px,1.4vw,14px)", color: "#FFFFFF", fontWeight: 500, letterSpacing: "0.02em" }}>
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
function RoundIntroScreen({ rd, onReady}) {
  const pStyle = { fontSize: "clamp(14px,2vw,18px)", fontWeight: 500, lineHeight: 1.5, color: "#FFFFFF", textAlign: "center" };

  return (
    <Shell>
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
function RuleScreen({ rd, rule, countdown}) {
  return (
    <Shell>
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
function RuleSwitchScreen({ newRule, progress}) {
  return (
    <Shell>
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
function GameScreen({ rd, rule, displayItem, wordKey, active, flash, progress, onAnswer}) {
  const fmt    = displayItem ? getItemFormat(rd, displayItem) : "single";
  const isPair = fmt === "pair";

  return (
    <Shell flash={flash}>
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
function ResultsScreen({ allResults, times, puzzle, stats }) {
  const [copied,          setCopied]          = useState(false);
  const [review,          setReview]          = useState(null);
  const [leaderboard,     setLeaderboard]     = useState(null);

  const totalCorrect = allResults.flat().filter(x => x.correct).length;
  const totalItems   = puzzle.rounds.reduce((a, r) => a + r.total, 0);
  const totalTime    = times.reduce((a, b) => a + b, 0);
  const overallGrade = getOverallGrade(totalCorrect, totalItems);

  useEffect(() => {
    fetchDayStats(puzzle.day, totalTime).then(s => { if (s) setLeaderboard(s); });
  }, []);

  function gradeEmoji(correct, total) {
    const p = correct / total;
    if (p >= 0.85) return "🟢";
    if (p >= 0.5)  return "🟡";
    return "🔴";
  }

  function buildShare() {
    const roundLine = puzzle.rounds.map((r, i) => {
      const res     = allResults[i] || [];
      const correct = res.filter(x => x.correct).length;
      return `R${i + 1}: ${gradeEmoji(correct, r.total)}`;
    }).join("  ");
    const streakPart = stats ? `  🔥${stats.streak}` : "";
    const lines = [
      `RULE BREAKER! #${puzzle.number}`,
      "",
      roundLine,
      "",
      `${totalCorrect}/${totalItems} · ${formatTime(totalTime)}${streakPart}`,
      "rulebreaker.app",
    ];
    return lines.join("\n");
  }

  function handleShare() {
    navigator.clipboard.writeText(buildShare())
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); })
      .catch(() => {});
  }

  return (
    <Shell>
      <div style={{ width: "100%", maxWidth: MAX_W, display: "flex", flexDirection: "column", height: "100%", paddingTop: "8px", paddingBottom: "8px", gap: "clamp(14px,2.5vw,22px)", overflowY: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}>

        {/* Header — daily number */}
        <div style={{ display: "flex", justifyContent: "flex-end", fontSize: "clamp(11px,1.4vw,13px)", color: "#888888", fontWeight: 500 }}>
          <span>DAILY #{puzzle.number}</span>
        </div>

        {/* Grade + score */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Konkhmer Sleokchher',sans-serif", fontSize: "clamp(42px,10vw,68px)", color: "#FFFFFF", lineHeight: 1 }}>
            {overallGrade}
          </div>
          <p style={{ fontSize: "clamp(12px,1.6vw,15px)", color: "#888888", marginTop: "6px" }}>
            {totalCorrect}/{totalItems} correct · {formatTime(totalTime)}
          </p>
        </div>

        {/* Streak stats */}
        {stats && (
          <div style={{ display: "flex", justifyContent: "center", gap: "clamp(24px,5vw,48px)", padding: "clamp(12px,2vw,18px) 0", borderTop: "1px solid rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Konkhmer Sleokchher',sans-serif", fontSize: "clamp(26px,6vw,36px)", color: "#FF4060", lineHeight: 1 }}>{stats.streak}</div>
              <p style={{ fontSize: "clamp(9px,1.2vw,11px)", color: "#888888", marginTop: "4px", letterSpacing: "0.1em" }}>STREAK</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Konkhmer Sleokchher',sans-serif", fontSize: "clamp(26px,6vw,36px)", color: "#FFFFFF", lineHeight: 1 }}>{stats.bestStreak}</div>
              <p style={{ fontSize: "clamp(9px,1.2vw,11px)", color: "#888888", marginTop: "4px", letterSpacing: "0.1em" }}>BEST</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Konkhmer Sleokchher',sans-serif", fontSize: "clamp(26px,6vw,36px)", color: "#FFFFFF", lineHeight: 1 }}>{stats.totalPlayed}</div>
              <p style={{ fontSize: "clamp(9px,1.2vw,11px)", color: "#888888", marginTop: "4px", letterSpacing: "0.1em" }}>PLAYED</p>
            </div>
          </div>
        )}

        {/* Personal best banner */}
        {stats && stats.history[puzzle.day]?.isNewBest && (
          <div style={{ textAlign: "center", padding: "10px 16px", background: "rgba(255,255,255,0.05)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.12)" }}>
            <span style={{ fontSize: "clamp(11px,1.6vw,14px)", color: "#2ECC71", letterSpacing: "0.08em", fontWeight: 700 }}>⚡ NEW BEST TIME — {formatTime(totalTime)}</span>
          </div>
        )}
        {stats && !stats.history[puzzle.day]?.isNewBest && stats.bestTime && (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "clamp(10px,1.3vw,12px)", color: "#555555", letterSpacing: "0.06em" }}>BEST: {formatTime(stats.bestTime)}</p>
          </div>
        )}

        {/* Daily leaderboard */}
        {leaderboard && (
          <div style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "14px 18px", textAlign: "center" }}>
            <p style={{ fontSize: "clamp(11px,1.5vw,14px)", color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>
              {leaderboard.totalPlayers === 1
                ? "You're the first to finish today!"
                : leaderboard.percentile === 0
                ? "You finished today's puzzle"
                : <>{"Faster than "}<span style={{ color: "#FF4060", fontFamily: "'Konkhmer Sleokchher',sans-serif", fontSize: "clamp(14px,2vw,18px)" }}>{leaderboard.percentile}%</span>{" of players today"}</>
              }
            </p>
            <p style={{ fontSize: "clamp(10px,1.3vw,12px)", color: "#666666" }}>
              Avg: {formatTime(leaderboard.avg)} · Fastest: {formatTime(leaderboard.fastest)}
            </p>
          </div>
        )}

        {/* Round cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {puzzle.rounds.map((r, i) => {
            const res     = allResults[i] || [];
            const correct = res.filter(x => x.correct).length;
            const grade   = getGrade(correct, r.total);
            const emoji   = gradeEmoji(correct, r.total);
            return (
              <button key={i} onClick={() => setReview(i)} style={{ width: "100%", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "14px 16px", textAlign: "left", cursor: "pointer", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "clamp(11px,1.5vw,13px)", color: "#888888", marginBottom: "3px", letterSpacing: "0.04em" }}>
                    {r.label}: <span style={{ color: "#FF4060" }}>{r.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                    <span style={{ fontFamily: "'Konkhmer Sleokchher',sans-serif", fontSize: "clamp(14px,2vw,17px)", color: "#FFFFFF" }}>{grade}</span>
                    <span style={{ fontSize: "clamp(10px,1.3vw,12px)", color: "#666666" }}>{correct}/{r.total} · {formatTime(times[i])}</span>
                  </div>
                </div>
                <div style={{ fontSize: "clamp(22px,4vw,28px)", lineHeight: 1, flexShrink: 0 }}>{emoji}</div>
              </button>
            );
          })}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Share */}
          <button onClick={handleShare} style={{
            width: "100%", padding: "clamp(14px,2.5vw,18px)",
            background: copied ? "#1A3D1A" : "#FF4060",
            border: copied ? "2px solid #2ECC71" : "none",
            borderRadius: "4px", color: copied ? "#2ECC71" : "#FFFFFF",
            fontFamily: "'Konkhmer Sleokchher',sans-serif", fontWeight: 700,
            fontSize: "clamp(12px,1.8vw,15px)", letterSpacing: "0.1em",
            transition: "background 0.2s, color 0.2s, border 0.2s", cursor: "pointer",
          }}>
            {copied ? "COPIED TO CLIPBOARD!" : "SHARE RESULTS"}
          </button>

          {/* X + Feedback row */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => window.open("https://x.com/RuleBreakerApp", "_blank")}
              style={{
                flex: 1, padding: "clamp(12px,2vw,16px)",
                background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "4px", color: "#FFFFFF",
                fontFamily: "'Konkhmer Sleokchher',sans-serif",
                fontSize: "clamp(11px,1.6vw,14px)", letterSpacing: "0.06em",
                cursor: "pointer",
              }}
            >
              FOLLOW US
            </button>
            <button
              onClick={() => window.open("https://forms.gle/tQwW6jpMS5vCThgh7", "_blank")}
              style={{
                flex: 1, padding: "clamp(12px,2vw,16px)",
                background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "4px", color: "#FFFFFF",
                fontFamily: "'Konkhmer Sleokchher',sans-serif",
                fontSize: "clamp(11px,1.6vw,14px)", letterSpacing: "0.06em",
                cursor: "pointer",
              }}
            >
              FEEDBACK
            </button>
          </div>
        </div>

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
  const correct = results.filter(x => x.correct).length;

  // definitions: { [WORD]: { loading, text, partOfSpeech } | "none" }
  const [definitions, setDefinitions] = useState({});
  // expanded: set of words currently showing definition
  const [expanded, setExpanded] = useState(new Set());

  async function fetchDefinition(word) {
    if (definitions[word] || definitions[word] === "none") return;
    setDefinitions(prev => ({ ...prev, [word]: { loading: true } }));
    try {
      const res  = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`);
      const data = await res.json();
      if (!Array.isArray(data) || !data[0]) throw new Error("no entry");
      const meaning = data[0].meanings?.[0];
      const def     = meaning?.definitions?.[0]?.definition || null;
      const pos     = meaning?.partOfSpeech || null;
      if (!def) throw new Error("no def");
      setDefinitions(prev => ({ ...prev, [word]: { loading: false, text: def, partOfSpeech: pos } }));
    } catch {
      setDefinitions(prev => ({ ...prev, [word]: "none" }));
    }
  }

  function toggleWord(word) {
    const next = new Set(expanded);
    if (next.has(word)) {
      next.delete(word);
    } else {
      next.add(word);
      fetchDefinition(word);
    }
    setExpanded(next);
  }

  function DefLine({ word }) {
    const d = definitions[word];
    if (!expanded.has(word)) return null;
    if (!d || d.loading) return (
      <div style={{ fontSize: "clamp(10px,1.3vw,12px)", color: "#555555", padding: "4px 0 6px", fontStyle: "italic" }}>
        looking up…
      </div>
    );
    if (d === "none") return (
      <div style={{ fontSize: "clamp(10px,1.3vw,12px)", color: "#444444", padding: "4px 0 6px", fontStyle: "italic" }}>
        no definition found
      </div>
    );
    return (
      <div style={{ fontSize: "clamp(10px,1.3vw,12px)", color: "#888888", padding: "4px 0 6px", lineHeight: 1.5 }}>
        {d.partOfSpeech && <span style={{ color: "#FF4060", marginRight: "6px", fontStyle: "italic" }}>{d.partOfSpeech}</span>}
        {d.text}
      </div>
    );
  }

  return (
    <div style={{
      position: "absolute", inset: 0, background: "#111111",
      display: "flex", flexDirection: "column", alignItems: "center",
      zIndex: 100, overflowY: "auto", padding: "24px 20px",
    }}>
      <div style={{ width: "100%", maxWidth: MAX_W }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <div style={{ fontSize: "clamp(11px,1.5vw,13px)", color: "#888888", letterSpacing: "0.04em", marginBottom: "3px" }}>
              {rd.label}: <span style={{ color: "#FF4060" }}>{rd.name}</span>
            </div>
            <div style={{ fontSize: "clamp(12px,1.6vw,15px)", color: "#FFFFFF", fontWeight: 700 }}>
              {correct}/{rd.total} correct
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "4px", color: "#888888", padding: "8px 18px",
            fontFamily: "'Konkhmer Sleokchher',sans-serif",
            fontSize: "clamp(10px,1.4vw,13px)", letterSpacing: "0.06em", cursor: "pointer",
          }}>
            CLOSE
          </button>
        </div>

        {/* Hint */}
        <div style={{ fontSize: "clamp(9px,1.2vw,11px)", color: "#444444", marginBottom: "10px", letterSpacing: "0.04em" }}>
          Tap any word to see its definition
        </div>

        {/* Starting rule label */}
        <div style={{
          padding: "10px 14px", marginBottom: "8px",
          background: "#1A1A1A", borderRadius: "6px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          <span style={{ fontSize: "clamp(9px,1.2vw,11px)", color: "#888888", letterSpacing: "0.1em" }}>RULE  </span>
          <span style={{ fontSize: "clamp(11px,1.5vw,14px)", color: "#FF4060" }}>{rd.rules[0]}</span>
        </div>

        {/* Word rows */}
        {results.map((r, i) => {
          const item = r.item;
          const inv  = rd.inversionPoints.includes(i);
          if (inv) currentPhase++;
          const fmt  = getItemFormat(rd, item);
          const isPair = fmt === "pair";

          return (
            <div key={i}>
              {inv && (
                <div style={{
                  padding: "10px 14px", margin: "8px 0",
                  background: "#1A1A1A", borderRadius: "6px",
                  border: "1px solid rgba(255,64,96,0.2)",
                }}>
                  <span style={{ fontSize: "clamp(9px,1.2vw,11px)", color: "#888888", letterSpacing: "0.1em" }}>RULE  </span>
                  <span style={{ fontSize: "clamp(11px,1.5vw,14px)", color: "#FF4060" }}>{rd.rules[currentPhase]}</span>
                </div>
              )}
              <div style={{
                padding: "10px 4px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "14px", flexShrink: 0, lineHeight: 1 }}>
                    {r.correct ? "🟢" : "🔴"}
                  </span>

                  {isPair ? (
                    /* Pair: two independently tappable words */
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px" }}>
                      <button onClick={() => toggleWord(item.left)} style={{
                        background: "transparent", border: "none", padding: 0,
                        fontFamily: "'Konkhmer Sleokchher',sans-serif",
                        fontSize: "clamp(12px,1.8vw,15px)",
                        color: expanded.has(item.left) ? "#FF4060" : (r.correct ? "#FFFFFF" : "rgba(255,255,255,0.3)"),
                        cursor: "pointer", textDecoration: expanded.has(item.left) ? "underline" : "none",
                      }}>
                        {item.left}
                      </button>
                      <span style={{ color: "#444444", fontSize: "12px" }}>·</span>
                      <button onClick={() => toggleWord(item.right)} style={{
                        background: "transparent", border: "none", padding: 0,
                        fontFamily: "'Konkhmer Sleokchher',sans-serif",
                        fontSize: "clamp(12px,1.8vw,15px)",
                        color: expanded.has(item.right) ? "#FF4060" : (r.correct ? "#FFFFFF" : "rgba(255,255,255,0.3)"),
                        cursor: "pointer", textDecoration: expanded.has(item.right) ? "underline" : "none",
                      }}>
                        {item.right}
                      </button>
                    </div>
                  ) : (
                    /* Single: whole word is tappable */
                    <button onClick={() => toggleWord(item.word)} style={{
                      background: "transparent", border: "none", padding: 0,
                      fontFamily: "'Konkhmer Sleokchher',sans-serif",
                      fontSize: "clamp(14px,2vw,18px)",
                      color: expanded.has(item.word) ? "#FF4060" : (r.correct ? "#FFFFFF" : "rgba(255,255,255,0.3)"),
                      cursor: "pointer", flex: 1, textAlign: "left",
                      textDecoration: expanded.has(item.word) ? "underline" : "none",
                    }}>
                      {item.word}
                    </button>
                  )}

                  <span style={{
                    fontSize: "clamp(9px,1.2vw,11px)", letterSpacing: "0.04em",
                    flexShrink: 0, fontWeight: 700,
                    color: item.shouldAccept ? "#2ECC71" : "#FF4060",
                    opacity: r.correct ? 0.5 : 1,
                  }}>
                    {item.shouldAccept ? "ACCEPT" : "BREAK"}
                  </span>
                </div>

                {/* Definition lines — inline expand */}
                {isPair ? (
                  <>
                    {expanded.has(item.left)  && <div style={{ paddingLeft: "26px" }}><DefLine word={item.left} /></div>}
                    {expanded.has(item.right) && <div style={{ paddingLeft: "26px" }}><DefLine word={item.right} /></div>}
                  </>
                ) : (
                  <div style={{ paddingLeft: "26px" }}><DefLine word={item.word} /></div>
                )}
              </div>
            </div>
          );
        })}

        {/* Bottom close button */}
        <button onClick={onClose} style={{
          width: "100%", marginTop: "24px",
          padding: "clamp(14px,2.5vw,18px)",
          background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "4px", color: "#888888",
          fontFamily: "'Konkhmer Sleokchher',sans-serif",
          fontSize: "clamp(12px,1.8vw,15px)", letterSpacing: "0.1em", cursor: "pointer",
        }}>
          CLOSE
        </button>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Already played screen
// ─────────────────────────────────────────────────────────────────────────────
function AlreadyPlayedScreen({ puzzle, stats }) {
  const [timeLeft,    setTimeLeft]    = useState("");
  const [copied,      setCopied]      = useState(false);
  const [leaderboard, setLeaderboard] = useState(null);
  const todayResult = stats.history[puzzle.day] || {};

  useEffect(() => {
    if (todayResult.time) {
      fetchDayStats(puzzle.day, todayResult.time).then(s => { if (s) setLeaderboard(s); });
    }
  }, []);

  useEffect(() => {
    function tick() {
      const ms = msUntilNextUtcMidnight();
      const h  = Math.floor(ms / 3600000);
      const m  = Math.floor((ms % 3600000) / 60000);
      const s  = Math.floor((ms % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  function gradeEmoji(correct, total) {
    const p = correct / total;
    if (p >= 0.85) return "🟢";
    if (p >= 0.5)  return "🟡";
    return "🔴";
  }

  function buildShare() {
    // localStorage only stores overall result, not per-round breakdown
    // so use overall grade emoji for the share line
    const emoji = gradeEmoji(todayResult.correct, todayResult.total);
    const streakPart = stats ? `  🔥${stats.streak}` : "";
    const lines = [
      `RULE BREAKER! #${puzzle.number}`,
      "",
      `${emoji} ${todayResult.grade}`,
      "",
      `${todayResult.correct}/${todayResult.total} · ${formatTime(todayResult.time)}${streakPart}`,
      "rulebreaker.app",
    ];
    return lines.join("\n");
  }

  function handleShare() {
    navigator.clipboard.writeText(buildShare())
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); })
      .catch(() => {});
  }

  return (
    <Shell>
      <div style={{ width: "100%", maxWidth: MAX_W, display: "flex", flexDirection: "column", height: "100%", paddingTop: "8px", paddingBottom: "8px", gap: "clamp(14px,2.5vw,22px)" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "flex-end", fontSize: "clamp(11px,1.4vw,13px)", color: "#888888", fontWeight: 500 }}>
          <span>DAILY #{puzzle.number}</span>
        </div>

        {/* Streak — hero number */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Konkhmer Sleokchher',sans-serif", fontSize: "clamp(64px,16vw,96px)", color: "#FF4060", lineHeight: 1 }}>
            {stats.streak}
          </div>
          <p style={{ fontSize: "clamp(11px,1.4vw,14px)", color: "#888888", marginTop: "6px", letterSpacing: "0.1em" }}>
            DAY STREAK
          </p>
        </div>

        {/* Today's result */}
        {todayResult.grade && (
          <div style={{ textAlign: "center", padding: "clamp(12px,2vw,18px) 0", borderTop: "1px solid rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontFamily: "'Konkhmer Sleokchher',sans-serif", fontSize: "clamp(22px,5vw,32px)", color: "#FFFFFF", lineHeight: 1 }}>
              {todayResult.grade}
            </div>
            <p style={{ fontSize: "clamp(11px,1.4vw,14px)", color: "#888888", marginTop: "6px" }}>
              {todayResult.correct}/{todayResult.total} correct · {formatTime(todayResult.time)}
            </p>
            {todayResult.isNewBest && (
              <p style={{ fontSize: "clamp(10px,1.3vw,13px)", color: "#2ECC71", marginTop: "6px", letterSpacing: "0.06em" }}>⚡ NEW BEST TIME</p>
            )}
          </div>
        )}

        {/* Daily leaderboard */}
        {leaderboard && (
          <div style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "14px 18px", textAlign: "center" }}>
            <p style={{ fontSize: "clamp(11px,1.5vw,14px)", color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>
              {leaderboard.totalPlayers === 1
                ? "You're the first to finish today!"
                : leaderboard.percentile === 0
                ? "You finished today's puzzle"
                : <>{"Faster than "}<span style={{ color: "#FF4060", fontFamily: "'Konkhmer Sleokchher',sans-serif", fontSize: "clamp(14px,2vw,18px)" }}>{leaderboard.percentile}%</span>{" of players today"}</>
              }
            </p>
            <p style={{ fontSize: "clamp(10px,1.3vw,12px)", color: "#666666" }}>
              Avg: {formatTime(leaderboard.avg)} · Fastest: {formatTime(leaderboard.fastest)}
            </p>
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: "flex", justifyContent: "center", gap: "clamp(24px,5vw,48px)" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Konkhmer Sleokchher',sans-serif", fontSize: "clamp(22px,5vw,30px)", color: "#FFFFFF", lineHeight: 1 }}>{stats.bestStreak}</div>
            <p style={{ fontSize: "clamp(9px,1.2vw,11px)", color: "#888888", marginTop: "4px", letterSpacing: "0.1em" }}>BEST STREAK</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Konkhmer Sleokchher',sans-serif", fontSize: "clamp(22px,5vw,30px)", color: "#FFFFFF", lineHeight: 1 }}>{stats.totalPlayed}</div>
            <p style={{ fontSize: "clamp(9px,1.2vw,11px)", color: "#888888", marginTop: "4px", letterSpacing: "0.1em" }}>PLAYED</p>
          </div>
          {stats.bestTime && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Konkhmer Sleokchher',sans-serif", fontSize: "clamp(22px,5vw,30px)", color: "#FFFFFF", lineHeight: 1 }}>{formatTime(stats.bestTime)}</div>
              <p style={{ fontSize: "clamp(9px,1.2vw,11px)", color: "#888888", marginTop: "4px", letterSpacing: "0.1em" }}>BEST TIME</p>
            </div>
          )}
        </div>

        {/* Next puzzle countdown */}
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "clamp(10px,1.3vw,12px)", color: "#888888", letterSpacing: "0.1em", marginBottom: "6px" }}>NEXT PUZZLE IN</p>
          <div style={{ fontFamily: "'Konkhmer Sleokchher',sans-serif", fontSize: "clamp(28px,6vw,40px)", color: "#FFFFFF", letterSpacing: "0.04em" }}>
            {timeLeft}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "auto" }}>
          <button onClick={handleShare} style={{
            width: "100%", padding: "clamp(14px,2.5vw,18px)",
            background: copied ? "#1A3D1A" : "#FF4060",
            border: copied ? "2px solid #2ECC71" : "none",
            borderRadius: "4px", color: copied ? "#2ECC71" : "#FFFFFF",
            fontFamily: "'Konkhmer Sleokchher',sans-serif", fontWeight: 700,
            fontSize: "clamp(12px,1.8vw,15px)", letterSpacing: "0.1em",
            transition: "background 0.2s, color 0.2s, border 0.2s", cursor: "pointer",
          }}>
            {copied ? "COPIED TO CLIPBOARD!" : "SHARE RESULTS"}
          </button>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => window.open("https://x.com/RuleBreakerApp", "_blank")} style={{ flex: 1, padding: "clamp(12px,2vw,16px)", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "4px", color: "#FFFFFF", fontFamily: "'Konkhmer Sleokchher',sans-serif", fontSize: "clamp(11px,1.6vw,14px)", letterSpacing: "0.06em", cursor: "pointer" }}>
              FOLLOW US
            </button>
            <button onClick={() => window.open("https://forms.gle/tQwW6jpMS5vCThgh7", "_blank")} style={{ flex: 1, padding: "clamp(12px,2vw,16px)", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "4px", color: "#FFFFFF", fontFamily: "'Konkhmer Sleokchher',sans-serif", fontSize: "clamp(11px,1.6vw,14px)", letterSpacing: "0.06em", cursor: "pointer" }}>
              FEEDBACK
            </button>
          </div>
        </div>

      </div>
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function RuleBreaker() {
  const [PUZZLE,      setPUZZLE]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(false);
  const [stats,       setStats]       = useState(null);
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

  // Fetch today's puzzle on mount, then check if already played
  useEffect(() => {
    loadDailyPuzzle()
      .then(puzzle => {
        const s = loadStats();
        setPUZZLE(puzzle);
        setStats(s);
        setLoading(false);
        if (s.lastPlayedDay === puzzle.day) setScreen("already_played");
      })
      .catch(() => {
        setLoading(false);
        setError(true);
      });
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

  function doAdvance(r, i, p, latestResults) {
    const roundData = PUZZLE.rounds[r];
    const next = i + 1;

    if (next >= roundData.total) {
      const elapsed = Date.now() - startRef.current;
      if (r >= 2) {
        // Final round — save grade, stats, submit to Supabase, then go to results
        setTimes(prev => {
          const finalTimes   = [...prev]; finalTimes[r] = elapsed;
          const totalTime    = finalTimes.reduce((a, b) => a + b, 0);
          const totalCorrect = latestResults.flat().filter(x => x.correct).length;
          const totalItems   = PUZZLE.rounds.reduce((a, rd) => a + rd.total, 0);
          const grade        = getOverallGrade(totalCorrect, totalItems);
          const updated      = recordResult(PUZZLE.day, grade, totalTime, totalCorrect, totalItems);
          setStats(updated);
          submitCompletion(PUZZLE.day, totalTime, totalCorrect);
          return finalTimes;
        });
        setScreen("results");
      } else {
        // End of round 1 or 2 — record time and advance to next round
        setTimes(prev => {
          const n = [...prev]; n[r] = elapsed;
          return n;
        });
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
    // Build updated results synchronously from current allResults —
    // safe here because active=false prevents any concurrent answers
    const newResults = allResults.map(a => [...a]);
    newResults[r].push({ correct, item: displayItem });
    setAllResults(newResults);
    setTimeout(() => {
      setFlash(null);
      doAdvance(r, i, p, newResults);
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

  // Loading / error screen
  if (loading || !PUZZLE) {
    return (
      <div className="rb-backdrop">
        <style>{STYLES}</style>
        <div className="rb-card" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", padding: "0 24px" }}>
            <div style={{ fontFamily: "'Konkhmer Sleokchher',sans-serif", fontSize: "clamp(32px,8vw,52px)", color: "#FFFFFF", lineHeight: 0.95, marginBottom: "20px" }}>
              RULE<br /><span style={{ color: "#FF4060" }}>BREAKER!</span>
            </div>
            {error ? (
              <p style={{ color: "#888888", fontSize: "13px", lineHeight: 1.6 }}>
                Unable to load today's puzzle —<br />please refresh or try again later.
              </p>
            ) : (
              <p style={{ color: "#888888", fontSize: "13px", animation: "pulse 1.2s ease infinite" }}>
                Loading today's puzzle…
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "already_played") return <AlreadyPlayedScreen puzzle={PUZZLE} stats={stats} />;
  if (screen === "intro")          return <IntroScreen onPlay={() => { setRound(0); setScreen("round_intro"); }} puzzle={PUZZLE} />;
  if (screen === "round_intro")    return <RoundIntroScreen rd={rd} onReady={() => setScreen("rule")} />;
  if (screen === "rule")           return <RuleScreen rd={rd} rule={rule} countdown={countdown} />;
  if (screen === "rule_switch")    return <RuleSwitchScreen newRule={rd.rules[phase] ?? rd.rules[rd.rules.length - 1]} progress={switchPct} />;
  if (screen === "game")           return <GameScreen rd={rd} rule={rule} displayItem={displayItem} wordKey={wordKey} active={active} flash={flash} progress={prog} onAnswer={handleAnswer} />;
  if (screen === "results")        return <ResultsScreen allResults={allResults} times={times} puzzle={PUZZLE} stats={stats} />;
  return null;
}
