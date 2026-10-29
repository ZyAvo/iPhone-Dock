# mon-ecran-version: 103be76d
# Téléchargements Yahoo Finance pour outils/marches-data.mjs.
# Yahoo refuse (erreur 429) les requêtes qui ne ressemblent pas à un vrai navigateur, surtout depuis les serveurs
# de GitHub : on passe par curl_cffi, qui imite Chrome, avec le cookie et le « crumb » que Yahoo attend.
# Entrée (stdin) : liste JSON d'adresses. Sortie (stdout) : {adresse: {"status": code, "body": texte ou null}}.
import json, sys, time, urllib.parse
from curl_cffi import requests

urls = json.load(sys.stdin)
s = requests.Session(impersonate="chrome")
crumb = None
for warm in ("https://fc.yahoo.com", "https://finance.yahoo.com/"):
    try:
        s.get(warm, timeout=15)
    except Exception:
        pass
for host in ("query1", "query2"):
    try:
        r = s.get(f"https://{host}.finance.yahoo.com/v1/test/getcrumb", timeout=15)
        if r.status_code == 200 and r.text and "<" not in r.text:
            crumb = r.text.strip()
            break
    except Exception:
        pass
print(f"crumb {'obtenu' if crumb else 'absent'}", file=sys.stderr)

out = {}
for u in urls:
    full = u + (("&" if "?" in u else "?") + "crumb=" + urllib.parse.quote(crumb, safe="") if crumb else "")
    status, body = 0, None
    for attempt in range(3):
        try:
            r = s.get(full, timeout=20)
            status = r.status_code
            if status == 200:
                body = r.text
                break
            if status == 404:
                body = r.text
                break
        except Exception as e:
            status = str(e)[:80]
        time.sleep(3 * (attempt + 1))
    out[u] = {"status": status, "body": body}
    time.sleep(0.8)
json.dump(out, sys.stdout)
