import { useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";
import { buildSeed32 } from "./lib/entropy";
import { buildLore } from "./lib/lore";
import { createRng, mixSeed, nextInt, type Rng } from "./lib/rng";
import { parseOptions } from "./lib/parse";

type MachineState = "IDLE" | "COLLECTING" | "SPINNING" | "FINAL";

type Universe = {
  id: number;
  word: string;
  size: number;
  interval: number;
  delay: number;
  frozen: boolean;
};

const UNIVERSE_COUNT = 12;
const COLLECT_DURATION_MS = 2000;
const COLLAPSE_PAUSE_MS = 700;
const FREEZE_BASE_DELAY = 120;
const FREEZE_VARIANCE = 380;

function App() {
  const [state, setState] = useState<MachineState>("IDLE");
  const [optionsText, setOptionsText] = useState("");
  const [seed, setSeed] = useState<number | null>(null);
  const [universes, setUniverses] = useState<Universe[]>([]);
  const [finalOption, setFinalOption] = useState("");
  const [finalLore, setFinalLore] = useState("");
  const [isCollapsing, setIsCollapsing] = useState(false);

  const entropyRef = useRef<number[]>([]);
  const lastEventRef = useRef<number>(0);
  const intervalIdsRef = useRef<number[]>([]);
  const timeoutIdsRef = useRef<number[]>([]);
  const freezeTimeoutIdsRef = useRef<number[]>([]);
  const universeRngsRef = useRef<Rng[]>([]);
  const freezeDelaysRef = useRef<number[]>([]);

  const options = useMemo(() => parseOptions(optionsText), [optionsText]);

  const staticUniverses = useMemo<Universe[]>(() => {
    const labels = options.length > 0 ? options : ["Stille"];
    const sizes = [0.84, 0.92, 0.88, 0.96, 0.86, 0.9, 0.93, 0.87, 0.95, 0.89, 0.91, 0.85];
    return Array.from({ length: UNIVERSE_COUNT }, (_, index) => ({
      id: index,
      word: labels[index % labels.length],
      size: sizes[index % sizes.length],
      interval: 0,
      delay: (index * 37) % 200,
      frozen: true,
    }));
  }, [options]);

  const displayUniverses = state === "SPINNING" || state === "FINAL" ? universes : staticUniverses;

  const resetTimers = () => {
    intervalIdsRef.current.forEach((id) => window.clearInterval(id));
    intervalIdsRef.current = [];
    timeoutIdsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutIdsRef.current = [];
    freezeTimeoutIdsRef.current.forEach((id) => window.clearTimeout(id));
    freezeTimeoutIdsRef.current = [];
  };

  const startSpinning = (seedValue: number) => {
    const rng = createRng(seedValue);
    const nextUniverses: Universe[] = [];
    const nextRngs: Rng[] = [];
    const nextFreezeDelays: number[] = [];

    for (let i = 0; i < UNIVERSE_COUNT; i += 1) {
      const size = 0.82 + rng() * 0.26;
      const interval = 320 + rng() * 520;
      const delay = rng() * 420;
      const universeSeed = mixSeed(seedValue, 0x9e3779b9 + i * 97);
      const universeRng = createRng(universeSeed);
      const word = options[nextInt(universeRng, options.length)];

      nextUniverses.push({
        id: i,
        word,
        size,
        interval,
        delay,
        frozen: false,
      });
      nextRngs.push(universeRng);
      nextFreezeDelays.push(FREEZE_BASE_DELAY + rng() * FREEZE_VARIANCE);
    }

    universeRngsRef.current = nextRngs;
    freezeDelaysRef.current = nextFreezeDelays;
    setUniverses(nextUniverses);

    nextUniverses.forEach((universe) => {
      const timeoutId = window.setTimeout(() => {
        const intervalId = window.setInterval(() => {
          setUniverses((prev) =>
            prev.map((item) => {
              if (item.id !== universe.id || item.frozen) return item;
              const universeRng = universeRngsRef.current[item.id];
              const wordIndex = nextInt(universeRng, options.length);
              return { ...item, word: options[wordIndex] };
            })
          );
        }, universe.interval);
        intervalIdsRef.current[universe.id] = intervalId;
      }, universe.delay);
      timeoutIdsRef.current.push(timeoutId);
    });

    const resultSeed = mixSeed(seedValue, 0xa5a5a5a5);
    const resultRng = createRng(resultSeed);
    const chosen = options[nextInt(resultRng, options.length)];
    const loreSeed = mixSeed(seedValue, 0x1b873593);
    const loreRng = createRng(loreSeed);
    setFinalOption(chosen);
    setFinalLore(buildLore(chosen, loreRng));
  };

  useEffect(() => {
    if (state !== "COLLECTING") return undefined;

    entropyRef.current = [];
    lastEventRef.current = performance.now();

    const recordEntropy = (value: number) => {
      const now = performance.now();
      const delta = Math.max(0, now - lastEventRef.current);
      lastEventRef.current = now;
      entropyRef.current.push(((delta * 1000) | 0) ^ value);
    };

    const handleMove = (event: MouseEvent) => {
      recordEntropy(((event.clientX & 0xffff) << 16) ^ (event.clientY & 0xffff));
    };

    const handleKey = (event: KeyboardEvent) => {
      recordEntropy(event.keyCode);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("keydown", handleKey);

    const timerId = window.setTimeout(() => {
      const nextSeed = buildSeed32(entropyRef.current);
      setSeed(nextSeed);
      setState("SPINNING");
    }, COLLECT_DURATION_MS);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("keydown", handleKey);
      window.clearTimeout(timerId);
    };
  }, [state]);

  useEffect(() => {
    if (state !== "SPINNING" || seed === null) return undefined;
    resetTimers();
    setIsCollapsing(false);
    startSpinning(seed);

    return () => {
      resetTimers();
    };
  }, [state, seed]);

  const handleStart = () => {
    if (state !== "IDLE" || options.length < 2) return;
    setSeed(null);
    setFinalOption("");
    setFinalLore("");
    setIsCollapsing(false);
    setState("COLLECTING");
  };

  const handleCollapse = () => {
    if (state !== "SPINNING" || isCollapsing) return;
    setIsCollapsing(true);
    resetTimers();

    freezeDelaysRef.current.forEach((delay, index) => {
      const timeoutId = window.setTimeout(() => {
        setUniverses((prev) =>
          prev.map((item) => (item.id === index ? { ...item, frozen: true } : item))
        );
      }, delay);
      freezeTimeoutIdsRef.current.push(timeoutId);
    });

    const finalizeId = window.setTimeout(() => {
      setState("FINAL");
    }, COLLAPSE_PAUSE_MS);
    freezeTimeoutIdsRef.current.push(finalizeId);
  };

  const handleCopy = async () => {
    if (!finalOption) return;
    try {
      await navigator.clipboard.writeText(finalOption);
    } catch {
      // silent fail
    }
  };

  const handleRestart = () => {
    resetTimers();
    setIsCollapsing(false);
    setSeed(null);
    setUniverses([]);
    setFinalOption("");
    setFinalLore("");
    setState("IDLE");
  };

  const isInputLocked = state === "COLLECTING" || state === "SPINNING";
  const canStart = state === "IDLE" && options.length >= 2;

  const phaseClass = `phase-${state.toLowerCase()}`;
  const intensityMap: Record<MachineState, number> = {
    IDLE: 0.08,
    COLLECTING: 0.55,
    SPINNING: 1,
    FINAL: 0.12,
  };
  const intensity = intensityMap[state];

  const containerStyle = {
    "--seed": seed ?? 0,
    "--intensity": intensity,
  } as React.CSSProperties;

  const buildUniverseStyle = (id: number, size: number) => {
    const base = seed ?? 0;
    const hash = ((base ^ (id * 9301 + 49297)) * 233280) >>> 0;
    const rot = (hash % 60) / 100 - 0.3;
    const shift = ((hash >> 6) % 20) / 10 - 1;
    const shiftY = ((hash >> 11) % 20) / 10 - 1;
    const scale = 0.985 + ((hash >> 16) % 50) / 2000;

    return {
      transform: `translate(${shift}px, ${shiftY}px) rotate(${rot}deg) scale(${size * scale})`,
    };
  };

  return (
    <div
      className={`app-shell ${phaseClass} ${isCollapsing ? "is-collapsing" : ""}`}
      style={containerStyle}
    >
      <div className={`app state-${state.toLowerCase()}`}>
        <header className="header">
          <h1>Chaos Portal Randomizer</h1>
          <p>Du erzeugst Chaos – das Multiversum wählt.</p>
        </header>

        <section className="controls">
          <label htmlFor="options">Optionen</label>
          <textarea
            id="options"
            value={optionsText}
            onChange={(event) => setOptionsText(event.target.value)}
            placeholder="Optionen eingeben"
            disabled={isInputLocked}
            rows={4}
          />
          <div className="controls-footer">
            <span>Mindestens 2 Optionen erforderlich.</span>
            {state === "IDLE" && (
              <button onClick={handleStart} disabled={!canStart}>
                Chaos starten
              </button>
            )}
            {state === "COLLECTING" && <span className="status">Entropie sammelt.</span>}
            {state === "SPINNING" && (
              <button onClick={handleCollapse} disabled={isCollapsing}>
                Realität kollabieren
              </button>
            )}
            {state === "FINAL" && (
              <div className="final-actions">
                <button onClick={handleCopy} disabled={!finalOption}>
                  Ergebnis kopieren
                </button>
                <button onClick={handleRestart}>Nochmal</button>
              </div>
            )}
          </div>
        </section>

        <section className="multiverse" aria-label="Multiversum">
          {displayUniverses.map((universe) => (
            <div
              key={universe.id}
              className={`universe ${universe.frozen ? "frozen" : ""}`}
              style={{
                ...buildUniverseStyle(universe.id, universe.size),
                transitionDelay: `${universe.delay}ms`,
              }}
            >
              <span>{universe.word}</span>
            </div>
          ))}
        </section>

        <section className="result" aria-live="polite">
          {state === "FINAL" && (
            <div className="result-card">
              <div className="result-word">{finalOption}</div>
              <div className="result-lore">{finalLore}</div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
