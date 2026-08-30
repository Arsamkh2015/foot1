// ------------------------------------------------------------------
// Clásico Nights — 11v11 canvas match engine
// Top-down arcade football: ball physics, formation AI, GK saves,
// human control with auto-switching, stats, particles, screen shake.
// ------------------------------------------------------------------

import type { TeamDef, Difficulty } from "./data";
import { sfx } from "./audio";

export type Phase = "kickoff" | "play" | "goal" | "fulltime";

export interface UiSnapshot {
  phase: Phase;
  paused: boolean;
  scoreH: number;
  scoreA: number;
  timeLeft: number;
  countdown: number;
  minute: number;
  possH: number;
  shotsH: number;
  shotsA: number;
  savesH: number;
  savesA: number;
  scorer: string | null;
  scorerTeam: 0 | 1;
  goalMinute: number;
  controlledNum: number | null;
  demo: boolean;
}

export interface MatchConfig {
  home: TeamDef;
  away: TeamDef;
  durationSec: number;
  difficulty: Difficulty;
  demo?: boolean;
  shake?: boolean;
}

interface Vec {
  x: number;
  y: number;
}
const v = (x: number, y: number): Vec => ({ x, y });
const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
const norm = (a: Vec): Vec => {
  const l = Math.hypot(a.x, a.y);
  return l > 0.0001 ? v(a.x / l, a.y / l) : v(0, 0);
};
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// World dimensions (metres)
const W = 105;
const H = 68;
const MX = 9; // stand margin x
const MY = 7; // stand margin y
const GOAL_HALF = 3.66;
const NET = 2.3;
const BALL_R = 0.45;

type Role = "GK" | "DF" | "MF" | "FW";

const FORMATION: { role: Role; x: number; y: number; num: number }[] = [
  { role: "GK", x: 0.045, y: 0.5, num: 1 },
  { role: "DF", x: 0.17, y: 0.15, num: 2 },
  { role: "DF", x: 0.14, y: 0.38, num: 4 },
  { role: "DF", x: 0.14, y: 0.62, num: 5 },
  { role: "DF", x: 0.17, y: 0.85, num: 3 },
  { role: "MF", x: 0.34, y: 0.26, num: 6 },
  { role: "MF", x: 0.31, y: 0.5, num: 8 },
  { role: "MF", x: 0.34, y: 0.74, num: 10 },
  { role: "FW", x: 0.5, y: 0.2, num: 7 },
  { role: "FW", x: 0.52, y: 0.5, num: 9 },
  { role: "FW", x: 0.5, y: 0.8, num: 11 },
];

interface DiffPreset {
  speed: number;
  react: number;
  steal: number;
  shootErr: number;
  gk: number;
}
const DIFFS: Record<Difficulty, DiffPreset> = {
  amateur: { speed: 0.87, react: 0.3, steal: 0.5, shootErr: 2.7, gk: 0.72 },
  pro: { speed: 1.0, react: 0.2, steal: 0.85, shootErr: 1.6, gk: 1.0 },
  legend: { speed: 1.07, react: 0.13, steal: 1.15, shootErr: 0.85, gk: 1.22 },
};
const MATE_PRESET: DiffPreset = { speed: 0.98, react: 0.22, steal: 0.8, shootErr: 1.9, gk: 0.95 };

interface Ply {
  id: number;
  team: 0 | 1;
  role: Role;
  num: number;
  pos: Vec;
  vel: Vec;
  home: Vec;
  facing: Vec;
  speed: number;
  kickCd: number;
  decideT: number;
  target: Vec;
  chase: boolean;
  lungeT: number;
  holdT: number;
  skillT: number;
  skillCd: number;
  runPhase: number;
}

interface Ring {
  x: number;
  y: number;
  r: number;
  max: number;
  life: number;
  color: string;
}
interface Confetto {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  color: string;
  life: number;
}
interface Spark {
  x: number;
  y: number;
  life: number;
}
interface CrowdDot {
  x: number;
  y: number;
  c: string;
  base: number;
  amp: number;
  sp: number;
  ph: number;
}

const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

