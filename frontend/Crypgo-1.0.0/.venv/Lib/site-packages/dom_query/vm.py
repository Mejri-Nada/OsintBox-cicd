from .symbols import OP

__all__ = ["execute", ]


def execute(root, code, api):
    yielded = set()

    elements = None
    for opcode, *args in code:
        if opcode in OP.filters:
            elements = filter(api[opcode](*args[0]), elements)

        elif opcode in OP.combinators:
            elements = api[opcode](elements)

        elif opcode == OP.YIELD:
            for element in elements:
                if element not in yielded:
                    yielded.add(element)
                    yield element

        elif opcode == OP.RESET:
            elements = [root]

        else:
            raise NotImplemented
