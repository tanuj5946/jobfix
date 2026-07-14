import re

from shared.errors import ValidationError


MAX_TEXT_LENGTH = 4000
SUSPICIOUS_PATTERNS = [
    re.compile(r"ignore\s+previous\s+instructions", re.IGNORECASE),
    re.compile(r"system\s+prompt", re.IGNORECASE),
    re.compile(r"<script", re.IGNORECASE),
]


def validate_text(
    value: str,
    *,
    field_name: str,
    max_length: int = MAX_TEXT_LENGTH,
) -> str:
    if value is None:
        raise ValidationError(f"{field_name} is required")

    cleaned = " ".join(str(value).split())
    if not cleaned:
        raise ValidationError(f"{field_name} cannot be empty")

    if len(cleaned) > max_length:
        raise ValidationError(
            f"{field_name} exceeds {max_length} characters"
        )

    for pattern in SUSPICIOUS_PATTERNS:
        if pattern.search(cleaned):
            raise ValidationError(
                f"{field_name} contains unsafe prompt content"
            )

    return cleaned


def validate_text_list(
    values: list[str],
    *,
    field_name: str,
    max_items: int = 50,
) -> list[str]:
    if not values:
        raise ValidationError(f"{field_name} cannot be empty")

    if len(values) > max_items:
        raise ValidationError(f"{field_name} exceeds {max_items} items")

    return [
        validate_text(value, field_name=field_name)
        for value in values
    ]
