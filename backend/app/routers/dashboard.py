from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.part import Part
from app.models.operation import Operation
from app.models.fmea import FMEAAnalysis
from app.models.quote import Quote

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    fmea_all = db.query(FMEAAnalysis).all()
    high_rpn = [f for f in fmea_all if f.rpn >= 100]
    accepted = db.query(Quote).filter(Quote.status == "accepted").all()
    recent = db.query(Quote).order_by(Quote.id.desc()).limit(5).all()
    return {
        "parts":        db.query(func.count(Part.id)).scalar(),
        "operations":   db.query(func.count(Operation.id)).scalar(),
        "quotes":       db.query(func.count(Quote.id)).scalar(),
        "fmea_entries": db.query(func.count(FMEAAnalysis.id)).scalar(),
        "high_rpn_count": len(high_rpn),
        "total_revenue": sum(q.total_cost for q in accepted),
        "recent_quotes": [{"id": q.id, "quote_number": q.quote_number, "customer_name": q.customer_name, "unit_price": q.unit_price, "status": q.status} for q in recent],
        "risk_alerts":  [{"failure_mode": f.failure_mode, "rpn": f.rpn, "risk_level": f.risk_level} for f in high_rpn[:5]],
    }
