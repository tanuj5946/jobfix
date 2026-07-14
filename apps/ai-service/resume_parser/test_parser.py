import json

from resume_parser.parser import ResumeParser


def main():
    parser = ResumeParser()

    resume_path = "resume_parser/sample_resume1.pdf"

    print("Parsing resume...")

    result = parser.parse(resume_path)

    print("\nResume Parsed Successfully\n")

    print(
        json.dumps(
            result,
            indent=4,
            ensure_ascii=False
        )
    )


if __name__ == "__main__":
    main()