#!/usr/bin/env python3
"""检查 HTML 中的本地 href、src 和锚点，可直接读取 Git 基线。"""

import argparse
from collections import Counter
from dataclasses import asdict, dataclass
from html.parser import HTMLParser
import json
from pathlib import Path, PurePosixPath
import subprocess
from urllib.parse import quote, unquote, urljoin, urlsplit


ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://gaac.invalid/"


class Page(HTMLParser):
    def __init__(self, content):
        super().__init__()
        self.links = []
        self.anchors = set()
        self.feed(content)

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if not value:
                continue
            if name == "id" or (tag == "a" and name == "name"):
                self.anchors.add(value)
            elif name in {"href", "src", "xlink:href"}:
                self.links.append((self.getpos()[0], name, value.strip()))


@dataclass
class Missing:
    page: str
    line: int
    attribute: str
    value: str
    target: str
    fragment: str
    reason: str

    def identity(self, rename):
        return (rename(self.page), self.attribute, rename(self.target), self.fragment, self.reason)


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


def snapshot(ref, folder):
    if not ref:
        files = {path.relative_to(folder).as_posix() for path in folder.rglob("*")
                 if path.is_file() and ".git" not in path.relative_to(folder).parts}
        return files, {path: Page((folder / path).read_text(encoding="utf-8"))
                       for path in sorted(files) if path.endswith(".html")}

    files = set(git("ls-tree", "-r", "-z", "--name-only", ref).decode().split("\0")) - {""}
    html = sorted(path for path in files if path.endswith(".html"))
    objects = b"".join(f"{ref}:{path}\0".encode() for path in html)
    data = subprocess.check_output(["git", "cat-file", "--batch", "-Z"], input=objects, cwd=ROOT)
    pages = {}
    offset = 0
    for path in html:
        header_end = data.index(b"\0", offset)
        size = int(data[offset:header_end].split()[-1])
        start = header_end + 1
        pages[path] = Page(data[start:start + size].decode())
        offset = start + size + 1
    return files, pages


def check(files, pages, prefix, files_only):
    directories = {parent.as_posix() for file in files for parent in PurePosixPath(file).parents}
    missing = []
    count = 0
    for path, page in pages.items():
        base = ORIGIN + prefix.lstrip("/") + quote(path)
        for line, name, value in page.links:
            try:
                url = urlsplit(value)
                if url.scheme or url.netloc:
                    continue
                result = urlsplit(urljoin(base, value))
            except ValueError:
                missing.append(Missing(path, line, name, value, value, "", "invalid URL"))
                continue
            count += 1
            if not result.path.startswith(prefix):
                missing.append(Missing(path, line, name, value, unquote(result.path), "", "outside site base"))
                continue
            target = unquote(result.path[len(prefix):]).strip("/") or "."
            fragment = unquote(result.fragment)
            is_directory = target in directories
            if is_directory:
                if fragment and not files_only:
                    target = (PurePosixPath(target) / "index.html").as_posix()
                else:
                    continue
            if target not in files or (result.path.endswith("/") and not is_directory):
                reason = "missing file"
            elif not files_only and fragment and not fragment.startswith(":~:") and target in pages and fragment not in pages[target].anchors:
                reason = "missing anchor"
            else:
                continue
            missing.append(Missing(path, line, name, value, target, fragment, reason))
    return missing, count


def rename_paths(rules):
    def rename(path):
        for source, destination in rules:
            if source.endswith("/") and path.startswith(source):
                return destination + path[len(source):]
            if path == source:
                return destination
        return path
    return rename


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", type=Path, default=ROOT, help="站点文档所在目录，例如 dist")
    parser.add_argument("--base", default="/", help="静态服务器挂载路径")
    parser.add_argument("--files-only", action="store_true", help="只检查文件和路由，不检查旧页面片段")
    parser.add_argument("--strict", action="store_true", help="存在未解析的引用即失败")
    parser.add_argument("--ref", help="读取指定 Git 提交")
    parser.add_argument("--json", type=Path, help="保存完整结果")
    parser.add_argument("--baseline", type=Path, help="与之前保存的结果对比")
    parser.add_argument("--rename", action="append", default=[], metavar="BEFORE=AFTER",
                        help="将基线路径映射到新位置，目录前缀使用末尾斜杠")
    args = parser.parse_args()
    rules = [rule.split("=", 1) for rule in args.rename]
    if any(len(rule) != 2 for rule in rules):
        parser.error("--rename requires BEFORE=AFTER")
    if not args.base.startswith("/") or not args.base.endswith("/"):
        parser.error("--base requires a leading and trailing slash")
    if not args.ref and not (args.directory / "index.html").exists():
        parser.error("site directory must contain index.html")
    files, pages = snapshot(args.ref, args.directory.resolve())
    missing, count = check(files, pages, args.base, args.files_only)
    for entry in missing:
        print(f"{entry.page}:{entry.line}: {entry.attribute}={entry.value!r}: {entry.reason} ({entry.target}#{entry.fragment})")
    print(f"{args.ref or 'worktree'}: {len(pages)} HTML, {count} local references, {len(missing)} broken")
    if args.json:
        args.json.write_text(json.dumps([asdict(entry) for entry in missing], ensure_ascii=False, indent=2) + "\n")
    if args.baseline:
        baseline = [Missing(**entry) for entry in json.loads(args.baseline.read_text())]
        previous = Counter(entry.identity(rename_paths(rules)) for entry in baseline)
        current = Counter(entry.identity(str) for entry in missing)
        new = current - previous
        for entry, times in sorted(new.items()):
            print(f"new ({times}): {entry}")
        print(f"link-check: {'FAIL' if new else 'PASS'} baseline={len(baseline)} branch={len(missing)} new={new.total()}")
        return bool(new)
    return args.strict and bool(missing)


if __name__ == "__main__":
    raise SystemExit(main())
