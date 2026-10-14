from django.urls import path
from .views import (
    LoginView, RegisterView, LogoutView, MeView, ProfilePictureUploadView,
    GoogleLoginUrlView, GoogleCallbackView, TokenLoginView,
    PasswordResetRequestView, PasswordResetConfirmView,
    ChatSessionListView, ChatSessionDetailView, SendMessageView, ClearChatHistoryView,
    DocumentListView, DocumentDetailView,
    GoogleDriveStatusView, GoogleDriveSyncView, GoogleDriveDisconnectView,
    SettingsView, DeleteAllDataView
)

urlpatterns = [
    # Auth
    path('auth/login/', LoginView.as_view(), name='api_login'),
    path('auth/register/', RegisterView.as_view(), name='api_register'),
    path('auth/token-login/', TokenLoginView.as_view(), name='api_token_login'),
    path('auth/logout/', LogoutView.as_view(), name='api_logout'),
    path('auth/me/', MeView.as_view(), name='api_me'),
    path('auth/profile/picture/', ProfilePictureUploadView.as_view(), name='api_profile_picture'),
    path('auth/google/url/', GoogleLoginUrlView.as_view(), name='api_google_url'),
    path('auth/google/callback/', GoogleCallbackView.as_view(), name='api_google_callback'),
    path('auth/password-reset/', PasswordResetRequestView.as_view(), name='api_password_reset'),
    path('auth/password-reset-confirm/', PasswordResetConfirmView.as_view(), name='api_password_reset_confirm'),

    # Chat
    path('chat/sessions/', ChatSessionListView.as_view(), name='api_chat_sessions'),
    path('chat/sessions/<int:chat_id>/', ChatSessionDetailView.as_view(), name='api_chat_detail'),
    path('chat/sessions/<int:chat_id>/message/', SendMessageView.as_view(), name='api_send_message'),
    path('chat/clear-all/', ClearChatHistoryView.as_view(), name='api_clear_chats'),

    # Documents
    path('documents/', DocumentListView.as_view(), name='api_documents'),
    path('documents/<int:doc_id>/', DocumentDetailView.as_view(), name='api_document_detail'),
    path('documents/drive/status/', GoogleDriveStatusView.as_view(), name='api_drive_status'),
    path('documents/drive/sync/', GoogleDriveSyncView.as_view(), name='api_drive_sync'),
    path('documents/drive/disconnect/', GoogleDriveDisconnectView.as_view(), name='api_drive_disconnect'),

    # Settings & Privacy
    path('settings/', SettingsView.as_view(), name='api_settings'),
    path('settings/delete-all/', DeleteAllDataView.as_view(), name='api_delete_all_data'),
]
