
from calculator import Calculator
import sys
import os
import json

from parser import Parser, Rule

path = sys.argv[1]


def log(array):
    for packet in array:
        guid = packet.guid
        name = packet.name
        desc = packet.description
        ifc_class = packet.type
        print(f"[{guid}] {ifc_class} {name} - {desc}")


def parse_rule(d):
    name = d["name"]
    formula = d["formula"]
    filter_map = dict()

    for i, rfilter in enumerate(d["filters"]):
        parser = Parser(path)
        parser.include(*rfilter["entities"])

        if rfilter["scope"] == "space":
            parser.on_space(rfilter["space"])

        for constraint in rfilter["constraints"]:
            rule = Rule()
            if constraint["on"] == "type":
                rule.on_type()

            if constraint["type"] == "pset":
                rule.on_pset(constraint["pset"])
            elif constraint["type"] == "location":
                rule.on_location()

            rule.set_op(constraint["operation"])
            rule.look(constraint["attribute"])
            rule.expect(constraint.get("value"))

            parser.add_rule(rule)

        result = parser.search()
        filter_map[f"p{i}"] = result

    repr, solution = Calculator.solve(formula, filter_map)
    return (name, solution)


class SetEncode(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, set):
            return list(o)

        return super().default(o)


with open(f"{os.getcwd()}/rules.json", "r") as json_file:
    rules = json.load(json_file)
    result = dict()
    for r in rules:
        name, solution = parse_rule(r)
        result[name] = solution

    print(json.dumps(result, cls=SetEncode))
