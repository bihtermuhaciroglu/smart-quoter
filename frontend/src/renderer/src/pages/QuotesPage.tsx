import { useEffect, useState } from "react";
import { getParts, Part } from "../api/parts";
import { getQuotes, createQuote, updateQuoteStatus, deleteQuote, Quote } from "../api/quotes";
import { exportQuoteToExcel } from "../utils/exportExcel";
import client from "../api/client";
import { T, inp, btn, card, statusColor } from "../theme";
import { useLanguage } from "../i18n/LanguageContext";

export default function QuotesPage() {
  const { t } = useLanguage();
  const [parts, setParts] = useState<Part[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState<number | null>(null);
  const [partId, setPartId] = useState<number | null>(null);
  const [quoteNo, setQuoteNo] = useState("");
  const [customer, setCustomer] = useState(""); const [contact, setContact] = useState("");
  const [qty, setQty] = useState("1"); const [matCost, setMatCost] = useState("0");
  const [overhead, setOverhead] = useState("15"); const [margin, setMargin] = useState("20");
  const [validUntil, setValidUntil] = useState(""); const [notes, setNotes] = useState("");

  async function load() { setParts(await getParts()); setQuotes(await getQuotes()); }

  async function handleCreate() {
    if (!partId || !quoteNo || !qty) return;
    setLoading(true);
    await createQuote({ part_id: partId, quote_number: quoteNo, customer_name: customer, customer_contact: contact, quantity: parseInt(qty), material_cost: parseFloat(matCost) || 0, overhead_rate: parseFloat(overhead) / 100, profit_margin: parseFloat(margin) / 100, valid_until: validUntil || undefined, notes });
    setQuoteNo(""); setCustomer(""); setContact(""); setQty("1"); setMatCost("0"); setNotes(""); setValidUntil("");
    await load(); setLoading(false);
  }

  async function handlePDF(quote: Quote) {
    setPdfLoading(quote.id);
    try {
      const res = await client.get(`/quotes/${quote.id}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a"); a.href = url;
      a.download = `Teklif_${quote.quote_number}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { alert("PDF hatası: " + e); }
    setPdfLoading(null);
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div style={{ ...card(), marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{t.quotes.createQuote}</div>
          <button onClick={() => setQuoteNo(`TKL-${new Date().getFullYear()}-${String(quotes.length + 1).padStart(3, "0")}`)} style={btn(T.bgPanel, true)}>
            Auto No
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <select value={partId ?? ""} onChange={e => setPartId(Number(e.target.value))} style={{ ...inp({ flex: "unset", width: 200 }) }}>
            <option value="">— {t.quotes.selectPart} —</option>
            {parts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input placeholder={`${t.quotes.quoteNo} *`} value={quoteNo} onChange={e => setQuoteNo(e.target.value)} style={inp({ flex: "unset", width: 160 })} />
          <input placeholder={t.quotes.customer} value={customer} onChange={e => setCustomer(e.target.value)} style={inp()} />
          <input placeholder={t.quotes.contact} value={contact} onChange={e => setContact(e.target.value)} style={inp()} />
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <input placeholder={`${t.quotes.quantity} *`} value={qty} onChange={e => setQty(e.target.value)} style={inp({ flex: "unset", width: 80 })} />
          <input placeholder={t.quotes.materialCost} value={matCost} onChange={e => setMatCost(e.target.value)} style={inp()} />
          <input placeholder={t.quotes.overheadRate} value={overhead} onChange={e => setOverhead(e.target.value)} style={inp({ flex: "unset", width: 130 })} />
          <input placeholder={t.quotes.profitMargin} value={margin} onChange={e => setMargin(e.target.value)} style={inp({ flex: "unset", width: 120 })} />
          <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} style={inp({ flex: "unset", width: 160, colorScheme: "dark" })} />
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input placeholder={t.common.notes} value={notes} onChange={e => setNotes(e.target.value)} style={inp()} />
        </div>
        <button onClick={handleCreate} disabled={loading} style={btn(T.accent)}>{loading ? t.common.loading : t.quotes.createQuote}</button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: T.bgPanel }}>
            {[t.quotes.quoteNo, t.parts.partName, t.quotes.customer, t.quotes.quantity, t.quotes.machiningCost, t.quotes.unitPrice, t.quotes.totalCost, t.common.status, ""].map(h => (
              <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 12, color: T.textSec, fontWeight: 600, borderBottom: `1px solid ${T.border}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {quotes.length === 0 && <tr><td colSpan={9} style={{ padding: 32, textAlign: "center", color: T.textMut }}>{t.quotes.noQuotes}</td></tr>}
          {quotes.map(q => {
            const part = parts.find(p => p.id === q.part_id);
            return (
              <tr key={q.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={{ padding: "10px 12px", fontSize: 13, color: T.accent, fontWeight: 600 }}>{q.quote_number}</td>
                <td style={{ padding: "10px 12px", fontSize: 13, color: T.text }}>{part?.name ?? "—"}</td>
                <td style={{ padding: "10px 12px", fontSize: 13, color: T.textSec }}>{q.customer_name ?? "—"}</td>
                <td style={{ padding: "10px 12px", fontSize: 13, color: T.text }}>{q.quantity}</td>
                <td style={{ padding: "10px 12px", fontSize: 13, color: T.textSec }}>₺{q.total_machining_cost.toFixed(2)}</td>
                <td style={{ padding: "10px 12px", fontSize: 13, color: T.green, fontWeight: 700 }}>₺{q.unit_price.toFixed(2)}</td>
                <td style={{ padding: "10px 12px", fontSize: 13, color: T.text, fontWeight: 600 }}>₺{q.total_cost.toFixed(2)}</td>
                <td style={{ padding: "10px 12px" }}>
                  <select value={q.status} onChange={e => updateQuoteStatus(q.id, e.target.value).then(load)}
                    style={{ fontSize: 11, padding: "4px 8px", borderRadius: 4, border: `1px solid ${statusColor[q.status]}`, color: statusColor[q.status], background: statusColor[q.status] + "22", fontWeight: 600, cursor: "pointer" }}>
                    {(["draft","sent","accepted","rejected"] as const).map(v => (
                      <option key={v} value={v}>{(t.quotes as Record<string, string>)[`status${v.charAt(0).toUpperCase()}${v.slice(1)}`] ?? v}</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => exportQuoteToExcel(q, part?.name ?? "—")} style={btn(T.green, true)}>XLS</button>
                    <button onClick={() => handlePDF(q)} disabled={pdfLoading === q.id} style={btn(T.red, true)}>{pdfLoading === q.id ? "..." : "PDF"}</button>
                    <button onClick={() => deleteQuote(q.id).then(load)} style={{ ...btn(T.bgPanel, true), color: T.textSec }}>{t.common.delete}</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
