import os
from pathlib import Path

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render

from .forms import DocumentUploadForm
from .models import Document
from .services.sync_service import SyncService


@login_required
def document_list_view(request):
    return redirect('http://127.0.0.1:5173/')


@login_required
def upload_document_view(request):
    if request.method == 'POST':
        form = DocumentUploadForm(request.POST, request.FILES)
        if form.is_valid():
            uploaded_file = request.FILES['file']
            file_name = uploaded_file.name
            file_type = Path(file_name).suffix.lower().lstrip('.') or 'unknown'
            extension_map = {
                'pdf': 'pdf',
                'docx': 'docx',
                'txt': 'txt',
                'ppt': 'ppt',
                'pptx': 'pptx',
                'png': 'image',
                'jpg': 'image',
                'jpeg': 'image',
            }
            file_type = extension_map.get(file_type, file_type)

            user_dir = Path('uploads') / str(request.user.id)
            storage_dir = Path(settings.MEDIA_ROOT) / user_dir
            storage_dir.mkdir(parents=True, exist_ok=True)
            destination = storage_dir / uploaded_file.name
            with destination.open('wb+') as handle:
                for chunk in uploaded_file.chunks():
                    handle.write(chunk)

            file_hash = Document.calculate_hash(destination)
            existing = Document.objects.filter(user=request.user, file_hash=file_hash).exists()
            if existing:
                destination.unlink(missing_ok=True)
                return render(request, 'documents/upload.html', {'form': form, 'error': 'This file already exists.'})

            document = Document.objects.create(
                user=request.user,
                display_name=uploaded_file.name,
                filename=uploaded_file.name,
                file_type=file_type,
                file_size=uploaded_file.size,
                file_hash=file_hash,
                storage_path=str(user_dir / uploaded_file.name),
                source='UPLOAD',
                status='PROCESSED',
            )
            return redirect('document_list')
    else:
        form = DocumentUploadForm()

    return redirect('http://127.0.0.1:5173/')


@login_required
def delete_document_view(request, document_id):
    document = Document.objects.filter(user=request.user, id=document_id).first()
    if document:
        storage_path = Path(settings.MEDIA_ROOT) / document.storage_path
        if storage_path.exists():
            storage_path.unlink(missing_ok=True)
        document.delete()
    return redirect('http://127.0.0.1:5173/')


@login_required
def document_detail_view(request, document_id):
    return redirect('http://127.0.0.1:5173/')


@login_required
def sync_google_drive_view(request):
    result = SyncService.sync_google_drive(request.user)
    request.session['sync_status'] = result.get('status', 'error')
    request.session['sync_message'] = result.get('message') or result.get('imported_files', [])
    return redirect('document_list')
