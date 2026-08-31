import { useState } from "react";
import { TEAMS, type Settings, DIFF_LABEL, DUR_LABEL } from "../game/data";
import { KitDisc, BigBtn, GhostBtn, PanelTitle, IconBack, IconPlay } from "../components/ui";
import { sfx } from "../game/audio";

function TeamList({
  title,
  value,
  onChange,
  disabledId,
  accent,
}: {
  title: string;
  value: string;
  onChange: (id: string) => void;
  disabledId: string;
  accent: string;
}) {
  return (
    <div className="bg-panel border border-line p-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-1.5 h-6" style={{ background: accent }} />
        <h3 className="font-display text-2xl tracking-[0.1em] text-white">{title}</h3>
      </div>
      <div className="flex flex-col gap-1.5">
        {TEAMS.map((t) => {
          const active = t.id === value;
          const disabled = t.id === disabledId;
          return (
            <button
              key={t.id}
              disabled={disabled}
              onClick={() => {
                sfx.ensure();
                sfx.play(active ? "hover" : "click");
                onChange(t.id);
              }}
              className={`flex items-center gap-3 px-3 py-2 text-left transition-all border ${
                active
                  ? "border-cyan bg-panel2 shadow-[0_0_20px_rgba(0,229,255,0.15)]"
                  : disabled
                    ? "border-transparent opacity-30 cursor-not-allowed"
                    : "border-transparent hover:border-line hover:bg-panel2 cursor-pointer"
              }`}
            >
              <KitDisc team={t} size={34} />
              <span className="flex-1">
                <span className={`block font-cond font-bold tracking-[0.12em] ${active ? "text-cyan" : "text-white"}`}>
                  {t.name.toUpperCase()}
                </span>
                <span className="block text-[11px] font-cond tracking-[0.2em] text-dim">
                  OVR {t.rating}
                </span>
              </span>
              <span className="flex gap-1">
                <span className="w-2.5 h-6" style={{ background: t.primary, border: "1px solid rgba(4,8,24,0.6)" }} />
                <span className="w-2.5 h-6" style={{ background: t.secondary, border: "1px solid rgba(4,8,24,0.6)" }} />
                <span className="w-2.5 h-6" style={{ background: t.gk, border: "1px solid rgba(4,8,24,0.6)" }} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function TeamSelect({
  settings,
  onStart,
  onBack,
}: {
  settings: Settings;
  onStart: (homeId: string, awayId: string) => void;
  onBack: () => void;
}) {
  const [homeId, setHomeId] = useState("bar");
  const [awayId, setAwayId] = useState("rma");

  return (
    <div className="h-full overflow-y-auto screen-in">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <PanelTitle>MATCH SETUP</PanelTitle>
          <GhostBtn onClick={onBack}>
            <IconBack className="w-4 h-4" /> MENU
          </GhostBtn>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <TeamList title="YOUR CLUB" value={homeId} onChange={setHomeId} disabledId={awayId} accent="#00E5FF" />
          <TeamList title="OPPONENT" value={awayId} onChange={setAwayId} disabledId={homeId} accent="#6C3BFF" />
        </div>

        <div className="bg-panel border border-line p-5 flex flex-wrap items-center gap-x-8 gap-y-3 mb-6">
          <div>
            <div className="font-cond text-dim text-xs tracking-[0.25em] mb-1">MATCH CLOCK</div>
            <div className="font-display text-2xl text-white tracking-wide">{DUR_LABEL[settings.duration]}</div>
          </div>
          <div>
            <div className="font-cond text-dim text-xs tracking-[0.25em] mb-1">AI LEVEL</div>
            <div className="font-display text-2xl text-white tracking-wide">{DIFF_LABEL[settings.difficulty].toUpperCase()}</div>
          </div>
          <div>
            <div className="font-cond text-dim text-xs tracking-[0.25em] mb-1">STADIUM</div>
            <div className="font-display text-2xl text-white tracking-wide">ESTADIO NOCTURNO</div>
          </div>
          <div className="flex-1" />
          <BigBtn onClick={() => onStart(homeId, awayId)}>
            <IconPlay className="w-5 h-5" /> KICK OFF
          </BigBtn>
        </div>

        <p className="font-cond text-dim tracking-[0.18em] text-sm">
          CHANGE CLOCK AND DIFFICULTY ANY TIME IN SETTINGS — IT APPLIES FROM THE NEXT KICKOFF.
        </p>
      </div>
    </div>
  );
}
