import re


class RegexParser:
    EMAIL_PATTERN = r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"

    PHONE_PATTERN = (
        r"(?:\+91[-\s]?)?[6-9]\d{9}"
    )

    LINKEDIN_PATTERN = (
        r"(https?:\/\/)?(www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+"
    )

    GITHUB_PATTERN = (
        r"(https?:\/\/)?(www\.)?github\.com\/[A-Za-z0-9_-]+"
    )

    @staticmethod
    def extract_email(text):
        match = re.search(RegexParser.EMAIL_PATTERN, text)
        return match.group(0) if match else None

    @staticmethod
    def extract_phone(text):
        match = re.search(RegexParser.PHONE_PATTERN, text)
        return match.group(0) if match else None

    @staticmethod
    def extract_linkedin(text):
        match = re.search(RegexParser.LINKEDIN_PATTERN, text)
        return match.group(0) if match else None

    @staticmethod
    def extract_github(text):
        match = re.search(RegexParser.GITHUB_PATTERN, text)
        return match.group(0) if match else None

    @classmethod
    def parse(cls, text):

        return {
            "email": cls.extract_email(text),
            "phone": cls.extract_phone(text),
            "linkedin": cls.extract_linkedin(text),
            "github": cls.extract_github(text)
        }