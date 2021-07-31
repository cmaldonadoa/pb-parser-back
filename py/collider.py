import ifcopenshell
import ifcopenshell.geom as geom
import trimesh

settings = ifcopenshell.geom.settings()
settings.set(settings.USE_WORLD_COORDS, True)


def create_mesh(entity):
    shape = geom.create_shape(settings, entity)
    verts = shape.geometry.verts
    faces = shape.geometry.faces
    tm_verts = []
    tm_faces = []

    for i in range(0, int(len(verts)), 3):
        tm_verts.append([verts[i], verts[i+1], verts[i+2]])

    for i in range(0, int(len(faces)), 3):
        tm_faces.append([faces[i], faces[i+1], faces[i+2]])

    return trimesh.Trimesh(vertices=tm_verts, faces=tm_faces, process=False)


class Collider:
    def __init__(self):
        self.manager = trimesh.collision.CollisionManager()

    def add(self, *ifc_objects):
        for entity in ifc_objects:
            mesh = create_mesh(entity)
            self.manager.add_object(entity.GlobalId, mesh)
        return self

    def check(self, ifc_object):
        mesh = create_mesh(ifc_object)
        return self.manager.in_collision_single(mesh, return_names=True)
