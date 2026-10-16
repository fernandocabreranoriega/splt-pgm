#!/usr/bin/env python3
"""Build an installable GNOME extension archive using only the stdlib."""
from pathlib import Path
import json
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
metadata = json.loads((root / 'extension/metadata.json').read_text())
destination = root / 'dist' / f'{metadata["uuid"]}.shell-extension.zip'
destination.parent.mkdir(exist_ok=True)
with ZipFile(destination, 'w', ZIP_DEFLATED) as archive:
    for name in ('metadata.json', 'extension.js', 'core.js'):
        archive.write(root / 'extension' / name, name)
    archive.write(root / 'LICENSE', 'LICENSE')
print(destination)

source = root / 'dist' / 'splt-pgm-0.1.0-source.zip'
with ZipFile(source, 'w', ZIP_DEFLATED) as archive:
    for name in ('README.md', 'CONTRIBUTING.md', 'LICENSE', 'package.json', '.gitignore'):
        archive.write(root / name, f'splt-pgm/{name}')
    for directory in ('extension', 'tests', 'tools'):
        for path in sorted((root / directory).rglob('*')):
            if path.is_file() and '__pycache__' not in path.parts:
                archive.write(path, f'splt-pgm/{path.relative_to(root)}')
print(source)
