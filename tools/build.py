import json,pathlib,base64
root=pathlib.Path(__file__).resolve().parents[1]
data=json.loads((root/'data/institutions.json').read_text())
license=(root/'LICENSE').read_text()
html=(root/'template.html').read_text().replace('__DATA__',json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')).replace('__LICENSE__',license).replace('__FONT__',base64.b64encode((root/'data/font-subset.woff').read_bytes()).decode()).replace('__FONT_LICENSE__',(root/'FONT-LICENSE.txt').read_text())
(root/'index.html').write_text(html)
print('Built index.html:',len(html.encode()),'bytes')
