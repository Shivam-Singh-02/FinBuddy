"""Local, deterministic redaction for statement text sent to language models."""

from __future__ import annotations

import re


REDACTED = "[REDACTED]"

_LABELED_PERSONAL_FIELDS = re.compile(
    r"(?im)^([ \t]*(?:cardholder(?:\s+name)?|cardmember(?:\s+name)?|"
    r"name\s+on\s+(?:card|account)|name|customer\s+name|account\s+holder|"
    r"billing\s+address|mailing\s+address|"
    r"residential\s+address|correspondence\s+address|address|phone|mobile|"
    r"telephone|email|e-mail|date\s+of\s+birth|dob)\s*[:#-]\s*).+$"
)

_LABELED_IDENTIFIERS = re.compile(
    r"(?i)\b((?:(?:credit|debit)\s+)?card\s*(?:number|no\.?|#)|"
    r"(?:bank\s+)?account\s*(?:number|no\.?|#)|a/c\s*(?:number|no\.?|#)|"
    r"acct\s*(?:number|no\.?|#)|customer\s*(?:id|number|no\.?|#)|"
    r"member\s*(?:id|number|no\.?|#)|reference\s*(?:id|number|no\.?|#)|"
    r"transaction\s*(?:id|reference|ref\.?|no\.?|#)|rrn|utr|ifsc|iban|swift|"
    r"routing\s*(?:number|no\.?|#)|upi\s*id|passport\s*(?:number|no\.?|#)|"
    r"aadhaar\s*(?:number|no\.?|#)|pan\s*(?:number|no\.?|#))\s*[:#-]\s*)"
    r"([^\r\n\t,;]{3,})"
)

_PATTERNS = (
    (_LABELED_PERSONAL_FIELDS, r"\1" + REDACTED),
    (_LABELED_IDENTIFIERS, r"\1" + REDACTED),
    # E-mail addresses and UPI IDs share the same local@provider form.
    (re.compile(r"(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\b"), REDACTED),
    (re.compile(r"(?i)\b(?:cvv2?|cvc2?|security\s+code|otp)\s*[:#-]?\s*\d{3,8}\b"), REDACTED),
    (re.compile(r"(?i)\b(?:expiry|expir(?:y|ation)|valid\s+thru|valid\s+through)\s*[:#-]?\s*(?:0?[1-9]|1[0-2])\s*[/.-]\s*(?:\d{2}|\d{4})\b"), REDACTED),
    (re.compile(r"(?i)\b(?:ending\s+(?:in|with)|last\s+(?:four|4)\s+(?:digits?\s*)?(?:are|is)?)\s*[:#-]?\s*\d{4}\b"), REDACTED),
    # Masked PANs such as XXXX XXXX XXXX 1234.
    (re.compile(r"(?i)(?<!\w)(?:[x*•]{4}[ -]*){2,4}\d{4}(?!\d)"), REDACTED),
    # Unmasked payment-card and Aadhaar-like digit sequences.
    (re.compile(r"(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)"), REDACTED),
    (re.compile(r"(?<!\d)\d{4}[ -]?\d{4}[ -]?\d{4}(?!\d)"), REDACTED),
    # India PAN and phone number formats.
    (re.compile(r"(?i)\b[A-Z]{5}\d{4}[A-Z]\b"), REDACTED),
    (re.compile(r"(?<!\d)(?:\+?91[ -]?)?[6-9]\d{4}[ -]?\d{5}(?!\d)"), REDACTED),
)


def redact_statement_text(statement_text: str) -> str:
    """Redact common personal and financial identifiers without external calls.

    Transaction dates, merchant labels, descriptions, and amounts are preserved
    unless a value matches one of the sensitive-identifier patterns above.
    """
    redacted = statement_text
    for pattern, replacement in _PATTERNS:
        redacted = pattern.sub(replacement, redacted)
    return redacted
