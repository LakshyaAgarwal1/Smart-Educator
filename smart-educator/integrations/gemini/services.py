from .client import GeminiClient
from .exceptions import GeminiError


class GeminiService:
    def __init__(self, client=None):
        self.client = client or GeminiClient()

    def generate_answer(self, prompt):
        return self.client.generate(prompt)
