import os
import sys
from dotenv import load_dotenv

load_dotenv()

_ADMIN_PASSWORD: str = os.environ.get("ADMIN_PASSWORD", "")

if not _ADMIN_PASSWORD:
    print("ERROR: 環境変数 ADMIN_PASSWORD が設定されていません。.env ファイルを作成して設定してください。", file=sys.stderr)
    sys.exit(1)


def verify_admin(password: str) -> bool:
    return password == _ADMIN_PASSWORD
