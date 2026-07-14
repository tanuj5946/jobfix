from resume_parser.parser.extractor import ResumeExtractor
from resume_parser.parser.cleaner import ResumeCleaner
from resume_parser.parser.regex_parser import RegexParser
from resume_parser.parser.merger import ResumeMerger

from resume_parser.llm.llm_parser import LLMParser


class ResumeParser:

    def __init__(self):
        self.llm = LLMParser()

    def parse(self, file_path: str):

        text = ResumeExtractor.extract(file_path)

        text = ResumeCleaner.clean(text)

        if not text:
            raise ValueError("No readable text found in resume")

        regex_data = RegexParser.parse(text)

        llm_data = self.llm.parse(text)

        result = ResumeMerger.merge(
            regex_data,
            llm_data
        )

        return result
