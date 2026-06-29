/**
 * Preset links — seeded into new user profiles.
 *
 * CONFIGURE: Edit PRESET_LINKS below to match your org/brand:
 *   - isCompany: true  → fixed URL, visible by default, admin-controlled
 *   - isPersonal: true → placeholder URL the user fills in (inactive by default)
 *
 * The "COMPANY" category group is the primary section (maps to the "main" DB category).
 * Add as many or as few entries as you need; empty arrays are fine.
 */

export type IconType =
  | "link"
  | "linkedin"
  | "x"
  | "instagram"
  | "tiktok"
  | "telegram"
  | "discord"
  | "whatsapp"
  | "email"
  | "calendar"
  | "youtube"
  | "github"
  | "phone";

export type PresetLink = {
  id: string;
  category: "COMPANY" | "PERSONAL" | "SOCIAL";
  title: string;
  url: string;
  description: string;
  icon: IconType;
  isPersonal: boolean;
  isCompany: boolean;
};

export const PRESET_LINKS: PresetLink[] = [
  // ── Company Links (replace with your own) ────────────────────────────────
  // {
  //   id: "company-main",
  //   category: "COMPANY",
  //   title: "Visit our website",
  //   url: "https://example.com",
  //   description: "Our main website",
  //   icon: "link",
  //   isPersonal: false,
  //   isCompany: true,
  // },

  // ── Personal Links (seeded as inactive placeholders — users fill in their own URLs) ─
  {
    id: "personal-linkedin",
    category: "PERSONAL",
    title: "Connect on LinkedIn",
    url: "",
    description: "Your LinkedIn profile",
    icon: "linkedin",
    isPersonal: true,
    isCompany: false,
  },
  {
    id: "personal-x",
    category: "PERSONAL",
    title: "Follow me on X",
    url: "",
    description: "Your X (Twitter) profile",
    icon: "x",
    isPersonal: true,
    isCompany: false,
  },
  {
    id: "personal-instagram",
    category: "PERSONAL",
    title: "Follow on Instagram",
    url: "",
    description: "Your Instagram profile",
    icon: "instagram",
    isPersonal: true,
    isCompany: false,
  },
  {
    id: "personal-tiktok",
    category: "PERSONAL",
    title: "Follow on TikTok",
    url: "",
    description: "Your TikTok profile",
    icon: "tiktok",
    isPersonal: true,
    isCompany: false,
  },
  {
    id: "personal-email",
    category: "PERSONAL",
    title: "Get in touch",
    url: "",
    description: "Email contact",
    icon: "email",
    isPersonal: true,
    isCompany: false,
  },
  {
    id: "personal-whatsapp",
    category: "PERSONAL",
    title: "WhatsApp",
    url: "",
    description: "WhatsApp contact",
    icon: "whatsapp",
    isPersonal: true,
    isCompany: false,
  },
  {
    id: "personal-calendar",
    category: "PERSONAL",
    title: "Book a call",
    url: "",
    description: "Schedule a meeting",
    icon: "calendar",
    isPersonal: true,
    isCompany: false,
  },
  {
    id: "personal-telegram",
    category: "PERSONAL",
    title: "Telegram",
    url: "",
    description: "Telegram contact",
    icon: "telegram",
    isPersonal: true,
    isCompany: false,
  },
  {
    id: "personal-github",
    category: "PERSONAL",
    title: "GitHub",
    url: "",
    description: "Your GitHub profile",
    icon: "github",
    isPersonal: true,
    isCompany: false,
  },
];
