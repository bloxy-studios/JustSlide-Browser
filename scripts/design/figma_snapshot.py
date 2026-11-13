#!/usr/bin/env python3
"""Reduce raw Figma REST responses (fetched via the Composio Figma MCP:
FIGMA_GET_FILE_NODES) to a reviewable, repository-owned design snapshot.

  python3 scripts/design/figma_snapshot.py RAW1.json [RAW2.json ...] > design/figma/snapshot.json

RAW files are Composio multi-execute outputs (results[i].response.data with a
`nodes` map). Only layout/style facts are kept; vector path data is dropped.
Figma variable *names* need the `file_variables:read` scope, which the
connected account lacks, so variables are recorded by id with the resolved
value observed in each frame/mode and the layers they are bound to.
"""
import json, sys
from collections import defaultdict

SKIP = {'VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'REGULAR_POLYGON', 'GROUP'}
MODES = {'50:0': 'mint', '50:1': 'light', '55:1': 'dark'}

def hexc(c, o=1.0):
    a = c.get('a', 1) * o
    s = '#%02x%02x%02x' % tuple(round(c[k] * 255) for k in 'rgb')
    return s if a >= 0.999 else s + '%02x' % round(a * 255)

def paints(ps):
    out = []
    for p in ps or []:
        if p.get('visible') is False:
            continue
        if p['type'] == 'SOLID':
            e = {'hex': hexc(p['color'], p.get('opacity', 1))}
            v = p.get('boundVariables', {}).get('color')
            if v: e['var'] = v['id']
            out.append(e)
        else:
            out.append({'type': p['type']})
    return out

def collect_vars(n, sink):
    """Record variable-bound paints on every layer, including icon vectors."""
    for k in ('fills', 'strokes'):
        for pnt in paints(n.get(k)):
            if 'var' in pnt:
                sink.append((pnt['var'], pnt['hex'], f"{n.get('name')} ({k[:-1]})"))
    for c in n.get('children', []) or []:
        collect_vars(c, sink)

def node(n, ox, oy, depth, rows, in_icon):
    bb = n.get('absoluteBoundingBox') or {}
    r = {'d': depth, 'id': n['id'], 'name': n.get('name'), 'type': n['type'],
         'box': [round(bb.get('x', 0) - ox, 1), round(bb.get('y', 0) - oy, 1), round(bb.get('width', 0), 1), round(bb.get('height', 0), 1)]}
    if n.get('visible') is False: r['hidden'] = True
    for k, src in (('fills', 'fills'), ('strokes', 'strokes')):
        v = paints(n.get(src))
        if v: r[k] = v
    if r.get('strokes'): r['strokeWeight'] = n.get('strokeWeight')
    if n.get('strokeDashes'): r['dashes'] = n['strokeDashes']
    if n.get('cornerRadius'): r['radius'] = n['cornerRadius']
    if n.get('opacity', 1) != 1: r['opacity'] = round(n['opacity'], 3)
    ef = [e for e in n.get('effects', []) if e.get('visible', True)]
    if ef: r['effects'] = [e['type'] for e in ef]
    if n.get('layoutMode') not in (None, 'NONE'):
        r['layout'] = {'mode': n['layoutMode'], 'gap': n.get('itemSpacing', 0),
                       'padding': [n.get('paddingTop', 0), n.get('paddingRight', 0), n.get('paddingBottom', 0), n.get('paddingLeft', 0)],
                       'primary': n.get('primaryAxisAlignItems', 'MIN'), 'counter': n.get('counterAxisAlignItems', 'MIN')}
    if n.get('overflowDirection') not in (None, 'NONE'): r['overflow'] = n['overflowDirection']
    if n['type'] == 'TEXT':
        st = n.get('style', {})
        r['text'] = n.get('characters')
        r['font'] = {k: st.get(s) for k, s in (('family', 'fontFamily'), ('size', 'fontSize'), ('weight', 'fontWeight'),
                     ('lineHeight', 'lineHeightPx'), ('letterSpacing', 'letterSpacing'), ('case', 'textCase'), ('truncation', 'textTruncation'))}
    if n.get('componentId'): r['component'] = n['componentId']
    if n.get('componentProperties'): r['props'] = {k: v.get('value') for k, v in n['componentProperties'].items()}
    if in_icon:
        r['icon'] = True
    rows.append(r)
    is_icon = n['type'] == 'FRAME' and all(c['type'] in SKIP | {'ELLIPSE', 'RECTANGLE'} for c in n.get('children', [])) and n.get('children')
    if is_icon:
        return  # icon internals are exported as SVG separately
    for c in n.get('children', []) or []:
        if c['type'] in SKIP:
            continue
        node(c, ox, oy, depth + 1, rows, False)

def main(paths):
    frames, comps, sets, meta = {}, {}, {}, {}
    for p in paths:
        for res in json.load(open(p))['results']:
            d = res['response'].get('data', {})
            if 'nodes' not in d or not isinstance(d['nodes'], dict):
                continue
            meta = {'name': d.get('name'), 'lastModified': d.get('lastModified'), 'version': d.get('version')}
            for nid, nd in d['nodes'].items():
                doc = nd['document']; bb = doc['absoluteBoundingBox']
                rows = []
                node(doc, bb['x'], bb['y'], 0, rows, False)
                mode = MODES.get(next(iter((doc.get('explicitVariableModes') or {}).values()), ''), None)
                bindings = []
                collect_vars(doc, bindings)
                frames[nid] = {'name': doc['name'], 'size': [bb['width'], bb['height']], 'variableMode': mode, 'nodes': rows,
                               '_bindings': bindings}
                comps.update(nd.get('components') or {}); sets.update(nd.get('componentSets') or {})
    variables = defaultdict(lambda: {'values': {}, 'boundTo': set()})
    for fid, f in frames.items():
        mode = f['variableMode'] or 'unbound'
        for var, hexv, where in f.pop('_bindings'):
            v = variables[var]
            v['values'].setdefault(mode, hexv)
            v['boundTo'].add(where)
    out = {
        'source': {'fileKey': 'nw47hqMLTtmBMksJ4BnJKb', 'via': 'Composio MCP Figma toolkit (FIGMA_GET_FILE_NODES)', **meta},
        'variableCollection': {'id': 'VariableCollectionId:50:24', 'modes': MODES,
                               'note': 'variable names unavailable: connected account lacks file_variables:read'},
        'variables': {k: {'values': v['values'], 'boundTo': sorted(v['boundTo'])} for k, v in sorted(variables.items())},
        'components': {k: {'name': v.get('name'), 'description': v.get('description', ''), 'set': v.get('componentSetId')} for k, v in comps.items()},
        'componentSets': {k: {'name': v.get('name'), 'description': v.get('description', '')} for k, v in sets.items()},
        'frames': frames,
    }
    json.dump(out, sys.stdout, indent=1, ensure_ascii=False)
    sys.stdout.write('\n')

if __name__ == '__main__':
    main(sys.argv[1:])
