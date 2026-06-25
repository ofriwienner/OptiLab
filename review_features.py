#!/usr/bin/env python3
"""
Feature review script - GitHub-backed.
Lists open PRs labeled ready-for-review, lets you test manually,
then collects approve / reject / fix decisions.
Nothing merges without your explicit confirmation.
"""

import atexit
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path


def wrap(text, indent="  ", width=80):
    lines = textwrap.wrap(str(text), width=width - len(indent),
                          initial_indent=indent, subsequent_indent=indent)
    print("\n".join(lines) if lines else "")


REPO_ROOT = Path(__file__).parent

_BROWSER_CANDIDATES = [
    "chrome",
    "msedge",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
]

_feature_proc = None
_feature_tmpdir = None
_feature_worktree = None
_ref_proc = None
_ref_tmpdir = None


def gh_run(*args, check=True):
    result = subprocess.run(
        ["gh", *args],
        capture_output=True, text=True, encoding='utf-8', errors='replace',
        cwd=REPO_ROOT,
    )
    if check and result.returncode != 0:
        print(f"  gh error: {result.stderr.strip()}")
        return ""
    return result.stdout.strip()


def git_run(*args, cwd=None):
    return subprocess.run(
        ["git", *args],
        capture_output=True, text=True, encoding='utf-8', errors='replace',
        cwd=str(cwd or REPO_ROOT),
    )


def parse_description(body):
    if not body:
        return "(no description)"
    m = re.search(r'##\s*Description[^\n]*\n+(.*?)(?:\n##|\nCloses|\Z)', body,
                  re.DOTALL | re.IGNORECASE)
    if m:
        return m.group(1).strip()
    for line in body.splitlines():
        if line.strip() and not line.startswith("#"):
            return line.strip()
    return "(no description)"


def parse_issue_number(body):
    if not body:
        return None
    m = re.search(r'[Cc]loses\s+#(\d+)', body)
    return int(m.group(1)) if m else None


_FIX_PREFIX = "**Fix requested:** "

def get_fix_note(pr_number):
    raw = gh_run("pr", "view", str(pr_number), "--json", "comments", check=False)
    if raw:
        for comment in reversed(json.loads(raw).get("comments", [])):
            body = comment.get("body", "")
            if body.startswith(_FIX_PREFIX):
                return body[len(_FIX_PREFIX):].strip() or None
    raw = gh_run("pr", "view", str(pr_number), "--json", "reviews", check=False)
    if raw:
        for review in reversed(json.loads(raw).get("reviews", [])):
            if review.get("state") == "CHANGES_REQUESTED":
                return review.get("body", "").strip() or None
    return None


def load():
    """Load open PRs labeled ready-for-review. fix-requested ones come first."""
    raw = gh_run("pr", "list", "--label", "ready-for-review", "--state", "open",
                 "--json", "number,title,headRefName,body,labels", "--limit", "100")
    if not raw:
        return []
    features = []
    for pr in json.loads(raw):
        label_names = {l["name"] for l in pr["labels"]}
        is_fix = "fix-requested" in label_names
        features.append({
            "pr_number": pr["number"],
            "issue_number": parse_issue_number(pr["body"]),
            "name": pr["title"],
            "branch": pr["headRefName"],
            "description": parse_description(pr["body"]),
            "status": "fix-requested" if is_fix else "pending",
            "fix_notes": get_fix_note(pr["number"]) if is_fix else None,
        })
    features.sort(key=lambda f: (0 if f["status"] == "fix-requested" else 1))
    return features


def load_approved():
    raw = gh_run("pr", "list", "--label", "approved", "--state", "open",
                 "--json", "number,title", "--limit", "100")
    return json.loads(raw) if raw else []


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
    args_extra = [f"--window-position={position[0]},{position[1]}"] if position else []
    for exe in _BROWSER_CANDIDATES:
        try:
            return subprocess.Popen(
                [exe, f"--user-data-dir={profile_dir}",
                 "--new-window", "--no-first-run", "--no-default-browser-check",
                 *args_extra, url],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
        except (FileNotFoundError, OSError):
            continue
    return None


def _kill_proc(proc):
    if proc is None or proc.poll() is not None:
        return
    if sys.platform == "win32":
        subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], capture_output=True)
    else:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            proc.kill()


