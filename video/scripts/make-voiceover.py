#!/usr/bin/env python3
"""
Generates the launch video's voiceover, line by line, with Kokoro-82M (Apache-2.0), fully offline.
The voice is SYNTHETIC: say so wherever the video is published (see README).

One-time setup (any machine with Node and Python; nothing is fetched from Hugging Face):
    pip install kokoro-onnx soundfile
    npm pack kokoro-q8-shards@1.0.0 kokoro-js@1.2.1
    # join the 6 shards -> kokoro-q8.onnx (sha256 fbae9257e1e05ffc727e951ef9b9c98418e6d79f1c9b6b13bd59f5c9028a1478)
    # convert kokoro-js voices/*.bin -> voices.npz   (python scripts/make-voiceover.py --build-voices <voices dir> voices.npz)

Run:
    python scripts/make-voiceover.py --model kokoro-q8.onnx --voices voices.npz
Writes public/vo/<id>.wav and src/vo-timings.json (durations the composition uses for pacing).
"""
import argparse
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")

# Scene id -> lines. Keep in sync with voiceover-script.md. "Heramb" is replaced by exact phonemes.
LINES = [
    ("hook", "Every week, your batch takes a test. Marks go up on the board, and everyone moves on."),
    ("problem", "But which chapter lost the marks? And which students need help first?"),
    ("aha", "With Heramb, paste the marks you already have. In under a minute, you get a teaching plan: what to reteach to the whole class, and who needs a small group."),
    ("report", "Every student gets a personal report, in English or Hindi, straight to WhatsApp."),
    ("builder", "Make the test itself on Heramb. Shuffled sets for every seat, online on any phone. It even catches a wrong answer key, before parents do."),
    ("proof", "Then, next test, see whether reteaching actually worked."),
    ("head", "And the head sees every batch, on one screen."),
    ("cta", "Heramb dot study. Free. No login. Marks stay on your device. Start with your last test, today."),
]

BRAND = "hˈeɪɹəmb"


def build_voices(src, out):
    v = {}
    for f in sorted(os.listdir(src)):
        if f.endswith(".bin") and f[:2] in ("af", "am", "bf", "bm"):
            v[f[:-4]] = np.fromfile(os.path.join(src, f), dtype=np.float32).reshape(-1, 1, 256)
    np.savez(out, **v)
    print(f"{len(v)} voices -> {out}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model")
    ap.add_argument("--voices")
    ap.add_argument("--voice", default="af_heart")
    ap.add_argument("--speed", type=float, default=1.0)
    ap.add_argument("--build-voices", nargs=2, metavar=("SRC_DIR", "OUT_NPZ"))
    a = ap.parse_args()
    if a.build_voices:
        return build_voices(*a.build_voices)
    if not (a.model and a.voices):
        sys.exit("Pass --model and --voices (see the header of this file).")

    import soundfile as sf
    from kokoro_onnx import Kokoro

    k = Kokoro(a.model, a.voices)
    out_dir = os.path.join(ROOT, "public", "vo")
    os.makedirs(out_dir, exist_ok=True)
    timings = {}
    for sid, text in LINES:
        ph = k.tokenizer.phonemize(text, "en-us")
        ph = ph.replace("hˈɛɹæm", BRAND).replace("hˈɛɹɐm", BRAND)
        samples, sr = k.create(ph, voice=a.voice, speed=a.speed, is_phonemes=True)
        # Trim leading/trailing silence, add 60 ms of air at both ends, normalise to -1 dBFS peak.
        env = np.abs(samples) > 0.01
        idx = np.where(env)[0]
        if len(idx):
            samples = samples[max(0, idx[0] - int(0.02 * sr)) : idx[-1] + int(0.08 * sr)]
        pad = np.zeros(int(0.06 * sr), dtype=samples.dtype)
        samples = np.concatenate([pad, samples, pad])
        samples = samples / (np.abs(samples).max() + 1e-9) * 0.89
        path = os.path.join(out_dir, f"{sid}.wav")
        sf.write(path, samples, sr)
        timings[sid] = round(len(samples) / sr, 3)
        print(f"{sid:8s} {timings[sid]:5.2f}s  {text}")
    with open(os.path.join(ROOT, "src", "vo-timings.json"), "w") as f:
        json.dump({"voice": a.voice, "speed": a.speed, "seconds": timings}, f, indent=2)


if __name__ == "__main__":
    main()
