from parser.extractor import ResumeExtractor
from parser.cleaner import ResumeCleaner
from parser.regex_parser import RegexParser
from llm import LLMParser
from parser.merger import ResumeMerger
from schemas.resume_schema import ResumeSchema

class ResumeParser:

    def __init__(self):

        self.llm = LLMParser()

    def parse(self, path):

        text = ResumeExtractor.extract(path)

        text = ResumeCleaner.clean(text)

        regex_data = RegexParser.parse(text)

        llm_data = self.llm.parse(text)

        result = ResumeMerger.merge(
            regex_data,
            llm_data
        )

        return result

# result = ResumeMerger.merge(regex_data, llm_data)

# validated = ResumeSchema(**result)

# return validated.model_dump()
