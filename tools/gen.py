#!/usr/bin/env python3
"""Drive Codex's GPT Image 2 tool to produce the raw art for PAPERWEIGHT.

Usage:
    python3 tools/gen.py              # generate everything still missing
    python3 tools/gen.py bg_hub en_mitten   # regenerate specific assets
    python3 tools/gen.py --force      # regenerate everything

Raw 1:1 outputs land in assets/_raw/. tools/process.py turns them into game art.
"""
import concurrent.futures as futures
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RAW = os.path.join(ROOT, "assets", "_raw")
sys.path.insert(0, HERE)
from manifest import ASSETS, BY_NAME  # noqa: E402

BATCH = 2          # images per codex session
WORKERS = 6        # concurrent codex sessions
TIMEOUT = 1500     # seconds per session
RETRIES = 2


def build_prompt(batch):
    lines = [
        "You are an art asset generator. Use your image_generation tool to create "
        f"{len(batch)} image(s) and save each one to the current working directory "
        "under the EXACT filename given. Do not create, edit or delete any other file. "
        "Do not write code. Do not ask questions. Just generate and save.",
        "",
    ]
    for a in batch:
        lines += [
            f"--- FILENAME: {a['name']}.png  (size {a['size']}) ---",
            a["prompt"],
            "",
        ]
    lines.append(
        "When finished, run `ls -la` and confirm each filename exists. If a file is "
        "missing, generate it again before finishing."
    )
    return "\n".join(lines)


def run_batch(batch):
    names = [a["name"] for a in batch]
    prompt = build_prompt(batch)
    t0 = time.time()
    try:
        subprocess.run(
            ["codex", "exec", "--skip-git-repo-check", "-s", "workspace-write",
             "-C", RAW, prompt],
            capture_output=True, text=True, timeout=TIMEOUT, check=False,
        )
    except subprocess.TimeoutExpired:
        pass
    made = [n for n in names if os.path.exists(os.path.join(RAW, n + ".png"))]
    dt = time.time() - t0
    print(f"  [{dt:5.0f}s] {'+'.join(names):40s} -> {len(made)}/{len(names)} ok",
          flush=True)
    return [n for n in names if n not in made]


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    force = "--force" in sys.argv
    os.makedirs(RAW, exist_ok=True)

    if args:
        todo = [BY_NAME[n] for n in args]
    else:
        todo = [a for a in ASSETS
                if force or not os.path.exists(os.path.join(RAW, a["name"] + ".png"))]

    if not todo:
        print("Nothing to generate; all raw assets present.")
        return 0

    print(f"Generating {len(todo)} image(s) with {WORKERS} concurrent codex sessions.")
    pending = todo
    for attempt in range(1, RETRIES + 2):
        size = BATCH if attempt == 1 else 1          # retry one at a time
        batches = [pending[i:i + size] for i in range(0, len(pending), size)]
        print(f"\n== pass {attempt}: {len(pending)} image(s) in {len(batches)} session(s) ==",
              flush=True)
        failed = []
        with futures.ThreadPoolExecutor(max_workers=WORKERS) as pool:
            for miss in pool.map(run_batch, batches):
                failed += miss
        if not failed:
            print("\nAll requested images generated.")
            return 0
        pending = [BY_NAME[n] for n in failed]

    print(f"\nStill missing after {RETRIES + 1} passes: {[a['name'] for a in pending]}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
