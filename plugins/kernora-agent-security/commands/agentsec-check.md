---
description: Ask Kernora Agent Security whether an action is risky. Usage — /agentsec-check <action or command>
argument-hint: <action or command to check>
---
Call the `agentsec` MCP tool `check_action` with this action: $ARGUMENTS

Then summarize the cited rules it returns (by id + severity) and, if any apply, recommend a safer
approach. Note that this is advisory — a matched rule is guidance; an unmatched action is not an
assurance of safety.
