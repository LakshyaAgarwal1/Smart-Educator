from django import forms


class ChatMessageForm(forms.Form):
    message = forms.CharField(widget=forms.Textarea(attrs={'rows': 3, 'placeholder': 'Ask anything...'}), required=True)
