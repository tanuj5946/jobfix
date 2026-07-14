import json

from assessment_engine.graph.assessment_graph import (
    build_assessment_graph
)


def main():

    graph = build_assessment_graph()

    initial_state = {
        "target_role": "Backend Developer",

        "selected_skills": [
            "Python",
            "FastAPI",
            "PostgreSQL",
            "Docker",
            "React",
            "Pandas"
        ],

        "retry_count": 0
    }

    result = graph.invoke(initial_state)

    print(
        json.dumps(
            result,
            indent=4,
            ensure_ascii=False
        )
    )


if __name__ == "__main__":
    main()