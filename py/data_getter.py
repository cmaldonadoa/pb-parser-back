
import sys
import json

from parser import Parser, Rule, Packet

file_path = sys.argv[1]
rules = json.loads(sys.argv[2])


def parse_rule(d):
    rule_filters = []

    for i, rfilter in enumerate(d["filters"]):
        parser = Parser(file_path)
        parser.include(*rfilter["entities"])

        if rfilter["scope"] == "space":
            parser.on_space(rfilter["space"])

        for constraint in sorted(rfilter["constraints"], key=lambda x: x["index"]):
            rule = Rule(constraint["id"])
            if constraint["on"] == "TYPE":
                rule.on_type()

            if constraint["type"] == "pset":
                rule.on_pset(constraint["pset"])
            elif constraint["type"] == "location":
                rule.on_location()

            rule.set_op(constraint["operation"])
            rule.look(constraint["attribute"])
            rule.expect(constraint.get("values"))
            parser.add_rule(rule)

        packets = parser.search()
        rule_filters.append(packets)

    return rule_filters


class ParserEnconde(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, set):
            return list(o)

        if isinstance(o, Packet):
            return {"guid": o.guid, "values": o.vals}

        return super().default(o)


result = []
for r in rules:
    rule_filters = parse_rule(r)
    result.append(rule_filters)

print(json.dumps(result, cls=ParserEnconde))