def close_browser():
    global _feature_proc, _feature_tmpdir, _feature_worktree, _ref_proc, _ref_tmpdir
    for proc, tmpdir in ((_feature_proc, _feature_tmpdir), (_ref_proc, _ref_tmpdir)):
        _kill_proc(proc)
        if tmpdir and Path(tmpdir).exists():
            shutil.rmtree(tmpdir, ignore_errors=True)
    if _feature_worktree and Path(_feature_worktree).exists():
        git_run("worktree", "remove", "--force", _feature_worktree)
    _feature_proc = _feature_tmpdir = _feature_worktree = _ref_proc = _ref_tmpdir = None


atexit.register(close_browser)


def _handle_sigint(sig, frame):
    print("\n\nInterrupted - closing browser windows...")
    sys.exit(0)


signal.signal(signal.SIGINT, _handle_sigint)


def checkout_worktree(branch):
    """Fetch branch from origin and create a detached temp worktree. Returns path or None."""
    print(f"  Fetching {branch}...")
    git_run("fetch", "origin", branch)
    wt_path = os.path.join(tempfile.gettempdir(), f"optilab_{branch.replace('/', '_')}")
    if Path(wt_path).exists():
        git_run("worktree", "remove", "--force", wt_path)
    r = git_run("worktree", "add", "--detach", wt_path, f"origin/{branch}")
    if r.returncode != 0:
        print(f"  Worktree creation failed: {r.stderr.strip()}")
        return None
    return wt_path


def launch(feature):
    global _feature_proc, _feature_tmpdir, _feature_worktree, _ref_proc, _ref_tmpdir
    close_browser()

    wt_path = checkout_worktree(feature["branch"])
    if not wt_path:
        return None
    _feature_worktree = wt_path

    worktree = Path(wt_path)
    feat_index = worktree / "index.html"
    ref_index = REPO_ROOT / "index.html"

    if not feat_index.exists():
        print(f"  (no index.html at {worktree})")
        return wt_path

    if ref_index.exists():
        ref_dir = tempfile.mkdtemp(prefix="optilab_ref_")
        ref_html = Path(ref_dir) / "index.html"
        _inject_banner(ref_index, ref_html, "REFERENCE - main branch", "#dc2626",
                       ref_index.parent.as_uri() + "/")
        proc = _open_chrome(ref_html.as_uri(), ref_dir, position=(0, 0))
        if proc:
            _ref_proc, _ref_tmpdir = proc, ref_dir
        else:
            shutil.rmtree(ref_dir, ignore_errors=True)

    feat_dir = tempfile.mkdtemp(prefix="optilab_feat_")
    feat_html = Path(feat_dir) / "index.html"
    _inject_banner(feat_index, feat_html, f"TESTING - {feature['name']}", "#16a34a",
                   worktree.as_uri() + "/")
    proc = _open_chrome(feat_html.as_uri(), feat_dir, position=(980, 0))
    if proc:
        _feature_proc, _feature_tmpdir = proc, feat_dir
    else:
        shutil.rmtree(feat_dir, ignore_errors=True)
        if sys.platform == "win32":
            os.startfile(str(feat_index))
        elif sys.platform == "darwin":
            subprocess.Popen(["open", str(feat_index)])
        else:
            subprocess.Popen(["xdg-open", str(feat_index)])

    return wt_path


def run_claude_fix(feature, fix_desc, worktree_path):
    prompt = (
        f"You are fixing a bug in a git worktree for OptiLab (a static HTML/JS optical bench simulator). "
        f"OptiLab is plain JS/HTML with no build step - all source is in js/ and styles/. "
        f"Key files: js/config.js (globals), js/element.js (Element class), js/input.js (mouse/keyboard), "
        f"js/renderer.js (canvas drawing), js/state.js (save/load/undo), js/ui/controls.js (sidebar UI), "
        f"js/physics/raytracing.js (ray casting), js/physics/optics.js (Mueller matrices).\n\n"
        f"Feature being fixed: {feature['name']}\n"
        f"Feature description: {feature['description']}\n\n"
        f"Bug to fix: {fix_desc}\n\n"
        f"Read the relevant source files, locate the bug, fix it, commit with a descriptive message, "
        f"then push: git push origin HEAD:{feature['branch']}"
    )
    print(f"\n  Running Claude in worktree to apply fix...")
    print(f"  Fix: {fix_desc}\n")
    result = subprocess.run(
        ["claude", "--dangerously-skip-permissions"],
        input=prompt, text=True,
        cwd=worktree_path,
    )
    return result.returncode == 0


