import { useEffect, useState } from "react";
import client from "../api/client";
import { T, card, statusColor, riskColor } from "../theme";
import config from "../config";
import { useLanguage } from "../i18n/LanguageContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

interface Stats {
  parts: number;
  operations: number;
  quotes: number;
  fmea_entries: number;
  high_rpn_count: number;
  total_revenue: number;
  recent_quotes: { id: number; quote_number: string; customer_name: string; unit_price: number; total_amount?: number; status: string }[];
  risk_alerts: { failure_mode: string; rpn: number; risk_level: string }[];
}

function StatCard({ value, label, color }: { value: string | number; label: string; color?: string }) {
  return (
    <div style={{ ...card(), flex: 1, textAlign: "center", padding: "20px 16px" }}>
      <div style={{ fontSize: 32, fontWeight: 700, color: color ?? T.accent, marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 12, color: T.textSec }}>{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    client.get("/dashboard/stats").then(r => setStats(r.data)).catch(() => {});
  }, []);
  if (!stats) return <div style={{ color: T.textSec, textAlign: "center", marginTop: 60 }}>{t.common.loading}</div>;

  const barData = stats.recent_quotes.map(q => ({
    name: q.quote_number,
    amount: q.total_amount ?? q.unit_price,
  }));

  const riskCounts: Record<string, number> = {};
  for (const r of stats.risk_alerts) {
    riskCounts[r.risk_level] = (riskCounts[r.risk_level] || 0) + 1;
  }
  const pieData = Object.entries(riskCounts).map(([level, count]) => ({
    name: level,
    value: count,
    color: riskColor(level),
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Karşılama */}
      <div style={{ ...card(), borderLeft: `4px solid ${T.accent}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{config.appName}</div>
            <div style={{ fontSize: 13, color: T.textSec, marginTop: 4 }}>{config.tagline}</div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 11, color: T.textMut, textAlign: "right" }}>
            <div>{config.companyName}</div>
            <div>v0.1.0</div>
          </div>
        </div>
      </div>

      {/* İstatistikler */}
      <div style={{ display: "flex", gap: 16 }}>
        <StatCard value={stats.parts} label={t.dashboard.totalParts} color={T.accent} />
        <StatCard value={stats.operations} label={t.dashboard.totalOps} color={T.green} />
        <StatCard value={stats.quotes} label={t.dashboard.totalQuotes} color="#a855f7" />
        <StatCard value={stats.fmea_entries} label={t.dashboard.totalFmea} color={T.orange} />
        <StatCard value={stats.high_rpn_count} label={t.dashboard.highRpn} color={T.red} />
        <StatCard value={`₺${stats.total_revenue.toFixed(0)}`} label={t.dashboard.revenue} color={T.green} />
      </div>

      {/* Grafikler */}
      <div style={{ display: "flex", gap: 16 }}>
        {/* Bar Chart: Son Teklifler */}
        <div style={{ ...card({ background: T.bgPanel, padding: 12 }), flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 12 }}>Son 30 Gün — Teklif Tutarları</div>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                <XAxis dataKey="name" tick={{ fill: T.textSec, fontSize: 11 }} />
                <YAxis tick={{ fill: T.textSec, fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: T.bgCard, border: "1px solid " + T.border, color: T.text, borderRadius: 6 }}
                  formatter={(val: number) => [`₺${val.toFixed(2)}`, "Tutar"]}
                />
                <Bar dataKey="amount" fill={T.accent} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: T.textMut, fontSize: 13, textAlign: "center", padding: "32px 0" }}>Teklif verisi yok</div>
          )}
        </div>

        {/* Pie Chart: Risk Dağılımı */}
        <div style={{ ...card({ background: T.bgPanel, padding: 12 }), width: 320, flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 12 }}>Risk Dağılımı</div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={72}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={{ stroke: T.textSec }}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: T.bgCard, border: "1px solid " + T.border, color: T.text, borderRadius: 6 }} />
                <Legend wrapperStyle={{ fontSize: 11, color: T.textSec }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: T.green, fontSize: 13, textAlign: "center", padding: "32px 0" }}>Risk uyarısı yok</div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        {/* Son Teklifler */}
        <div style={{ ...card(), flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${T.border}` }}>
            {t.dashboard.recentQuotes}
          </div>
          {stats.recent_quotes.length === 0 ? (
            <div style={{ color: T.textMut, fontSize: 13, textAlign: "center", padding: "32px 0" }}>{t.dashboard.noQuotes}</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {[t.quotes.quoteNo, t.quotes.customer, t.quotes.unitPrice, t.common.status].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: T.textSec, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.recent_quotes.map(q => (
                  <tr key={q.id} style={{ borderTop: `1px solid ${T.border}` }}>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: T.accent, fontWeight: 600 }}>{q.quote_number}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: T.text }}>{q.customer_name ?? "—"}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: T.green, fontWeight: 600 }}>₺{q.unit_price.toFixed(2)}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: statusColor[q.status] + "33", color: statusColor[q.status], fontWeight: 600 }}>
                        {(t.quotes as Record<string, string>)[`status${q.status.charAt(0).toUpperCase()}${q.status.slice(1)}`] ?? q.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Risk Uyarıları */}
        <div style={{ ...card(), width: 320, flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${T.border}` }}>
            {t.dashboard.riskAlerts} (RPN ≥ 100)
          </div>
          {stats.risk_alerts.length === 0 ? (
            <div style={{ color: T.green, fontSize: 13, textAlign: "center", padding: "32px 0" }}>{t.dashboard.noAlerts}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {stats.risk_alerts.map((r, i) => (
                <div key={i} style={{ background: T.bgPanel, borderRadius: 6, padding: "10px 12px", borderLeft: `3px solid ${riskColor(r.risk_level)}` }}>
                  <div style={{ fontSize: 12, color: T.text, fontWeight: 500, marginBottom: 4 }}>{r.failure_mode}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: T.textSec }}>RPN:</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: riskColor(r.risk_level) }}>{r.rpn}</span>
                    <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: riskColor(r.risk_level) + "33", color: riskColor(r.risk_level) }}>{r.risk_level}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alt bilgi */}
      <div style={{ textAlign: "center", padding: "12px 0", borderTop: `1px solid ${T.border}` }}>
        <span style={{ fontSize: 11, color: T.textMut }}>© {new Date().getFullYear()} {config.companyName} — {config.footer}</span>
      </div>
    </div>
  );
}
