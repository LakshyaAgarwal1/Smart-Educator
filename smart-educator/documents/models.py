import hashlib
from pathlib import Path

from django.conf import settings
from django.db import models


class Document(models.Model):
    STATUS_CHOICES = [
        ('UPLOADED', 'Uploaded'),
        ('PROCESSING', 'Processing'),
        ('PROCESSED', 'Processed'),
        ('FAILED', 'Failed'),
    ]

    SOURCE_CHOICES = [
        ('UPLOAD', 'Upload'),
        ('GOOGLE_DRIVE', 'Google Drive'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='documents')
    display_name = models.CharField(max_length=255)
    filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=50)
    file_size = models.PositiveIntegerField(default=0)
    file_hash = models.CharField(max_length=64, blank=True, db_index=True)
    storage_path = models.CharField(max_length=500)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='UPLOAD')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='UPLOADED')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(blank=True, null=True)
    last_synced = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.display_name

    @classmethod
    def calculate_hash(cls, file_path):
        sha256 = hashlib.sha256()
        with Path(file_path).open('rb') as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b''):
                sha256.update(chunk)
        return sha256.hexdigest()

class DocumentChunk(models.Model):
    """
    Mirrors individual text chunks in SQLite/PostgreSQL alongside ChromaDB.
    Enables exact relational lookups, audit trails, and fast source attribution.
    """
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='chunks')
    chunk_index = models.IntegerField()
    content = models.TextField()
    vector_id = models.CharField(max_length=255, unique=True, db_index=True)
    page_number = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['chunk_index']

    def __str__(self):
        return f"{self.document.display_name} - Chunk {self.chunk_index}"