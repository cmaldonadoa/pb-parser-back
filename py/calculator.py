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
        return str(self.p)

    def solve(self, literal_map):
        return Set(literal_map[self.p])


class EmptySet(ISolver):
    def __repr__(self):
        return "∅"

    def solve(self, _):
        return Set()


class Number(ISolver):
    def __init__(self, n):
        self.n = n

    def __repr__(self):
        return str(self.n)

    def solve(self, _):
        return self.n


# Concrete operators
class Union(Operator):
    def solve(self, literal_map):
        return Set(self.a.solve(literal_map) & self.b.solve(literal_map))

    def __repr__(self):
        return f"({self.a} ∪ {self.b})"


class Intersection(Operator):
    def solve(self, literal_map):
        return Set(self.a.solve(literal_map) | self.b.solve(literal_map))

    def __repr__(self):
        return f"({self.a} ∩ {self.b})"


class Difference(Operator):
    def solve(self, literal_map):
        return Set(self.a.solve(literal_map) - self.b.solve(literal_map))

    def __repr__(self):
        return f"({self.a} - {self.b})"


class Equal(Operator):
    def solve(self, literal_map):
        return self.a.solve(literal_map) == self.b.solve(literal_map)

    def __repr__(self):
        return f"{self.a} = {self.b}"


class NotEqual(Operator):
    def solve(self, literal_map):
        return self.a.solve(literal_map) != self.b.solve(literal_map)

    def __repr__(self):
        return f"{self.a} ≠ {self.b}"


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
        return f"{self.a} ≥ {self.b}"


class LesserEq(Operator):
    def solve(self, literal_map):
        return self.a.solve(literal_map) <= self.b.solve(literal_map)

    def __repr__(self):
        return f"{self.a} ≤ {self.b}"


# Concrete functions
class SetCardinality(Function):
    def solve(self, literal_map):
        return len(self.a.solve(literal_map))

    def __repr__(self):
        return f"|{self.a}|"


class Sumatory(Function):
    def solve(self, _):
        pass

    def __repr__(self):
        return f"Σ({self.a})"


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

        funcs = {"sum": Sumatory, "count": SetCardinality}

        return {
            "start": l_pos,
            "end": r_pos,
            "arg": string[l_pos + 1:r_pos],
            "func": funcs[re.findall(r'\w+(?=\()', string[:l_pos + 1])[0]]
        }

    @staticmethod
    def _parse_op(string):
        ops = [
            [" = ", Equal],
            [" > ", Greater],
            [" >= ", GreaterEq],
            [" < ", Lesser],
            [" <= ", LesserEq],
            [" - ", Difference],
            [" | ", Union],
            [" & ", Intersection],
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

        # CASE LITERAL
        if re.search('^p\d+$', string):
            return NamedSet(string)

        # CASE FUNCTION
        f = Calculator._parse_func(string)
        if f:
            a = Calculator._parse_formula(f["arg"])
            return f["func"](a)

        # CASE OPERATION
        return Calculator._parse_op(string)

    @staticmethod
    def solve(formula, literal_map):
        solver = Calculator._parse_formula(formula)
        return (solver, solver.solve(literal_map))
