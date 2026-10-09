"""Rebuild the editable Blender snapshot from the exact meshes used in the game."""
import bpy, json, base64, os, math
from mathutils import Matrix, Vector

root=os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(root,'campus-scene.json'),encoding='utf-8') as handle:
    data=json.load(handle)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
materials={}
texture_dir=os.path.join(root,'textures')
os.makedirs(texture_dir,exist_ok=True)
for mid,spec in data['materials'].items():
    mat=bpy.data.materials.new(spec['name']);mat.use_nodes=True
    shader=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
    if shader is None:
        shader=mat.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
        output=mat.node_tree.nodes.new('ShaderNodeOutputMaterial')
        mat.node_tree.links.new(shader.outputs[0],output.inputs[0])
    shader.inputs['Base Color'].default_value=(*spec['color'],1)
    shader.inputs['Roughness'].default_value=.8
    if spec['texture']:
        path=os.path.join(texture_dir,mid+'.png')
        with open(path,'wb') as image:
            image.write(base64.b64decode(spec['texture'].split(',',1)[1]))
        image=bpy.data.images.load(path);image.pack()
        tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
        tex.extension='REPEAT'
        coord=mat.node_tree.nodes.new('ShaderNodeTexCoord')
        mapping=mat.node_tree.nodes.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY'
        mapping.inputs[1].default_value=(spec['uScale'],spec['vScale'],1)
        mat.node_tree.links.new(coord.outputs['UV'],mapping.inputs[0])
        mat.node_tree.links.new(mapping.outputs[0],tex.inputs['Vector'])
        mat.node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color'])
        if spec['hasAlpha']:
            mat.node_tree.links.new(tex.outputs['Alpha'],shader.inputs['Alpha'])
            mat.surface_render_method='DITHERED'
    materials[mid]=mat

geometries={}
for gid,g in data['geometries'].items():
    p=g['positions'];idx=g['indices']
    vertices=[(p[i],p[i+1],p[i+2]) for i in range(0,len(p),3)]
    faces=[(idx[i],idx[i+2],idx[i+1]) for i in range(0,len(idx),3)]
    mesh=bpy.data.meshes.new('geometry-'+gid);mesh.from_pydata(vertices,[],faces);mesh.update()
    if g['uvs']:
        uv=mesh.uv_layers.new(name='UVMap');values=g['uvs']
        for loop in mesh.loops:
            j=loop.vertex_index*2
            if j+1<len(values):uv.data[loop.index].uv=(values[j],values[j+1])
    geometries[gid]=mesh

convert=Matrix(((1,0,0,0),(0,0,1,0),(0,1,0,0),(0,0,0,1)))
for spec in data['meshes']:
    mesh=geometries[str(spec['geometry'])]
    obj=bpy.data.objects.new(spec['name'],mesh);bpy.context.collection.objects.link(obj)
    vals=spec['matrix'];matrix=Matrix([[vals[c*4+r] for c in range(4)] for r in range(4)])
    obj.matrix_world=convert@matrix
    mat=materials[str(spec['material'])]
    if len(mesh.materials)==0:mesh.materials.append(mat)
    obj.material_slots[0].link='OBJECT';obj.material_slots[0].material=mat

scene=bpy.context.scene
scene.unit_settings.system='METRIC'
scene.world.color=(.5,.6,.7)
bpy.ops.object.light_add(type='SUN',location=(-100,-100,180))
sun=bpy.context.object;sun.name='下午阳光';sun.data.energy=2.5;sun.rotation_euler=(math.radians(28),math.radians(-24),math.radians(-30));sun.data.angle=math.radians(8)
bpy.ops.object.camera_add(location=(-93,-100,54))
camera=bpy.context.object;camera.name='校园鸟瞰';camera.rotation_euler=(Vector((8,87,22))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=28;camera.data.clip_end=3000;scene.camera=camera
scene.render.engine='CYCLES';scene.cycles.samples=32
scene.render.resolution_x=1440;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene['建模依据']='用户提供的校园示意图与 34 秒全景录屏；位置、尺寸和细节待实测校准。'
scene['源码']='src/world.js（校园） / src/actors.js（人物与自行车）'
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.clip_end=3000
        area.spaces.active.region_3d.view_distance=430
        area.spaces.active.region_3d.view_location=(0,15,0)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(root,'明向校园-首版.blend'))
print('BLENDER_SAVED',len(data['meshes']))
