import os

from shared.llm.model import get_llm

from resume_parser.llm.chains import build_resume_chain


class LLMParser:

    def __init__(self):

        llm = get_llm()

        prompt_path = os.path.join(

            os.path.dirname(__file__),

            "..",

            "prompts",

            "resume_prompt.txt"

        )

        with open(

            prompt_path,

            encoding="utf-8"

        ) as f:

            prompt = f.read()

        self.chain = build_resume_chain(

            llm,

            prompt

        )

    def parse(

        self,

        text

    ):

        result = self.chain.invoke(

            {

                "resume_text": text

            }

        )

        return result.model_dump()
