from .services import GoogleDriveService


class GoogleDriveSync:
    def __init__(self, user=None):
        self.service = GoogleDriveService(user=user)

    def sync_files(self, query=''):
        response = self.service.get_all_files(query=query)
        return response.get('files', [])
