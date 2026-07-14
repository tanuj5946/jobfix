class ResumeMerger:

    @staticmethod
    def merge(regex_data, llm_data):

        llm_data.setdefault("personal_info", {})

        personal = llm_data["personal_info"]

        personal["email"] = (
            regex_data["email"]
            or personal.get("email")
        )

        personal["phone"] = (
            regex_data["phone"]
            or personal.get("phone")
        )

        personal["github"] = (
            regex_data["github"]
            or personal.get("github")
        )

        personal["linkedin"] = (
            regex_data["linkedin"]
            or personal.get("linkedin")
        )

        return llm_data