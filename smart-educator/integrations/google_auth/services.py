from .client import GoogleAuthClient
from .exceptions import GoogleAuthenticationError, GoogleTokenError


class GoogleAuthService:
    def __init__(self, client=None):
        self.client = client or GoogleAuthClient()

    def get_login_url(self):
        return self.client.build_login_url()

    def exchange_code(self, code):
        token_payload = self.client.exchange_code(code)
        access_token = token_payload.get('access_token')
        if not access_token:
            raise GoogleTokenError('No access token returned from Google.')
        user_info = self.client.get_user_info(access_token)
        return {
            'email': user_info.get('email'),
            'name': user_info.get('name'),
            'picture': user_info.get('picture'),
            'google_id': user_info.get('id'),
            'access_token': access_token,
            'refresh_token': token_payload.get('refresh_token'),
        }
