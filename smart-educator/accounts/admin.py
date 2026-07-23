from django.contrib import admin

from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'google_id', 'drive_connected', 'drive_sync_enabled', 'created_at')
    search_fields = ('user__username', 'user__email', 'google_id')
