import { useEffect, useRef, useState } from "react";
import { MatchEngine, type UiSnapshot } from "../game/engine";
import { TEAMS, type CareerState, type CupState } from "../game/data";
import {
  ScoreBug,
  IconPlay,
  IconCalendar,
  IconTrophy,
  IconShield,
  IconSquad,
  IconGear,
  IconBall,
} from "../components/ui";
import { sfx } from "../game/audio";

export type ScreenId =
  | "menu"
  | "select"
  | "match"
  | "career"
  | "cup"
  | "teams"
  | "players"
  | "settings";

function DemoPitch() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ui, setUi] = useState<UiSnapshot | null>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const engine = new MatchEngine(
      cv,
      {
        home: TEAMS[0],
        away: TEAMS[1],
        durationSec: 75,
        difficulty: "pro",
        demo: true,
        shake: false,
      },
      setUi
    );
    return () => engine.dispose();
  }, []);

  return (
    <div className="relative w-full aspect-[121/82] bg-ink overflow-hidden border border-line">
      <canvas ref={ref} className="absolute inset-0 w-full h-full" />
      <div className="absolute top-2 left-1/2 -translate-x-1/2 scale-[0.82] origin-top">
        {ui && (
          <ScoreBug
            home={TEAMS[0]}
            away={TEAMS[1]}
            scoreH={ui.scoreH}
            scoreA={ui.scoreA}
            minute={ui.minute}
            small
          />
        )}
      </div>
      <div className="absolute bottom-2 left-2 flex items-center gap-2 text-[11px] font-cond font-semibold tracking-[0.25em] text-fog bg-ink/80 border border-line px-2.5 py-1">
        <span className="w-1.5 h-1.5 bg-red-500 blink-dot" />
        LIVE SIM — FULL ENGINE
      </div>
    </div>
  );
}

const MENU: {
  id: ScreenId;
  num: string;
  label: string;
  sub: string;
  icon: (p: { className?: string }) => React.ReactNode;
}[] = [
  { id: "select", num: "01", label: "Play Match", sub: "Pick two clubs, take the field", icon: IconPlay },
  { id: "career", num: "02", label: "Career", sub: "Seven matchdays, one title", icon: IconCalendar },
  { id: "cup", num: "03", label: "Tournament", sub: "Eight clubs, knockout nights", icon: IconTrophy },
  { id: "teams", num: "04", label: "Clubs", sub: "Kits, ratings and colours", icon: IconShield },
  { id: "players", num: "05", label: "Players", sub: "Star men of the league", icon: IconSquad },
  { id: "settings", num: "06", label: "Settings", sub: "Clock, difficulty, sound", icon: IconGear },
];

