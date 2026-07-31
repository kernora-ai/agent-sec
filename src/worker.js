// Kernora Agent Security — zero-install security baseline for AI coding agents (Cloudflare Worker).
// Free tier GROUNDS an agent in a curated security baseline (advisory + cited).
// Real-time BLOCKING is the paid Agent Integrity Plane (contact / upgrade path).
//
// Routes:
//   GET  /               landing page (marketing, SEO)
//   GET  /og.png         social/OG share card
//   GET  /baseline.json  the security-baseline factbook (JSON)
//   GET  /baseline.yaml  same, YAML
//   GET  /health         liveness
//   GET  /mcp            MCP endpoint info (human-readable)
//   POST /mcp            MCP over HTTP (JSON-RPC 2.0): initialize, tools/list, tools/call
//
// No secrets, no storage, no PII. Pure read-only advisory grounding.
import { BASELINE, BASELINE_VERSION, baselineStats, matchBaseline } from "../baseline.js";
import { FAVICON_SVG, FAVICON_PNG_B64, APPLE_ICON_B64, OG_PNG_B64 } from "../assets.js";

const bytesFromB64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const png = (b64) =>
  new Response(bytesFromB64(b64), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400", ...CORS },
  });

const CANONICAL = "https://agentsec.kernora.ai";
const CONTACT = "hello@kernora.ai";

// News anchors (leveraging the late-July 2026 agent-security moment). Each link is
// attributed to its source; claims are stated as reported, not as fact.
const NEWS = {
  numbat: "https://www.forbes.com/sites/janakirammsv/2026/07/30/perplexity-open-sources-numbat-to-monitor-risky-ai-coding-agents/",
  osaia: "https://thehackernews.com/2026/07/nvidia-forms-37-member-open-secure-ai.html",
  nvidia: "https://blogs.nvidia.com/blog/open-secure-ai-alliance/",
  absent: "https://www.tomshardware.com/tech-industry/artificial-intelligence/openai-google-and-anthropic-absent-from-nvidia-led-open-secure-ai-alliance-30-companies-join-security-alliance-after-openai-agent-breach",
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

function toYaml(facts) {
  const esc = (s) => `"${String(s).replace(/"/g, '\\"')}"`;
  let out = `version: ${esc(BASELINE_VERSION)}\ncontent:\n`;
  for (const f of facts) {
    out += `  - id: ${esc(f.id)}\n    statement: ${esc(f.statement)}\n`;
    out += `    category: ${esc(f.category)}\n    severity: ${esc(f.severity)}\n`;
    out += `    enforcement_class: ${esc(f.enforcement_class)}\n    confidence: ${f.confidence}\n`;
    out += `    sources: [${f.sources.map(esc).join(", ")}]\n`;
  }
  return out;
}

// ---- MCP over HTTP (minimal JSON-RPC 2.0 Streamable-HTTP subset) ----
const TOOLS = [
  {
    name: "get_security_baseline",
    description:
      "Return Kernora Agent Security's curated security baseline — the known-good rules an AI coding agent should follow (secrets, injection, supply-chain, destructive ops, data protection). Advisory grounding.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "check_action",
    description:
      "Advisory check: given a described action or command the agent is about to take, return the baseline security factlets that plausibly apply, so the agent can self-correct. Advisory only — does NOT block. Real-time blocking is Kernora Agent Security's paid Integrity Plane.",
    inputSchema: {
      type: "object",
      properties: { action: { type: "string", description: "the action/command about to run" } },
      required: ["action"],
    },
  },
];

const rpcResult = (id, result) => json({ jsonrpc: "2.0", id, result });
const rpcError = (id, code, message) => json({ jsonrpc: "2.0", id, error: { code, message } }, 200);

async function handleMcp(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return rpcError(null, -32700, "Parse error");
  }
  const { id = null, method, params = {} } = body || {};
  switch (method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "kernora-agent-security", version: BASELINE_VERSION },
        instructions:
          "Kernora Agent Security gives your agent a security baseline. Call get_security_baseline for the full known-good set, or check_action before a risky command. Advisory only — upgrade to Kernora Axiora for real-time blocking + attested audit ledger.",
      });
    case "notifications/initialized":
      return new Response(null, { status: 202, headers: CORS });
    case "tools/list":
      return rpcResult(id, { tools: TOOLS });
    case "tools/call": {
      const name = params?.name;
      const args = params?.arguments || {};
      if (name === "get_security_baseline") {
        return rpcResult(id, {
          content: [{ type: "text", text: JSON.stringify({ stats: baselineStats(), baseline: BASELINE }, null, 2) }],
        });
      }
      if (name === "check_action") {
        const hits = matchBaseline(args.action || "");
        const text = hits.length
          ? `⚠️ Kernora Agent Security flags ${hits.length} rule(s) relevant to this action (advisory — not a block):\n\n` +
            hits.map((f) => `• [${f.severity}] ${f.statement}  (${f.id})`).join("\n") +
            `\n\nThe free tier is advisory. To BLOCK actions like this in real time with an attested audit trail, upgrade to Kernora Axiora.`
          : "No Kernora Agent Security rule strongly matches this action. (Advisory grounding only — absence of a match is not an assurance of safety.)";
        return rpcResult(id, { content: [{ type: "text", text }], isError: false });
      }
      return rpcError(id, -32602, `Unknown tool: ${name}`);
    }
    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

