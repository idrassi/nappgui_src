#!/usr/bin/env python3

from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path


REGEX_FLAGS = re.IGNORECASE | re.DOTALL


def get_match_value(text: str, pattern: str) -> str:
    match = re.search(pattern, text, REGEX_FLAGS)
    return match.group(1) if match else ""


def strip_html(raw_html: str) -> str:
    if not raw_html or not raw_html.strip():
        return ""

    text = raw_html
    text = re.sub(r"<script[\s\S]*?</script>", " ", text, flags=REGEX_FLAGS)
    text = re.sub(r"<style[\s\S]*?</style>", " ", text, flags=REGEX_FLAGS)
    text = re.sub(r"<br\s*/?>", " ", text, flags=REGEX_FLAGS)
    text = re.sub(
        r"</(p|div|li|tr|td|th|h1|h2|h3|h4|section|article|table|thead|tbody|ul|ol|pre|code)>",
        " ",
        text,
        flags=REGEX_FLAGS,
    )
    text = re.sub(r"<[^>]+>", " ", text, flags=REGEX_FLAGS)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def shorten(text: str, max_length: int = 220) -> str:
    value = text.strip()
    if not value:
        return ""

    if len(value) <= max_length:
        return value

    return value[:max_length].rstrip() + "..."


def build_entries(site_root: Path) -> list[dict[str, str]]:
    entries: list[dict[str, str]] = []
    html_files = sorted(
        path for path in site_root.glob("*.html") if path.name != "index.html"
    )

    for html_file in html_files:
        raw = html_file.read_text(encoding="utf-8")
        page_title = strip_html(get_match_value(raw, r'<h1 class="page-title">([\s\S]*?)</h1>'))
        if not page_title:
            page_title = strip_html(get_match_value(raw, r"<title>([\s\S]*?)</title>"))

        group = strip_html(get_match_value(raw, r'<p class="eyebrow">([\s\S]*?)</p>'))
        lead = strip_html(get_match_value(raw, r'<p class="lead">([\s\S]*?)</p>'))
        article = get_match_value(raw, r'<article class="article-card">([\s\S]*?)</article>')
        page_text = strip_html(article)

        entries.append(
            {
                "href": html_file.name,
                "title": page_title,
                "page": page_title,
                "group": group,
                "kind": "page",
                "summary": lead,
                "text": page_text,
            }
        )

        for section_match in re.finditer(
            r'<section id="([^"]+)" class="section">([\s\S]*?)</section>',
            raw,
            REGEX_FLAGS,
        ):
            section_id = section_match.group(1)
            section_html = section_match.group(2)
            section_title = strip_html(get_match_value(section_html, r"<h2>([\s\S]*?)</h2>"))
            if not section_title:
                continue

            section_body = re.sub(
                r"^\s*<h2>[\s\S]*?</h2>",
                " ",
                section_html,
                flags=REGEX_FLAGS,
            )
            section_text = strip_html(section_body)

            entries.append(
                {
                    "href": f"{html_file.name}#{section_id}",
                    "title": section_title,
                    "page": page_title,
                    "group": group,
                    "kind": "section",
                    "summary": shorten(section_text, 220),
                    "text": section_text,
                }
            )

    return entries


def main() -> int:
    script_dir = Path(__file__).resolve().parent
    site_root = (Path(sys.argv[1]) if len(sys.argv) > 1 else script_dir.parent).resolve()
    out_file = script_dir / "search-index.js"

    entries = build_entries(site_root)
    content = "window.NAPPGUI_SEARCH_INDEX = " + json.dumps(
        entries,
        ensure_ascii=False,
        separators=(",", ":"),
    ) + ";\n"

    out_file.write_text(content, encoding="utf-8", newline="\n")
    print(f"Generated {out_file} with {len(entries)} entries.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
