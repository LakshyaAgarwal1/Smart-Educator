from .client import SearchClient
from .exceptions import SearchAPIError


class SearchService:
    def __init__(self, client=None):
        self.client = client or SearchClient()

    def search(self, query):
        return self.client.search(query)
