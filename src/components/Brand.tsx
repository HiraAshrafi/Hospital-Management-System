import { useId } from "react";

export const BRAND_NAME = "AshrafiTech";
export const BRAND_TAGLINE = "Smart Healthcare. Better Tomorrow.";

type Tone = "light" | "dark";

/**
 * AshrafiTech mark: medical cross, green care swoosh and a rising figure.
 * `tone="dark"` brightens the blues for use on the navy sidebar.
 * Gradient ids come from useId so several marks on one page never clash.
 */
export function BrandMark({ className = "h-10 w-10", tone = "light" }: { className?: string; tone?: Tone }) {
  const id = useId().replace(/:/g, "");
  const dark = tone === "dark";
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-cross`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={dark ? "#4b93ff" : "#2f7cf0"} />
          <stop offset="1" stopColor={dark ? "#1f6ae6" : "#1246b8"} />
        </linearGradient>
        <linearGradient id={`${id}-swoosh`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#0a8257" />
          <stop offset="1" stopColor="#2ad08f" />
        </linearGradient>
      </defs>
      {/* Cross */}
      <rect x="15" y="7" width="17" height="48" rx="4" fill={`url(#${id}-cross)`} />
      <rect x="1.5" y="20.5" width="44" height="17" rx="4" fill={`url(#${id}-cross)`} />
      {/* Care swoosh */}
      <path d="M1 45C15 61 43 59 62 21C45 45 21 53 1 45Z" fill={`url(#${id}-swoosh)`} />
      {/* Rising figure */}
      <circle cx="51" cy="9.5" r="5.5" fill={dark ? "#7db4ff" : "#2f7cf0"} />
      <path
        d="M33 33C39.5 30 44 24.5 47.5 17.5"
        fill="none"
        stroke={dark ? "#7db4ff" : "#2f7cf0"}
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      <path d="M41 21.5C47 21 53.5 19.5 60 15" fill="none" stroke={dark ? "#7db4ff" : "#2f7cf0"} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/** Mark + "AshrafiTech" wordmark + tagline. */
export function BrandLogo({ tone = "light", size = "md", showTagline = true }: { tone?: Tone; size?: "md" | "lg"; showTagline?: boolean }) {
  const dark = tone === "dark";
  const lg = size === "lg";
  return (
    <span className={`flex items-center ${lg ? "gap-4" : "gap-2.5"}`}>
      <BrandMark tone={tone} className={lg ? "h-16 w-16 shrink-0" : "h-9 w-9 shrink-0"} />
      {lg && <span className="h-12 w-px bg-navy/25" aria-hidden="true" />}
      <span className="min-w-0 leading-tight">
        <span
          className={`block font-extrabold tracking-tight ${lg ? "text-[34px] leading-none" : "text-[19px]"} ${
            dark ? "text-white" : "bg-gradient-to-r from-primary to-primary-bright bg-clip-text text-transparent"
          }`}
        >
          {BRAND_NAME}
        </span>
        {showTagline && (
          <span className={`block truncate font-medium ${lg ? "mt-1.5 text-[15px]" : "mt-0.5 text-[10px]"} ${dark ? "text-white/65" : "text-navy"}`}>
            {BRAND_TAGLINE}
          </span>
        )}
      </span>
    </span>
  );
}
