import json
import sys
import ifcopenshell
from collider import Collider

file_path = sys.argv[1]
ifc_classes = ["IfcWall", "IfcBeam", "IfcSlab"]


def get_location(element):
    def sum_tuples(t1, t2): return tuple(map(lambda x, y: x + y, t1, t2))

    placement = element.ObjectPlacement
    g_coords = (0, 0, 0)
    while bool(placement):
        coords = placement.RelativePlacement.Location.Coordinates
        g_coords = sum_tuples(g_coords, coords)
        placement = placement.PlacementRelTo

    return g_coords


def check_intersections(path):
    file = ifcopenshell.open(path)
    c = Collider()
    elements = {}
    for ifc_class in ifc_classes:
        ifc_elements = file.by_type(ifc_class)
        for ifc_element in ifc_elements:
            elements[ifc_element.GlobalId] = ifc_element
            c.add(ifc_element)

    intersects, intersections = c.get_intersections()
    fduplicates = set()
    fintersections = set()

    if not intersects:
        return {"intersections": [], "duplicates": []}
    else:
        for guid1, guid2 in intersections:
            loc1 = get_location(elements[guid1])
            loc2 = get_location(elements[guid2])
            if loc1 == loc2 and elements[guid2].is_a(elements[guid1].is_a()):
                fduplicates.add(
                    (elements[guid1].is_a(), loc1, guid1, guid2)
                )
            else:
                fintersections.add((
                    (elements[guid1].is_a(), loc1, guid1),
                    (elements[guid2].is_a(), loc2, guid2)
                ))

        return {
            "intersections": list(fintersections),
            "duplicates": list(fduplicates)}


print(json.dumps(check_intersections(file_path)))
