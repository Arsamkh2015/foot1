import { useState } from "react";
import {
  TEAMS,
  DIFF_LABEL,
  type Settings,
  type Difficulty,
  type TeamDef,
} from "../game/data";
import { KitDisc, GhostBtn, PanelTitle, IconBack } from "../components/ui";
import { sfx } from "../game/audio";

const POS_COLOR: Record<string, string> = {
  GK: "#FEBE10",
  DF: "#1769FF",
  MF: "#00E5FF",
  FW: "#6C3BFF",
};

function KitStrip({ team, h = "h-16" }: { team: TeamDef; h?: string }) {
  return (
    <div
      className={`${h} w-full relative overflow-hidden`}
      style={{
        background: `repeating-linear-gradient(90deg, ${team.primary} 0 26px, ${team.secondary} 26px 52px)`,
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-black/30" />
      <span
        className="absolute right-2 top-1/2 -translate-y-1/2 font-display text-2xl tracking-[0.1em] px-2"
        style={{ color: "#0a1226", background: "rgba(253,253,255,0.85)" }}
      >
        {team.short}
      </span>
    </div>
  );
}

// ------------------------------------------------------------------
// CLUBS
// ------------------------------------------------------------------

export function TeamsScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="h-full overflow-y-auto screen-in">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <PanelTitle>THE EIGHT CLUBS</PanelTitle>
          <GhostBtn onClick={onBack}>
            <IconBack className="w-4 h-4" /> MENU
          </GhostBtn>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TEAMS.map((t, i) => (
            <div
              key={t.id}
              className="bg-panel border border-line hover:border-electric transition-all hover:-translate-y-1 rise-in"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <KitStrip team={t} />
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <KitDisc team={t} size={38} />
                  <div>
                    <div className="font-display text-2xl text-white tracking-[0.06em] leading-none">
                      {t.name.toUpperCase()}
                    </div>
                    <div className="font-cond text-dim text-xs tracking-[0.25em] mt-1">OVR {t.rating}</div>
                  </div>
                </div>
                <div className="h-1.5 bg-ink mb-3">
                  <div
                    className="h-full"
                    style={{
                      width: `${((t.rating - 75) / 20) * 100}%`,
                      background: "linear-gradient(90deg, #1769FF, #00E5FF)",
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  {t.stars.slice(0, 3).map((s) => (
                    <div key={s.name} className="flex items-center gap-2 text-sm font-cond tracking-wider">
                      <span
                        className="w-8 text-center text-[10px] font-bold py-0.5"
                        style={{ background: `${POS_COLOR[s.pos]}22`, color: POS_COLOR[s.pos] }}
                      >
                        {s.pos}
                      </span>
                      <span className="flex-1 text-fog">{s.name}</span>
                      <span className="font-display text-lg text-white">{s.rating}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-line/60">
                  <span className="font-cond text-dim text-[11px] tracking-[0.2em]">GK KIT</span>
                  <span className="w-8 h-3.5" style={{ background: t.gk }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// PLAYERS
// ------------------------------------------------------------------

export function PlayersScreen({ onBack }: { onBack: () => void }) {
  const [teamId, setTeamId] = useState(TEAMS[0].id);
  const team = TEAMS.find((t) => t.id === teamId) ?? TEAMS[0];
  const stars = [...team.stars].sort((a, b) => b.rating - a.rating);

  return (
    <div className="h-full overflow-y-auto screen-in">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <PanelTitle>STAR PLAYERS</PanelTitle>
          <GhostBtn onClick={onBack}>
            <IconBack className="w-4 h-4" /> MENU
          </GhostBtn>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {TEAMS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                sfx.ensure();
                sfx.play("click");
                setTeamId(t.id);
              }}
              className={`tag-clip px-3.5 py-1.5 font-cond font-bold tracking-[0.18em] text-sm transition-colors cursor-pointer ${
                t.id === teamId
                  ? "bg-cyan text-ink"
                  : "bg-panel2 text-fog border border-line hover:text-white hover:border-electric"
              }`}
            >
              {t.short}
            </button>
          ))}
        </div>

        <div className="bg-panel border border-line">
          <KitStrip team={team} h="h-12" />
          <div className="p-5 flex flex-col">
            {stars.map((s, i) => (
              <div
                key={s.name}
                className="flex items-center gap-4 py-3 border-b border-line/60 last:border-0 group rise-in"
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <span className="font-display text-3xl text-line w-10 group-hover:text-cyan transition-colors">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="w-11 text-center font-bold text-xs py-1"
                  style={{ background: `${POS_COLOR[s.pos]}22`, color: POS_COLOR[s.pos] }}
                >
                  {s.pos}
                </span>
                <span className="flex-1 font-cond font-bold tracking-[0.14em] text-lg text-white">
                  {s.name.toUpperCase()}
                </span>
                <div className="hidden sm:block w-40 h-1.5 bg-ink">
                  <div
                    className="h-full"
                    style={{
                      width: `${((s.rating - 70) / 25) * 100}%`,
                      background: `linear-gradient(90deg, ${team.secondary}, ${team.primary})`,
                    }}
                  />
                </div>
                <span className="font-display text-4xl text-cyan w-14 text-right">{s.rating}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="font-cond text-dim tracking-[0.2em] text-sm mt-4">
          GOAL SCORERS ON MATCH NIGHT ARE DRAWN FROM THESE STAR MEN.
        </p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// SETTINGS
// ------------------------------------------------------------------

function Seg<T extends string | number>({
  options,
  value,
  onChange,
  render,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  render: (v: T) => string;
}) {
  return (
    <div className="flex gap-1.5">
      {options.map((o) => (
        <button
          key={String(o)}
          onClick={() => {
            sfx.ensure();
            sfx.play("click");
            onChange(o);
          }}
          className={`tag-clip px-4 py-2 font-cond font-bold tracking-[0.15em] text-sm transition-colors cursor-pointer ${
            o === value
              ? "bg-cyan text-ink"
              : "bg-panel2 text-fog border border-line hover:text-white hover:border-electric"
          }`}
        >
          {render(o)}
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => {
        sfx.ensure();
        sfx.play("click");
        onChange(!on);
      }}
      className={`w-14 h-7 relative transition-colors cursor-pointer border ${
        on ? "bg-cyan/20 border-cyan" : "bg-panel2 border-line"
      }`}
    >
      <span
        className={`absolute top-0.5 w-6 h-5.5 transition-all ${on ? "left-7 bg-cyan" : "left-0.5 bg-dim"}`}
        style={{ height: "22px" }}
      />
    </button>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4 py-4 border-b border-line/60 last:border-0">
      <div className="flex-1 min-w-48">
        <div className="font-cond font-bold tracking-[0.2em] text-white">{label}</div>
        <div className="font-cond text-dim text-xs tracking-[0.14em] mt-0.5">{hint}</div>
      </div>
      {children}
    </div>
  );
}

export function SettingsScreen({
  settings,
  onChange,
  onBack,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onBack: () => void;
}) {
  return (
    <div className="h-full overflow-y-auto screen-in">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <PanelTitle>SETTINGS</PanelTitle>
          <GhostBtn onClick={onBack}>
            <IconBack className="w-4 h-4" /> MENU
          </GhostBtn>
        </div>

        <div className="bg-panel border border-line p-6">
          <Row label="MATCH CLOCK" hint="REAL SECONDS PER FULL MATCH — APPLIES AT NEXT KICKOFF">
            <Seg
              options={[60, 90, 150]}
              value={settings.duration}
              onChange={(v) => onChange({ duration: v })}
              render={(v) => `${v}S`}
            />
          </Row>
          <Row label="AI DIFFICULTY" hint="OPPONENT SPEED, REACTIONS, TACKLING AND FINISHING">
            <Seg<Difficulty>
              options={["amateur", "pro", "legend"]}
              value={settings.difficulty}
              onChange={(v) => onChange({ difficulty: v })}
              render={(v) => DIFF_LABEL[v].toUpperCase()}
            />
          </Row>
          <Row label="STADIUM SOUND" hint="WHISTLES, CROWD AND SYNTH SFX">
            <Toggle on={!settings.muted} onChange={(v) => onChange({ muted: !v })} />
          </Row>
          <Row label="VOLUME" hint="MASTER LEVEL">
            <div className="flex items-center gap-3 w-56">
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.volume * 100)}
                onChange={(e) => onChange({ volume: Number(e.target.value) / 100 })}
                className="w-full"
              />
              <span className="font-display text-xl text-cyan w-12 text-right">
                {Math.round(settings.volume * 100)}
              </span>
            </div>
          </Row>
          <Row label="SCREEN SHAKE" hint="IMPACT FEEDBACK ON GOALS, POSTS AND SAVES">
            <Toggle on={settings.shake} onChange={(v) => onChange({ shake: v })} />
          </Row>
        </div>

        <p className="font-cond text-dim tracking-[0.2em] text-sm mt-4">
          PROGRESS (CAREER + CUP) IS SAVED IN THIS BROWSER AUTOMATICALLY.
        </p>
      </div>
    </div>
  );
}
