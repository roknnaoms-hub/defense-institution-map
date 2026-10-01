"""Validate build-time guards and generated CSP without network access."""
import copy
import json
import re
import unittest
from html.parser import HTMLParser
from build import ROOT, csp_hash, embedded_json, validate_data, validate_url, validate_ontology


class BuildSecurityTests(unittest.TestCase):
    def test_urls(self):
        for url in ['javascript:alert(1)', 'http://law.go.kr/', 'https://law.go.kr.evil.example/',
                    'https://evil.example@law.go.kr/', 'https://law.go.kr:8443/',
                    'https://law.go.kr/\n', '//law.go.kr/', 'https://law.go.kr\\@evil.example/']:
            with self.assertRaises(ValueError):
                validate_url(url)
        validate_url('https://www.law.go.kr/LSW/lsInfoP.do?lsId=010107')

    def test_script_breakout_and_roundtrip(self):
        value = {'title': '</script><!--<script>alert(1)</script>&\u2028\u2029'}
        encoded = embedded_json(value)
        self.assertNotIn('<', encoded)
        self.assertNotIn('&', encoded)
        self.assertEqual(json.loads(encoded), value)

    def test_data_integrity(self):
        data = json.loads((ROOT / 'data/institutions.json').read_text())
        validate_data(data)
        for change in ['url', 'id', 'edge', 'relationship']:
            edited = copy.deepcopy(data)
            if change == 'url': edited['items'][0]['sources'][0]['officialUrl'] = 'javascript:alert(1)'
            if change == 'id': edited['items'][0]['id'] = edited['items'][1]['id']
            if change == 'edge': edited['items'][0]['edges'][0]['source'] = 'MISSING'
            if change == 'relationship': edited['meta']['relationships'][0]['target'] = 'D99'
            with self.assertRaises(ValueError): validate_data(edited)

    def test_ontology_guards(self):
        graph = json.loads((ROOT / 'data/ontology.json').read_text())
        validate_ontology(graph)
        for change in ['endpoint', 'domain', 'provenance', 'url', 'id', 'route']:
            edited = copy.deepcopy(graph)
            if change == 'endpoint': edited['edges'][0]['source'] = 'missing'
            if change == 'domain': edited['edges'][0]['target'] = 'program-ax'
            if change == 'provenance': edited['edges'][0]['sources'] = []
            if change == 'url': edited['sources'][0]['url'] = 'javascript:alert(1)'
            if change == 'id': edited['nodes'][0]['id'] = edited['nodes'][1]['id']
            if change == 'route': edited['routes'][0]['nodes'][0] = 'program-ax'
            with self.assertRaises(ValueError): validate_ontology(edited)

    def test_hashes_and_attributes(self):
        html = (ROOT / 'index.html').read_text()
        csp = re.search(r'http-equiv="Content-Security-Policy" content="([^"]+)"', html)[1]
        self.assertIn("connect-src 'none'", csp)
        self.assertNotIn('unsafe-inline', csp)
        self.assertNotIn('unsafe-eval', csp)
        for tag in ['style', 'script']:
            contents = re.findall(r'<' + tag + r'>([\s\S]*?)</' + tag + '>', html)
            self.assertEqual(len(contents), 1)
            self.assertIn(csp_hash(contents[0]), csp)
        outer = self
        class CheckHTML(HTMLParser):
            def handle_starttag(self, tag, attrs):
                a = dict(attrs)
                outer.assertFalse(any(k == 'style' or k.startswith('on') for k in a))
                if tag != 'a':
                    for key in ['src', 'href', 'action', 'data']:
                        outer.assertFalse(a.get(key, '').startswith(('https:', 'http:', '//')))
                if tag == 'a' and a.get('target') == '_blank':
                    outer.assertTrue({'noopener','noreferrer'}.issubset(a.get('rel','').split()))
        CheckHTML().feed(html)


if __name__ == '__main__':
    unittest.main()
