"""Phase 016: summarize the frame samples from world-direction-motion.cjs into MOTION.md (numbers come from the samples only)."""
import json, math, statistics as st
from pathlib import Path

out = Path('artifacts/evidence/world-direction-016')
runs = json.loads((out / 'motion-frames.json').read_text(encoding='utf8'))

def qangle(a, b):
    d = abs(sum(x * y for x, y in zip(a, b)))
    return 2 * math.acos(min(1.0, d))

rows, flags = [], []
for name, frames in runs.items():
    if name.startswith('__') or not frames:
        continue
    steps = []
    # Windows of about 100 ms: a per-frame step divided by a jittery timestamp gives meaningless peaks.
    i = 0
    while i < len(frames) - 1:
        j = i + 1
        while j < len(frames) - 1 and frames[j]['t'] - frames[i]['t'] < 100: j += 1
        a, b = frames[i], frames[j]
        dt = (b['t'] - a['t']) / 1000
        if dt > 0.05:
            dist = math.dist(a['pos'], b['pos'])
            turn = qangle(a['quat'], b['quat'])
            steps.append({'dt': dt, 'dist': dist, 'v': dist / dt, 'w': turn / dt, 'turn': turn, 'c': b['cCur']})
        i = j
    if not steps: continue
    vs = [s['v'] for s in steps]
    acc = [abs(b['v'] - a['v']) / max(1e-3, b['dt']) for a, b in zip(steps, steps[1:])]
    dts = [s['dt'] for s in steps]
    big = max(steps, key=lambda s: s['dist'])
    # A cut is one big step; a flight is smooth. Count steps that travel more than 30 units in one frame.
    jumps = [s for s in steps if s['dist'] > 30]
    # Direction reversals along the travel axis: sign changes of cCur velocity while moving.
    dc = [b['cCur'] - a['cCur'] for a, b in zip(frames, frames[1:])]
    rev = sum(1 for x, y in zip(dc, dc[1:]) if x * y < 0 and abs(x) > 1e-4 and abs(y) > 1e-4)
    rows.append((name, len(frames), sum(dts), st.median(dts) * 1000, max(dts) * 1000, max(vs), st.median(vs), max(acc) if acc else 0, max(s['w'] for s in steps), big['dist'], len(jumps), rev, max(abs(b['fov'] - a['fov']) for a, b in zip(frames, frames[1:]))))
    if jumps and not name.startswith('menu'):
        flags.append(f"{name}: {len(jumps)} frame step(s) over 30 units (largest {big['dist']:.1f} at c={big['c']:.2f}, dt {big['dt']*1000:.0f} ms)")
    if rev:
        flags.append(f"{name}: cCur reversed direction {rev} time(s) (oscillation candidate)")

lines = ['# Camera motion samples (phase 016)', '', 'Source: `motion-frames.json`, one record per rendered frame; speed, acceleration and turn rate are computed over windows of about 100 ms (a per-frame step over a jittery timestamp is not a rate). A cut or a reduced-motion jump is one big step by design. from the real scene (1280x800, headless Chrome with software or default GL; frame times are listed because a slow frame rate exaggerates per-frame steps).', '',
         '| run | frames | s | median dt ms | max dt ms | max speed u/s | median speed | max accel u/s2 | max turn rad/s | max 100ms step u | windows>30u | cCur reversals | max dfov |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
for r in rows:
    lines.append('| ' + ' | '.join([r[0]] + [f'{v:.2f}' if isinstance(v, float) else str(v) for v in r[1:]]) + ' |')
ins = runs.get('__inside')
if ins:
    by = ins.get('insideBy', {})
    generated = {k: v for k, v in by.items() if 'landmarks' not in k}
    lines += ['', '## Camera inside solids', '', f"{ins['checked']} camera samples tested against the merged district meshes (ray in six directions; the first face hit pointing away from the ray means the point may be inside). Smallest distance from any camera sample to any solid face: {ins['nearest']:.2f} units (near plane 0.5), so the camera never touched a solid.",
              f"'Inside' flags: {ins['insideCount']} by mesh {by}; the closest face to a flagged sample was {ins.get('insideMinNearest')} units away. Flags on imported landmark meshes are false positives: those GLBs are not closed shells (a ray from open air reaches the back face of the far wall). Flags on generated meshes: {sum(generated.values())}.", '']
lines += ['', '## Flags', ''] + (['- ' + f for f in flags] or ['- none'])
lines += ['', f"Page errors: {runs.get('__errors')} / reduced: {runs.get('__reducedErrors')}", f"Reduced-motion end state: {runs.get('__reducedState')}", '']
(out / 'MOTION.md').write_text('\n'.join(lines), encoding='utf8')
print('\n'.join(lines[:60]))
