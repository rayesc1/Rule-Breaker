import { useState, useEffect, useRef } from "react";

// ── Helpers ───────────────────────────────────────────────────────────────────
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(ms) {
  if (ms === null || ms === undefined) return "—";
  return (ms / 1000).toFixed(2) + "s";
}

function buildItems(roundData) {
  if (roundData.type === "single") {
    const pts = [0, ...roundData.inversionPoints, roundData.words.length];
    return pts.slice(0, -1).reduce((acc, _, i) =>
      [...acc, ...shuffleArray(roundData.words.slice(pts[i], pts[i + 1]))], []);
  }
  return shuffleArray(roundData.pairs);
}

// ── Rule checkers (used for validation) ──────────────────────────────────────
const RULE_CHECKERS = {
  "Contains the letter E":        (w) => w.toUpperCase().includes("E"),
  "Does NOT contain the letter E": (w) => !w.toUpperCase().includes("E"),
  "Contains double letters":  (w) => /(.)\1/i.test(w),
  "Contains the letter O":          (w) => w.toUpperCase().includes("O"),
  "Exactly 5 letters long":  (w) => w.length === 5,
  "Contains the letter A":          (w) => w.toUpperCase().includes("A"),
};

function validatePuzzle(puzzle) {
  let valid = true;
  const warn = (msg) => { console.warn("[RuleBreaker] " + msg); valid = false; };

  puzzle.rounds.forEach((round) => {
    const label       = round.label;
    const actualCount = round.type === "single" ? round.words.length : round.pairs.length;
    if (actualCount !== round.total)
      warn(label + ": total is " + round.total + " but found " + actualCount + " items.");

    if (round.type === "single") {
      round.words.forEach((w, wi) => {
        if (typeof w.shouldTap !== "boolean")
          warn(label + " word[" + wi + "] \"" + w.word + "\": shouldTap is not a boolean.");
      });
      const pts = [0, ...round.inversionPoints, round.words.length];
      pts.slice(0, -1).forEach((start, pi) => {
        const end     = pts[pi + 1];
        const rule    = round.rules[pi];
        const checker = RULE_CHECKERS[rule];
        if (!checker) { warn(label + " phase " + pi + ": no checker for rule \"" + rule + "\"."); return; }
        for (let wi = start; wi < end; wi++) {
          const w        = round.words[wi];
          const expected = checker(w.word);
          if (w.shouldTap !== expected)
            warn(label + " word[" + wi + "] \"" + w.word + "\": shouldTap=" + w.shouldTap + " but rule evaluates to " + expected + ".");
        }
      });
    }

    if (round.type === "pairs") {
      const rule    = round.rules[0];
      const checker = RULE_CHECKERS[rule];
      if (!checker) { warn(label + ": no checker for rule \"" + rule + "\"."); return; }
      round.pairs.forEach((pair, pi) => {
        const leftMatch  = checker(pair.left);
        const rightMatch = checker(pair.right);
        if (leftMatch && rightMatch)
          warn(label + " pair[" + pi + "] \"" + pair.left + "\" / \"" + pair.right + "\": BOTH satisfy the rule.");
        if (leftMatch  && pair.correctSide !== "left")
          warn(label + " pair[" + pi + "] \"" + pair.left + "\" satisfies rule but correctSide=\"" + pair.correctSide + "\".");
        if (rightMatch && pair.correctSide !== "right")
          warn(label + " pair[" + pi + "] \"" + pair.right + "\" satisfies rule but correctSide=\"" + pair.correctSide + "\".");
        if (!leftMatch && !rightMatch && pair.correctSide !== null)
          warn(label + " pair[" + pi + "] neither word satisfies rule but correctSide=\"" + pair.correctSide + "\" (expected null).");
      });
    }
  });

  if (valid) console.log("[RuleBreaker] ✓ Puzzle passed all checks.");
  return valid;
}

