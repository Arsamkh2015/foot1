import { useId } from "react";
import type { TeamDef } from "../game/data";
import { sfx } from "../game/audio";

// ------------------------------------------------------------------
// Inline SVG icons (no emoji, no icon fonts)
// ------------------------------------------------------------------

type IconProps = { className?: string };

export const IconBall = ({ className = "w-5 h-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.2 16.4 10.4 14.7 15.4H9.3L7.6 10.4Z" fill="currentColor" stroke="none" />
    <path d="M12 3v4.2M16.4 10.4l4-1.3M14.7 15.4l2.5 3.4M9.3 15.4 6.8 18.8M7.6 10.4l-4-1.3" />
  </svg>
);

export const IconPlay = ({ className = "w-5 h-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M7 4.5v15l13-7.5L7 4.5Z" />
  </svg>
);

export const IconTrophy = ({ className = "w-5 h-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />
  </svg>
);

export const IconCalendar = ({ className = "w-5 h-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7">
    <rect x="3.5" y="5" width="17" height="15.5" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
  </svg>
);

export const IconShield = ({ className = "w-5 h-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M12 3 5 5.5v6c0 4.4 3 8 7 9.5 4-1.5 7-5.1 7-9.5v-6L12 3Z" />
    <path d="M12 8v5M9.5 10.5h5" />
  </svg>
);

export const IconSquad = ({ className = "w-5 h-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7">
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 20c.5-3.6 2.7-5.5 5.5-5.5s5 1.9 5.5 5.5" />
    <circle cx="16.8" cy="9" r="2.5" />
    <path d="M15.8 14.7c2.4.2 4.2 1.9 4.7 4.8" />
  </svg>
);

export const IconGear = ({ className = "w-5 h-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7">
    <circle cx="12" cy="12" r="3.4" />
    <path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1" />
  </svg>
);

export const IconWhistle = ({ className = "w-5 h-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7">
    <circle cx="9.5" cy="14.5" r="5.5" />
    <path d="M13.5 10.5 20 7l1 2.5-5.8 3.4M9.5 12.2v2.3l2 1.2" />
  </svg>
);

export const IconBack = ({ className = "w-5 h-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2">
    <path d="M14.5 5 8 12l6.5 7" />
  </svg>
);

export const IconKeys = ({ className = "w-5 h-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="2.5" y="6" width="19" height="12" />
    <path d="M6 10h2M11 10h2M16 10h2M8 14h8" />
  </svg>
);

// ------------------------------------------------------------------
// Kit disc — procedural striped shirt badge
// ------------------------------------------------------------------

export function KitDisc({ team, gk = false, size = 40 }: { team: TeamDef; gk?: boolean; size?: number }) {
  const id = useId().replace(/:/g, "");
  const main = gk ? team.gk : team.primary;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className="shrink-0">
      <defs>
        <clipPath id={`k${id}`}>
          <circle cx="20" cy="20" r="17" />
        </clipPath>
      </defs>
      <circle cx="20" cy="20" r="17" fill={main} />
      <g clipPath={`url(#k${id})`}>
        {[0, 1, 2].map((i) => (
          <rect key={i} x={4 + i * 12} y="0" width="6" height="40" fill={team.secondary} opacity="0.95" />
        ))}
      </g>
      <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(4,8,24,0.6)" strokeWidth="2" />
      <text
        x="20"
        y="21"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="'Bebas Neue', sans-serif"
        fontSize="15"
        fill={gk ? "#0a1226" : "#ffffff"}
        style={{ paintOrder: "stroke" }}
        stroke="rgba(4,8,24,0.55)"
        strokeWidth="2.4"
      >
        {team.short}
      </text>
    </svg>
  );
}

// ------------------------------------------------------------------
// Buttons + panels
// ------------------------------------------------------------------

export function BigBtn({
  children,
  onClick,
  variant = "primary",
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "cyan";
  disabled?: boolean;
  className?: string;
}) {
  const base =
    "btn-clip font-display text-xl tracking-[0.12em] px-7 py-3 transition-all duration-150 select-none inline-flex items-center gap-3 justify-center";
  const styles =
    variant === "primary"
      ? "bg-blue text-white hover:bg-electric active:translate-y-0.5 shadow-[0_0_28px_rgba(23,105,255,0.45)]"
      : variant === "cyan"
        ? "bg-cyan text-ink hover:bg-white active:translate-y-0.5 shadow-[0_0_28px_rgba(0,229,255,0.35)]"
        : "bg-panel2 text-fog border border-line hover:text-white hover:border-electric";
  return (
    <button
      disabled={disabled}
      onClick={() => {
        sfx.ensure();
        sfx.play("select");
        onClick?.();
      }}
      onMouseEnter={() => sfx.play("hover")}
      className={`${base} ${styles} ${
        disabled ? "opacity-35 pointer-events-none" : "cursor-pointer"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostBtn({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={() => {
        sfx.ensure();
        sfx.play("click");
        onClick?.();
      }}
      className={`tag-clip bg-panel2 border border-line text-fog hover:text-cyan hover:border-electric font-cond font-semibold text-sm tracking-[0.18em] px-4 py-2 inline-flex items-center gap-2 transition-colors cursor-pointer ${className}`}
    >
      {children}
    </button>
  );
}

export function PanelTitle({ children, accent = "#00E5FF" }: { children: React.ReactNode; accent?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="w-1.5 h-6" style={{ background: accent }} />
      <h2 className="font-display text-3xl tracking-[0.08em] text-white leading-none">{children}</h2>
    </div>
  );
}

export function KeyCap({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[1.7rem] h-7 px-1.5 bg-ink border border-line text-cyan font-cond font-bold text-xs tracking-wider">
      {children}
    </span>
  );
}

// ------------------------------------------------------------------
// Broadcast score bug
// ------------------------------------------------------------------

export function ScoreBug({
  home,
  away,
  scoreH,
  scoreA,
  minute,
  label,
  small,
}: {
  home: TeamDef;
  away: TeamDef;
  scoreH: number;
  scoreA: number;
  minute: number | string;
  label?: string;
  small?: boolean;
}) {
  const h = small ? "h-8" : "h-11";
  const txt = small ? "text-base" : "text-2xl";
  return (
    <div className="flex items-stretch font-display tracking-[0.08em] select-none" style={{ filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.5))" }}>
      <div
        className={`${h} ${small ? "px-3" : "px-4"} flex items-center gap-2 text-white`}
        style={{ background: home.primary === "#F5F7FF" ? "#dfe5f2" : home.primary, color: isLight(home.primary) ? "#0a1226" : "#fff", clipPath: "polygon(8px 0,100% 0,100% 100%,0 100%)" }}
      >
        {home.short}
      </div>
      <div className={`${h} ${txt} px-3 flex items-center bg-ink text-white border-y border-line`}>
        {scoreH}
        <span className="text-dim mx-1.5 text-sm">:</span>
        {scoreA}
      </div>
      <div
        className={`${h} ${small ? "px-3" : "px-4"} flex items-center text-white`}
        style={{ background: away.primary === "#F5F7FF" ? "#dfe5f2" : away.primary, color: isLight(away.primary) ? "#0a1226" : "#fff", clipPath: "polygon(0 0,calc(100% - 8px) 0,100% 100%,0 100%)" }}
      >
        {away.short}
      </div>
      <div className={`${h} ${small ? "px-2.5 text-sm" : "px-3.5 text-lg"} flex items-center bg-cyan text-ink font-bold`}>
        {minute}
        {typeof minute === "number" ? "'" : ""}
      </div>
      {label && (
        <div className={`${h} px-3 hidden sm:flex items-center bg-panel border border-l-0 border-line text-fog text-sm tracking-[0.2em] font-cond font-semibold`}>
          {label}
        </div>
      )}
    </div>
  );
}

function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
}

// ------------------------------------------------------------------
// Stat bar
// ------------------------------------------------------------------

export function StatBar({ label, h, a, fmt }: { label: string; h: number; a: number; fmt?: (n: number) => string }) {
  const total = h + a || 1;
  const ph = (h / total) * 100;
  const f = fmt ?? ((n: number) => String(n));
  return (
    <div>
      <div className="flex justify-between font-cond font-semibold tracking-wider text-sm mb-1">
        <span className="text-cyan">{f(h)}</span>
        <span className="text-fog uppercase text-xs tracking-[0.25em] pt-0.5">{label}</span>
        <span className="text-fog">{f(a)}</span>
      </div>
      <div className="h-1.5 flex gap-0.5 bg-ink">
        <div className="bg-cyan" style={{ width: `${ph}%` }} />
        <div className="bg-purple flex-1" />
      </div>
    </div>
  );
}
