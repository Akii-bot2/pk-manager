from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app.database import init_db
from app.routers import members, seasons, city, trainer, cl, ranking
from app.auth import verify_admin

app = FastAPI(title="ポケカコミュニティ管理システム")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AdminLoginBody(BaseModel):
    admin_password: str


@app.post("/api/admin/login")
def admin_login(body: AdminLoginBody):
    from fastapi import HTTPException
    if not verify_admin(body.admin_password):
        raise HTTPException(status_code=403, detail="パスワードが違います")
    return {"ok": True}


@app.on_event("startup")
async def startup():
    init_db()


app.include_router(members.router)
app.include_router(seasons.router)
app.include_router(city.router)
app.include_router(trainer.router)
app.include_router(cl.router)
app.include_router(ranking.router)

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def health_check():
    return {"message": "ポケカ管理システム起動中"}
