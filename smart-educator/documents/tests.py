from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import Document


class DocumentTests(TestCase):
    def test_document_is_created_for_upload(self):
        user = get_user_model().objects.create_user(username='docuser', password='secret123')
        document = Document.objects.create(
            user=user,
            display_name='sample.txt',
            filename='sample.txt',
            file_type='txt',
            file_size=10,
            file_hash='abc123',
            storage_path='uploads/sample.txt',
            source='UPLOAD',
            status='PROCESSED',
        )

        self.assertEqual(document.user, user)
        self.assertEqual(document.status, 'PROCESSED')
