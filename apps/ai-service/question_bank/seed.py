from question_bank.generator.service import question_generator_service

skills = [
    "Python",
    "Java",
    "JavaScript",
    "C++",
    "SQL",
    "React",
    "Node.js",
    "HTML",
    "CSS",
    "Data Structures",
    "Algorithms",
    "OOPS Concept",
    "Operating System",
    "Computer Networks",
    "DBMS",
    "Software Design Patterns",
    "Git",
]

ROLE = "Software Developer"

for skill in skills:
    print(f"\nGenerating questions for {skill}")

    stats = question_generator_service.generate(
        role=ROLE,
        skill=skill,
        count=20,
    )

    print(stats)