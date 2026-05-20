export interface CloudflareAI {
  run(model: string, input: unknown): Promise<unknown>;
}

export interface AgentModelInput {
  system: string;
  user: string;
  json?: boolean;
}

export interface AgentModelResult<T = unknown> {
  model: string;
  output: T;
}

export interface AgentRuntimeEnv {
  AI: CloudflareAI;
  ADGA_AI_MODEL?: string;
}

const DEFAULT_MODEL = "@cf/moonshotai/kimi-k2.6";

export async function runAgentModel<T = unknown>(
  env: AgentRuntimeEnv,
  input: AgentModelInput,
): Promise<AgentModelResult<T>> {
  const model = env.ADGA_AI_MODEL || DEFAULT_MODEL;
  const output = await env.AI.run(model, {
    messages: [
      { role: "system", content: input.system },
      { role: "user", content: input.user },
    ],
    response_format: input.json ? { type: "json_object" } : undefined,
  });

  return {
    model,
    output: output as T,
  };
}
