"""Assemble Nook's demo reel: title cards and recorded scenes, 1080p30 H.264, silent."""
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).parent
SC = ROOT / 'scenes'
TI = ROOT / 'titles'
CLIPS = ROOT / 'clips'
CLIPS.mkdir(exist_ok=True)
OUT = pathlib.Path('/Users/lnu.ur/nook/reel/nook-demo-reel.mp4')
OUT.parent.mkdir(exist_ok=True)

ENC = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart']


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def title(name, seconds, fade_out=True):
    out = CLIPS / f'{name}.mp4'
    vf = f'fps=30,format=yuv420p,fade=t=in:st=0:d=0.3'
    if fade_out:
        vf += f',fade=t=out:st={seconds - 0.3:.2f}:d=0.3'
    run(['ffmpeg', '-y', '-loop', '1', '-t', str(seconds), '-i', str(TI / f'{name}.png'), '-vf', vf, *ENC, str(out)])
    return out, seconds


def scene(name, trim_start=0.0, trim_end=None, hold=0.6):
    """Frames arrive only when the page repaints, each with its own timestamp —
    so every frame is shown for exactly as long as it was on screen."""
    rows = [l.split() for l in (SC / name / 'times.txt').read_text().splitlines() if l.strip()]
    frames = [(SC / name / f, float(t)) for f, t in rows]
    t0 = frames[0][1]
    frames = [(f, t - t0) for f, t in frames]
    if trim_end is not None:
        frames = [(f, t) for f, t in frames if t <= trim_end]
    keep = [(f, t) for f, t in frames if t >= trim_start]
    before = [x for x in frames if x[1] < trim_start]
    if before:
        keep = [(before[-1][0], trim_start)] + keep
    lst = CLIPS / f'{name}.txt'
    lines, total = [], 0.0
    for i, (f, t) in enumerate(keep):
        d = (keep[i + 1][1] - t) if i + 1 < len(keep) else hold
        d = max(d, 1 / 120)
        lines += [f"file '{f}'", f'duration {d:.4f}']
        total += d
    lines.append(f"file '{keep[-1][0]}'")  # concat demuxer needs the last file twice
    lst.write_text('\n'.join(lines) + '\n')
    out = CLIPS / f'{name}.mp4'
    vf = f'fps=30,scale=1920:1080:flags=lanczos,format=yuv420p,fade=t=in:st=0:d=0.25,fade=t=out:st={total - 0.3:.2f}:d=0.3'
    run(['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', str(lst), '-vf', vf, *ENC, str(out)])
    return out, total


parts = [
    title('t0-intro', 3.4),
    title('t1', 2.6), scene('01-make-board', hold=0.8),
    title('t2', 2.6), scene('02-type-items'),
    title('t3', 2.6), scene('03-note-voice'),
    title('t4', 2.6), scene('04-aisle'),
    title('t5', 2.6), scene('05-tick', hold=0.4),
    # The website demo: from the moment sharing starts to the end of its loop.
    title('t6', 2.6), scene('06-share', trim_start=4.9, trim_end=16.2, hold=0.3),
    scene('07-site', hold=0.4),
    title('t7-outro', 4.6, fade_out=False),
]

listing = CLIPS / 'all.txt'
listing.write_text(''.join(f"file '{p}'\n" for p, _ in parts))
run(['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', str(listing), '-c', 'copy', '-movflags', '+faststart', str(OUT)])

# Timings for the voice-over script.
t = 0.0
for p, d in parts:
    print(f'{int(t // 60)}:{t % 60:05.2f}  {d:5.2f}s  {p.stem}')
    t += d
print(f'total {t:.1f}s  ->  {OUT}')
