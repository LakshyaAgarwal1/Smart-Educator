from django.conf import settings
from django.db import models


class UserProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    google_id = models.CharField(max_length=100, blank=True, null=True)
    #rofile_picture = models.URLField(blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    drive_connected = models.BooleanField(default=False)
    drive_sync_enabled = models.BooleanField(default=False)
    google_access_token = models.TextField(blank=True, null=True)
    google_refresh_token = models.TextField(blank=True, null=True)
    theme = models.CharField(max_length=20, default='light')
    temperature = models.FloatField(default=0.7)
    max_tokens = models.IntegerField(default=1024)
    default_mode = models.CharField(max_length=20, default='EXAM')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.user.get_full_name() or self.user.username


class PasswordResetCode(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='password_reset_codes')
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def is_valid(self):
        from django.utils import timezone
        from datetime import timedelta
        if self.is_used:
            return False
        return (timezone.now() - self.created_at) < timedelta(minutes=15)

    def __str__(self):
        return f"Reset code for {self.user.email}"


class OneTimeLoginToken(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='login_tokens')
    token = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        from django.utils import timezone
        from datetime import timedelta
        return (timezone.now() - self.created_at) < timedelta(minutes=5)

    def __str__(self):
        return f"Login token for {self.user.username}"

