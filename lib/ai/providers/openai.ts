import type { AIProvider, ChatParams, AIStreamChunk } from "../types";

// OpenAI provider stub — swap in when needed
export class OpenAIProvider implements AIProvider {
  name = "openai";

  async chat({ messages, systemPrompt, maxTokens = 300 }: ChatParams): Promise<string> {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.filter((m) => m.role !== "system").map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
    });

    return response.choices[0].message.content || "";
  }

  async *stream({ messages, systemPrompt, maxTokens = 300 }: ChatParams): AsyncGenerator<AIStreamChunk> {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const stream = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: maxTokens,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.filter((m) => m.role !== "system").map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      if (text) yield { text, done: false };
    }

    yield { text: "", done: true };
  }
}
