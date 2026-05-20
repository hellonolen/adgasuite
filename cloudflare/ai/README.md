# Cloudflare Worker AI

ADGA Suite agents are powered by the Cloudflare Worker runtime.

Primary model:

- Kimi 2.6

The exact Cloudflare model identifier is configured in `wrangler.toml` as:

```toml
[vars]
ADGA_AI_MODEL = "KIMI_2_6_CLOUDFLARE_MODEL_ID"

[ai]
binding = "AI"
```

Do not wire Gemini, Claude, OpenAI, or another external model API as the primary agent path.

## Adapter Rule

All agent inference should go through one shared adapter:

```txt
lib/ai/cloudflare-worker-ai.ts
```

That adapter owns:

- model id selection
- prompt assembly
- JSON response enforcement
- error normalization
- run metadata for `agent_runs`

