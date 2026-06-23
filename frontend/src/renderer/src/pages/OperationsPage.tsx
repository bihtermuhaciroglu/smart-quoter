import { useEffect, useState } from "react";
import { getParts, Part } from "../api/parts";
import { getOperations, createOperation, deleteOperation, Operation } from "../api/operations";
import { getMachines, Machine } from "../api/settings";
import { T, inp, btn, card } from "../theme";
import { useLanguage } from "../i18n/LanguageContext";

const OP_TYPES = ["Tornalama", "Frezeleme", "Delme", "Taşlama", "Raybalama", "Diş Açma", "Honlama"];

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

export default function OperationsPage({ parts }: Props) {
  const { t } = useLanguage();
  const [localParts, setLocalParts] = useState<Part[]>([]);
  const allParts = parts?.length ? parts : localParts;
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [savedMachines, setSavedMachines] = useState<Machine[]>([]);
  const [opType, setOpType] = useState("Tornalama");
  const [machine, setMachine] = useState(""); const [tool, setTool] = useState("");
  const [setup, setSetup] = useState("0"); const [cycle, setCycle] = useState("");
  const [rate, setRate] = useState(""); const [toolCost, setToolCost] = useState("0");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ col: string; dir: SortDir } | null>(null);

  async function load(pid: number) { setOperations(await getOperations(pid)); }

  useEffect(() => {
    if (!parts?.length) {
      getParts().then(setLocalParts);
    }
  }, [parts]);

  useEffect(() => {
    getMachines()
      .then(setSavedMachines)
      .catch(err => console.error("Makine listesi yüklenemedi:", err));
  }, []);

  function handleMachineSelect(id: string) {
    if (!id) { setMachine(""); setRate(""); return; }
    const m = savedMachines.find(m => m.id === parseInt(id));
    if (m) { setMachine(m.name); setRate(String(m.hourly_rate)); }
  }

  async function handleAdd() {
    if (!selectedPartId || !cycle || !rate) return;
    setLoading(true);
    await createOperation({ part_id: selectedPartId, sequence_no: operations.length + 1, operation_type: opType, machine_name: machine, tool_name: tool, setup_time_min: parseFloat(setup) || 0, cycle_time_min: parseFloat(cycle), machine_rate_hr: parseFloat(rate), tool_cost: parseFloat(toolCost) || 0 });
    setCycle(""); setMachine(""); setTool(""); setSetup("0"); setToolCost("0"); setRate("");
    await load(selectedPartId); setLoading(false);
  }

  useEffect(() => { if (selectedPartId) load(selectedPartId); }, [selectedPartId]);

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

  const filtered = operations.filter(op => {
    const q = search.toLowerCase();
    return !q || op.operation_type.toLowerCase().includes(q) || (op.machine_name ?? "").toLowerCase().includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sort) return 0;
    const dir = sort.dir === "asc" ? 1 : -1;
    if (sort.col === "type") return dir * a.operation_type.localeCompare(b.operation_type);
    if (sort.col === "machine") return dir * (a.machine_name ?? "").localeCompare(b.machine_name ?? "");
    if (sort.col === "cycle") return dir * (a.cycle_time_min - b.cycle_time_min);
    return 0;
  });

  const totalCost = operations.reduce((s, o) => s + o.machining_cost, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: T.textSec }}>{t.operations.selectPart}:</label>
        <select value={selectedPartId ?? ""} onChange={e => setSelectedPartId(Number(e.target.value))}
          style={{ ...inp({ flex: "unset", width: 260 }) }}>
          <option value="">— {t.operations.selectPart} —</option>
          {allParts.map(p => <option key={p.id} value={p.id}>{p.name} ({p.material_type || "—"})</option>)}
        </select>
        <button
          onClick={() => getParts().then(setLocalParts)}
          style={{ ...btn(T.bgPanel, true), fontSize: 12, padding: "4px 10px" }}
          title="Parçaları yenile"
        >Yenile</button>
      </div>

      {selectedPartId ? (
        <>
          <div style={{ ...card() }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 12 }}>{t.operations.addOperation}</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select value={opType} onChange={e => setOpType(e.target.value)} style={{ ...inp({ flex: "unset", width: 150 }) }}>
                {OP_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <select
                defaultValue=""
                onChange={e => handleMachineSelect(e.target.value)}
                style={{ ...inp({ flex: "unset", width: 220 }) }}
              >
                <option value="">— {t.operations.selectMachine} —</option>
                {savedMachines.length === 0
                  ? <option disabled>{t.operations.noMachines}</option>
                  : savedMachines.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} · {m.hourly_rate}₺/saat
                      </option>
                    ))
                }
              </select>
              <input placeholder={t.operations.machineName} value={machine} onChange={e => setMachine(e.target.value)} style={inp()} />
              <input placeholder={t.operations.tool} value={tool} onChange={e => setTool(e.target.value)} style={inp()} />
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <input placeholder={t.operations.setupTime} value={setup} onChange={e => setSetup(e.target.value)} style={inp()} />
              <input placeholder={`${t.operations.cycleTime} *`} value={cycle} onChange={e => setCycle(e.target.value)} style={inp()} />
              <input placeholder={`${t.operations.machineRate} *`} value={rate} onChange={e => setRate(e.target.value)} style={inp()} />
              <input placeholder={t.operations.toolCost} value={toolCost} onChange={e => setToolCost(e.target.value)} style={inp()} />
            </div>
            <button onClick={handleAdd} disabled={loading} style={btn(T.accent)}>{loading ? t.common.adding : t.operations.addOperation}</button>
          </div>

          <div>
            <div style={{ marginBottom: 8 }}>
              <input
                placeholder="Operasyon tipi veya makine ara..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={inp({ flex: "0 0 220px", fontSize: 12 })}
              />
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", background: T.bgCard, borderRadius: 8, overflow: "hidden", border: `1px solid ${T.border}` }}>
              <thead>
                <tr style={{ background: T.bgPanel }}>
                  <th style={thBase}>{t.operations.seq}</th>
                  <th style={{ ...thBase, cursor: "pointer" }} onClick={() => toggleSort("type")}>
                    {t.common.type}{sortIcon("type")}
                  </th>
                  <th style={{ ...thBase, cursor: "pointer" }} onClick={() => toggleSort("machine")}>
                    {t.operations.machineName}{sortIcon("machine")}
                  </th>
                  <th style={thBase}>{t.operations.tool}</th>
                  <th style={{ ...thBase, cursor: "pointer" }} onClick={() => toggleSort("cycle")}>
                    {t.operations.cycle}{sortIcon("cycle")}
                  </th>
                  <th style={thBase}>{t.operations.rate}</th>
                  <th style={thBase}>{t.operations.cost}</th>
                  <th style={thBase}></th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 && (
                  <tr><td colSpan={8} style={{ color: T.textMut, fontSize: 13, textAlign: "center", padding: "32px 0" }}>{t.operations.noOperations}</td></tr>
                )}
                {sorted.map(op => (
                  <tr key={op.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: T.textSec }}>{op.sequence_no}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: T.text, fontWeight: 500 }}>{op.operation_type}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: T.textSec }}>{op.machine_name || "—"}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: T.textSec }}>{op.tool_name || "—"}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: T.text }}>{op.cycle_time_min}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: T.text }}>₺{op.machine_rate_hr}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: T.accent, fontWeight: 600 }}>₺{op.machining_cost.toFixed(2)}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <button onClick={() => deleteOperation(op.id).then(() => load(selectedPartId))} style={{ color: T.red, background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>{t.common.delete}</button>
                    </td>
                  </tr>
                ))}
                {operations.length > 0 && (
                  <tr style={{ background: T.bgPanel }}>
                    <td colSpan={6} style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, textAlign: "right", color: T.textSec }}>{t.operations.totalCost}:</td>
                    <td style={{ padding: "10px 12px", fontSize: 14, fontWeight: 700, color: T.accent }}>₺{totalCost.toFixed(2)}</td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div style={{ color: T.textMut, fontSize: 13, textAlign: "center", padding: "32px 0" }}>{t.operations.selectPartHint}</div>
      )}
    </div>
  );
}
