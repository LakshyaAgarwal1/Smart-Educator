from ..models import ChatSession, Message


class HistoryService:
    @staticmethod
    def get_chat(chat_id, user):
        return ChatSession.objects.filter(user=user, id=chat_id).prefetch_related('messages').first()

    @staticmethod
    def get_recent_messages(chat, limit=10):
        return list(chat.messages.all().order_by('-created_at')[:limit][::-1])

    @staticmethod
    def list_user_chats(user):
        return ChatSession.objects.filter(user=user).order_by('-updated_at')
