from langchain_core.prompts import PromptTemplate

from schemas.resume_schema import ResumeSchema


def build_resume_chain(

    llm,

    prompt_text

):

    prompt = PromptTemplate.from_template(

        prompt_text

    )

    return (

        prompt

        | llm.with_structured_output(

            ResumeSchema

        ).with_retry()

    )
