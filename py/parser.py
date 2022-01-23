from enum import Enum
import re

import ifcopenshell
import ifcopenshell.util
import ifcopenshell.geom
import ifcopenshell.entity_instance as IfcEntity
from ifcopenshell.util.selector import Selector
import ifcopenshell.util.element as IOSElement

from collider import Collider


selector = Selector()


class On(Enum):
    ENTITY = 0
    TYPE = 1


class Mode(Enum):
    DEFAULT = 0
    PSET = 1
    LOCATION = 2


class Scope(Enum):
    GLOBAL = 0
    CONTAINER = 1


class Space(Enum):
    ALL = 0
    BOUNDS = 1
    INSIDE = 2


container_kw = ["#LAST_STOREY"]


class Rule:
    def __init__(self, id):
        self.id = id
        self.on = On.ENTITY
        self.mode = Mode.DEFAULT
        self.pset = ""
        self.attribute = ""
        self.value = ""
        self.op = ""

    def on_type(self):
        self.on = On.TYPE
        return self

    def on_pset(self, pset):
        self.mode = Mode.PSET
        self.pset = pset
        return self

    def on_location(self):
        self.mode = Mode.LOCATION
        return self

    def set_op(self, op):
        self.op = op
        return self

    def look(self, value):
        self.attribute = value
        return self

    def expect(self, value):
        self.value = value
        return self


class Packet:
    def __init__(self, element):
        self.guid = element.id()
        self.type = element.is_a()
        self._vals = dict()

    def __hash__(self):
        return hash(self.guid)

    def __eq__(self, o):
        if isinstance(object, Packet):
            return self.guid == o.guid
        return self.guid == o

    def __ne__(self, o):
        return not self.__eq__(o)

    def __repr__(self):
        return {"guid": self.guid, "values": self._vals}.__repr__()

    def __str__(self):
        return {"guid": self.guid, "values": self._vals}

    def add_value(self, name, value):
        self._vals[name] = value

    def get_value(self, name):
        if name in self._vals.keys():
            return self._vals[name]
        return None


