from django.conf import settings


class GoogleTokenManager:
    @staticmethod
    def get_token_for_user(user):
        profile = getattr(user, 'profile', None)
        if profile is None:
            return None
        return getattr(profile, 'google_access_token', None)

    @staticmethod
    def store_token_for_user(user, access_token, refresh_token=None):
        profile = getattr(user, 'profile', None)
        if profile is None:
            return False
        profile.google_access_token = access_token
        if refresh_token:
            profile.google_refresh_token = refresh_token
        profile.save(update_fields=['google_access_token', 'google_refresh_token'])
        return True
