import os
from urllib.parse import urlencode

import requests
from django.conf import settings

from ..utils.validators import ensure_env, validate_url
from .exceptions import GoogleAuthenticationError, GoogleTokenError


class GoogleAuthClient:
    def __init__(self):
        self.client_id = ensure_env('GOOGLE_CLIENT_ID')
        self.client_secret = ensure_env('GOOGLE_CLIENT_SECRET')
        self.redirect_uri = os.getenv('GOOGLE_REDIRECT_URI', 'http://127.0.0.1:8000/accounts/google/login/callback/')
        self.scope = 'openid email profile https://www.googleapis.com/auth/drive.readonly'

    def build_login_url(self, state=None):
        params = {
            'client_id': self.client_id,
            'redirect_uri': self.redirect_uri,
            'response_type': 'code',
            'scope': self.scope,
            'access_type': 'offline',
            'prompt': 'consent',
        }
        if state:
            params['state'] = state
        return 'https://accounts.google.com/o/oauth2/v2/auth?' + urlencode(params)

    def exchange_code(self, code):
        validate_url(self.redirect_uri)
        data = {
            'code': code,
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'redirect_uri': self.redirect_uri,
            'grant_type': 'authorization_code',
        }
        response = requests.post('https://oauth2.googleapis.com/token', data=data, timeout=15)
        if response.status_code != 200:
            raise GoogleTokenError(f'Failed to exchange auth code: {response.text}')
        return response.json()

    def get_user_info(self, access_token):
        response = requests.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=15,
        )
        if response.status_code != 200:
            raise GoogleAuthenticationError(f'Unable to fetch user info: {response.text}')
        return response.json()
