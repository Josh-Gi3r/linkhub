/**
 * LinkIcon — renders a branded square icon for each link type.
 * Uses the accent color (#00D26A) as the background with dark icons.
 */

import type { IconType } from "@shared/presetLinks";

interface LinkIconProps {
  iconType: string;
  size?: number;
  className?: string;
}

export function LinkIcon({ iconType, size = 48, className = "" }: LinkIconProps) {
  const s = size;
  const r = Math.round(s * 0.2); // border radius

  const base = `inline-flex items-center justify-center flex-shrink-0 rounded-[${r}px] font-bold text-white`;

  switch (iconType as IconType | string) {
    case "linkedin":
      return (
        <div
          className={`${base} ${className}`}
          style={{ width: s, height: s, background: "#00D26A", borderRadius: r }}
        >
          <svg width={s * 0.55} height={s * 0.55} viewBox="0 0 24 24" fill="none">
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" fill="#000"/>
            <rect x="2" y="9" width="4" height="12" fill="#000"/>
            <circle cx="4" cy="4" r="2" fill="#000"/>
          </svg>
        </div>
      );

    case "x":
    case "twitter":
      return (
        <div
          className={`${base} ${className}`}
          style={{ width: s, height: s, background: "#00D26A", borderRadius: r }}
        >
          <svg width={s * 0.55} height={s * 0.55} viewBox="0 0 24 24" fill="none">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="#000"/>
          </svg>
        </div>
      );

    case "instagram":
      return (
        <div
          className={`${base} ${className}`}
          style={{ width: s, height: s, background: "#00D26A", borderRadius: r }}
        >
          <svg width={s * 0.55} height={s * 0.55} viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="#000" strokeWidth="2" fill="none"/>
            <circle cx="12" cy="12" r="4" stroke="#000" strokeWidth="2" fill="none"/>
            <circle cx="17.5" cy="6.5" r="1.5" fill="#000"/>
          </svg>
        </div>
      );

    case "tiktok":
      return (
        <div
          className={`${base} ${className}`}
          style={{ width: s, height: s, background: "#00D26A", borderRadius: r }}
        >
          <svg width={s * 0.5} height={s * 0.5} viewBox="0 0 24 24" fill="none">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" fill="#000"/>
          </svg>
        </div>
      );

    case "email":
      return (
        <div
          className={`${base} ${className}`}
          style={{ width: s, height: s, background: "#00D26A", borderRadius: r }}
        >
          <svg width={s * 0.55} height={s * 0.55} viewBox="0 0 24 24" fill="none">
            <rect x="2" y="4" width="20" height="16" rx="2" stroke="#000" strokeWidth="2" fill="none"/>
            <path d="M2 7l10 7 10-7" stroke="#000" strokeWidth="2"/>
          </svg>
        </div>
      );

    case "calendar":
      return (
        <div
          className={`${base} ${className}`}
          style={{ width: s, height: s, background: "#00D26A", borderRadius: r }}
        >
          <svg width={s * 0.55} height={s * 0.55} viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="#000" strokeWidth="2" fill="none"/>
            <path d="M16 2v4M8 2v4M3 10h18" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      );

    case "whatsapp":
      return (
        <div
          className={`${base} ${className}`}
          style={{ width: s, height: s, background: "#00D26A", borderRadius: r }}
        >
          <svg width={s * 0.55} height={s * 0.55} viewBox="0 0 24 24" fill="none">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" fill="#000"/>
          </svg>
        </div>
      );

    case "telegram":
      return (
        <div
          className={`${base} ${className}`}
          style={{ width: s, height: s, background: "#00D26A", borderRadius: r }}
        >
          <svg width={s * 0.55} height={s * 0.55} viewBox="0 0 24 24" fill="none">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" fill="#000"/>
          </svg>
        </div>
      );

    case "youtube":
      return (
        <div
          className={`${base} ${className}`}
          style={{ width: s, height: s, background: "#00D26A", borderRadius: r }}
        >
          <svg width={s * 0.55} height={s * 0.55} viewBox="0 0 24 24" fill="none">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#000"/>
          </svg>
        </div>
      );

    case "github":
      return (
        <div
          className={`${base} ${className}`}
          style={{ width: s, height: s, background: "#00D26A", borderRadius: r }}
        >
          <svg width={s * 0.55} height={s * 0.55} viewBox="0 0 24 24" fill="none">
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" fill="#000"/>
          </svg>
        </div>
      );

    case "phone":
      return (
        <div
          className={`${base} ${className}`}
          style={{ width: s, height: s, background: "#00D26A", borderRadius: r }}
        >
          <svg width={s * 0.5} height={s * 0.5} viewBox="0 0 24 24" fill="none">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      );

    default:
      return (
        <div
          className={`${base} ${className}`}
          style={{ width: s, height: s, background: "#00D26A", borderRadius: r }}
        >
          <svg width={s * 0.5} height={s * 0.5} viewBox="0 0 24 24" fill="none">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      );
  }
}
