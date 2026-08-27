import { useEffect, useRef, useState } from "react";
import { MatchEngine, type UiSnapshot } from "../game/engine";
import type { Settings, TeamDef } from "../game/data";
import { ScoreBug, BigBtn, GhostBtn, StatBar, KeyCap, KitDisc, IconBack } from "../components/ui";
import { sfx } from "../game/audio";

const fmtClock = (s: number) => {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${ss.toString().padStart(2, "0")}`;
};

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
  context: "friendly" | "career" | "cup";
  onResult: (gh: number, ga: number) => void;
  onExit: (dest: "menu" | "career" | "cup" | "select") => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<MatchEngine | null>(null);
  const reportedRef = useRef(false);
  const [ui, setUi] = useState<UiSnapshot | null>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    sfx.ensure();
    const engine = new MatchEngine(
      cv,
      {
        home,
        away,
        durationSec: settings.duration,
        difficulty: settings.difficulty,
        shake: settings.shake,
      },
      (s) => {
        setUi(s);
        if (s.phase === "fulltime" && !reportedRef.current) {
          reportedRef.current = true;
          onResult(s.scoreH, s.scoreA);
        }
      }
    );
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goalCount = ui ? ui.scoreH + ui.scoreA : 0;
  const verdict =
    ui && ui.scoreH > ui.scoreA ? "VICTORY" : ui && ui.scoreH < ui.scoreA ? "DEFEAT" : "DRAW";
  const verdictColor =
    verdict === "VICTORY" ? "#00E5FF" : verdict === "DEFEAT" ? "#FF5D5D" : "#B8C2D9";

  return (
    <div className="h-full flex flex-col screen-in bg-ink select-none">
      {/* top HUD */}
      <div className="relative z-20 flex items-start justify-center pt-3 px-4">
        <div className="flex flex-col items-center gap-1.5">
          {ui && <ScoreBug home={home} away={away} scoreH={ui.scoreH} scoreA={ui.scoreA} minute={ui.minute} label={fmtClock(ui.timeLeft)} />}
          {ui && ui.phase !== "fulltime" && (
            <div className="w-64 h-1 flex gap-0.5 opacity-80">
              <div className="bg-cyan" style={{ width: `${ui.possH * 100}%` }} />
              <div className="bg-purple flex-1" />
            </div>
          )}
        </div>
        <button
          onClick={() => engineRef.current?.setPaused(true)}
          className="absolute right-4 top-3 tag-clip bg-panel2 border border-line text-fog hover:text-cyan px-4 py-2 font-cond font-bold tracking-[0.25em] text-xs cursor-pointer"
        >
          PAUSE
        </button>
      </div>

      {/* pitch */}
      <div className="relative flex-1 min-h-0 mx-3 my-2 border border-line overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* kickoff splash */}
        {ui?.phase === "kickoff" && !ui.paused && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="pop-in flex items-center gap-5 bg-ink/85 border border-line px-8 py-5">
              <KitDisc team={home} size={52} />
              <div className="text-center">
                <div className="font-display text-6xl text-white tracking-[0.12em] leading-none">
                  KICK<span className="text-cyan">OFF</span>
                </div>
                <div className="font-cond tracking-[0.3em] text-fog text-sm mt-2">
                  YOU ARE {home.short.toUpperCase()} — MOVE TO THE RING
                </div>
              </div>
              <KitDisc team={away} size={52} />
            </div>
          </div>
        )}

        {/* goal banner */}
        {ui?.phase === "goal" && ui.scorer && (
          <div className="absolute top-[22%] left-0 right-0 flex justify-center pointer-events-none">
            <div
              key={goalCount}
              className="goal-banner px-12 py-4 text-center"
              style={{
                background:
                  ui.scorerTeam === 0
                    ? `linear-gradient(90deg, ${home.primary}, #0D1530)`
                    : `linear-gradient(90deg, #0D1530, ${away.primary})`,
                border: "1px solid rgba(0,229,255,0.4)",
                boxShadow: "0 0 60px rgba(0,229,255,0.25)",
              }}
            >
              <div className="font-display text-7xl text-white tracking-[0.08em] leading-none" style={{ textShadow: "0 0 30px rgba(0,229,255,0.8)" }}>
                GOOOAL
              </div>
              <div className="font-cond font-bold tracking-[0.35em] text-cyan mt-1.5">
                {ui.scorer.toUpperCase()} · {ui.goalMinute}'
              </div>
            </div>
          </div>
        )}

        {/* pause overlay */}
        {ui?.paused && ui.phase !== "fulltime" && (
          <div className="absolute inset-0 bg-ink/85 backdrop-blur-[2px] flex items-center justify-center z-30">
            <div className="bg-panel border border-line p-8 max-w-md w-full mx-4 pop-in">
              <h2 className="font-display text-5xl text-white tracking-[0.1em] mb-6">
                PAUSED
              </h2>
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 items-center mb-8 font-cond tracking-wider text-fog">
                <span className="flex gap-1"><KeyCap>W</KeyCap><KeyCap>A</KeyCap><KeyCap>S</KeyCap><KeyCap>D</KeyCap></span>
                <span>MOVE</span>
                <span><KeyCap>SHIFT</KeyCap></span>
                <span>SPRINT</span>
                <span><KeyCap>SPACE</KeyCap></span>
                <span>SHOOT / TACKLE</span>
                <span><KeyCap>X</KeyCap></span>
                <span>PASS / LUNGE</span>
                <span className="flex gap-1"><KeyCap>Q</KeyCap><KeyCap>E</KeyCap></span>
                <span>SWITCH PLAYER</span>
                <span><KeyCap>P</KeyCap></span>
                <span>RESUME</span>
              </div>
              <div className="flex gap-3">
                <BigBtn onClick={() => engineRef.current?.setPaused(false)} className="flex-1">
                  RESUME
                </BigBtn>
                <GhostBtn onClick={() => onExit(context === "friendly" ? "menu" : context)}>
                  <IconBack className="w-4 h-4" /> QUIT
                </GhostBtn>
              </div>
            </div>
          </div>
        )}

        {/* full time overlay */}
        {ui?.phase === "fulltime" && (
          <div className="absolute inset-0 bg-ink/80 flex items-center justify-center z-30 overflow-y-auto py-4">
            <div className="bg-panel border border-line p-8 max-w-lg w-full mx-4 pop-in">
              <div className="flex items-center justify-between mb-1">
                <span className="font-cond font-bold tracking-[0.3em] text-xs text-dim">
                  {context === "friendly" ? "FRIENDLY" : context === "career" ? "LEAGUE · MATCHDAY RESULT" : "CUP TIE · RESULT"}
                </span>
                <span className="font-cond font-bold tracking-[0.3em] text-xs" style={{ color: verdictColor }}>
                  FULL TIME
                </span>
              </div>
              <div className="text-center mb-5">
                <div className="font-display tracking-[0.06em] leading-none" style={{ fontSize: "3.4rem", color: verdictColor, textShadow: `0 0 34px ${verdictColor}55` }}>
                  {verdict}
                </div>
                <div className="mt-3 flex justify-center">
                  <ScoreBug home={home} away={away} scoreH={ui.scoreH} scoreA={ui.scoreA} minute={90} />
                </div>
              </div>
              <div className="flex flex-col gap-3.5 mb-7">
                <StatBar label="Possession" h={Math.round(ui.possH * 100)} a={Math.round((1 - ui.possH) * 100)} fmt={(n) => `${n}%`} />
                <StatBar label="Shots" h={ui.shotsH} a={ui.shotsA} />
                <StatBar label="Saves" h={ui.savesH} a={ui.savesA} />
              </div>
              <div className="flex flex-col gap-2.5">
                <BigBtn
                  onClick={() => {
                    reportedRef.current = true; // rematch is an exhibition — result already filed
                    engineRef.current?.rematch();
                  }}
                >
                  REMATCH — FRIENDLY
                </BigBtn>
                <div className="flex gap-2.5">
                  {context !== "friendly" ? (
                    <BigBtn variant="cyan" className="flex-1" onClick={() => onExit(context)}>
                      CONTINUE
                    </BigBtn>
                  ) : (
                    <BigBtn variant="cyan" className="flex-1" onClick={() => onExit("select")}>
                      CHANGE TEAMS
                    </BigBtn>
                  )}
                  <GhostBtn className="flex-1 justify-center" onClick={() => onExit("menu")}>
                    MAIN MENU
                  </GhostBtn>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* control strip */}
      <div className="relative z-20 flex items-center justify-center gap-x-5 gap-y-1 flex-wrap px-4 pb-3 font-cond text-[11px] font-semibold tracking-[0.18em] text-dim">
        <span className="flex items-center gap-1.5"><KeyCap>WASD</KeyCap> MOVE</span>
        <span className="flex items-center gap-1.5"><KeyCap>SHIFT</KeyCap> SPRINT</span>
        <span className="flex items-center gap-1.5"><KeyCap>SPACE</KeyCap> SHOOT</span>
        <span className="flex items-center gap-1.5"><KeyCap>X</KeyCap> PASS</span>
        <span className="flex items-center gap-1.5"><KeyCap>Q</KeyCap><KeyCap>E</KeyCap> SWITCH</span>
        <span className="flex items-center gap-1.5"><KeyCap>P</KeyCap> PAUSE</span>
        {ui?.controlledNum && (
          <span className="text-cyan">YOU WEAR #{ui.controlledNum}</span>
        )}
      </div>
    </div>
  );
}
