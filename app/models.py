from sqlalchemy import Column, Integer, Text, UniqueConstraint, ForeignKey
from app.database import Base


class Member(Base):
    __tablename__ = "members"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(Text, nullable=False, unique=True)
    created_at = Column(Text, nullable=False)  # ISO8601
    has_wcs_right = Column(Integer, default=0)   # WCS出場権フラグ
    has_jcs_right = Column(Integer, default=0)   # JCS優先出場権フラグ
    has_cl_right  = Column(Integer, default=0)   # 次回CL優先出場権フラグ


class Season(Base):
    __tablename__ = "seasons"

    id = Column(Integer, primary_key=True, autoincrement=True)
    year = Column(Integer, nullable=False)
    season_number = Column(Integer, nullable=False)  # 1〜4
    name = Column(Text, nullable=False)              # 例：2026 S2


class CityEntry(Base):
    __tablename__ = "city_entries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    member_id = Column(Integer, ForeignKey("members.id"), nullable=False)
    season_id = Column(Integer, ForeignKey("seasons.id"), nullable=False)
    is_absent = Column(Integer, default=0)           # 1=不参加
    date = Column(Text, nullable=True)               # YYYY-MM-DD
    venue = Column(Text, nullable=True)
    rank = Column(Integer, nullable=True)
    participants_count = Column(Integer, nullable=True)
    deck_code = Column(Text, nullable=True)
    csp_earned = Column(Integer, nullable=True)
    updated_at = Column(Text, nullable=False)        # ISO8601

    __table_args__ = (
        UniqueConstraint("member_id", "season_id", name="uq_city_member_season"),
    )


class TrainerEntry(Base):
    __tablename__ = "trainer_entries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    member_id = Column(Integer, ForeignKey("members.id"), nullable=False)
    rank = Column(Integer, nullable=False)
    participants_count = Column(Integer, nullable=False)
    csp_earned = Column(Integer, nullable=False)     # 上限考慮済み
    created_at = Column(Text, nullable=False)        # ISO8601


class CLEntry(Base):
    __tablename__ = "cl_entries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    member_id = Column(Integer, ForeignKey("members.id"), nullable=False)
    cl_name = Column(Text, nullable=False)           # 例：CL横浜2026
    league = Column(Text, nullable=False)            # master / senior / junior / open
    rank = Column(Integer, nullable=True)
    wins = Column(Integer, nullable=True)
    losses = Column(Integer, nullable=True)
    deck_code = Column(Text, nullable=True)
    created_at = Column(Text, nullable=False)        # ISO8601
