from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render

from .forms import ChatMessageForm
from .models import ChatSession
from .services.chat_service import ChatService
from .services.history_service import HistoryService
from .services.title_service import TitleService
 


@login_required
def chat_list_view(request):
    chats = HistoryService.list_user_chats(request.user)
    return render(request, 'chat/history.html', {'chats': chats})


@login_required
def new_chat_view(request):
    chat = ChatService.create_chat(request.user, title='New Chat')
    return redirect('chat_detail', chat_id=chat.id)


@login_required
def chat_detail_view(request, chat_id):
    chat = HistoryService.get_chat(chat_id, request.user)
    if not chat:
        return redirect('chat_list')

    form = ChatMessageForm()
    messages = chat.messages.all().order_by('created_at')
    return render(request, 'chat/chat.html', {'chat': chat, 'messages': messages, 'form': form})


@login_required
def send_message_view(request, chat_id=None):
    if request.method == 'POST':
        form = ChatMessageForm(request.POST)
        if form.is_valid():
            message_text = form.cleaned_data['message'].strip()
            if not chat_id:
                chat = ChatService.create_chat(request.user, title='New Chat')
            else:
                chat = HistoryService.get_chat(chat_id, request.user)
                if not chat:
                    return redirect('chat_list')

            if chat.title == 'New Chat':
                title = TitleService.generate_title(message_text)
                chat.title = title
                chat.save(update_fields=['title'])

            ChatService.save_message(chat, 'USER', message_text)
            ChatService.save_message(chat, 'ASSISTANT', 'This is a placeholder assistant response. Integrate your RAG module here.')
            return redirect('chat_detail', chat_id=chat.id)

    return redirect('chat_list')


@login_required
def delete_chat_view(request, chat_id):
    chat = get_object_or_404(ChatSession, id=chat_id, user=request.user)
    ChatService.delete_chat(chat)
    return redirect('chat_list')


@login_required
def rename_chat_view(request, chat_id):
    chat = get_object_or_404(ChatSession, id=chat_id, user=request.user)
    if request.method == 'POST':
        new_title = request.POST.get('title', '').strip()
        if new_title:
            chat.title = new_title
            chat.save(update_fields=['title'])
    return redirect('chat_detail', chat_id=chat.id)


def dashboard_view(request):
    """Render the main dashboard layout (chat center, sidebar, sources)."""
    recent_chats = []
    if request.user.is_authenticated:
        recent_chats = HistoryService.list_user_chats(request.user)[:10]
    return render(request, 'dashboard.html', {'recent_chats': recent_chats})
