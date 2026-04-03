import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, ChatParams, AIStreamChunk } from "../types";

export class ClaudeProvider implements AIProvider {
  name = "claude";
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async chat({ messages, systemPrompt, maxTokens = 300, temperature = 0.85 }: ChatParams): Promise<string> {
    const response = await this.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    });

    const content = response.content[0];
    if (content.type === "text") return content.text;
    throw new Error("Unexpected response type from Claude");
  }

  async *stream({ messages, systemPrompt, maxTokens = 300, temperature = 0.85 }: ChatParams): AsyncGenerator<AIStreamChunk> {
    const stream = this.client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    });

    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
        yield { text: chunk.delta.text, done: false };
      }
    }

    yield { text: "", done: true };
  }
}
