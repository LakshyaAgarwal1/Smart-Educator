from PIL import Image
import pytesseract


class OCRService:
    @staticmethod
    def extract_text_from_image(image_path):
        try:
            image = Image.open(image_path)
            text = pytesseract.image_to_string(image)
            return text.strip()
        except Exception:
            return ''
