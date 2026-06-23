import { useEffect, useState } from "react";
import axios from "axios";
import { getParts, Part } from "../api/parts";
import client from "../api/client";
import { T, inp, btn, card } from "../theme";
import { useLanguage } from "../i18n/LanguageContext";

interface Props { parts: Part[]; }

export default function AIPage({ parts }: Props) {
  const { t } = useLanguage();
  const [localParts, setLocalParts] = useState<Part[]>([]);
  const allParts = parts?.length ? parts : localParts;
  const [aiPartId, setAiPartId] = useState<number | null>(null);
  const [aiName, setAiName] = useState("");
  const [aiMaterial, setAiMaterial] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [activeType, setActiveType] = useState<string>("");

  useEffect(() => {
    if (!parts?.length) {
      getParts().then(setLocalParts);
    }
  }, [parts]);

  const selectedPart = allParts.find(p => p.id === aiPartId);
  const name = selectedPart?.name ?? aiName;
  const material = selectedPart?.material_type ?? aiMaterial;

  async function handleAI(type: "operations" | "fmea" | "price") {
    if (!name) { setAiResult("Lütfen parça seç veya parça adı gir."); return; }
    setAiLoading(true); setAiResult(""); setActiveType(type);
    try {
      const endpoints = { operations: "/ai/suggest-operations", fmea: "/ai/suggest-fmea", price: "/ai/suggest-price" };
      const bodies = {
        operations: { part_name: name, material },
        fmea: { operation_type: "genel", part_name: name },
        price: { part_name: name, material, operations: "tornalama, frezeleme" },
      };
      const res = await client.post(endpoints[type], bodies[type]);
      setAiResult(res.data.result);
    } catch (e) {
      const detail = axios.isAxiosError(e) ? e.response?.data?.detail : null;
      setAiResult(typeof detail === "string" ? detail : "AI'ya bağlanılamadı.");
    }
    setAiLoading(false);
  }

  const typeLabels: Record<string, string> = {
    operations: "Operasyon Önerisi",
    fmea: "FMEA Analizi",
    price: "Fiyat Tahmini",
  };

  return (
    <div style={{ maxWidth: 800, display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ ...card() }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 14 }}>{t.ai.selectPart}</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
          <label style={{ fontSize: 13, color: T.textSec, fontWeight: 600, whiteSpace: "nowrap" }}>{t.ai.selectHint}:</label>
          <select value={aiPartId ?? ""} onChange={e => setAiPartId(e.target.value ? Number(e.target.value) : null)}
            style={inp()}>
            <option value="">— {t.ai.selectHint} —</option>
            {allParts.map(p => <option key={p.id} value={p.id}>{p.name} ({p.material_type ?? "—"})</option>)}
          </select>
        </div>
        {!aiPartId && (
          <div style={{ display: "flex", gap: 8 }}>
            <input placeholder={t.ai.partName} value={aiName} onChange={e => setAiName(e.target.value)} style={inp()} />
            <input placeholder={t.ai.material} value={aiMaterial} onChange={e => setAiMaterial(e.target.value)} style={inp()} />
          </div>
        )}
        {aiPartId && selectedPart && (
          <div style={{ padding: "8px 12px", borderRadius: 6, background: T.accent + "18", border: `1px solid ${T.accent}44`, fontSize: 13, color: T.text }}>
            <strong style={{ color: T.accent }}>{selectedPart.name}</strong>
            {selectedPart.material_type && <span style={{ color: T.textSec }}> — {selectedPart.material_type}</span>}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        {([["operations", t.ai.suggestOps, T.accent], ["fmea", t.ai.suggestFmea, T.orange], ["price", t.ai.suggestPrice, T.green]] as const).map(([type, label, color]) => (
          <button key={type} onClick={() => handleAI(type)} disabled={aiLoading}
            style={{ ...btn(color), opacity: aiLoading ? 0.6 : 1, flex: 1 }}>
            {aiLoading && activeType === type ? t.ai.loading : label}
          </button>
        ))}
      </div>

      {aiLoading && (
        <div style={{ ...card(), textAlign: "center", padding: 32, color: T.textSec }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>✦</div>
          <div style={{ fontSize: 13 }}>AI analiz yapıyor, lütfen bekleyin...</div>
        </div>
      )}

      {aiResult && !aiLoading && (
        <div style={{ ...card() }}>
          <div style={{ fontSize: 12, color: T.textSec, fontWeight: 600, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${T.border}` }}>
            {typeLabels[activeType] ?? "Sonuç"} — {selectedPart?.name ?? aiName}
          </div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.7, color: T.text, fontFamily: "inherit" }}>{aiResult}</pre>
        </div>
      )}
    </div>
  );
}
