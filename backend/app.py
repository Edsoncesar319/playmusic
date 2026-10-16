from __future__ import annotations

import hashlib
import hmac
import os
import re
import secrets
import sqlite3
import time
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from collections.abc import Iterator
from typing import Annotated, Optional
from urllib.parse import urlsplit

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel


ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.environ.get("MUSICKERA_DATA_DIR", ROOT_DIR / "data")).resolve()
UPLOAD_DIR = DATA_DIR / "uploads"
DATABASE_PATH = DATA_DIR / "musickera.sqlite3"
COOKIE_NAME = "__Host-musickera_session"
SESSION_MAX_AGE = 7 * 24 * 60 * 60
PASSWORD_BYTES_MAX = 128
AUDIO_MAX_BYTES = 100 * 1024 * 1024
IMAGE_MAX_BYTES = 10 * 1024 * 1024
AUDIO_TYPES = {
    "audio/aac", "audio/flac", "audio/mp4", "audio/mpeg", "audio/ogg",
    "audio/wav", "audio/webm", "audio/x-flac", "audio/x-wav",
    "application/octet-stream",
}
IMAGE_TYPES = {"image/gif", "image/jpeg", "image/png", "image/webp"}
AUDIO_EXTENSIONS = {".aac", ".flac", ".m4a", ".mp3", ".mp4", ".oga", ".ogg", ".wav", ".webm"}
IMAGE_EXTENSIONS = {".gif", ".jpeg", ".jpg", ".png", ".webp"}
UPLOAD_PATH_PATTERN = re.compile(
    r"^(music|covers)/([0-9a-f-]{36})/([\w .-]{1,180})$",
    re.IGNORECASE,
)
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
DUMMY_PASSWORD_HASH = "scrypt$MDEyMzQ1Njc4OWFiY2RlZg$" + "A" * 86

app = FastAPI(title="Musickera API", version="1.0.0")


def connect_db() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


