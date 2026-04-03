export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIStreamChunk {
  text: string;
  done: boolean;
}

export interface AIProvider {
  name: string;
  chat(params: ChatParams): Promise<string>;
  stream(params: ChatParams): AsyncGenerator<AIStreamChunk>;
}

export interface ChatParams {
  messages: AIMessage[];
  systemPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface PersonaContext {
  personaId: string;
  displayName: string;
  bio: string;
  warmth: number;
  teaseLevel: number;
  textingStyle: string;
  emojiStyle: string;
  sentenceLength: string;
  signaturePhrases: string[];
  petNames: string[];
  teaserLines: string[];
  memories: Array<{ key: string; value: string }>;
  approvedUpsellPhrases: string[];
  introLines: string[];
}