def pr_label(pr_number, add=None, remove=None):
    if add:
        gh_run("pr", "edit", str(pr_number), "--add-label", add)
    if remove:
        gh_run("pr", "edit", str(pr_number), "--remove-label", remove, check=False)


def merge_pr(pr_number, title):
    result = subprocess.run(
        ["gh", "pr", "merge", str(pr_number), "--merge", "--delete-branch",
         "--subject", f"Merge: {title}"],
        capture_output=True, text=True, cwd=REPO_ROOT,
    )
    return (True, None) if result.returncode == 0 else (False, result.stderr.strip())


def header(text, width=62):
    print(f"\n{'=' * width}")
    print(f"  {text}")
    print(f"{'=' * width}")


def handle_fix_requested(feature, worktree_path):
    if feature["fix_notes"]:
        print("\n  Stored fix:")
        wrap(feature["fix_notes"], "    ")
        print("\n  Options:")
        print("    [R] Run Claude now to apply this fix")
        print("    [E] Edit the fix description first")
        print("    [S] Skip for now")
    else:
        print("\n  (No fix note was stored - the previous session lost it.)")
        print("\n  Options:")
        print("    [E] Describe the fix and run Claude")
        print("    [S] Skip for now")

    while True:
        choice = input("\n  Choice: ").strip().upper()

        if choice == "R" and not feature["fix_notes"]:
            print("  No fix note stored. Use E to describe the fix.")
            continue

        if choice == "R":
            ok = run_claude_fix(feature, feature["fix_notes"], worktree_path)
            if ok:
                pr_label(feature["pr_number"], remove="fix-requested")
                print("  Fix applied. Re-launching browser for re-test...")
                wt = launch(feature)
                print("\n  Test the fix, then decide:")
                print("    [A] Approve      [R] Reject      [F] Still needs fixing      [B] Accept + fix note      [S] Skip")
                handle_normal_decision(feature, wt)
            else:
                print("  Claude exited with errors. Still marked fix-requested.")
            break

        elif choice == "E":
            new_desc = input("  New fix description: ").strip()
            if new_desc:
                feature["fix_notes"] = new_desc
                gh_run("pr", "comment", str(feature["pr_number"]),
                       "--body", f"{_FIX_PREFIX}{new_desc}")
                print("  Fix note saved.")
                auto = input("  Run Claude now to apply fix? [y/N]: ").strip().upper()
                if auto == "Y":
                    ok = run_claude_fix(feature, new_desc, worktree_path)
                    if ok:
                        pr_label(feature["pr_number"], remove="fix-requested")
                        print("  Fix applied. Re-launching browser for re-test...")
                        wt = launch(feature)
                        print("\n  Test the fix, then decide:")
                        print("    [A] Approve      [R] Reject      [F] Still needs fixing      [B] Accept + fix note      [S] Skip")
                        handle_normal_decision(feature, wt)
                    else:
                        print("  Claude exited with errors. Still marked fix-requested.")
                else:
                    print("  Fix saved. Run review_features.py again when ready.")
            break

        elif choice == "S":
            print("  Skipped (will appear again next session).")
            break

        else:
            print("  Enter R, E, or S.")


def handle_normal_decision(feature, worktree_path):
    while True:
        choice = input("\n  Decision: ").strip().upper()

        if choice == "A":
            pr_label(feature["pr_number"], add="approved", remove="ready-for-review")
            print("  Approved - queued for merge.")
            break

        elif choice == "R":
            reason = input("  Reason (optional): ").strip()
            gh_run("pr", "close", str(feature["pr_number"]))
            if feature.get("issue_number"):
                body = f"Rejected. {reason}" if reason else "Rejected."
                gh_run("issue", "close", str(feature["issue_number"]), "--comment", body)
            print("  Rejected.")
            break

        elif choice == "F":
            fix_desc = input("  Describe the fix: ").strip()
            if not fix_desc:
                print("  Fix description cannot be empty.")
                continue
            gh_run("pr", "comment", str(feature["pr_number"]),
                   "--body", f"{_FIX_PREFIX}{fix_desc}")
            pr_label(feature["pr_number"], add="fix-requested")
            feature["fix_notes"] = fix_desc
            print("  Fix requested on PR.")

            auto = input("  Run Claude now to apply fix? [y/N]: ").strip().upper()
            if auto == "Y":
                if not worktree_path:
                    worktree_path = checkout_worktree(feature["branch"])
                ok = run_claude_fix(feature, fix_desc, worktree_path)
                if ok:
                    pr_label(feature["pr_number"], remove="fix-requested")
                    print("  Fix applied. Re-launching browser for re-test...")
                    wt = launch(feature)
                    print("\n  Test the fix, then decide:")
                    print("    [A] Approve      [R] Reject      [F] Still needs fixing      [B] Accept + fix note      [S] Skip")
                    return handle_normal_decision(feature, wt)
                else:
                    print("  Claude exited with errors. Marked fix-requested.")
            else:
                print("  Fix saved. Run review_features.py again when ready.")
            break

        elif choice == "B":
            fix_desc = input("  Describe the fix (a follow-up issue will be created): ").strip()
            if not fix_desc:
                print("  Fix description cannot be empty.")
                continue
            pr_label(feature["pr_number"], add="approved", remove="ready-for-review")
            new_url = gh_run("issue", "create",
                             "--title", f"Fix: {feature['name']}",
                             "--body", fix_desc,
                             "--label", "pending")
            print(f"  Approved - queued for merge. Follow-up issue: {new_url.strip()}")
            break

        elif choice == "S":
            print("  Skipped (will appear again next session).")
            break

        else:
            print("  Enter A, R, F, B, or S.")


