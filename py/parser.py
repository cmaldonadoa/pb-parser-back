from __future__ import annotations
from typing import List, Union
from enum import Enum
import re

import ifcopenshell
import ifcopenshell.util
import ifcopenshell.entity_instance as IfcEntity
from ifcopenshell.util.selector import Selector
import ifcopenshell.util.element as IOSElement

from collider import Collider


selector = Selector()
ValueType = Union[str, int, float, None]


class On(Enum):
    ENTITY = 0
    TYPE = 1


class Mode(Enum):
    DEFAULT = 0
    PSET = 1
    LOCATION = 2


class Scope(Enum):
    GLOBAL = 0
    SPACE = 1


class Space(Enum):
    ALL = 0
    BOUNDS = 1
    INSIDE = 2


class Rule:
    def __init__(self) -> None:
        self.on = On.ENTITY
        self.mode = Mode.DEFAULT
        self.pset = ""
        self.attribute = ""
        self.value = ""
        self.op = ""

    def on_type(self) -> Rule:
        self.on = On.TYPE
        return self

    def on_pset(self, pset: str) -> Rule:
        self.mode = Mode.PSET
        self.pset = pset
        return self

    def on_location(self) -> Rule:
        self.mode = Mode.LOCATION
        return self

    def set_op(self, op: str) -> Rule:
        self.op = op
        return self

    def look(self, value: str) -> Rule:
        self.attribute = value
        return self

    def expect(self, value: ValueType) -> Rule:
        self.value = value
        return self


class Packet:
    def __init__(self, element: IfcEntity) -> None:
        self.guid = element.GlobalId
        self.type = element.is_a()
        self.description = element.Description
        self.name = element.Name

    def __hash__(self) -> int:
        return hash(self.guid)

    def __eq__(self, o: object) -> bool:
        return self.guid == o.guid

    def __ne__(self, o: object) -> bool:
        return not self.__eq__(o)

    def __repr__(self) -> str:
        return "P-" + str(self.guid)


class Parser:
    def __init__(self, path: str) -> None:
        self._file = ifcopenshell.open(path)
        self._scope = Scope.GLOBAL
        self._space_mode = Space.ALL
        self._space = ""
        self._all_elements = []
        self._partial_elements = []
        self._rules = []

    # Public methods
    def include(self, *ifc_entities: str) -> Parser:
        for ifc_entity in ifc_entities:
            self._all_elements += self._file.by_type(ifc_entity)
        return self

    def on_space(self, name: str, mode: str = "all") -> Parser:
        self._scope = Scope.SPACE
        self._space = name
        if mode == "all":
            self._space_mode = Space.ALL
        if mode == "bounds":
            self._space_mode = Space.BOUNDS
        if mode == "inside":
            self._space_mode = Space.INSIDE
        return self

    def add_rule(self, rule: Rule) -> Parser:
        self._rules.append(rule)
        return self

    def search(self) -> List[Packet]:
        if len(self._rules) == 0:
            return self._error()

        for rule in self._rules:
            if self._scope == Scope.SPACE:
                spaces = selector.parse(self._file, f'.IfcSpace[LongName = "{self._space}"]')
                if len(spaces) > 0:
                    space = spaces[0]

                    def search_iter(element, next):
                        found = False
                        for i in element:
                            step = next(i)
                            found = bool(step)
                            if found:
                                break
                        return found

                    def func1(x): return self._search_pset(
                        x, rule.pset, rule.attribute, rule.value, rule.op) if self.mode == Mode.PSET else self._search_location(
                        x, rule.attribute, rule.value, rule.op) if self.mode == Mode.LOCATION else self._search_default(
                        x, rule.attribute, rule.value, rule.op)

                    if self._space_mode == Space.ALL or self._space_mode == Space.BOUNDS:
                        def func2(x): return func1(x) if x in self._all_elements else None
                        def func3(x): return func2(getattr(x, "RelatedBuildingElement", None))
                        def func4(x): return search_iter(x, func3)
                        def func5(x): return func4(getattr(x, "BoundedBy", []))
                        func5(space)

                    if self._space_mode == Space.ALL or self._space_mode == Space.INSIDE:
                        collider = Collider
                        collider.add(*self._all_elements)
                        collision = collider.check(space)
                        if collision[0]:
                            for guid in collision[1]:
                                func1(self._file.by_guid(guid))

            else:
                for element in self._all_elements:
                    element = IOSElement.get_type(element) if rule.on == On.TYPE else element

                    if rule.mode == Mode.PSET:
                        self._search_pset(element, rule.pset, rule.attribute, rule.value, rule.op)

                    if rule.mode == Mode.DEFAULT:
                        self._search_default(element, rule.attribute, rule.value, rule.op)

                    if rule.mode == Mode.LOCATION:
                        self._search_location(element, rule.attribute, rule.value, rule.op)

            self._all_elements = self._partial_elements
            self._partial_elements = []

        return set([Packet(x) for x in self._all_elements])

    # Private methods
    def _keep(self, element: IfcEntity) -> None:
        self._partial_elements.append(element)

    def _solve(self, op: str, arg1: ValueType, arg2: ValueType) -> bool:
        ops = {
            "eq": lambda a, b: a == b,
            "neq": lambda a, b: a != b,
            "g": lambda a, b: a > b,
            "l": lambda a, b: a < b,
            "geq": lambda a, b: a >= b,
            "leq": lambda a, b: a <= b,
            "e": lambda a: bool(a),
            "ne": lambda a: not bool(a),
        }

        unary = ["e", "ne"]

        return ops[op](*(arg1,) if op in unary else (arg1, arg2))

    def _search_default(self, element: IfcEntity, attribute: str, value: ValueType, op: str) -> None:
        this_value = getattr(element, attribute, None)
        this_value = str(this_value) if type(this_value) is bool else this_value
        if this_value is not None and self._solve(op, this_value, value):
            self._keep(element)

    def _search_location(
            self, element: IfcEntity, attribute: str, value: ValueType,
            op: str) -> None:
        def sum_tuples(t1, t2): return tuple(map(lambda x, y: x + y, t1, t2))

        placement = element.ObjectPlacement
        g_coords = (0, 0, 0)
        while bool(placement):
            coords = placement.RelativePlacement.Location.Coordinates
            g_coords = sum_tuples(g_coords, coords)
            placement = placement.PlacementRelTo

        this_value = {"x": g_coords[0], "y": g_coords[1], "z": g_coords[2]}[attribute]
        if self._solve(op, this_value, value):
            self._keep(element)

    def _search_pset(
            self, element: IfcEntity, pset: str, attribute: str, value: ValueType, op: str) -> None:
        psets = IOSElement.get_psets(element)
        for pset_name in psets:
            if re.search(pset, pset_name):
                attributes = psets[pset_name]
                if attribute in attributes:
                    this_value = attributes[attribute]
                    this_value = str(this_value) if type(this_value) is bool else this_value
                    if self._solve(op, this_value, value):
                        self._keep(element)
                break

    def _error(self):
        pass
