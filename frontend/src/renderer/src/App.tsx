import { useEffect, useState } from "react";
import { getParts, Part } from "./api/parts";
import { T } from "./theme";
import config from "./config";
import { LanguageProvider, useLanguage, LANGUAGES } from "./i18n/LanguageContext";
import DashboardPage from "./pages/DashboardPage";
import PartsPage from "./pages/PartsPage";
import OperationsPage from "./pages/OperationsPage";
import FMEAPage from "./pages/FMEAPage";
import FlowChartPage from "./pages/FlowChartPage";
import QuotesPage from "./pages/QuotesPage";
import AIPage from "./pages/AIPage";
import SettingsPage from "./pages/SettingsPage";

type Page = "dashboard" | "parts" | "operations" | "fmea" | "flowchart" | "quotes" | "ai" | "settings";

const menu: { id: Page; label: string; icon: string; group?: string }[] = [
  { id: "dashboard",  label: "Dashboard",       icon: "▣", group: "Genel" },
  { id: "parts",      label: "Parçalar",         icon: "◎", group: "Üretim" },
  { id: "operations", label: "Operasyonlar",     icon: "⚙", group: "Üretim" },
  { id: "fmea",       label: "FMEA Analizi",     icon: "⚠", group: "Kalite" },
  { id: "flowchart",  label: "Akış Diyagramı",   icon: "⇶", group: "Kalite" },
  { id: "quotes",     label: "Teklifler",         icon: "◈", group: "Satış" },
  { id: "ai",         label: "Yapay Zeka",        icon: "✦", group: "Satış" },
  { id: "settings",   label: "Ayarlar",           icon: "⚙", group: "Sistem" },
];

const titles: Record<Page, string> = {
  dashboard: "Dashboard", parts: "Parçalar", operations: "Operasyonlar",
  fmea: "FMEA Analizi", flowchart: "Akış Diyagramı", quotes: "Teklifler",
  ai: "Yapay Zeka", settings: "Ayarlar",
};

const groups = ["Genel", "Üretim", "Kalite", "Satış", "Sistem"];

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="13" stroke="#4d9fff" strokeWidth="1.5" />
      <circle cx="14" cy="14" r="5" fill="#4d9fff" />
      {[0,45,90,135,180,225,270,315].map((deg, i) => {
        const r = deg * Math.PI / 180;
        const x1 = 14 + 7 * Math.cos(r), y1 = 14 + 7 * Math.sin(r);
        const x2 = 14 + 11 * Math.cos(r), y2 = 14 + 11 * Math.sin(r);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4d9fff" strokeWidth="2" strokeLinecap="round" />;
      })}
    </svg>
  );
}

function AppInner() {
  const [page, setPage] = useState<Page>("dashboard");
  const [parts, setParts] = useState<Part[]>([]);
  const [error, setError] = useState("");
  const { lang, setLang, t } = useLanguage();

  const menu: { id: Page; label: string; icon: string; group: string }[] = [
    { id: "dashboard",  label: t.nav.dashboard,  icon: "▣", group: t.nav.groups.general },
    { id: "parts",      label: t.nav.parts,       icon: "◎", group: t.nav.groups.production },
    { id: "operations", label: t.nav.operations,  icon: "⚙", group: t.nav.groups.production },
    { id: "fmea",       label: t.nav.fmea,        icon: "⚠", group: t.nav.groups.quality },
    { id: "flowchart",  label: t.nav.flowchart,   icon: "⇶", group: t.nav.groups.quality },
    { id: "quotes",     label: t.nav.quotes,      icon: "◈", group: t.nav.groups.sales },
    { id: "ai",         label: t.nav.ai,          icon: "✦", group: t.nav.groups.sales },
    { id: "settings",   label: t.nav.settings,    icon: "⚙", group: t.nav.groups.system },
  ];

  const groups = [
    t.nav.groups.general,
    t.nav.groups.production,
    t.nav.groups.quality,
    t.nav.groups.sales,
    t.nav.groups.system,
  ];

  const titles: Record<Page, string> = {
    dashboard: t.nav.dashboard, parts: t.nav.parts, operations: t.nav.operations,
    fmea: t.nav.fmea, flowchart: t.nav.flowchart, quotes: t.nav.quotes,
    ai: t.nav.ai, settings: t.nav.settings,
  };

  async function loadParts() {
    try { setParts(await getParts()); }
    catch { setError("Backend bağlantısı yok"); }
  }

  useEffect(() => { loadParts(); }, []);

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif", background: T.bg, color: T.text }}>
      {/* Sidebar */}
      <div style={{ width: 210, background: T.sidebar, display: "flex", flexDirection: "column", flexShrink: 0, borderRight: `1px solid ${T.border}` }}>
        <div style={{ padding: "18px 16px 14px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <Logo />
            <div>
              <div style={{ color: T.text, fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{config.appName}</div>
              <div style={{ color: T.textMut, fontSize: 10 }}>{config.companyName}</div>
            </div>
          </div>
        </div>
        <nav style={{ padding: "8px 0", flex: 1, overflowY: "auto" }}>
          {groups.map(group => {
            const items = menu.filter(m => m.group === group);
            return (
              <div key={group} style={{ marginBottom: 4 }}>
                <div style={{ padding: "8px 16px 4px", fontSize: 10, fontWeight: 700, color: T.textMut, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {group}
                </div>
                {items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setPage(item.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 9,
                      width: "100%", padding: "9px 16px",
                      background: page === item.id ? T.accent + "22" : "transparent",
                      color: page === item.id ? T.accent : T.textSec,
                      border: "none", cursor: "pointer", fontSize: 13,
                      textAlign: "left",
                      borderLeft: page === item.id ? `3px solid ${T.accent}` : "3px solid transparent",
                      borderRadius: "0 4px 4px 0",
                    }}
                  >
                    <span style={{ fontSize: 13, opacity: 0.8 }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>
        <div style={{ padding: "10px 16px", borderTop: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 10, color: T.textMut }}>v{config.version}</div>
        </div>
      </div>

      {/* Ana içerik */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <div style={{ padding: "10px 28px", borderBottom: `1px solid ${T.border}`, background: T.bgCard, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{titles[page]}</div>
          {error && <span style={{ fontSize: 12, color: T.red }}>{error}</span>}
          {/* Dil seçici */}
          <div style={{ marginLeft: "auto", display: "flex", gap: 4, alignItems: "center" }}>
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                title={l.label}
                style={{
                  padding: "4px 8px",
                  fontSize: 13,
                  background: lang === l.code ? T.accent + "33" : "transparent",
                  color: lang === l.code ? T.accent : T.textMut,
                  border: lang === l.code ? `1px solid ${T.accent}55` : "1px solid transparent",
                  borderRadius: 5,
                  cursor: "pointer",
                  fontWeight: lang === l.code ? 700 : 400,
                  transition: "all 0.15s",
                }}
              >
                {l.flag} {l.code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        {/* Sayfa */}
        <div style={{ flex: 1, overflow: "auto", padding: 28, background: T.bg }}>
          {page === "dashboard"  && <DashboardPage />}
          {page === "parts"      && <PartsPage parts={parts} onRefresh={loadParts} />}
          {page === "operations" && <OperationsPage parts={parts} />}
          {page === "fmea"       && <FMEAPage parts={parts} />}
          {page === "flowchart"  && <FlowChartPage />}
          {page === "quotes"     && <QuotesPage />}
          {page === "ai"         && <AIPage parts={parts} />}
          {page === "settings"   && <SettingsPage />}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppInner />
    </LanguageProvider>
  );
}
