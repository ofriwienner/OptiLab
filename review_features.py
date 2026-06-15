#!/usr/bin/env python3
"""
Feature review script.
Opens each feature's worktree, lets you test manually, then collect approve / reject / fix decisions.
Nothing merges without your explicit confirmation.
"""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from datetime import datetime

MANIFEST = Path(__file__).parent / "features_manifest.json"
REPO_ROOT = Path(__file__).parent

_BROWSER_CANDIDATES = [
    "chrome",
    "msedge",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]

_feature_proc = None
_feature_tmpdir = None
_ref_proc = None
_ref_tmpdir = None


def load():
    if not MANIFEST.exists():
        print(f"Manifest not found: {MANIFEST}")
        print("It will be created automatically when features are implemented.")
        sys.exit(1)
    with open(MANIFEST, encoding="utf-8") as f:
        return json.load(f)


def save(data):
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def _inject_banner(src_html, dest_html, label, color, base_uri):
    content = Path(src_html).read_text(encoding="utf-8")

    style = (
        f'<base href="{base_uri}">'
        '<style>'
        '#__optilab_banner{'
        'position:fixed;top:0;left:50%;transform:translateX(-50%);'
        f'background:{color};color:#fff;'
        'font:bold 13px/1 monospace;padding:5px 24px 7px;'
        'z-index:999999;border-radius:0 0 10px 10px;'
        'pointer-events:none;letter-spacing:1px;'
        'box-shadow:0 2px 8px rgba(0,0,0,.4)}'
        '</style>'
    )
    banner = f'<div id="__optilab_banner">{label}</div>'

    content = re.sub(r'(<head\b[^>]*>)', r'\1\n' + style, content, count=1, flags=re.IGNORECASE)
    content = re.sub(r'(<body\b[^>]*>)', r'\1\n' + banner, content, count=1, flags=re.IGNORECASE)

    Path(dest_html).write_text(content, encoding="utf-8")


def _open_chrome(url, profile_dir, position=None):
    args_extra = []
    if position:
        args_extra = [f"--window-position={position[0]},{position[1]}"]
    for exe in _BROWSER_CANDIDATES:
        try:
            proc = subprocess.Popen(
                [exe,
                 f"--user-data-dir={profile_dir}",
                 "--new-window",
                 "--no-first-run",
                 "--no-default-browser-check",
                 *args_extra,
                 url],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            return proc
        except (FileNotFoundError, OSError):
            continue
    return None


def close_browser():
    global _feature_proc, _feature_tmpdir, _ref_proc, _ref_tmpdir
    for proc, tmpdir in ((_feature_proc, _feature_tmpdir), (_ref_proc, _ref_tmpdir)):
        if proc is not None and proc.poll() is None:
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], capture_output=True)
        if tmpdir and Path(tmpdir).exists():
            shutil.rmtree(tmpdir, ignore_errors=True)
    _feature_proc = _feature_tmpdir = _ref_proc = _ref_tmpdir = None


def launch(feature):
    global _feature_proc, _feature_tmpdir, _ref_proc, _ref_tmpdir

    close_browser()

    worktree = Path(feature["worktree_path"])
    feat_index = worktree / "index.html"
    ref_index = REPO_ROOT / "index.html"

    if not feat_index.exists():
        print(f"  (no index.html found at {worktree})")
        return

    browser_available = False

    # --- Reference window (main branch) ---
    if ref_index.exists():
        ref_dir = tempfile.mkdtemp(prefix="optilab_ref_")
        ref_html = Path(ref_dir) / "index.html"
        _inject_banner(
            ref_index, ref_html,
            "REFERENCE — main branch",
            "#dc2626",
            ref_index.parent.as_uri() + "/",
        )
        proc = _open_chrome(ref_html.as_uri(), ref_dir, position=(0, 0))
        if proc:
            _ref_proc = proc
            _ref_tmpdir = ref_dir
            browser_available = True
        else:
            shutil.rmtree(ref_dir, ignore_errors=True)

    # --- Feature window ---
    feat_dir = tempfile.mkdtemp(prefix="optilab_feat_")
    feat_html = Path(feat_dir) / "index.html"
    _inject_banner(
        feat_index, feat_html,
        f"TESTING — {feature['name']}",
        "#16a34a",
        worktree.as_uri() + "/",
    )
    proc = _open_chrome(feat_html.as_uri(), feat_dir, position=(980, 0))
    if proc:
        _feature_proc = proc
        _feature_tmpdir = feat_dir
        browser_available = True
    else:
        shutil.rmtree(feat_dir, ignore_errors=True)
        os.startfile(str(feat_index))
        print("  (browser auto-close unavailable - close the tab manually before the next feature)")

    if not browser_available:
        os.startfile(str(ref_index))


