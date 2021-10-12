
import sys
import json

from parser import Parser, Rule, Packet

file_path = sys.argv[1]
rules = json.loads(sys.argv[2])


def parse_rule(d):
    rule_filters = []

    for rfilter in d["filters"]:
        parser = Parser(file_path)
        parser.include(*rfilter["entities"])
        parser.on_spaces(rfilter["spaces"])

        for constraint in sorted(rfilter["constraints"], key=lambda x: x["index"]):
            rule = Rule(constraint["id"])
            if constraint["on"] == "TYPE":
                rule.on_type()

            if constraint["type"] == "PSET_QTO":
                rule.on_pset(constraint["pset"])
            elif constraint["type"] == "LOCATION":
                rule.on_location()

            rule.set_op(constraint["operation"])
            rule.look(constraint["attribute"])
            rule.expect(constraint.get("values"))
            parser.add_rule(rule)

        packets, min_distance = parser.search()
        rule_filters.append(({"filter": rfilter["id"], "packets": packets}, min_distance))

    return rule_filters


class ParserEnconde(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, set):
            return list(o)

        if isinstance(o, Packet):
            return {"guid": o.id, "values": o._vals}

        return super().default(o)


result = []
for r in rules:
    rule_filters = parse_rule(r)
    result.append((r["id"], rule_filters))

print(json.dumps(result, cls=ParserEnconde))
