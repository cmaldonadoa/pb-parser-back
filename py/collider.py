import ifcopenshell
import ifcopenshell.geom as geom
import trimesh
import trimesh.collision
import math
import sys

settings = ifcopenshell.geom.settings()
settings.set(settings.USE_WORLD_COORDS, True)


def _create_mesh(entity):
    try:
        shape = geom.create_shape(settings, entity)
        verts = shape.geometry.verts
        faces = shape.geometry.faces
        tm_verts = []
        tm_faces = []

        for i in range(0, int(len(verts)), 3):
            tm_verts.append([verts[i], verts[i+1], verts[i+2]])

        for i in range(0, int(len(faces)), 3):
            tm_faces.append([faces[i], faces[i+1], faces[i+2]])

        return trimesh.Trimesh(vertices=tm_verts, faces=tm_faces, process=False, metadata={"guid": entity.GlobalId})
    except:
        return None


class Collider:
    def __init__(self):
        self.manager = trimesh.collision.CollisionManager()
        self.meshes = []

    def add(self, *ifc_objects):
        for entity in ifc_objects:
            mesh = _create_mesh(entity)
            if not mesh or len(mesh.faces) == 0:
                continue
            self.meshes.append(mesh)
            self.manager.add_object(entity.GlobalId, mesh)
        return self

    def contained_in(self, entity):
        mesh = _create_mesh(entity)
        if not mesh:
            return False
        collisions = set()
        for other_mesh in self.meshes:
            contains = mesh.contains(other_mesh.vertices)
            if any(contains):
                collisions.add(other_mesh.metadata["guid"])

        if len(collisions) > 0:
            return (True, collisions)
        return self.manager.in_collision_single(mesh, return_names=True)

    def get_min_distance(self):
        dist = self.manager.min_distance_internal()
        if not dist:
            return 0

        if dist == sys.float_info.max:
            return 0

        return dist

    def get_distance(self, i, j):
        return math.dist(self.meshes[i], self.meshes[j])

    def get_intersections(self):
        return self.manager.in_collision_internal(return_names=True)