export default function MainMenu({
  onNav,
  career,
  cup,
}: {
  onNav: (s: ScreenId) => void;
  career: CareerState | null;
  cup: CupState | null;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const idx = ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6"].indexOf(e.code);
      if (idx >= 0) {
        sfx.ensure();
        sfx.play("select");
        onNav(MENU[idx].id);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onNav]);

  const ticker = [
    "BAR 3 – 2 RMA · NOCHE CLÁSICA",
    "ATM 1 – 1 SEV",
    "VIL 2 – 0 VAL",
    "ATH 3 – 1 BET",
    "PRESS 1–6 TO JUMP STRAIGHT IN",
    "SPACE SHOOTS · X PASSES · SHIFT SPRINTS",
  ];

  return (
    <div className="h-full flex flex-col screen-in relative">
      {/* backdrop */}
      <div className="absolute inset-0 pitch-lines pointer-events-none" />
      <div
        className="absolute -top-1/4 left-[8%] w-[46rem] h-[46rem] pointer-events-none flood-sweep"
        style={{ background: "conic-gradient(from 200deg, rgba(23,105,255,0.14), transparent 24%)" }}
      />
      <div
        className="absolute -bottom-1/3 right-[4%] w-[42rem] h-[42rem] pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(108,59,255,0.13), transparent 60%)" }}
      />

      <div className="relative flex-1 min-h-0 w-full max-w-[1500px] mx-auto px-6 lg:px-10 py-6 grid lg:grid-cols-[1.15fr_1fr] gap-8 items-center">
        {/* left: identity + menu */}
        <div>
          <div className="flex items-center gap-3 mb-5 rise-in" style={{ animationDelay: "0.05s" }}>
            <span className="tag-clip bg-cyan text-ink font-cond font-bold text-xs tracking-[0.3em] px-3 py-1">
              SEASON 26
            </span>
            <span className="font-cond text-dim tracking-[0.3em] text-xs font-semibold">
              FLOODLIT ELEVEN-A-SIDE
            </span>
          </div>

          <h1
            className="font-display leading-[0.82] rise-in"
            style={{ animationDelay: "0.1s", fontSize: "clamp(4.5rem, 11vw, 9.5rem)" }}
          >
            <span className="text-white block tracking-[0.02em]">CLÁSICO</span>
            <span className="block" style={{ color: "#00E5FF", textShadow: "0 0 42px rgba(0,229,255,0.5)" }}>
              NIGHTS
            </span>
          </h1>
          <p className="mt-4 mb-8 max-w-md text-fog/90 text-lg leading-snug rise-in" style={{ animationDelay: "0.16s" }}>
            Full-stadium arcade football. Twenty-two players, one ball,
            a wall of noise — and the floodlights never switch off.
          </p>

          <nav className="flex flex-col max-w-xl rise-in" style={{ animationDelay: "0.22s" }}>
            {MENU.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  sfx.ensure();
                  sfx.play("select");
                  onNav(m.id);
                }}
                onMouseEnter={() => sfx.play("hover")}
                className="menu-row group flex items-center gap-5 py-3.5 pr-4 text-left border-b border-line/70 cursor-pointer"
              >
                <span className="font-display text-dim text-xl w-9 group-hover:text-cyan transition-colors">
                  {m.num}
                </span>
                <span className="text-electric opacity-70 group-hover:opacity-100 group-hover:text-cyan transition-colors">
                  {m.icon({ className: "w-6 h-6" })}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-display text-4xl tracking-[0.05em] text-white leading-none group-hover:text-cyan transition-colors">
                    {m.label.toUpperCase()}
                  </span>
                  <span className="block font-cond text-dim text-sm tracking-[0.14em] mt-1">
                    {m.sub.toUpperCase()}
                  </span>
                </span>
                <span className="font-display text-2xl text-line group-hover:text-cyan group-hover:translate-x-1 transition-all">
                  ›
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* right: featured live sim + saves */}
        <div className="flex flex-col gap-4 min-w-0 rise-in" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center justify-between">
            <span className="font-cond font-semibold tracking-[0.3em] text-xs text-fog">
              FEATURED FIXTURE
            </span>
            <span className="font-cond text-dim text-xs tracking-[0.2em]">AI VS AI · SAME PHYSICS</span>
          </div>
          <DemoPitch />

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => {
                sfx.ensure();
                sfx.play("select");
                onNav("career");
              }}
              className="text-left bg-panel border border-line hover:border-electric p-4 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2 text-electric mb-2">
                <IconCalendar className="w-4 h-4" />
                <span className="font-cond font-bold tracking-[0.25em] text-xs">CAREER</span>
              </div>
              {career && !career.done ? (
                <p className="text-fog text-sm font-cond tracking-wide">
                  Matchday {Math.min(career.round + 1, career.schedule.length)} of {career.schedule.length}
                  <span className="block text-dim">Season {career.season} in progress</span>
                </p>
              ) : career?.done ? (
                <p className="text-cyan text-sm font-cond tracking-wide">Season complete — crown awaits</p>
              ) : (
                <p className="text-dim text-sm font-cond tracking-wide">Start a new season</p>
              )}
            </button>
            <button
              onClick={() => {
                sfx.ensure();
                sfx.play("select");
                onNav("cup");
              }}
              className="text-left bg-panel border border-line hover:border-electric p-4 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2 text-purple mb-2">
                <IconTrophy className="w-4 h-4" />
                <span className="font-cond font-bold tracking-[0.25em] text-xs">CUP RUN</span>
              </div>
              {cup && cup.stage < 3 ? (
                <p className="text-fog text-sm font-cond tracking-wide">
                  {["Quarter-finals", "Semi-finals", "The Final"][cup.stage]}
                  <span className="block text-dim">Knockout football</span>
                </p>
              ) : cup?.champion ? (
                <p className="text-cyan text-sm font-cond tracking-wide">Champions — lift it again?</p>
              ) : (
                <p className="text-dim text-sm font-cond tracking-wide">Draw a fresh bracket</p>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ticker */}
      <div className="relative border-t border-line bg-panel/80 overflow-hidden">
        <div className="flex whitespace-nowrap marquee-track">
          {[0, 1].map((rep) => (
            <div key={rep} className="flex items-center">
              {ticker.map((t, i) => (
                <span key={`${rep}-${i}`} className="flex items-center">
                  <span className="font-cond font-semibold tracking-[0.22em] text-sm text-fog px-6 py-2.5">
                    {t}
                  </span>
                  <span className="text-cyan">
                    <IconBall className="w-3 h-3" />
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
