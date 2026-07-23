from django.contrib import admin

from .models import ChatSession, Message


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'created_at', 'updated_at')
    list_filter = ('created_at', 'is_archived', 'is_pinned')
    search_fields = ('title', 'user__username')


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('chat_session', 'role', 'created_at')
    list_filter = ('role', 'created_at')
    search_fields = ('content', 'chat_session__title')
