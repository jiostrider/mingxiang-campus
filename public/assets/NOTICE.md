# Asset sources and licenses

Downloaded and processed locally on 2026-10-08. Runtime assets are served from this project, without remote CDN requests.

## Characters and animation

Source: [Microsoft Rocketbox](https://github.com/microsoft/Microsoft-Rocketbox), copyright (c) 2020 Microsoft, **MIT**. The complete license is included in `characters/LICENSE.md` and must accompany distribution.

- `Male_Adult_02`: player, original `Assets/Avatars/Male_Adult_02/Export/Male_Adult_02.fbx`.
- `Male_Adult_01`, `Male_Adult_04`: NPC variants, corresponding avatar Export FBX files.
- Idle, walking and running clips: the repository's `Assets/Animations/` idle-breathe, neutral-walk and neutral-run clips.

The supplied FBX and TGA assets were converted to GLB with 1024px textures. Horizontal root motion was removed because the game controls world movement. Material groups were consolidated and unused vertices stripped from each primitive. Skin roots were corrected to the common ancestor of all joints to preserve leg and torso binding. Each character retains its 81-bone skeleton. These are generic people, not portraits of actual university students or final campus-specific characters.

Rebuild: `tools/prepare-character-textures.py`, `tools/convert-characters.mjs` (automatically runs `tools/fix-skin-roots.mjs`), `tools/fix-root-motion.mjs`, then `tools/compact-characters.mjs`. Original FBX and texture inputs are under `references/character-review/source/`.

## Surface textures and daylight environment

Source: [Poly Haven](https://polyhaven.com/), **CC0**, [license](https://polyhaven.com/license). Maps are the original 1K JPEG diffuse, OpenGL normal and roughness maps. The environment is a 1K HDR.

| Asset | Use | Source |
| --- | --- | --- |
| concrete_floor_01 | South plaza aggregate | https://polyhaven.com/a/concrete_floor_01 |
| beige_wall_001 | Smooth pale facade surface approximation | https://polyhaven.com/a/beige_wall_001 |
| concrete_layers_02 | Foundation | https://polyhaven.com/a/concrete_layers_02 |
| asphalt_02 | Roads and dark plaza bands | https://polyhaven.com/a/asphalt_02 |
| clay_roof_tiles | Roof tiles | https://polyhaven.com/a/clay_roof_tiles |
| grass_ground | Ground cover | https://polyhaven.com/a/grass_ground |
| kloofendal_48d_partly_cloudy | Environment illumination and reflections | https://polyhaven.com/a/kloofendal_48d_partly_cloudy |
| concrete_floor_02, sandstone_blocks_04 | Earlier material candidates; not used in the current scene | https://polyhaven.com/ |

Scanned maps supply surface response and grain; they are not scans of this campus. The displayed sky is a procedural shader. Campus photographs and reports under `references/online-review/` are references for reconstruction and are not included as game textures.
