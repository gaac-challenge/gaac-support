#!/usr/bin/env python3
"""从历史版支持站提取页面正文，不改写文字或外部 URL。"""

import argparse
from html.parser import HTMLParser
import json
from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parents[1]
PAGES = ("index", "tasks", "model", "search", "data", "tools", "eval", "notices", "status", "desk")
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
ALLOWED = {"a", "article", "b", "button", "code", "dd", "details", "div", "dl", "dt", "figure", "h1", "h2", "h3", "i", "li", "ol", "p", "pre", "section", "small", "span", "summary", "table", "tbody", "td", "th", "thead", "tr", "ul"}
ATTRIBUTES = {"class": "className", "colspan": "colSpan", "rowspan": "rowSpan", "tabindex": "tabIndex"}


def camel_case(name):
    if name.startswith("--"):
        return name
    first, *rest = name.split("-")
    return first + "".join(part.capitalize() for part in rest)


class Document(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.nodes = []
        self.stack = [("", self.nodes)]
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        result = {"tag": tag, "props": dict(attrs), "children": []}
        self.stack[-1][1].append(result)
        if tag not in VOID:
            self.stack.append((tag, result["children"]))

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break

    def handle_data(self, value):
        self.stack[-1][1].append(value)


def elements(nodes):
    return [node for node in nodes if isinstance(node, dict)]


def descendants(nodes):
    for node in elements(nodes):
        yield node
        yield from descendants(node["children"])


def by_tag(nodes, tag):
    return next(node for node in descendants(nodes) if node["tag"] == tag)


def classes(node):
    return (node["props"].get("class") or "").split()


def data_nodes(nodes):
    result = []
    for node in nodes:
        if isinstance(node, str):
            result.append(node)
            continue
        tag = node["tag"]
        if tag not in ALLOWED:
            raise ValueError(f"unsupported content tag: {tag}")
        props = {}
        for key, value in node["props"].items():
            if key.startswith("on"):
                raise ValueError(f"unexpected event attribute: {key}")
            name = ATTRIBUTES.get(key, key)
            if key == "style":
                props[name] = {camel_case(part.split(":", 1)[0].strip()): part.split(":", 1)[1].strip()
                               for part in value.split(";") if part.strip()}
            else:
                props[name] = value if value is not None else True
        if "system-map" in classes(node):
            result.append({"tag": "street", "props": {"aria-label": props["aria-label"]}, "children": []})
            continue
        children = node["children"]
        if tag in {"table", "thead", "tbody", "tr", "dl", "ol", "ul"}:
            children = [child for child in children if not isinstance(child, str) or child.strip()]
        result.append({"tag": tag, "props": props, "children": data_nodes(children)})
    return result


def convert(text):
    document = Document(text)
    main = by_tag(document.nodes, "main")["children"]
    banner = next((item for item in descendants(document.nodes) if "banner" in classes(item)), None)
    data = {
        "title": "".join(by_tag(document.nodes, "title")["children"]),
        "banner": data_nodes(by_tag(banner["children"], "p")["children"]) if banner else [],
        "header": None,
    }
    header = next((node for node in elements(main) if "page-head" in classes(node)), None)
    if header:
        primary, *extras = elements(header["children"])
        copy, *actions = elements(primary["children"])
        heading = by_tag(copy["children"], "h1")
        data["header"] = {
            "id": heading["props"]["id"],
            "title": data_nodes(heading["children"]),
            "description": data_nodes([node for node in copy["children"] if node is not heading]),
            "actions": data_nodes(elements(actions[0]["children"])) if actions else [],
            "extras": data_nodes(extras),
        }
    data["body"] = data_nodes([node for node in main if node is not header])
    return data


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    chooser = parser.add_mutually_exclusive_group()
    chooser.add_argument("--source", type=Path, help="包含十个原始 HTML 页面的目录")
    chooser.add_argument("--ref", default="6713490", help="包含原始 support/ 的 Git 引用")
    args = parser.parse_args()
    target = ROOT / "src/sections/support/content"
    target.mkdir(parents=True, exist_ok=True)
    for page in PAGES:
        name = f"{page}.html"
        text = (args.source / name).read_text() if args.source else subprocess.check_output(
            ["git", "show", f"{args.ref}:support/{name}"], cwd=ROOT, text=True)
        data = convert(text)
        (target / f"{page}.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        print(page)


if __name__ == "__main__":
    main()
