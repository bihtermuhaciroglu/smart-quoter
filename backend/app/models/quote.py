from datetime import datetime, date
from sqlalchemy import String, Text, Integer, Float, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Quote(Base):
    __tablename__ = "quotes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    part_id: Mapped[int] = mapped_column(Integer, ForeignKey("parts.id"), nullable=False)
    quote_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    customer_name: Mapped[str | None] = mapped_column(String(255))
    customer_contact: Mapped[str | None] = mapped_column(String(255))
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    material_cost: Mapped[float] = mapped_column(Float, default=0.0)
    total_machining_cost: Mapped[float] = mapped_column(Float, default=0.0)
    overhead_rate: Mapped[float] = mapped_column(Float, default=0.15)
    profit_margin: Mapped[float] = mapped_column(Float, default=0.20)
    total_cost: Mapped[float] = mapped_column(Float, default=0.0)
    unit_price: Mapped[float] = mapped_column(Float, default=0.0)
    valid_until: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    part: Mapped["Part"] = relationship(back_populates="quotes")

    def calculate_and_save(self) -> None:
        base = self.material_cost + self.total_machining_cost
        with_overhead = base * (1.0 + self.overhead_rate)
        self.total_cost = with_overhead * self.quantity
        self.unit_price = with_overhead * (1.0 + self.profit_margin)