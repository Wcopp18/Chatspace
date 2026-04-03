import type { AIProvider, ChatParams, AIStreamChunk } from "../types";

// OpenAI provider stub — install `openai` package and uncomment when ready to swap
export class OpenAIProvider implements AIProvider {
  name = "openai";

  async chat(_params: ChatParams): Promise<string> {
    throw new Error(
      "OpenAI provider is not configured. Install the `openai` package and set OPENAI_API_KEY to enable it."
    );
  }

  async *stream(_params: ChatParams): AsyncGenerator<AIStreamChunk> {
    throw new Error(
      "OpenAI provider is not configured. Install the `openai` package and set OPENAI_API_KEY to enable it."
    );
  }
}
