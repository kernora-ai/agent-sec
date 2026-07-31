#!/usr/bin/env python3
# Kernora Agent Security — PreToolUse (Bash) advisory hook.
# Fast local pre-filter; only risky-looking commands hit the network. ADVISORY —
# it never blocks. Surfaces cited baseline rules to the agent and logs flags
# LOCALLY (~/.agentsec/flags.log) for `/agentsec-report`. Nothing is sent to us
# except the short command string, and only when it looks risky. Fail-open.
# Disable anytime: remove the plugin, or set AGENTSEC_HOOK=0 in your environment.
import sys, json, os, re, time, subprocess

if os.environ.get("AGENTSEC_HOOK", "1") == "0":
    sys.exit(0)
try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)
cmd = (((data or {}).get("tool_input") or {}).get("command") or "")
if not cmd.strip():
    sys.exit(0)

RISKY = re.compile(
    r"(curl|wget|iwr).{0,40}\|\s*(bash|sh|zsh)|rm\s+-rf|chmod\s+0?777|"
    r"(api[_-]?key|secret|token|password|credential)|\.env\b|"
    r"verify\s*=\s*false|rejectunauthorized|NODE_TLS_REJECT|curl\s+-k|"
    r"git\s+push\s+-f|push\s+--force|reset\s+--hard|"
    r"drop\s+table|truncate\s+|terraform\s+apply|pip\s+install|npm\s+i(nstall)?\b|eval\s*\(",
    re.I)
if not RISKY.search(cmd):
    sys.exit(0)

payload = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/call",
    "params": {"name": "check_action", "arguments": {"action": cmd[:600]}}})
try:
    out = subprocess.run(
        ["curl", "-s", "--max-time", "3", "-X", "POST",
         "https://agentsec.kernora.ai/mcp", "-H", "Content-Type: application/json",
         "-d", payload],
        capture_output=True, text=True, timeout=5).stdout
    text = json.loads(out)["result"]["content"][0]["text"]
except Exception:
    sys.exit(0)
if "flags" not in text.lower():
    sys.exit(0)

try:
    d = os.path.expanduser("~/.agentsec"); os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "flags.log"), "a") as f:
        n = len(re.findall(r"^• ", text, re.M))
        f.write(json.dumps({"t": int(time.time()), "rules": n, "cmd": cmd[:120]}) + "\n")
except Exception:
    pass

print(json.dumps({"hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "additionalContext": "⚠️ Kernora Agent Security (advisory): " + text}}))
sys.exit(0)
