import os
import json
import logging
import secrets
import base64
from pathlib import Path
from datetime import datetime

from django.conf import settings
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.core.mail import send_mail
from django.core.files.base import ContentFile
from django.db.models import Sum
from django.shortcuts import get_object_or_404, redirect
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from accounts.models import UserProfile, PasswordResetCode, OneTimeLoginToken
from documents.models import Document, DocumentChunk
from documents.services.sync_service import SyncService
from chat.models import ChatSession, Message
from chat.services.title_service import TitleService
from integrations.google_auth.services import GoogleAuthService

from .serializers import (
    UserSerializer, DocumentSerializer, DocumentDetailSerializer,
    ChatSessionSerializer, ChatSessionDetailSerializer, MessageSerializer
)

User = get_user_model()
logger = logging.getLogger(__name__)


# ==========================================
# AUTH VIEWS (REAL USER ACCOUNTS)
# ==========================================

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username') or request.data.get('email')
        password = request.data.get('password')

        if not username or not password:
            return Response({'error': 'Username/email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Allow login by email or username
        user = authenticate(request, username=username, password=password)
        if not user:
            try:
                user_obj = User.objects.get(email=username)
                user = authenticate(request, username=user_obj.username, password=password)
            except User.DoesNotExist:
                user = None

        if user:
            login(request, user)
            if not hasattr(user, 'profile'):
                UserProfile.objects.create(user=user)
            return Response({
                'message': 'Login successful',
                'user': UserSerializer(user).data
            })
        return Response({'error': 'Invalid username or password.'}, status=status.HTTP_401_UNAUTHORIZED)


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        name = request.data.get('name', '').strip()

        if not username or not email or not password:
            return Response({'error': 'Username, email, and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username is already taken. Please choose another.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({'error': 'An account with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        first_name = name.split(' ')[0] if name else username
        last_name = ' '.join(name.split(' ')[1:]) if name and ' ' in name else ''

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )
        UserProfile.objects.get_or_create(user=user)
        login(request, user, backend='django.contrib.auth.backends.ModelBackend')

        return Response({
            'message': 'Registration successful',
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response({'message': 'Logged out successfully'})


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        doc_count = Document.objects.filter(user=user).count()
        chat_count = ChatSession.objects.filter(user=user).count()
        total_bytes = Document.objects.filter(user=user).aggregate(Sum('file_size'))['file_size__sum'] or 0

        if total_bytes > 1024 * 1024 * 1024:
            storage_str = f"{total_bytes / (1024 * 1024 * 1024):.1f} GB"
        elif total_bytes > 1024 * 1024:
            storage_str = f"{total_bytes / (1024 * 1024):.1f} MB"
        else:
            storage_str = f"{total_bytes / 1024:.1f} KB"

        return Response({
            'user': UserSerializer(user).data,
            'stats': {
                'documents_count': doc_count,
                'chats_count': chat_count,
                'storage_used': storage_str,
                'storage_bytes': total_bytes
            }
        })

    def put(self, request):
        user = request.user
        user.first_name = request.data.get('first_name', user.first_name)
        user.last_name = request.data.get('last_name', user.last_name)
        user.email = request.data.get('email', user.email)
        user.save()
        return Response({'message': 'Profile updated', 'user': UserSerializer(user).data})



class ProfilePictureUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        pic = request.FILES.get('profile_picture') or request.FILES.get('picture')
        if not pic:
            return Response({'error': 'No profile picture file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        if not pic.content_type.startswith('image/'):
            return Response({'error': 'Uploaded file must be a valid image (JPEG, PNG, WEBP, etc.).'}, status=status.HTTP_400_BAD_REQUEST)

        if pic.size > 5 * 1024 * 1024:
            return Response({'error': 'Profile picture size cannot exceed 5MB.'}, status=status.HTTP_400_BAD_REQUEST)

        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        if profile.profile_picture:
            try:
                profile.profile_picture.delete(save=False)
            except Exception:
                pass

        profile.profile_picture = pic
        profile.save()

        return Response({
            'message': 'Profile picture updated successfully',
            'user': UserSerializer(request.user).data
        }, status=status.HTTP_200_OK)

    def delete(self, request):
        profile = getattr(request.user, 'profile', None)
        if profile and profile.profile_picture:
            try:
                profile.profile_picture.delete(save=False)
                profile.profile_picture = None
                profile.save()
            except Exception:
                pass
        return Response({
            'message': 'Profile picture removed successfully',
            'user': UserSerializer(request.user).data
        }, status=status.HTTP_200_OK)


class GoogleLoginUrlView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        origin = (
            request.query_params.get('origin')
            or request.headers.get('Origin')
            or request.headers.get('Referer')
            or 'http://127.0.0.1:5173'
        )
        if '://' in origin:
            parts = origin.split('/')
            origin = f"{parts[0]}//{parts[2]}"
        else:
            origin = 'http://127.0.0.1:5173'

        state = base64.urlsafe_b64encode(origin.encode()).decode()
        service = GoogleAuthService()
        return Response({'url': service.get_login_url(state=state)})


class GoogleCallbackView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        code = request.GET.get('code')
        error = request.GET.get('error')
        state = request.GET.get('state')

        # Decode target frontend origin
        frontend_origin = 'http://127.0.0.1:5173'
        if state:
            try:
                decoded = base64.urlsafe_b64decode(state.encode()).decode()
                if decoded.startswith('http://') or decoded.startswith('https://'):
                    frontend_origin = decoded.rstrip('/')
            except Exception:
                pass

        if error or not code:
            err_param = error or 'no_code'
            return redirect(f'{frontend_origin}/login?error={err_param}')

        try:
            service = GoogleAuthService()
            user_info = service.exchange_code(code)
            email = user_info.get('email')
            name = user_info.get('name', '')
            picture_url = user_info.get('picture')

            if not email:
                return redirect(f'{frontend_origin}/login?error=no_email')

            if request.user.is_authenticated:
                user = request.user
            else:
                username = email.split('@')[0]
                base_username = username
                counter = 1
                while User.objects.filter(username=username).exclude(email=email).exists():
                    username = f"{base_username}{counter}"
                    counter += 1

                first_name = name.split(' ')[0] if name else username
                last_name = ' '.join(name.split(' ')[1:]) if name and ' ' in name else ''

                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        'username': username,
                        'first_name': first_name,
                        'last_name': last_name
                    }
                )

            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.google_id = user_info.get('google_id') or profile.google_id
            profile.google_access_token = user_info.get('access_token')
            if user_info.get('refresh_token'):
                profile.google_refresh_token = user_info.get('refresh_token')
            profile.drive_connected = True
            profile.drive_sync_enabled = True

            # If user has no custom avatar yet and Google provides one, save it
            if picture_url and not profile.profile_picture:
                try:
                    import requests as req_lib
                    pic_res = req_lib.get(picture_url, timeout=10)
                    if pic_res.status_code == 200:
                        profile.profile_picture.save(
                            f"google_{user.id}.jpg",
                            ContentFile(pic_res.content),
                            save=False
                        )
                except Exception as p_err:
                    logger.warning(f"Could not download Google profile picture: {p_err}")

            profile.save()

            login(request, user, backend='django.contrib.auth.backends.ModelBackend')

            # Generate single-use token to exchange on frontend origin (eliminates localhost vs 127.0.0.1 cookie mismatch)
            otk = OneTimeLoginToken.objects.create(user=user, token=secrets.token_urlsafe(32))
            return redirect(f'{frontend_origin}/?auth_token={otk.token}')
        except Exception as e:
            logger.exception("Google OAuth callback failed")
            return redirect(f'{frontend_origin}/login?error={str(e)}')


class TokenLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token_str = request.data.get('token')
        if not token_str:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)

        otk = OneTimeLoginToken.objects.filter(token=token_str).first()
        if not otk or not otk.is_valid():
            return Response({'error': 'Invalid or expired login token'}, status=status.HTTP_400_BAD_REQUEST)

        user = otk.user
        otk.delete()

        login(request, user, backend='django.contrib.auth.backends.ModelBackend')
        return Response({
            'message': 'Logged in successfully',
            'user': UserSerializer(user).data
        })



class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            user = User.objects.filter(username__iexact=email).first()

        if not user:
            return Response({
                'error': f'No account found with email address: {email}. Please verify your email or register.'
            }, status=status.HTTP_404_NOT_FOUND)

        # Generate a secure 6-digit recovery OTP
        code = f"{secrets.randbelow(900000) + 100000}"

        # Invalidate any prior unused reset codes for this user
        PasswordResetCode.objects.filter(user=user, is_used=False).update(is_used=True)

        # Record new reset code (expires in 15 mins)
        PasswordResetCode.objects.create(user=user, code=code)

        # Dispatch email
        subject = "SmartEducator - Password Reset Recovery Code"
        message = (
            f"Hello {user.first_name or user.username},\n\n"
            f"We received a request to reset the password for your SmartEducator account ({user.email}).\n\n"
            f"Your 6-digit password recovery code is:\n\n"
            f"    {code}\n\n"
            f"This code will expire in 15 minutes.\n\n"
            f"If you did not request this password reset, please ignore this email and your account remains safe.\n\n"
            f"Best regards,\n"
            f"The SmartEducator Team\n"
        )

        email_dispatched = False
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False
            )
            email_dispatched = True
            logger.info(f"Password reset recovery email dispatched to {user.email}")
        except Exception as mail_err:
            logger.warning(f"Email dispatch error for {user.email}: {mail_err}")

        resp_data = {
            'message': f'A 6-digit recovery code has been sent to {user.email}. Please check your inbox.',
            'email': user.email,
            'email_sent': email_dispatched,
        }
        # Include code preview in DEBUG mode for development/local testing
        if settings.DEBUG:
            resp_data['code_preview'] = code

        return Response(resp_data, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        code = request.data.get('code', '').strip()
        new_password = request.data.get('password')
        confirm_password = request.data.get('confirm_password')

        if not email or not code or not new_password:
            return Response({
                'error': 'Email, 6-digit recovery code, and new password are required.'
            }, status=status.HTTP_400_BAD_REQUEST)

        if confirm_password and new_password != confirm_password:
            return Response({'error': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 6:
            return Response({'error': 'Password must be at least 6 characters.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            user = User.objects.filter(username__iexact=email).first()

        if not user:
            return Response({'error': 'No account matches this email.'}, status=status.HTTP_404_NOT_FOUND)

        reset_code = PasswordResetCode.objects.filter(
            user=user,
            code=code,
            is_used=False
        ).order_by('-created_at').first()

        if not reset_code:
            return Response({
                'error': 'Invalid recovery code. Please re-check the 6-digit code or request a new one.'
            }, status=status.HTTP_400_BAD_REQUEST)

        if not reset_code.is_valid():
            return Response({
                'error': 'This recovery code has expired (valid for 15 minutes). Please request a new one.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Update password
        user.set_password(new_password)
        user.save()

        # Invalidate code
        reset_code.is_used = True
        reset_code.save()

        return Response({
            'message': 'Password has been reset successfully! You can now log in with your new password.'
        }, status=status.HTTP_200_OK)


# ==========================================
# CHAT SESSIONS & REAL RAG EXECUTION
# ==========================================

class ChatSessionListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        sessions = ChatSession.objects.filter(user=request.user, is_archived=False)
        if q:
            sessions = sessions.filter(title__icontains=q)
        sessions = sessions.order_by('-is_pinned', '-updated_at')
        return Response(ChatSessionSerializer(sessions, many=True).data)

    def post(self, request):
        title = request.data.get('title', 'New Chat')
        session = ChatSession.objects.create(user=request.user, title=title)
        return Response(ChatSessionDetailSerializer(session).data, status=status.HTTP_201_CREATED)


class ChatSessionDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, chat_id):
        session = get_object_or_404(ChatSession, id=chat_id, user=request.user)
        return Response(ChatSessionDetailSerializer(session).data)

    def patch(self, request, chat_id):
        session = get_object_or_404(ChatSession, id=chat_id, user=request.user)
        if 'title' in request.data:
            session.title = request.data['title']
        if 'is_pinned' in request.data:
            session.is_pinned = bool(request.data['is_pinned'])
        session.save()
        return Response(ChatSessionSerializer(session).data)

    def delete(self, request, chat_id):
        session = get_object_or_404(ChatSession, id=chat_id, user=request.user)
        session.delete()
        return Response({'message': 'Chat session deleted successfully'})


class ClearChatHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        ChatSession.objects.filter(user=request.user).delete()
        return Response({'message': 'All chat history cleared'})


class SendMessageView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, chat_id):
        user = request.user
        session = get_object_or_404(ChatSession, id=chat_id, user=user)

        user_content = request.data.get('message', '').strip()
        mode = request.data.get('mode', 'EXAM').upper()
        uploaded_file = request.FILES.get('file')

        if not user_content and not uploaded_file:
            return Response({'error': 'Message content or an attached study document is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Handle study document attached directly in chat
        attached_doc = None
        if uploaded_file:
            user_dir = Path('uploads') / str(user.id)
            storage_dir = Path(settings.MEDIA_ROOT) / user_dir
            storage_dir.mkdir(parents=True, exist_ok=True)
            destination = storage_dir / uploaded_file.name

            with destination.open('wb+') as f:
                for chunk in uploaded_file.chunks():
                    f.write(chunk)

            file_hash = Document.calculate_hash(destination)
            file_ext = Path(uploaded_file.name).suffix.lstrip('.').lower() or 'pdf'

            attached_doc = Document.objects.filter(user=user, file_hash=file_hash).first()
            if not attached_doc:
                attached_doc = Document.objects.create(
                    user=user,
                    display_name=uploaded_file.name,
                    filename=uploaded_file.name,
                    file_type=file_ext.upper(),
                    file_size=uploaded_file.size,
                    file_hash=file_hash,
                    storage_path=str(user_dir / uploaded_file.name),
                    source='UPLOAD',
                    status='PROCESSING',
                    description=f"Attached study notes uploaded in chat: {uploaded_file.name}",
                    tags=[file_ext, 'chat_upload'],
                    page_count=max(1, int(uploaded_file.size / (80 * 1024))),
                    embedding_model="Google Gemini Embedding"
                )

            # Ensure document is indexed synchronously so its chunks are immediately in RAG
            if attached_doc.chunks.count() == 0 or attached_doc.status != 'PROCESSED':
                try:
                    from rag.services.indexing_service import IndexingService
                    indexer = IndexingService()
                    indexer.index_document(attached_doc)
                    logger.info("Successfully indexed chat attachment doc_id=%s (%s)", attached_doc.id, uploaded_file.name)
                except Exception as e:
                    logger.warning("Indexing chat attachment failed for %s: %s", uploaded_file.name, e)

            # Format user prompt and display content
            if not user_content:
                user_content = f"Please provide a comprehensive summary and key takeaways of the uploaded document: {uploaded_file.name}."
                display_content = f"📎 **{uploaded_file.name}**\n\n{user_content}"
            else:
                display_content = f"📎 **{uploaded_file.name}**\n\n{user_content}"
        else:
            display_content = user_content

        # 2. Save user message
        user_msg = Message.objects.create(
            chat_session=session,
            role='USER',
            content=display_content
        )

        # 3. ChatGPT-style smart title generation if this is the first message
        if session.title == 'New Chat' or not session.title or session.messages.count() <= 2:
            title_source = uploaded_file.name if uploaded_file else user_content
            generated_title = TitleService.generate_title(title_source)
            session.title = generated_title
            session.save(update_fields=['title', 'updated_at'])
        else:
            session.save(update_fields=['updated_at'])

        # 4. Execute Real RAG Pipeline based on Mode (EXAM vs WEB)
        from rag.core.mode_router import route
        pipeline = route(mode)

        chat_history = [
            {'role': m.role.lower(), 'content': m.content}
            for m in session.messages.order_by('-created_at')[:6][::-1]
        ]

        rag_output = pipeline.run(user=user, query=user_content, chat_history=chat_history)

        assistant_content = rag_output.get('answer') or "I couldn't find enough information in your uploaded study material."
        citations = rag_output.get('citations', [])
        confidence = rag_output.get('confidence', 90 if mode == 'WEB' else 85)

        # 5. Save assistant message
        assistant_msg = Message.objects.create(
            chat_session=session,
            role='ASSISTANT',
            content=assistant_content,
            citations=citations
        )

        return Response({
            'user_message': MessageSerializer(user_msg).data,
            'assistant_message': MessageSerializer(assistant_msg).data,
            'citations': citations,
            'confidence': confidence,
            'mode': mode,
            'chat_title': session.title,
            'attached_document': DocumentSerializer(attached_doc).data if attached_doc else None
        })


# ==========================================
# DOCUMENTS & GOOGLE DRIVE VIEWS (USER SCOPED)
# ==========================================

class DocumentListView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        doc_type = request.query_params.get('type', '').strip()

        docs = Document.objects.filter(user=request.user)
        if q:
            docs = docs.filter(display_name__icontains=q)
        if doc_type and doc_type.lower() != 'all':
            docs = docs.filter(file_type__iexact=doc_type)

        return Response(DocumentSerializer(docs, many=True).data)

    def post(self, request):
        user = request.user
        uploaded_file = request.FILES.get('file')
        display_name = request.data.get('title') or (uploaded_file.name if uploaded_file else 'Untitled Document')
        description = request.data.get('description', '')
        tags_raw = request.data.get('tags', '[]')

        if isinstance(tags_raw, str):
            try:
                tags = json.loads(tags_raw)
            except Exception:
                tags = [t.strip() for t in tags_raw.split(',') if t.strip()]
        else:
            tags = tags_raw

        if not uploaded_file:
            return Response({'error': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        # Save file to user's isolated storage
        user_dir = Path('uploads') / str(user.id)
        storage_dir = Path(settings.MEDIA_ROOT) / user_dir
        storage_dir.mkdir(parents=True, exist_ok=True)
        destination = storage_dir / uploaded_file.name

        with destination.open('wb+') as f:
            for chunk in uploaded_file.chunks():
                f.write(chunk)

        file_hash = Document.calculate_hash(destination)
        file_ext = Path(uploaded_file.name).suffix.lstrip('.').lower() or 'pdf'
        page_count = max(1, int(uploaded_file.size / (80 * 1024)))

        doc = Document.objects.create(
            user=user,
            display_name=display_name,
            filename=uploaded_file.name,
            file_type=file_ext.upper(),
            file_size=uploaded_file.size,
            file_hash=file_hash,
            storage_path=str(user_dir / uploaded_file.name),
            source='UPLOAD',
            status='PROCESSING',
            description=description or f"Uploaded study notes for {display_name}.",
            tags=tags or [file_ext, 'notes'],
            page_count=page_count,
            embedding_model="Google Gemini Embedding"
        )

        # Run indexing asynchronously in background thread so upload response is instant
        import threading
        def _bg_index(doc_id):
            try:
                from rag.services.indexing_service import IndexingService
                from documents.models import Document as DocModel
                target_doc = DocModel.objects.get(id=doc_id)
                indexer = IndexingService()
                indexer.index_document(target_doc)
            except Exception as e:
                logger.warning("Background indexing failed for doc_id=%s: %s", doc_id, e)

        threading.Thread(target=_bg_index, args=(doc.id,), daemon=True).start()

        return Response(DocumentSerializer(doc).data, status=status.HTTP_201_CREATED)


class DocumentDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, doc_id):
        doc = get_object_or_404(Document, id=doc_id, user=request.user)
        return Response(DocumentDetailSerializer(doc).data)

    def delete(self, request, doc_id):
        doc = get_object_or_404(Document, id=doc_id, user=request.user)
        storage_path = Path(settings.MEDIA_ROOT) / doc.storage_path
        if storage_path.exists():
            storage_path.unlink(missing_ok=True)
        doc.delete()
        return Response({'message': 'Document deleted successfully'})


class GoogleDriveStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = getattr(user, 'profile', None)
        synced_docs = Document.objects.filter(user=user, source='GOOGLE_DRIVE')
        return Response({
            'connected': bool(profile and profile.drive_connected),
            'email': user.email or 'Not connected',
            'last_synced': '5 minutes ago' if profile and profile.drive_connected else 'Never',
            'synced_files': DocumentSerializer(synced_docs, many=True).data
        })


class GoogleDriveSyncView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        profile = getattr(user, 'profile', None)
        if not profile or not profile.google_access_token:
            return Response({
                'status': 'not_connected',
                'message': 'Google Drive is not linked. Please sign in with Google to authorize drive sync.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Run sync and indexing in background daemon thread so browser HTTP request never times out
        import threading
        def _bg_sync(target_user):
            try:
                SyncService.sync_google_drive(target_user)
            except Exception as e:
                logger.warning("Background Google Drive sync failed: %s", e)

        threading.Thread(target=_bg_sync, args=(user,), daemon=True).start()

        drive_count = Document.objects.filter(user=user, source='GOOGLE_DRIVE').count()
        return Response({
            'status': 'success',
            'message': 'Google Drive sync started! All documents are being downloaded, extracted, and chunked into RAG.',
            'total_imported': drive_count
        })


class GoogleDriveDisconnectView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        profile = getattr(user, 'profile', None)
        if profile:
            profile.drive_connected = False
            profile.drive_sync_enabled = False
            profile.google_access_token = None
            profile.google_refresh_token = None
            profile.save()
        return Response({'status': 'success', 'message': 'Google Drive disconnected.'})


# ==========================================
# SETTINGS & DATA PRIVACY VIEWS
# ==========================================

class SettingsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        return Response({
            'theme': profile.theme,
            'temperature': profile.temperature,
            'max_tokens': profile.max_tokens,
            'default_mode': profile.default_mode,
        })

    def put(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)

        if 'theme' in request.data:
            profile.theme = request.data['theme']
        if 'temperature' in request.data:
            profile.temperature = float(request.data['temperature'])
        if 'max_tokens' in request.data:
            profile.max_tokens = int(request.data['max_tokens'])
        if 'default_mode' in request.data:
            profile.default_mode = request.data['default_mode']

        profile.save()
        return Response({
            'message': 'Settings saved successfully',
            'settings': {
                'theme': profile.theme,
                'temperature': profile.temperature,
                'max_tokens': profile.max_tokens,
                'default_mode': profile.default_mode,
            }
        })


class DeleteAllDataView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        user = request.user
        Document.objects.filter(user=user).delete()
        ChatSession.objects.filter(user=user).delete()
        return Response({'message': 'All documents and chats have been permanently deleted.'})
