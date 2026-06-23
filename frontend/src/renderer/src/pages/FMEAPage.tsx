import { useEffect, useState } from "react";
import { getParts, Part } from "../api/parts";
import { getOperations, Operation } from "../api/operations";
import { getFMEA, createFMEA, deleteFMEA, FMEAItem } from "../api/fmea";
import { exportFMEAToExcel } from "../utils/exportExcel";
import { T, inp, btn, card, riskColor } from "../theme";
import { useLanguage } from "../i18n/LanguageContext";

interface Props { parts: Part[]; }

type SortDir = "asc" | "desc";

const thBase: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 11,
  fontWeight: 600,
  color: T.textSec,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  borderBottom: `1px solid ${T.border}`,
  textAlign: "left",
  userSelect: "none" as const,
  whiteSpace: "nowrap" as const,
};

const RISK_ORDER: Record<string, number> = { Kritik: 4, Yüksek: 3, Orta: 2, Düşük: 1 };

export default function FMEAPage({ parts }: Props) {
  const { t } = useLanguage();
  const [localParts, setLocalParts] = useState<Part[]>([]);
  const allParts = parts?.length ? parts : localParts;
  const [fmeaPartId, setFmeaPartId] = useState<number | null>(null);
  const [fmeaOps, setFmeaOps] = useState<Operation[]>([]);
  const [fmeaOpId, setFmeaOpId] = useState<number | null>(null);
  const [fmeaList, setFmeaList] = useState<FMEAItem[]>([]);
  const [fMode, setFMode] = useState(""); const [fEffect, setFEffect] = useState("");
  const [fCause, setFCause] = useState(""); const [fAction, setFAction] = useState("");
  const [fPerson, setFPerson] = useState("");
  const [fS, setFS] = useState("5"); const [fO, setFO] = useState("5"); const [fD, setFD] = useState("5");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ col: string; dir: SortDir } | null>(null);

  useEffect(() => {
    if (!parts?.length) {
      getParts().then(setLocalParts);
    }
  }, [parts]);

  useEffect(() => { if (fmeaPartId) getOperations(fmeaPartId).then(setFmeaOps); }, [fmeaPartId]);
  useEffect(() => { if (fmeaOpId) getFMEA(fmeaOpId).then(setFmeaList); }, [fmeaOpId]);

  async function handleAdd() {
    if (!fmeaOpId || !fMode) return;
    setLoading(true);
    await createFMEA({ operation_id: fmeaOpId, failure_mode: fMode, effect_of_failure: fEffect, cause_of_failure: fCause, severity: parseInt(fS), occurrence: parseInt(fO), detection: parseInt(fD), recommended_action: fAction, responsible_person: fPerson });
    setFMode(""); setFEffect(""); setFCause(""); setFAction(""); setFPerson(""); setFS("5"); setFO("5"); setFD("5");
    getFMEA(fmeaOpId).then(setFmeaList); setLoading(false);
  }

  function toggleSort(col: string) {
    setSort(prev => {
      if (!prev || prev.col !== col) return { col, dir: "asc" };
      if (prev.dir === "asc") return { col, dir: "desc" };
      return null;
    });
  }

  function sortIcon(col: string) {
    if (!sort || sort.col !== col) return <span style={{ opacity: 0.3, fontSize: 10 }}> ⇅</span>;
    return <span style={{ fontSize: 10 }}>{sort.dir === "asc" ? " ▲" : " ▼"}</span>;
  }

  const filtered = fmeaList.filter(f => {
    const q = search.toLowerCase();
    return !q || f.failure_mode.toLowerCase().includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sort) return 0;
    const dir = sort.dir === "asc" ? 1 : -1;
    if (sort.col === "failure_mode") return dir * a.failure_mode.localeCompare(b.failure_mode);
    if (sort.col === "rpn") return dir * (a.rpn - b.rpn);
    if (sort.col === "risk_level") return dir * ((RISK_ORDER[a.risk_level] ?? 0) - (RISK_ORDER[b.risk_level] ?? 0));
    return 0;
  });

  const previewRPN = parseInt(fS) * parseInt(fO) * parseInt(fD);
  const previewLevel = previewRPN >= 200 ? "Kritik" : previewRPN >= 100 ? "Yüksek" : previewRPN >= 50 ? "Orta" : "Düşük";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <label style={{ fontSize: 13, color: T.textSec, fontWeight: 600 }}>{t.fmea.selectPart}:</label>
          <select value={fmeaPartId ?? ""} onChange={e => { setFmeaPartId(Number(e.target.value)); setFmeaOpId(null); setFmeaList([]); }} style={{ ...inp({ flex: "unset", width: 200 }) }}>
            <option value="">— {t.fmea.selectPart} —</option>
            {allParts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button
            onClick={() => getParts().then(setLocalParts)}
            style={{ ...btn(T.bgPanel, true), fontSize: 12, padding: "4px 10px" }}
            title="Parçaları yenile"
          >Yenile</button>
        </div>
        {fmeaPartId && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <label style={{ fontSize: 13, color: T.textSec, fontWeight: 600 }}>{t.fmea.selectOp}:</label>
            <select value={fmeaOpId ?? ""} onChange={e => setFmeaOpId(Number(e.target.value))} style={{ ...inp({ flex: "unset", width: 220 }) }}>
              <option value="">— {t.fmea.selectOp} —</option>
              {fmeaOps.map(o => <option key={o.id} value={o.id}>{o.sequence_no}. {o.operation_type}</option>)}
            </select>
          </div>
        )}
        {fmeaList.length > 0 && (
          <button onClick={() => exportFMEAToExcel(fmeaList)} style={{ ...btn(T.green, true), marginLeft: "auto" }}>{t.fmea.exportExcel}</button>
        )}
      </div>

      {fmeaOpId ? (
        <>
          <div style={{ ...card() }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 12 }}>{t.fmea.addFmea}</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <input placeholder={`${t.fmea.failureMode} *`} value={fMode} onChange={e => setFMode(e.target.value)} style={inp()} />
              <input placeholder={t.fmea.effect} value={fEffect} onChange={e => setFEffect(e.target.value)} style={inp()} />
              <input placeholder={t.fmea.cause} value={fCause} onChange={e => setFCause(e.target.value)} style={inp()} />
            </div>
            <div style={{ display: "flex", gap: 20, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
              {[[t.fmea.severity, fS, setFS], [t.fmea.occurrence, fO, setFO], [t.fmea.detection, fD, setFD]].map(([label, val, setter]) => (
                <label key={label as string} style={{ fontSize: 13, color: T.textSec, display: "flex", alignItems: "center", gap: 8 }}>
                  {label as string}
                  <input type="number" min={1} max={10} value={val as string} onChange={e => (setter as (v: string) => void)(e.target.value)}
                    style={{ ...inp({ flex: "unset", width: 64 }) }} />
                </label>
              ))}
              <div style={{ padding: "6px 14px", borderRadius: 6, background: riskColor(previewLevel) + "33", border: `1px solid ${riskColor(previewLevel)}`, fontSize: 13, fontWeight: 700, color: riskColor(previewLevel) }}>
                RPN: {previewRPN} — {previewLevel}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <input placeholder="Önerilen aksiyon" value={fAction} onChange={e => setFAction(e.target.value)} style={inp()} />
              <input placeholder="Sorumlu kişi" value={fPerson} onChange={e => setFPerson(e.target.value)} style={inp()} />
            </div>
            <button onClick={handleAdd} disabled={loading} style={btn(T.orange)}>{loading ? t.common.loading : t.fmea.addFmea}</button>
          </div>

          <div>
            <div style={{ marginBottom: 8 }}>
              <input
                placeholder="Hata modu ara..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={inp({ flex: "0 0 220px", fontSize: 12 })}
              />
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", background: T.bgCard, borderRadius: 8, overflow: "hidden", border: `1px solid ${T.border}` }}>
              <thead>
                <tr style={{ background: T.bgPanel }}>
                  <th style={{ ...thBase, cursor: "pointer" }} onClick={() => toggleSort("failure_mode")}>
                    {t.fmea.failureMode}{sortIcon("failure_mode")}
                  </th>
                  <th style={thBase}>{t.fmea.effect}</th>
                  <th style={thBase}>{t.fmea.cause}</th>
                  <th style={{ ...thBase, textAlign: "center" }}>S</th>
                  <th style={{ ...thBase, textAlign: "center" }}>O</th>
                  <th style={{ ...thBase, textAlign: "center" }}>D</th>
                  <th style={{ ...thBase, cursor: "pointer", textAlign: "center" }} onClick={() => toggleSort("rpn")}>
                    {t.fmea.rpn}{sortIcon("rpn")}
                  </th>
                  <th style={{ ...thBase, cursor: "pointer" }} onClick={() => toggleSort("risk_level")}>
                    {t.fmea.riskLevel}{sortIcon("risk_level")}
                  </th>
                  <th style={thBase}>{t.common.actions}</th>
                  <th style={thBase}></th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 && (
                  <tr><td colSpan={10} style={{ color: T.textMut, fontSize: 13, textAlign: "center", padding: "32px 0" }}>Kayıt yok</td></tr>
                )}
                {sorted.map(f => (
                  <tr key={f.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: T.text, fontWeight: 500 }}>{f.failure_mode}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: T.textSec }}>{f.effect_of_failure || "—"}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: T.textSec }}>{f.cause_of_failure || "—"}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, textAlign: "center", color: T.text }}>{f.severity}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, textAlign: "center", color: T.text }}>{f.occurrence}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, textAlign: "center", color: T.text }}>{f.detection}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 700, textAlign: "center", color: riskColor(f.risk_level) }}>{f.rpn}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, background: riskColor(f.risk_level) + "33", color: riskColor(f.risk_level) }}>{f.risk_level}</span>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: T.textSec }}>{f.recommended_action || "—"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <button onClick={() => deleteFMEA(f.id).then(() => getFMEA(fmeaOpId!).then(setFmeaList))} style={{ color: T.red, background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>{t.common.delete}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div style={{ color: T.textMut, fontSize: 13, textAlign: "center", padding: "32px 0" }}>{t.fmea.selectFirst}</div>
      )}
    </div>
  );
}
