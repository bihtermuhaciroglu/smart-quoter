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
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable, Image as RLImage
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
    ops = db.query(Operation).filter(Operation.part_id == quote.part_id).all()

    raw = {s.key: (s.value or "") for s in db.query(Setting).all()}
    company_name  = tr_fix(raw.get("company_name", "Smart Quoter"))
    app_name      = tr_fix(raw.get("app_name", "Smart Quoter"))
    tagline       = tr_fix(raw.get("tagline", "CNC Talasli Imalat"))
    address       = tr_fix(raw.get("address", ""))
    phone         = raw.get("phone", "")
    email         = raw.get("email", "")
    tax_number    = raw.get("tax_number", "")
    logo_path_val = raw.get("logo_path", "")

    # ── Renkler ──
    C_NAVY   = colors.HexColor("#1a2744")
    C_ACCENT = colors.HexColor("#2563eb")
    C_SEP    = colors.HexColor("#e2e8f0")
    C_DARK   = colors.HexColor("#0f172a")
    C_MUTED  = colors.HexColor("#64748b")
    C_LBLUE  = colors.HexColor("#f0f4ff")
    C_ALT    = colors.HexColor("#f8faff")
    C_TOTAL  = colors.HexColor("#dde8ff")
    C_WHITE  = colors.white

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    page_w, _ = A4
    doc = SimpleDocTemplate(
        tmp.name, pagesize=A4,
        leftMargin=15*mm, rightMargin=15*mm,
        topMargin=15*mm, bottomMargin=20*mm
    )
    W = page_w - 30*mm  # kullanılabilir genişlik

    # ── Stil tanımları (wordWrap/CJK kullanılmıyor — Paragraph zaten wrap yapar) ──
    def ps(name, **kw):
        return ParagraphStyle(name, **kw)

    S = {
        "co":  ps("co",  fontSize=17, fontName="Helvetica-Bold",  textColor=C_NAVY,   leading=20),
        "tag": ps("tag", fontSize=8,  fontName="Helvetica",        textColor=C_MUTED,  leading=11),
        "ct":  ps("ct",  fontSize=8,  fontName="Helvetica",        textColor=C_MUTED,  leading=10),
        "lbl": ps("lbl", fontSize=8,  fontName="Helvetica-Bold",   textColor=C_MUTED,  leading=11),
        "val": ps("val", fontSize=9,  fontName="Helvetica",        textColor=C_DARK,   leading=12),
        "sec": ps("sec", fontSize=11, fontName="Helvetica-Bold",   textColor=C_NAVY,   spaceBefore=14, spaceAfter=6),
        "ft":  ps("ft",  fontSize=7,  fontName="Helvetica",        textColor=C_MUTED,  alignment=TA_CENTER, leading=10),
        "tno": ps("tno", fontSize=22, fontName="Helvetica-Bold",   textColor=C_ACCENT, alignment=TA_RIGHT, leading=26),
        "tr":  ps("tr",  fontSize=8,  fontName="Helvetica",        textColor=C_DARK,   alignment=TA_RIGHT, leading=11),
        "trb": ps("trb", fontSize=8,  fontName="Helvetica-Bold",   textColor=C_DARK,   alignment=TA_RIGHT, leading=11),
        "thc": ps("thc", fontSize=9,  fontName="Helvetica-Bold",   textColor=C_WHITE,  leading=12),
        "thcr":ps("thcr",fontSize=9,  fontName="Helvetica-Bold",   textColor=C_WHITE,  alignment=TA_RIGHT, leading=12),
        "td":  ps("td",  fontSize=9,  fontName="Helvetica",        textColor=C_DARK,   leading=12),
        "tdr": ps("tdr", fontSize=9,  fontName="Helvetica",        textColor=C_DARK,   alignment=TA_RIGHT, leading=12),
        "tdb": ps("tdb", fontSize=9,  fontName="Helvetica-Bold",   textColor=C_DARK,   leading=12),
        "tdbr":ps("tdbr",fontSize=9,  fontName="Helvetica-Bold",   textColor=C_DARK,   alignment=TA_RIGHT, leading=12),
        "al":  ps("al",  fontSize=10, fontName="Helvetica-Bold",   textColor=C_ACCENT, leading=13),
        "ar":  ps("ar",  fontSize=10, fontName="Helvetica-Bold",   textColor=C_ACCENT, alignment=TA_RIGHT, leading=13),
        "wl":  ps("wl",  fontSize=10, fontName="Helvetica-Bold",   textColor=C_WHITE,  leading=13),
        "wr":  ps("wr",  fontSize=10, fontName="Helvetica-Bold",   textColor=C_WHITE,  alignment=TA_RIGHT, leading=13),
        "nt":  ps("nt",  fontSize=9,  fontName="Helvetica",        textColor=C_DARK,   leading=14),
        "hdr": ps("hdr", fontSize=9,  fontName="Helvetica-Bold",   textColor=C_NAVY,   leading=12),
        "stat":ps("stat",fontSize=9,  fontName="Helvetica-Bold",   textColor=C_ACCENT, alignment=TA_RIGHT, leading=12),
    }

    def money(v): return f"{v:,.2f} TL"
    def P(txt, st="td"): return Paragraph(str(txt) if txt else "", S[st])

    story = []

    # ════════════════════════════════════════════
    # BAŞLIK — Logo/Firma (sol) | Teklif No (sağ)
    # Her hücre ayrı nested Table → yükseklik bağımsız, üst üste binme yok
    # ════════════════════════════════════════════
    LW = W * 0.55
    RW = W * 0.45

    # Sol: logo + firma bilgileri satır satır
    left_rows = []
    if logo_path_val and os.path.exists(logo_path_val):
        try:
            left_rows.append([RLImage(logo_path_val, width=36*mm, height=12*mm, kind="proportional")])
        except Exception:
            pass
    left_rows.append([P(company_name, "co")])
    left_rows.append([P(tagline, "tag")])
    if address:
        left_rows.append([P(address, "ct")])
    cp = []
    if phone: cp.append(f"Tel: {phone}")
    if email: cp.append(f"E: {email}")
    if tax_number: cp.append(f"VKN: {tax_number}")
    if cp:
        left_rows.append([P("  |  ".join(cp), "ct")])

    left_tbl = Table(left_rows, colWidths=[LW])
    left_tbl.setStyle(TableStyle([
        ("LEFTPADDING",  (0,0),(-1,-1), 0),
        ("RIGHTPADDING", (0,0),(-1,-1), 0),
        ("TOPPADDING",   (0,0),(-1,-1), 1),
        ("BOTTOMPADDING",(0,0),(-1,-1), 1),
        ("VALIGN",       (0,0),(-1,-1), "TOP"),
    ]))

    # Sağ: teklif başlığı + detaylar
    status_map = {"draft":"Taslak","sent":"Gonderildi","accepted":"Kabul Edildi","rejected":"Reddedildi"}
    status_tr  = status_map.get(quote.status, quote.status)

    right_rows = [
        [P("TEKLIF", "tno")],
        [P(f"No: <b>{quote.quote_number}</b>", "tr")],
        [P(f"Tarih: {str(quote.created_at)[:10]}", "tr")],
    ]
    if quote.valid_until:
        right_rows.append([P(f"Gecerlilik: {quote.valid_until}", "tr")])
    right_rows.append([P(f"Durum: <b>{status_tr}</b>", "stat")])

    right_tbl = Table(right_rows, colWidths=[RW])
    right_tbl.setStyle(TableStyle([
        ("LEFTPADDING",  (0,0),(-1,-1), 0),
        ("RIGHTPADDING", (0,0),(-1,-1), 0),
        ("TOPPADDING",   (0,0),(-1,-1), 1),
        ("BOTTOMPADDING",(0,0),(-1,-1), 1),
        ("VALIGN",       (0,0),(-1,-1), "TOP"),
    ]))

    header_tbl = Table([[left_tbl, right_tbl]], colWidths=[LW, RW])
    header_tbl.setStyle(TableStyle([
        ("VALIGN",       (0,0),(-1,-1), "TOP"),
        ("LEFTPADDING",  (0,0),(-1,-1), 0),
        ("RIGHTPADDING", (0,0),(-1,-1), 0),
        ("TOPPADDING",   (0,0),(-1,-1), 0),
        ("BOTTOMPADDING",(0,0),(-1,-1), 0),
    ]))
    story.append(header_tbl)
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=2.5, color=C_NAVY))
    story.append(Spacer(1, 12))

    # ════════════════════════════════════════════
    # BİLGİ BLOĞU — Müşteri (sol) | Parça (sağ)
    # ════════════════════════════════════════════
    HW = W * 0.5  # her yarım

    cust_rows = [
        [P("<b>Musteri Bilgileri</b>", "hdr")],
        [Table([[P("Musteri:", "lbl"), P(tr_fix(quote.customer_name or "-"), "val")]],
               colWidths=[HW*0.30, HW*0.70],
               style=[("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),0),
                      ("TOPPADDING",(0,0),(-1,-1),2),("BOTTOMPADDING",(0,0),(-1,-1),2)])],
        [Table([[P("Iletisim:", "lbl"), P(tr_fix(quote.customer_contact or "-"), "val")]],
               colWidths=[HW*0.30, HW*0.70],
               style=[("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),0),
                      ("TOPPADDING",(0,0),(-1,-1),2),("BOTTOMPADDING",(0,0),(-1,-1),2)])],
    ]
    part_rows = [
        [P("<b>Parca Bilgileri</b>", "hdr")],
        [Table([[P("Parca:", "lbl"), P(part_name, "val")]],
               colWidths=[HW*0.25, HW*0.75],
               style=[("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),0),
                      ("TOPPADDING",(0,0),(-1,-1),2),("BOTTOMPADDING",(0,0),(-1,-1),2)])],
        [Table([[P("Adet:", "lbl"), P(str(quote.quantity), "val")]],
               colWidths=[HW*0.25, HW*0.75],
               style=[("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),0),
                      ("TOPPADDING",(0,0),(-1,-1),2),("BOTTOMPADDING",(0,0),(-1,-1),2)])],
    ]

    def info_cell_tbl(rows, w):
        t = Table(rows, colWidths=[w])
        t.setStyle(TableStyle([
            ("BACKGROUND",   (0,0),(-1,-1), C_LBLUE),
            ("LEFTPADDING",  (0,0),(-1,-1), 8),
            ("RIGHTPADDING", (0,0),(-1,-1), 8),
            ("TOPPADDING",   (0,0),(-1,-1), 5),
            ("BOTTOMPADDING",(0,0),(-1,-1), 5),
            ("LINEBELOW",    (0,0),(-1,-2), 0.3, C_SEP),
        ]))
        return t

    info_outer = Table(
        [[info_cell_tbl(cust_rows, HW - 4), info_cell_tbl(part_rows, HW - 4)]],
        colWidths=[HW, HW]
    )
    info_outer.setStyle(TableStyle([
        ("LEFTPADDING",  (0,0),(-1,-1), 0),
        ("RIGHTPADDING", (0,0),(-1,-1), 0),
        ("TOPPADDING",   (0,0),(-1,-1), 0),
        ("BOTTOMPADDING",(0,0),(-1,-1), 0),
        ("VALIGN",       (0,0),(-1,-1), "TOP"),
        ("INNERGRID",    (0,0),(-1,-1), 0.5, C_SEP),
        ("BOX",          (0,0),(-1,-1), 0.5, C_SEP),
    ]))
    story.append(info_outer)
    story.append(Spacer(1, 14))

    # ════════════════════════════════════════════
    # OPERASYON TABLOSU
    # ════════════════════════════════════════════
    if ops:
        story.append(P("Operasyon Detaylari", "sec"))
        CW = [W*0.05, W*0.33, W*0.22, W*0.18, W*0.22]
        op_data = [[
            P("No",          "thc"),
            P("Operasyon",   "thc"),
            P("Tip / Makine","thc"),
            P("Sure (dk)",   "thcr"),
            P("Maliyet (TL)","thcr"),
        ]]
        for i, op in enumerate(ops):
            op_data.append([
                P(str(i+1),                              "td"),
                P(tr_fix(op.machine_name or "-"),        "td"),
                P(tr_fix(op.operation_type or "-"),      "td"),
                P(f"{op.cycle_time_min:.1f}",            "tdr"),
                P(f"{op.machining_cost:,.2f} TL",        "tdr"),
            ])
        op_data.append([
            P(""), P(""), P(""),
            P("TOPLAM:", "tdbr"),
            P(f"{sum(o.machining_cost for o in ops):,.2f} TL", "tdbr"),
        ])
        op_tbl = Table(op_data, colWidths=CW, repeatRows=1)
        n = len(ops)
        op_tbl.setStyle(TableStyle([
            ("BACKGROUND",     (0,0),(-1,0),  C_NAVY),
            ("ROWBACKGROUNDS", (0,1),(-1,n),   [C_WHITE if i%2==0 else C_ALT for i in range(n)]),
            ("BACKGROUND",     (0,-1),(-1,-1), C_TOTAL),
            ("BOX",            (0,0),(-1,-1),  0.5, C_SEP),
            ("INNERGRID",      (0,0),(-1,-1),  0.3, C_SEP),
            ("LEFTPADDING",    (0,0),(-1,-1),  7),
            ("RIGHTPADDING",   (0,0),(-1,-1),  7),
            ("TOPPADDING",     (0,0),(-1,-1),  6),
            ("BOTTOMPADDING",  (0,0),(-1,-1),  6),
            ("VALIGN",         (0,0),(-1,-1),  "MIDDLE"),
        ]))
        story.append(op_tbl)
        story.append(Spacer(1, 14))

    # ════════════════════════════════════════════
    # MALİYET ÖZETİ — sağa hizalı, tek tablo
    # ════════════════════════════════════════════
    story.append(P("Maliyet Ozeti", "sec"))
    ara = quote.material_cost + quote.total_machining_cost
    CL = W * 0.44   # etiket sütunu
    CR = W * 0.26   # tutar sütunu
    CO = W - CL - CR  # sol boşluk

    cost_data = [
        [P("Maliyet Kalemi","thc"),  P("Tutar","thcr")],
        [P("Hammadde Maliyeti","td"), P(money(quote.material_cost),"tdr")],
        [P("Isleme Maliyeti","td"),   P(money(quote.total_machining_cost),"tdr")],
        [P("Ara Toplam","tdb"),       P(money(ara),"tdbr")],
        [P("TOPLAM","al"),            P(money(quote.total_cost),"ar")],
        [P(f"BIRIM FIYAT (x{quote.quantity} adet)","wl"),
         P(f"{quote.unit_price:,.2f} TL / adet","wr")],
    ]
    inner_cost = Table(cost_data, colWidths=[CL, CR])
    inner_cost.setStyle(TableStyle([
        ("BACKGROUND",     (0,0),(-1,0),  C_NAVY),
        ("ROWBACKGROUNDS", (0,1),(-1,2),  [C_ALT, C_WHITE]),
        ("BACKGROUND",     (0,3),(-1,3),  C_TOTAL),
        ("BACKGROUND",     (0,4),(-1,4),  C_LBLUE),
        ("BACKGROUND",     (0,5),(-1,5),  C_ACCENT),
        ("BOX",            (0,0),(-1,-1), 0.5, C_SEP),
        ("INNERGRID",      (0,0),(-1,-1), 0.3, C_SEP),
        ("LINEABOVE",      (0,3),(-1,3),  1.5, C_NAVY),
        ("LEFTPADDING",    (0,0),(-1,-1), 9),
        ("RIGHTPADDING",   (0,0),(-1,-1), 9),
        ("TOPPADDING",     (0,0),(-1,-1), 8),
        ("BOTTOMPADDING",  (0,0),(-1,-1), 8),
        ("VALIGN",         (0,0),(-1,-1), "MIDDLE"),
    ]))

    # Sağa yaslamak için boşluk + tablo wrapper
    cost_wrap = Table([[Paragraph(""), inner_cost]], colWidths=[CO, CL+CR])
    cost_wrap.setStyle(TableStyle([
        ("LEFTPADDING",  (0,0),(-1,-1), 0),
        ("RIGHTPADDING", (0,0),(-1,-1), 0),
        ("TOPPADDING",   (0,0),(-1,-1), 0),
        ("BOTTOMPADDING",(0,0),(-1,-1), 0),
        ("VALIGN",       (0,0),(-1,-1), "TOP"),
    ]))
    story.append(cost_wrap)

    # ════════════════════════════════════════════
    # NOTLAR
    # ════════════════════════════════════════════
    if quote.notes:
        story.append(Spacer(1, 14))
        story.append(P("Notlar", "sec"))
        nt = Table([[P(tr_fix(quote.notes), "nt")]], colWidths=[W])
        nt.setStyle(TableStyle([
            ("BACKGROUND", (0,0),(-1,-1), C_LBLUE),
            ("BOX",        (0,0),(-1,-1), 0.5, C_SEP),
            ("LEFTPADDING", (0,0),(-1,-1), 10),
            ("RIGHTPADDING",(0,0),(-1,-1), 10),
            ("TOPPADDING",  (0,0),(-1,-1), 8),
            ("BOTTOMPADDING",(0,0),(-1,-1),8),
        ]))
        story.append(nt)

    # ════════════════════════════════════════════
    # ALT BİLGİ
    # ════════════════════════════════════════════
    story.append(Spacer(1, 24))
    story.append(HRFlowable(width="100%", thickness=0.5, color=C_SEP))
    story.append(Spacer(1, 5))
    ft = company_name
    if phone: ft += f"  |  {phone}"
    if email: ft += f"  |  {email}"
    story.append(Paragraph(ft, S["ft"]))
    story.append(Paragraph(f"Bu belge {app_name} ile olusturulmustur.", S["ft"]))

    doc.build(story)
    return FileResponse(
        tmp.name,
        media_type="application/pdf",
        filename=f"Teklif_{quote.quote_number}.pdf",
        background=None
    )