def do_merges(approved_prs):
    if not approved_prs:
        print("\nNo approved PRs to merge.")
        return

    print(f"\n{len(approved_prs)} PR(s) approved and ready to merge:")
    for pr in approved_prs:
        print(f"  - {pr['title']}  (PR #{pr['number']})")

    print("\n  [Y] Merge all   [O] One by one   [N] Skip")
    go = input("  Choice: ").strip().upper()
    if go not in ("Y", "O"):
        print("Merge skipped. Run again when ready.")
        return

    for pr in approved_prs:
        if go == "O":
            if input(f"\n  Merge '{pr['title']}'? [y/N]: ").strip().upper() != "Y":
                print("  Skipped.")
                continue
        ok, err = merge_pr(pr["number"], pr["title"])
        if ok:
            print(f"  Merged: {pr['title']}")
            git_run("pull", "--ff-only")
        else:
            print(f"  Merge failed: {err}")


def review():
    git_run("pull", "--ff-only")

    features = load()
    approved_prs = load_approved()

    if approved_prs:
        print(f"\n  Note: {len(approved_prs)} PR(s) from a previous session are approved and waiting to merge.")

    if not features:
        print("\nNothing to review.")
    else:
        pending_count = sum(1 for f in features if f["status"] == "pending")
        fix_count = sum(1 for f in features if f["status"] == "fix-requested")
        header(f"Feature Review  ({pending_count} pending, {fix_count} fix-requested)")

        ans = input("\n  How many features to review this session? [default: 7 / A = all]: ").strip().lower()
        if ans == "a":
            limit = len(features)
        elif ans == "":
            limit = 7
        else:
            try:
                limit = int(ans)
            except ValueError:
                limit = 7
        queue = features[:limit]

        for idx, feature in enumerate(queue, 1):
            is_fix = feature["status"] == "fix-requested"
            tag = " [FIX]" if is_fix else ""
            pr_ref = f"PR #{feature['pr_number']}"
            if feature.get("issue_number"):
                pr_ref += f"  (Issue #{feature['issue_number']})"
            print(f"\n[{idx}/{len(queue)}]  {feature['name']}{tag}")
            print(f"  {pr_ref}  |  Branch: {feature['branch']}")
            print("  Description:")
            wrap(feature["description"], "    ")

            worktree_path = launch(feature)
            if is_fix:
                handle_fix_requested(feature, worktree_path)
            else:
                print("\n  Take your time to test. When ready:")
                print("    [A] Approve      [R] Reject      [B] Accept + fix note")
                print("    [F] Fix needed   [S] Skip (decide later)")
                handle_normal_decision(feature, worktree_path)

        close_browser()

    approved_prs = load_approved()

    header("Summary")
    remaining = load()
    for status, group in [
        ("pending",      [f for f in remaining if f["status"] == "pending"]),
        ("fix-requested",[f for f in remaining if f["status"] == "fix-requested"]),
        ("approved",     [{"name": p["title"], "pr_number": p["number"]} for p in approved_prs]),
    ]:
        if group:
            print(f"  {status:<16} {len(group)}")
            for item in group:
                print(f"    - {item['name']}  (PR #{item['pr_number']})")

    do_merges(approved_prs)
    print("\nDone.")


if __name__ == "__main__":
    review()
