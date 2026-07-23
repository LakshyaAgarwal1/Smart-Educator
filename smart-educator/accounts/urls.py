from django.contrib.auth.views import LogoutView
from django.urls import path

from .views import login_view, profile_view

urlpatterns = [
    path('login/', login_view, name='account_login'),
    path('logout/', LogoutView.as_view(next_page='account_login'), name='account_logout'),
    path('profile/', profile_view, name='account_profile'),
]
