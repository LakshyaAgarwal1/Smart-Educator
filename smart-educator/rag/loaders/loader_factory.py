from typing import Type
import os
from .base_loader import BaseLoader
from .text_loader import TextLoader
from .pdf_loader import PDFLoader
from .docx_loader import DocxLoader
from .ppt_loader import PPTLoader
from .image_loader import ImageLoader


class LoaderFactory:
    _map = {
        '.txt': TextLoader,
        '.xls': TextLoader,
        '.xlsx': TextLoader,
        '.pdf': PDFLoader,
        '.docx': DocxLoader,
        '.pptx': PPTLoader,
        '.ppt': PPTLoader,
        '.png': ImageLoader,
        '.jpg': ImageLoader,
        '.jpeg': ImageLoader,
    }

    @classmethod
    def create_loader(cls, path: str) -> BaseLoader:
        ext = os.path.splitext(path)[1].lower()
        # Prefer Excel loader for .xls/.xlsx
        if ext in ('.xlsx', '.xls'):
            try:
                from .excel_loader import ExcelLoader
                loader_cls = ExcelLoader
            except Exception:
                loader_cls = cls._map.get(ext, TextLoader)
        else:
            loader_cls: Type[BaseLoader] = cls._map.get(ext, TextLoader)
        return loader_cls(path)
