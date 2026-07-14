from resume_parser.parser import ResumeParser

parser = ResumeParser()

result = parser.parse("resume_parser/sample_resume.pdf")

print(result)
