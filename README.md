# Kernora Agent Security

**A zero-install security baseline for AI coding agents.** Point Claude Code, Cursor, or any
MCP-capable agent at one URL and it reads a curated, cited security baseline every session (via a minimal JSON-RPC-over-HTTP MCP subset — works with Claude Code today) — so it
stops shipping the mistakes that cause incidents (a hardcoded secret, a `curl | bash`, a
prompt-injected "send this to that URL"). When it catches one, it cites the exact rule.

**Advisory grounding, free and open.** Real-time *blocking* against your organization's own
decisions — plus a tamper-evident audit ledger for EU AI Act / SOC-2 — is the paid **Kernora Axiora**
Integrity Plane.

Live: **https://agentsec.kernora.ai**

---

## Connect in one line

Add it as an MCP server in your agent's config:

```json
{
  "mcpServers": {
    "agentsec": { "url": "https://agentsec.kernora.ai/mcp" }
  }
}
```

That's it — no install, no signup. It's read-only: `get_security_baseline` sends nothing, and `check_action` sends only the short action text you choose to pass it (never your files, repo, or environment).

Tools exposed:
- `get_security_baseline` — the full known-good rule set.
- `check_action` — pass an action/command; get back the baseline rules that apply, so the agent can
  self-correct. **Advisory only** — it does not block.

Or read the rules directly: [`/baseline.json`](https://agentsec.kernora.ai/baseline.json) ·
[`/baseline.yaml`](https://agentsec.kernora.ai/baseline.yaml)

## What's inside

15 rules across categories including secrets, injection, supply-chain, destructive ops, permissions,
transport, data protection, exfiltration, authz, and VCS safety. **Every rule cites a real source** —
OWASP (incl. the LLM Top 10), CWE identifiers, and regulations (EU AI Act, PCI-DSS, HIPAA).

## Self-host

It's a single Cloudflare Worker with no dependencies, no storage, and no secrets.

```bash
npm install -g wrangler   # if needed
npm test                  # runs the local test suite (node test.mjs)
wrangler deploy           # deploy to your own Cloudflare account
```

Air-gapped or privacy-strict? Run it on your own infrastructure and point your agents at it.

## Free grounds. Paid blocks.

| | Kernora Agent Security (this, free) | Kernora Axiora — Integrity Plane (paid) |
|---|---|---|
| **What** | Grounds the agent: it knows the baseline and cites it | Blocks in real time against *your org's* decisions |
| **How** | Advisory MCP grounding | Tiered verifier, real-time block + attested audit ledger |
| **For** | Any developer, any agent | Enterprises with agent fleets and compliance obligations |

Talk to us about blocking + attestation: **hello@kernora.ai**

## How it relates to endpoint monitors

Endpoint agent monitors (e.g. Perplexity's Numbat) watch for *generically suspicious* behavior.
Kernora Agent Security supplies what they lack: what's *known-good* for your codebase. The two are
complementary — this project can even export its rules for a monitor to enforce.

## Honesty note

This endpoint provides **advisory grounding only**. A matched rule is guidance; an *unmatched* action
is **not** an assurance of safety. Real-time enforcement and audit are the paid Integrity Plane.

## Claude Code plugin (optional, one command)

Instead of the manual MCP config, install the plugin — it bundles the MCP server, a skill that tells
your agent to consult the baseline, an advisory PreToolUse hook (warns before risky commands), and
helper commands:

```
/plugin marketplace add kernora-ai/agent-sec
/plugin install kernora-agent-security
```

Commands: `/agentsec-rules` (show every rule), `/agentsec-check <action>`, `/agentsec-report` (a LOCAL
view of how many risky actions it caught — nothing is sent to us). Disable the hook anytime with
`AGENTSEC_HOOK=0`.

## See every rule / how effective / how to remove

- **See the rules:** readable at https://agentsec.kernora.ai/rules · raw at `/baseline.json` (or
  `.yaml`) · or the `get_security_baseline` MCP tool. Nothing is hidden.
- **Effectiveness / reporting:** the free tier is stateless and private — we store nothing. The plugin
  logs flags LOCALLY (`~/.agentsec/flags.log`); `/agentsec-report` summarizes them. Full per-action
  reporting with a tamper-evident audit ledger is the paid Kernora Axiora plane.
- **Remove it:** Claude Code — `claude mcp remove agentsec` (+ `/plugin uninstall
  kernora-agent-security` if installed). Cursor — delete the `agentsec` entry from
  `~/.cursor/mcp.json` and restart. It's read-only and stores nothing, so nothing is left behind.

## About

Kernora Agent Security is built by [Kernora](https://kernora.ai) on the open
[Factlet Protocol](https://factlet.ai). Licensed Apache-2.0 (see [LICENSE](./LICENSE)).
