import { useEffect, useMemo, useRef, useState } from "react";
import { MatchEngine, type UiSnapshot } from "../game/engine";
import type { TeamDef, Settings, Difficulty } from "../game/data";
import { KitDisc, BigBtn, GhostBtn, KeyCap } from "../components/ui";
import { sfx } from "../game/audio";

type Ctx = "friendly" | "career" | "cup";

const fmtClock = (sec: number) => {
  const s = Math.max(0, sec);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

// ------------------------------------------------------------------
// Circular semi-transparent action buttons
// ------------------------------------------------------------------

function ActionBtn({
  label,
  keyHint,
  size,
  accent,
  onPress,
  className = "",
}: {
  label: string;
  keyHint: string;
  size: number;
  accent: string;
  onPress: () => void;
  className?: string;
}) {
  const [down, setDown] = useState(false);
  return (
    <button
      className={`relative rounded-full select-none touch-none cursor-pointer flex flex-col items-center justify-center gap-0.5 border backdrop-blur-[3px] transition-transform duration-75 active:scale-90 ${className}`}
      style={{
        width: size,
        height: size,
        background: down ? "rgba(0,229,255,0.16)" : "rgba(13,21,48,0.55)",
        borderColor: down ? accent : "rgba(184,194,217,0.28)",
        boxShadow: down ? `0 0 22px ${accent}66` : `0 0 14px rgba(0,0,0,0.35), inset 0 0 18px rgba(0,168,255,0.05)`,
      }}
      onPointerDown={(e) => {
        e.preventDefault();
        setDown(true);
        onPress();
      }}
      onPointerUp={() => setDown(false)}
      onPointerLeave={() => setDown(false)}
    >
      <span
        className="font-display leading-none text-white"
        style={{ fontSize: size * 0.19, letterSpacing: "0.12em", textShadow: `0 0 12px ${accent}88` }}
      >
        {label}
      </span>
      <span className="font-cond text-[9px] tracking-[0.2em] text-fog/60 hidden md:block">{keyHint}</span>
    </button>
  );
}

// ------------------------------------------------------------------
// Virtual joystick (touch devices)
// ------------------------------------------------------------------

function Joystick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const activeId = useRef<number | null>(null);

  const setFromEvent = (e: React.PointerEvent) => {
    const el = baseRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }
    setKnob({ x: dx, y: dy });
    onMove(dx, dy);
  };

  return (
    <div
      ref={baseRef}
      className="relative rounded-full border border-fog/20 bg-ink/40 backdrop-blur-[3px] touch-none"
      style={{ width: 128, height: 128, boxShadow: "inset 0 0 24px rgba(0,168,255,0.08)" }}
      onPointerDown={(e) => {
        activeId.current = e.pointerId;
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        setFromEvent(e);
      }}
      onPointerMove={(e) => {
        if (activeId.current === e.pointerId) setFromEvent(e);
      }}
      onPointerUp={(e) => {
        if (activeId.current === e.pointerId) {
          activeId.current = null;
          setKnob({ x: 0, y: 0 });
          onMove(0, 0);
        }
      }}
      onPointerCancel={() => {
        activeId.current = null;
        setKnob({ x: 0, y: 0 });
        onMove(0, 0);
      }}
    >
      <div
        className="absolute rounded-full border border-cyan/50 bg-electric/30"
        style={{
          width: 52,
          height: 52,
          left: "50%",
          top: "50%",
          transform: `translate(calc(-50% + ${knob.x * 34}px), calc(-50% + ${knob.y * 34}px))`,
          boxShadow: "0 0 16px rgba(0,229,255,0.35)",
          transition: activeId.current === null ? "transform 0.15s ease" : "none",
        }}
      />
    </div>
  );
}

// ------------------------------------------------------------------

