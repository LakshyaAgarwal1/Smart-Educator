import os
from io import BytesIO

from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.shortcuts import redirect, render
from django.utils.translation import gettext_lazy as _
from PIL import Image


def login_view(request):
    return render(request, 'accounts/login.html')


@login_required
def profile_view(request):
    profile = request.user.profile

    error_message = None

    if request.method == 'POST':
        uploaded_image = request.FILES.get('profile_picture')
        if uploaded_image:
            try:
                img = Image.open(uploaded_image)
                img.verify()
                uploaded_image.seek(0)

                img = Image.open(uploaded_image)
                img = img.convert('RGB')
                img.thumbnail((300, 300))

                output = BytesIO()
                img.save(output, format='JPEG', quality=90)
                output.seek(0)

                profile.profile_picture.save(
                    os.path.splitext(uploaded_image.name)[0] + '.jpg',
                    ContentFile(output.getvalue()),
                    save=False,
                )
                profile.save()
                return redirect('account_profile')
            except (ValidationError, OSError, SyntaxError):
                error_message = _('Please upload a valid image file.')

        return render(request, 'accounts/profile.html', {'profile': profile, 'error_message': error_message})

    return render(request, 'accounts/profile.html', {'profile': profile, 'error_message': error_message})