def run_claude_fix(feature, fix_desc):
    path = feature["worktree_path"]
    print(f"\n  Running Claude in worktree to apply fix...")
    print(f"  Fix: {fix_desc}\n")
    result = subprocess.run(
        ["claude", "-p", fix_desc, "--dangerously-skip-permissions"],
        cwd=path,
        stdin=subprocess.DEVNULL,
    )
    return result.returncode == 0


def merge_branch(feature):
    result = subprocess.run(
        ["git", "merge", "--no-ff", feature["branch"],
         "-m", f"Merge: {feature['name']}"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )
    if result.returncode == 0:
        return True, None
    return False, result.stderr.strip()


def archive_feature(feature):
    worktree = feature["worktree_path"]
    branch = feature["branch"]

    r1 = subprocess.run(
        ["git", "worktree", "remove", "--force", worktree],
        cwd=REPO_ROOT, capture_output=True, text=True,
    )
    if r1.returncode == 0:
        print(f"  Worktree removed.")
    else:
        print(f"  Worktree removal failed (may already be gone): {r1.stderr.strip()}")

    r2 = subprocess.run(
        ["git", "branch", "-d", branch],
        cwd=REPO_ROOT, capture_output=True, text=True,
    )
    if r2.returncode == 0:
        print(f"  Branch {branch} deleted.")
    else:
        print(f"  Branch deletion failed: {r2.stderr.strip()}")


def header(text, width=62):
    print(f"\n{'=' * width}")
    print(f"  {text}")
    print(f"{'=' * width}")


def handle_fix_requested(feature, data):
    print(f"\n  Stored fix: {feature['fix_notes']}")
    print("\n  Options:")
    print("    [R] Run Claude now to apply this fix")
    print("    [E] Edit the fix description first")
    print("    [S] Skip for now")

    while True:
        choice = input("\n  Choice: ").strip().upper()

        if choice == "R":
            ok = run_claude_fix(feature, feature["fix_notes"])
            if ok:
                feature["status"] = "pending"
                feature["fix_notes"] = None
                print("  Fix applied. Re-launching browser for re-test...")
                launch(feature)
                print("\n  Test the fix, then decide:")
                print("    [A] Approve      [R] Reject      [F] Still needs fixing      [S] Skip")
                return handle_normal_decision(feature, data)
            else:
                print("  Claude exited with errors. Still marked fix-requested.")
                save(data)
            break

        elif choice == "E":
            new_desc = input("  New fix description: ").strip()
            if new_desc:
                feature["fix_notes"] = new_desc
                save(data)
                ok = run_claude_fix(feature, new_desc)
                if ok:
                    feature["status"] = "pending"
                    feature["fix_notes"] = None
                    print("  Fix applied. Re-launching browser for re-test...")
                    launch(feature)
                    print("\n  Test the fix, then decide:")
                    print("    [A] Approve      [R] Reject      [F] Still needs fixing      [S] Skip")
                    return handle_normal_decision(feature, data)
                else:
                    print("  Claude exited with errors. Still marked fix-requested.")
                    save(data)
            break

        elif choice == "S":
            print("  Skipped.")
            break

        else:
            print("  Enter R, E, or S.")


def handle_normal_decision(feature, data):
    while True:
        choice = input("\n  Decision: ").strip().upper()

        if choice == "A":
            feature["status"] = "approved"
            feature["decided_at"] = datetime.now().isoformat()
            print("  Approved.")
            save(data)
            break

        elif choice == "R":
            reason = input("  Reason (optional): ").strip()
            feature["status"] = "rejected"
            feature["decided_at"] = datetime.now().isoformat()
            if reason:
                feature["reject_reason"] = reason
            print("  Rejected.")
            save(data)
            break

        elif choice == "F":
            fix_desc = input("  Describe the fix: ").strip()
            if not fix_desc:
                print("  Fix description cannot be empty.")
                continue
            feature["fix_notes"] = fix_desc
            feature["status"] = "fix-requested"
            feature["decided_at"] = datetime.now().isoformat()
            save(data)

            auto = input("  Run Claude now to apply fix? [Y/n]: ").strip().upper()
            if auto != "N":
                ok = run_claude_fix(feature, fix_desc)
                if ok:
                    feature["status"] = "pending"
                    feature["fix_notes"] = None
                    save(data)
                    print("  Fix applied. Re-launching browser for re-test...")
                    launch(feature)
                    print("\n  Test the fix, then decide:")
                    print("    [A] Approve      [R] Reject      [F] Still needs fixing      [S] Skip")
                    return handle_normal_decision(feature, data)
                else:
                    print("  Claude exited with errors. Marked fix-requested.")
                    save(data)
            else:
                print(f"\n  To apply manually:")
                print(f"    cd \"{feature['worktree_path']}\"")
                print(f"    claude -p \"{fix_desc}\"")
            break

        elif choice == "S":
            print("  Skipped.")
            break

        else:
            print("  Enter A, R, F, or S.")


def review():
    data = load()
    features = data["features"]

    queue = [f for f in features if f["status"] in ("pending", "fix-requested")]

    if not queue:
        print("\nNothing to review - all features are decided.")
    else:
        pending_count = sum(1 for f in queue if f["status"] == "pending")
        fix_count = sum(1 for f in queue if f["status"] == "fix-requested")
        header(f"Feature Review  ({pending_count} pending, {fix_count} fix-requested)")

        ans = input(f"\n  How many features to review this session? [default: 7 / A = all]: ").strip().lower()
        if ans == "a" or ans == "":
            limit = len(queue) if ans == "a" else 7
        else:
            try:
                limit = int(ans)
            except ValueError:
                limit = 7
        queue = queue[:limit]

        for idx, feature in enumerate(queue, 1):
            is_fix = feature["status"] == "fix-requested"
            tag = " [FIX]" if is_fix else ""
            print(f"\n[{idx}/{len(queue)}]  {feature['name']}{tag}")
            print(f"  Branch:      {feature['branch']}")
            print(f"  Description: {feature['description']}")

            if is_fix:
                handle_fix_requested(feature, data)
            else:
                print("\n  Launching browser...")
                launch(feature)
                print("\n  Take your time to test. When ready:")
                print("    [A] Approve      [R] Reject")
                print("    [F] Fix needed   [S] Skip (decide later)")
                handle_normal_decision(feature, data)

        close_browser()

    # --- Summary ---
    all_f = data["features"]
    by_status = {}
    for f in all_f:
        by_status.setdefault(f["status"], []).append(f)

    header("Summary")
    for status in ("approved", "rejected", "merged", "fix-requested", "pending"):
        group = by_status.get(status, [])
        if group:
            print(f"  {status:<16} {len(group)}")
            for f in group:
                note = f" - {f.get('reject_reason', '')}" if status == "rejected" and f.get("reject_reason") else ""
                fix = f" - {f.get('fix_notes', '')}" if status == "fix-requested" and f.get("fix_notes") else ""
                print(f"    - {f['name']}{note}{fix}")

    # --- Merge prompt ---
    approved = by_status.get("approved", [])
    if not approved:
        print("\nNo approved features to merge.")
        return

    print(f"\n{len(approved)} feature(s) approved and ready to merge:")
    for f in approved:
        print(f"  - {f['name']}  ({f['branch']})")

    print("\n  [Y] Merge + archive all   [O] One by one   [N] Skip")
    go = input("  Choice: ").strip().upper()
    if go not in ("Y", "O"):
        print("Merge skipped. Run again when ready.")
        return

    for feature in approved:
        if go == "O":
            confirm = input(f"\n  Merge '{feature['name']}'? [y/N]: ").strip().upper()
            if confirm != "Y":
                print("  Skipped.")
                continue

        ok, err = merge_branch(feature)
        if ok:
            feature["status"] = "merged"
            feature["merged_at"] = datetime.now().isoformat()
            save(data)
            print(f"  Merged: {feature['name']}")
            if go == "Y":
                archive_feature(feature)
            else:
                arc = input(f"  Archive worktree + branch? [Y/n]: ").strip().upper()
                if arc != "N":
                    archive_feature(feature)
        else:
            print(f"  Merge failed: {err}")
            save(data)

    # --- Archive already-merged features that still have worktrees ---
    already_merged = [
        f for f in data["features"]
        if f["status"] == "merged" and Path(f["worktree_path"]).exists()
    ]
    if already_merged:
        print(f"\n{len(already_merged)} previously merged feature(s) still have worktrees:")
        for f in already_merged:
            print(f"  - {f['name']}  ({f['branch']})")
        arc_all = input("Archive them now? [Y/n]: ").strip().upper()
        if arc_all != "N":
            for feature in already_merged:
                print(f"\n  Archiving '{feature['name']}'...")
                archive_feature(feature)

    print("\nDone.")


if __name__ == "__main__":
    review()
