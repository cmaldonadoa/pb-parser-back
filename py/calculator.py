from abc import ABC, abstractmethod
import re

# Custom list


class mList(list):
    def __sub__(self, o):
        if len(self) != len(o):
            raise Exception("Lengths mismatch")
        return mList(a - b for a, b in zip(self, o))

# Abstract classes


class ISolver(ABC):
    @abstractmethod
    def solve(self, data):
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
    def __init__(self, name):
        self.p = name
        self.meta = dict()

    def __repr__(self):
        return f"#{self.p}"

    def solve(self, data):
        self.meta = data["meta"][self.p]
        return Set(data["map"][self.p])


class Variable(ISolver):
    def __init__(self, name):
        self.name = name

    def __repr__(self):
        return f"${self.name}"

    def solve(self, data):
        return Set(data["vars"][self.name])


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
        return f"{self.p}.\\text{{{self.attribute}}}"

    def solve(self, data):
        v_list = mList()
        for p in data["map"][self.p]:
            v = mList(p.get_value(self.attribute))
            v_list += v
        return v_list


class AttributeList(ISolver):
    def __init__(self, p, attribute):
        self.p = p
        self.attribute = attribute

    def __repr__(self):
        return f"\\text{{{self.attribute}}}"

    def solve(self, data):
        return mList(p.get_value(self.attribute) for p in data["map"][self.p])


class InNumber(ISolver):
    def __init__(self, p, n):
        self.p = p
        self.n = n

    def __repr__(self):
        return str(self.n)

    def solve(self, data):
        return mList(self.n for _ in data["map"][self.p])


class InBool(ISolver):
    def __init__(self, p, v):
        self.p = p
        self.value = True if re.search("^T$", v, re.I) else False

    def __repr__(self):
        return str(self.value)[0]

    def solve(self, data):
        return mList(self.value for _ in data["map"][self.p])


# Concrete operators
class Union(Operator):
    def solve(self, data):
        return Set(self.a.solve(data) | self.b.solve(data))

    def __repr__(self):
        return f"({self.a} \\union {self.b})"


class Intersection(Operator):
    def solve(self, data):
        return Set(self.a.solve(data) & self.b.solve(data))

    def __repr__(self):
        return f"({self.a} \\intersect {self.b})"


class Difference(Operator):
    def solve(self, data):
        return Set(self.a.solve(data) - self.b.solve(data))

    def __repr__(self):
        return f"({self.a} - {self.b})"


class Division(Operator):
    def solve(self, data):
        a = self.a.solve(data)
        b = self.b.solve(data)
        return False if b == 0 else a / b

    def __repr__(self):
        return f"({self.a} / {self.b})"


class Equal(Operator):
    def solve(self, data):
        return self.a.solve(data) == self.b.solve(data)

    def __repr__(self):
        return f"{self.a} = {self.b}"


class NotEqual(Operator):
    def solve(self, data):
        return self.a.solve(data) != self.b.solve(data)

    def __repr__(self):
        return f"{self.a} \\neq {self.b}"


class Greater(Operator):
    def solve(self, data):
        return self.a.solve(data) > self.b.solve(data)

    def __repr__(self):
        return f"{self.a} > {self.b}"


class Lesser(Operator):
    def solve(self, data):
        return self.a.solve(data) < self.b.solve(data)

    def __repr__(self):
        return f"{self.a} < {self.b}"


class GreaterEq(Operator):
    def solve(self, data):
        a = self.a.solve(data)
        b = self.b.solve(data)
        if type(a) != type(b) and (type(a) == mList or type(a) == Set):
            mB = mList(b for _ in range(len(a)))
            return all(mList(x >= y for x, y in zip(a, mB)))

        return a >= b

    def __repr__(self):
        return f"{self.a} \\geq {self.b}"


class LesserEq(Operator):
    def solve(self, data):
        return self.a.solve(data) <= self.b.solve(data)

    def __repr__(self):
        return f"{self.a} \\leq {self.b}"


class InAdd(Operator):
    def solve(self, data):
        return mList(a + b for a, b in zip(self.a.solve(data), self.b.solve(data)))

    def __repr__(self):
        return f"({self.a} + {self.b})"


class InSub(Operator):
    def solve(self, data):
        return mList(a - b for a, b in zip(self.a.solve(data), self.b.solve(data)))

    def __repr__(self):
        return f"({self.a} - {self.b})"


class InMultiply(Operator):
    def solve(self, data):
        return mList(a * b for a, b in zip(self.a.solve(data), self.b.solve(data)))

    def __repr__(self):
        return f"({self.a} * {self.b})"


class InDivision(Operator):
    def solve(self, data):
        return mList(False if b == 0 else a / b for a, b in zip(self.a.solve(data), self.b.solve(data)))

    def __repr__(self):
        return f"({self.a} / {self.b})"


class InEqual(Operator):
    def solve(self, data):
        return all(mList(a == b for a, b in zip(self.a.solve(data), self.b.solve(data))))

    def __repr__(self):
        return f"{self.a} = {self.b}"


class InNotEqual(Operator):
    def solve(self, data):
        return all(mList(a != b for a, b in zip(self.a.solve(data), self.b.solve(data))))

    def __repr__(self):
        return f"{self.a} \\neq {self.b}"


class InGreater(Operator):
    def solve(self, data):
        return all(mList(a > b for a, b in zip(self.a.solve(data), self.b.solve(data))))

    def __repr__(self):
        return f"{self.a} > {self.b}"


class InLesser(Operator):
    def solve(self, data):
        return all(mList(a < b for a, b in zip(self.a.solve(data), self.b.solve(data))))

    def __repr__(self):
        return f"{self.a} < {self.b}"


