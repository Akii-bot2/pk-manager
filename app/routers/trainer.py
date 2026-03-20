# トレーナーズリーグルーター
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import TrainerEntry
from app.auth import verify_admin
from app.utils.csp import calc_trainer_csp, TRAINER_ANNUAL_LIMIT

router = APIRouter(prefix="/api/trainer", tags=["trainer"])


class TrainerCreate(BaseModel):
    member_id: int
    rank: int
    participants_count: int


class TrainerDelete(BaseModel):
    member_id: Optional[int] = None
    admin_password: Optional[str] = None


def _to_dict(e: TrainerEntry) -> dict:
    return {
        "id": e.id,
        "member_id": e.member_id,
        "rank": e.rank,
        "participants_count": e.participants_count,
        "csp_earned": e.csp_earned,
        "created_at": e.created_at,
    }


@router.get("")
def list_trainer(
    member_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(TrainerEntry)
    if member_id is not None:
        q = q.filter(TrainerEntry.member_id == member_id)
    return [_to_dict(e) for e in q.order_by(TrainerEntry.id).all()]


@router.post("", status_code=201)
def create_trainer(body: TrainerCreate, db: Session = Depends(get_db)):
    if body.participants_count <= 1:
        raise HTTPException(status_code=400, detail="大会不成立（参加人数が1人以下です）")

    current_total = db.query(TrainerEntry).filter(
        TrainerEntry.member_id == body.member_id
    ).with_entities(TrainerEntry.csp_earned).all()
    current_total_sum = sum(row[0] for row in current_total)

    csp_earned = calc_trainer_csp(body.rank, body.participants_count, current_total_sum)

    now = datetime.now(timezone.utc).isoformat()
    entry = TrainerEntry(
        member_id=body.member_id,
        rank=body.rank,
        participants_count=body.participants_count,
        csp_earned=csp_earned,
        created_at=now,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    result = _to_dict(entry)
    if current_total_sum + csp_earned >= TRAINER_ANNUAL_LIMIT:
        result["warning"] = "年間CSP上限（30pt）に達しています"
    return result


@router.delete("/{entry_id}")
def delete_trainer(entry_id: int, body: TrainerDelete, db: Session = Depends(get_db)):
    entry = db.query(TrainerEntry).filter(TrainerEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="エントリーが見つかりません")

    is_self = body.member_id is not None and body.member_id == entry.member_id
    is_admin = body.admin_password is not None and verify_admin(body.admin_password)
    if not is_self and not is_admin:
        raise HTTPException(status_code=403, detail="本人または管理者のみ削除できます")

    db.delete(entry)
    db.commit()
    return {"message": "削除しました"}