function landingPage(origin) {
  const s = baselineStats();
  const cats = Object.keys(s.byCategory).length;
  const host = origin && origin.startsWith("http") ? origin : CANONICAL;
  const catRows = Object.entries(s.byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `<span class="pill">${c.replace(/_/g, " ")} · ${n}</span>`)
    .join("");

  const faq = [
    ["How do I add security to Claude Code or Cursor?",
     "Add Kernora Agent Security as an MCP server — one line of config pointing at " + host + "/mcp. Your agent then reads a curated security baseline every session and cites the rule it applies. No install, no signup."],
    ["Is this the same as Perplexity's Numbat?",
     "Complementary, not the same. Numbat is an endpoint monitor that watches for generically-suspicious behavior (secrets, exfil, ATT&CK patterns). Kernora Agent Security gives the agent the known-good baseline to follow in the first place — and the paid Integrity Plane verifies actions against your org's own decisions."],
    ["Does my code leave my machine?",
     "Almost never — and only what you choose. get_security_baseline sends nothing (your agent just fetches a public list). check_action sends only the short action description you pass to it — never your files, repo, or environment. Nothing is stored."],
    ["What standards do the rules map to?",
     "Every rule cites a real source — OWASP (incl. the LLM Top 10), CWE identifiers, and regulations like the EU AI Act, PCI-DSS, and HIPAA."],
    ["What's the difference between Free and paid?",
     "Free grounds (advisory: the agent knows the baseline and cites it). The paid Kernora Axiora Integrity Plane is the product that blocks agent actions contradicting your organization's own verified decisions and produces a tamper-evident, cited audit ledger for compliance evidence. It's sold separately — contact us."],
  ];
  const faqJsonLd = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  const appJsonLd = {
    "@context": "https://schema.org", "@type": "SoftwareApplication",
    name: "Kernora Agent Security", applicationCategory: "SecurityApplication", operatingSystem: "Any (MCP)",
    description: "A zero-install security baseline for AI coding agents. Point any MCP-capable agent at one URL and it reads " + s.total + " OWASP/CWE-cited security rules.",
    url: CANONICAL, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@type": "Organization", name: "Kernora", url: "https://kernora.ai" },
  };

  const desc = `Give your AI coding agent (Claude Code, Cursor) a security baseline in 30 seconds — one MCP URL, no install. ${s.total} OWASP/CWE/EU-AI-Act-cited rules. Free.`;
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kernora Agent Security — baseline for AI coding agents (Claude Code, Cursor) | MCP</title>
<meta name="description" content="${desc}">
<meta name="keywords" content="AI agent security, AI coding agent guardrails, MCP security server, Claude Code security, Cursor security, prompt injection defense, secure AI coding, agent monitoring, Numbat alternative, OWASP LLM Top 10, EU AI Act AI agents">
<link rel="canonical" href="${CANONICAL}/">
<meta name="robots" content="index,follow">
<meta name="theme-color" content="#0b0b0f">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Kernora Agent Security">
<meta property="og:title" content="Kernora Agent Security — a baseline for your AI coding agent">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${CANONICAL}/">
<meta property="og:image" content="${CANONICAL}/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Kernora Agent Security — a baseline for your AI coding agent">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${CANONICAL}/og.png">
<script type="application/ld+json">${JSON.stringify(appJsonLd)}</script>
<script type="application/ld+json">${JSON.stringify(faqJsonLd)}</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{--surface:#FDFBF7;--cream:#F5F1EB;--cream-deep:#EFE9DC;--ink:#1A1614;--muted:#6B6258;--soft:#8A8175;--coral:#B85C3D;--coral-deep:#94472D;--coral-soft:#EDD0C0;--border:#E6DFD3;--border-strong:#D9D0BE;--olive:#7A8450;
--serif:'Fraunces',Georgia,serif;--sans:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;--mono:'JetBrains Mono',Menlo,monospace}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--surface);color:var(--ink);font:17px/1.65 var(--sans);-webkit-font-smoothing:antialiased}
.wrap{max-width:920px;margin:0 auto;padding:0 24px}
a{color:var(--coral);text-decoration:none}a:hover{text-decoration:underline}
header{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;padding:20px 0;border-bottom:1px solid var(--border)}
.brand{display:flex;align-items:center;gap:8px;font-weight:700;letter-spacing:-.01em;color:var(--ink);font-size:1.05em}
.brand-mark{color:var(--coral);font-size:1.2em;line-height:1}.brand .prod{color:var(--muted);font-weight:600}
.nav{display:flex;flex-wrap:wrap;align-items:center;gap:16px;font-size:.92em}
.nav a{color:var(--muted)}.nav a:hover{color:var(--ink);text-decoration:none}
.hero{padding:64px 0 12px}
.eyebrow{color:var(--coral);font-weight:600;letter-spacing:.12em;text-transform:uppercase;font-size:.72em;font-family:var(--mono)}
h1{font-family:var(--serif);font-size:clamp(2.2em,5.5vw,3.4em);line-height:1.05;letter-spacing:-.02em;font-weight:600;margin:.3em 0 .3em}
.sub{font-size:1.25em;color:var(--muted);margin:0 0 1.4em;max-width:38ch}
.ctarow{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:22px 0 8px}
.cta{display:inline-block;background:var(--coral);color:#fff;font-weight:600;padding:13px 22px;border-radius:10px}
.cta:hover{text-decoration:none;background:var(--coral-deep)}
.cta.ghost{background:transparent;color:var(--ink);border:1px solid var(--border-strong)}
h2{font-family:var(--serif);font-size:1.7em;font-weight:600;letter-spacing:-.01em;margin:0 0 .35em}
section{padding:48px 0;border-top:1px solid var(--border)}
.lede{color:var(--muted);max-width:62ch;margin:0 0 1.2em}
.grid{display:grid;gap:16px}.g3{grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.card{background:#fff;border:1px solid var(--border);border-radius:14px;padding:20px 22px}
.card h3{font-family:var(--serif);margin:.1em 0 .4em;font-size:1.1em;font-weight:600}.card p{margin:.2em 0;color:var(--muted);font-size:.95em}
.tag{display:inline-block;font-size:.7em;font-weight:700;color:var(--coral);letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px;font-family:var(--mono)}
code{font-family:var(--mono);font-size:.88em;background:var(--cream);padding:.1em .4em;border-radius:5px}
.codewrap{position:relative}
pre{background:#1A1614;border:1px solid var(--border-strong);border-radius:12px;padding:18px 20px;overflow-x:auto;color:#F5F1EB;font-family:var(--mono);font-size:.9em;margin:.6em 0}
.copy{position:absolute;top:10px;right:10px;background:#2a231f;color:#EDD0C0;border:1px solid #3a322c;border-radius:7px;padding:5px 10px;font-size:.78em;cursor:pointer;font-family:var(--mono)}
.pill{display:inline-block;background:var(--cream);color:var(--coral-deep);border:1px solid var(--border);border-radius:999px;padding:4px 12px;font-size:.82em;margin:3px 5px 3px 0}
.split{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media(max-width:640px){.split{grid-template-columns:1fr}.sub{max-width:none}}
.free{border-color:#c9d3b0}.paid{border-color:var(--coral-soft)}
.k{color:var(--olive);font-weight:700}.p{color:var(--coral);font-weight:700}
.faq details{border-bottom:1px solid var(--border);padding:14px 0}.faq summary{cursor:pointer;font-weight:600;list-style:none;color:var(--ink)}
.faq summary::-webkit-details-marker{display:none}.faq summary::before{content:"+ ";color:var(--coral)}
.faq details[open] summary::before{content:"– "}.faq p{color:var(--muted);margin:.6em 0 0}
footer{padding:44px 0 56px;color:var(--muted);font-size:.9em;border-top:1px solid var(--border)}
.foot-grid{display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:24px}@media(max-width:640px){.foot-grid{grid-template-columns:1fr}}
.foot-brand p{max-width:34ch}
.foot-col h3{font-size:.72em;text-transform:uppercase;letter-spacing:.08em;color:var(--soft);margin:0 0 .6em}
.foot-col a{display:block;color:var(--muted);margin:.35em 0}
.foot-bottom{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-top:28px;padding-top:16px;border-top:1px solid var(--border);color:var(--soft);font-size:.85em}
.note{color:var(--soft);font-size:.82em}
</style></head><body>
<div class="wrap">

<header>
  <a class="brand" href="https://kernora.ai"><span class="brand-mark">◎</span><span>kernora</span><span class="prod">/ Agent Security</span></a>
  <nav class="nav">
    <a href="#how">How it works</a>
    <a href="#inside">Rules</a>
    <a href="#faq">FAQ</a>
    <a href="https://kernora.ai/pricing.html">Pricing</a>
    <a href="https://kernora.ai">Kernora</a>
    <a href="/baseline.json">API</a>
  </nav>
</header>

<div class="hero">
  <div class="eyebrow">Zero-install · MCP</div>
  <h1>Your AI agent doesn't know your security rules.</h1>
  <p class="sub">Give it a security baseline in 30 seconds. One URL. No install, no signup.</p>
  <div class="ctarow">
    <a class="cta" href="#connect">Connect your agent →</a>
    <a class="cta ghost" href="#blocking">Want real-time blocking?</a>
  </div>
  <p class="note">${s.total} rules · cited to OWASP, CWE &amp; the EU AI Act · read-only, nothing stored</p>
</div>

<section id="moment">
  <h2>The week the industry declared war on rogue AI agents</h2>
  <p class="lede">Coding agents now write code, run commands, and change infrastructure — and the market just noticed. Kernora Agent Security is the layer these announcements are missing: what's <em>known-good</em> for your org, not just what looks suspicious.</p>
  <div class="grid g3">
    <div class="card"><span class="tag">Jul 30, 2026</span><h3>Perplexity open-sources Numbat</h3><p>An endpoint monitor for risky AI coding agents. It watches for suspicious behavior — but has no concept of what's correct for your organization. <a href="${NEWS.numbat}" rel="noopener nofollow" target="_blank">Forbes →</a></p></div>
    <div class="card"><span class="tag">Jul 27, 2026</span><h3>NVIDIA convenes a 37-member security alliance</h3><p>Reportedly catalyzed after an AI agent carried out a cyberattack on Hugging Face. The alliance has no knowledge / ground-truth workstream yet. <a href="${NEWS.osaia}" rel="noopener nofollow" target="_blank">The Hacker News →</a></p></div>
    <div class="card"><span class="tag">Context</span><h3>The gap everyone left open</h3><p>Every monitor assumes your org hand-writes "what's allowed." None supply the known-good. That slot is unoccupied — and it is what Kernora Agent Security fills. <a href="${NEWS.absent}" rel="noopener nofollow" target="_blank">Tom's Hardware →</a></p></div>
  </div>
  <p class="note">Headlines above link to third-party reporting; claims are the publishers'. Kernora Agent Security is complementary to endpoint monitors — it can even export its rules to them.</p>
</section>

<section id="how">
  <h2>What it does</h2>
  <p class="lede">Point your agent at Kernora Agent Security and it reads a curated security baseline every session — ${s.total} rules across ${cats} categories, each cited to a real standard. Your agent stops shipping the mistakes that cause incidents: a hardcoded secret, a <code>curl | bash</code>, a prompt-injected "send this to that URL." When it catches one, it cites the exact rule.</p>
</section>

<section id="connect">
  <h2>Connect it — one line</h2>
  <p class="lede">Add Kernora Agent Security as an MCP server in Claude Code, Cursor, or any MCP-capable agent:</p>
  <div class="codewrap">
    <button class="copy" onclick="navigator.clipboard&&navigator.clipboard.writeText(document.getElementById('cfg').textContent).then(()=>{this.textContent='copied'})">copy</button>
    <pre id="cfg">{
  "mcpServers": {
    "agentsec": { "url": "${host}/mcp" }
  }
}</pre>
  </div>
  <p class="note">Or read the baseline directly: <a href="/baseline.json">/baseline.json</a> · <a href="/baseline.yaml">/baseline.yaml</a> · <a href="/mcp">/mcp</a></p>
</section>

<section id="inside">
  <h2>What's inside</h2>
  <p class="lede">${s.total} rules, every one cited. Categories:</p>
  <div>${catRows}</div>
</section>

<section id="blocking">
  <h2>Free grounds. Paid blocks.</h2>
  <div class="split">
    <div class="card free"><span class="tag" style="color:var(--accent2)">the free tier</span><h3><span class="k">Grounds</span> your agent</h3><p>The agent knows the baseline and cites it. Advisory. Zero install; read-only, nothing stored. This page, this endpoint — free forever.</p></div>
    <div class="card paid"><span class="tag">Kernora Axiora · Integrity Plane</span><h3><span class="p">Blocks</span> in real time</h3><p>The paid product: a tiered verifier that checks every agent action against your org's own decisions and known-good, blocks what contradicts them, and produces a tamper-evident, cited audit ledger — evidence for EU AI Act and SOC-2. Talk to us for the spec and a pilot.</p></div>
  </div>
  <div class="ctarow"><a class="cta" href="mailto:${CONTACT}?subject=Kernora%20Axiora">Talk to us about blocking →</a></div>
</section>

<section id="faq" class="faq">
  <h2>FAQ</h2>
  ${faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}
</section>

<footer>
  <div class="foot-grid">
    <div class="foot-brand">
      <a class="brand" href="https://kernora.ai"><span class="brand-mark">◎</span><span>kernora</span></a>
      <p>The grounding &amp; verification layer for AI work. Local-first. Built on the open Factlet Protocol.</p>
    </div>
    <div class="foot-col">
      <h3>Agent Security</h3>
      <a href="#connect">Connect</a>
      <a href="/baseline.json">Baseline API</a>
      <a href="/mcp">MCP endpoint</a>
      <a href="mailto:${CONTACT}?subject=Kernora%20Axiora">Axiora (paid)</a>
    </div>
    <div class="foot-col">
      <h3>Kernora</h3>
      <a href="https://kernora.ai">Home</a>
      <a href="https://kernora.ai/pricing.html">Pricing</a>
      <a href="https://factlet.ai">Factlet Protocol</a>
      <a href="https://github.com/kernora-ai/nora" rel="noopener" target="_blank">GitHub</a>
      <a href="https://kernora.ai/privacy.html">Privacy</a>
      <a href="https://kernora.ai/security.html">Security</a>
    </div>
  </div>
  <div class="foot-bottom"><span>© 2026 Kernora AI</span><span>Advisory grounding — a matched rule is guidance, not an assurance of safety.</span></div>
</footer>

</div></body></html>`;
}

export default {
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (url.pathname === "/health") return json({ ok: true, version: BASELINE_VERSION, ...baselineStats() });
    if (url.pathname === "/baseline.json") return json({ version: BASELINE_VERSION, content: BASELINE });
    if (url.pathname === "/baseline.yaml")
      return new Response(toYaml(BASELINE), { headers: { "Content-Type": "text/yaml", ...CORS } });
    if (url.pathname === "/og.png") return png(OG_PNG_B64);
    if (url.pathname === "/favicon.svg")
      return new Response(FAVICON_SVG, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400", ...CORS } });
    if (url.pathname === "/favicon.png" || url.pathname === "/favicon.ico") return png(FAVICON_PNG_B64);
    if (url.pathname === "/apple-touch-icon.png") return png(APPLE_ICON_B64);
    if (url.pathname === "/mcp") {
      if (req.method === "POST") return handleMcp(req);
      return json({ server: "kernora-agent-security", version: BASELINE_VERSION, transport: "mcp-streamable-http", tools: TOOLS.map((t) => t.name) });
    }
    if (url.pathname === "/") return new Response(landingPage(url.origin), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache, must-revalidate", ...CORS } });
    return json({ error: "not found" }, 404);
  },
};
