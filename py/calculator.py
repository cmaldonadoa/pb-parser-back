from abc import ABC, abstractmethod
import re


# Abstract classes
class ISolver(ABC):
    @abstractmethod
    def solve(self, literal_map):
        pass


class Operator(ISolver):
    def __init__(self, a, b):
        self.a = a
        self.b = b


class Function(ISolver):
    def __init__(self, a):
        self.a = a


# Leaf nodes
class Set(set, ISolver):
    def solve(self, _):
        return self


class NamedSet(ISolver):
    def __init__(self, p):
        self.p = p

    def __repr__(self):
        return f"{self.p[0].upper()}_{{{self.p[1:]}}}"

    def solve(self, literal_map):
        return Set(literal_map[self.p])


class EmptySet(ISolver):
    def __repr__(self):
        return "\\varnothing"

    def solve(self, _):
        return Set()


class Number(ISolver):
    def __init__(self, n):
        self.n = n

    def __repr__(self):
        return str(self.n)

    def solve(self, _):
        return self.n


class Attribute(ISolver):
    def __init__(self, p, attribute):
        self.p = p
        self.attribute = attribute

    def __repr__(self):
        return f"\\text{{{self.attribute}}}"

    def solve(self, literal_map):
        return [p[self.attribute] for p in literal_map[self.p]]


class InNumber(ISolver):
    def __init__(self, p, n):
        self.p = p
        self.n = n

    def __repr__(self):
        return str(self.n)

    def solve(self, literal_map):
        return [self.n for _ in literal_map[self.p]]


# Concrete operators
class Union(Operator):
    def solve(self, literal_map):
        return Set(self.a.solve(literal_map) & self.b.solve(literal_map))

    def __repr__(self):
        return f"({self.a} \\union {self.b})"


class Intersection(Operator):
    def solve(self, literal_map):
        return Set(self.a.solve(literal_map) | self.b.solve(literal_map))

    def __repr__(self):
        return f"({self.a} \\intersect {self.b})"


class Difference(Operator):
    def solve(self, literal_map):
        return Set(self.a.solve(literal_map) - self.b.solve(literal_map))

    def __repr__(self):
        return f"({self.a} - {self.b})"


class Division(Operator):
    def solve(self, literal_map):
        a = self.a.solve(literal_map)
        b = self.b.solve(literal_map)
        return False if b == 0 else a / b

    def __repr__(self):
        return f"({self.a} / {self.b})"


class Equal(Operator):
    def solve(self, literal_map):
        return self.a.solve(literal_map) == self.b.solve(literal_map)

    def __repr__(self):
        return f"{self.a} = {self.b}"


class NotEqual(Operator):
    def solve(self, literal_map):
        return self.a.solve(literal_map) != self.b.solve(literal_map)

    def __repr__(self):
        return f"{self.a} \\neq {self.b}"


class Greater(Operator):
    def solve(self, literal_map):
        return self.a.solve(literal_map) > self.b.solve(literal_map)

    def __repr__(self):
        return f"{self.a} > {self.b}"


class Lesser(Operator):
    def solve(self, literal_map):
        return self.a.solve(literal_map) < self.b.solve(literal_map)

    def __repr__(self):
        return f"{self.a} < {self.b}"


class GreaterEq(Operator):
    def solve(self, literal_map):
        return self.a.solve(literal_map) >= self.b.solve(literal_map)

    def __repr__(self):
        return f"{self.a} \\geq {self.b}"


class LesserEq(Operator):
    def solve(self, literal_map):
        return self.a.solve(literal_map) <= self.b.solve(literal_map)

    def __repr__(self):
        return f"{self.a} \\leq {self.b}"


class InAdd(Operator):
    def solve(self, literal_map):
        return [a + b for a, b in zip(self.a.solve(literal_map), self.b.solve(literal_map))]

    def __repr__(self):
        return f"({self.a} + {self.b})"


class InSub(Operator):
    def solve(self, literal_map):
        return [a - b for a, b in zip(self.a.solve(literal_map), self.b.solve(literal_map))]

    def __repr__(self):
        return f"({self.a} - {self.b})"


class InMultiply(Operator):
    def solve(self, literal_map):
        return [a * b for a, b in zip(self.a.solve(literal_map), self.b.solve(literal_map))]

    def __repr__(self):
        return f"({self.a} * {self.b})"


class InDivision(Operator):
    def solve(self, literal_map):
        return [False if b == 0 else a / b for a, b in zip(self.a.solve(literal_map), self.b.solve(literal_map))]

    def __repr__(self):
        return f"({self.a} / {self.b})"