// ── Puzzle Data ───────────────────────────────────────────────────────────────
const DAILY = {
  day: 1,
  rounds: [
    {
      type: "single",
      label: "ROUND 1",
      total: 25,
      desc: "25 words flash one at a time.\nAccept or Rule Break each one.\nThe rule changes once midway.",
      inversionPoints: [13],
      rules: [
        "Contains the letter E",
        "Does NOT contain the letter E",
      ],
      words: [
        // Phase 0 (0–12): contains E
        { word: "MAPLE",   shouldTap: true  },
        { word: "FIST",    shouldTap: false },
        { word: "FEVER",   shouldTap: true  },
        { word: "GRIND",   shouldTap: false },
        { word: "BLENDER", shouldTap: true  },
        { word: "BRUSH",   shouldTap: false },
        { word: "PLANET",  shouldTap: true  },
        { word: "SWIRL",   shouldTap: false },
        { word: "SERENE",  shouldTap: true  },
        { word: "BROTH",   shouldTap: false },
        { word: "SLEEVE",  shouldTap: true  },
        { word: "CRYPT",   shouldTap: false },
        { word: "CHROME",  shouldTap: true  },
        // Phase 1 (13–24): does NOT contain E
        { word: "SHAFT",   shouldTap: true  },
        { word: "GRIEVE",  shouldTap: false },
        { word: "BLUNT",   shouldTap: true  },
        { word: "THRONE",  shouldTap: false },
        { word: "GLYPH",   shouldTap: true  },
        { word: "SHRINE",  shouldTap: false },
        { word: "DRAFT",   shouldTap: true  },
        { word: "THRIVE",  shouldTap: false },
        { word: "TWIST",   shouldTap: true  },
        { word: "REMOTE",  shouldTap: false },
        { word: "SCORN",   shouldTap: true  },
        { word: "BREEZE",  shouldTap: false },
      ],
    },
    {
      type: "pairs",
      label: "ROUND 2",
      total: 30,
      desc: "30 word pairs flash side by side.\nTap the matching word — or None! if neither fits.\nThe rule stays the same throughout.",
      inversionPoints: [],
      rules: ["Contains double letters"],
      pairs: [
        { left: "APPLE",   right: "CRANE",   correctSide: "left"  },
        { left: "TWIST",   right: "ATTIC",   correctSide: "right" },
        { left: "BANNER",  right: "PLUM",    correctSide: "left"  },
        { left: "FROST",   right: "DRILL",   correctSide: "right" },
        { left: "KITTEN",  right: "BRONZE",  correctSide: "left"  },
        { left: "WRENCH",  right: "FLINT",   correctSide: null    },
        { left: "MIRROR",  right: "STUMP",   correctSide: "left"  },
        { left: "CRIMP",   right: "RIBBON",  correctSide: "right" },
        { left: "BLUNT",   right: "NOODLE",  correctSide: "right" },
        { left: "THORN",   right: "PRISM",   correctSide: null    },
        { left: "COTTON",  right: "GRAVEL",  correctSide: "left"  },
        { left: "SPINE",   right: "CRYPT",   correctSide: null    },
        { left: "PEPPER",  right: "SHRUNK",  correctSide: "left"  },
        { left: "BLAND",   right: "TUNNEL",  correctSide: "right" },
        { left: "GUST",    right: "BRISK",   correctSide: null    },
        { left: "PUZZLE",  right: "BRAND",   correctSide: "left"  },
        { left: "STOMP",   right: "VALLEY",  correctSide: "right" },
        { left: "RABBIT",  right: "CRISP",   correctSide: "left"  },
        { left: "SCORCH",  right: "LITTLE",  correctSide: "right" },
        { left: "BLIGHT",  right: "TRAMP",   correctSide: null    },
        { left: "JELLY",   right: "SHRUB",   correctSide: "left"  },
        { left: "FLICK",   right: "SUMMER",  correctSide: "right" },
        { left: "LESSON",  right: "PIVOT",   correctSide: "left"  },
        { left: "TWIRL",   right: "SETTLE",  correctSide: "right" },
        { left: "SUDDEN",  right: "GROVE",   correctSide: "left"  },
        { left: "SHARD",   right: "BLISS",   correctSide: "right" },
        { left: "BITTER",  right: "SHRINE",  correctSide: "left"  },
        { left: "TRENCH",  right: "VELVET",  correctSide: null    },
        { left: "INNER",   right: "PULPIT",  correctSide: "left"  },
        { left: "SWIFT",   right: "DOLLAR",  correctSide: "right" },
      ],
    },
    {
      type: "single",
      label: "ROUND 3",
      total: 45,
      desc: "45 words. Two rule changes.\nEach rule is different.\nStay sharp.",
      inversionPoints: [15, 30],
      rules: [
        "Contains the letter O",
        "Exactly 5 letters long",
        "Contains the letter A",
      ],
      words: [
        // Phase 0 (0–14): contains O
        { word: "TROPHY",  shouldTap: true  },
        { word: "DENIM",   shouldTap: false },
        { word: "CLOVER",  shouldTap: true  },
        { word: "STING",   shouldTap: false },
        { word: "FORGOT",  shouldTap: true  },
        { word: "CRIMP",   shouldTap: false },
        { word: "DONOR",   shouldTap: true  },
        { word: "BRISK",   shouldTap: false },
        { word: "CONVOY",  shouldTap: true  },
        { word: "FLUNG",   shouldTap: false },
        { word: "STOVE",   shouldTap: true  },
        { word: "DWELT",   shouldTap: false },
        { word: "CROAK",   shouldTap: true  },
        { word: "SLUMP",   shouldTap: false },
        { word: "OCHRE",   shouldTap: true  },
        // Phase 1 (15–29): exactly 5 letters
        { word: "GLINT",   shouldTap: true  },
        { word: "BURDEN",  shouldTap: false },
        { word: "SCALP",   shouldTap: true  },
        { word: "FRINGE",  shouldTap: false },
        { word: "CRANK",   shouldTap: true  },
        { word: "WITHER",  shouldTap: false },
        { word: "PLUCK",   shouldTap: true  },
        { word: "COBALT",  shouldTap: false },
        { word: "SPIRE",   shouldTap: true  },
        { word: "TANGLE",  shouldTap: false },
        { word: "GRUMP",   shouldTap: true  },
        { word: "FLINCH",  shouldTap: false },
        { word: "SIREN",   shouldTap: true  },
        { word: "KERNEL",  shouldTap: false },
        { word: "PRUNE",   shouldTap: true  },
        // Phase 2 (30–44): contains A
        { word: "BRANCH",  shouldTap: true  },
        { word: "SCRIPT",  shouldTap: false },
        { word: "PLASMA",  shouldTap: true  },
        { word: "CLINIC",  shouldTap: false },
        { word: "CHANT",   shouldTap: true  },
        { word: "SPHINX",  shouldTap: false },
        { word: "GRACE",   shouldTap: true  },
        { word: "WRIST",   shouldTap: false },
        { word: "SHAMAN",  shouldTap: true  },
        { word: "GRUFF",   shouldTap: false },
        { word: "FLAME",   shouldTap: true  },
        { word: "NYMPH",   shouldTap: false },
        { word: "LANTERN", shouldTap: true  },
        { word: "STENCH",  shouldTap: false },
        { word: "HAZARD",  shouldTap: true  },
      ],
    },
  ],
};

