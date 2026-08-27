import { useEffect, useRef, useState } from "react";
import MainMenu, { type ScreenId } from "./screens/MainMenu";
import TeamSelect from "./screens/TeamSelect";
import MatchScreen from "./screens/MatchScreen";
import CareerScreen from "./screens/CareerScreen";
import CupScreen from "./screens/CupScreen";
import { TeamsScreen, PlayersScreen, SettingsScreen } from "./screens/InfoScreens";
import {
  DEFAULT_SETTINGS,
  loadJSON,
  saveJSON,
  teamById,
  newCareer,
  newCup,
  recordResult,
  simulateScore,
  cupWinners,
  type Settings,
  type CareerState,
  type CupState,
  type CupTie,
} from "./game/data";
import { sfx } from "./game/audio";

interface MatchSetup {
  homeId: string;
  awayId: string;
  context: "friendly" | "career" | "cup";
  key: number;
}

const loadNullable = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

export default function App() {
  const [screen, setScreen] = useState<ScreenId>("menu");
  const [settings, setSettings] = useState<Settings>(() =>
    loadJSON("cn_settings_v1", DEFAULT_SETTINGS)
  );
  const [career, setCareer] = useState<CareerState | null>(() =>
    loadNullable<CareerState>("cn_career_v1")
  );
  const [cup, setCup] = useState<CupState | null>(() => loadNullable<CupState>("cn_cup_v1"));
  const [match, setMatch] = useState<MatchSetup | null>(null);
  const appliedKey = useRef(-1);

  // apply persisted sound settings
  useEffect(() => {
    sfx.setVolume(settings.volume);
    sfx.setMuted(settings.muted);
  }, [settings.volume, settings.muted]);

  const patchSettings = (patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      saveJSON("cn_settings_v1", next);
      return next;
    });
  };

  const startMatch = (homeId: string, awayId: string, context: MatchSetup["context"]) => {
    setMatch((m) => ({ homeId, awayId, context, key: (m?.key ?? 0) + 1 }));
    setScreen("match");
  };

  // ------------------------------------------------------------ results

  const onMatchResult = (gh: number, ga: number) => {
    if (!match || appliedKey.current === match.key) return;
    appliedKey.current = match.key;

    if (match.context === "career" && career && !career.done) {
      const round = Math.min(career.round, career.schedule.length - 1);
      const fixtures = career.schedule[round];
      const table = JSON.parse(JSON.stringify(career.table)) as CareerState["table"];
      fixtures.forEach((f) => {
        let h = gh;
        let a = ga;
        const isUser = f.home === career.userTeam || f.away === career.userTeam;
        if (!isUser) {
          [h, a] = simulateScore(teamById(f.home), teamById(f.away));
        } else if (f.home !== match.homeId) {
          // safety: align with fixture orientation
          h = ga;
          a = gh;
        }
        recordResult(table, f.home, f.away, h, a);
      });
      const userTie = fixtures.find(
        (f) => f.home === career.userTeam || f.away === career.userTeam
      );
      const myGoals = userTie?.home === career.userTeam ? gh : ga;
      const theirGoals = userTie?.home === career.userTeam ? ga : gh;
      const history = [
        ...career.history,
        `MD${round + 1} · ${teamById(career.userTeam).short} ${myGoals}–${theirGoals} ${
          teamById(userTie?.home === career.userTeam ? userTie.away : userTie?.home ?? "")?.short ?? ""
        }`,
      ];
      const next: CareerState = {
        ...career,
        table,
        history,
        round: career.round + 1,
        done: career.round + 1 >= career.schedule.length,
      };
      setCareer(next);
      saveJSON("cn_career_v1", next);
    }

    if (match.context === "cup" && cup && cup.stage < 3) {
      const stageIdx = cup.stage;
      const ties: CupTie[] = cup.stages[stageIdx].map((t) => {
        const isUser = t.home === cup.userTeam || t.away === cup.userTeam;
        if (isUser && !t.played) return { ...t, gh, ga, played: true };
        if (!t.played) {
          const [h, a] = simulateScore(teamById(t.home), teamById(t.away));
          return { ...t, gh: h, ga: a, played: true };
        }
        return t;
      });
      const stages = [...cup.stages];
      stages[stageIdx] = ties;
      let nextStage = stageIdx + 1;
      let champion: string | null = null;
      const winners = cupWinners(ties);
      if (stageIdx === 2) {
        champion = winners[0];
        nextStage = 3;
      } else {
        const next: CupTie[] = [];
        for (let i = 0; i < winners.length; i += 2) {
          next.push({ home: winners[i], away: winners[i + 1], gh: 0, ga: 0, played: false });
        }
        stages[stageIdx + 1] = next;
      }
      const nextCup: CupState = { ...cup, stage: nextStage, stages, champion };
      setCup(nextCup);
      saveJSON("cn_cup_v1", nextCup);
    }
  };

  // ------------------------------------------------------------ screens

  const bg = (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute inset-0 pitch-lines" />
      <div
        className="absolute -top-40 -right-40 w-[44rem] h-[44rem]"
        style={{ background: "radial-gradient(circle, rgba(23,105,255,0.12), transparent 62%)" }}
      />
      <div
        className="absolute -bottom-48 -left-32 w-[40rem] h-[40rem]"
        style={{ background: "radial-gradient(circle, rgba(108,59,255,0.11), transparent 62%)" }}
      />
    </div>
  );

  let content: React.ReactNode;
  switch (screen) {
    case "menu":
      content = <MainMenu onNav={setScreen} career={career} cup={cup} />;
      break;
    case "select":
      content = (
        <TeamSelect
          settings={settings}
          onStart={(h, a) => startMatch(h, a, "friendly")}
          onBack={() => setScreen("menu")}
        />
      );
      break;
    case "match":
      content = match ? (
        <MatchScreen
          key={match.key}
          home={teamById(match.homeId)}
          away={teamById(match.awayId)}
          settings={settings}
          context={match.context}
          onResult={onMatchResult}
          onExit={(dest) => setScreen(dest)}
        />
      ) : (
        <MainMenu onNav={setScreen} career={career} cup={cup} />
      );
      break;
    case "career":
      content = (
        <CareerScreen
          career={career}
          onNew={(teamId) => {
            const next = newCareer(teamId);
            if (career) next.season = career.season + (career.done ? 1 : 0);
            setCareer(next);
            saveJSON("cn_career_v1", next);
          }}
          onPlay={(h, a) => startMatch(h, a, "career")}
          onBack={() => setScreen("menu")}
          onReset={() => {
            setCareer(null);
            try {
              localStorage.removeItem("cn_career_v1");
            } catch {
              /* noop */
            }
          }}
        />
      );
      break;
    case "cup":
      content = (
        <CupScreen
          cup={cup}
          onNew={(teamId) => {
            const next = newCup(teamId);
            setCup(next);
            saveJSON("cn_cup_v1", next);
          }}
          onPlay={(h, a) => startMatch(h, a, "cup")}
          onBack={() => setScreen("menu")}
          onReset={() => {
            setCup(null);
            try {
              localStorage.removeItem("cn_cup_v1");
            } catch {
              /* noop */
            }
          }}
        />
      );
      break;
    case "teams":
      content = <TeamsScreen onBack={() => setScreen("menu")} />;
      break;
    case "players":
      content = <PlayersScreen onBack={() => setScreen("menu")} />;
      break;
    case "settings":
      content = (
        <SettingsScreen settings={settings} onChange={patchSettings} onBack={() => setScreen("menu")} />
      );
      break;
  }

  return (
    <div className="h-full bg-ink text-white relative overflow-hidden">
      {bg}
      <div className="relative h-full">{content}</div>
    </div>
  );
}
