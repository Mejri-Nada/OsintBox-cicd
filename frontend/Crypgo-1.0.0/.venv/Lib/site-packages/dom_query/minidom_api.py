from xml.dom.minidom import Element
from .symbols import OP

#  api is a dict which map OP codes to functions.
#  Every function takes arguments according to the
#  opcode implemented and returns a function suitable
#  to be used as a filter on minidom Elements.
api = {}


def implement(opcode):
    """Helper decorator to populate `api`"""
    def api_set(impl):
        api[opcode] = impl
        return impl
    return api_set


@implement(OP.TAGNAME)
def tag_equal(name):
    """Create a filter to check whether an element has the
    tag type equal to `name`
    """
    def f(elem):
        return elem.tagName == name
    return f


@implement(OP.ID)
def id_equal(name):
    """Create a filter to check whether an element has the
    id equal to `name`
    """
    def f(elem):
        return (elem.hasAttribute("id") and
                elem.getAttribute("id") == name)
    return f


@implement(OP.ATTR_PRESENCE)
def has_attribute(name):
    """Create a filter to check whether an element has the
    attribute `name` set
    """
    def f(elem):
        return elem.hasAttribute(name)
    return f


@implement(OP.ATTR_EXACTLY)
def attribute_equal(name, string):
    """Create a filter to check whether an element has the
    attribute `name` set to `string`
    """
    def f(elem):
        return (elem.hasAttribute(name) and
                elem.getAttribute(name) == string)
    return f


@implement(OP.ATTR_WORD)
def attribute_word(name, word):
    """Create a filter to check whether an element has the
    attribute `name` containing the word `string`
    """
    def f(elem):
        return (elem.hasAttribute(name) and
                word in elem.getAttribute(name).split())
    return f


@implement(OP.ATTR_PREFIX)
def attribute_starts(name, string):
    """Create a filter to check whether an element has the
    attribute `name` starting with `string`
    """
    def f(elem):
        return (elem.hasAttribute(name) and
                elem.getAttribute(name).startswith(string))
    return f


@implement(OP.ATTR_BEGIN)
def attribute_begins(name, string):
    """Create a filter to check whether an element has the
    attribute `name` starting with `string` or `string-`
    """
    def f(elem):
        if not elem.hasAttribute(name):
            return False
        value = elem.getAttribute(name)
        return (value.startswith(string) or
                value.startswith(f"{string}-"))
    return f


@implement(OP.ATTR_SUFFIX)
def attribute_ends(name, string):
    """Create a filter to check whether an element has the
    attribute `name` ending with `string`
    """
    def f(elem):
        return (elem.hasAttribute(name) and
                elem.getAttribute(name).endswith(string))
    return f


@implement(OP.ATTR_SUBSTRING)
def attribute_contains(name, string):
    """Create a filter to check whether an element has the
    attribute `name` containing `string`
    """
    def f(elem):
        return (elem.hasAttribute(name) and
                string in elem.getAttribute(name))
    return f


@implement(OP.CLASSES)
def has_classes(classes):
    """Create a filter to check whether an element has
    every class in `classes` set
    """
    def f(elem):
        return (elem.hasAttribute("class") and
                classes.issubset(elem.getAttribute("class").split()))
    return f


@implement(OP.DESCENDANT)
def combinator_descendant(nodes):
    """Create a generator which yield every descending Element
    of every node in `nodes` in nodes->document order
    """
    for node in nodes:
        yield from recurse_descendant(node.childNodes)


def recurse_descendant(nodes):
    """Helper function for `combinator_descendant`"""
    for node in nodes:
        if isinstance(node, Element):
            yield node
        yield from recurse_descendant(node.childNodes)


@implement(OP.CHILDREN)
def combinator_children(nodes):
    """Create a generator which yield every child Element
    of every node in `nodes`
    """
    for node in nodes:
        for elem in node.childNodes:
            if isinstance(elem, Element):
                yield elem


@implement(OP.SIBLING_NEXT)
def combinator_adjacent(nodes):
    """Create a generator which yield every direct right sibling Element
    of every node in `nodes`
    """
    for node in nodes:
        sibling = node.nextSibling
        while sibling is not None and not isinstance(sibling, Element):
            sibling = sibling.nextSibling
        if sibling is not None:
            yield sibling


@implement(OP.SIBLING_SUBSEQUENT)
def combinator_sibling(nodes):
    """Create a generator which yield every right sibling Element
    of every node in `nodes`
    """
    # Document type (no parent) is not handled since this
    # combinator is meaningless on the document root
    for node in nodes:
        after_elem = False
        for elem in node.parentNode.childNodes:
            if not isinstance(elem, Element):
                continue
            if after_elem:
                yield elem
            if elem.isSameNode(node):
                after_elem = True
