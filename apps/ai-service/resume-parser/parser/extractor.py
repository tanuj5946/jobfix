import fitz
from docx import Document


class ResumeExtractor:

    @staticmethod
    def extract_pdf(path: str) -> str:
        document = fitz.open(path)

        text = ""

        for page in document:
            text += page.get_text()

        return text

    @staticmethod
    def extract_docx(path: str) -> str:
        doc = Document(path)

        return "\n".join(
            paragraph.text
            for paragraph in doc.paragraphs
        )

    @staticmethod
    def extract(path: str):

        if path.endswith(".pdf"):
            return ResumeExtractor.extract_pdf(path)

        if path.endswith(".docx"):
            return ResumeExtractor.extract_docx(path)

        raise Exception("Unsupported File")