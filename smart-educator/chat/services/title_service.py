import re


class TitleService:
    @staticmethod
    def generate_title(text):
        cleaned = re.sub(r'\s+', ' ', text).strip()
        if not cleaned:
            return 'New Chat'
        if len(cleaned) <= 40:
            return cleaned
        return cleaned[:37].rstrip() + '...'
