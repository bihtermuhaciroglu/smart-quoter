import { useState } from "react";
import { createPart, deletePart, Part } from "../api/parts";
import client from "../api/client";
import { T, inp, btn, card } from "../theme";
import { useLanguage } from "../i18n/LanguageContext";

interface Props { parts: Part[]; onRefresh: () => void; }

export default function PartsPage({ parts, onRefresh }: Props) {
  const { t } = useLanguage();
  const [partName, setPartName] = useState("");
  const [partMaterial, setPartMaterial] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  async function handleAdd() {
    if (!partName.trim()) return;
    setLoading(true);
    const np = await createPart({ name: partName, material_type: partMaterial, quantity_required: 1 });
    if (selectedFile) {
      const fd = new FormData(); fd.append("file", selectedFile);
      await client.post(`/parts/${np.id}/upload`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setSelectedFile(null);
    }
    setPartName(""); setPartMaterial(""); await onRefresh(); setLoading(false);
  }

  return (
    <div>
      <div style={{ ...card(), marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 12 }}>{t.parts.addPart}</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input placeholder={`${t.parts.partName} *`} value={partName} onChange={e => setPartName(e.target.value)} style={inp()} />
          <input placeholder={t.parts.material} value={partMaterial} onChange={e => setPartMaterial(e.target.value)} style={inp()} />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 13, color: selectedFile ? T.green : T.textSec, cursor: "pointer", padding: "7px 14px", border: `1px dashed ${selectedFile ? T.green : T.borderL}`, borderRadius: 5, background: T.bgInput, display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s" }}>
            <span style={{ fontSize: 16 }}>{selectedFile ? "✓" : "+"}</span>
            {selectedFile ? selectedFile.name : t.parts.selectDrawing}
            <input type="file" accept=".pdf,.dxf,.dwg,.jpg,.jpeg,.png,.step,.stp,.iges,.stl,.sldprt,.sldasm,.catpart,.ipt,.iam" style={{ display: "none" }} onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
          </label>
          <button onClick={handleAdd} disabled={loading} style={btn(T.accent)}>{loading ? t.common.adding : t.parts.addPart}</button>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: T.bgPanel }}>
            {["ID", t.parts.partName, t.parts.material, t.parts.drawing, ""].map(h => (
              <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 12, color: T.textSec, fontWeight: 600, borderBottom: `1px solid ${T.border}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {parts.length === 0 && <tr><td colSpan={5} style={{ padding: 32, textAlign: "center", color: T.textMut }}>{t.parts.noParts}</td></tr>}
          {parts.map(p => (
            <tr key={p.id} style={{ borderBottom: `1px solid ${T.border}` }}>
              <td style={{ padding: "10px 12px", fontSize: 13, color: T.textSec }}>{p.id}</td>
              <td style={{ padding: "10px 12px", fontSize: 13, color: T.text, fontWeight: 500 }}>{p.name}</td>
              <td style={{ padding: "10px 12px", fontSize: 13, color: T.textSec }}>{p.material_type || "—"}</td>
              <td style={{ padding: "10px 12px", fontSize: 13 }}>
                {p.drawing_file_path
                  ? <span style={{ color: T.green, fontSize: 12, padding: "2px 8px", background: T.green + "22", borderRadius: 4 }}>{t.parts.uploadedFile}</span>
                  :                     <label style={{ fontSize: 11, color: T.accent, cursor: "pointer", padding: "3px 10px", border: `1px solid ${T.accent}55`, borderRadius: 4, background: T.accent + "18" }}>
                      {uploadingId === p.id ? t.common.loading : `+ ${t.parts.uploadDrawing}`}
                      <input type="file" style={{ display: "none" }} onChange={async e => {
                        const f = e.target.files?.[0]; if (!f) return;
                        setUploadingId(p.id); const fd = new FormData(); fd.append("file", f);
                        await client.post(`/parts/${p.id}/upload`, fd, { headers: { "Content-Type": "multipart/form-data" } });
                        await onRefresh(); setUploadingId(null);
                      }} />
                    </label>
                }
              </td>
              <td style={{ padding: "10px 12px" }}>
                <button onClick={() => deletePart(p.id).then(onRefresh)} style={{ color: T.red, background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>{t.common.delete}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
