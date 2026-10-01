"""Build the offline dashboard and derive a strict CSP from its exact bytes."""
import base64
import hashlib
import json
import pathlib
import re
from urllib.parse import urlsplit

ROOT = pathlib.Path(__file__).resolve().parents[1]
ALLOWED_HOSTS = frozenset({
    'github.com', 'hosungseo.github.io', 'law.go.kr', 'www.law.go.kr',
    'www.mnd.go.kr', 'mnd.go.kr', 'www.dapa.go.kr', 'dapa.go.kr', 'www.d2b.go.kr',
})


def validate_url(value):
    if not isinstance(value, str) or re.search(r'[\x00-\x20\x7f\\]', value):
        raise ValueError('External links must be clean absolute HTTPS URLs')
    url = urlsplit(value)
    if (url.scheme != 'https' or url.hostname not in ALLOWED_HOSTS
            or url.username is not None or url.password is not None
            or url.port not in (None, 443)):
        raise ValueError('External link is outside the approved HTTPS hosts')


def validate_data(data):
    items = data['items']
    ids = [i['id'] for i in items]
    slugs = [i['slug'] for i in items]
    if len(ids) != len(set(ids)) or not all(re.fullmatch(r'D[0-9]{2}', x) for x in ids):
        raise ValueError('Institution IDs must be unique Dxx identifiers')
    if len(slugs) != len(set(slugs)) or not all(re.fullmatch(r'[a-z0-9-]{1,120}', x) for x in slugs):
        raise ValueError('Institution slugs must be unique URL-safe identifiers')
    validate_url(data['meta']['sourceRepo'])
    if not re.fullmatch(r'[a-f0-9]{40}', data['meta']['sourceCommit']):
        raise ValueError('Invalid source commit')
    for item in items:
        validate_url(item['originalUrl'])
        for source in item['sources']:
            validate_url(source['officialUrl'])
        nodes = [n['id'] for n in item['nodes']]
        if len(nodes) != len(set(nodes)) or not all(re.fullmatch(r'[A-Za-z0-9_-]{1,64}', x) for x in nodes):
            raise ValueError('Invalid or duplicate node ID')
        if any(e['source'] not in nodes or e['target'] not in nodes for e in item['edges']):
            raise ValueError('Edge endpoint does not exist')
    if any(r['source'] not in ids or r['target'] not in ids for r in data['meta']['relationships']):
        raise ValueError('Related institution does not exist')


def validate_ontology(graph):
    types = {t['id'] for t in graph['types']}
    nodes = {n['id']: n for n in graph['nodes']}
    sources = {s['id'] for s in graph['sources']}
    relations = {r['id']: r for r in graph['relations']}
    if len(nodes) != len(graph['nodes']):
        raise ValueError('Duplicate ontology node')
    if len({e['id'] for e in graph['edges']}) != len(graph['edges']):
        raise ValueError('Duplicate ontology edge')
    for source in graph['sources']:
        validate_url(source['url'])
    for node in graph['nodes']:
        if not re.fullmatch(r'[A-Za-z0-9_-]{1,100}', node['id']) or node['type'] not in types:
            raise ValueError('Invalid ontology node')
        if node.get('url'):
            validate_url(node['url'])
    for item in graph['nodes'] + graph['edges']:
        if item['level'] not in ('source', 'original', 'model') or not set(item['sources']) <= sources:
            raise ValueError('Invalid provenance')
        if item['level'] in ('source', 'original') and not item['sources']:
            raise ValueError('Evidence source missing')
    for edge in graph['edges']:
        if edge['source'] not in nodes or edge['target'] not in nodes or edge['predicate'] not in relations:
            raise ValueError('Unresolved ontology edge')
        rel = relations[edge['predicate']]
        if nodes[edge['source']]['type'] not in rel['domain'] or nodes[edge['target']]['type'] not in rel['range']:
            raise ValueError('Ontology domain/range mismatch')
    for route in graph['routes']:
        if any(n not in nodes or nodes[n]['type'] != 'Process' for n in route['nodes']):
            raise ValueError('Invalid route stage')


def embedded_json(value):
    text = json.dumps(value, ensure_ascii=False, separators=(',', ':'))
    for char, escape in [('<', '\\u003c'), ('>', '\\u003e'), ('&', '\\u0026'),
                         ('\u2028', '\\u2028'), ('\u2029', '\\u2029')]:
        text = text.replace(char, escape)
    return text


def csp_hash(text):
    return "'sha256-" + base64.b64encode(hashlib.sha256(text.encode('utf-8')).digest()).decode() + "'"


def build():
    data = json.loads((ROOT / 'data/institutions.json').read_text(encoding='utf-8'))
    validate_data(data)
    ontology = json.loads((ROOT / 'data/ontology.json').read_text(encoding='utf-8'))
    validate_ontology(ontology)
    html = (ROOT / 'template.html').read_text(encoding='utf-8')
    replacements = {
        '__DATA__': embedded_json(data),
        '__ONTOLOGY_DATA__': embedded_json(ontology),
        '__ONTOLOGY_CSS__': (ROOT / 'ui/ontology.css').read_text(encoding='utf-8'),
        '__ONTOLOGY_JS__': (ROOT / 'ui/ontology.js').read_text(encoding='utf-8'),
        '__LICENSE__': (ROOT / 'LICENSE').read_text(encoding='utf-8'),
        '__FONT__': base64.b64encode((ROOT / 'data/font-subset.woff').read_bytes()).decode(),
        '__FONT_LICENSE__': (ROOT / 'FONT-LICENSE.txt').read_text(encoding='utf-8'),
    }
    # One pass: data containing placeholder-like text must stay data.
    html = re.sub(r'__(?:DATA|LICENSE|FONT|FONT_LICENSE|ONTOLOGY_DATA|ONTOLOGY_CSS|ONTOLOGY_JS)__', lambda m: replacements[m[0]], html)
    scripts = re.findall(r'<script>([\s\S]*?)</script>', html)
    styles = re.findall(r'<style>([\s\S]*?)</style>', html)
    if len(scripts) != 1 or len(styles) != 1:
        raise ValueError('Expected one executable script and one style block')
    html = html.replace('__SCRIPT_HASH__', csp_hash(scripts[0])).replace('__STYLE_HASH__', csp_hash(styles[0]))
    if re.search(r'\s(?:style|on\w+)\s*=', html, re.I):
        raise ValueError('Inline style and event-handler attributes are forbidden')
    (ROOT / 'index.html').write_text(html, encoding='utf-8', newline='\n')
    print('Built index.html:', len(html.encode('utf-8')), 'bytes; data validation and CSP hashes OK')


if __name__ == '__main__':
    build()
