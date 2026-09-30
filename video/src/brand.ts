// Brandlo – brand tokens used across the launch video.
//
// NOTE: brandlo.de could not be fetched from the build environment (egress
// blocked), so logo, colours and imagery are an art-directed interpretation.
// Swap the values below for the official brand assets and everything in the
// film re-themes automatically.

export const COLORS = {
  ink: "#0C0C0D",
  ink2: "#18181B",
  ink3: "#26262B",
  paper: "#F4F0E8",
  paper2: "#EAE3D6",
  white: "#FFFFFF",
  kraft: "#C49A6C",
  kraftDark: "#9C7447",
  accent: "#FF5A1F",
  accentSoft: "#FFB896",
  accentDeep: "#D63F0B",
  muted: "#8A847A",
  mutedDark: "#5E5A54",
  success: "#1FB86A",
  line: "rgba(12,12,13,0.10)",
} as const;

export const FONTS = {
  display: "Inter Tight",
  serif: "Instrument Serif",
  mono: "Geist Mono",
} as const;

export const BRAND = {
  name: "brandlo",
  url: "brandlo.de",
  tagline: "Becher & Verpackungen mit deinem Logo.",
  motto: ["Du sagst", "„Macht mal“.", "Wir erledigen", "den Rest."],
} as const;