class InGreaterEq(Operator):
    def solve(self, data):
        return all(mList(a >= b for a, b in zip(self.a.solve(data), self.b.solve(data))))

    def __repr__(self):
        return f"{self.a} \\geq {self.b}"


class InLesserEq(Operator):
    def solve(self, data):
        return all(mList(a <= b for a, b in zip(self.a.solve(data), self.b.solve(data))))

    def __repr__(self):
        return f"{self.a} \\leq {self.b}"


class Or(Operator):
    def solve(self, data):
        return self.a.solve(data) or self.b.solve(data)

    def __repr__(self):
        return f"{self.a} \\vee {self.b}"


class And(Operator):
    def solve(self, data):
        return self.a.solve(data) and self.b.solve(data)

    def __repr__(self):
        return f"{self.a} \\wedge {self.b}"


class Then(Operator):
    def solve(self, data):
        if self.a.solve(data):
            return self.b.solve(data)
        return True

    def __repr__(self):
        return f"({self.a} \\ \\rightarrow \\  {self.b})"


class For(Operator):
    def solve(self, data):
        r = mList()
        for a, b in zip(self.a.solve(data), self.b.solve(data)):
            if b:
                r.append(a)
        return r

    def __repr__(self):
        return f"({self.a} \\ : \\  {self.b})"


class In(Operator):
    def solve(self, data):
        b = self.b.solve(data)
        return mList(map(lambda x: x in b, self.a.solve(data)))

    def __repr__(self):
        return f"({self.a} \\ \\in \\  {self.b})"


class Cross(Operator):
    def solve(self, data):
        b = self.b.solve(data)
        c = mList()
        for a in self.a.solve(data):
            c.append(mList(map(lambda x: x == a, b)))

        return c

    def __repr__(self):
        return f"({self.a} \\ \\times \\  {self.b})"


class As(Operator):
    def solve(self, data):
        for a, b in zip(self.a.solve(data), self.b.solve(data)):
            t = []
            for x, y in zip(a, b):
                t.append(x and y)

            if t != b:
                return False
        return True

    def __repr__(self):
        return f"{{{self.a} \\ \\sim \\  {self.b}}}"


class Multiply(Operator):
    def solve(self, data):
        A = self.a.solve(data)
        B = self.b.solve(data)

        return mList(mList(sum(a * b for a, b in zip(A_row, B_col))
                           for B_col in zip(*B))
                     for A_row in A)

    def __repr__(self):
        return f"({self.a} \\cdot {self.b})"


# Concrete functions
class Cardinality(Function):
    def solve(self, data):
        return len(self.a.solve(data))

    def __repr__(self):
        return f"|{self.a}|"


class Sumatory(Function):
    def solve(self, data):
        return sum(self.a.solve(data))

    def __repr__(self):
        return f"\\Sigma{{({self.a})}}"


class Distance(Function):
    def solve(self, data):
        try:
            return self.a.solve(data).meta["distance"]
        except:
            return float("inf")

    def __repr__(self):
        return f"d({self.a})"


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

        funcs = {"sum": Sumatory, "count": Cardinality, "dist": Distance}

        return {
            "arg": string[l_pos + 1:r_pos],
            "func": funcs[re.findall(r'\w+(?=\()', string[:l_pos + 1])[0]]
        }

    @staticmethod
    def _parse_internal_func(string):

        if not re.search('^#\w+\[.*\]$', string):
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

        # CASE BOOL
        if re.search('^t|f$', string, re.I):
            return InBool(set_name, string)

        # CASE ATTRIBUTE
        if re.search('^\w+$', string):
            return Attribute(set_name, string)

        # CASE ATTRIBUTE LIST
        if re.search('^\w+(,\s\w+)*$', string):
            return AttributeList(set_name, string.split(", "))

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
            [" for ", For],
            [" in ", In],
            [" as ", As],
            [" x ", Cross],
            [" * ", Multiply],
        ]

        def is_valid(arg):
            cond1 = arg.count("(") != arg.count(")")
            cond2 = arg.count("[") != arg.count("]")
            cond3 = arg.find("(") > arg.find(")")
            cond4 = arg.find("[") > arg.find("]")
            return not (cond1 or cond2 or cond3 or cond4)

        for op_str, op_class in ops:
            args = string.split(op_str)
            if len(args) == 2:
                l = args[0]
                r = args[1]

                if not is_valid(l) or not is_valid(r):
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
                            arg1 = Calculator._parse_formula(arg)

                    else:
                        if partial1:
                            partial2 = arg

                            if arg1:
                                if not is_valid(partial1 + op_str + partial2):
                                    partial1 = partial1 + op_str + partial2
                                    partial2 = None

                                else:
                                    arg2 = Calculator._parse_formula(
                                        partial1 + op_str + partial2)
                                    arg1 = op_class(arg1, arg2)
                                    arg2 = None
                            else:
                                if not is_valid(partial1 + op_str + partial2):
                                    partial1 = partial1 + op_str + partial2
                                else:
                                    if partial1 + op_str + partial2 == string:
                                        break
                                    arg1 = Calculator._parse_formula(
                                        partial1 + op_str + partial2)
                                    partial1 = None

                            partial2 = None

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
        if re.search('^#\w+$', string):
            return NamedSet(string[1:])

        # CASE VARIABLE
        if re.search('^$\w+$', string):
            return Variable(string[1:])

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
    def solve(formula, data, metadata, variables):
        solver = Calculator.parse(formula)
        return solver.solve({"map": data, "meta": metadata, "vars": variables})

    @staticmethod
    def parse(formula):
        return Calculator._parse_formula(formula)
