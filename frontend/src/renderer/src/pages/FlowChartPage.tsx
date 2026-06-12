import { useEffect, useState, useCallback } from "react";
import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState,
  useReactFlow, ReactFlowProvider,
  Node, Edge, Connection,
  getNodesBounds, getViewportForBounds,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { getParts, Part } from "../api/parts";
import { getOperations, Operation } from "../api/operations";
import { T } from "../theme";
import { useLanguage } from "../i18n/LanguageContext";

const opColors: Record<string, string> = {
  Tornalama: "#2980b9", Frezeleme: "#27ae60", Delme: "#8e44ad",
  Taşlama: "#e67e00", Raybalama: "#16a085", "Diş Açma": "#c0392b", Honlama: "#2c3e50",
};

function buildNodes(ops: Operation[]): Node[] {
  const nodes: Node[] = [{
    id: "start", type: "input", position: { x: 300, y: 0 },
    data: { label: "BAŞLANGIÇ" },
    style: { background: "#27ae60", color: "white", border: "none", borderRadius: 20, fontWeight: 700, padding: "8px 20px" },
  }];
  ops.forEach((op, i) => {
    nodes.push({
      id: `op-${op.id}`, position: { x: 300, y: (i + 1) * 110 },
      data: { label: `${op.sequence_no}. ${op.operation_type}${op.machine_name ? "\n" + op.machine_name : ""} · ${op.cycle_time_min}dk · ₺${op.machining_cost.toFixed(0)}` },
      style: { background: opColors[op.operation_type] ?? "#555", color: "white", border: "none", borderRadius: 8, minWidth: 180, padding: "10px 16px", whiteSpace: "pre-line", fontSize: 12 },
    });
  });
  nodes.push({
    id: "end", type: "output", position: { x: 300, y: (ops.length + 1) * 110 },
    data: { label: "MAMÜL ÜRÜN" },
    style: { background: "#c0392b", color: "white", border: "none", borderRadius: 20, fontWeight: 700, padding: "8px 20px" },
  });
  return nodes;
}

function buildEdges(ops: Operation[]): Edge[] {
  const ids = ["start", ...ops.map(o => `op-${o.id}`), "end"];
  return ids.slice(0, -1).map((id, i) => ({
    id: `e-${i}`, source: id, target: ids[i + 1],
    animated: true, style: { stroke: "#aaa", strokeWidth: 2 },
  }));
}

function ExportButton({ label }: { label: string }) {
  const { getNodes } = useReactFlow();
  async function handleExport() {
    const nodes = getNodes();
    if (!nodes.length) return;
    const bounds = getNodesBounds(nodes);
    const W = 1200, H = 800;
    const viewport = getViewportForBounds(bounds, W, H, 0.5, 2, 40);
    const el = document.querySelector(".react-flow__viewport") as HTMLElement;
    if (!el) return;
    try {
      const dataUrl = await toPng(el, {
        backgroundColor: "#ffffff", width: W, height: H,
        style: { width: String(W), height: String(H), transform: `translate(${viewport.x}px,${viewport.y}px) scale(${viewport.zoom})` },
      });
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      pdf.addImage(dataUrl, "PNG", 0, 0, 297, 210);
      pdf.save(`Akis_${label}.pdf`);
    } catch (e) { alert("PDF hatası: " + e); }
  }
  return (
    <button onClick={handleExport}
      style={{ padding: "7px 14px", fontSize: 12, background: T.red, color: "white", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
      <span>↓</span> PDF İndir
    </button>
  );
}

function FlowChart({ partName, ops }: { partName: string; ops: Operation[] }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(buildNodes(ops));
  const [edges, setEdges, onEdgesChange] = useEdgesState(buildEdges(ops));
  const onConnect = useCallback((c: Connection) => setEdges(es => addEdge(c, es)), [setEdges]);
  useEffect(() => { setNodes(buildNodes(ops)); setEdges(buildEdges(ops)); }, [ops]);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <ExportButton label={partName} />
      </div>
      <div style={{ height: 520, border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden", background: T.bgCard }}>
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView
            style={{ background: T.bg }}>
          <Background color={T.borderL} gap={20} /><Controls /><MiniMap style={{ background: T.bgCard }} />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function FlowChartPage() {
  const { t } = useLanguage();
  const [parts, setParts] = useState<Part[]>([]);
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null);
  const [ops, setOps] = useState<Operation[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  useEffect(() => { getParts().then(setParts); }, []);
  useEffect(() => {
    if (!selectedPartId) return;
    getOperations(selectedPartId).then(o => { setOps(o); setTotalCost(o.reduce((s, x) => s + x.machining_cost, 0)); });
  }, [selectedPartId]);
  const selectedPart = parts.find(p => p.id === selectedPartId);
  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", gap: 16, alignItems: "center" }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, marginRight: 8 }}>{t.flowchart.selectPart}:</label>
          <select value={selectedPartId ?? ""} onChange={e => setSelectedPartId(Number(e.target.value))}
            style={{ padding: "7px 10px", fontSize: 13, border: `1px solid ${T.border}`, borderRadius: 5, background: T.bgInput, color: T.text, outline: "none" }}>
            <option value="">— {t.flowchart.selectPart} —</option>
            {parts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {totalCost > 0 && <div style={{ fontSize: 13, color: "#0066cc", fontWeight: 600 }}>{t.common.total}: ₺{totalCost.toFixed(2)}</div>}
      </div>
      {selectedPartId && ops.length > 0 ? (
        <ReactFlowProvider>
          <FlowChart partName={selectedPart?.name ?? "parca"} ops={ops} />
        </ReactFlowProvider>
      ) : selectedPartId ? (
        <p style={{ color: "#999", textAlign: "center", marginTop: 40 }}>{t.flowchart.noOps}</p>
      ) : (
        <p style={{ color: "#999", textAlign: "center", marginTop: 60 }}>{t.flowchart.selectFirst}</p>
      )}
    </div>
  );
}