@contextmanager
def database() -> Iterator[sqlite3.Connection]:
    connection = connect_db()
    try:
        yield connection
        connection.commit()
    except BaseException:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    with database() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                display_name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS user_sessions (
                token_hash TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at INTEGER NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx
                ON user_sessions(user_id);
            CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx
                ON user_sessions(expires_at);
            CREATE TABLE IF NOT EXISTS uploads (
                id TEXT PRIMARY KEY,
                track_id TEXT NOT NULL,
                kind TEXT NOT NULL CHECK (kind IN ('music', 'covers')),
                file_name TEXT NOT NULL,
                stored_name TEXT NOT NULL UNIQUE,
                content_type TEXT NOT NULL,
                uploaded_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS uploads_track_id_idx
                ON uploads(track_id, kind, uploaded_at);
            """
        )


initialize_database()
app.mount("/media", StaticFiles(directory=UPLOAD_DIR), name="media")


@app.exception_handler(HTTPException)
async def api_http_exception_handler(
    request: Request, exception: HTTPException
) -> JSONResponse:
    del request
    return JSONResponse(
        status_code=exception.status_code,
        content={"error": exception.detail},
        headers=exception.headers,
    )


@app.exception_handler(RequestValidationError)
async def request_validation_exception_handler(
    request: Request, exception: RequestValidationError
) -> JSONResponse:
    del request, exception
    return JSONResponse(
        status_code=422,
        content={"error": "Corpo da solicitação inválido."},
    )


class AccountInput(BaseModel):
    email: str
    password: str


class RegistrationInput(AccountInput):
    displayName: str


class ProfileInput(BaseModel):
    displayName: Optional[str] = None
    email: Optional[str] = None
    currentPassword: Optional[str] = None
    newPassword: Optional[str] = None


class MusicUpdateInput(BaseModel):
    title: str
    artist: str
    album: str


def normalize_email(value: str) -> Optional[str]:
    email = value.strip().lower()
    if len(email) > 254 or not EMAIL_PATTERN.fullmatch(email):
        return None
    return email


def valid_display_name(value: str) -> bool:
    return 1 <= len(value.strip()) <= 80


def valid_password(value: str) -> bool:
    return len(value) >= 12 and len(value.encode("utf-8")) <= PASSWORD_BYTES_MAX


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    derived_key = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=16384, r=8, p=1, dklen=64)
    return f"scrypt${_encode_base64url(salt)}${_encode_base64url(derived_key)}"


def _encode_base64url(value: bytes) -> str:
    import base64

    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def verify_password(password: str, encoded_hash: str) -> bool:
    try:
        import base64

        algorithm, salt_text, key_text = encoded_hash.split("$")
        if algorithm != "scrypt":
            return False
        salt = base64.urlsafe_b64decode(salt_text + "=" * (-len(salt_text) % 4))
        expected = base64.urlsafe_b64decode(key_text + "=" * (-len(key_text) % 4))
        if len(salt) != 16 or len(expected) != 64:
            return False
        candidate = hashlib.scrypt(
            password.encode("utf-8"), salt=salt, n=16384, r=8, p=1, dklen=64
        )
        return hmac.compare_digest(candidate, expected)
    except (ValueError, TypeError):
        return False


def public_user(row: sqlite3.Row) -> dict[str, str]:
    return {
        "id": row["id"],
        "email": row["email"],
        "displayName": row["display_name"],
        "createdAt": row["created_at"],
    }


def require_same_origin(request: Request) -> None:
    origin = request.headers.get("origin")
    host = request.headers.get("host")
    if not origin or not host:
        raise HTTPException(status_code=403, detail="Origem da solicitação não permitida.")

    try:
        parsed_origin = urlsplit(origin)
        parsed_host = urlsplit(f"{request.url.scheme}://{host}")
        origin_port = parsed_origin.port or (443 if parsed_origin.scheme == "https" else 80)
        host_port = parsed_host.port or (443 if parsed_host.scheme == "https" else 80)
        same_origin = (
            parsed_origin.scheme in {"http", "https"}
            and parsed_origin.hostname is not None
            and parsed_origin.hostname.lower() == (parsed_host.hostname or "").lower()
            and origin_port == host_port
        )
    except ValueError:
        same_origin = False
    if not same_origin:
        raise HTTPException(status_code=403, detail="Origem da solicitação não permitida.")


def current_user(request: Request) -> Optional[sqlite3.Row]:
    token = request.cookies.get(COOKIE_NAME)
    if not token or not re.fullmatch(r"[A-Za-z0-9_-]{43}", token):
        return None
    token_hash = hashlib.sha256(token.encode("ascii")).hexdigest()
    with database() as connection:
        return connection.execute(
            """
            SELECT users.id, users.email, users.display_name, users.password_hash,
                   users.created_at
            FROM user_sessions
            JOIN users ON users.id = user_sessions.user_id
            WHERE user_sessions.token_hash = ? AND user_sessions.expires_at > ?
            LIMIT 1
            """,
            (token_hash, int(time.time())),
        ).fetchone()


def require_user(request: Request) -> sqlite3.Row:
    user = current_user(request)
    if user is None:
        raise HTTPException(status_code=401, detail="Autenticação necessária.")
    return user


def create_session(user_id: str, response: JSONResponse) -> None:
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("ascii")).hexdigest()
    now = datetime.now(timezone.utc).isoformat()
    with database() as connection:
        connection.execute("DELETE FROM user_sessions WHERE expires_at <= ?", (int(time.time()),))
        connection.execute(
            "INSERT INTO user_sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
            (token_hash, user_id, int(time.time()) + SESSION_MAX_AGE, now),
        )
    response.set_cookie(
        COOKIE_NAME,
        token,
        max_age=SESSION_MAX_AGE,
        path="/",
        secure=True,
        httponly=True,
        samesite="lax",
    )


def clear_session(request: Request, response: JSONResponse) -> None:
    token = request.cookies.get(COOKIE_NAME)
    if token and re.fullmatch(r"[A-Za-z0-9_-]{43}", token):
        token_hash = hashlib.sha256(token.encode("ascii")).hexdigest()
        with database() as connection:
            connection.execute("DELETE FROM user_sessions WHERE token_hash = ?", (token_hash,))
    response.delete_cookie(COOKIE_NAME, path="/", secure=True, httponly=True, samesite="lax")


def user_response(user: dict[str, str], status_code: int = 200) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"user": user}, headers={"Cache-Control": "no-store"})


def parse_track_name(file_name: str) -> dict[str, str]:
    name = re.sub(r"\.[^.]+$", "", file_name)
    metadata = name.split(" -- ")
    if len(metadata) >= 3:
        return {
            "artist": metadata[0],
            "album": metadata[1],
            "title": " -- ".join(metadata[2:]),
        }

    title_and_artist = name.split(" - ")
    if len(title_and_artist) > 1:
        return {
            "title": " - ".join(title_and_artist[1:]),
            "artist": title_and_artist[0],
            "album": "Álbum desconhecido",
        }
    return {
        "title": name,
        "artist": "Artista desconhecido",
        "album": "Álbum desconhecido",
    }


def valid_music_metadata(title: str, artist: str, album: str) -> bool:
    values = (title.strip(), artist.strip(), album.strip())
    file_name = " -- ".join(values) + ".mp3"
    return (
        all(1 <= len(value) <= 80 and " -- " not in value for value in values)
        and len(file_name) <= 180
    )


@app.get("/", include_in_schema=False)
async def home() -> FileResponse:
    return FileResponse(ROOT_DIR / "index.html")


@app.get("/login", include_in_schema=False)
@app.get("/login.html", include_in_schema=False)
async def login_page() -> FileResponse:
    return FileResponse(ROOT_DIR / "login.html")


@app.get("/favicon.ico", include_in_schema=False)
async def favicon() -> FileResponse:
    return FileResponse(ROOT_DIR / "favicon.ico")


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "storage": "local"}


@app.post("/api/auth/register")
async def register(
    request: Request, payload: RegistrationInput
) -> JSONResponse:
    require_same_origin(request)
    email = normalize_email(payload.email)
    display_name = payload.displayName.strip()
    if not email or not valid_display_name(display_name) or not valid_password(payload.password):
        raise HTTPException(
            status_code=400,
            detail="Informe um nome, um e-mail válido e uma senha de 12 a 128 bytes.",
        )

    now = datetime.now(timezone.utc).isoformat()
    user_id = str(uuid.uuid4())
    try:
        with database() as connection:
            connection.execute(
                """
                INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (user_id, email, display_name, hash_password(payload.password), now, now),
            )
            user = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    except sqlite3.IntegrityError as error:
        if "users.email" in str(error):
            raise HTTPException(
                status_code=409, detail="Já existe uma conta com esse e-mail."
            ) from error
        raise

    response = user_response(public_user(user), status_code=201)
    create_session(user_id, response)
    return response


@app.post("/api/auth/login")
async def login(request: Request, payload: AccountInput) -> JSONResponse:
    require_same_origin(request)
    email = normalize_email(payload.email)
    if not email or len(payload.password.encode("utf-8")) > PASSWORD_BYTES_MAX:
        raise HTTPException(status_code=400, detail="E-mail ou senha inválidos.")

    with database() as connection:
        account = connection.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    password_hash = account["password_hash"] if account else DUMMY_PASSWORD_HASH
    valid = verify_password(payload.password, password_hash)
    if account is None or not valid:
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos.")

    response = user_response(public_user(account))
    create_session(account["id"], response)
    return response


@app.get("/api/auth/me")
async def get_me(request: Request) -> JSONResponse:
    return user_response(public_user(require_user(request)))


@app.patch("/api/auth/me")
async def update_me(request: Request, payload: ProfileInput) -> JSONResponse:
    user = require_user(request)
    require_same_origin(request)
    display_name = user["display_name"] if payload.displayName is None else payload.displayName.strip()
    email = user["email"] if payload.email is None else normalize_email(payload.email)
    password_changed = bool(payload.newPassword)
    email_changed = email != user["email"]

    if not valid_display_name(display_name) or not email:
        raise HTTPException(status_code=400, detail="Informe um nome e um e-mail válidos.")
    if (email_changed or password_changed) and (
        not payload.currentPassword
        or not verify_password(payload.currentPassword, user["password_hash"])
    ):
        raise HTTPException(status_code=403, detail="A senha atual está incorreta.")
    if password_changed and not valid_password(payload.newPassword or ""):
        raise HTTPException(status_code=400, detail="A nova senha deve ter de 12 a 128 bytes.")

    now = datetime.now(timezone.utc).isoformat()
    password_hash = hash_password(payload.newPassword) if password_changed else user["password_hash"]
    try:
        with database() as connection:
            connection.execute(
                """
                UPDATE users SET display_name = ?, email = ?, password_hash = ?, updated_at = ?
                WHERE id = ?
                """,
                (display_name, email, password_hash, now, user["id"]),
            )
            if password_changed:
                current_token = request.cookies.get(COOKIE_NAME, "")
                current_hash = hashlib.sha256(current_token.encode("ascii")).hexdigest()
                connection.execute(
                    "DELETE FROM user_sessions WHERE user_id = ? AND token_hash <> ?",
                    (user["id"], current_hash),
                )
            updated = connection.execute(
                "SELECT * FROM users WHERE id = ?", (user["id"],)
            ).fetchone()
    except sqlite3.IntegrityError as error:
        if "users.email" in str(error):
            raise HTTPException(
                status_code=409, detail="Já existe uma conta com esse e-mail."
            ) from error
        raise
    return user_response(public_user(updated))


@app.delete("/api/auth/me")
async def delete_me(request: Request) -> JSONResponse:
    user = require_user(request)
    require_same_origin(request)
    with database() as connection:
        connection.execute("DELETE FROM users WHERE id = ?", (user["id"],))
    response = JSONResponse(content={"success": True}, headers={"Cache-Control": "no-store"})
    clear_session(request, response)
    return response


@app.post("/api/auth/logout")
async def logout(request: Request) -> JSONResponse:
    require_same_origin(request)
    response = JSONResponse(content={"success": True}, headers={"Cache-Control": "no-store"})
    clear_session(request, response)
    return response


@app.get("/api/music")
async def list_music(request: Request) -> JSONResponse:
    require_user(request)
    with database() as connection:
        rows = connection.execute(
            """
            SELECT id, track_id, kind, file_name, stored_name, content_type, uploaded_at
            FROM uploads
            ORDER BY uploaded_at DESC
            """
        ).fetchall()

    covers: dict[str, str] = {}
    music_rows: list[sqlite3.Row] = []
    for row in rows:
        if row["kind"] == "covers":
            covers.setdefault(row["track_id"], f"/media/{row['stored_name']}")
        else:
            music_rows.append(row)

    music = []
    for row in music_rows:
        track_id = row["track_id"]
        music.append(
            {
                **parse_track_name(row["file_name"]),
                "id": track_id,
                "blobId": track_id,
                "fileName": row["file_name"],
                "duration": "0:00",
                "cover": covers.get(track_id, ""),
                "file": f"/media/{row['stored_name']}",
            }
        )
    music.sort(key=lambda track: track["fileName"].casefold())
    return JSONResponse(
        content={"music": music},
        headers={"Cache-Control": "no-store"},
    )


@app.patch("/api/music/{track_id}")
async def update_music(
    request: Request, track_id: str, payload: MusicUpdateInput
) -> JSONResponse:
    require_user(request)
    require_same_origin(request)
    if not re.fullmatch(r"[0-9a-f-]{36}", track_id, re.IGNORECASE):
        raise HTTPException(status_code=404, detail="Música não encontrada.")
    if not valid_music_metadata(payload.title, payload.artist, payload.album):
        raise HTTPException(status_code=400, detail="Informe título, artista e álbum válidos.")

    with database() as connection:
        row = connection.execute(
            "SELECT file_name FROM uploads WHERE track_id = ? AND kind = 'music'",
            (track_id.lower(),),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Música não encontrada.")
        extension = Path(row["file_name"]).suffix.lower()
        file_name = (
            f"{payload.artist.strip()} -- {payload.album.strip()} -- "
            f"{payload.title.strip()}{extension}"
        )
        if len(file_name) > 180:
            raise HTTPException(status_code=400, detail="Os dados da música são muito longos.")
        connection.execute(
            "UPDATE uploads SET file_name = ? WHERE track_id = ? AND kind = 'music'",
            (file_name, track_id.lower()),
        )

    return JSONResponse(
        content={"success": True},
        headers={"Cache-Control": "no-store"},
    )


@app.delete("/api/music/{track_id}")
async def delete_music(request: Request, track_id: str) -> JSONResponse:
    require_user(request)
    require_same_origin(request)
    if not re.fullmatch(r"[0-9a-f-]{36}", track_id, re.IGNORECASE):
        raise HTTPException(status_code=404, detail="Música não encontrada.")

    with database() as connection:
        rows = connection.execute(
            "SELECT stored_name FROM uploads WHERE track_id = ?",
            (track_id.lower(),),
        ).fetchall()
        if not any(row["stored_name"] for row in rows):
            raise HTTPException(status_code=404, detail="Música não encontrada.")
        connection.execute("DELETE FROM uploads WHERE track_id = ?", (track_id.lower(),))

    for row in rows:
        (UPLOAD_DIR / row["stored_name"]).unlink(missing_ok=True)
    return JSONResponse(
        content={"success": True},
        headers={"Cache-Control": "no-store"},
    )


@app.post("/api/upload")
async def upload(
    request: Request,
    pathname: Annotated[str, Form()],
    file: Annotated[UploadFile, File()],
) -> JSONResponse:
    require_same_origin(request)
    require_user(request)
    match = UPLOAD_PATH_PATTERN.fullmatch(pathname)
    if not match:
        raise HTTPException(status_code=400, detail="Caminho de upload inválido.")

    kind, track_id, file_name = match.groups()
    track_id = track_id.lower()
    extension = Path(file_name).suffix.lower()
    content_type = (file.content_type or "").lower()
    is_cover = kind == "covers"
    allowed_extensions = IMAGE_EXTENSIONS if is_cover else AUDIO_EXTENSIONS
    allowed_types = IMAGE_TYPES if is_cover else AUDIO_TYPES
    maximum_size = IMAGE_MAX_BYTES if is_cover else AUDIO_MAX_BYTES
    if extension not in allowed_extensions or content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Formato de arquivo não permitido.")

    stored_name = f"{uuid.uuid4().hex}{extension}"
    target_path = UPLOAD_DIR / stored_name
    size = 0
    try:
        with target_path.open("wb") as destination:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > maximum_size:
                    raise HTTPException(status_code=413, detail="O arquivo excede o limite permitido.")
                destination.write(chunk)
        if size == 0:
            raise HTTPException(status_code=400, detail="O arquivo está vazio.")
        now = datetime.now(timezone.utc).isoformat()
        with database() as connection:
            if is_cover:
                existing_music = connection.execute(
                    "SELECT 1 FROM uploads WHERE track_id = ? AND kind = 'music' LIMIT 1",
                    (track_id,),
                ).fetchone()
                if existing_music is None:
                    raise HTTPException(status_code=400, detail="A música correspondente não existe.")
            else:
                existing_music = connection.execute(
                    "SELECT 1 FROM uploads WHERE track_id = ? AND kind = 'music' LIMIT 1",
                    (track_id,),
                ).fetchone()
                if existing_music is not None:
                    raise HTTPException(status_code=409, detail="Esta música já foi enviada.")
            connection.execute(
                """
                INSERT INTO uploads
                    (id, track_id, kind, file_name, stored_name, content_type, uploaded_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (str(uuid.uuid4()), track_id, kind, file_name, stored_name, content_type, now),
            )
    except Exception:
        target_path.unlink(missing_ok=True)
        raise
    finally:
        await file.close()

    return JSONResponse(
        content={"url": f"/media/{stored_name}"},
        headers={"Cache-Control": "no-store"},
    )
