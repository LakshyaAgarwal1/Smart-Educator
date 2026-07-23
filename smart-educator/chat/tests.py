from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import ChatSession, Message
from .services.chat_service import ChatService


class ChatServiceTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username='tester', password='secret123')

    def test_create_chat_and_save_messages(self):
        chat = ChatService.create_chat(self.user, title='New Chat')
        ChatService.save_message(chat, 'USER', 'Explain Newton\'s laws')
        ChatService.save_message(chat, 'ASSISTANT', 'Newton\'s laws describe motion and force.')

        self.assertEqual(ChatSession.objects.count(), 1)
        self.assertEqual(Message.objects.count(), 2)
        self.assertEqual(chat.title, 'New Chat')

    def test_delete_chat_removes_messages(self):
        chat = ChatService.create_chat(self.user)
        ChatService.save_message(chat, 'USER', 'Hello')

        ChatService.delete_chat(chat)

        self.assertEqual(ChatSession.objects.count(), 0)
        self.assertEqual(Message.objects.count(), 0)
