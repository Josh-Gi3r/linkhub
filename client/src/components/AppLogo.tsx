/**
 * AppLogo — renders the application name as a styled text mark.
 *
 * Reads VITE_APP_NAME from the build-time env (defaults to "LinkHub").
 * The accent color is driven by the --brand CSS custom property defined in
 * index.css, keeping brand color changes to a single place.
 */

const APP_NAME = import.meta.env.VITE_APP_NAME ?? "LinkHub";

interface AppLogoProps {
  className?: string;
  /** Height in pixels — controls font size proportionally */
  height?: number;
  /** If true, render on a dark background (accent in brand color, rest in white) */
  darkMode?: boolean;
}

export default function AppLogo({ className = "", height = 20, darkMode = true }: AppLogoProps) {
  const fontSize = Math.round(height * 0.85);
  const textColor = darkMode ? "#ffffff" : "#000000";

  // Split at the first non-alpha character so e.g. "Link.Hub" gets accent on the suffix
  const dotIdx = APP_NAME.search(/[^a-zA-Z]/);
  const primary   = dotIdx > 0 ? APP_NAME.slice(0, dotIdx) : APP_NAME;
  const secondary = dotIdx > 0 ? APP_NAME.slice(dotIdx) : "";

  return (
    <span
      className={className}
      style={{
        fontFamily: "'Space Grotesk', 'Space Mono', monospace",
        fontSize,
        fontWeight: 700,
        letterSpacing: "-0.02em",
        lineHeight: 1,
        userSelect: "none",
      }}
    >
      <span style={{ color: "var(--brand, #22c55e)" }}>{primary}</span>
      {secondary && <span style={{ color: textColor }}>{secondary}</span>}
    </span>
  );
}
