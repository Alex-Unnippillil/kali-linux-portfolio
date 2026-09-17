"""One-time exact-byte transfer of the locally reviewed OS restoration.
Every input and output is SHA-256 checked; refuse drift rather than overwrite.
This script and its manifests are removed by the staging workflow after use.
"""
import hashlib
import json
from pathlib import Path

root = Path.cwd().resolve()
changes = []
for part in 'abcd':
    changes.extend(json.loads(Path(f'scripts/desktop-release-edits-{part}.json').read_text()))
outputs = []
for change in changes:
    name = change['path']
    path = root / name
    assert path.resolve().is_relative_to(root) and '.git' not in path.parts
    assert name.startswith(('components/', '__tests__/', 'tests/', 'pages/', 'utils/', 'lib/', 'docs/', '.github/workflows/')) or name in ('README.md', 'apps.config.js', 'jest.setup.ts')
    old = path.read_bytes() if path.exists() else None
    digest = hashlib.sha256(old).hexdigest() if old is not None else None
    assert digest == change['before'], f'Input changed: {name}'
    if change.get('delete'):
        outputs.append((path, None))
        continue
    if 'content' in change:
        new = change['content'].encode('utf-8')
    else:
        new = old
        previous_start = len(old) + 1
        for edit in reversed(change['edits']):
            start, end = edit['start'], edit['end']
            assert 0 <= start <= end <= len(old) and end <= previous_start
            new = new[:start] + edit['content'].encode('utf-8') + new[end:]
            previous_start = start
    assert hashlib.sha256(new).hexdigest() == change['after'], f'Output differs from reviewed source: {name}'
    outputs.append((path, new))
# Validate the entire batch before touching any source files.
for path, content in outputs:
    if content is None:
        path.unlink()
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
print(f'Applied {len(outputs)} verified file updates; no production branch modified.')
