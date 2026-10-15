from __future__ import annotations

import asyncio
import os
import tempfile
import unittest
from io import BytesIO

_TEST_DATA = tempfile.TemporaryDirectory(prefix="musickera-tests-")
os.environ["MUSICKERA_DATA_DIR"] = _TEST_DATA.name

from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers
from starlette.requests import Request

from backend import app as backend


def make_request(cookie: str | None = None, origin: str = "http://testserver") -> Request:
    headers = [(b"host", b"testserver"), (b"origin", origin.encode("ascii"))]
    if cookie:
        headers.append((b"cookie", cookie.encode("ascii")))
    return Request(
        {
            "type": "http",
            "http_version": "1.1",
            "method": "POST",
            "scheme": "http",
            "path": "/",
            "raw_path": b"/",
            "query_string": b"",
            "headers": headers,
            "server": ("testserver", 80),
            "client": ("testclient", 123),
        }
    )


class BackendTests(unittest.TestCase):
    def setUp(self) -> None:
        with backend.database() as connection:
            connection.execute("DELETE FROM users")
            connection.execute("DELETE FROM uploads")
        for stored_file in backend.UPLOAD_DIR.iterdir():
            stored_file.unlink()

    def test_account_registration_login_and_logout(self) -> None:
        async def run_flow() -> None:
            registration = await backend.register(
                make_request(),
                backend.RegistrationInput(
                    email=" Person@Example.com ",
                    password="correct-horse-battery",
                    displayName="Ana",
                ),
            )
            self.assertEqual(registration.status_code, 201)
            cookie = registration.headers["set-cookie"].split(";", 1)[0]
            self.assertEqual((await backend.get_me(make_request(cookie))).status_code, 200)

            login = await backend.login(
                make_request(),
                backend.AccountInput(
                    email="person@example.com",
                    password="correct-horse-battery",
                ),
            )
            self.assertEqual(login.status_code, 200)

            await backend.logout(make_request(cookie))
            with self.assertRaises(HTTPException) as error:
                await backend.get_me(make_request(cookie))
            self.assertEqual(error.exception.status_code, 401)

        asyncio.run(run_flow())

    def test_upload_is_listed_with_metadata_and_requires_login(self) -> None:
        async def run_flow() -> None:
            registration = await backend.register(
                make_request(),
                backend.RegistrationInput(
                    email="listener@example.com",
                    password="correct-horse-battery",
                    displayName="Listener",
                ),
            )
            cookie = registration.headers["set-cookie"].split(";", 1)[0]
            track_id = "123e4567-e89b-12d3-a456-426614174000"
            audio = UploadFile(
                BytesIO(b"test audio"),
                filename="Artist -- Album -- Song.mp3",
                headers=Headers({"content-type": "audio/mpeg"}),
            )

            uploaded = await backend.upload(
                make_request(cookie),
                f"music/{track_id}/Artist -- Album -- Song.mp3",
                audio,
            )
            self.assertEqual(uploaded.status_code, 200)
            listing = await backend.list_music(make_request(cookie))
            self.assertIn(b'"title":"Song"', listing.body)
            self.assertIn(b"/media/", listing.body)

            with self.assertRaises(HTTPException) as error:
                await backend.list_music(make_request())
            self.assertEqual(error.exception.status_code, 401)

        asyncio.run(run_flow())

    def test_music_can_be_updated_and_deleted(self) -> None:
        async def run_flow() -> None:
            registration = await backend.register(
                make_request(),
                backend.RegistrationInput(
                    email="music-crud@example.com",
                    password="a-long-test-password",
                    displayName="Music CRUD",
                ),
            )
            cookie = registration.headers["set-cookie"].split(";", 1)[0]
            track_id = "123e4567-e89b-12d3-a456-426614174000"
            await backend.upload(
                make_request(cookie),
                f"music/{track_id}/Artist -- Album -- Song.mp3",
                UploadFile(
                    BytesIO(b"test audio"),
                    filename="Artist -- Album -- Song.mp3",
                    headers=Headers({"content-type": "audio/mpeg"}),
                ),
            )

            await backend.update_music(
                make_request(cookie),
                track_id,
                backend.MusicUpdateInput(title="New Song", artist="New Artist", album="New Album"),
            )
            listing = await backend.list_music(make_request(cookie))
            self.assertIn(b'"title":"New Song"', listing.body)
            self.assertIn(b'"artist":"New Artist"', listing.body)
            self.assertIn(b'"album":"New Album"', listing.body)

            media_path = backend.UPLOAD_DIR / listing.body.decode().split("/media/")[1].split('"')[0]
            self.assertTrue(media_path.exists())
            await backend.delete_music(make_request(cookie), track_id)
            self.assertFalse(media_path.exists())
            self.assertIn(b'"music":[]', (await backend.list_music(make_request(cookie))).body)

        asyncio.run(run_flow())

    def test_write_requests_reject_foreign_origins(self) -> None:
        with self.assertRaises(HTTPException) as error:
            backend.require_same_origin(make_request(origin="https://attacker.example"))
        self.assertEqual(error.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
