import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import { Quote } from "../api/quotes";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10 },
  header: { marginBottom: 24 },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  subtitle: { fontSize: 11, color: "#666" },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 8, borderBottom: "1px solid #ddd", paddingBottom: 4 },
  row: { flexDirection: "row", marginBottom: 5 },
  label: { width: 180, color: "#555" },
  value: { flex: 1, fontFamily: "Helvetica-Bold" },
  divider: { borderBottom: "1px solid #eee", marginVertical: 12 },
  totalBox: { backgroundColor: "#f0f7ff", padding: 12, borderRadius: 4, marginTop: 16 },
  totalRow: { flexDirection: "row", marginBottom: 4 },
  totalLabel: { width: 180, fontSize: 11 },
  totalValue: { flex: 1, fontSize: 11, fontFamily: "Helvetica-Bold" },
  bigPrice: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#0066cc" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", color: "#999", fontSize: 9 },
  statusBadge: { padding: "3 8", borderRadius: 3, fontSize: 9, fontFamily: "Helvetica-Bold" },
});

function QuoteDocument({ quote, partName }: { quote: Quote; partName: string }) {
  const statusLabel: Record<string, string> = {
    draft: "Taslak", sent: "Gönderildi", accepted: "Kabul Edildi", rejected: "Reddedildi",
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Smart Quoter</Text>
          <Text style={styles.subtitle}>CNC Talaşlı İmalat Teklif Belgesi</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Teklif Bilgileri</Text>
          <View style={styles.row}><Text style={styles.label}>Teklif No:</Text><Text style={styles.value}>{quote.quote_number}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Durum:</Text><Text style={styles.value}>{statusLabel[quote.status] ?? quote.status}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Geçerlilik Tarihi:</Text><Text style={styles.value}>{quote.valid_until ?? "—"}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Oluşturma Tarihi:</Text><Text style={styles.value}>{quote.created_at}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Müşteri Bilgileri</Text>
          <View style={styles.row}><Text style={styles.label}>Müşteri:</Text><Text style={styles.value}>{quote.customer_name ?? "—"}</Text></View>
          <View style={styles.row}><Text style={styles.label}>İletişim:</Text><Text style={styles.value}>{quote.customer_contact ?? "—"}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parça Bilgileri</Text>
          <View style={styles.row}><Text style={styles.label}>Parça Adı:</Text><Text style={styles.value}>{partName}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Adet:</Text><Text style={styles.value}>{quote.quantity}</Text></View>
        </View>

        <View style={styles.totalBox}>
          <Text style={[styles.sectionTitle, { borderBottom: "none", marginBottom: 10 }]}>Maliyet Özeti</Text>
          <View style={styles.totalRow}><Text style={styles.totalLabel}>Hammadde Maliyeti:</Text><Text style={styles.totalValue}>₺{quote.material_cost.toFixed(2)}</Text></View>
          <View style={styles.totalRow}><Text style={styles.totalLabel}>İşleme Maliyeti:</Text><Text style={styles.totalValue}>₺{quote.total_machining_cost.toFixed(2)}</Text></View>
          <View style={styles.totalRow}><Text style={styles.totalLabel}>Genel Gider ({(quote.overhead_rate * 100).toFixed(0)}%):</Text><Text style={styles.totalValue}>₺{((quote.material_cost + quote.total_machining_cost) * quote.overhead_rate).toFixed(2)}</Text></View>
          <View style={styles.totalRow}><Text style={styles.totalLabel}>Kar Marjı ({(quote.profit_margin * 100).toFixed(0)}%):</Text><Text style={styles.totalValue}>₺{(quote.unit_price - (quote.material_cost + quote.total_machining_cost) * (1 + quote.overhead_rate)).toFixed(2)}</Text></View>
          <View style={styles.divider} />
          <View style={styles.totalRow}><Text style={styles.totalLabel}>Toplam Maliyet ({quote.quantity} adet):</Text><Text style={styles.totalValue}>₺{quote.total_cost.toFixed(2)}</Text></View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Birim Fiyat:</Text>
            <Text style={styles.bigPrice}>₺{quote.unit_price.toFixed(2)}</Text>
          </View>
        </View>

        {quote.notes && (
          <View style={[styles.section, { marginTop: 16 }]}>
            <Text style={styles.sectionTitle}>Notlar</Text>
            <Text>{quote.notes}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          Bu belge Smart Quoter CNC Teklif Sistemi tarafından oluşturulmuştur.
        </Text>
      </Page>
    </Document>
  );
}

export async function downloadQuotePDF(quote: Quote, partName: string) {
  try {
    const blob = await pdf(<QuoteDocument quote={quote} partName={partName} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Teklif_${quote.quote_number}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    console.error("PDF hatası:", e);
    alert("PDF oluşturulamadı: " + e);
  }
}
