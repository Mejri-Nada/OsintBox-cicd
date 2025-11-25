__all__ = ["SYM", "OP", ]


class NamedInt(int):
    """An int with a name for meaningful representation
    of parser symbols or opcodes
    """
    def __new__(cls, name, value):
        o = super().__new__(cls, value)
        o.name = name
        return o

    def __repr__(self):
        return self.name


class NameSpace(object):
    """Mimic `types.SimpleNameSpace`

    No useful `repr` function is implemented and the namespace
    is split in two halves:
        - uppercase names - all converted to `NamedInt`s,
        - everything else - treated normally.
    """
    def __setattr__(self, name, value):
        if name.isupper():
            self.__dict__[name] = NamedInt(name, value)
        else:
            self.__dict__[name] = value


# Symbols for the lexer and the parser
SYM = NameSpace()

(SYM.ATTRIBOPEN,     SYM.COMMA,
 SYM.ATTRIBCLOSE,    SYM.UNIVERSAL,
 SYM.EQUAL,          SYM.IDENT,
 SYM.INCLUDES,       SYM.HASH,
 SYM.DASHMATCH,      SYM.CLASS,
 SYM.PREFIXMATCH,    SYM.STRING,
 SYM.SUFFIXMATCH,    SYM.LETTER,
 SYM.SUBSTRINGMATCH, SYM.START,
 SYM.S,              SYM.END,
 SYM.PLUS,           SYM.HASATTRIB,
 SYM.GREATER,        SYM.TYPE,
 SYM.TILDE,
 ) = range(23)

# Combinators symbols at parser stage
SYM.combinators = (
    SYM.PLUS,
    SYM.GREATER,
    SYM.TILDE,
    SYM.S,
)

# Attributes match symbols at parser stage
SYM.attribmatch = (
    SYM.EQUAL,
    SYM.INCLUDES,
    SYM.DASHMATCH,
    SYM.PREFIXMATCH,
    SYM.SUFFIXMATCH,
    SYM.SUBSTRINGMATCH,
)


# Op codes for the compilation and execution level
OP = NameSpace()

(OP.TAGNAME,            OP.ATTR_PRESENCE,
 OP.ID,                 OP.ATTR_EXACTLY,
 OP.DESCENDANT,         OP.ATTR_WORD,
 OP.CHILDREN,           OP.ATTR_BEGIN,
 OP.SIBLING_NEXT,       OP.ATTR_PREFIX,
 OP.SIBLING_SUBSEQUENT, OP.ATTR_SUFFIX,
 OP.YIELD,              OP.ATTR_SUBSTRING,
 OP.RESET,              OP.CLASSES,
 ) = range(16)

# Combinators symbols at compilation stage
OP.combinators = {
    OP.DESCENDANT,
    OP.CHILDREN,
    OP.SIBLING_NEXT,
    OP.SIBLING_SUBSEQUENT,
}

# Attributes match symbols at compilation stage
OP.filters = {
    OP.TAGNAME,
    OP.ID,
    OP.ATTR_PRESENCE,
    OP.ATTR_EXACTLY,
    OP.ATTR_WORD,
    OP.ATTR_BEGIN,
    OP.ATTR_PREFIX,
    OP.ATTR_SUFFIX,
    OP.ATTR_SUBSTRING,
    OP.CLASSES,
}
