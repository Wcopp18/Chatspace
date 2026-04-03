import { ClaudeProvider } from "./providers/claude";
import { OpenAIProvider } from "./providers/openai";
import type { AIProvider } from "./types";

export type ProviderName = "claude" | "openai";

const providers: Record<ProviderName, () => AIProvider> = {
  claude: () => new ClaudeProvider(),
  openai: () => new OpenAIProvider(),
};

export function getAIProvider(name: ProviderName = "claude"): AIProvider {
  const factory = providers[name];
  if (!factory) throw new Error(`Unknown AI provider: ${name}`);
  return factory();
}

export { ClaudeProvider } from "./providers/claude";
export { OpenAIProvider } from "./providers/openai";
export type { AIProvider, AIMessage, ChatParams, PersonaContext } from "./types";
