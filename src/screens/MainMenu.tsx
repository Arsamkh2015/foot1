import { useEffect, useMemo, useRef, useState } from "react";
import { MatchEngine, type UiSnapshot } from "../game/engine";
import { teamById, type CareerState, type CupState } from "../game/data";
import {
  IconPlay,
  IconCalendar,
  IconTrophy,
  IconShield,
  IconSquad,
  IconGear,
  IconChevron,
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

const MENU: {
  id: ScreenId;
  num: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  { id: "select", num: "01", title: "PLAY MATCH", desc: "CHOOSE YOUR TEAMS", icon: <IconPlay className="w-[18px] h-[18px]" /> },
  { id: "career", num: "02", title: "CAREER", desc: "BUILD YOUR LEGACY", icon: <IconCalendar className="w-[18px] h-[18px]" /> },
  { id: "cup", num: "03", title: "TOURNAMENT", desc: "COMPETE FOR THE CUP", icon: <IconTrophy className="w-[18px] h-[18px]" /> },
  { id: "teams", num: "04", title: "CLUBS", desc: "TEAMS • KITS • RATINGS", icon: <IconShield className="w-[18px] h-[18px]" /> },
  { id: "players", num: "05", title: "PLAYERS", desc: "STAR MEN OF THE LEAGUE", icon: <IconSquad className="w-[18px] h-[18px]" /> },
  { id: "settings", num: "06", title: "SETTINGS", desc: "GAME • SOUND • CONTROLS", icon: <IconGear className="w-[18px] h-[18px]" /> },
];

// deterministic pseudo-random for ambient particles
const prand = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const PARTICLES = Array.from({ length: 26 }, (_, i) => ({
  left: prand(i, 1) * 100,
  top: prand(i, 2) * 100,
  size: 1.5 + prand(i, 3) * 2.5,
  dur: 9 + prand(i, 4) * 14,
  delay: -prand(i, 5) * 20,
  op: 0.12 + prand(i, 6) * 0.3,
}));

function LivePreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ui, setUi] = useState<UiSnapshot | null>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const eng = new MatchEngine(
      cv,
      {
        home: teamById("bar"),
        away: teamById("rma"),
        durationSec: 90,
        difficulty: "pro",
        demo: true,
        shake: true,
      },
      setUi
    );
    return () => eng.dispose();
  }, []);

  const clock = ui ? Math.max(0, 90 - ui.timeLeft) : 0;
  const mm = String(Math.floor(clock / 60)).padStart(2, "0");
  const ss = String(Math.floor(clock % 60)).padStart(2, "0");

  return (
    <div className="relative border border-line bg-[#060b1e]">
      {/* corner brackets */}
      {[
        "top-0 left-0 border-t-2 border-l-2",
        "top-0 right-0 border-t-2 border-r-2",
        "bottom-0 left-0 border-b-2 border-l-2",
        "bottom-0 right-0 border-b-2 border-r-2",
      ].map((c) => (
        <span key={c} className={`absolute w-4 h-4 border-cyan/80 ${c} pointer-events-none z-10`} />
      ))}

      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-line bg-panel/70">
        <span className="w-2 h-2 bg-[#ff3b5c] blink-dot rounded-full" />
        <span className="font-display text-lg tracking-[0.2em] text-white leading-none">LIVE SIM</span>
        <span className="h-3 w-px bg-line" />
        <span className="font-cond text-[11px] tracking-[0.3em] text-dim">FULL MATCH ENGINE</span>
        <span className="flex-1" />
        <span className="font-cond text-[11px] tracking-[0.2em] text-cyan/80">11 V 11</span>
      </div>

      <div className="relative">
        <canvas ref={canvasRef} className="w-full aspect-[16/9.6] block" />
        {ui && (
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-ink/85 border border-line px-4 py-1.5 backdrop-blur-sm">
            <span className="font-display text-base tracking-[0.14em] text-white">
              {teamById("bar").short}
            </span>
            <span className="font-display text-xl text-cyan tabular-nums leading-none">
              {ui.scoreH} — {ui.scoreA}
            </span>
            <span className="font-display text-base tracking-[0.14em] text-white">
              {teamById("rma").short}
            </span>
            <span className="h-3.5 w-px bg-line" />
            <span className="font-cond font-bold text-xs text-fog tabular-nums tracking-wider">
              {mm}:{ss}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-t border-line bg-panel/70">
        <span className="font-cond text-[11px] tracking-[0.25em] text-dim">
          BARCELONA <span className="text-cyan">BLUE/RED</span> — REAL MADRID{" "}
          <span className="text-cyan">WHITE/PINK</span>
        </span>
        <span className="font-cond text-[11px] tracking-[0.25em] text-dim">
          ESTADIO NOCTURNO · 21:45 CET
        </span>
      </div>
    </div>
  );
}

export default function MainMenu({
  onNav,
  career,
  cup,
}: {
  onNav: (s: ScreenId) => void;
  career: CareerState | null;
  cup: CupState | null;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const idx = ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6"].indexOf(e.code);
      if (idx >= 0) {
        sfx.ensure();
        sfx.play("select");
        onNav(MENU[idx].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNav]);

  const ticker = useMemo(() => {
    const items: string[] = [];
    if (career) {
      const last = career.history[career.history.length - 1];
      if (last) items.push(last.toUpperCase());
      const rows = Object.entries(career.table)
        .map(([teamId, r]) => ({ teamId, pts: r.w * 3 + r.d }))
        .sort((a, b) => b.pts - a.pts);
      const pos = rows.findIndex((r) => r.teamId === career.userTeam) + 1;
      if (pos > 0) items.push(`LEAGUE TABLE — P${pos} · ${rows[pos - 1].pts} PTS`);
    }
    if (cup) {
      items.push(
        cup.champion
          ? `NIGHT CUP CHAMPIONS — ${teamById(cup.champion).name.toUpperCase()}`
          : `NIGHT CUP — ${["QUARTER-FINALS", "SEMI-FINALS", "THE FINAL"][Math.min(cup.stage, 2)]}`
      );
    }
    items.push(
      "EL CLÁSICO — UNDER THE FLOODLIGHTS",
      "SEASON 26 NOW LIVE",
      "NIGHT CUP DRAW OPEN",
      "11 V 11 · FULL SIM ENGINE"
    );
    return items;
  }, [career, cup]);

  return (
    <div className="h-full overflow-y-auto screen-in relative">
      {/* thin futuristic lines + faint stadium arc */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <svg className="absolute -right-40 -top-40 w-[56rem] h-[56rem] opacity-[0.05]" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="96" fill="none" stroke="#00E5FF" strokeWidth="0.6" />
          <circle cx="100" cy="100" r="70" fill="none" stroke="#00A8FF" strokeWidth="0.4" />
          <path d="M100 4v192M4 100h192" stroke="#00E5FF" strokeWidth="0.35" />
        </svg>
        {[18, 38, 62, 82].map((top, i) => (
          <div
            key={top}
            className="absolute left-0 right-0 h-px"
            style={{
              top: `${top}%`,
              background:
                "linear-gradient(90deg, transparent, rgba(0,168,255,0.10) 30%, rgba(0,229,255,0.16) 50%, rgba(0,168,255,0.10) 70%, transparent)",
              opacity: 0.5 + i * 0.12,
            }}
          />
        ))}
        {/* floodlight glows */}
        <div
          className="absolute -top-24 left-[8%] w-[30rem] h-[30rem] flood-sweep"
          style={{ background: "radial-gradient(circle, rgba(0,168,255,0.10), transparent 60%)" }}
        />
        <div
          className="absolute -bottom-32 right-[4%] w-[26rem] h-[26rem]"
          style={{ background: "radial-gradient(circle, rgba(108,59,255,0.10), transparent 60%)" }}
        />
        {/* particles */}
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-cyan"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
              opacity: p.op,
              animation: `floatP ${p.dur}s ease-in-out ${p.delay}s infinite`,
            }}
          />
        ))}
        <style>{`@keyframes floatP { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-26px); } }`}</style>
      </div>

      <div className="relative max-w-[1400px] mx-auto px-6 lg:px-10 py-8 lg:py-10 min-h-full flex flex-col">
        {/* header strip */}
        <div className="flex items-center gap-4 mb-8 lg:mb-10">
          <span className="tag-clip bg-cyan text-ink font-display text-sm tracking-[0.2em] px-3 py-1 leading-none">
            SEASON 26
          </span>
          <span className="h-px flex-1 bg-line" />
          <span className="font-cond text-[11px] tracking-[0.35em] text-dim hidden sm:block">
            ELITE FOOTBALL INTERFACE · BUILD 26.1
          </span>
        </div>

        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-14 items-start flex-1">
          {/* left — identity + menu */}
          <div>
            <div className="rise-in" style={{ animationDelay: "0.05s" }}>
              <h1
                className="font-display text-white leading-[0.86] tracking-[0.01em] text-[clamp(4.5rem,10vw,8.5rem)]"
                style={{ textShadow: "0 0 60px rgba(23,105,255,0.35), 0 4px 0 rgba(4,8,24,0.9)" }}
              >
                CLÁSSICO
              </h1>
              <div className="flex items-center gap-4 mt-3">
                <span className="w-10 h-[3px] bg-cyan" />
                <span className="font-display text-xl lg:text-2xl tracking-[0.42em] text-electric">
                  ELITE FOOTBALL
                </span>
              </div>
              <p className="font-cond text-fog/70 tracking-[0.2em] text-sm mt-3 max-w-md">
                ELEVEN AGAINST ELEVEN UNDER THE FLOODLIGHTS. ONE ENGINE. ONE NIGHT. ONE CLÁSICO.
              </p>
            </div>

            <nav className="mt-10 lg:mt-12 border-t border-line/70">
              {MENU.map((m, i) => {
                const active = hovered === m.id;
                return (
                  <button
                    key={m.id}
                    onMouseEnter={() => {
                      setHovered(m.id);
                      sfx.ensure();
                      sfx.play("hover");
                    }}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => {
                      sfx.play("select");
                      onNav(m.id);
                    }}
                    className={`rise-in group relative w-full flex items-center gap-5 lg:gap-7 px-2 lg:px-4 py-[1.05rem] border-b border-line/70 text-left transition-all duration-200 cursor-pointer ${
                      active ? "bg-white/[0.035]" : ""
                    }`}
                    style={{ animationDelay: `${0.12 + i * 0.06}s` }}
                  >
                    {/* cyan selection indicator */}
                    <span
                      className={`absolute left-0 top-0 bottom-0 w-[3px] bg-cyan transition-all duration-200 ${
                        active ? "opacity-100 shadow-[0_0_14px_rgba(0,229,255,0.9)]" : "opacity-0"
                      }`}
                    />
                    <span
                      className={`font-display text-2xl lg:text-[1.7rem] w-10 tabular-nums transition-colors duration-200 ${
                        active ? "text-cyan" : "text-dim"
                      }`}
                    >
                      {m.num}
                    </span>
                    <span
                      className={`transition-colors duration-200 ${active ? "text-cyan" : "text-dim group-hover:text-fog"}`}
                    >
                      {m.icon}
                    </span>
                    <span
                      className={`flex-1 transition-transform duration-200 ${active ? "translate-x-1.5" : ""}`}
                    >
                      <span
                        className={`block font-display text-[1.65rem] lg:text-3xl tracking-[0.08em] leading-none transition-colors duration-200 ${
                          active ? "text-white" : "text-white/85"
                        }`}
                      >
                        {m.title}
                      </span>
                      <span
                        className={`block font-cond text-[11px] lg:text-xs tracking-[0.3em] mt-1 transition-colors duration-200 ${
                          active ? "text-cyan/90" : "text-dim"
                        }`}
                      >
                        {m.desc}
                      </span>
                    </span>
                    <IconChevron
                      className={`w-5 h-5 text-cyan transition-all duration-200 ${
                        active ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                      }`}
                    />
                  </button>
                );
              })}
            </nav>

            <div className="mt-6 flex items-center gap-4 font-cond text-[11px] tracking-[0.25em] text-dim">
              <span>PRESS 1–6 TO NAVIGATE</span>
              <span className="w-1 h-1 bg-line rounded-full" />
              <span>KEYBOARD + TOUCH</span>
            </div>
          </div>

          {/* right — live match preview */}
          <div className="rise-in lg:sticky lg:top-10" style={{ animationDelay: "0.2s" }}>
            <LivePreview />
            <div className="grid grid-cols-3 gap-2.5 mt-4">
              {[
                { k: "MODE", v: "QUICK MATCH" },
                { k: "CLOCK", v: "90'" },
                { k: "LEVEL", v: "PRO" },
              ].map((s) => (
                <div key={s.k} className="border border-line bg-panel/60 px-3 py-2.5">
                  <div className="font-cond text-[10px] tracking-[0.3em] text-dim">{s.k}</div>
                  <div className="font-display text-lg text-white tracking-[0.1em] leading-tight">{s.v}</div>
                </div>
              ))}
            </div>
            <p className="font-cond text-[11px] tracking-[0.22em] text-dim mt-4 leading-relaxed">
              THE SIMULATION RUNNING HERE IS THE SAME ENGINE YOU PLAY. SELECT{" "}
              <span className="text-cyan">01 — PLAY MATCH</span> TO TAKE CONTROL.
            </p>
          </div>
        </div>

        {/* results ticker */}
        <div className="mt-10 border-y border-line/70 py-2.5 overflow-hidden relative">
          <div className="flex whitespace-nowrap marquee-track">
            {[0, 1].map((half) => (
              <div key={half} className="flex shrink-0">
                {ticker.map((tx, i) => (
                  <span
                    key={`${half}-${i}`}
                    className="font-cond text-xs tracking-[0.28em] text-fog/60 px-6 flex items-center gap-6"
                  >
                    <span className="text-cyan/70">▮</span> {tx}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between py-4 font-cond text-[10px] tracking-[0.3em] text-dim/70">
          <span>CLÁSSICO — ELITE FOOTBALL</span>
          <span className="hidden sm:block">ENGINE CLASICO-CORE · 60 FPS · NO SERVERS REQUIRED</span>
        </div>
      </div>
    </div>
  );
}
