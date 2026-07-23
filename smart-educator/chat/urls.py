from django.urls import path

from .views import (
    chat_detail_view,
    chat_list_view,
    delete_chat_view,
    new_chat_view,
    rename_chat_view,
    send_message_view,
)

urlpatterns = [
    path('', chat_list_view, name='chat_list'),
    path('new/', new_chat_view, name='chat_new'),
    path('<int:chat_id>/', chat_detail_view, name='chat_detail'),
    path('<int:chat_id>/rename/', rename_chat_view, name='chat_rename'),
    path('<int:chat_id>/delete/', delete_chat_view, name='chat_delete'),
    path('send/', send_message_view, name='chat_send'),
    path('<int:chat_id>/send/', send_message_view, name='chat_send_to_chat'),
]
