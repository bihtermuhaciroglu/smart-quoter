from datetime import datetime
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, CheckConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class FMEAAnalysis(Base):
    __tablename__ = "fmea_analysis"
    __table_args__ = (
        CheckConstraint("severity BETWEEN 1 AND 10", name="ck_fmea_severity"),
        CheckConstraint("occurrence BETWEEN 1 AND 10", name="ck_fmea_occurrence"),
        CheckConstraint("detection BETWEEN 1 AND 10", name="ck_fmea_detection"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    operation_id: Mapped[int] = mapped_column(Integer, ForeignKey("operations.id"), nullable=False)
    failure_mode: Mapped[str] = mapped_column(Text, nullable=False)
    effect_of_failure: Mapped[str | None] = mapped_column(Text)
    cause_of_failure: Mapped[str | None] = mapped_column(Text)
    severity: Mapped[int] = mapped_column(Integer, nullable=False)
    occurrence: Mapped[int] = mapped_column(Integer, nullable=False)
    detection: Mapped[int] = mapped_column(Integer, nullable=False)
    recommended_action: Mapped[str | None] = mapped_column(Text)
    responsible_person: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    operation: Mapped["Operation"] = relationship(back_populates="fmea_analyses")

    @property
    def rpn(self) -> int:
        return self.severity * self.occurrence * self.detection

    @property
    def risk_level(self) -> str:
        r = self.rpn
        if r >= 200: return "Kritik"
        if r >= 100: return "Yüksek"
        if r >= 50:  return "Orta"
        return "Düşük"