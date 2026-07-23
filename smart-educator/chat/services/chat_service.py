from django.db import transaction

from ..models import ChatSession, Message


class ChatService:
    @staticmethod
    def create_chat(user, title='New Chat'):
        return ChatSession.objects.create(user=user, title=title)

    @staticmethod
    def save_message(chat, role, content, citations=None):
        return Message.objects.create(
            chat_session=chat,
            role=role,
            content=content,
            citations=citations or [],
        )

    @staticmethod
    def delete_chat(chat):
        with transaction.atomic():
            chat.delete()

    @staticmethod
    def get_chat_history(chat):
        return list(chat.messages.all().order_by('created_at'))

    @staticmethod
    def build_context(chat, limit=10):
        history = ChatService.get_chat_history(chat)
        recent_messages = history[-limit:]
        return [
            {'role': message.role.lower(), 'content': message.content}
            for message in recent_messages
        ]
