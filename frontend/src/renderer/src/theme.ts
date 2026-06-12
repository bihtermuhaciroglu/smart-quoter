export const T = {
  bg:       "#0d0d1a",
  bgCard:   "#13132a",
  bgPanel:  "#1a1a30",
  bgInput:  "#0f0f22",
  bgHover:  "#1e1e38",
  bgTable:  "#111125",
  border:   "#252545",
  borderL:  "#30305a",
  text:     "#dcdcf0",
  textSec:  "#7777aa",
  textMut:  "#44445a",
  accent:   "#4d9fff",
  accentDk: "#0055bb",
  green:    "#2ecc71",
  orange:   "#e67e00",
  red:      "#e74c3c",
  yellow:   "#f1c40f",
  sidebar:  "#0a0a18",
};

export const inp = (extra?: object) => ({
  padding: "8px 12px",
  fontSize: 13,
  background: T.bgInput,
  border: `1px solid ${T.border}`,
  borderRadius: 5,
  color: T.text,
  flex: 1,
  minWidth: 0,
  outline: "none",
  ...extra,
});

export const btn = (color: string, small?: boolean) => ({
  padding: small ? "5px 12px" : "8px 16px",
  fontSize: small ? 12 : 13,
  background: color,
  color: "white",
  border: "none",
  borderRadius: 5,
  cursor: "pointer",
  fontWeight: 500 as const,
});

export const card = (extra?: object) => ({
  background: T.bgCard,
  border: `1px solid ${T.border}`,
  borderRadius: 8,
  padding: 16,
  ...extra,
});

export const statusColor: Record<string, string> = {
  draft: "#7777aa",
  sent: "#4d9fff",
  accepted: "#2ecc71",
  rejected: "#e74c3c",
};

export const statusLabel: Record<string, string> = {
  draft: "Taslak",
  sent: "Gönderildi",
  accepted: "Kabul Edildi",
  rejected: "Reddedildi",
};

export const riskColor = (level: string) =>
  ({ Kritik: "#e74c3c", Yüksek: "#e67e00", Orta: "#f1c40f", Düşük: "#2ecc71" }[level] ?? "#7777aa");
