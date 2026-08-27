import { teamById, type CupState } from "../game/data";
import { KitDisc, BigBtn, GhostBtn, PanelTitle, IconBack, IconPlay, IconTrophy } from "../components/ui";
import { ClubPicker } from "./CareerScreen";

const STAGE_NAMES = ["QUARTER-FINALS", "SEMI-FINALS", "THE FINAL"];

export default function CupScreen({
  cup,
  onNew,
  onPlay,
  onBack,
  onReset,
}: {
  cup: CupState | null;
  onNew: (teamId: string) => void;
  onPlay: (homeId: string, awayId: string) => void;
  onBack: () => void;
  onReset: () => void;
}) {
  if (!cup) {
    return (
      <div className="h-full overflow-y-auto screen-in">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <PanelTitle>NEW CUP RUN</PanelTitle>
            <GhostBtn onClick={onBack}>
              <IconBack className="w-4 h-4" /> MENU
            </GhostBtn>
          </div>
          <ClubPicker title="CHOOSE YOUR CLUB" onPick={onNew} />
        </div>
      </div>
    );
  }

  const champion = cup.champion ? teamById(cup.champion) : null;
  const myTie =
    cup.stage < 3
      ? cup.stages[cup.stage].find((t) => !t.played && (t.home === cup.userTeam || t.away === cup.userTeam))
      : undefined;

  return (
    <div className="h-full overflow-y-auto screen-in">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <PanelTitle>NIGHT CUP — KNOCKOUT</PanelTitle>
          <div className="flex gap-2">
            <GhostBtn onClick={onReset}>NEW DRAW</GhostBtn>
            <GhostBtn onClick={onBack}>
              <IconBack className="w-4 h-4" /> MENU
            </GhostBtn>
          </div>
        </div>

        {champion ? (
          <div className="max-w-xl mx-auto bg-panel border border-cyan/50 p-8 text-center shadow-[0_0_50px_rgba(0,229,255,0.14)] pop-in">
            <IconTrophy className="w-14 h-14 text-cyan mx-auto mb-4" />
            <div className="font-cond font-bold tracking-[0.35em] text-fog text-sm mb-2">
              NIGHT CUP CHAMPIONS
            </div>
            <div className="font-display text-6xl text-white tracking-[0.05em] leading-none">
              {champion.name.toUpperCase()}
            </div>
            <div className="flex justify-center my-6">
              <KitDisc team={champion} size={92} />
            </div>
            <p className="font-cond text-fog tracking-[0.15em] mb-6">
              {champion.id === cup.userTeam
                ? "THREE NIGHTS, THREE WINS. THE CITY IS YOURS."
                : "THEY LIFTED IT THIS YEAR — RUN IT BACK AND TAKE IT."}
            </p>
            <BigBtn onClick={() => onNew(cup.userTeam)}>DRAW A NEW BRACKET</BigBtn>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {cup.stages.map((ties, s) => (
              <div key={s}>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="w-1.5 h-5"
                    style={{ background: s === cup.stage ? "#00E5FF" : "#1d2b55" }}
                  />
                  <span
                    className={`font-display text-2xl tracking-[0.12em] ${
                      s === cup.stage ? "text-cyan" : "text-dim"
                    }`}
                  >
                    {STAGE_NAMES[s]}
                  </span>
                </div>
                <div className="flex flex-col gap-4" style={{ marginTop: s === 1 ? "3.5rem" : s === 2 ? "8.5rem" : 0 }}>
                  {ties.length === 0 ? (
                    <div className="border border-dashed border-line p-5 text-center font-cond text-dim tracking-[0.2em] text-sm">
                      AWAITING WINNERS
                    </div>
                  ) : (
                    ties.map((t, i) => {
                      const mine =
                        (t.home === cup.userTeam || t.away === cup.userTeam) && s === cup.stage;
                      const home = teamById(t.home);
                      const away = teamById(t.away);
                      return (
                        <div
                          key={i}
                          className={`border p-4 bg-panel ${
                            mine ? "border-cyan shadow-[0_0_24px_rgba(0,229,255,0.15)]" : "border-line"
                          }`}
                        >
                          {[{ team: home, g: t.gh, first: true }, { team: away, g: t.ga, first: false }].map(
                            (row, ri) => {
                              const won = t.played && ((ri === 0 && t.gh > t.ga) || (ri === 1 && t.ga > t.gh));
                              return (
                                <div
                                  key={ri}
                                  className={`flex items-center gap-2.5 py-1.5 ${row.first ? "" : "border-t border-line/60"}`}
                                >
                                  <KitDisc team={row.team} size={26} />
                                  <span
                                    className={`flex-1 font-cond font-bold tracking-[0.12em] text-sm ${
                                      won ? "text-cyan" : row.team.id === cup.userTeam ? "text-white" : "text-fog"
                                    }`}
                                  >
                                    {row.team.name.toUpperCase()}
                                  </span>
                                  {t.played && (
                                    <span className={`font-display text-xl ${won ? "text-cyan" : "text-dim"}`}>
                                      {row.g}
                                    </span>
                                  )}
                                </div>
                              );
                            }
                          )}
                          {mine && t.played === false && (
                            <BigBtn className="w-full mt-2" onClick={() => onPlay(t.home, t.away)}>
                              <IconPlay className="w-4 h-4" /> PLAY TIE
                            </BigBtn>
                          )}
                          {t.played && t.gh === t.ga && (
                            <div className="font-cond text-dim text-[11px] tracking-[0.25em] mt-1.5">
                              DECIDED ON PENALTIES
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!champion && myTie && (
          <p className="font-cond text-dim tracking-[0.2em] text-sm mt-6 text-center">
            DRAWN TIES ARE SETTLED BY A PENALTY SHOOTOUT — WIN IT IN 90 SECONDS.
          </p>
        )}
      </div>
    </div>
  );
}
