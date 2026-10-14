import os
import django
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from accounts.models import UserProfile
from documents.models import Document, DocumentChunk
from chat.models import ChatSession, Message

User = get_user_model()

def seed():
    user, created = User.objects.get_or_create(
        username='johndoe',
        defaults={
            'email': 'john.doe@gmail.com',
            'first_name': 'John',
            'last_name': 'Doe'
        }
    )
    user.set_password('password123')
    user.first_name = 'John'
    user.last_name = 'Doe'
    user.email = 'john.doe@gmail.com'
    user.save()

    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.drive_connected = True
    profile.drive_sync_enabled = True
    profile.theme = 'light'
    profile.temperature = 0.7
    profile.max_tokens = 1024
    profile.default_mode = 'EXAM'
    profile.save()

    # Create documents matching mockup
    docs_data = [
        {
            'name': 'Quantum Mechanics.pdf',
            'size': 12400000,
            'pages': 120,
            'type': 'PDF',
            'desc': 'This document contains detailed notes on Quantum Mechanics fundamentals, equations and solved examples.',
            'tags': ['physics', 'quantum', 'mechanics', 'notes'],
            'source': 'GOOGLE_DRIVE'
        },
        {
            'name': 'Physics Notes.pdf',
            'size': 5200000,
            'pages': 68,
            'type': 'PDF',
            'desc': 'Comprehensive revision notes covering modern physics, electromagnetism, and classical mechanics.',
            'tags': ['physics', 'mechanics', 'revision'],
            'source': 'GOOGLE_DRIVE'
        },
        {
            'name': 'Mathematics Formulas.docx',
            'size': 2100000,
            'pages': 35,
            'type': 'DOCX',
            'desc': 'Quick reference cheat sheet for calculus, linear algebra, and differential equations.',
            'tags': ['math', 'calculus', 'formulas'],
            'source': 'UPLOAD'
        },
        {
            'name': 'Organic Chemistry.pdf',
            'size': 8700000,
            'pages': 210,
            'type': 'PDF',
            'desc': 'Reaction mechanisms, functional group conversions, and stereochemistry guides.',
            'tags': ['chemistry', 'organic', 'reactions'],
            'source': 'UPLOAD'
        },
        {
            'name': 'Thermodynamics.pdf',
            'size': 4100000,
            'pages': 60,
            'type': 'PDF',
            'desc': 'Laws of thermodynamics, entropy calculations, and heat engine cycles.',
            'tags': ['physics', 'thermodynamics', 'entropy'],
            'source': 'GOOGLE_DRIVE'
        }
    ]

    for d in docs_data:
        doc, _ = Document.objects.get_or_create(
            user=user,
            display_name=d['name'],
            defaults={
                'filename': d['name'],
                'file_type': d['type'],
                'file_size': d['size'],
                'page_count': d['pages'],
                'description': d['desc'],
                'tags': d['tags'],
                'source': d['source'],
                'status': 'PROCESSED',
                'embedding_model': 'Google Gemini Embedding',
                'storage_path': f'uploads/{user.id}/{d["name"]}',
                'file_hash': 'mock_hash_' + d['name'].replace(' ', '_')
            }
        )
        if doc.chunks.count() == 0:
            for i in range(1, 6):
                DocumentChunk.objects.create(
                    document=doc,
                    chunk_index=i,
                    content=f"Chunk {i} from {doc.display_name}: Section explains foundational concepts, proofs, and solved problems.",
                    vector_id=f"vec_{doc.id}_{i}",
                    page_number=max(1, i * (d['pages'] // 5 or 1))
                )

    # Create chat sessions matching mockup
    chats_data = [
        ('Quantum Mechanics', True, [
            ('USER', 'Explain the Heisenberg Uncertainty Principle.', []),
            ('ASSISTANT', 
             'The Heisenberg Uncertainty Principle states that we cannot simultaneously know both the exact position and momentum of a particle. The more precisely we measure one, the less precisely we can know the other.\n\n'
             'Mathematically, it is expressed as:\n\n'
             '$$\\Delta x \\cdot \\Delta p \\ge \\frac{\\hbar}{2}$$\n\n'
             'where $\\Delta x$ is the uncertainty in position and $\\Delta p$ is the uncertainty in momentum.',
             [
                 {'title': 'Quantum Mechanics.pdf', 'page': 45, 'relevance': 95},
                 {'title': 'Physics Notes.pdf', 'page': 12, 'relevance': 89},
                 {'title': 'The Feynman Lectures on Physics.pdf', 'page': 102, 'relevance': 85}
             ]
            )
        ]),
        ('Photosynthesis in Plants', False, [
            ('USER', 'How does photosynthesis convert light energy into chemical energy?', []),
            ('ASSISTANT', 'Photosynthesis occurs in chloroplasts through light-dependent reactions and the Calvin cycle, producing glucose and releasing oxygen.', [])
        ]),
        ('Math Problem Solving', False, []),
        ("Newton's Laws", False, []),
        ('Integrals and Derivatives', False, []),
        ('Chemical Bonding', False, [])
    ]

    for title, pinned, messages in chats_data:
        chat, _ = ChatSession.objects.get_or_create(
            user=user,
            title=title,
            defaults={'is_pinned': pinned}
        )
        chat.is_pinned = pinned
        chat.save()
        if chat.messages.count() == 0 and messages:
            for role, text, citations in messages:
                Message.objects.create(
                    chat_session=chat,
                    role=role,
                    content=text,
                    citations=citations
                )

    print("Seed complete! Created user johndoe, documents, and chats.")

if __name__ == '__main__':
    seed()
