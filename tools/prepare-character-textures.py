"""Convert the upstream TGA textures to browser-compatible local assets."""
from pathlib import Path
from PIL import Image

root=Path(__file__).resolve().parents[1]/'references'/'character-review'/'source'
for path in root.glob('*/*.tga'):
    image=Image.open(path)
    image.thumbnail((1024,1024),Image.Resampling.LANCZOS)
    if 'opacity' in path.name:
        image.save(path.with_suffix('.png'))
    else:
        image.convert('RGB').save(path.with_suffix('.jpg'),quality=92)
    print(path.name,image.size)
