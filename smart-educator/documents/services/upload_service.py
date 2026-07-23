from pathlib import Path

from django.conf import settings


class UploadService:
    def save_upload(self, uploaded_file, user):
        user_dir = Path('uploads') / str(user.id)
        storage_dir = Path(settings.MEDIA_ROOT) / user_dir
        storage_dir.mkdir(parents=True, exist_ok=True)
        destination = storage_dir / uploaded_file.name
        with destination.open('wb+') as handle:
            for chunk in uploaded_file.chunks():
                handle.write(chunk)
        return destination, str(user_dir / uploaded_file.name)
