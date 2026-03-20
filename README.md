# 大会管理システム

## セットアップ

```bash
pip install fastapi uvicorn sqlalchemy aiofiles python-multipart
uvicorn app.main:app --reload
# → http://localhost:8000
```

## 環境変数

| 変数名 | 内容 |
|--------|------|
| `ADMIN_PASSWORD` | 管理者パスワード |
| `DATABASE_URL` | 本番用DB接続URL（Render PostgreSQL） |
