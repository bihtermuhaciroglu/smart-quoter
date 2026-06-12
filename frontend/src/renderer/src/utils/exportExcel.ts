import * as XLSX from "xlsx";
import { FMEAItem } from "../api/fmea";
import { Quote } from "../api/quotes";

export function exportFMEAToExcel(items: FMEAItem[], filename = "FMEA_Analizi") {
  const rows = items.map((f) => ({
    "Hata Modu": f.failure_mode,
    "Hatanın Etkisi": f.effect_of_failure ?? "",
    "Hatanın Nedeni": f.cause_of_failure ?? "",
    "Şiddet (S)": f.severity,
    "Oluşma (O)": f.occurrence,
    "Saptama (D)": f.detection,
    "RPN": f.rpn,
    "Risk Seviyesi": f.risk_level,
    "Önerilen Aksiyon": f.recommended_action ?? "",
    "Sorumlu": f.responsible_person ?? "",
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 30 }, { wch: 25 }, { wch: 25 },
    { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 14 }, { wch: 30 }, { wch: 20 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "FMEA");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportQuoteToExcel(quote: Quote, partName: string, filename = "Teklif") {
  const summary = [
    { "Kalem": "Teklif Numarası", "Değer": quote.quote_number },
    { "Kalem": "Müşteri", "Değer": quote.customer_name ?? "" },
    { "Kalem": "Parça", "Değer": partName },
    { "Kalem": "Adet", "Değer": quote.quantity },
    { "Kalem": "Hammadde Maliyeti (₺)", "Değer": quote.material_cost.toFixed(2) },
    { "Kalem": "İşleme Maliyeti (₺)", "Değer": quote.total_machining_cost.toFixed(2) },
    { "Kalem": "Genel Gider (%)", "Değer": (quote.overhead_rate * 100).toFixed(0) },
    { "Kalem": "Kar Marjı (%)", "Değer": (quote.profit_margin * 100).toFixed(0) },
    { "Kalem": "Toplam Maliyet (₺)", "Değer": quote.total_cost.toFixed(2) },
    { "Kalem": "Birim Fiyat (₺)", "Değer": quote.unit_price.toFixed(2) },
    { "Kalem": "Durum", "Değer": quote.status },
    { "Kalem": "Geçerlilik Tarihi", "Değer": quote.valid_until ?? "" },
  ];
  const ws = XLSX.utils.json_to_sheet(summary);
  ws["!cols"] = [{ wch: 28 }, { wch: 24 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Teklif");
  XLSX.writeFile(wb, `${filename}_${quote.quote_number}.xlsx`);
}
