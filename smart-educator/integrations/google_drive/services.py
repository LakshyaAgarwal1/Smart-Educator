from pathlib import Path

from django.conf import settings

from .client import GoogleDriveClient
from .exceptions import GoogleDriveError


class GoogleDriveService:
    def __init__(self, user=None):
        self.user = user
        self.client = GoogleDriveClient(user=user)

    def get_all_files(self, query=''):
        return self.client.list_files(query=query)

    def download_supported_file(self, file_id, target_path, mime_type=None):
        payload = self.client.download_file(file_id, mime_type=mime_type)
        Path(target_path).parent.mkdir(parents=True, exist_ok=True)
        Path(target_path).write_bytes(payload)
        return target_path
