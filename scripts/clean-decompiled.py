# Build decompiled/clean/: decode %XX names, drop `if(false)` #initclip stubs. Usage: python3 -I clean-decompiled.py <src> <dst>
import sys, os, shutil, urllib.parse
src, dst = sys.argv[1], sys.argv[2]
shutil.rmtree(dst, ignore_errors=True)
kept = dropped = 0
for root, _, files in os.walk(src):
    for f in files:
        p = os.path.join(root, f)
        txt = open(p, encoding='utf-8', errors='replace').read()
        if 'DefineSprite_' in p and txt.lstrip().startswith('if(false)') and len(txt) < 200:
            dropped += 1; continue
        rel = urllib.parse.unquote(os.path.relpath(p, src)).replace('/scripts/', '/', 1).replace('::', '.')
        out = os.path.join(dst, rel); os.makedirs(os.path.dirname(out), exist_ok=True)
        open(out, 'w', encoding='utf-8').write(txt); kept += 1
print(f'kept {kept}, dropped {dropped} stubs')
