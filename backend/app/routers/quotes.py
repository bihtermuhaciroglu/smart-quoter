from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
import tempfile
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_CENTER, TA_LEFT
from reportlab.lib.units import mm
from app.database import get_db
from app.models.quote import Quote
from app.models.operation import Operation
from app.models.part import Part
from app.models.setting import Setting

router = APIRouter(prefix="/quotes", tags=["quotes"])

def tr_fix(text: str) -> str:
    """Convert Turkish characters to ASCII equivalents for ReportLab Helvetica font."""
    if not text:
        return text
    table = str.maketrans(
        "çÇğĞıİöÖşŞüÜâÂîÎûÛ",
        "cCgGiIoOsSupAaIiuU"
    )
    return text.translate(table)


class QuoteCreate(BaseModel):
    part_id: int
    quote_number: str
    customer_name: Optional[str] = None
    customer_contact: Optional[str] = None
    quantity: int
    material_cost: float = 0.0
    overhead_rate: float = 0.15
    profit_margin: float = 0.20
    valid_until: Optional[date] = None
    notes: Optional[str] = None


class QuoteResponse(BaseModel):
    id: int
    part_id: int
    quote_number: str
    customer_name: Optional[str]
    customer_contact: Optional[str]
    quantity: int
    material_cost: float
    total_machining_cost: float
    overhead_rate: float
    profit_margin: float
    total_cost: float
    unit_price: float
    valid_until: Optional[date]
    status: str
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=list[QuoteResponse])
def get_quotes(db: Session = Depends(get_db)):
    return db.query(Quote).order_by(Quote.id.desc()).all()


@router.post("/", response_model=QuoteResponse)
def create_quote(data: QuoteCreate, db: Session = Depends(get_db)):
    ops = db.query(Operation).filter(Operation.part_id == data.part_id).all()
    total_machining = sum(op.machining_cost for op in ops)
    quote = Quote(**data.model_dump())
    quote.total_machining_cost = total_machining
    quote.calculate_and_save()
    db.add(quote)
    db.commit()
    db.refresh(quote)
    return quote


@router.patch("/{quote_id}/status")
def update_status(quote_id: int, status: str, db: Session = Depends(get_db)):
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Teklif bulunamadı")
    quote.status = status
    db.commit()
    return {"message": "Güncellendi"}


@router.delete("/{quote_id}")
def delete_quote(quote_id: int, db: Session = Depends(get_db)):
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Teklif bulunamadı")
    db.delete(quote)
    db.commit()
    return {"message": "Silindi"}


