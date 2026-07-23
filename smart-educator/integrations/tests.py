from django.test import TestCase

from .gemini.services import GeminiService
from .google_auth.services import GoogleAuthService
from .google_drive.services import GoogleDriveService
from .web_search.services import SearchService


class IntegrationServiceTests(TestCase):
    def test_google_auth_service_builds_login_url(self):
        service = GoogleAuthService()
        url = service.get_login_url()
        self.assertIn('accounts.google.com', url)
        self.assertIn('client_id=', url)

    def test_gemini_service_uses_client(self):
        class DummyClient:
            def generate(self, prompt):
                return f'answer:{prompt}'

        service = GeminiService(client=DummyClient())
        self.assertEqual(service.generate_answer('hello'), 'answer:hello')

    def test_search_service_uses_client(self):
        class DummyClient:
            def search(self, query):
                return [{'title': query}]

        service = SearchService(client=DummyClient())
        self.assertEqual(service.search('python')[0]['title'], 'python')
