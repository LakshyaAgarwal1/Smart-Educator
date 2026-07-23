import os
from pathlib import Path

from django.conf import settings
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from documents.models import Document
from documents.services.hash_service import HashService
from documents.services.upload_service import UploadService


class SyncService:
    @staticmethod
    def get_credentials(user):
        token = getattr(user, 'google_access_token', None)
        refresh_token = getattr(user, 'google_refresh_token', None)
        if not token:
            return None
        return Credentials(
            token=token,
            refresh_token=refresh_token,
            client_id=os.getenv('GOOGLE_CLIENT_ID', ''),
            client_secret=os.getenv('GOOGLE_CLIENT_SECRET', ''),
            token_uri='https://oauth2.googleapis.com/token',
        )

    @classmethod
    def sync_google_drive(cls, user):
        credentials = cls.get_credentials(user)
        if not credentials:
            return {'status': 'not_authorized', 'message': 'Google Drive access token not found.'}

        try:
            service = build('drive', 'v3', credentials=credentials)
            results = service.files().list(
                q="mimeType != 'application/vnd.google-apps.folder'",
                pageSize=20,
                fields="files(id,name,mimeType,modifiedTime,size)"
            ).execute()
            files = results.get('files', [])
        except Exception as exc:
            return {'status': 'error', 'message': str(exc)}

        imported = []
        for item in files:
            file_name = item.get('name')
            mime_type = item.get('mimeType', '')
            if not file_name:
                continue

            file_id = item.get('id')
            if not file_id:
                continue

            response = service.files().get_media(fileId=file_id)
            content = response.execute()
            if not isinstance(content, bytes):
                content = str(content).encode('utf-8')

            user_dir = Path('uploads') / str(user.id)
            storage_dir = Path(settings.MEDIA_ROOT) / user_dir
            storage_dir.mkdir(parents=True, exist_ok=True)
            destination = storage_dir / file_name
            destination.write_bytes(content)

            file_hash = HashService.compute_sha256(destination)
            if Document.objects.filter(user=user, file_hash=file_hash).exists():
                continue

            Document.objects.create(
                user=user,
                display_name=file_name,
                filename=file_name,
                file_type=mime_type.split('/')[-1] if '/' in mime_type else mime_type,
                file_size=destination.stat().st_size,
                file_hash=file_hash,
                storage_path=str(user_dir / file_name),
                source='GOOGLE_DRIVE',
                status='PROCESSED',
            )
            imported.append(file_name)

        return {'status': 'success', 'imported_files': imported}
