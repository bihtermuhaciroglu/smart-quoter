import { useEffect, useState } from "react";
import { Part } from "../api/parts";
import { getOperations, Operation } from "../api/operations";
import { getFMEA, createFMEA, deleteFMEA, FMEAItem } from "../api/fmea";
import { exportFMEAToExcel } from "../utils/exportExcel";
import { T, inp, btn, card, riskColor } from "../theme";
import { useLanguage } from "../i18n/LanguageContext";

interface Props { parts: Part[]; }

export default function FMEAPage({ parts }: Props) {
  const { t } = useLanguage();
  const [fmeaPartId, setFmeaPartId] = useState<number | null>(null);
  const [fmeaOps, setFmeaOps] = useState<Operation[]>([]);
  const [fmeaOpId, setFmeaOpId] = useState<number | null>(null);
  const [fmeaList, setFmeaList] = useState<FMEAItem[]>([]);
  const [fMode, setFMode] = useState(""); const [fEffect, setFEffect] = useState("");
  const [fCause, setFCause] = useState(""); const [fAction, setFAction] = useState("");
  const [fPerson, setFPerson] = useState("");
  const [fS, setFS] = useState("5"); const [fO, setFO] = useState("5"); const [fD, setFD] = useState("5");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (fmeaPartId) getOperations(fmeaPartId).then(setFmeaOps); }, [fmeaPartId]);
  useEffect(() => { if (fmeaOpId) getFMEA(fmeaOpId).then(setFmeaList); }, [fmeaOpId]);

  async function handleAdd() {
    if (!fmeaOpId || !fMode) return;
    setLoading(true);
    await createFMEA({ operation_id: fmeaOpId, failure_mode: fMode, effect_of_failure: fEffect, cause_of_failure: fCause, severity: parseInt(fS), occurrence: parseInt(fO), detection: parseInt(fD), recommended_action: fAction, responsible_person: fPerson });
    setFMode(""); setFEffect(""); setFCause(""); setFAction(""); setFPerson(""); setFS("5"); setFO("5"); setFD("5");
    getFMEA(fmeaOpId).then(setFmeaList); setLoading(false);
  }

  const previewRPN = parseInt(fS) * parseInt(fO) * parseInt(fD);
  const previewLevel = previewRPN >= 200 ? "Kritik" : previewRPN >= 100 ? "Yüksek" : previewRPN >= 50 ? "Orta" : "Düşük";

  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <label style={{ fontSize: 13, color: T.textSec, fontWeight: 600 }}>{t.fmea.selectPart}:</label>
          <select value={fmeaPartId ?? ""} onChange={e => { setFmeaPartId(Number(e.target.value)); setFmeaOpId(null); setFmeaList([]); }} style={{ ...inp({ flex: "unset", width: 200 }) }}>
            <option value="">— {t.fmea.selectPart} —</option>
            {parts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
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
          <div style={{ ...card(), marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 12 }}>{t.fmea.addFmea}</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
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
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input placeholder="Önerilen aksiyon" value={fAction} onChange={e => setFAction(e.target.value)} style={inp()} />
              <input placeholder="Sorumlu kişi" value={fPerson} onChange={e => setFPerson(e.target.value)} style={inp()} />
            </div>
            <button onClick={handleAdd} disabled={loading} style={btn(T.orange)}>{loading ? t.common.loading : t.fmea.addFmea}</button>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: T.bgPanel }}>
                {[t.fmea.failureMode, t.fmea.effect, t.fmea.cause, "S", "O", "D", t.fmea.rpn, t.fmea.riskLevel, t.common.actions, ""].map(h => (
                  <th key={h} style={{ padding: "10px 10px", textAlign: "left", fontSize: 12, color: T.textSec, fontWeight: 600, borderBottom: `1px solid ${T.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fmeaList.length === 0 && <tr><td colSpan={10} style={{ padding: 32, textAlign: "center", color: T.textMut }}>Kayıt yok</td></tr>}
              {fmeaList.map(f => (
                <tr key={f.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: "9px 10px", fontSize: 12, color: T.text, fontWeight: 500 }}>{f.failure_mode}</td>
                  <td style={{ padding: "9px 10px", fontSize: 12, color: T.textSec }}>{f.effect_of_failure || "—"}</td>
                  <td style={{ padding: "9px 10px", fontSize: 12, color: T.textSec }}>{f.cause_of_failure || "—"}</td>
                  <td style={{ padding: "9px 10px", fontSize: 12, textAlign: "center", color: T.text }}>{f.severity}</td>
                  <td style={{ padding: "9px 10px", fontSize: 12, textAlign: "center", color: T.text }}>{f.occurrence}</td>
                  <td style={{ padding: "9px 10px", fontSize: 12, textAlign: "center", color: T.text }}>{f.detection}</td>
                  <td style={{ padding: "9px 10px", fontSize: 13, fontWeight: 700, textAlign: "center", color: riskColor(f.risk_level) }}>{f.rpn}</td>
                  <td style={{ padding: "9px 10px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, background: riskColor(f.risk_level) + "33", color: riskColor(f.risk_level) }}>{f.risk_level}</span>
                  </td>
                  <td style={{ padding: "9px 10px", fontSize: 12, color: T.textSec }}>{f.recommended_action || "—"}</td>
                  <td style={{ padding: "9px 10px" }}>
                    <button onClick={() => deleteFMEA(f.id).then(() => getFMEA(fmeaOpId!).then(setFmeaList))} style={{ color: T.red, background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>{t.common.delete}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <div style={{ textAlign: "center", marginTop: 80, color: T.textMut }}>{t.fmea.selectFirst}</div>
      )}
    </div>
  );
}
