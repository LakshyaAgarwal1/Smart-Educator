from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from PIL import Image

from .models import UserProfile


class UserProfileTests(TestCase):
    def test_profile_is_created_for_new_user(self):
        user = get_user_model().objects.create_user(
            username='alice',
            email='alice@example.com',
            password='secret123',
        )

        self.assertTrue(UserProfile.objects.filter(user=user).exists())
        self.assertEqual(user.profile.user, user)

    def test_login_page_is_available(self):
        response = self.client.get(reverse('account_profile'))
        self.assertEqual(response.status_code, 302)

    def test_profile_picture_upload_saves_file(self):
        user = get_user_model().objects.create_user(
            username='bob',
            email='bob@example.com',
            password='secret123',
        )

        image = Image.new('RGB', (100, 100), color='blue')
        image_file = BytesIO()
        image.save(image_file, format='JPEG')
        image_file.seek(0)

        uploaded_file = SimpleUploadedFile(
            'avatar.jpg',
            image_file.read(),
            content_type='image/jpeg',
        )

        profile = user.profile
        profile.profile_picture = uploaded_file
        profile.save()

        self.assertTrue(profile.profile_picture.name.startswith('profile_pics/'))
        self.assertTrue(profile.profile_picture.storage.exists(profile.profile_picture.name))

    def test_profile_picture_upload_rejects_non_image(self):
        user = get_user_model().objects.create_user(
            username='carol',
            email='carol@example.com',
            password='secret123',
        )

        uploaded_file = SimpleUploadedFile(
            'not-an-image.txt',
            b'not really an image',
            content_type='text/plain',
        )

        self.client.force_login(user)
        response = self.client.post(reverse('account_profile'), {'profile_picture': uploaded_file})

        self.assertEqual(response.status_code, 200)
        profile = user.profile
        self.assertFalse(profile.profile_picture)

    def test_profile_page_shows_default_avatar_when_none_uploaded(self):
        user = get_user_model().objects.create_user(
            username='dave',
            email='dave@example.com',
            password='secret123',
        )

        self.client.force_login(user)
        response = self.client.get(reverse('account_profile'))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, '/static/default-avatar.svg')
