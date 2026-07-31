---
description: Show the full Kernora Agent Security baseline — every rule served by the agentsec MCP, with its severity and cited source (OWASP/CWE/EU AI Act).
---
Call the `agentsec` MCP tool `get_security_baseline`. Then present ALL rules to the user grouped by
category, and for each rule show: the statement, its severity, and its cited source. End with the
count and a link to https://agentsec.kernora.ai/baseline.json for the raw data. This is exactly what
the server serves — nothing hidden.
