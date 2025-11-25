from .symbols import SYM

__all__ = ["parse", ]


def parse(tokens):
    """
    Parse a sequence of tokens and return its AST.

    The implementation is a descent parser which return the AST on success or
    raises `SyntaxError` on failure.

    The AST is just a tree of tuples with this form:

        - first level: selectors groups (selectors separated by commas),
        - second level: tuples of combinators and simple selectors,
        - third level: combinator and criteria (actual simple selectors),

    As an example the selector "p#summary[main] > a.hl, div div" becomes:

        (
          (
            (S,         ((TYPE, 'p'), (HASH, 'summary'), (HASATTRIB, 'main'))),
            (GREATER,   ((TYPE, 'a'), (CLASS, 'hl')))
          ),
          (
            (S, ((TYPE, 'div'),)),
            (S, ((TYPE, 'div'),))
          )
        )

    Every selector group starts with an implicit descendants combinator
    (symbol `S`) at this stage.
    """

    #  Symbol and value of the current token
    sym = value = None

    # Token control functions
    def advance():
        """Next token"""
        nonlocal sym, value
        sym, value = next(tokens)

    def accept(kind):
        """Next token if it match `kind`"""
        if sym == kind:
            advance()
            return True
        return False

    def expect(kind):
        """Next token and raise SyntaxError if it doesn't match `kind`"""
        if sym == kind:
            advance()
            return True
        raise SyntaxError(
            f"Expected token type ({kind}={kind:d})"
        )

    # Production rules
    def selector_group():
        """selector(, selector)+"""
        group = list()

        group.append(selector())
        while accept(SYM.COMMA):
            group.append(selector())

        return tuple(group)

    def selector():
        """(combinator simple_selector)+"""
        sequence = list()
        sequence.append((SYM.S, simple_selector()))
        while sym in SYM.combinators:
            combinator = sym
            advance()
            sequence.append((combinator, simple_selector()))

        return tuple(sequence)

    def simple_selector():
        """(criteria+)"""
        if sym not in (SYM.UNIVERSAL, SYM.IDENT,
                       SYM.HASH, SYM.CLASS, SYM.ATTRIBOPEN):
            raise SyntaxError("Expected a simple selector")

        criteria = []
        if sym == SYM.UNIVERSAL:
            criteria.append((SYM.UNIVERSAL, ))
            advance()
        elif sym == SYM.IDENT:
            criteria.append((SYM.TYPE, value.lower(), ))
            advance()

        while sym in (SYM.HASH, SYM.CLASS, SYM.ATTRIBOPEN):
            if sym == SYM.HASH or sym == SYM.CLASS:
                criteria.append((sym, value, ))
                advance()
            elif sym == SYM.ATTRIBOPEN:
                criteria.append(attrib())

        return tuple(criteria)

    def attrib():
        """attribute_name (operator value)?"""
        op = string = None

        expect(SYM.ATTRIBOPEN)

        accept(SYM.S)
        name = value.lower()
        expect(SYM.IDENT)
        accept(SYM.S)

        if sym in SYM.attribmatch:
            op = sym
            advance()
            accept(SYM.S)
            if sym == SYM.IDENT or sym == SYM.STRING:
                string = value
                advance()
            else:
                raise SyntaxError("String expected")
            accept(SYM.S)

        expect(SYM.ATTRIBCLOSE)

        if op is not None:
            return op, name, string,
        else:
            return SYM.HASATTRIB, name,

    # Run the parser
    advance()
    expect(SYM.START)
    ast = selector_group()
    expect(SYM.END)

    return ast
