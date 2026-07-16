# from fastapi import FastAPI, UploadFile, File, HTTPException
# from parser import ResumeParser
# import shutil
# import os

# app = FastAPI(
#     title="JobFix Resume Parser",
#     version="1.0.0"
# )

# UPLOAD_DIR = "uploads"

# os.makedirs(UPLOAD_DIR, exist_ok=True)

# resume_parser = ResumeParser()

from parser import ResumeParser

parser = ResumeParser()

result = parser.parse("resume.pdf")

print(result)
