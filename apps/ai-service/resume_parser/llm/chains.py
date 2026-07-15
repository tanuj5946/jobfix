from langchain_core.prompts import PromptTemplate

from resume_parser.schemas.resume_schema import ResumeSchema
from shared.llm import get_structured_llm


def build_resume_chain(

    llm,

    prompt_text

):

    prompt = PromptTemplate.from_template(

        prompt_text

    )

    return (

        prompt

        | get_structured_llm(

            ResumeSchema

        ).with_retry()

    )