@router.get("/{quote_id}/pdf")
def download_quote_pdf(quote_id: int, db: Session = Depends(get_db)):
    quote = db.query(Quote).filter(Quote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Teklif bulunamadı")
    part = db.query(Part).filter(Part.id == quote.part_id).first()
    part_name = tr_fix(part.name) if part else "-"

    # Firma ayarlarını çek
    raw = {s.key: (s.value or "") for s in db.query(Setting).all()}
    company_name   = tr_fix(raw.get("company_name", "Smart Quoter"))
    app_name       = tr_fix(raw.get("app_name", "Smart Quoter"))
    tagline        = tr_fix(raw.get("tagline", "CNC Talasli Imalat Teklif Sistemi"))
    address        = tr_fix(raw.get("address", ""))
    phone          = raw.get("phone", "")
    email          = raw.get("email", "")
    tax_number     = raw.get("tax_number", "")
    currency       = raw.get("currency", "TL")

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    page_w, page_h = A4
    doc = SimpleDocTemplate(
        tmp.name, pagesize=A4,
        leftMargin=15*mm, rightMargin=15*mm,
        topMargin=15*mm, bottomMargin=20*mm
    )
    styles = getSampleStyleSheet()
    content_width = page_w - 30*mm

    # Özel stiller
    style_company = ParagraphStyle("company", fontSize=18, fontName="Helvetica-Bold",
                                   textColor=colors.HexColor("#0d1b3e"), spaceAfter=2)
    style_tagline  = ParagraphStyle("tagline",  fontSize=9,  fontName="Helvetica",
                                   textColor=colors.HexColor("#555555"), spaceAfter=2)
    style_contact  = ParagraphStyle("contact",  fontSize=8,  fontName="Helvetica",
                                   textColor=colors.HexColor("#777777"))
    style_label    = ParagraphStyle("label",    fontSize=8,  fontName="Helvetica-Bold",
                                   textColor=colors.HexColor("#333333"))
    style_value    = ParagraphStyle("value",    fontSize=8,  fontName="Helvetica",
                                   textColor=colors.HexColor("#111111"))
    style_section  = ParagraphStyle("section",  fontSize=10, fontName="Helvetica-Bold",
                                   textColor=colors.HexColor("#0d1b3e"), spaceBefore=14, spaceAfter=6)
    style_footer   = ParagraphStyle("footer",   fontSize=7.5, fontName="Helvetica",
                                   textColor=colors.HexColor("#aaaaaa"), alignment=TA_CENTER)
    style_right    = ParagraphStyle("right",    fontSize=8,  fontName="Helvetica",
                                   alignment=TA_RIGHT, textColor=colors.HexColor("#333333"))

    story = []

    # ── Başlık: firma sol / teklif bilgisi sağ ──
    firma_lines = [Paragraph(company_name, style_company), Paragraph(tagline, style_tagline)]
    if address: firma_lines.append(Paragraph(address, style_contact))
    contact_parts = []
    if phone: contact_parts.append(f"Tel: {phone}")
    if email: contact_parts.append(f"E-posta: {email}")
    if tax_number: contact_parts.append(f"Vergi No: {tax_number}")
    if contact_parts:
        firma_lines.append(Paragraph("  |  ".join(contact_parts), style_contact))

    status_map = {"draft": "Taslak", "sent": "Gönderildi", "accepted": "Kabul Edildi", "rejected": "Reddedildi"}
    status_tr = status_map.get(quote.status, quote.status)

    teklif_lines = [
        Paragraph("<b>TEKLIF BELGESI</b>", ParagraphStyle("th", fontSize=14, fontName="Helvetica-Bold",
                  textColor=colors.HexColor("#0d1b3e"), alignment=TA_RIGHT, spaceAfter=4)),
        Paragraph(f"No: <b>{quote.quote_number}</b>", style_right),
        Paragraph(f"Durum: <b>{status_tr}</b>", style_right),
        Paragraph(f"Tarih: {str(quote.created_at)[:10]}", style_right),
    ]
    if quote.valid_until:
        teklif_lines.append(Paragraph(f"Gecerlilik: {quote.valid_until}", style_right))

    header_table = Table(
        [[firma_lines, teklif_lines]],
        colWidths=[content_width * 0.6, content_width * 0.4]
    )
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",  (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0d1b3e")))
    story.append(Spacer(1, 12))

    # ── Teklif / Müşteri / Parça bilgileri ──
    story.append(Paragraph("Teklif Bilgileri", style_section))
    info_data = [
        [Paragraph("<b>Parca</b>", style_label),    Paragraph(part_name, style_value),
         Paragraph("<b>Adet</b>", style_label),      Paragraph(str(quote.quantity), style_value)],
        [         Paragraph("<b>Musteri</b>", style_label),   Paragraph(tr_fix(quote.customer_name or "-"), style_value),
         Paragraph("<b>Iletisim</b>", style_label),  Paragraph(tr_fix(quote.customer_contact or "-"), style_value)],
    ]
    info_table = Table(info_data, colWidths=[content_width*0.15, content_width*0.35,
                                             content_width*0.15, content_width*0.35])
    info_table.setStyle(TableStyle([
        ("FONTSIZE",  (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.HexColor("#f0f4ff"), colors.white]),
        ("GRID",      (0, 0), (-1, -1), 0.4, colors.HexColor("#cccccc")),
        ("PADDING",   (0, 0), (-1, -1), 7),
        ("VALIGN",    (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 14))

    # ── Maliyet özeti ──
    story.append(Paragraph("Maliyet Ozeti", style_section))
    overhead_amt = (quote.material_cost + quote.total_machining_cost) * quote.overhead_rate
    profit_amt   = (quote.material_cost + quote.total_machining_cost + overhead_amt) * quote.profit_margin

    def money(val): return f"{val:,.2f} {currency}"

    cost_data = [
        ["Maliyet Kalemi", "Tutar"],
        ["Hammadde Maliyeti",                                   money(quote.material_cost)],
        ["Isleme Maliyeti",                                     money(quote.total_machining_cost)],
        [f"Genel Gider (%{quote.overhead_rate*100:.0f})",       money(overhead_amt)],
        [f"Kar Marji (%{quote.profit_margin*100:.0f})",         money(profit_amt)],
        ["Toplam Maliyet",                                      money(quote.total_cost)],
        [f"BIRIM FIYAT  (x{quote.quantity} adet)",              money(quote.unit_price)],
    ]
    cost_table = Table(cost_data, colWidths=[content_width * 0.65, content_width * 0.35])
    cost_table.setStyle(TableStyle([
        ("FONTNAME",    (0, 0), (-1,  0), "Helvetica-Bold"),
        ("FONTNAME",    (0, -2), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, -1), 10),
        ("BACKGROUND",  (0, 0), (-1,  0), colors.HexColor("#0d1b3e")),
        ("TEXTCOLOR",   (0, 0), (-1,  0), colors.white),
        ("BACKGROUND",  (0, -2), (-1, -2), colors.HexColor("#dde8ff")),
        ("BACKGROUND",  (0, -1), (-1, -1), colors.HexColor("#0055cc")),
        ("TEXTCOLOR",   (0, -1), (-1, -1), colors.white),
        ("ROWBACKGROUNDS", (0, 1), (-1, -3), [colors.HexColor("#f7f9ff"), colors.white]),
        ("GRID",        (0, 0), (-1, -1), 0.4, colors.HexColor("#cccccc")),
        ("PADDING",     (0, 0), (-1, -1), 9),
        ("ALIGN",       (1, 0), (1, -1), "RIGHT"),
    ]))
    story.append(cost_table)

    if quote.notes:
        story.append(Spacer(1, 14))
        story.append(Paragraph("Notlar / Notes", style_section))
        story.append(Paragraph(tr_fix(quote.notes), styles["Normal"]))

    # ── Alt bilgi ──
    story.append(Spacer(1, 24))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cccccc")))
    story.append(Spacer(1, 6))
    footer_text = f"{company_name}"
    if phone: footer_text += f"  ·  {phone}"
    if email: footer_text += f"  ·  {email}"
    story.append(Paragraph(footer_text, style_footer))
    story.append(Paragraph(f"Bu belge {app_name} ile olusturulmustur.", style_footer))

    doc.build(story)
    return FileResponse(
        tmp.name,
        media_type="application/pdf",
        filename=f"Teklif_{quote.quote_number}.pdf",
        background=None
    )
