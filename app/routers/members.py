from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Member
from app.auth import verify_admin

router = APIRouter(prefix="/api/members", tags=["members"])


class MemberCreate(BaseModel):
    name: str


class MemberUpdate(BaseModel):
    name: str
    member_id: Optional[int] = None
    admin_password: Optional[str] = None


class MemberDelete(BaseModel):
    member_id: Optional[int] = None
    admin_password: Optional[str] = None


class RightsUpdate(BaseModel):
    admin_password: str
    has_wcs_right: Optional[int] = None
    has_jcs_right: Optional[int] = None
    has_cl_right:  Optional[int] = None


@router.get("")
def list_members(db: Session = Depends(get_db)):
    members = db.query(Member).order_by(Member.id).all()
    return [
        {
            "id": m.id,
            "name": m.name,
            "created_at": m.created_at,
            "has_wcs_right": m.has_wcs_right or 0,
            "has_jcs_right": m.has_jcs_right or 0,
            "has_cl_right":  m.has_cl_right  or 0,
        }
        for m in members
    ]


@router.post("", status_code=201)
def create_member(body: MemberCreate, db: Session = Depends(get_db)):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="名前を入力してください")

    if db.query(Member).filter(Member.name == name).first():
        raise HTTPException(status_code=400, detail="その名前はすでに登録されています")

    member = Member(name=name, created_at=datetime.now(timezone.utc).isoformat())
    db.add(member)
    db.commit()
    db.refresh(member)
    return {"id": member.id, "name": member.name, "created_at": member.created_at}


@router.put("/{member_id}")
def update_member(member_id: int, body: MemberUpdate, db: Session = Depends(get_db)):
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="メンバーが見つかりません")

    is_self = body.member_id is not None and body.member_id == member_id
    is_admin = body.admin_password is not None and verify_admin(body.admin_password)

    if not is_self and not is_admin:
        raise HTTPException(status_code=403, detail="本人または管理者のみ編集できます")

    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="名前を入力してください")

    existing = db.query(Member).filter(Member.name == name, Member.id != member_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="その名前はすでに登録されています")

    member.name = name
    db.commit()
    db.refresh(member)
    return {"id": member.id, "name": member.name, "created_at": member.created_at}


@router.patch("/{member_id}/rights")
def update_rights(member_id: int, body: RightsUpdate, db: Session = Depends(get_db)):
    if not verify_admin(body.admin_password):
        raise HTTPException(status_code=403, detail="管理者パスワードが違います")

    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="メンバーが見つかりません")

    if body.has_wcs_right is not None:
        member.has_wcs_right = body.has_wcs_right
    if body.has_jcs_right is not None:
        member.has_jcs_right = body.has_jcs_right
    if body.has_cl_right is not None:
        member.has_cl_right = body.has_cl_right

    db.commit()
    db.refresh(member)
    return {
        "id": member.id,
        "name": member.name,
        "created_at": member.created_at,
        "has_wcs_right": member.has_wcs_right or 0,
        "has_jcs_right": member.has_jcs_right or 0,
        "has_cl_right":  member.has_cl_right  or 0,
    }


@router.delete("/{member_id}")
def delete_member(member_id: int, body: MemberDelete, db: Session = Depends(get_db)):
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="メンバーが見つかりません")

    is_self = body.member_id is not None and body.member_id == member_id
    is_admin = body.admin_password is not None and verify_admin(body.admin_password)

    if not is_self and not is_admin:
        raise HTTPException(status_code=403, detail="本人または管理者のみ削除できます")

    db.delete(member)
    db.commit()
    return {"message": "削除しました"}
