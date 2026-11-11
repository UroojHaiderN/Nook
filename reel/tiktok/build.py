"""Nook TikTok: frames -> 1080x1920, 30 fps H.264, silent (add a sound in TikTok)."""
import pathlib, subprocess
ROOT = pathlib.Path(__file__).parent
FR = ROOT / 'frames'
OUT = pathlib.Path('/Users/lnu.ur/nook/reel/nook-tiktok.mp4')
SLOW = 3  # record.js ran the page this many times slower than real time

rows = [l.split() for l in (FR / 'times.txt').read_text().splitlines() if l.strip()]
frames = [(FR / f, float(t) / SLOW) for f, t in rows]
t0 = frames[0][1]
lines, total = [], 0.0
for i, (f, t) in enumerate(frames):
    d = (frames[i + 1][1] - t) if i + 1 < len(frames) else 0.5
    d = max(d, 1 / 240)
    lines += [f"file '{f}'", f'duration {d:.4f}']
    total += d
lines.append(f"file '{frames[-1][0]}'")
(ROOT / 'list.txt').write_text('\n'.join(lines) + '\n')
subprocess.run([
    'ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', str(ROOT / 'list.txt'),
    '-vf', 'fps=30,scale=1080:1920:flags=lanczos,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-r', '30', '-movflags', '+faststart', str(OUT),
], check=True)
print(f'{total:.1f}s -> {OUT}')
