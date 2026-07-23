from django.urls import path

from .views import delete_document_view, document_detail_view, document_list_view, sync_google_drive_view, upload_document_view

urlpatterns = [
    path('', document_list_view, name='document_list'),
    path('upload/', upload_document_view, name='document_upload'),
    path('delete/<int:document_id>/', delete_document_view, name='document_delete'),
    path('detail/<int:document_id>/', document_detail_view, name='document_detail'),
    path('sync-drive/', sync_google_drive_view, name='sync_drive'),
]
