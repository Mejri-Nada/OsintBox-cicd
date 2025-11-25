from .lexer import lexer
from .parser import parse
from .symbols import SYM, OP

#  Map to convert parser symbols to op codes
sym_code_map = {
    SYM.TYPE:           OP.TAGNAME,
    SYM.HASH:           OP.ID,
    SYM.HASATTRIB:      OP.ATTR_PRESENCE,
    SYM.EQUAL:          OP.ATTR_EXACTLY,
    SYM.INCLUDES:       OP.ATTR_WORD,
    SYM.DASHMATCH:      OP.ATTR_BEGIN,
    SYM.PREFIXMATCH:    OP.ATTR_PREFIX,
    SYM.SUFFIXMATCH:    OP.ATTR_SUFFIX,
    SYM.SUBSTRINGMATCH: OP.ATTR_SUBSTRING,
    SYM.CLASS:          OP.CLASSES,  # todo: remove?
    SYM.S:              OP.DESCENDANT,
    SYM.GREATER:        OP.CHILDREN,
    SYM.PLUS:           OP.SIBLING_NEXT,
    SYM.TILDE:          OP.SIBLING_SUBSEQUENT,
}

# Module level cache for compiled queries
_cache = {}


def compile(source):
    """
    Compile `source` into a sequence of opcodes (see `_compile_gen`)
    and cache the result for subsequent calls.

    Return the sequence of opcodes and relative arguments.
    """
    if source not in _cache:
        tokens = lexer(source)
        ast = parse(tokens)
        code = _compile_gen(ast)
        _cache[source] = tuple(code)

    return _cache[source]


def _compile_gen(ast):
    """
    Convert the AST in a sequence of calls to opcodes.

    Every opcode represents a relatively simple action and is
    accompanied by its arguments (if needed) as an iterable.
    """
    for selector in ast:
        yield (OP.RESET, )

        for combinator, simple_selector in selector:
            yield (sym_code_map[combinator], )

            classes = set()

            for sym, *args in simple_selector:
                if sym == SYM.UNIVERSAL:
                    continue
                elif sym == SYM.CLASS:
                    classes.add(args[0])
                else:
                    yield (sym_code_map[sym], args)

            if classes:
                yield (OP.CLASSES, (classes, ))

        yield (OP.YIELD, )
