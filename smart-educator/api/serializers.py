from rest_framework import serializers
from django.contrib.auth import get_user_model
from accounts.models import UserProfile
from documents.models import Document, DocumentChunk
from chat.models import ChatSession, Message

User = get_user_model()


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            'google_id', 'profile_picture', 'drive_connected',
            'drive_sync_enabled', 'theme', 'temperature', 'max_tokens', 'default_mode'
        ]


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile']


class DocumentChunkSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentChunk
        fields = ['id', 'chunk_index', 'content', 'vector_id', 'page_number', 'created_at']


class DocumentSerializer(serializers.ModelSerializer):
    chunks_count = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id', 'display_name', 'filename', 'file_type', 'file_size',
            'file_hash', 'source', 'status', 'description', 'tags',
            'page_count', 'embedding_model', 'uploaded_at', 'last_modified',
            'last_synced', 'chunks_count'
        ]

    def get_chunks_count(self, obj):
        return obj.chunks.count()


class DocumentDetailSerializer(DocumentSerializer):
    chunks = DocumentChunkSerializer(many=True, read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta(DocumentSerializer.Meta):
        fields = DocumentSerializer.Meta.fields + ['chunks', 'file_url']

    def get_file_url(self, obj):
        if obj.storage_path:
            return f"/media/{obj.storage_path}"
        return None


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['id', 'role', 'content', 'citations', 'created_at']


class ChatSessionSerializer(serializers.ModelSerializer):
    message_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = ChatSession
        fields = ['id', 'title', 'is_pinned', 'is_archived', 'created_at', 'updated_at', 'message_count', 'last_message']

    def get_message_count(self, obj):
        return obj.messages.count()

    def get_last_message(self, obj):
        last = obj.messages.order_by('-created_at').first()
        return MessageSerializer(last).data if last else None


class ChatSessionDetailSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)

    class Meta:
        model = ChatSession
        fields = ['id', 'title', 'is_pinned', 'is_archived', 'created_at', 'updated_at', 'messages']