export class MatchEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cfg: MatchConfig;
  private onUi: (s: UiSnapshot) => void;

  private players: Ply[] = [];
  private ball = { pos: v(W / 2, H / 2), vel: v(0, 0), spin: 0, z: 0, vz: 0 };
  private owner: Ply | null = null;
  private moveTouch: Vec = v(0, 0);

  phase: Phase = "kickoff";
  paused = false;

  private scoreH = 0;
  private scoreA = 0;
  private elapsed = 0;
  private countdown = 1.5;
  private celebrateT = 0;
  private demoEndT = 0;
  private controlled: Ply | null = null;
  private autoSwitchT = 0;
  private keys = new Set<string>();
  private lastDir: Vec = v(1, 0);

  private raf = 0;
  private lastT = 0;
  private uiT = 0;
  private disposed = false;

  private shakeT = 0;
  private shakeAmp = 0;

  private rings: Ring[] = [];
  private confetti: Confetto[] = [];
  private sparks: Spark[] = [];
  private crowd: CrowdDot[] = [];

  private stats = { possH: 0, possA: 0, shotsH: 0, shotsA: 0, savesH: 0, savesA: 0 };
  private scorer: string | null = null;
  private scorerTeam: 0 | 1 = 0;
  private goalMinute = 0;

  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;
  private onVis: () => void;

  constructor(canvas: HTMLCanvasElement, cfg: MatchConfig, onUi: (s: UiSnapshot) => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2d context unavailable");
    this.ctx = ctx;
    this.cfg = cfg;
    this.onUi = onUi;

    this.onKeyDown = (e) => this.keyDown(e);
    this.onKeyUp = (e) => this.keys.delete(e.code);
    this.onVis = () => {
      if (document.hidden && this.phase === "play" && !this.cfg.demo) this.setPaused(true);
    };

    this.buildCrowd();
    this.buildPlayers();
    this.resetKickoff(0);

    if (!cfg.demo) {
      window.addEventListener("keydown", this.onKeyDown);
      window.addEventListener("keyup", this.onKeyUp);
      document.addEventListener("visibilitychange", this.onVis);
      sfx.crowd(true);
    }

    this.emitUi();
    this.lastT = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  // ------------------------------------------------------------ setup

  private anchor(f: { x: number; y: number }, team: 0 | 1): Vec {
    const half = W / 2;
    return team === 0 ? v(f.x * half, f.y * H) : v(W - f.x * half, f.y * H);
  }

  private buildPlayers() {
    const ratingScale = (t: TeamDef) => 0.94 + ((t.rating - 78) * 0.006);
    this.players = [];
    ([0, 1] as const).forEach((team) => {
      const def = team === 0 ? this.cfg.home : this.cfg.away;
      const preset = this.presetFor(team);
      const base: Record<Role, number> = { GK: 5.7, DF: 6.0, MF: 6.25, FW: 6.55 };
      FORMATION.forEach((f, i) => {
        const home = this.anchor(f, team);
        this.players.push({
          id: team * 11 + i,
          team,
          role: f.role,
          num: f.num,
          pos: v(home.x, home.y),
          vel: v(0, 0),
          home,
          facing: v(team === 0 ? 1 : -1, 0),
          speed: base[f.role] * ratingScale(def) * (f.role === "GK" ? 1 : preset.speed),
          kickCd: 0,
          decideT: Math.random() * 0.3,
          target: v(home.x, home.y),
          chase: false,
          lungeT: 0,
          holdT: 0,
          skillT: 0,
          skillCd: 0,
          runPhase: Math.random() * 6,
        });
      });
    });
  }

  private presetFor(team: 0 | 1): DiffPreset {
    if (this.cfg.demo) return DIFFS.pro;
    return team === 0 ? MATE_PRESET : DIFFS[this.cfg.difficulty];
  }

  private buildCrowd() {
    const palette = ["#1769FF", "#6C3BFF", "#00A8FF", "#B8C2D9", "#22315e", "#1a2547", "#ffffff"];
    const dots: CrowdDot[] = [];
    const hp = this.cfg.home.primary;
    const ap = this.cfg.away.primary;
    for (let i = 0; i < 720; i++) {
      const x = -MX + 0.5 + Math.random() * (W + 2 * MX - 1);
      const y = -MY + 0.5 + Math.random() * (H + 2 * MY - 1);
      if (x > -2.2 && x < W + 2.2 && y > -2.2 && y < H + 2.2) {
        i--;
        continue;
      }
      let c = palette[(Math.random() * palette.length) | 0];
      const r = Math.random();
      if (r < 0.08) c = hp;
      else if (r < 0.16) c = ap;
      dots.push({
        x,
        y,
        c,
        base: 0.16 + Math.random() * 0.3,
        amp: Math.random() * 0.2,
        sp: 1 + Math.random() * 3,
        ph: Math.random() * Math.PI * 2,
      });
    }
    this.crowd = dots;
  }

  private resetKickoff(kickTeam: 0 | 1) {
    this.players.forEach((p) => {
      p.pos = v(p.home.x, p.home.y);
      p.vel = v(0, 0);
      p.target = v(p.home.x, p.home.y);
      p.kickCd = 0;
      p.lungeT = 0;
      p.holdT = 0;
      p.skillT = 0;
      p.skillCd = 0;
      p.chase = false;
    });
    this.ball.pos = v(W / 2, H / 2);
    this.ball.vel = v(0, 0);
    this.ball.z = 0;
    this.ball.vz = 0;
    this.owner = null;
    this.phase = "kickoff";
    this.countdown = 1.5;
    this.scorer = null;
    if (!this.cfg.demo) {
      const cf = this.players.find((p) => p.team === 0 && p.num === 9) ?? null;
      this.controlled = cf;
      this.autoSwitchT = 0.6;
    }
    void kickTeam;
    this.emitUi();
  }

  // ------------------------------------------------------------ input

  private keyDown(e: KeyboardEvent) {
    const c = e.code;
    if (
      ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(c)
    )
      e.preventDefault();
    if (e.repeat) {
      this.keys.add(c);
      return;
    }
    this.keys.add(c);
    if (this.cfg.demo) return;

    if (c === "KeyP" || c === "Escape") {
      if (this.phase !== "fulltime") this.setPaused(!this.paused);
      return;
    }
    if (this.paused || this.phase !== "play") return;

    const me = this.controlled;
    if (c === "Space" || c === "KeyK") {
      if (me && this.owner === me) this.humanShoot(me);
      else if (me) me.lungeT = 0.28;
    } else if (c === "KeyX" || c === "KeyJ") {
      if (me && this.owner === me) this.humanPass(me);
      else if (me) me.lungeT = 0.28;
    } else if (c === "KeyC" || c === "KeyL") {
      if (me && this.owner === me) this.humanCross(me);
    } else if (c === "KeyZ" || c === "KeyI") {
      if (me) this.humanDribble(me);
    } else if (c === "KeyQ" || c === "KeyE") {
      this.manualSwitch(c === "KeyE" ? 1 : -1);
    }
  }

  /** Public input for touch buttons. */
  action(name: "shoot" | "pass" | "cross" | "dribble") {
    if (this.cfg.demo || this.paused || this.phase !== "play") return;
    const me = this.controlled;
    if (!me) return;
    if (name === "shoot") {
      if (this.owner === me) this.humanShoot(me);
      else me.lungeT = 0.28;
    } else if (name === "pass") {
      if (this.owner === me) this.humanPass(me);
      else me.lungeT = 0.28;
    } else if (name === "cross") {
      if (this.owner === me) this.humanCross(me);
    } else if (name === "dribble") {
      this.humanDribble(me);
    }
  }

  /** Public input for the touch joystick (-1..1 axes). */
  setMove(x: number, y: number) {
    this.moveTouch = v(clamp(x, -1, 1), clamp(y, -1, 1));
  }

  setPaused(p: boolean) {
    if (this.phase === "fulltime" && p) return;
    if (this.paused === p) return;
    this.paused = p;
    this.emitUi();
  }

  private manualSwitch(dir: 1 | -1) {
    const cands = this.players
      .filter((p) => p.team === 0 && (p.role !== "GK" || this.ball.pos.x < 25))
      .sort((a, b) => dist(a.pos, this.ball.pos) - dist(b.pos, this.ball.pos));
    if (cands.length === 0) return;
    let idx = this.controlled ? cands.indexOf(this.controlled) : -1;
    idx = (idx + dir + cands.length) % cands.length;
    this.controlled = cands[idx];
    this.autoSwitchT = 1.2;
    sfx.play("hover");
  }

  // ------------------------------------------------------------ actions

  private kick(p: Ply, target: Vec, power: number, kind: "pass" | "shoot" | "punt" | "cross") {
    const d = norm(v(target.x - this.ball.pos.x, target.y - this.ball.pos.y));
    this.ball.vel = v(d.x * power + p.vel.x * 0.25, d.y * power + p.vel.y * 0.25);
    p.kickCd = 0.42;
    if (this.owner === p) this.owner = null;
    if (kind === "cross") {
      this.ball.z = 0.25;
      this.ball.vz = 6.5 + power * 0.16;
    }
    this.rings.push({
      x: this.ball.pos.x,
      y: this.ball.pos.y,
      r: 0.4,
      max: kind === "shoot" ? 3.4 : 2.4,
      life: 1,
      color: kind === "shoot" ? "#00E5FF" : kind === "cross" ? "#6C3BFF" : "#ffffff",
    });
    if (kind === "shoot") {
      if (p.team === 0) this.stats.shotsH++;
      else this.stats.shotsA++;
      this.addShake(2.5);
      sfx.play("kick");
    } else if (kind === "punt") {
      sfx.play("kick");
    } else if (kind === "cross") {
      sfx.play("cross");
    } else {
      sfx.play("pass");
    }
    if (p.team === 0 && !this.cfg.demo) this.autoSwitchT = Math.max(this.autoSwitchT, 0.9);
  }

  private humanShoot(p: Ply) {
    const goal = v(W, H / 2);
    const d = dist(p.pos, goal);
    const aimY =
      H / 2 +
      this.lastDir.y * clamp(d * 0.12, 0.5, 3.5) +
      (Math.random() - 0.5) * clamp(6 - d * 0.14, 0.6, 3);
    this.kick(p, v(W + 1, clamp(aimY, H / 2 - GOAL_HALF - 1.4, H / 2 + GOAL_HALF + 1.4)), 27 + Math.random() * 4, "shoot");
  }

  private humanPass(p: Ply) {
    const aim =
      Math.hypot(this.lastDir.x, this.lastDir.y) > 0.1 ? norm(this.lastDir) : v(1, 0);
    let best: Ply | null = null;
    let bestScore = -Infinity;
    for (const m of this.players) {
      if (m.team !== 0 || m === p) continue;
      const d = dist(p.pos, m.pos);
      if (d < 3.5 || d > 52) continue;
      const dirM = norm(v(m.pos.x - p.pos.x, m.pos.y - p.pos.y));
      const align = dirM.x * aim.x + dirM.y * aim.y;
      const s = align * 10 + (m.pos.x - p.pos.x) * 0.35 - d * 0.12;
      if (s > bestScore) {
        bestScore = s;
        best = m;
      }
    }
    if (best) {
      const lead = v(best.pos.x + best.vel.x * 0.35, best.pos.y + best.vel.y * 0.35);
      const d = dist(p.pos, lead);
      this.kick(p, lead, clamp(11 + d * 0.85, 13, 26), "pass");
    } else {
      this.kick(p, v(p.pos.x + aim.x * 12, p.pos.y + aim.y * 12), 12, "pass");
    }
  }

  /** Lofted cross / long diagonal ball into the attacking zone. */
  private humanCross(p: Ply) {
    const attackX = W;
    // prefer an advanced wide or central teammate in the final third
    let best: Ply | null = null;
    let bestS = -Infinity;
    for (const m of this.players) {
      if (m.team !== 0 || m === p || m.role === "GK") continue;
      if (m.pos.x < W * 0.45) continue;
      const s = m.pos.x * 1.1 - dist(p.pos, m.pos) * 0.25 + Math.random() * 4;
      if (s > bestS) {
        bestS = s;
        best = m;
      }
    }
    const target = best
      ? v(best.pos.x + best.vel.x * 0.5, best.pos.y + best.vel.y * 0.5)
      : v(attackX - 8, p.pos.y > H / 2 ? H / 2 + 6 : H / 2 - 6);
    const d = dist(p.pos, target);
    this.kick(p, target, clamp(13 + d * 0.62, 15, 24), "cross");
  }

  /** Close-control burst: brief speed boost + steal immunity. */
  private humanDribble(p: Ply) {
    if (p.skillCd > 0) return;
    p.skillT = 0.45;
    p.skillCd = 1.0;
    sfx.play("skill");
    this.rings.push({ x: p.pos.x, y: p.pos.y, r: 0.6, max: 2.6, life: 1, color: "#00E5FF" });
    if (this.owner === p) {
      const f = Math.hypot(p.vel.x, p.vel.y) > 0.5 ? norm(p.vel) : p.facing;
      this.ball.vel = v(f.x * 9 + p.vel.x, f.y * 9 + p.vel.y);
      this.owner = null;
      p.kickCd = 0.18; // re-collect almost instantly
      this.autoSwitchT = Math.max(this.autoSwitchT, 0.5);
      // keep the ball with the runner
      this.controlled = p;
    }
  }

  // ------------------------------------------------------------ AI

  private aiDecide(p: Ply, dt: number) {
    const preset = this.presetFor(p.team);
    const attackX = p.team === 0 ? W : 0;
    const ownGoal = v(p.team === 0 ? 0 : W, H / 2);
    const oppGoal = v(attackX, H / 2);
    const ball = this.ball;
    const ownerTeam = this.owner ? this.owner.team : -1;

    // chase selection
    if (ownerTeam !== p.team) {
      const mates = this.players
        .filter((q) => q.team === p.team && q.role !== "GK")
        .sort((a, b) => dist(a.pos, ball.pos) - dist(b.pos, ball.pos));
      p.chase = mates[0] === p || mates[1] === p;
    } else {
      p.chase = false;
    }

    if (this.owner === p) {
      // ------- dribble / shoot / pass -------
      const dirG = norm(v(oppGoal.x - p.pos.x, oppGoal.y - p.pos.y));
      let steer = v(dirG.x, dirG.y);
      let pressure = Infinity;
      for (const q of this.players) {
        if (q.team === p.team) continue;
        const d = dist(q.pos, p.pos);
        if (d < pressure) pressure = d;
        if (d < 3.2) {
          const away = norm(v(p.pos.x - q.pos.x, p.pos.y - q.pos.y));
          steer = norm(v(steer.x * 0.6 + away.x * 0.9, steer.y * 0.6 + away.y * 0.9));
        }
      }
      p.target = v(p.pos.x + steer.x * 6, p.pos.y + steer.y * 6);

      p.decideT -= dt;
      if (p.decideT <= 0) {
        p.decideT = preset.react * (0.7 + Math.random() * 0.7);
        const dGoal = dist(p.pos, oppGoal);

        // lofted cross from wide, advanced areas
        const wide = p.pos.y < 15 || p.pos.y > H - 15;
        const advanced = p.team === 0 ? p.pos.x > W * 0.6 : p.pos.x < W * 0.4;
        if (wide && advanced && Math.random() < 0.42) {
          const mates = this.players.filter(
            (m) => m.team === p.team && (m.role === "FW" || m.role === "MF") && m !== p
          );
          const box = mates.sort((a, b2) => dist(a.pos, oppGoal) - dist(b2.pos, oppGoal))[0];
          const t = box ? v(box.pos.x, box.pos.y) : v(p.team === 0 ? W - 12 : 12, H / 2);
          const dd2 = dist(p.pos, t);
          this.kick(p, t, clamp(13 + dd2 * 0.62, 15, 24), "cross");
          return;
        }

        const shootChance = dGoal < 16 ? 0.75 : dGoal < 26 ? 0.34 : 0.08;
        if (dGoal < 30 && Math.random() < shootChance) {
          const err =
            preset.shootErr * (0.5 + dGoal / 45) * (0.4 + Math.random());
          const off = (Math.random() * 2 - 1) * err;
          this.kick(
            p,
            v(oppGoal.x + (p.team === 0 ? 1.5 : -1.5), clamp(H / 2 + off, H / 2 - GOAL_HALF - 2, H / 2 + GOAL_HALF + 2)),
            26 + Math.random() * 5,
            "shoot"
          );
          return;
        }
        if (pressure < 2.4 && Math.random() < 0.55) {
          const mate = this.bestPassTarget(p);
          if (mate) {
            const lead = v(mate.pos.x + mate.vel.x * 0.3, mate.pos.y + mate.vel.y * 0.3);
            const d = dist(p.pos, lead);
            this.kick(p, lead, clamp(11 + d * 0.85, 13, 26), "pass");
            return;
          }
        }
      }
      return;
    }

    // ------- off-ball movement -------
    const home = p.home;
    if (ownerTeam === p.team) {
      // support attack: push up, drift toward ball lane
      const push = p.role === "FW" ? 20 : p.role === "MF" ? 14 : 7;
      const tx =
        p.team === 0
          ? clamp(home.x + push, 2, W - 3)
          : clamp(home.x - push, 3, W - 2);
      const ty = clamp(lerp(home.y, ball.pos.y, 0.3), 2, H - 2);
      p.target = v(tx, ty);
    } else if (ownerTeam === -1) {
      // loose ball
      if (p.chase) {
        p.target = v(ball.pos.x + ball.vel.x * 0.28, ball.pos.y + ball.vel.y * 0.28);
      } else {
        p.target = v(lerp(home.x, ball.pos.x, 0.24), lerp(home.y, ball.pos.y, 0.24));
      }
    } else {
      // defending
      if (p.chase) {
        p.target = v(ball.pos.x + ball.vel.x * 0.25, ball.pos.y + ball.vel.y * 0.25);
      } else {
        p.target = v(
          lerp(home.x, lerp(ball.pos.x, ownGoal.x, 0.45), 0.42),
          lerp(home.y, lerp(ball.pos.y, ownGoal.y, 0.35), 0.42)
        );
      }
    }
  }

  private bestPassTarget(p: Ply): Ply | null {
    let best: Ply | null = null;
    let bestS = -Infinity;
    for (const m of this.players) {
      if (m.team !== p.team || m === p || m.role === "GK") continue;
      const d = dist(p.pos, m.pos);
      if (d < 4 || d > 46) continue;
      const forward = p.team === 0 ? m.pos.x - p.pos.x : p.pos.x - m.pos.x;
      let open = 99;
      for (const q of this.players) {
        if (q.team !== p.team) {
          const dq = dist(q.pos, m.pos);
          if (dq < open) open = dq;
        }
      }
      const s = forward * 1.05 + open * 1.7 - d * 0.32;
      if (s > bestS) {
        bestS = s;
        best = m;
      }
    }
    return best;
  }

  private updateGK(p: Ply, dt: number) {
    const preset = this.presetFor(p.team);
    const ball = this.ball;
    const lineX = p.team === 0 ? 1.15 : W - 1.15;
    const towardBall = p.team === 0 ? ball.pos.x < 20 : ball.pos.x > W - 20;
    let tx = lineX;
    let ty = clamp(ball.pos.y, H / 2 - GOAL_HALF - 3.2, H / 2 + GOAL_HALF + 3.2);
    if (this.owner === p) {
      p.holdT -= dt;
      if (p.holdT <= 0) {
        const mates = this.players.filter((q) => q.team === p.team && (q.role === "DF" || q.role === "MF"));
        const mate = mates[(Math.random() * mates.length) | 0];
        const t = v(
          lerp(mate.home.x, W / 2, 0.35) + (Math.random() - 0.5) * 6,
          lerp(mate.home.y, H / 2, 0.3) + (Math.random() - 0.5) * 8
        );
        this.kick(p, t, 23 + Math.random() * 4, "punt");
      }
    } else if (towardBall && dist(p.pos, ball.pos) < 9) {
      tx = clamp(ball.pos.x, p.team === 0 ? 0.7 : W - 14, p.team === 0 ? 14 : W - 0.7);
      ty = ball.pos.y;
    }
    const want = norm(v(tx - p.pos.x, ty - p.pos.y));
    const dd = dist(p.pos, v(tx, ty));
    const sp = p.speed * (0.85 + preset.gk * 0.25) * (dd > 0.5 ? 1 : 0);
    p.vel = v(
      lerp(p.vel.x, want.x * sp, Math.min(1, dt * 8)),
      lerp(p.vel.y, want.y * sp, Math.min(1, dt * 8))
    );
    p.pos = v(p.pos.x + p.vel.x * dt, p.pos.y + p.vel.y * dt);
    p.pos.x = clamp(p.pos.x, p.team === 0 ? 0.7 : W - 15, p.team === 0 ? 15 : W - 0.7);
    p.pos.y = clamp(p.pos.y, 1, H - 1);
  }

  // ------------------------------------------------------------ sim

  private update(dt: number) {
    this.shakeT = Math.max(0, this.shakeT - dt * 2.4);

    // ambient camera flashes in the stands
    if (Math.random() < dt * 7) {
      const side = Math.random();
      const x = -MX + Math.random() * (W + 2 * MX);
      const y = side < 0.5 ? -MY + Math.random() * (MY - 2.4) : H + 2.4 + Math.random() * (MY - 2.4);
      this.sparks.push({ x, y, life: 0.18 });
    }
    this.sparks = this.sparks.filter((s) => (s.life -= dt) > 0);

    // particles
    this.rings = this.rings.filter((r) => {
      r.life -= dt * 2.6;
      r.r = lerp(r.r, r.max, dt * 9);
      return r.life > 0;
    });
    this.confetti = this.confetti.filter((c) => {
      c.life -= dt;
      c.vy += 22 * dt;
      c.vx *= 1 - dt * 1.4;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rot += c.vr * dt;
      return c.life > 0;
    });

    if (this.phase === "kickoff") {
      this.countdown -= dt;
      this.players.forEach((p) => {
        const want = norm(v(p.home.x - p.pos.x, p.home.y - p.pos.y));
        p.vel = v(lerp(p.vel.x, want.x * p.speed * 0.6, dt * 6), lerp(p.vel.y, want.y * p.speed * 0.6, dt * 6));
        p.pos = v(p.pos.x + p.vel.x * dt, p.pos.y + p.vel.y * dt);
      });
      if (this.countdown <= 0) {
        this.phase = "play";
        sfx.play("whistle");
        this.emitUi();
      }
      return;
    }

    if (this.phase === "goal") {
      this.celebrateT -= dt;
      if (this.celebrateT <= 0) {
        this.resetKickoff(this.scorerTeam === 0 ? 1 : 0);
      }
      return;
    }

    if (this.phase === "fulltime") {
      if (this.cfg.demo) {
        this.demoEndT -= dt;
        if (this.demoEndT <= 0) this.rematch();
      }
      return;
    }

    // ------- playing -------
    this.elapsed += dt;
    if (this.owner) {
      if (this.owner.team === 0) this.stats.possH += dt;
      else this.stats.possA += dt;
    } else {
      this.stats.possH += dt * 0.5;
      this.stats.possA += dt * 0.5;
    }

    // human movement
    if (!this.cfg.demo && this.controlled && this.phase === "play") {
      const p = this.controlled;
      const k = this.keys;
      let ix = 0;
      let iy = 0;
      if (k.has("KeyA") || k.has("ArrowLeft")) ix -= 1;
      if (k.has("KeyD") || k.has("ArrowRight")) ix += 1;
      if (k.has("KeyW") || k.has("ArrowUp")) iy -= 1;
      if (k.has("KeyS") || k.has("ArrowDown")) iy += 1;
      ix += this.moveTouch.x;
      iy += this.moveTouch.y;
      const moving = Math.hypot(ix, iy) > 0.18;
      const sprint = k.has("ShiftLeft") || k.has("ShiftRight");
      const sp = (sprint ? 8.7 : 6.7) * (1 + p.skillT * 1.1);
      const want = moving ? norm(v(ix, iy)) : v(0, 0);
      if (moving) this.lastDir = want;
      p.vel = v(
        lerp(p.vel.x, want.x * sp, Math.min(1, dt * 9)),
        lerp(p.vel.y, want.y * sp, Math.min(1, dt * 9))
      );
      p.pos = v(p.pos.x + p.vel.x * dt, p.pos.y + p.vel.y * dt);
    }

    // AI + movement for everyone else
    for (const p of this.players) {
      p.kickCd = Math.max(0, p.kickCd - dt);
      p.lungeT = Math.max(0, p.lungeT - dt);
      p.skillT = Math.max(0, p.skillT - dt);
      p.skillCd = Math.max(0, p.skillCd - dt);
      p.runPhase += Math.hypot(p.vel.x, p.vel.y) * dt * 2.6;
      if (p.role === "GK") {
        this.updateGK(p, dt);
        continue;
      }
      if (!this.cfg.demo && p === this.controlled) {
        // already moved above; still clamp
      } else {
        this.aiDecide(p, dt);
        const d = dist(p.pos, p.target);
        const want = d > 0.45 ? norm(v(p.target.x - p.pos.x, p.target.y - p.pos.y)) : v(0, 0);
        const sp = p.speed * (p.chase ? 1.06 : 0.92);
        p.vel = v(
          lerp(p.vel.x, want.x * sp, Math.min(1, dt * 7)),
          lerp(p.vel.y, want.y * sp, Math.min(1, dt * 7))
        );
        p.pos = v(p.pos.x + p.vel.x * dt, p.pos.y + p.vel.y * dt);
      }
      p.pos.x = clamp(p.pos.x, 1, W - 1);
      p.pos.y = clamp(p.pos.y, 1, H - 1);
      if (Math.hypot(p.vel.x, p.vel.y) > 0.6) p.facing = norm(p.vel);
    }

    // separation
    for (let i = 0; i < this.players.length; i++) {
      for (let j = i + 1; j < this.players.length; j++) {
        const a = this.players[i];
        const b = this.players[j];
        const d = dist(a.pos, b.pos);
        if (d < 1.7 && d > 0.001) {
          const push = (1.7 - d) / 2;
          const n = norm(v(b.pos.x - a.pos.x, b.pos.y - a.pos.y));
          a.pos = v(a.pos.x - n.x * push, a.pos.y - n.y * push);
          b.pos = v(b.pos.x + n.x * push, b.pos.y + n.y * push);
        }
      }
    }

    this.simBall(dt);
    this.possession(dt);

    // auto switch
    if (!this.cfg.demo) {
      this.autoSwitchT -= dt;
      if (this.autoSwitchT <= 0) {
        this.autoSwitchT = 0.28;
        if (!(this.owner && this.owner === this.controlled)) {
          const cands = this.players
            .filter((p) => p.team === 0 && (p.role !== "GK" || this.ball.pos.x < 24))
            .sort((a, b) => dist(a.pos, this.ball.pos) - dist(b.pos, this.ball.pos));
          const best = cands[0];
          if (best && (!this.controlled || dist(this.controlled.pos, this.ball.pos) > dist(best.pos, this.ball.pos) + 2.2)) {
            this.controlled = best;
          }
        }
      }
    }

    // full time
    if (this.elapsed >= this.cfg.durationSec) {
      this.phase = "fulltime";
      this.demoEndT = 3;
      sfx.play("whistleFull");
      sfx.crowd(false);
      this.emitUi();
    }
  }

  private simBall(dt: number) {
    const b = this.ball;
    if (this.owner) {
      const o = this.owner;
      const f = Math.hypot(o.vel.x, o.vel.y) > 0.6 ? norm(o.vel) : o.facing;
      b.pos = v(o.pos.x + f.x * 0.95, o.pos.y + f.y * 0.95);
      b.vel = v(o.vel.x, o.vel.y);
      b.z = 0;
      b.vz = 0;
      b.spin += Math.hypot(o.vel.x, o.vel.y) * dt * 0.3;
      return;
    }

    b.pos = v(b.pos.x + b.vel.x * dt, b.pos.y + b.vel.y * dt);
    const sp0 = Math.hypot(b.vel.x, b.vel.y);
    const drag = Math.exp(-0.42 * dt);
    b.vel = v(b.vel.x * drag, b.vel.y * drag);
    let sp = Math.hypot(b.vel.x, b.vel.y);
    if (sp > 0.25) {
      const ns = Math.max(0, sp - 1.15 * dt);
      b.vel = v((b.vel.x / sp) * ns, (b.vel.y / sp) * ns);
      sp = ns;
    } else if (sp > 0) {
      b.vel = v(0, 0);
      sp = 0;
    }
    if (sp > 34) {
      b.vel = v((b.vel.x / sp) * 34, (b.vel.y / sp) * 34);
      sp = 34;
    }
    b.spin += sp * dt * 0.35;

    // altitude (lofted crosses)
    if (b.z > 0 || b.vz > 0) {
      b.vz -= 26 * dt;
      b.z += b.vz * dt;
      if (b.z <= 0) {
        b.z = 0;
        if (b.vz < -2.5) sfx.play("bounce");
        b.vz = Math.abs(b.vz) > 1.4 ? -b.vz * 0.4 : 0;
      }
    }

    const inMouth = Math.abs(b.pos.y - H / 2) < GOAL_HALF - 0.15;

    // touchlines
    if (b.pos.y < BALL_R) {
      b.pos.y = BALL_R;
      if (b.vel.y < 0) {
        if (Math.abs(b.vel.y) > 5) sfx.play("bounce");
        b.vel.y *= -0.55;
      }
    } else if (b.pos.y > H - BALL_R) {
      b.pos.y = H - BALL_R;
      if (b.vel.y > 0) {
        if (Math.abs(b.vel.y) > 5) sfx.play("bounce");
        b.vel.y *= -0.55;
      }
    }

    // goal line / posts / net
    const postBounce = (sign: number) => {
      b.vel.x = Math.abs(b.vel.x) * 0.6 * sign;
      b.vel.y += (Math.random() - 0.5) * 4;
      sfx.play("post");
      this.addShake(3);
      this.rings.push({ x: b.pos.x, y: b.pos.y, r: 0.3, max: 2.6, life: 1, color: "#FEBE10" });
    };

    if (b.pos.x < BALL_R) {
      if (inMouth && b.z < 2.2) {
        if (b.pos.x < -NET + 0.35) {
          b.pos.x = -NET + 0.35;
          b.vel.x *= -0.15;
          b.vel.y *= 0.4;
        }
        if (b.pos.x < -0.65) {
          this.goalScored(1);
          return;
        }
      } else {
        const postDist = Math.abs(Math.abs(b.pos.y - H / 2) - GOAL_HALF);
        if (b.pos.x < 0.35 && postDist < 0.55) {
          postBounce(1);
        } else {
          b.pos.x = BALL_R;
          if (b.vel.x < 0) {
            if (Math.abs(b.vel.x) > 5) sfx.play("bounce");
            b.vel.x *= -0.55;
          }
        }
      }
    } else if (b.pos.x > W - BALL_R) {
      if (inMouth && b.z < 2.2) {
        if (b.pos.x > W + NET - 0.35) {
          b.pos.x = W + NET - 0.35;
          b.vel.x *= -0.15;
          b.vel.y *= 0.4;
        }
        if (b.pos.x > W + 0.65) {
          this.goalScored(0);
          return;
        }
      } else {
        const postDist = Math.abs(Math.abs(b.pos.y - H / 2) - GOAL_HALF);
        if (b.pos.x > W - 0.35 && postDist < 0.55) {
          postBounce(-1);
        } else {
          b.pos.x = W - BALL_R;
          if (b.vel.x > 0) {
            if (Math.abs(b.vel.x) > 5) sfx.play("bounce");
            b.vel.x *= -0.55;
          }
        }
      }
    }
    void sp0;
  }

  private possession(dt: number) {
    const b = this.ball;
    const bsp = Math.hypot(b.vel.x, b.vel.y);

    if (this.owner) {
      const o = this.owner;
      if (dist(o.pos, b.pos) > 2.1) {
        this.owner = null;
      } else if (o.kickCd <= 0 && o.skillT <= 0) {
        // steal attempts (skill-move burst is briefly protected)
        const diff = DIFFS[this.cfg.demo ? "pro" : this.cfg.difficulty];
        for (const q of this.players) {
          if (q.team === o.team || q.kickCd > 0) continue;
          const d = dist(q.pos, o.pos);
          const isHuman = !this.cfg.demo && q === this.controlled;
          const thresh = isHuman && q.lungeT > 0 ? 2.1 : 1.55;
          if (d < thresh) {
            const ownerIsHuman = !this.cfg.demo && o === this.controlled;
            let rate: number;
            if (isHuman) rate = q.lungeT > 0 ? 3.2 : 1.5;
            else if (ownerIsHuman) rate = 0.5 * diff.steal;
            else rate = (this.cfg.demo ? 0.9 : 0.85) * diff.steal;
            if (Math.random() < rate * dt) {
              this.owner = q;
              if (!this.cfg.demo && q.team === 0) this.autoSwitchT = 0;
              sfx.play("tackle");
              this.rings.push({ x: o.pos.x, y: o.pos.y, r: 0.4, max: 2.2, life: 1, color: "#B8C2D9" });
              this.addShake(1.6);
              break;
            }
          }
        }
      }
    }

    if (!this.owner) {
      // keepers react at any ball speed
        for (const p of this.players) {
          if (p.role !== "GK" || p.kickCd > 0 || b.z > 1.9) continue;
          const d = dist(p.pos, b.pos);        if (d < 1.75) {
          if (bsp < 10.5) {
            this.owner = p;
            p.holdT = 0.9 + Math.random() * 0.6;
            sfx.play("catch");
          } else {
            // parry / save
            const n = norm(v(b.pos.x - p.pos.x, b.pos.y - p.pos.y));
            const back = p.team === 0 ? 1 : -1; // push away from own goal
            b.vel = v(
              Math.abs(n.x * (bsp * 0.42 + 4)) * back + (Math.random() - 0.5) * 6,
              n.y * (bsp * 0.42 + 4) + (Math.random() - 0.5) * 7
            );
            p.kickCd = 0.55;
            if (p.team === 0) this.stats.savesH++;
            else this.stats.savesA++;
            sfx.play("save");
            this.addShake(3.5);
            this.rings.push({ x: p.pos.x, y: p.pos.y, r: 0.5, max: 3.2, life: 1, color: "#00E5FF" });
          }
          break;
        }
      }
    }

    if (!this.owner && bsp < 17 && b.z < 0.5) {
      let best: Ply | null = null;
      let bd = 2.0;
      for (const p of this.players) {
        if (p.kickCd > 0 || p.role === "GK") continue;
        const cr = !this.cfg.demo && p === this.controlled ? 1.85 : 1.45;
        const d = dist(p.pos, b.pos);
        if (d < bd && d < cr) {
          bd = d;
          best = p;
        }
      }
      if (best) this.owner = best;
    }
  }

  private goalScored(team: 0 | 1) {
    if (this.phase !== "play") return;
    if (team === 0) this.scoreH++;
    else this.scoreA++;
    const def = team === 0 ? this.cfg.home : this.cfg.away;
    const attackers = def.stars.filter((s) => s.pos === "FW" || s.pos === "MF");
    const pool = attackers.length > 0 ? attackers : def.stars;
    this.scorer = pool[(Math.random() * pool.length) | 0]?.name ?? def.short;
    this.scorerTeam = team;
    this.goalMinute = clamp(Math.round((this.elapsed / this.cfg.durationSec) * 90), 1, 90);
    this.phase = "goal";
    this.celebrateT = 2.7;
    this.ball.vel = v(0, 0);
    this.owner = null;
    sfx.play("goal");
    this.addShake(11);
    // confetti storm around the struck goal
    const gx = team === 0 ? W : 0;
    const colors = [def.primary, def.secondary, "#00E5FF", "#ffffff", "#FEBE10"];
    for (let i = 0; i < 130; i++) {
      this.confetti.push({
        x: gx + (Math.random() - 0.5) * 14,
        y: H / 2 + (Math.random() - 0.5) * 16,
        vx: (Math.random() - 0.5) * 26,
        vy: -6 - Math.random() * 20,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 14,
        color: colors[(Math.random() * colors.length) | 0],
        life: 1.6 + Math.random() * 1.1,
      });
    }
    this.emitUi();
  }

  private addShake(amp: number) {
    if (!this.cfg.shake) return;
    this.shakeAmp = Math.max(this.shakeAmp * this.shakeT, amp);
    this.shakeT = Math.max(this.shakeT, 0.9);
  }

  // ------------------------------------------------------------ public

  rematch() {
    this.paused = false;
    this.scoreH = 0;
    this.scoreA = 0;
    this.elapsed = 0;
    this.stats = { possH: 0, possA: 0, shotsH: 0, shotsA: 0, savesH: 0, savesA: 0 };
    this.rings = [];
    this.confetti = [];
    if (!this.cfg.demo) sfx.crowd(true);
    this.resetKickoff(0);
  }

  getUi(): UiSnapshot {
    const poss = this.stats.possH + this.stats.possA;
    return {
      phase: this.phase,
      paused: this.paused,
      scoreH: this.scoreH,
      scoreA: this.scoreA,
      timeLeft: Math.max(0, this.cfg.durationSec - this.elapsed),
      countdown: this.phase === "kickoff" ? this.countdown : 0,
      minute: clamp(Math.round((this.elapsed / this.cfg.durationSec) * 90), 0, 90),
      possH: poss > 0 ? this.stats.possH / poss : 0.5,
      shotsH: this.stats.shotsH,
      shotsA: this.stats.shotsA,
      savesH: this.stats.savesH,
      savesA: this.stats.savesA,
      scorer: this.scorer,
      scorerTeam: this.scorerTeam,
      goalMinute: this.goalMinute,
      controlledNum: this.controlled ? this.controlled.num : null,
      demo: !!this.cfg.demo,
    };
  }

  private emitUi() {
    if (!this.disposed) this.onUi(this.getUi());
  }

  // ------------------------------------------------------------ draw

  private frame = (t: number) => {
    if (this.disposed) return;
    const dt = clamp((t - this.lastT) / 1000, 0.001, 0.033);
    this.lastT = t;
    if (!this.paused) this.update(dt);
    this.draw(t / 1000);
    this.uiT -= dt;
    if (this.uiT <= 0) {
      this.uiT = 0.1;
      this.emitUi();
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  private draw(t: number) {
    const cv = this.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const cw = cv.clientWidth * dpr;
    const chh = cv.clientHeight * dpr;
    if (cv.width !== Math.round(cw) || cv.height !== Math.round(chh)) {
      cv.width = Math.round(cw);
      cv.height = Math.round(chh);
    }
    const ctx = this.ctx;
    const s = Math.min(cv.width / (W + 2 * MX), cv.height / (H + 2 * MY));
    let ox = (cv.width - W * s) / 2;
    let oy = (cv.height - H * s) / 2;
    if (this.shakeT > 0) {
      const a = this.shakeAmp * this.shakeT * s * 0.14;
      ox += (Math.random() - 0.5) * 2 * a;
      oy += (Math.random() - 0.5) * 2 * a;
    }

    // stands backdrop
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#04071a";
    ctx.fillRect(0, 0, cv.width, cv.height);

    ctx.setTransform(s, 0, 0, s, ox, oy);

    // stadium tier bands (outer → inner), pitch drawn over the middle
    ctx.fillStyle = "#060b1e";
    ctx.fillRect(-MX, -MY, W + 2 * MX, H + 2 * MY);
    ctx.fillStyle = "#0a1330";
    ctx.fillRect(-5.0, -4.7, W + 10, H + 9.4);
    ctx.fillStyle = "#0d1738";
    ctx.fillRect(-2.7, -2.5, W + 5.4, H + 5);
    ctx.strokeStyle = "rgba(0,168,255,0.12)";
    ctx.lineWidth = 0.08;
    ctx.strokeRect(-2.7, -2.5, W + 5.4, H + 5);
    ctx.strokeRect(-5.0, -4.7, W + 10, H + 9.4);

    // crowd
    for (const d of this.crowd) {
      const al = clamp(d.base + Math.sin(t * d.sp + d.ph) * d.amp, 0.05, 0.75);
      ctx.globalAlpha = al;
      ctx.fillStyle = d.c;
      ctx.fillRect(d.x - 0.28, d.y - 0.28, 0.56, 0.56);
    }
    ctx.globalAlpha = 1;

    // camera flashes
    for (const sp of this.sparks) {
      const al = sp.life / 0.18;
      ctx.globalAlpha = al * 0.9;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = al * 0.25;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // floodlight towers
    const goalBoost = this.phase === "goal" ? 0.16 : 0;
    const towers: [number, number][] = [
      [-MX + 1.6, -MY + 1.5],
      [W + MX - 1.6, -MY + 1.5],
      [-MX + 1.6, H + MY - 1.5],
      [W + MX - 1.6, H + MY - 1.5],
    ];
    for (const [tx, ty] of towers) {
      const g = ctx.createRadialGradient(tx, ty, 0.4, tx, ty, 6.5);
      g.addColorStop(0, `rgba(190,235,255,${0.3 + goalBoost})`);
      g.addColorStop(1, "rgba(190,235,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(tx, ty, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#101c42";
      ctx.fillRect(tx - 0.85, ty - 0.6, 1.7, 1.2);
      for (let lx = 0; lx < 3; lx++)
        for (let ly = 0; ly < 2; ly++) {
          ctx.fillStyle = "#dff4ff";
          ctx.beginPath();
          ctx.arc(tx - 0.5 + lx * 0.5, ty - 0.25 + ly * 0.5, 0.14, 0, Math.PI * 2);
          ctx.fill();
        }
    }

    // scrolling LED ad boards
    const adText = "CLÁSSICO  ✦  ELITE FOOTBALL  ✦  SEASON 26  ✦  NIGHT CUP  ✦  LIVE  ✦  ";
    ctx.font = `600 0.72px "Barlow Condensed", sans-serif`;
    const cell = ctx.measureText(adText).width;
    const scroll = (t * 3.4) % cell;
    const board = (by: number) => {
      ctx.fillStyle = "#050a1c";
      ctx.fillRect(-1.2, by - 0.48, W + 2.4, 0.96);
      ctx.fillStyle = "rgba(0,229,255,0.55)";
      ctx.fillRect(-1.2, by - 0.48, W + 2.4, 0.06);
      ctx.fillRect(-1.2, by + 0.42, W + 2.4, 0.06);
      ctx.save();
      ctx.beginPath();
      ctx.rect(-1.2, by - 0.48, W + 2.4, 0.96);
      ctx.clip();
      ctx.fillStyle = "rgba(0,229,255,0.82)";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      for (let x = -scroll - cell; x < W + 2; x += cell) {
        ctx.fillText(adText, x, by + 0.04);
      }
      ctx.restore();
    };
    board(-1.05);
    board(H + 1.05);

    this.drawPitch(ctx, t);
    this.drawGoals(ctx);

    // entities sorted by y
    const ents = [...this.players].sort((a, b) => a.pos.y - b.pos.y);
    let ballDrawn = false;
    for (const p of ents) {
      if (!ballDrawn && this.ball.pos.y < p.pos.y) {
        this.drawBall(ctx);
        ballDrawn = true;
      }
      this.drawPlayer(ctx, p, t);
    }
    if (!ballDrawn) this.drawBall(ctx);

    // rings
    for (const r of this.rings) {
      ctx.globalAlpha = Math.max(0, r.life) * 0.8;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 0.14;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // confetti
    for (const c of this.confetti) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.globalAlpha = clamp(c.life, 0, 1);
      ctx.fillStyle = c.color;
      ctx.fillRect(-0.3, -0.18, 0.6, 0.36);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // stadium light flash on goals
    if (this.phase === "goal") {
      const fl = clamp((this.celebrateT - 2.05) / 0.65, 0, 1);
      if (fl > 0) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = `rgba(190,240,255,${0.26 * fl})`;
        ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.setTransform(s, 0, 0, s, ox, oy);
      }
    }

    // vignette (screen space)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const vg = ctx.createRadialGradient(
      cv.width / 2,
      cv.height / 2,
      Math.min(cv.width, cv.height) * 0.36,
      cv.width / 2,
      cv.height / 2,
      Math.max(cv.width, cv.height) * 0.72
    );
    vg.addColorStop(0, "rgba(4,7,26,0)");
    vg.addColorStop(1, "rgba(3,5,18,0.62)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, cv.width, cv.height);
  }

  private drawPitch(ctx: CanvasRenderingContext2D, t: number) {
    // turf — alternating mow stripes
    ctx.fillStyle = "#0f6b3a";
    ctx.fillRect(0, 0, W, H);
    const stripes = 12;
    ctx.fillStyle = "#0c5f33";
    for (let i = 0; i < stripes; i++) {
      if (i % 2 === 0) continue;
      ctx.fillRect((i * W) / stripes, 0, W / stripes, H);
    }
    // floodlight pools
    const lg = ctx.createRadialGradient(W * 0.22, -8, 4, W * 0.22, -8, 62);
    lg.addColorStop(0, "rgba(170,225,255,0.10)");
    lg.addColorStop(1, "rgba(170,225,255,0)");
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, W, H);
    const rg = ctx.createRadialGradient(W * 0.78, H + 8, 4, W * 0.78, H + 8, 62);
    rg.addColorStop(0, "rgba(170,225,255,0.10)");
    rg.addColorStop(1, "rgba(170,225,255,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
    // subtle live sheen
    ctx.globalAlpha = 0.05 + Math.sin(t * 0.6) * 0.015;
    ctx.fillStyle = "#00E5FF";
    ctx.fillRect(0, 0, W, 0.12);
    ctx.globalAlpha = 1;

    // markings
    ctx.strokeStyle = "rgba(236,246,255,0.82)";
    ctx.lineWidth = 0.24;
    ctx.strokeRect(0, 0, W, H);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 9.15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(236,246,255,0.82)";
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 0.32, 0, Math.PI * 2);
    ctx.fill();

    const box = (gx: number, dir: number) => {
      // penalty area 16.5 x 40.32, goal area 5.5 x 18.32
      ctx.strokeRect(dir > 0 ? gx : gx - 16.5, H / 2 - 20.16, 16.5, 40.32);
      ctx.strokeRect(dir > 0 ? gx : gx - 5.5, H / 2 - 9.16, 5.5, 18.32);
      ctx.beginPath();
      ctx.arc(gx + dir * 11, H / 2, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(gx + dir * 11, H / 2, 9.15, dir > 0 ? -0.93 : Math.PI - 0.93, dir > 0 ? 0.93 : Math.PI + 0.93);
      ctx.stroke();
    };
    box(0, 1);
    box(W, -1);

    // corner arcs
    [
      [0, 0, 0, Math.PI / 2],
      [W, 0, Math.PI / 2, Math.PI],
      [W, H, Math.PI, Math.PI * 1.5],
      [0, H, Math.PI * 1.5, Math.PI * 2],
    ].forEach(([cx, cy, a0, a1]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, 1, a0, a1);
      ctx.stroke();
    });
  }

  private drawGoals(ctx: CanvasRenderingContext2D) {
    const drawNet = (gx: number, dir: number) => {
      const x0 = dir > 0 ? gx : gx - NET;
      ctx.fillStyle = "rgba(10,17,40,0.55)";
      ctx.fillRect(x0, H / 2 - GOAL_HALF, NET, GOAL_HALF * 2);
      ctx.strokeStyle = "rgba(230,240,255,0.28)";
      ctx.lineWidth = 0.06;
      for (let i = 0; i <= NET / 0.55; i++) {
        const x = x0 + i * 0.55;
        ctx.beginPath();
        ctx.moveTo(x, H / 2 - GOAL_HALF);
        ctx.lineTo(x, H / 2 + GOAL_HALF);
        ctx.stroke();
      }
      for (let i = 0; i <= (GOAL_HALF * 2) / 0.55; i++) {
        const y = H / 2 - GOAL_HALF + i * 0.55;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x0 + NET, y);
        ctx.stroke();
      }
      // frame
      ctx.strokeStyle = "#f4f8ff";
      ctx.lineWidth = 0.22;
      ctx.strokeRect(x0, H / 2 - GOAL_HALF, NET, GOAL_HALF * 2);
      ctx.fillStyle = "#f4f8ff";
      ctx.beginPath();
      ctx.arc(gx, H / 2 - GOAL_HALF, 0.26, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(gx, H / 2 + GOAL_HALF, 0.26, 0, Math.PI * 2);
      ctx.fill();
    };
    drawNet(0, -1);
    drawNet(W, 1);
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, p: Ply, t: number) {
    const def = p.team === 0 ? this.cfg.home : this.cfg.away;
    const isGK = p.role === "GK";
    const body = isGK ? def.gk : def.primary;
    const trim = def.secondary;
    const controlled = !this.cfg.demo && p === this.controlled;

    // celebration / dejection poses during the goal break
    const celebrating = this.phase === "goal" && p.team === this.scorerTeam;
    const dejected = this.phase === "goal" && p.team !== this.scorerTeam;
    const bounce = celebrating ? Math.abs(Math.sin(t * 9 + p.id * 1.7)) * 0.5 : 0;
    const scale = dejected ? 0.93 : 1;
    const dy = p.pos.y - bounce;
    const speed = Math.hypot(p.vel.x, p.vel.y);
    const ang = Math.atan2(p.facing.y, p.facing.x);
    const px = -p.facing.y;
    const py = p.facing.x;

    // shadow (stays grounded, shrinks on bounce)
    ctx.fillStyle = `rgba(0,0,0,${0.36 - bounce * 0.22})`;
    ctx.beginPath();
    ctx.ellipse(p.pos.x + 0.12, p.pos.y + 0.36, 0.86 * (1 - bounce * 0.2), 0.48, 0, 0, Math.PI * 2);
    ctx.fill();

    if (controlled) {
      const pulse = (Math.sin(t * 6) + 1) / 2;
      ctx.strokeStyle = "#00E5FF";
      ctx.lineWidth = 0.16;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, 1.22 + pulse * 0.16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      const bob = Math.sin(t * 7) * 0.16;
      ctx.fillStyle = "#00E5FF";
      ctx.beginPath();
      ctx.moveTo(p.pos.x, dy - 1.75 + bob);
      ctx.lineTo(p.pos.x - 0.55, dy - 2.45 + bob);
      ctx.lineTo(p.pos.x + 0.55, dy - 2.45 + bob);
      ctx.closePath();
      ctx.fill();
    }

    // skill burst flash
    if (p.skillT > 0) {
      ctx.globalAlpha = p.skillT * 1.8;
      ctx.strokeStyle = "#00E5FF";
      ctx.lineWidth = 0.14;
      ctx.beginPath();
      ctx.arc(p.pos.x, dy, 1.35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // lunge flash
    if (p.lungeT > 0) {
      ctx.globalAlpha = p.lungeT * 3;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 0.12;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, 1.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.save();
    ctx.translate(p.pos.x, dy);
    ctx.scale(scale, scale);

    // feet — alternating step cycle while running, kick follow-through
    const kicking = p.kickCd > 0.26;
    const step = speed > 0.8 ? Math.sin(p.runPhase) * 0.34 : 0;
    const bootCol = "#131a2e";
    ctx.fillStyle = bootCol;
    if (kicking) {
      // striking foot extended forward
      ctx.beginPath();
      ctx.arc(p.facing.x * 1.12, p.facing.y * 1.12 - 0.06, 0.21, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-px * 0.4 - p.facing.x * 0.15, -py * 0.4 - p.facing.y * 0.15, 0.19, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(px * 0.42 + p.facing.x * step, py * 0.42 + p.facing.y * step, 0.19, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-px * 0.42 - p.facing.x * step, -py * 0.42 - p.facing.y * step, 0.19, 0, Math.PI * 2);
      ctx.fill();
    }

    // torso with kit stripes
    ctx.save();
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.arc(0, 0, 0.92, 0, Math.PI * 2);
    ctx.fillStyle = body;
    ctx.fill();
    if (!isGK) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = trim;
      ctx.fillRect(-0.62, -1, 0.3, 2);
      ctx.fillRect(0.02, -1, 0.3, 2);
      ctx.restore();
    } else {
      ctx.strokeStyle = trim;
      ctx.lineWidth = 0.22;
      ctx.beginPath();
      ctx.arc(0, 0, 0.62, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // outline
    ctx.strokeStyle = "rgba(4,8,24,0.6)";
    ctx.lineWidth = 0.09;
    ctx.beginPath();
    ctx.arc(0, 0, 0.92, 0, Math.PI * 2);
    ctx.stroke();

    // raised arms when celebrating
    if (celebrating) {
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(px * 0.95, py * 0.95 - 0.55, 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-px * 0.95, -py * 0.95 - 0.55, 0.18, 0, Math.PI * 2);
      ctx.fill();
    }

    // head
    ctx.fillStyle = luminance(body) > 0.55 ? "#23293d" : "#e3cdb4";
    ctx.beginPath();
    ctx.arc(p.facing.x * 0.3, p.facing.y * 0.3 - 0.1, 0.34, 0, Math.PI * 2);
    ctx.fill();

    // shirt number on the back
    ctx.fillStyle = luminance(body) > 0.55 ? "#0a1226" : "#ffffff";
    ctx.font = `700 0.66px "Barlow", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(p.num), -p.facing.x * 0.3, -p.facing.y * 0.3 + 0.42);

    ctx.restore();
  }

  private drawBall(ctx: CanvasRenderingContext2D) {
    const b = this.ball;
    const lift = b.z * 0.78;
    const r = BALL_R * (1 + b.z * 0.05);
    // grounded shadow — detaches and fades as the ball climbs
    ctx.fillStyle = `rgba(0,0,0,${0.35 / (1 + b.z * 0.55)})`;
    ctx.beginPath();
    ctx.ellipse(b.pos.x + 0.1, b.pos.y + 0.3, 0.42 / (1 + b.z * 0.18), 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    const by = b.pos.y - lift;
    ctx.fillStyle = "#fdfdff";
    ctx.beginPath();
    ctx.arc(b.pos.x, by, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(10,18,38,0.5)";
    ctx.lineWidth = 0.06;
    ctx.stroke();
    ctx.fillStyle = "#223055";
    for (let i = 0; i < 5; i++) {
      const a = b.spin + (i * Math.PI * 2) / 5;
      ctx.beginPath();
      ctx.arc(b.pos.x + Math.cos(a) * 0.22, by + Math.sin(a) * 0.22, 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    document.removeEventListener("visibilitychange", this.onVis);
    sfx.crowd(false);
  }
}
