#!/usr/bin/env python3
"""
Generates the launch video's music bed and sound effects from scratch (pure synthesis with
numpy), so every sound is original and licence-free. Run:  python scripts/make-audio.py
Writes WAV files to public/audio/.
"""
import os
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter, fftconvolve

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "audio")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)


def t(sec):
    return np.arange(int(sec * SR)) / SR


def lp(x, hz, order=2):
    b, a = butter(order, hz / (SR / 2), "low")
    return lfilter(b, a, x)


def hp(x, hz, order=2):
    b, a = butter(order, hz / (SR / 2), "high")
    return lfilter(b, a, x)


def env(n, a, r, sustain=1.0):
    e = np.ones(n) * sustain
    ai, ri = int(a * SR), int(r * SR)
    if ai:
        e[:ai] = np.linspace(0, sustain, ai)
    if ri:
        e[-ri:] *= np.linspace(1, 0, ri)
    return e


def reverb(x, secs=2.2, mix=0.28):
    n = int(secs * SR)
    ir = rng.standard_normal(n) * np.exp(-np.linspace(0, 6, n))
    ir = lp(ir, 5000)
    wet = fftconvolve(x, ir)[: len(x)]
    wet /= np.max(np.abs(wet)) + 1e-9
    return (1 - mix) * x + mix * wet * np.max(np.abs(x))


def save(name, x, peak=0.89):
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    stereo = np.stack([x, x], axis=1) if x.ndim == 1 else x
    wavfile.write(os.path.join(OUT, name), SR, (stereo * 32767).astype(np.int16))


def note(freq, dur, kind="pad"):
    tt = t(dur)
    if kind == "pad":
        sig = sum(np.sin(2 * np.pi * freq * d * tt + p) for d, p in [(1, 0), (1.003, 1.1), (0.997, 2.3)])
        sig += 0.35 * np.sin(2 * np.pi * freq * 2 * tt)
        return lp(sig, 1800) * env(len(tt), 1.2, 1.4, 0.9)
    if kind == "pluck":
        sig = np.sin(2 * np.pi * freq * tt) + 0.4 * np.sin(2 * np.pi * freq * 2 * tt) + 0.15 * np.sin(2 * np.pi * freq * 3 * tt)
        return sig * np.exp(-tt * 5.5)
    if kind == "sub":
        return np.sin(2 * np.pi * freq * tt) * np.exp(-tt * 3.0)


def music(total=60.0, bpm=96):
    out = np.zeros(int(total * SR))
    beat = 60 / bpm
    bar = beat * 4
    # Cmaj7 – Am7 – Fmaj7 – G6, warm and optimistic.
    chords = [[261.63, 329.63, 392.0, 493.88], [220.0, 261.63, 329.63, 392.0], [174.61, 220.0, 261.63, 329.63], [196.0, 246.94, 293.66, 329.63]]
    roots = [65.41, 55.0, 43.65, 49.0]
    arp = [0, 2, 1, 3, 2, 1, 3, 2]
    nbars = int(total / bar) + 1
    for b in range(nbars):
        start = int(b * bar * SR)
        ch = chords[b % 4]
        for f in ch:
            s = note(f, bar * 1.15, "pad") * 0.10
            end = min(len(out), start + len(s))
            out[start:end] += s[: end - start]
        # Bass pulse on beats 1 and 3 after the intro (from bar 2).
        if b >= 1:
            for k in (0, 2):
                s = note(roots[b % 4], beat * 1.5, "sub") * 0.35
                st = start + int(k * beat * SR)
                end = min(len(out), st + len(s))
                if st < len(out):
                    out[st:end] += s[: end - st]
        # Arpeggio plucks (eighths) from bar 3.
        if b >= 2:
            for k in range(8):
                f = ch[arp[k]] * 2
                s = note(f, beat * 1.2, "pluck") * 0.07
                st = start + int(k * beat / 2 * SR)
                end = min(len(out), st + len(s))
                if st < len(out):
                    out[st:end] += s[: end - st]
        # Soft hi-hat ticks from bar 4.
        if b >= 3:
            for k in range(8):
                n = int(0.04 * SR)
                s = hp(rng.standard_normal(n), 7000) * np.exp(-np.linspace(0, 8, n)) * (0.025 if k % 2 else 0.04)
                st = start + int(k * beat / 2 * SR)
                end = min(len(out), st + n)
                if st < len(out):
                    out[st:end] += s[: end - st]
    out = reverb(out, 2.4, 0.3)
    fade = env(len(out), 2.0, 3.0)
    return out * fade


def whoosh(dur=0.7):
    n = int(dur * SR)
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    # Sweep a band-pass by blending low-passed chunks with rising cutoff.
    chunks = 24
    for i in range(chunks):
        a, b = i * n // chunks, (i + 1) * n // chunks
        cutoff = 400 + (i / chunks) ** 1.5 * 6000
        out[a:b] = lp(noise, cutoff)[a:b]
    shape = np.sin(np.linspace(0, np.pi, n)) ** 2
    return hp(out, 200) * shape


def pop():
    tt = t(0.18)
    f = 900 * np.exp(-tt * 18) + 300
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 28)


def click():
    tt = t(0.06)
    return (np.sin(2 * np.pi * 2200 * tt) * 0.6 + hp(rng.standard_normal(len(tt)), 3000) * 0.4) * np.exp(-tt * 90)


def chime():
    tt = t(1.8)
    sig = sum(a * np.sin(2 * np.pi * f * tt) * np.exp(-tt * d) for f, a, d in [(1046.5, 1, 2.2), (1568.0, 0.6, 2.8), (2093.0, 0.35, 3.5), (2637.0, 0.2, 4.0)])
    return reverb(sig, 1.6, 0.25)


def riser(dur=1.6):
    tt = t(dur)
    f = 200 * (8 ** (tt / dur))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.3
    noise = hp(rng.standard_normal(len(tt)), 2500) * 0.5
    return (tone + noise) * (tt / dur) ** 2


def impact():
    tt = t(2.0)
    boom = np.sin(2 * np.pi * np.cumsum(70 * np.exp(-tt * 3) + 38) / SR) * np.exp(-tt * 2.5)
    air = lp(rng.standard_normal(len(tt)), 1200) * np.exp(-tt * 4) * 0.3
    return reverb(boom + air, 2.5, 0.35)


def typing(dur=1.2):
    out = np.zeros(int(dur * SR))
    pos = 0
    while pos < len(out) - 3000:
        c = click() * rng.uniform(0.4, 0.8)
        out[pos : pos + len(c)] += c[: len(out) - pos]
        pos += int(rng.uniform(0.05, 0.12) * SR)
    return out


save("music.wav", music(), peak=0.7)
save("whoosh.wav", whoosh())
save("pop.wav", pop(), peak=0.6)
save("click.wav", click(), peak=0.5)
save("chime.wav", chime(), peak=0.6)
save("riser.wav", riser(), peak=0.6)
save("impact.wav", impact(), peak=0.85)
save("typing.wav", typing(), peak=0.45)
print("audio written to", os.path.abspath(OUT))
