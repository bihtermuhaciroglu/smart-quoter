import { useState } from "react";
import { createPart, deletePart, Part } from "../api/parts";
import client from "../api/client";
import { T, inp, btn, card } from "../theme";
import { useLanguage } from "../i18n/LanguageContext";

interface Props { parts: Part[]; onRefresh: () => void; }

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

export default function PartsPage({ parts, onRefresh }: Props) {
  const { t } = useLanguage();
  const [partName, setPartName] = useState("");
  const [partMaterial, setPartMaterial] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ col: string; dir: SortDir } | null>(null);

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

  const filtered = parts.filter(p => {
    const q = search.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || (p.material_type ?? "").toLowerCase().includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sort) return 0;
    const dir = sort.dir === "asc" ? 1 : -1;
    if (sort.col === "name") return dir * a.name.localeCompare(b.name);
    if (sort.col === "material") return dir * (a.material_type ?? "").localeCompare(b.material_type ?? "");
    if (sort.col === "created_at") return dir * (a.created_at ?? "").localeCompare(b.created_at ?? "");
    return 0;
  });

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
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ ...card() }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 12 }}>{t.parts.addPart}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
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

      <div>
        <div style={{ marginBottom: 8 }}>
          <input
            placeholder="Parça adı veya malzeme ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={inp({ flex: "0 0 220px", fontSize: 12 })}
          />
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", background: T.bgCard, borderRadius: 8, overflow: "hidden", border: `1px solid ${T.border}` }}>
          <thead>
            <tr style={{ background: T.bgPanel }}>
              <th style={thBase}>ID</th>
              <th style={{ ...thBase, cursor: "pointer" }} onClick={() => toggleSort("name")}>
                {t.parts.partName}{sortIcon("name")}
              </th>
              <th style={{ ...thBase, cursor: "pointer" }} onClick={() => toggleSort("material")}>
                {t.parts.material}{sortIcon("material")}
              </th>
              <th style={{ ...thBase, cursor: "pointer" }} onClick={() => toggleSort("created_at")}>
                Tarih{sortIcon("created_at")}
              </th>
              <th style={thBase}>{t.parts.drawing}</th>
              <th style={thBase}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr><td colSpan={6} style={{ color: T.textMut, fontSize: 13, textAlign: "center", padding: "32px 0" }}>{t.parts.noParts}</td></tr>
            )}
            {sorted.map(p => (
              <tr key={p.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={{ padding: "10px 12px", fontSize: 13, color: T.textSec }}>{p.id}</td>
                <td style={{ padding: "10px 12px", fontSize: 13, color: T.text, fontWeight: 500 }}>{p.name}</td>
                <td style={{ padding: "10px 12px", fontSize: 13, color: T.textSec }}>{p.material_type || "—"}</td>
                <td style={{ padding: "10px 12px", fontSize: 13, color: T.textSec }}>{p.created_at?.slice(0, 10) || "—"}</td>
                <td style={{ padding: "10px 12px", fontSize: 13 }}>
                  {(p as any).drawing_file_path
                    ? <span style={{ color: T.green, fontSize: 12, padding: "2px 8px", background: T.green + "22", borderRadius: 4 }}>{t.parts.uploadedFile}</span>
                    : <label style={{ fontSize: 11, color: T.accent, cursor: "pointer", padding: "3px 10px", border: `1px solid ${T.accent}55`, borderRadius: 4, background: T.accent + "18" }}>
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
    </div>
  );
}