class InEqual(Operator):
    def solve(self, literal_map):
        return all([a == b for a, b in zip(self.a.solve(literal_map), self.b.solve(literal_map))])

    def __repr__(self):
        return f"{self.a} = {self.b}"


class InNotEqual(Operator):
    def solve(self, literal_map):
        return all([a != b for a, b in zip(self.a.solve(literal_map), self.b.solve(literal_map))])

    def __repr__(self):
        return f"{self.a} \\neq {self.b}"


class InGreater(Operator):
    def solve(self, literal_map):
        return all([a > b for a, b in zip(self.a.solve(literal_map), self.b.solve(literal_map))])

    def __repr__(self):
        return f"{self.a} > {self.b}"


class InLesser(Operator):
    def solve(self, literal_map):
        return all([a < b for a, b in zip(self.a.solve(literal_map), self.b.solve(literal_map))])

    def __repr__(self):
        return f"{self.a} < {self.b}"


class InGreaterEq(Operator):
    def solve(self, literal_map):
        return all([a >= b for a, b in zip(self.a.solve(literal_map), self.b.solve(literal_map))])

    def __repr__(self):
        return f"{self.a} \\geq {self.b}"


class InLesserEq(Operator):
    def solve(self, literal_map):
        return all([a <= b for a, b in zip(self.a.solve(literal_map), self.b.solve(literal_map))])

    def __repr__(self):
        return f"{self.a} \\leq {self.b}"


class Or(Operator):
    def solve(self, literal_map):
        return self.a.solve(literal_map) or self.b.solve(literal_map)

    def __repr__(self):
        return f"{self.a} \\vee {self.b}"


class And(Operator):
    def solve(self, literal_map):
        return self.a.solve(literal_map) and self.b.solve(literal_map)

    def __repr__(self):
        return f"{self.a} \\wedge {self.b}"


class Then(Operator):
    def solve(self, literal_map):
        if self.a.solve(literal_map):
            return self.b.solve(literal_map)
        return True

    def __repr__(self):
        return f"({self.a} \\ \\rightarrow \\  {self.b})"


# Concrete functions
class SetCardinality(Function):
    def solve(self, literal_map):
        return len(self.a.solve(literal_map))

    def __repr__(self):
        return f"|{self.a}|"


class Sumatory(Function):
    def solve(self, literal_map):
        return sum(self.a.solve(literal_map))

    def __repr__(self):
        return f"\\Sigma{{({self.a})}}"  # f"\\sum_{{\\ }}^{{\\ }}{{({self.a})}}"


