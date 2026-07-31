---
description: Local effectiveness report — how many actions Kernora Agent Security flagged in your own sessions (read from ~/.agentsec/flags.log; nothing is sent anywhere).
allowed-tools: Bash(cat:*), Bash(wc:*), Bash(test:*), Bash(python3:*)
---
Read the LOCAL advisory log and summarize it for the user. Run:

!`python3 - <<'PY'
import json,os,collections,time
p=os.path.expanduser("~/.agentsec/flags.log")
if not os.path.exists(p): print("No flags yet — the advisory hook hasn't caught anything in your sessions (or isn't enabled)."); raise SystemExit
rows=[json.loads(l) for l in open(p) if l.strip()]
if not rows: print("No flags recorded yet."); raise SystemExit
total=len(rows); rules=sum(r.get("rules",0) for r in rows)
first=time.strftime("%Y-%m-%d",time.localtime(min(r["t"] for r in rows)))
print(f"Kernora Agent Security — your local effectiveness view (nothing left your machine):")
print(f"  {total} risky action(s) flagged since {first}; {rules} rule-citation(s) surfaced.")
c=collections.Counter(r["cmd"].split()[0] if r.get("cmd") else "?" for r in rows)
print("  most-flagged command starts: " + ", ".join(f"{k}×{v}" for k,v in c.most_common(5)))
PY`

Then explain: this is a LOCAL view only (we store nothing server-side — the free tier is stateless
and private). Full per-action reporting with a tamper-evident, cited audit ledger is the paid Kernora
Axiora Integrity Plane.
