from question_bank.generator.service import (
    question_generator_service,
)

stats = question_generator_service.generate(
    role="Software Developer",
    skill="Python",
    count=5,
)

print(stats)