import io
import os

import requests
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

from ..google_auth.token_manager import GoogleTokenManager
from ..utils.retry import retry_on_error
from ..utils.validators import ensure_env
from .exceptions import GoogleDriveError


class GoogleDriveClient:
    def __init__(self, user=None):
        self.user = user
        self.service = None
        if user is not None:
            self._build_service(user)

    def _build_service(self, user):
        token = GoogleTokenManager.get_token_for_user(user)
        if not token:
            raise GoogleDriveError('No Google access token available for this user.')
        self.service = build('drive', 'v3', credentials=None)
        self.service._http.headers['Authorization'] = f'Bearer {token}'

    def list_files(self, query=''):
        if self.service is None:
            raise GoogleDriveError('Drive client not initialized.')

        request = self.service.files().list(q=query, fields='files(id,name,mimeType,modifiedTime,size)')
        return retry_on_error(lambda: request.execute(), retries=2)

    def download_file(self, file_id, mime_type=None):
        if self.service is None:
            raise GoogleDriveError('Drive client not initialized.')

        request = self.service.files().get_media(fileId=file_id)
        file_buffer = io.BytesIO()
        downloader = MediaIoBaseDownload(file_buffer, request)
        done = False
        while not done:
            status, done = downloader.next_chunk()
        file_buffer.seek(0)
        return file_buffer.getvalue()
