from calculator import Calculator
import sys
import json

formula = sys.argv[1]
rule_meta = json.loads(sys.argv[2])
filter_map = json.loads(sys.argv[3])
vars = json.loads(sys.argv[4])


class Packet:
    def __init__(self, guid) -> None:
        self.guid = guid
        self.vals = dict()

    def __hash__(self) -> int:
        return hash(self.guid)

    def __eq__(self, o: object) -> bool:
        if isinstance(object, Packet):
            return self.guid == o.guid
        return self.guid == o

    def __ne__(self, o: object) -> bool:
        return not self.__eq__(o)

    def __repr__(self) -> str:
        return "P-" + str(self.guid)

    def add_value(self, name: str, value) -> None:
        self.vals[name] = value

    def get_value(self, name: str):
        if name in self.vals.keys():
            return self.vals[name]
        return None


class ParserEnconde(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, set):
            return list(o)

        if isinstance(o, Packet):
            return {"guid": o.guid, "values": o.vals}

        return super().default(o)


real_map = {}
for k in filter_map:
    packets = filter_map[k]
    new_packets = set()
    for packet in packets:
        name_id = packet['guid'].split("_")
        p = Packet(int(name_id[1]))
        for attribute in packet:
            if attribute != 'guid':
                p.add_value(attribute, packet[attribute])
        new_packets.add(p)
    real_map[k] = new_packets

solution = Calculator.solve(formula, real_map, rule_meta, vars)

print(json.dumps(solution, cls=ParserEnconde))
