from __future__ import annotations
from typing import Any, List, Union
from enum import Enum
import re

import ifcopenshell
import ifcopenshell.util
import ifcopenshell.entity_instance as IfcEntity
from ifcopenshell.util.selector import Selector
import ifcopenshell.util.element as IOSElement

from collider import Collider


selector = Selector()
SingleValueType = Union[str, int, float, None]
ValueType = List[SingleValueType]


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
    def __init__(self, id: int) -> None:
        self.id = id
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
        self.guid = getattr(element, "GlobalId", element.is_a())
        self.type = element.is_a()
        self.description = element.Description
        self.name = element.Name
        self.vals = dict()

    def __hash__(self) -> int:
        return hash(self.guid)

    def __eq__(self, o: object) -> bool:
        return self.guid == o.guid

    def __ne__(self, o: object) -> bool:
        return not self.__eq__(o)

    def __repr__(self) -> str:
        return {"guid": self.guid, "values": self.vals}

    def __str__(self) -> str:
        return {"guid": self.guid, "values": self.vals}

    def add_value(self, name: str, value: ValueType) -> None:
        self.vals[name] = value

    def get_value(self, name: str) -> ValueType:
        return self.vals[name]


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
            elements = self._file.by_type(ifc_entity)
            self._all_elements += [{"ifc": e} for e in elements]
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
                spaces = selector.parse(
                    self._file, f'.IfcSpace[LongName *= "{self._space}"]')
                ifc_elements = [e["ifc"] for e in self._all_elements]

                for space in spaces:
                    def search_iter(element, next):
                        found = False
                        for i in element:
                            step = next(i)
                            found = bool(step)
                            if found:
                                break
                        return found

                    def find_ifc_element(element=False, guid=False):
                        if element:
                            for e in self._all_elements:
                                if e["ifc"] == element:
                                    entity = IOSElement.get_type(
                                        element) if rule.on == On.TYPE else element
                                    return (e, entity)
                        if guid:
                            for e in self._all_elements:
                                if e["ifc"].GlobalId == guid:
                                    entity = IOSElement.get_type(
                                        e["ifc"]) if rule.on == On.TYPE else e["ifc"]
                                    return (e, entity)
                        return []

                    def func1(element, ifc_element): return self._search_pset_entity(
                        rule.id, element, rule.pset, rule.attribute, rule.value, rule.op) if rule.mode == Mode.PSET and rule.on == On.ENTITY else self._search_pset(
                        rule.id, ifc_element, element, rule.pset, rule.attribute, rule.value, rule.op) if rule.mode == Mode.PSET and rule.on == On.TYPE else self._search_location(
                            rule.id, element, rule.attribute, rule.value, rule.op) if rule.mode == Mode.LOCATION else self._search_default(
                            rule.id, ifc_element, element, rule.attribute, rule.value, rule.op)

                    if self._space_mode == Space.ALL or self._space_mode == Space.BOUNDS:
                        def func2(x): return func1(*find_ifc_element(
                            element=x)) if x in ifc_elements else None
                        def func3(x): return func2(
                            getattr(x, "RelatedBuildingElement", None))

                        def func4(x): return search_iter(x, func3)
                        def func5(x): return func4(getattr(x, "BoundedBy", []))
                        func5(space)

                    if self._space_mode == Space.ALL or self._space_mode == Space.INSIDE:
                        collider = Collider()
                        collider.add(*ifc_elements)
                        collision = collider.contained_in(space)
                        if collision[0]:
                            for guid in collision[1]:
                                func1(*find_ifc_element(guid=guid))

            else:
                for element in self._all_elements:
                    entity = IOSElement.get_type(
                        element["ifc"]) if rule.on == On.TYPE else element["ifc"]

                    if rule.mode == Mode.PSET and rule.on == On.ENTITY:
                        self._search_pset_entity(
                            rule.id, element, rule.pset, rule.attribute, rule.value, rule.op)

                    if rule.mode == Mode.PSET and rule.on == On.TYPE:
                        self._search_pset_type(
                            rule.id, entity, element, rule.pset, rule.attribute, rule.value, rule.op)

                    if rule.mode == Mode.DEFAULT:
                        self._search_default(
                            rule.id, entity, element, rule.attribute, rule.value, rule.op)

                    if rule.mode == Mode.LOCATION:
                        self._search_location(
                            rule.id, element, rule.attribute, rule.value, rule.op)

            self._all_elements = self._partial_elements
            self._partial_elements = []

        packets = []
        for x in self._all_elements:
            p = Packet(x["ifc"])
            for k in x:
                if k != "ifc":
                    p.add_value(k, x[k])
            packets.append(p)

        return set(packets)

    # Private methods
    def _keep(self, element: dict, attribute: str, value: ValueType) -> None:
        element[attribute] = value
        self._partial_elements.append(element)

    def _solve(self, op: str, arg1: SingleValueType, arg2: ValueType) -> bool:
        ops = {
            "EQUAL": lambda a, b: any([re.search(str(e), str(a)) for e in b]),
            "NOT_EQUAL": lambda a, b: any([not re.search(str(e), str(a)) for e in b]),
            "GREATER": lambda a, b: any([a > e for e in b]),
            "LESSER": lambda a, b: any([a < e for e in b]),
            "GREATER_EQUAL": lambda a, b: any([a >= e for e in b]),
            "LESSER_EQUAL": lambda a, b: any([a <= e for e in b]),
            "EXISTS": lambda a: bool(a),
            "NOT_EXISTS": lambda a: not bool(a),
        }
        unary = ["EXISTS", "NOT_EXISTS"]

        return ops[op](*(arg1,) if op in unary else (arg1, arg2))

    def _search_default(
            self, id: int, ifc_element: IfcEntity, element: dict, attribute: str, value: ValueType, op: str) -> None:
        this_value = getattr(ifc_element, attribute, None)
        this_value = str(this_value) if type(
            this_value) is bool else this_value
        if this_value is not None and self._solve(op, this_value, value):
            self._keep(element, str(id), this_value)

    def _search_location(
            self, id: int, element: dict, attribute: str, value: ValueType,
            op: str) -> None:
        def sum_tuples(t1, t2): return tuple(map(lambda x, y: x + y, t1, t2))

        placement = element["ifc"].ObjectPlacement
        g_coords = (0, 0, 0)
        while bool(placement):
            coords = placement.RelativePlacement.Location.Coordinates
            g_coords = sum_tuples(g_coords, coords)
            placement = placement.PlacementRelTo

        this_value = {"x": g_coords[0], "y": g_coords[1], "z": g_coords[2]}[attribute]
        values = [f"^{str(val)}$" for val in value]
        if self._solve(op, this_value, values):
            self._keep(element, str(id), this_value)

    def _search_pset_entity(
            self, id: int, element: dict, pset: str, attribute: str, value: ValueType, op: str) -> None:
        psets = IOSElement.get_psets(element["ifc"])
        for pset_name in psets:
            if re.search(pset, pset_name):
                attributes = psets[pset_name]
                if attribute in attributes:
                    this_value = attributes[attribute]
                    this_value = str(this_value) if type(
                        this_value) is bool else this_value
                    if self._solve(op, this_value, value):
                        self._keep(element, str(id), this_value)
                break

    def _search_pset_type(self, id: int, ifc_element: IfcEntity, element: dict, pset: str, attribute: str,
                          value: ValueType, op: str) -> None:
        psets = ifc_element.HasPropertySets
        for pset_type in psets:
            pset_name = pset_type.is_a()
            if re.search(pset, pset_name):
                attribute = getattr(pset_type, attribute, None)
                if attribute:
                    this_value = str(attribute) if type(
                        attribute) is bool else attribute
                    if self._solve(op, this_value, value):
                        self._keep(element, str(id), this_value)
                break

    def _error(self):
        pass
