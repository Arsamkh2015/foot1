import { TEAMS, teamById, points, type CareerState } from "../game/data";
import { KitDisc, BigBtn, GhostBtn, PanelTitle, IconBack, IconPlay, IconTrophy } from "../components/ui";
import { sfx } from "../game/audio";

export function ClubPicker({ onPick, title }: { onPick: (id: string) => void; title: string }) {
  return (
    <div className="max-w-3xl mx-auto">
      <PanelTitle>{title}</PanelTitle>
      <p className="font-cond text-fog tracking-[0.14em] mb-6">
        EIGHT CLUBS, ONE DRESSING ROOM WITH YOUR NAME ON IT.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {TEAMS.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              sfx.ensure();
              sfx.play("select");
              onPick(t.id);
            }}
            onMouseEnter={() => sfx.play("hover")}
            className="bg-panel border border-line hover:border-cyan p-4 flex flex-col items-center gap-2 transition-all hover:-translate-y-1 cursor-pointer group"
          >
            <KitDisc team={t} size={56} />
            <span className="font-display text-xl text-white tracking-[0.08em] group-hover:text-cyan text-center leading-tight">
              {t.name.toUpperCase()}
            </span>
            <span className="font-cond text-dim text-xs tracking-[0.25em]">OVR {t.rating}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CareerScreen({
  career,
  onNew,
  onPlay,
  onBack,
  onReset,
}: {
  career: CareerState | null;
  onNew: (teamId: string) => void;
  onPlay: (homeId: string, awayId: string) => void;
  onBack: () => void;
  onReset: () => void;
}) {
  if (!career) {
    return (
      <div className="h-full overflow-y-auto screen-in">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <PanelTitle>NEW CAREER</PanelTitle>
            <GhostBtn onClick={onBack}>
              <IconBack className="w-4 h-4" /> MENU
            </GhostBtn>
          </div>
          <ClubPicker title="CHOOSE YOUR CLUB" onPick={onNew} />
        </div>
      </div>
    );
  }

  const me = teamById(career.userTeam);
  const total = career.schedule.length;
  const standings = TEAMS.map((t) => ({ t, r: career.table[t.id] })).sort(
    (a, b) =>
      points(b.r) - points(a.r) ||
      b.r.gf - b.r.ga - (a.r.gf - a.r.ga) ||
      b.r.gf - a.r.gf
  );
  const myPos = standings.findIndex((s) => s.t.id === career.userTeam) + 1;
  const md = Math.min(career.round, total - 1);
  const fixtures = career.schedule[md];
  const myTie = fixtures.find((f) => f.home === career.userTeam || f.away === career.userTeam);
  const champion = career.done ? standings[0].t : null;

  return (
    <div className="h-full overflow-y-auto screen-in">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <PanelTitle>
            CAREER — SEASON {career.season}
          </PanelTitle>
          <div className="flex gap-2">
            <GhostBtn onClick={onReset}>RESET</GhostBtn>
            <GhostBtn onClick={onBack}>
              <IconBack className="w-4 h-4" /> MENU
            </GhostBtn>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
          {/* standings */}
          <div className="bg-panel border border-line p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="font-cond font-bold tracking-[0.25em] text-sm text-fog">STANDINGS</span>
              <span className="font-cond text-dim text-xs tracking-[0.2em]">
                {career.done ? "SEASON COMPLETE" : `MATCHDAY ${career.round + 1} OF ${total}`}
              </span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="font-cond text-dim tracking-[0.2em] text-xs">
                  <th className="text-left font-semibold pb-2 w-8">#</th>
                  <th className="text-left font-semibold pb-2">CLUB</th>
                  <th className="font-semibold pb-2 w-8">P</th>
                  <th className="font-semibold pb-2 w-8">W</th>
                  <th className="font-semibold pb-2 w-8">D</th>
                  <th className="font-semibold pb-2 w-8">L</th>
                  <th className="font-semibold pb-2 w-10">GD</th>
                  <th className="font-semibold pb-2 w-12 text-cyan">PTS</th>
                </tr>
              </thead>
              <tbody>
                {standings.map(({ t, r }, i) => {
                  const isMe = t.id === career.userTeam;
                  return (
                    <tr
                      key={t.id}
                      className={`border-t border-line/60 ${isMe ? "bg-panel2" : ""}`}
                    >
                      <td className={`py-2 font-display text-lg ${i === 0 ? "text-cyan" : "text-dim"}`}>
                        {i + 1}
                      </td>
                      <td className="py-2">
                        <span className="flex items-center gap-2.5">
                          <KitDisc team={t} size={26} />
                          <span className={`font-cond font-bold tracking-[0.1em] ${isMe ? "text-cyan" : "text-white"}`}>
                            {t.name.toUpperCase()}
                          </span>
                          {isMe && (
                            <span className="tag-clip bg-cyan text-ink text-[10px] font-bold px-1.5 py-0.5 tracking-widest">
                              YOU
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="text-center text-fog">{r.p}</td>
                      <td className="text-center text-fog">{r.w}</td>
                      <td className="text-center text-fog">{r.d}</td>
                      <td className="text-center text-fog">{r.l}</td>
                      <td className="text-center text-fog">{r.gf - r.ga > 0 ? `+${r.gf - r.ga}` : r.gf - r.ga}</td>
                      <td className="text-center font-display text-lg text-white">{points(r)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* right column */}
          <div className="flex flex-col gap-5">
            {!career.done && myTie ? (
              <div className="bg-panel border border-line p-5">
                <span className="font-cond font-bold tracking-[0.25em] text-sm text-fog">
                  MATCHDAY {career.round + 1}
                </span>
                <div className="flex items-center justify-center gap-4 my-5">
                  <div className="flex flex-col items-center gap-2 w-28">
                    <KitDisc team={teamById(myTie.home)} size={52} />
                    <span className="font-cond font-bold tracking-[0.12em] text-sm text-white text-center">
                      {teamById(myTie.home).name.toUpperCase()}
                    </span>
                  </div>
                  <span className="font-display text-4xl text-dim">VS</span>
                  <div className="flex flex-col items-center gap-2 w-28">
                    <KitDisc team={teamById(myTie.away)} size={52} />
                    <span className="font-cond font-bold tracking-[0.12em] text-sm text-white text-center">
                      {teamById(myTie.away).name.toUpperCase()}
                    </span>
                  </div>
                </div>
                <BigBtn className="w-full" onClick={() => onPlay(myTie.home, myTie.away)}>
                  <IconPlay className="w-5 h-5" /> PLAY MATCHDAY {career.round + 1}
                </BigBtn>
                <div className="mt-4">
                  <div className="h-1.5 bg-ink flex">
                    <div className="bg-blue" style={{ width: `${(career.round / total) * 100}%` }} />
                  </div>
                  <div className="flex justify-between font-cond text-dim text-xs tracking-[0.2em] mt-1.5">
                    <span>YOUR POSITION: P{myPos}</span>
                    <span>{career.round}/{total} PLAYED</span>
                  </div>
                </div>
              </div>
            ) : (
              champion && (
                <div className="bg-panel border border-cyan/50 p-6 text-center shadow-[0_0_40px_rgba(0,229,255,0.12)]">
                  <IconTrophy className="w-10 h-10 text-cyan mx-auto mb-3" />
                  <div className="font-display text-4xl text-white tracking-[0.08em]">
                    {champion.name.toUpperCase()}
                  </div>
                  <div className="font-cond font-bold tracking-[0.3em] text-cyan text-sm mt-1 mb-5">
                    LEAGUE CHAMPIONS — SEASON {career.season}
                  </div>
                  <KitDisc team={champion} size={72} />
                  <div className="mt-5">
                    <BigBtn onClick={() => onNew(career.userTeam)}>START SEASON {career.season + 1}</BigBtn>
                  </div>
                </div>
              )
            )}

            <div className="bg-panel border border-line p-5">
              <span className="font-cond font-bold tracking-[0.25em] text-sm text-fog">THIS MATCHDAY</span>
              <div className="flex flex-col gap-2 mt-3">
                {fixtures.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm font-cond tracking-wider">
                    <KitDisc team={teamById(f.home)} size={22} />
                    <span className={`flex-1 text-right ${f.home === career.userTeam ? "text-cyan font-bold" : "text-fog"}`}>
                      {teamById(f.home).short}
                    </span>
                    <span className="text-dim text-xs">v</span>
                    <span className={`flex-1 ${f.away === career.userTeam ? "text-cyan font-bold" : "text-fog"}`}>
                      {teamById(f.away).short}
                    </span>
                    <KitDisc team={teamById(f.away)} size={22} />
                  </div>
                ))}
              </div>
            </div>

            {career.history.length > 0 && (
              <div className="bg-panel border border-line p-5">
                <span className="font-cond font-bold tracking-[0.25em] text-sm text-fog">YOUR RESULTS</span>
                <div className="flex flex-col gap-1.5 mt-3">
                  {career.history.slice(-6).reverse().map((h, i) => (
                    <div key={i} className="font-cond tracking-[0.14em] text-sm text-fog border-l-2 border-electric pl-3">
                      {h}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