export default function MatchScreen({
  home,
  away,
  settings,
  context,
  onResult,
  onExit,
}: {
  home: TeamDef;
  away: TeamDef;
  settings: Settings;
  context: Ctx;
  onResult: (gh: number, ga: number) => void;
  onExit: (dest: "menu" | "select" | "career" | "cup") => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engRef = useRef<MatchEngine | null>(null);
  const reportedRef = useRef(false);
  const [ui, setUi] = useState<UiSnapshot | null>(null);
  const isTouch = useMemo(() => "ontouchstart" in window || navigator.maxTouchPoints > 0, []);
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    const check = () => setPortrait(window.innerHeight > window.innerWidth);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    sfx.ensure();
    const eng = new MatchEngine(
      cv,
      {
        home,
        away,
        durationSec: settings.duration,
        difficulty: settings.difficulty as Difficulty,
        demo: false,
        shake: settings.shake,
      },
      setUi
    );
    engRef.current = eng;
    reportedRef.current = false;
    return () => {
      eng.dispose();
      engRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fulltime = ui?.phase === "fulltime";
  useEffect(() => {
    if (fulltime && !reportedRef.current && ui) {
      reportedRef.current = true;
      const t = setTimeout(() => onResult(ui.scoreH, ui.scoreA), 300);
      return () => clearTimeout(t);
    }
  }, [fulltime, ui, onResult]);

  const exitDest: "menu" | "career" | "cup" = context === "career" ? "career" : context === "cup" ? "cup" : "menu";
  const ctxLabel =
    context === "career" ? "LEAGUE MATCHDAY" : context === "cup" ? "NIGHT CUP TIE" : "FRIENDLY";

  const scoreKey = ui ? `${ui.scoreH}-${ui.scoreA}` : "0-0";
  const goalFlash = ui?.phase === "goal";

  return (
    <div className="h-full flex flex-col screen-in relative overflow-hidden">
      {/* top broadcast bar */}
      <div className="relative z-20 flex items-center justify-center px-3 pt-2.5 pb-1.5">
        <div className="absolute left-3 top-2.5 flex items-center gap-2">
          <span className="tag-clip bg-panel2 border border-line px-2.5 py-1 font-cond text-[10px] tracking-[0.3em] text-fog">
            {ctxLabel}
          </span>
          {isTouch && (
            <button
              className="tag-clip bg-panel2 border border-line px-2.5 py-1 font-cond text-[10px] tracking-[0.3em] text-fog active:text-cyan"
              onClick={() => {
                sfx.ensure();
                sfx.play("click");
                engRef.current?.setPaused(true);
              }}
            >
              PAUSE
            </button>
          )}
        </div>

        {/* scoreboard */}
        <div
          key={scoreKey}
          className={`pop-in flex items-stretch border ${
            goalFlash ? "border-cyan shadow-[0_0_34px_rgba(0,229,255,0.35)]" : "border-line"
          } bg-ink/90 backdrop-blur-sm`}
        >
          <div className="flex items-center gap-2.5 pl-3.5 pr-3 py-1.5 bg-panel/80">
            <KitDisc team={home} size={26} />
            <span className="font-display text-xl tracking-[0.12em] text-white leading-none">{home.short}</span>
          </div>
          <div className="flex flex-col items-center justify-center px-4 bg-ink">
            <span className="font-display text-3xl leading-none text-white tabular-nums">
              <span className={goalFlash ? "text-cyan" : ""}>{ui?.scoreH ?? 0}</span>
              <span className="text-dim mx-2 text-xl">—</span>
              <span className={goalFlash ? "text-cyan" : ""}>{ui?.scoreA ?? 0}</span>
            </span>
            <span className="font-cond font-bold text-[11px] text-cyan tabular-nums tracking-[0.2em] mt-0.5">
              {fmtClock(settings.duration - (ui?.timeLeft ?? settings.duration))}
            </span>
          </div>
          <div className="flex items-center gap-2.5 pr-3.5 pl-3 py-1.5 bg-panel/80">
            <span className="font-display text-xl tracking-[0.12em] text-white leading-none">{away.short}</span>
            <KitDisc team={away} size={26} />
          </div>
          <div className="hidden sm:flex flex-col justify-center border-l border-line px-3">
            <span className="font-cond text-[9px] tracking-[0.3em] text-dim leading-tight">MIN</span>
            <span className="font-display text-lg text-electric leading-none tabular-nums">{ui?.minute ?? 0}&apos;</span>
          </div>
        </div>

        <div className="absolute right-3 top-2.5 hidden md:block font-cond text-[10px] tracking-[0.25em] text-dim text-right leading-relaxed">
          ESTADIO NOCTURNO
          <br />
          <span className="text-cyan/70">FLOODLIGHTS ON</span>
        </div>
      </div>

      {/* pitch */}
      <div className="relative flex-1 min-h-0 z-10">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

        {portrait && isTouch && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 tag-clip bg-ink/85 border border-line px-4 py-1.5 font-cond text-[11px] tracking-[0.25em] text-cyan">
            ROTATE TO LANDSCAPE FOR THE FULL PITCH
          </div>
        )}

        {/* goal banner */}
        {goalFlash && ui?.scorer && (
          <div className="absolute inset-x-0 top-[30%] flex justify-center pointer-events-none z-30">
            <div className="goal-banner bg-ink/92 border-y-2 border-cyan px-14 py-4 text-center shadow-[0_0_70px_rgba(0,229,255,0.25)]">
              <div
                className="font-display text-7xl md:text-8xl leading-none tracking-[0.08em]"
                style={{
                  color: ui.scorerTeam === 0 ? home.primary === "#F5F7FF" ? "#ffffff" : home.primary : away.primary === "#F5F7FF" ? "#ffffff" : away.primary,
                  textShadow: "0 0 40px rgba(0,229,255,0.65), 0 3px 0 rgba(4,8,24,0.9)",
                }}
              >
                GOOOAL!
              </div>
              <div className="font-cond font-bold tracking-[0.42em] text-fog mt-2 text-sm">
                {ui.scorer.toUpperCase()} · {ui.goalMinute}&apos; —{" "}
                {(ui.scorerTeam === 0 ? home : away).short}
              </div>
            </div>
          </div>
        )}

        {/* kickoff countdown */}
        {ui?.phase === "kickoff" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div key={Math.ceil(ui.countdown * 2)} className="pop-in text-center">
              <div className="font-cond text-cyan tracking-[0.5em] text-sm mb-2">KICK OFF</div>
              <div className="font-display text-8xl text-white" style={{ textShadow: "0 0 50px rgba(23,105,255,0.7)" }}>
                {Math.ceil(Math.max(0.1, ui.countdown * 2))}
              </div>
            </div>
          </div>
        )}

        {/* pause overlay */}
        {ui?.paused && !fulltime && (
          <div className="absolute inset-0 z-40 bg-ink/85 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-panel border border-line p-8 w-[min(92vw,30rem)] rise-in">
              <div className="font-display text-5xl text-white tracking-[0.1em] mb-1">PAUSED</div>
              <div className="font-cond text-dim tracking-[0.3em] text-xs mb-6">MATCH SUSPENDED BY THE REFEREE</div>
              <div className="grid grid-cols-3 gap-2 mb-6">
                {[
                  { k: "SCORE", v: `${ui.scoreH} — ${ui.scoreA}` },
                  { k: "POSSESSION", v: `${Math.round(ui.possH * 100)}%` },
                  { k: "MINUTE", v: `${ui.minute}'` },
                ].map((s) => (
                  <div key={s.k} className="border border-line bg-ink/60 px-3 py-2.5 text-center">
                    <div className="font-cond text-[9px] tracking-[0.28em] text-dim">{s.k}</div>
                    <div className="font-display text-xl text-cyan">{s.v}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2.5">
                <BigBtn variant="cyan" onClick={() => engRef.current?.setPaused(false)}>
                  RESUME MATCH
                </BigBtn>
                <BigBtn variant="ghost" onClick={() => onExit(exitDest)}>
                  QUIT TO {context === "friendly" ? "MENU" : context === "career" ? "LEAGUE" : "CUP"}
                </BigBtn>
              </div>
            </div>
          </div>
        )}

        {/* full time */}
        {fulltime && ui && (
          <div className="absolute inset-0 z-40 bg-ink/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-panel border border-line p-8 w-[min(94vw,36rem)] pop-in">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1.5 h-6 bg-cyan" />
                <span className="font-cond font-bold tracking-[0.4em] text-cyan text-xs">FULL TIME</span>
              </div>
              <div className="flex items-center justify-center gap-6 mb-2">
                <div className="flex flex-col items-center gap-2 w-32">
                  <KitDisc team={home} size={52} />
                  <span className="font-display text-xl tracking-[0.1em] text-white text-center leading-none">{home.short}</span>
                </div>
                <span className="font-display text-7xl text-white tabular-nums leading-none">
                  {ui.scoreH}
                  <span className="text-dim text-4xl mx-3">—</span>
                  {ui.scoreA}
                </span>
                <div className="flex flex-col items-center gap-2 w-32">
                  <KitDisc team={away} size={52} />
                  <span className="font-display text-xl tracking-[0.1em] text-white text-center leading-none">{away.short}</span>
                </div>
              </div>
              <div className="text-center font-cond tracking-[0.3em] text-fog text-sm mb-6">
                {ui.scoreH === ui.scoreA
                  ? "HONOURS EVEN UNDER THE FLOODLIGHTS"
                  : `${(ui.scoreH > ui.scoreA ? home : away).name.toUpperCase()} TAKE THE NIGHT`}
              </div>

              <div className="grid grid-cols-3 gap-px bg-line border border-line mb-6">
                {[
                  { k: "POSSESSION", a: `${Math.round(ui.possH * 100)}%`, b: `${Math.round((1 - ui.possH) * 100)}%` },
                  { k: "SHOTS", a: ui.shotsH, b: ui.shotsA },
                  { k: "SAVES", a: ui.savesH, b: ui.savesA },
                ].map((r) => (
                  <div key={r.k} className="bg-panel px-3 py-2.5 text-center">
                    <div className="font-display text-lg text-white tabular-nums">{r.a}</div>
                    <div className="font-cond text-[9px] tracking-[0.28em] text-dim my-0.5">{r.k}</div>
                    <div className="font-display text-lg text-white tabular-nums">{r.b}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2.5">
                {context === "friendly" && (
                  <BigBtn variant="cyan" onClick={() => engRef.current?.rematch()}>
                    REMATCH
                  </BigBtn>
                )}
                <BigBtn variant={context === "friendly" ? "ghost" : "cyan"} onClick={() => onExit(exitDest)}>
                  {context === "career" ? "CONTINUE TO LEAGUE" : context === "cup" ? "CONTINUE TO CUP" : "MAIN MENU"}
                </BigBtn>
                {context === "friendly" && (
                  <GhostBtn onClick={() => onExit("select")}>CHANGE TEAMS</GhostBtn>
                )}
              </div>
            </div>
          </div>
        )}

        {/* touch joystick */}
        {isTouch && !ui?.paused && !fulltime && (
          <div className="absolute bottom-5 left-5 z-30">
            <Joystick onMove={(x, y) => engRef.current?.setMove(x, y)} />
          </div>
        )}

        {/* circular action cluster */}
        {!ui?.paused && !fulltime && (
          <div className="absolute bottom-4 right-4 z-30" style={{ width: 190, height: 168 }}>
            <div className="absolute" style={{ right: 0, bottom: 8 }}>
              <ActionBtn label="SHOOT" keyHint="SPACE" size={isTouch ? 92 : 76} accent="#00E5FF"
                onPress={() => { sfx.ensure(); engRef.current?.action("shoot"); }} />
            </div>
            <div className="absolute" style={{ right: 104, bottom: 66 }}>
              <ActionBtn label="PASS" keyHint="X" size={isTouch ? 66 : 56} accent="#1769FF"
                onPress={() => { sfx.ensure(); engRef.current?.action("pass"); }} />
            </div>
            <div className="absolute" style={{ right: 118, bottom: 0 }}>
              <ActionBtn label="CROSS" keyHint="C" size={isTouch ? 62 : 54} accent="#6C3BFF"
                onPress={() => { sfx.ensure(); engRef.current?.action("cross"); }} />
            </div>
            <div className="absolute" style={{ right: 34, bottom: 108 }}>
              <ActionBtn label="DRIBBLE" keyHint="Z" size={isTouch ? 60 : 52} accent="#00A8FF"
                onPress={() => { sfx.ensure(); engRef.current?.action("dribble"); }} />
            </div>
          </div>
        )}

        {/* desktop control legend */}
        {!isTouch && !ui?.paused && !fulltime && (
          <div className="absolute bottom-2.5 left-3 z-20 flex items-center gap-3 font-cond text-[10px] tracking-[0.18em] text-fog/70 bg-ink/60 border border-line/60 px-3 py-1.5 backdrop-blur-sm">
            <span className="flex items-center gap-1.5"><KeyCap>WASD</KeyCap> MOVE</span>
            <span className="flex items-center gap-1.5"><KeyCap>SHIFT</KeyCap> SPRINT</span>
            <span className="flex items-center gap-1.5"><KeyCap>SPACE</KeyCap> SHOOT</span>
            <span className="flex items-center gap-1.5"><KeyCap>X</KeyCap> PASS</span>
            <span className="flex items-center gap-1.5"><KeyCap>C</KeyCap> CROSS</span>
            <span className="flex items-center gap-1.5"><KeyCap>Z</KeyCap> DRIBBLE</span>
            <span className="flex items-center gap-1.5"><KeyCap>Q/E</KeyCap> SWITCH</span>
            <span className="flex items-center gap-1.5"><KeyCap>P</KeyCap> PAUSE</span>
          </div>
        )}
      </div>
    </div>
  );
}
