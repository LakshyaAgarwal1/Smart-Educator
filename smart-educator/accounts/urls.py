from django.contrib.auth.views import LogoutView
from django.urls import path
from django.shortcuts import redirect
from api.views import GoogleLoginUrlView, GoogleCallbackView
from .views import login_view, profile_view


def redirect_to_frontend(request):
    return redirect('http://127.0.0.1:5173/')


urlpatterns = [
    path('login/', redirect_to_frontend, name='account_login'),
    path('logout/', LogoutView.as_view(next_page='http://127.0.0.1:5173/login'), name='account_logout'),
    path('profile/', redirect_to_frontend, name='account_profile'),
    path('google/login/', GoogleLoginUrlView.as_view(), name='account_google_login'),
    path('google/login/callback/', GoogleCallbackView.as_view(), name='account_google_callback'),
]

