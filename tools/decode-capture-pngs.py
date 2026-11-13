"""Read-only full-PNG decode comparison. Report must be a new path outside inputs."""
import argparse
import hashlib
import json
import struct
import subprocess
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', required=True)
parser.add_argument('pngs', nargs='+')
args = parser.parse_args()
rows = []
for name in args.pngs:
    path = Path(name).resolve()
    data = path.read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    ihdr = list(struct.unpack('>II', data[16:24]))
    with Image.open(path) as image:
        image.load()
        size = list(image.size)
        pixels = image.convert('RGB').tobytes()
    command = ['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    decoded = subprocess.run(command, capture_output=True, check=True)
    assert decoded.stdout == pixels, name
    assert size == ihdr, name
    digest = hashlib.sha256(data).hexdigest()
    sidecar_path = path.with_suffix('.json')
    sidecar = json.loads(sidecar_path.read_bytes()) if sidecar_path.exists() else None
    if sidecar and 'png' in sidecar:
        assert sidecar['png']['sha256'] == digest
        assert sidecar['png']['bytes'] == len(data)
        assert sidecar['png']['dimensions'] == dict(zip(['width', 'height'], size))
    rows.append(dict(path=str(path), bytes=len(data), sha256=digest,
        ihdr=ihdr, pillowSize=size, decodedBytes=len(pixels),
        decodedRGBSha256=hashlib.sha256(pixels).hexdigest(), ffmpegCommand=command,
        ffmpegExitCode=decoded.returncode, ffmpegStderr=decoded.stderr.decode(),
        independentDecodersAgree=True,
        sidecarSha256=hashlib.sha256(sidecar_path.read_bytes()).hexdigest() if sidecar else None,
        sidecarValid=sidecar.get('valid') if sidecar else None))
report = dict(scope='Original full PNG bytes, read-only; decode agreement is not game/pixel parity.',
    pillowVersion=Image.__version__, rows=rows)
with open(args.output, 'x') as handle:
    json.dump(report, handle, indent=2)
    handle.write('\n')
print(json.dumps(dict(output=args.output, decoded=len(rows), allAgree=True)))
