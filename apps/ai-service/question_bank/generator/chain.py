from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate

from shared.llm import get_llm

from question_bank.generator.prompts import (
    QUESTION_BANK_PROMPT,
)

from question_bank.generator.schemas import (
    GeneratedQuestionSet,
)

parser = PydanticOutputParser(pydantic_object=GeneratedQuestionSet)

question_generation_chain = (
    ChatPromptTemplate.from_messages(
        [
            (
                "system",
                QUESTION_BANK_PROMPT,
            ),
            (
                "human",
                """
Role

{role}

Skill

{skill}

Generate

{count}

questions.
""",
            ),
            (
                "system",
                "{format_instructions}",
            )
        ]
    )
    .partial(format_instructions=parser.get_format_instructions())
    | get_llm()
    | parser
).with_retry(stop_after_attempt=4, wait_exponential_jitter=True)