class Parser:
    def __init__(self, path):
        self._file = ifcopenshell.open(path)
        self._scope = Scope.GLOBAL
        self._space_mode = Space.ALL
        self._containers = []
        self._all_elements = []
        self._partial_elements = []
        self._rules = []

    # Public methods
    def include(self, *ifc_entities):
        temp = set()
        for ifc_entity in ifc_entities:
            elements = self._file.by_type(ifc_entity)
            temp |= set(elements)

        self._all_elements = [{"ifc": e} for e in temp]
        return self

    def exclude(self, *ifc_entities):
        temp = set()
        for ifc_entity in ifc_entities:
            elements = self._file.by_type(ifc_entity)
            temp |= set(elements)

        self._all_elements = list(filter(lambda e: e["ifc"] not in temp, self._all_elements))
        return self

    def contained_in(self, names, mode=Space.ALL):
        if bool(names):
            self._scope = Scope.CONTAINER
            self._containers = names
            self._space_mode = mode
        return self

    def add_rule(self, rule):
        self._rules.append(rule)
        return self

    def search(self):
        if len(self._rules) == 0:
            return self._error()

        for rule in self._rules:
            if self._scope == Scope.CONTAINER:
                space_names = filter(lambda x: x not in container_kw, self._containers)
                query = " | ".join(map(lambda x: f'.IfcSpace[LongName *= "{x}"]', space_names))
                spaces = selector.parse(self._file, query) if query else []
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

                    def func1(element, ifc_element):
                        return self._search_pset_entity(
                            rule.id, element, rule.pset, rule.attribute, rule.value, rule.op) if rule.mode == Mode.PSET and rule.on == On.ENTITY else self._search_pset_type(
                            rule.id, ifc_element, element, rule.pset, rule.attribute, rule.value, rule.op) if rule.mode == Mode.PSET and rule.on == On.TYPE else self._search_location(
                            rule.id, element, rule.attribute, rule.value, rule.op) if rule.mode == Mode.LOCATION else self._search_default(
                            rule.id, ifc_element, element, rule.attribute, rule.value, rule.op)

                    if self._space_mode == Space.ALL or self._space_mode == Space.BOUNDS:
                        def func2(x):
                            return func1(*find_ifc_element(
                                element=x)) if x in ifc_elements else None

                        def func3(x):
                            return func2(
                                getattr(x, "RelatedBuildingElement", None))

                        def func4(x):
                            return search_iter(x, func3)

                        def func5(x):
                            return func4(getattr(x, "BoundedBy", []))

                        func5(space)

                    if self._space_mode == Space.ALL or self._space_mode == Space.INSIDE:
                        collider = Collider()
                        collider.add(*ifc_elements)
                        collision = collider.contained_in(space)
                        if collision[0]:
                            for guid in collision[1]:
                                func1(*find_ifc_element(guid=guid))

                if "#LAST_STOREY" in self._containers:
                    storeys = self._file.by_type("IfcBuildingStorey")
                    last_storey = max(storeys, key=lambda x: self._get_location(x)[2])
                    query = f"@ #{last_storey.GlobalId}"
                    contained_elements = selector.parse(self._file, query)
                    for element in filter(lambda x: x["ifc"] in contained_elements, self._all_elements):
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

        collider = Collider()
        packets = []
        for x in self._all_elements:
            p = Packet(x["ifc"])
            if x["ifc"].is_a("IfcProduct"):
                collider.add(x["ifc"])
            for k in x:
                if k != "ifc":
                    p.add_value(k, x[k])
            packets.append(p)

        return set(packets), collider.get_min_distance()

    # Private methods
    def _keep(self, element, attribute, value):
        if type(value) == IfcEntity:
            value = value.id()

        if type(value) == list or type(value) == tuple:
            value = list(map(lambda x: x.id(), value))
        element[attribute] = value
        self._partial_elements.append(element)

    def _solve(self, op, arg1, arg2):
        def equal_compare(a, b):
            arr = []
            for e in b:
                if type(e) == str:
                    arr.append(re.search(str(e), str(a)))
                else:
                    try:
                        arr.append(float(a) == float(e))
                    except:
                        arr.append(a == b)
            return any(arr)

        def notequal_compare(a, b):
            arr = []
            for e in b:
                if type(e) == str:
                    arr.append(not re.search(str(e), str(a)))
                else:
                    try:
                        arr.append(float(a) != float(e))
                    except:
                        arr.append(a != b)
            return any(arr)

        def wildcard_compare(a, b, fn):
            arr = []
            for e in b:
                try:
                    arr.append(fn(float(a), float(e)))
                except:
                    arr.append(fn(a, b))
            return any(arr)

        ops = {
            "EQUAL": lambda a, b: equal_compare(a, b),
            "NOT_EQUAL": lambda a, b: notequal_compare(a, b),
            "GREATER": lambda a, b: wildcard_compare(a, b, lambda x, y: x > y),
            "LESSER": lambda a, b: wildcard_compare(a, b, lambda x, y: x < y),
            "GREATER_EQUAL": lambda a, b: wildcard_compare(a, b, lambda x, y: x >= y),
            "LESSER_EQUAL": lambda a, b: wildcard_compare(a, b, lambda x, y: x <= y),
            "EXISTS": lambda a: bool(str(a)),
            "NOT_EXISTS": lambda a: not bool(str(a)),
        }
        unary = ["EXISTS", "NOT_EXISTS"]

        if type(arg1) == list or type(arg1) == tuple:
            return len(arg1) > 0
        return ops[op](*(arg1,) if op in unary else (arg1, arg2))

    def _search_default(
            self, id, ifc_element, element, attribute, value, op):
        this_value = getattr(ifc_element, attribute, None)
        this_value = str(this_value) if type(
            this_value) is bool else this_value
        if this_value is not None and self._solve(op, this_value, value):
            self._keep(element, str(id), this_value)

    def _get_location(self, element):
        def sum_tuples(t1, t2): return tuple(map(lambda x, y: x + y, t1, t2))

        placement = element.ObjectPlacement
        g_coords = (0, 0, 0)
        while bool(placement):
            coords = placement.RelativePlacement.Location.Coordinates
            g_coords = sum_tuples(g_coords, coords)
            placement = placement.PlacementRelTo

        return g_coords

    def _get_height(self, element, use_global=True):
        settings = ifcopenshell.geom.settings()
        settings.set(settings.USE_WORLD_COORDS, use_global)
        settings.set(settings.CONVERT_BACK_UNITS, True)
        shape = ifcopenshell.geom.create_shape(settings, element)
        points = shape.geometry.verts
        return max(points[2::3])

    def _search_location(
            self, id, element, attribute, value,
            op):

        location = self._get_location(element["ifc"])
        gheight = self._get_height(element["ifc"])
        this_value = {"x": location[0], "y": location[1], "z": location[2], "h": gheight}[attribute]
        if self._solve(op, this_value, value):
            self._keep(element, str(id), this_value)

    def _search_pset_entity(
            self, id, element, pset, attribute, value, op):
        psets = IOSElement.get_psets(element["ifc"])
        for pset_name in psets:
            if re.search(pset, pset_name):
                attributes = psets[pset_name]
                attributes_names = dict()
                for name in attributes:
                    attributes_names[name.strip()] = name
                if attribute in attributes_names:
                    this_value = attributes[attributes_names[attribute]]
                    this_value = str(this_value) if type(
                        this_value) is bool else this_value
                    if self._solve(op, this_value, value):
                        self._keep(element, str(id), this_value)
                elif op == "NOT_EXISTS":
                    self._keep(element, str(id), None)
                break

    def _search_pset_type(self, id, ifc_element, element, pset, attribute,
                          value, op):
        psets = IOSElement.get_psets(ifc_element)
        for pset_name in psets:
            if re.search(pset, pset_name):
                attributes = psets[pset_name]
                attributes_names = dict()
                for name in attributes:
                    attributes_names[name.strip()] = name
                if attribute in attributes_names:
                    this_value = attributes[attributes_names[attribute]]
                    this_value = str(this_value) if type(
                        this_value) is bool else this_value
                    if self._solve(op, this_value, value):
                        self._keep(element, str(id), this_value)
                elif op == "NOT_EXISTS":
                    self._keep(element, str(id), None)
                break

    def _error(self):
        pass
