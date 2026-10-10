# Tally SWF tag types across files. Usage: python3 -I swf-tags.py <dir>
import sys, os, zlib, collections
NAMES = {0:'End',1:'ShowFrame',2:'DefineShape',4:'PlaceObject',5:'RemoveObject',6:'DefineBits',7:'DefineButton',8:'JPEGTables',9:'SetBackgroundColor',10:'DefineFont',11:'DefineText',12:'DoAction',13:'DefineFontInfo',14:'DefineSound',15:'StartSound',17:'DefineButtonSound',18:'SoundStreamHead',19:'SoundStreamBlock',20:'DefineBitsLossless',21:'DefineBitsJPEG2',22:'DefineShape2',23:'DefineButtonCxform',24:'Protect',26:'PlaceObject2',28:'RemoveObject2',32:'DefineShape3',33:'DefineText2',34:'DefineButton2',35:'DefineBitsJPEG3',36:'DefineBitsLossless2',37:'DefineEditText',39:'DefineSprite',43:'FrameLabel',45:'SoundStreamHead2',46:'DefineMorphShape',48:'DefineFont2',56:'ExportAssets',57:'ImportAssets',58:'EnableDebugger',59:'DoInitAction',62:'DefineFontInfo2'}
def tags(data, pos, end, out):
    while pos < end:
        h = int.from_bytes(data[pos:pos+2],'little'); pos += 2
        code, ln = h >> 6, h & 63
        if ln == 63: ln = int.from_bytes(data[pos:pos+4],'little'); pos += 4
        out[NAMES.get(code, str(code))] += 1
        if code == 39: tags(data, pos+4, pos+ln, out)
        if code == 0 and end == len(data): break
        pos += ln
total = collections.Counter(); per = {}
for root, _, files in os.walk(sys.argv[1]):
    for f in files:
        if not f.endswith('.swf'): continue
        p = os.path.join(root, f); raw = open(p,'rb').read()
        data = raw[:8] + (zlib.decompress(raw[8:]) if raw[:3] == b'CWS' else raw[8:])
        nbits = data[8] >> 3; rect = (5 + nbits*4 + 7)//8
        c = collections.Counter(); tags(data, 8+rect+4, len(data), c)
        total += c; per[os.path.relpath(p, sys.argv[1])] = c
for k, v in total.most_common(): print(f'{v:8} {k}')
print('\nSWFs containing DefineMorphShape/Sound/EditText/Font/Bitmaps:')
for k in ['DefineMorphShape','DefineSound','SoundStreamHead','DefineEditText','DefineFont2','DefineBitsLossless2','DefineBitsJPEG2','DefineBits','DefineBitsLossless','DefineText']:
    fs = [p for p, c in per.items() if c[k]]
    print(f'{k}: {len(fs)} files e.g. {fs[:5]}')
