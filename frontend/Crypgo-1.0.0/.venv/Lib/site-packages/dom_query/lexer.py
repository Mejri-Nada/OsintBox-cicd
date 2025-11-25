"""
Lexical scanner loosely based on the one described in
`https://www.w3.org/TR/selectors-3/#lex`.

There are major differences as the regexes have been simplified and
only a subset of tokens are recognized.

The `S` symbol represents much less than the original one.
Attributes operators and combinators consumes all the spaces around
the tokens.
This allows to write simpler parser rules and a smaller lexer but
code behavior isn't always trivial.
"""

from .symbols import SYM
import re

__all__ = ["lexer", ]

nmstart   = f"[_a-z]"
nmchar    = f"[_a-z0-9-]"
ident     = f"[-]?{nmstart}{nmchar}*"
name      = f"{nmchar}+"
string1   = f'"(?:[^"]|\\")*"'
string2   = f"'(?:[^']|\\')*'"
string    = f"{string1}|{string2}"
w         = f"[ \t\r\n\f]*"
s         = f"[ \t\r\n\f]+"

SPLIT_RE = re.compile(rf"""
(
    (?:{w}[~|^$*]?={w})|   # Attr match
    (?:{w}[+>,~]{w})|      # Combinator
    (?:{s})|               # Space
    (?P<ident>{ident})|    # Identifier
    (?:{string})|          # Quoted string
    (?:\#{name})|          # Hash id
    (?:\.{ident})|         # Class
    (?:.)                  # Other
)
""", re.VERBOSE | re.IGNORECASE)

# Map to convert simple tokens to symbol
literal = {
    "[":    SYM.ATTRIBOPEN,
    "]":    SYM.ATTRIBCLOSE,
    "=":    SYM.EQUAL,
    "~=":   SYM.INCLUDES,
    "|=":   SYM.DASHMATCH,
    "^=":   SYM.PREFIXMATCH,
    "$=":   SYM.SUFFIXMATCH,
    "*=":   SYM.SUBSTRINGMATCH,
    "+":    SYM.PLUS,
    ">":    SYM.GREATER,
    "~":    SYM.TILDE,
    ",":    SYM.COMMA,
    "*":    SYM.UNIVERSAL,
    # `spaces` match against the empty string
    # because every token is stripped
    "":     SYM.S,
}


def lexer(source):
    """
    Split a string `source` in a sequence of tokens.

    A token is a 2-tuple of `(symbol type, value)`.
    The first usable token is always `START` and the last one is `END`,
    after that a `(None, None)` token is emitted as sentinel.

    `S` token is emitted only inside attributes selectors (to be ignored)
    and between simple selectors (where means descendant combinator).

    Classes and ID selectors are stripped of the first character.
    Quoted strings support simple escaping and are stripped of delimiters.
    Every unrecognized token is emitted as a sequence of `LETTER` tokens.
    """
    matches = SPLIT_RE.finditer(source)

    yield SYM.START, None

    for match in matches:
        token = match.group(0)

        stripped = token.strip()
        if stripped in literal:
            yield (literal[stripped], None)
            continue

        if match.group("ident"):
            yield (SYM.IDENT, token)
            continue

        if len(token) > 1:
            if token[0] == "#":
                yield (SYM.HASH, token[1:])
                continue

            if token[0] == ".":
                yield (SYM.CLASS, token[1:])
                continue

            if "'" == token[0] == token[-1]:
                yield (SYM.STRING, token[1:-1].replace("\\'", "'"))
                continue

            if '"' == token[0] == token[-1]:
                yield (SYM.STRING, token[1:-1].replace('\\"', '"'))
                continue

        if len(token) == 1:
            yield (SYM.LETTER, token)
            continue

        raise ValueError(f"Unrecognized token {token!r}")  # Should never happen

    yield (SYM.END, None)
    yield (None, None)