# Main class
class Calculator:
    @staticmethod
    def _strip_parentheses(string):

        if not re.search('^\(.*\)$', string):
            return string

        l_pos = 0
        r_pos = l_pos
        p_count = 0
        for i, char in enumerate(string[l_pos:]):
            if char == "(":
                p_count += 1
            elif char == ")":
                p_count -= 1

            if p_count == 0:
                r_pos += i
                break

        if r_pos == len(string) - 1:
            return string[1:-1]
        else:
            return string

    @staticmethod
    def _parse_func(string):

        if not re.search('^\w+\(.*\)$', string):
            return

        l_pos = string.index("(")
        r_pos = l_pos
        p_count = 0
        for i, char in enumerate(string[l_pos:]):
            if char == "(":
                p_count += 1
            elif char == ")":
                p_count -= 1

            if p_count == 0:
                r_pos += i
                break

        if r_pos < len(string) - 1:
            return

        funcs = {"sum": Sumatory, "count": SetCardinality}

        return {
            "arg": string[l_pos + 1:r_pos],
            "func": funcs[re.findall(r'\w+(?=\()', string[:l_pos + 1])[0]]
        }

    @staticmethod
    def _parse_internal_func(string):

        if not re.search('^\w+\[.*\]$', string):
            return

        l_pos = string.index("[")
        r_pos = l_pos
        p_count = 0
        for i, char in enumerate(string[l_pos:]):
            if char == "[":
                p_count += 1
            elif char == "]":
                p_count -= 1

            if p_count == 0:
                r_pos += i
                break

        if r_pos < len(string) - 1:
            return

        return {
            "arg": string[l_pos + 1:r_pos],
            "func": re.findall(r'\w+(?=\[)', string[:l_pos + 1])[0]
        }

    @staticmethod
    def _parse_internal_formula(set_name, string):
        string = Calculator._strip_parentheses(string)

        # CASE NUMBER
        if re.search('^\d+(\.\d+)?$', string):
            return InNumber(set_name, eval(string))

        # CASE ATTRIBUTE
        if re.search('^\w+$', string):
            return Attribute(set_name, string)

        # CASE INTERNAL OPERATION
        return Calculator._parse_internal_op(set_name, string)

    @staticmethod
    def _parse_internal_op(set_name, string):
        ops = [
            [" = ", InEqual],
            [" != ", InNotEqual],
            [" > ", InGreater],
            [" >= ", InGreaterEq],
            [" < ", InLesser],
            [" <= ", InLesserEq],
            [" * ", InMultiply],
            [" / ", InDivision],
            [" + ", InAdd],
            [" - ", InSub]
        ]

        for op_str, op_class in ops:
            args = string.split(op_str)
            if len(args) == 2:
                l = args[0]
                r = args[1]
                if l.count("(") != l.count(")") or r.count("(") != r.count(")"):
                    continue

                l_solved = Calculator._parse_internal_formula(set_name, l)
                r_solved = Calculator._parse_internal_formula(set_name, r)
                return op_class(l_solved, r_solved)

            elif len(args) > 2:
                arg1 = None
                arg2 = None
                partial1 = None
                partial2 = None
                for arg in args:
                    if arg.count("(") == arg.count(")"):
                        if partial1 and not partial2:
                            break

                        if arg1:
                            arg2 = Calculator._parse_internal_formula(set_name, arg)
                            arg1 = op_class(arg1, arg2)
                            arg2 = None
                            partial1 = None
                            partial2 = None
                        else:
                            arg1 = arg
                            arg1 = Calculator._parse_internal_formula(set_name, arg1)

                    else:
                        if partial1:
                            partial2 = arg
                            if arg1:
                                arg2 = Calculator._parse_internal_formula(set_name, partial1 + op_str + partial2)
                                arg1 = op_class(arg1, arg2)
                                arg2 = None
                                partial1 = None
                                partial2 = None
                            else:
                                arg1 = Calculator._parse_internal_formula(set_name, partial1 + op_str + partial2)

                        else:
                            partial1 = arg
                if arg1:
                    return arg1
            else:
                continue

    @staticmethod
    def _parse_external_op(string):
        ops = [
            [" = ", Equal],
            [" != ", NotEqual],
            [" > ", Greater],
            [" >= ", GreaterEq],
            [" < ", Lesser],
            [" <= ", LesserEq],
            [" - ", Difference],
            [" / ", Division],
            [" | ", Union],
            [" & ", Intersection],
            [" or ", Or],
            [" and ", And],
            [" then ", Then],
        ]

        for op_str, op_class in ops:
            args = string.split(op_str)
            if len(args) == 2:
                l = args[0]
                r = args[1]
                if l.count("(") != l.count(")") or r.count("(") != r.count(")"):
                    continue

                l_solved = Calculator._parse_formula(l)
                r_solved = Calculator._parse_formula(r)
                return op_class(l_solved, r_solved)

            elif len(args) > 2:
                arg1 = None
                arg2 = None
                partial1 = None
                partial2 = None
                for arg in args:
                    if arg.count("(") == arg.count(")"):
                        if partial1 and not partial2:
                            break

                        if arg1:
                            arg2 = Calculator._parse_formula(arg)
                            arg1 = op_class(arg1, arg2)
                            arg2 = None
                            partial1 = None
                            partial2 = None
                        else:
                            arg1 = arg
                            arg1 = Calculator._parse_formula(arg1)

                    else:
                        if partial1:
                            partial2 = arg
                            if arg1:
                                arg2 = Calculator._parse_formula(partial1 + op_str + partial2)
                                arg1 = op_class(arg1, arg2)
                                arg2 = None
                                partial1 = None
                                partial2 = None
                            else:
                                arg1 = Calculator._parse_formula(partial1 + op_str + partial2)

                        else:
                            partial1 = arg
                if arg1:
                    return arg1
            else:
                continue

    @staticmethod
    def _parse_formula(string):
        string = Calculator._strip_parentheses(string)

        # CASE NUMBER
        if re.search('^\d+(\.\d+)?$', string):
            return Number(eval(string))

        # CASE EMPTY SET
        if re.search('^empty$', string):
            return EmptySet()

        # CASE SET
        if re.search('^p\d+$', string):
            return NamedSet(string)

        # CASE FUNCTION
        f = Calculator._parse_func(string)
        if f:
            a = Calculator._parse_formula(f["arg"])
            return f["func"](a)

        # CASE INTERNAL FUNCTION
        f = Calculator._parse_internal_func(string)
        if f:
            return Calculator._parse_internal_formula(f["func"], f["arg"])

        # CASE EXTERNAL OPERATION
        return Calculator._parse_external_op(string)

    @staticmethod
    def solve(formula, literal_map):
        solver = Calculator.parse(formula)
        return solver.solve(literal_map)

    @staticmethod
    def parse(formula):
        return Calculator._parse_formula(formula)
