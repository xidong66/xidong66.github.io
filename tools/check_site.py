#!/usr/bin/env python
"""Check published pages and local assets using Python's standard library."""

from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import json
import re
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
VOID_TAGS = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
             'link', 'meta', 'param', 'source', 'track', 'wbr'}


class HomepageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.ids = set()
        self.counts = Counter()
        self.references = []
        self.stylesheets = []
        self.errors = []
        self.citation_count = 0
        self.translation_keys = []

    def handle_decl(self, declaration):
        if declaration.lower() == 'doctype html':
            self.counts['doctype'] += 1

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        self.translation_keys.extend(attrs[key] for key in ('data-i18n', 'data-i18n-placeholder', 'data-i18n-aria-label') if key in attrs)
        self.counts[tag] += 1
        if tag == 'section' and 'section' in self.stack:
            self.errors.append('Homepage sections must be siblings')
        if tag not in VOID_TAGS:
            self.stack.append(tag)
        if attrs.get('id'):
            if attrs['id'] in self.ids:
                self.errors.append(f'Duplicate id: {attrs["id"]}')
            self.ids.add(attrs['id'])
        if tag == 'img' and 'alt' not in attrs:
            self.errors.append(f'Missing image alt text: {attrs.get("src")}')
        if attrs.get('target') == '_blank' and 'noopener' not in attrs.get('rel', '').split():
            self.errors.append('New-window link is missing rel="noopener"')
        for key in ('href', 'src'):
            if key in attrs:
                value = attrs[key].strip()
                if not value or value.lower().startswith('javascript:'):
                    self.errors.append(f'Empty or JavaScript {key} on <{tag}>')
                else:
                    self.references.append(value)
        if tag == 'link' and attrs.get('rel') == 'stylesheet':
            self.stylesheets.append(attrs.get('href', ''))
        if 'data-citation' in attrs:
            self.citation_count += 1
            if not attrs.get('href', '').endswith('.bib'):
                self.errors.append('BibTeX link must point to a .bib file')

    def handle_startendtag(self, tag, attributes):
        self.handle_starttag(tag, attributes)
        if tag not in VOID_TAGS:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if not self.stack or self.stack[-1] != tag:
            self.errors.append(f'Unexpected closing </{tag}> at line {self.getpos()[0]}')
        else:
            self.stack.pop()


def check_reference(reference, base, errors, homepage_ids=None):
    parsed = urlsplit(reference)
    if parsed.scheme or parsed.netloc:
        return
    path = unquote(parsed.path)
    target = (ROOT / path.lstrip('/') if path.startswith('/') else base / path).resolve()
    if not target.is_relative_to(ROOT):
        errors.append(f'Asset path leaves project: {reference}')
    elif path and not target.exists():
        errors.append(f'Missing local asset: {reference}')
    if not path and parsed.fragment and homepage_ids is not None:
        if unquote(parsed.fragment) not in homepage_ids:
            errors.append(f'Missing anchor: {reference}')


def main():
    errors = []
    summaries = []
    catalog = ROOT / 'js/preferences.js'
    translation_keys = set(re.findall(r"'([\w.]+)'\s*:\s*\[", catalog.read_text(encoding='utf-8'))) if catalog.exists() else set()
    for relative in ('index.html', 'studio/index.html'):
        page = ROOT / relative
        if not page.is_file():
            errors.append(f'Missing page: {relative}')
            continue
        parser = HomepageParser()
        parser.feed(page.read_text(encoding='utf-8'))
        parser.close()
        if parser.stack:
            parser.errors.append(f'Unclosed tags: {parser.stack}')
        for tag in ('doctype', 'html', 'head', 'body', 'main', 'title'):
            if parser.counts[tag] != 1:
                parser.errors.append(f'Expected one {tag}, found {parser.counts[tag]}')
        for reference in parser.references:
            check_reference(reference, page.parent, parser.errors, parser.ids)
        for key in parser.translation_keys:
            if key not in translation_keys:
                parser.errors.append(f'Missing translation: {key}')
        # Only validate stylesheets loaded by these pages, not archived exports.
        for stylesheet in parser.stylesheets:
            parsed = urlsplit(stylesheet)
            if parsed.scheme or parsed.netloc:
                continue
            path = (page.parent / unquote(parsed.path)).resolve()
            if path.is_file():
                for url in re.findall(r'url\(\s*[\'"]?([^\)\'"\s]+)', path.read_text(encoding='utf-8')):
                    check_reference(url, path.parent, parser.errors)
        errors.extend(f'{relative}: {error}' for error in parser.errors)
        summaries.append(f'{relative}: {len(parser.references)} references, {parser.citation_count} citations')
    for module in ('js/studio.js', 'js/studio-scene.js', 'js/vendor/three/three.module.js'):
        path = ROOT / module
        if not path.is_file():
            errors.append(f'Missing module: {module}')
            continue
        text = path.read_text(encoding='utf-8')
        imports = re.findall(r'(?:from\s*|import\s*\()\s*[\'"](\.[^\'"]+)', text)
        for reference in imports:
            check_reference(reference, path.parent, errors)
    check_reference('js/vendor/three/LICENSE', ROOT, errors)
    try:
        data = json.loads((ROOT / 'assets/studio/countries.geojson').read_text(encoding='utf-8'))
        if data.get('type') != 'FeatureCollection' or not data.get('features'):
            errors.append('Globe map must be a nonempty GeoJSON FeatureCollection')
        elif any(feature.get('geometry', {}).get('type') not in ('Polygon', 'MultiPolygon')
                 or not feature.get('geometry', {}).get('coordinates') for feature in data['features']):
            errors.append('Globe map has unsupported or empty geometry')
    except (OSError, ValueError) as error:
        errors.append(f'Globe map cannot be read: {error}')
    for bib in (ROOT / 'assets' / 'bibtex').glob('*.bib'):
        text = bib.read_text(encoding='utf-8')
        if not re.match(r'@\w+\{[^,]+,', text) or text.count('{') != text.count('}'):
            errors.append(f'Malformed BibTeX: {bib.name}')
    if errors:
        for error in errors:
            print(f'ERROR: {error}')
        return 1
    print('Site checks passed: ' + '; '.join(summaries) + '.')
    print('External URLs and archived note exports are not checked.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
