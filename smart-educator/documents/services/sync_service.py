import os
import logging
from pathlib import Path

from django.conf import settings
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

from documents.models import Document, DocumentChunk
from documents.services.hash_service import HashService

logger = logging.getLogger(__name__)


class SyncService:
    @staticmethod
    def get_credentials(user):
        profile = getattr(user, 'profile', None)
        token = getattr(user, 'google_access_token', None) or (getattr(profile, 'google_access_token', None) if profile else None)
        refresh_token = getattr(user, 'google_refresh_token', None) or (getattr(profile, 'google_refresh_token', None) if profile else None)
        if not token:
            return None
        creds = Credentials(
            token=token,
            refresh_token=refresh_token,
            client_id=os.getenv('GOOGLE_CLIENT_ID', ''),
            client_secret=os.getenv('GOOGLE_CLIENT_SECRET', ''),
            token_uri='https://oauth2.googleapis.com/token',
        )
        if creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                if profile:
                    profile.google_access_token = creds.token
                    profile.save(update_fields=['google_access_token'])
            except Exception as e:
                logger.warning(f"Could not refresh Google credentials: {e}")
        return creds

    @classmethod
    def sync_google_drive(cls, user):
        profile = getattr(user, 'profile', None)
        credentials = cls.get_credentials(user)
        if not credentials:
            return {'status': 'not_authorized', 'message': 'Google Drive access token not found. Please connect your Google account.'}

        try:
            service = build('drive', 'v3', credentials=credentials)
            all_files = []
            page_token = None
            while True:
                results = service.files().list(
                    q="mimeType != 'application/vnd.google-apps.folder' and trashed = false",
                    pageSize=100,
                    fields="nextPageToken, files(id,name,mimeType,modifiedTime,size)",
                    pageToken=page_token
                ).execute()
                all_files.extend(results.get('files', []))
                page_token = results.get('nextPageToken')
                if not page_token or len(all_files) >= 150:
                    break
            files = all_files
            logger.info("Found %d files in user's Google Drive", len(files))
        except Exception as exc:
            logger.exception("Google Drive files list failed")
            return {'status': 'error', 'message': f'Failed to query Google Drive: {str(exc)}'}

        imported = []
        user_dir = Path('uploads') / str(user.id)
        storage_dir = Path(settings.MEDIA_ROOT) / user_dir
        storage_dir.mkdir(parents=True, exist_ok=True)

        for item in files:
            file_name = item.get('name', 'drive_document')
            mime_type = item.get('mimeType', '')
            file_id = item.get('id')
            if not file_id:
                continue

            try:
                # Handle Google Workspace docs (export as PDF)
                if mime_type == 'application/vnd.google-apps.document':
                    export_req = service.files().export_media(fileId=file_id, mimeType='application/pdf')
                    content = export_req.execute()
                    if not file_name.lower().endswith('.pdf'):
                        file_name = f"{file_name}.pdf"
                    file_ext = 'PDF'
                elif mime_type == 'application/vnd.google-apps.spreadsheet':
                    export_req = service.files().export_media(fileId=file_id, mimeType='application/pdf')
                    content = export_req.execute()
                    if not file_name.lower().endswith('.pdf'):
                        file_name = f"{file_name}.pdf"
                    file_ext = 'PDF'
                elif mime_type == 'application/vnd.google-apps.presentation':
                    export_req = service.files().export_media(fileId=file_id, mimeType='application/pdf')
                    content = export_req.execute()
                    if not file_name.lower().endswith('.pdf'):
                        file_name = f"{file_name}.pdf"
                    file_ext = 'PDF'
                else:
                    # Regular binary file download
                    response = service.files().get_media(fileId=file_id)
                    content = response.execute()
                    file_ext = Path(file_name).suffix.lstrip('.').upper() or 'PDF'

                if not isinstance(content, bytes):
                    content = str(content).encode('utf-8')

                destination = storage_dir / file_name
                destination.write_bytes(content)

                file_hash = HashService.compute_sha256(destination)
                existing_doc = Document.objects.filter(user=user, file_hash=file_hash).first()
                if existing_doc:
                    # If existing document has no chunks, extract and vectorize it immediately
                    if existing_doc.chunks.count() == 0:
                        doc = existing_doc
                        doc.status = 'PROCESSING'
                        doc.save(update_fields=['status'])
                    else:
                        continue
                else:
                    page_count = max(1, int(len(content) / (80 * 1024)))
                    doc = Document.objects.create(
                        user=user,
                        display_name=file_name,
                        filename=file_name,
                        file_type=file_ext,
                        file_size=len(content),
                        file_hash=file_hash,
                        storage_path=str(user_dir / file_name),
                        source='GOOGLE_DRIVE',
                        status='PROCESSING',
                        description=f"Synchronized from Google Drive: {file_name}",
                        tags=['drive', file_ext.lower()],
                        page_count=page_count,
                        embedding_model="Google Gemini Embedding"
                    )

                # Immediately index document into SQLite chunks and ChromaDB vectors
                try:
                    from rag.services.indexing_service import IndexingService
                    indexer = IndexingService()
                    indexer.index_document(doc, google_drive_file_id=file_id)
                    logger.info("Successfully indexed Drive document %s (id=%s)", file_name, doc.id)
                except Exception as idx_err:
                    logger.warning(f"Indexing failed for {file_name}: {idx_err}")
                    doc.status = 'FAILED'
                    doc.save(update_fields=['status'])

                imported.append(file_name)
            except Exception as dl_err:
                logger.warning(f"Failed to download/process Google Drive file {file_name} ({file_id}): {dl_err}")
                continue

        if profile:
            profile.drive_connected = True
            profile.save(update_fields=['drive_connected'])

        return {'status': 'success', 'imported_files': imported, 'total_imported': len(imported)}