// ── Constants ─────────────────────────────────────────────────────────────────
const MIN_DISPLAY_MS = 300;  // min time before buttons activate
const PENALTY_MS     = 500;  // wrong answer penalty
const INVERSION_MS   = 2500; // rule change display time
const ADVANCE_MS     = 200;  // green flash before advancing on correct
const RULE_COLORS    = ["#00FFB2", "#FF4D6D", "#FFE14D"];
const SCREENS = {
  INTRO: "intro", ROUND_INTRO: "round_intro", RULE: "rule",
  GAME: "game", ROUND_SUMMARY: "round_summary", RESULTS: "results",
};

// ── Review Modal ──────────────────────────────────────────────────────────────
function ReviewModal({ reviewRound, roundResults, roundItems, setReviewRound }) {
  if (reviewRound === null) return null;

  const mono = "'Courier New', monospace";
  const dim  = { color: "#B0B0C0", fontSize: "0.9rem", letterSpacing: "0.2em" };
  const btn  = {
    background: "#FF4D6D", color: "#0A0A0F", border: "none",
    padding: "1.25rem 2rem", fontSize: "1rem", fontWeight: 900,
    letterSpacing: "0.2em", cursor: "pointer", fontFamily: mono, width: "100%",
  };

  const i       = reviewRound;
  const rd      = DAILY.rounds[i];
  const res     = roundResults[i] || [];
  const ritems  = roundItems[i]   || [];
  const isPairs = rd.type === "pairs";
  const pts     = rd.inversionPoints || [];

  const ruleForIndex = (j) => {
    const ri = pts.reduce((acc, pt) => acc + (j >= pt ? 1 : 0), 0);
    return rd.rules[ri];
  };

  return (
    <div
      onClick={() => setReviewRound(null)}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(10,10,15,0.92)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        overflowY: "auto", padding: "2rem 1rem",
        animation: "fadeIn 0.15s ease",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480,
          background: "#0F0F18", border: "1px solid #1E1E2E",
          padding: "1.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: "1.5rem" }}>
          <span style={{ ...dim, fontSize: "0.75rem" }}>{rd.label} · REVIEW</span>
          <button
            onClick={() => setReviewRound(null)}
            style={{
              background: "transparent", border: "1px solid #333",
              color: "#B0B0C0", fontSize: "0.75rem", letterSpacing: "0.15em",
              padding: "0.4rem 0.9rem", cursor: "pointer", fontFamily: mono,
            }}
          >
            CLOSE ✕
          </button>
        </div>

        {res.map((r, j) => {
          const item = ritems[j];
          if (!item) return null;

          if (isPairs) {
            const { left, right, correctSide } = item;
            return (
              <div key={j} style={{
                display: "flex", alignItems: "center",
                borderBottom: "1px solid #1A1A24",
                padding: "0.55rem 0", gap: "0.5rem",
              }}>
                <span style={{ color: "#444", fontSize: "0.6rem", minWidth: 18, textAlign: "right" }}>
                  {j + 1}
                </span>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: r.correct ? "#00FFB2" : "#FF4D6D",
                }} />
                <span style={{
                  flex: 1, textAlign: "right",
                  fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.06em",
                  color: correctSide === "left" ? "#00FFB2" : "#555",
                }}>
                  {left}
                </span>
                <span style={{ color: "#333", fontSize: "0.7rem", flexShrink: 0 }}>·</span>
                <span style={{
                  flex: 1, textAlign: "left",
                  fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.06em",
                  color: correctSide === "right" ? "#00FFB2" : "#555",
                }}>
                  {right}
                </span>
                {correctSide === null && (
                  <span style={{ color: "#444", fontSize: "0.6rem", letterSpacing: "0.1em", flexShrink: 0 }}>
                    (none)
                  </span>
                )}
              </div>
            );
          }

          const switchBefore = pts.includes(j);
          return (
            <div key={j}>
              {switchBefore && (
                <div style={{
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  margin: "0.75rem 0", color: "#FF4D6D",
                  fontSize: "0.55rem", letterSpacing: "0.2em",
                }}>
                  <div style={{ flex: 1, height: 1, background: "#2A1A1A" }} />
                  RULE CHANGED: {ruleForIndex(j).toUpperCase()}
                  <div style={{ flex: 1, height: 1, background: "#2A1A1A" }} />
                </div>
              )}
              <div style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                borderBottom: "1px solid #1A1A24", padding: "0.55rem 0",
              }}>
                <span style={{ color: "#444", fontSize: "0.6rem", minWidth: 18, textAlign: "right" }}>
                  {j + 1}
                </span>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: r.correct ? "#00FFB2" : "#FF4D6D",
                }} />
                <span style={{
                  fontSize: "0.9rem", fontWeight: 700, letterSpacing: "0.08em",
                  color: r.correct ? "#00FFB2" : "#FF4D6D", flex: 1,
                }}>
                  {item.word}
                </span>
                <span style={{ color: "#444", fontSize: "0.6rem", letterSpacing: "0.08em" }}>
                  {item.shouldTap ? "ACCEPT" : "RULE BREAK"}
                </span>
              </div>
            </div>
          );
        })}

        <button
          onClick={() => setReviewRound(null)}
          style={{ ...btn, marginTop: "1.5rem", background: "#1A1A28",
            color: "#B0B0C0", border: "1px solid #2A2A3A" }}
        >
          BACK TO RESULTS
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function RuleBreaker() {

  // ── State ─────────────────────────────────────────────────────────────────
  const [screen,        setScreen       ] = useState(SCREENS.INTRO);
  const [currentRound,  setCurrentRound ] = useState(0);
  const [items,         setItems        ] = useState([]);
  const [currentIndex,  setCurrentIndex ] = useState(0);
  const [wordVisible,   setWordVisible  ] = useState(false);
  const [buttonsLive,   setButtonsLive  ] = useState(false);
  const [paused,        setPaused       ] = useState(false);
  const [showInversion, setShowInversion] = useState(false);
  const [inversionText, setInversionText] = useState("");
  const [ruleCountdown, setRuleCountdown] = useState(3);
  const [wordColor,     setWordColor    ] = useState(null); // null | 'green' | 'red'
  const [r2Feedback,    setR2Feedback   ] = useState(null);
  const [penaltyActive, setPenaltyActive] = useState(false);
  const [roundResults,  setRoundResults ] = useState([null, null, null]);
  const [roundTimes,    setRoundTimes   ] = useState([null, null, null]);
  const [roundItems,    setRoundItems   ] = useState([null, null, null]);
  const [copied,        setCopied       ] = useState(false);
  const [reviewRound,   setReviewRound  ] = useState(null);
  const [liveTime,      setLiveTime     ] = useState(0);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const timerRef         = useRef(null);
  const resultsRef       = useRef([]);
  const buttonTappedRef  = useRef(false); // prevents double-tap
  const buttonsLiveRef   = useRef(false); // mirror of buttonsLive for use in closures
  const roundStartRef    = useRef(null);  // timestamp when round started
  const liveTimerRef     = useRef(null);  // interval for live timer display

  // ── Derived values ────────────────────────────────────────────────────────
  const roundData  = DAILY.rounds[currentRound];
  const isRound2   = roundData?.type === "pairs";
  const invPts     = roundData?.inversionPoints || [];
  const TOTAL      = roundData?.total || 25;
  const ruleIndex  = invPts.reduce((acc, pt) => acc + (currentIndex >= pt ? 1 : 0), 0);
  const ruleColor  = RULE_COLORS[ruleIndex] || RULE_COLORS[0];
  const ruleText   = roundData?.rules?.[ruleIndex] || "";
  const btnDisabled = !buttonsLive || penaltyActive;

  // ── Validate puzzle on mount ──────────────────────────────────────────────
  useEffect(() => { validatePuzzle(DAILY); }, []);



  // ── Rule countdown screen ─────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== SCREENS.RULE) return;
    const built = buildItems(roundData);
    setItems(built);
    setRoundItems(prev => { const u = [...prev]; u[currentRound] = built; return u; });
    setCurrentIndex(0);
    resultsRef.current      = [];
    buttonTappedRef.current = false;
    buttonsLiveRef.current  = false;
    setWordColor(null);
    setR2Feedback(null);
    setButtonsLive(false);
    setPenaltyActive(false);
    setRuleCountdown(3);
    const iv = setInterval(() => {
      setRuleCountdown(n => {
        if (n <= 1) { clearInterval(iv); setScreen(SCREENS.GAME); return 0; }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [screen, currentRound]); // eslint-disable-line

  // ── Word display: reset per word, activate buttons after MIN_DISPLAY_MS ──
  useEffect(() => {
    if (screen !== SCREENS.GAME || paused || items.length === 0 || currentIndex >= TOTAL) return;

    buttonTappedRef.current = false;
    buttonsLiveRef.current  = false;
    setButtonsLive(false);
    setPenaltyActive(false);
    setWordColor(null);
    setR2Feedback(null);
    setWordVisible(true);

    // Start round timer on first word
    if (currentIndex === 0) {
      roundStartRef.current = Date.now();
      setLiveTime(0);
      clearInterval(liveTimerRef.current);
      liveTimerRef.current = setInterval(() => {
        setLiveTime(Date.now() - roundStartRef.current);
      }, 100);
    }

    timerRef.current = setTimeout(() => {
      buttonsLiveRef.current = true;
      setButtonsLive(true);
    }, MIN_DISPLAY_MS);

    return () => clearTimeout(timerRef.current);
  }, [screen, currentIndex, items, paused, TOTAL]);

  // ── Advance to next word ──────────────────────────────────────────────────
  // Called after correct flash (200ms) or penalty (500ms)
  const advanceWord = (next) => {
    setWordColor(null);
    setR2Feedback(null);
    setWordVisible(false);
    setButtonsLive(false);
    buttonsLiveRef.current = false;

    // Small gap to let fade-out complete before next word renders
    setTimeout(() => {
      // Inversion point?
      if (invPts.includes(next)) {
        const newRuleIdx = invPts.indexOf(next) + 1;
        clearInterval(liveTimerRef.current);
        setPaused(true);
        setShowInversion(true);
        setInversionText(roundData.rules[newRuleIdx]);
        setTimeout(() => {
          setShowInversion(false);
          setPaused(false);
          // Restart live timer after inversion
          liveTimerRef.current = setInterval(() => {
            setLiveTime(Date.now() - roundStartRef.current);
          }, 100);
          setCurrentIndex(next);
        }, INVERSION_MS);
        return;
      }

      // Round complete?
      if (next >= TOTAL) {
        clearInterval(liveTimerRef.current);
        const roundTime = Date.now() - roundStartRef.current;
        setRoundTimes(prev   => { const u = [...prev]; u[currentRound] = roundTime; return u; });
        setRoundResults(prev => { const u = [...prev]; u[currentRound] = [...resultsRef.current]; return u; });
        setScreen(SCREENS.ROUND_SUMMARY);
        return;
      }

      setCurrentIndex(next);
    }, 120);
  };

  // ── Handle button press ───────────────────────────────────────────────────
  // choice: 'accept' | 'rulebreak' (R1/R3)  or  'left' | 'right' | null (R2)
  const handleChoice = (choice) => {
    if (!buttonsLiveRef.current || buttonTappedRef.current) return;
    buttonTappedRef.current = true;

    let correct;

    if (isRound2) {
      const pair = items[currentIndex];
      correct = choice === pair.correctSide;
      setR2Feedback({ tappedSide: choice, correct, correctSide: pair.correctSide });
    } else {
      const word          = items[currentIndex];
      const playerAccepts = choice === "accept";
      correct = playerAccepts === word.shouldTap;
      setWordColor(correct ? "green" : "red");
    }

    resultsRef.current.push({ correct });

    if (correct) {
      // Brief green flash then advance
      setTimeout(() => advanceWord(currentIndex + 1), ADVANCE_MS);
    } else {
      // Red flash for penalty duration then advance
      setPenaltyActive(true);
      setTimeout(() => {
        setPenaltyActive(false);
        advanceWord(currentIndex + 1);
      }, PENALTY_MS);
    }
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  const goNext = () => {
    const next = currentRound + 1;
    if (next >= DAILY.rounds.length) setScreen(SCREENS.RESULTS);
    else { setCurrentRound(next); setScreen(SCREENS.ROUND_INTRO); }
  };

  // ── Scoring ───────────────────────────────────────────────────────────────
  const getScore   = (i) => (roundResults[i] || []).filter(x => x.correct).length;
  const getTotal   = (i) => DAILY.rounds[i].total;
  const totalScore = [0, 1, 2].reduce((s, i) => s + getScore(i), 0);
  const totalWords = [0, 1, 2].reduce((s, i) => s + getTotal(i), 0);
  const totalTime  = roundTimes.every(t => t !== null)
    ? roundTimes.reduce((s, t) => s + t, 0)
    : null;

  const grade = (pct) => {
    if (pct === 1)   return { label: "PERFECT",   color: "#00FFB2" };
    if (pct >= 0.88) return { label: "SHARP",     color: "#00FFB2" };
    if (pct >= 0.72) return { label: "SOLID",     color: "#FFE14D" };
    if (pct >= 0.52) return { label: "LEARNING",  color: "#FF9A3C" };
    return                  { label: "MISSED IT", color: "#FF4D6D" };
  };

  const overallGrade = () => {
    const pct = totalScore / totalWords;
    if (pct === 1)   return { label: "FLAWLESS",  color: "#00FFB2" };
    if (pct >= 0.88) return { label: "SHARP",     color: "#00FFB2" };
    if (pct >= 0.72) return { label: "SOLID",     color: "#FFE14D" };
    if (pct >= 0.52) return { label: "LEARNING",  color: "#FF9A3C" };
    return                  { label: "ROUGH DAY", color: "#FF4D6D" };
  };

  const shareText = () => {
    const lines = [`Rule Breaker #${DAILY.day}`, `${totalScore}/${totalWords} · ${formatTime(totalTime)}`, ""];
    [0, 1, 2].forEach(i => {
      const r = roundResults[i]; if (!r) return;
      lines.push(`R${i + 1}: ${getScore(i)}/${getTotal(i)} · ${formatTime(roundTimes[i])}`);
      lines.push(r.map(x => x.correct ? "🟢" : "🔴").join(""));
    });
    lines.push("", "rulebreaker.game");
    return lines.join("\n");
  };

  // ── Round 2 side styles ───────────────────────────────────────────────────
  const getSideBg = (side) => {
    if (!r2Feedback) return "transparent";
    const { tappedSide, correct, correctSide } = r2Feedback;
    if (correct) {
      if (tappedSide === side) return "rgba(0,255,178,0.18)";
      if (tappedSide === null) return "rgba(0,255,178,0.07)";
      return "transparent";
    }
    if (tappedSide !== null && tappedSide === side) return "rgba(255,77,109,0.2)";
    if (tappedSide === null && correctSide === side) return "rgba(255,77,109,0.2)";
    return "transparent";
  };

  const getSideColor = (side) => {
    if (!r2Feedback) return "#F0F0F0";
    const { tappedSide, correct, correctSide } = r2Feedback;
    if (correct) {
      if (tappedSide === side || tappedSide === null) return "#00FFB2";
      return "#F0F0F0";
    }
    if (tappedSide !== null && tappedSide === side) return "#FF4D6D";
    if (tappedSide === null && correctSide === side) return "#FF4D6D";
    return "#F0F0F0";
  };

  const singleColor = () => {
    if (wordColor === "green") return "#00FFB2";
    if (wordColor === "red")   return "#FF4D6D";
    return "#F0F0F0";
  };

  // ── Shared styles ─────────────────────────────────────────────────────────
  const mono     = "'Courier New', monospace";
  const dim      = { color: "#B0B0C0", fontSize: "0.75rem", letterSpacing: "0.25em" };
  const progress = ((currentIndex + 1) / TOTAL) * 100;

  const primaryBtn = {
    background: "#FF4D6D", color: "#0A0A0F", border: "none",
    padding: "1.25rem 2rem", fontSize: "1rem", fontWeight: 900,
    letterSpacing: "0.2em", cursor: "pointer", fontFamily: mono, width: "100%",
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: "#0A0A0F", fontFamily: mono,
      userSelect: "none", position: "fixed",
      inset: 0, overflow: "hidden",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
    }}>
      {/* Grain texture */}
      <div style={{
        position: "fixed", inset: 0, opacity: 0.03, pointerEvents: "none",
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
      }} />

      {/* Review modal */}
      <ReviewModal
        reviewRound={reviewRound}
        roundResults={roundResults}
        roundItems={roundItems}
        setReviewRound={setReviewRound}
      />

      {/* Inversion overlay */}
      {showInversion && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(10,10,15,0.97)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          animation: "fadeIn 0.15s ease",
        }}>
          <div style={{ color: "#FF4D6D", fontSize: "1rem", letterSpacing: "0.3em", marginBottom: "1.5rem" }}>
            ⚠ RULE CHANGED
          </div>
          <div style={{
            color: "#F0F0F0", fontSize: "clamp(1.4rem,4.5vw,2.2rem)",
            fontWeight: 900, textAlign: "center", padding: "0 2.5rem", lineHeight: 1.6,
          }}>
            {inversionText}
          </div>
          <div style={{ marginTop: "2rem", width: 140, height: 2, background: "#1A1A24", position: "relative", overflow: "hidden" }}>
            <div style={{
              position: "absolute", left: 0, top: 0, height: "100%",
              background: "#FF4D6D",
              animation: `drain ${INVERSION_MS}ms linear forwards`,
            }} />
          </div>
        </div>
      )}

      {/* ── INTRO ── */}
      {screen === SCREENS.INTRO && (
        <div style={{
          height: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          textAlign: "center", padding: "2rem", maxWidth: 560, margin: "0 auto",
          overflow: "hidden",
        }}>
          <div style={{ ...dim, marginBottom: "1.5rem" }}>
            DAILY #{String(DAILY.day).padStart(3, "0")}
          </div>
          <h1 style={{
            color: "#F0F0F0", fontSize: "clamp(2.8rem,10vw,4.5rem)",
            fontWeight: 900, letterSpacing: "-0.02em", margin: "0 0 0.5rem", lineHeight: 1,
          }}>
            RULE<br /><span style={{ color: "#FF4D6D" }}>BREAKER</span>
          </h1>
          <p style={{
            color: "#C0C0D0", fontSize: "1.1rem", letterSpacing: "0.04em",
            margin: "1.5rem 0 2.5rem", lineHeight: 2,
          }}>
            Words flash. Rules change.<br />
            Three rounds. Each harder than the last.<br />
            <span style={{ color: "#FF4D6D" }}>The rules change with every puzzle.</span>
          </p>
          <button
            style={primaryBtn}
            onClick={() => { setCurrentRound(0); setScreen(SCREENS.ROUND_INTRO); }}
            onMouseEnter={e => e.target.style.background = "#FF2D55"}
            onMouseLeave={e => e.target.style.background = "#FF4D6D"}
          >
            PLAY
          </button>
        </div>
      )}

      {/* ── ROUND INTRO ── */}
      {screen === SCREENS.ROUND_INTRO && (
        <div style={{
          height: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          textAlign: "center", padding: "2rem", maxWidth: 560, margin: "0 auto",
          overflow: "hidden",
        }}>
          <div style={{ ...dim, marginBottom: "2rem" }}>{roundData.label}</div>
          <div style={{ border: "1px solid #222", padding: "2.5rem 2rem", marginBottom: "2.5rem" }}>
            {roundData.desc.split("\n").map((line, i) => (
              <p key={i} style={{
                color: i === 2 ? "#FF4D6D" : "#F0F0F0",
                fontSize: "1.2rem", fontWeight: 700, letterSpacing: "0.03em",
                margin: i === 0 ? 0 : "0.75rem 0 0", lineHeight: 1.6,
              }}>{line}</p>
            ))}
          </div>
          <button style={primaryBtn} onClick={() => setScreen(SCREENS.RULE)}>READY</button>
        </div>
      )}

      {/* ── RULE ── */}
      {screen === SCREENS.RULE && (
        <div style={{
          height: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          textAlign: "center", padding: "2rem", maxWidth: 560, margin: "0 auto",
          overflow: "hidden",
        }}>
          <div style={{ ...dim, marginBottom: "0.5rem" }}>{roundData.label}</div>
          <div style={{ ...dim, color: "#888", marginBottom: "2rem" }}>TODAY'S RULE</div>
          <div style={{ border: "1px solid #222", padding: "3rem 2.5rem", position: "relative", width: "100%" }}>
            <div style={{
              position: "absolute", top: -1, left: 0, height: 2,
              background: "#FF4D6D", width: "100%",
              animation: "shrink 3000ms linear forwards",
            }} />
            <p style={{
              color: "#F0F0F0", fontSize: "clamp(1.3rem,4vw,1.8rem)",
              fontWeight: 700, letterSpacing: "0.02em", margin: 0, lineHeight: 1.5,
            }}>
              {roundData.rules[0]}
            </p>
          </div>
          <div style={{ ...dim, marginTop: "2rem" }}>STARTING IN {ruleCountdown}</div>
        </div>
      )}

      {/* ── SKIP PUZZLE (testing only) ── */}
      {screen !== SCREENS.INTRO && screen !== SCREENS.RESULTS && (
        <button
          onClick={() => {
            const next = currentRound + 1;
            if (next >= DAILY.rounds.length) {
              setRoundResults(prev => prev.map((r, i) => r || Array(DAILY.rounds[i].total).fill({ correct: true })));
              setRoundTimes(prev => prev.map(t => t || 12000));
              setScreen(SCREENS.RESULTS);
            } else {
              setRoundResults(prev => { const u = [...prev]; u[currentRound] = Array(DAILY.rounds[currentRound].total).fill({ correct: true }); return u; });
              setRoundTimes(prev => { const u = [...prev]; u[currentRound] = 12000; return u; });
              setRoundItems(prev => { const u = [...prev]; u[currentRound] = u[currentRound] || buildItems(DAILY.rounds[currentRound]); return u; });
              setCurrentRound(next);
              setScreen(SCREENS.ROUND_INTRO);
            }
          }}
          style={{
            position: "fixed", top: "1rem", right: "1rem", zIndex: 300,
            background: "rgba(255,255,255,0.06)", color: "#666",
            border: "1px solid #333", padding: "0.4rem 0.8rem",
            fontSize: "0.65rem", letterSpacing: "0.15em",
            cursor: "pointer", fontFamily: "'Courier New', monospace",
          }}
        >
          SKIP →
        </button>
      )}

      {/* ── GAME ── */}
      {screen === SCREENS.GAME && !showInversion && (
        <div style={{
          height: "100vh", overflow: "hidden",
          width: "100%",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "2rem 1.25rem",
        }}>
          {/* Compact centered game unit */}
          <div style={{ width: "100%", maxWidth: 600, boxSizing: "border-box" }}>

            {/* Live timer */}
            <div style={{
              textAlign: "center", marginBottom: "1.5rem",
              color: "#C0C0D0", fontSize: "1.1rem", letterSpacing: "0.2em",
              fontVariantNumeric: "tabular-nums",
            }}>
              {formatTime(liveTime)}
            </div>

            {/* Progress bar */}
            <div style={{ width: "100%", height: 3, background: "#1A1A24", marginBottom: "1rem" }}>
              <div style={{
                height: "100%", width: `${progress}%`,
                background: ruleColor,
                transition: "width 0.15s ease, background 0.4s ease",
              }} />
            </div>

            {/* Rule text */}
            <div style={{
              color: ruleColor, fontSize: "0.95rem", letterSpacing: "0.15em",
              marginBottom: "1.25rem", minHeight: "1.5rem",
              transition: "color 0.3s ease", textAlign: "center",
            }}>
              {ruleText.toUpperCase()}
            </div>

            {/* ── SINGLE WORD (Rounds 1 & 3) ── */}
            {!isRound2 && (
              <>
                {/* Word display — fixed height, compact */}
                <div style={{
                  height: "12rem",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{
                    fontSize: "clamp(2.8rem,10vw,5rem)", fontWeight: 900, letterSpacing: "0.1em",
                    color: singleColor(),
                    opacity: (wordVisible || wordColor) ? 1 : 0,
                    transition: "opacity 0.08s ease, color 0.08s ease",
                  }}>
                    {items[currentIndex]?.word}
                  </span>
                </div>

                {/* Action buttons */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", width: "100%" }}>
                  <button
                    onClick={() => handleChoice("rulebreak")}
                    style={{
                      padding: "1.25rem 1rem",
                      fontFamily: mono, fontWeight: 900,
                      fontSize: "clamp(0.9rem,2.5vw,1.1rem)", letterSpacing: "0.1em",
                      whiteSpace: "nowrap",
                      background: btnDisabled ? "#150508" : "rgba(255,77,109,0.12)",
                      color: btnDisabled ? "#3A1A20" : "#FF4D6D",
                      border: `1.5px solid ${btnDisabled ? "#2A0A10" : "#FF4D6D"}`,
                      cursor: btnDisabled ? "default" : "pointer",
                      transition: "all 0.1s ease",
                    }}
                  >
                    RULE BREAK!
                  </button>
                  <button
                    onClick={() => handleChoice("accept")}
                    style={{
                      padding: "1.25rem 1rem",
                      fontFamily: mono, fontWeight: 900,
                      fontSize: "clamp(0.9rem,2.5vw,1.1rem)", letterSpacing: "0.1em",
                      whiteSpace: "nowrap",
                      background: btnDisabled ? "#050F08" : "rgba(0,255,178,0.08)",
                      color: btnDisabled ? "#0A2A18" : "#00FFB2",
                      border: `1.5px solid ${btnDisabled ? "#0A2018" : "#00FFB2"}`,
                      cursor: btnDisabled ? "default" : "pointer",
                      transition: "all 0.1s ease",
                    }}
                  >
                    ACCEPT
                  </button>
                </div>
              </>
            )}

            {/* ── PAIRS (Round 2) ── */}
            {isRound2 && (
              <div style={{ width: "100%" }}>
                {/* One unified box with center divider — fixed 50/50 split */}
                <div style={{
                  display: "flex", height: "14rem",
                }}>
                  {["left", "right"].map(side => (
                    <div
                      key={side}
                      onClick={() => handleChoice(side)}
                      style={{
                        width: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        borderRight: side === "left" ? "1px solid #333" : "none",
                        background: getSideBg(side),
                        cursor: btnDisabled ? "default" : "pointer",
                        opacity: btnDisabled ? 0.55 : 1,
                        transition: "background 0.08s, opacity 0.1s",
                      }}
                    >
                      <span style={{
                        fontSize: "clamp(1rem,3.5vw,2.2rem)", fontWeight: 900, letterSpacing: "0.06em",
                        color: getSideColor(side),
                        opacity: (wordVisible || r2Feedback) ? 1 : 0,
                        transition: "opacity 0.08s ease, color 0.08s ease",
                        whiteSpace: "nowrap", textAlign: "center", padding: "0 1.5rem",
                      }}>
                        {items[currentIndex]?.[side]}
                      </span>
                    </div>
                  ))}
                </div>

                {/* None! button */}
                <button
                  onClick={() => handleChoice(null)}
                  style={{
                    width: "100%", padding: "1.25rem", marginTop: "1.5rem",
                    fontFamily: mono, fontWeight: 900,
                    fontSize: "clamp(0.9rem,2.5vw,1.1rem)", letterSpacing: "0.15em",
                    background: btnDisabled ? "#0F0F18" : "rgba(255,255,255,0.04)",
                    color: btnDisabled ? "#2A2A3A" : "#888",
                    border: `1.5px solid ${btnDisabled ? "#1A1A28" : "#444"}`,
                    cursor: btnDisabled ? "default" : "pointer",
                    transition: "all 0.1s ease",
                  }}
                >
                  NONE!
                </button>
              </div>
            )}

            {/* Counter */}
            <div style={{
              color: "#B0B0C0", fontSize: "0.6rem", letterSpacing: "0.2em",
              textAlign: "center", marginTop: "1.25rem",
            }}>
              {currentIndex + 1} / {TOTAL}
            </div>

          </div>
        </div>
      )}

      {/* ── ROUND SUMMARY ── */}
      {screen === SCREENS.ROUND_SUMMARY && (() => {
        const T      = getTotal(currentRound);
        const score  = getScore(currentRound);
        const time   = roundTimes[currentRound];
        const g      = grade(score / T);
        const isLast = currentRound === DAILY.rounds.length - 1;
        return (
          <div style={{
            height: "100vh", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            textAlign: "center", padding: "2rem", maxWidth: 560, margin: "0 auto",
            overflow: "hidden",
          }}>
            <div style={{ ...dim, marginBottom: "1.5rem" }}>{roundData.label} COMPLETE</div>
            <div style={{
              color: g.color, fontSize: "clamp(2.5rem,9vw,3.5rem)",
              fontWeight: 900, letterSpacing: "0.1em", marginBottom: "0.75rem",
            }}>
              {g.label}
            </div>
            <div style={{ color: "#E0E0E0", fontSize: "1.1rem", letterSpacing: "0.1em", marginBottom: "0.3rem" }}>
              {score} / {T} correct
            </div>
            <div style={{ color: "#999", fontSize: "1rem", letterSpacing: "0.08em", marginBottom: "2.5rem" }}>
              {formatTime(time)}
            </div>
            <button style={primaryBtn} onClick={goNext}>
              {isLast ? "SEE RESULTS" : "NEXT ROUND →"}
            </button>
          </div>
        );
      })()}

      {/* ── RESULTS ── */}
      {screen === SCREENS.RESULTS && (() => {
        const og = overallGrade();
        return (
          <div style={{
            height: "100vh", overflowY: "auto",
            maxWidth: 600, margin: "0 auto",
            padding: "2rem 2rem 1rem", textAlign: "center",
          }}>
            <div style={{ ...dim, marginBottom: "1.5rem" }}>
              RULE BREAKER #{String(DAILY.day).padStart(3, "0")}
            </div>
            <div style={{
              color: og.color, fontSize: "clamp(2.5rem,9vw,3.8rem)",
              fontWeight: 900, letterSpacing: "0.1em", marginBottom: "0.4rem",
            }}>
              {og.label}
            </div>
            <div style={{ color: "#E0E0E0", fontSize: "1.1rem", letterSpacing: "0.1em", marginBottom: "0.25rem" }}>
              {totalScore} / {totalWords} correct
            </div>
            <div style={{ color: "#999", fontSize: "0.95rem", letterSpacing: "0.08em", marginBottom: "2.5rem" }}>
              total time · {formatTime(totalTime)}
            </div>

            {/* Per-round cards */}
            {[0, 1, 2].map(i => {
              const res = roundResults[i] || [];
              const T   = getTotal(i);
              const sc  = getScore(i);
              const g   = grade(sc / T);
              const rd  = DAILY.rounds[i];
              const pts = rd.inversionPoints || [];
              return (
                <div
                  key={i}
                  onClick={() => setReviewRound(i)}
                  style={{
                    background: "#0F0F18", border: "1px solid #1E1E2E",
                    padding: "1.5rem", marginBottom: "1.25rem", textAlign: "left",
                    cursor: "pointer", transition: "border-color 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#444"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "#1E1E2E"}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.25rem" }}>
                    <span style={{ ...dim }}>{rd.label}</span>
                    <span style={{ color: g.color, fontSize: "1.1rem", fontWeight: 900, letterSpacing: "0.1em" }}>
                      {sc}/{T}
                    </span>
                  </div>
                  <div style={{ color: "#777", fontSize: "0.8rem", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
                    {formatTime(roundTimes[i])}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                    {res.map((r, j) => {
                      const phase = pts.reduce((a, pt) => a + (j >= pt ? 1 : 0), 0);
                      const opac  = pts.length === 0 ? 1 : 0.35 + phase * 0.325;
                      return (
                        <div key={j} style={{
                          width: 14, height: 14, borderRadius: 2, boxSizing: "border-box",
                          background: r.correct ? "#00FFB2" : "#FF4D6D",
                          opacity: opac,
                          border: pts.includes(j) ? "1.5px solid #FF4D6D" : "1.5px solid transparent",
                        }} />
                      );
                    })}
                  </div>
                  {pts.length > 0 && (
                    <div style={{ color: "#555", fontSize: "0.6rem", letterSpacing: "0.08em", marginTop: "0.5rem" }}>
                      brighter = later phase · red border = switch point
                    </div>
                  )}
                  <div style={{ color: "#666", fontSize: "0.6rem", letterSpacing: "0.15em", marginTop: "0.75rem", textAlign: "right" }}>
                    TAP TO REVIEW →
                  </div>
                </div>
              );
            })}

            <button
              style={{ ...primaryBtn, background: copied ? "#00FFB2" : "#FF4D6D", marginTop: "0.5rem", transition: "background 0.2s" }}
              onClick={() => {
                navigator.clipboard.writeText(shareText());
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? "COPIED!" : "SHARE RESULT"}
            </button>
            <div style={{ color: "#888", fontSize: "0.75rem", letterSpacing: "0.12em", marginTop: "1rem", paddingBottom: "0.5rem" }}>
              NEXT PUZZLE IN 24H
            </div>
          </div>
        );
      })()}

      <style>{`
        html, body { overflow: hidden; height: 100%; }
        @keyframes shrink { from { width: 100%; } to { width: 0%; } }
        @keyframes drain  { from { width: 100%; } to { width: 0%; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  );
}
