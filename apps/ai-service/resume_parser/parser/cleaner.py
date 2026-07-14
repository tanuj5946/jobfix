import re

class ResumeCleaner:
    @staticmethod
    def clean(text: str):
        text = re.sub(r"\n+", "\n", text)
        text = re.sub(r"[ \t]+", " ", text)
        return text.strip()