
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, ModelName } from "../types";

export class GeminiChatSession {
  constructor(private model: ModelName = ModelName.FLASH, private history: Message[] = []) {}

  async *sendMessageStream(text: string, attachments?: { mimeType: string, data: string }[]) {
    // The API key must be obtained exclusively from the environment variable process.env.API_KEY.
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
      throw new Error("Missing API Key. Ensure the environment is correctly configured.");
    }

    const ai = new GoogleGenAI({ apiKey });

    // Map existing history to Content objects as expected by generateContentStream
    const contents = this.history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [
        { text: msg.content },
        ...(msg.attachments?.map(att => ({
          inlineData: {
            mimeType: att.mimeType,
            data: att.data
          }
        })) || [])
      ]
    }));

    // Append the latest user message with its attachments
    contents.push({
      role: 'user',
      parts: [
        { text },
        ...(attachments?.map(att => ({
          inlineData: {
            mimeType: att.mimeType,
            data: att.data
          }
        })) || [])
      ]
    });

    try {
      const result = await ai.models.generateContentStream({
        model: this.model,
        contents,
        config: {
          systemInstruction: `You are WinterAI, a helpful assistant. Provide precise and clear responses. 
IDENTITY: WinterAI.
FORMATTING: Use clean Markdown.`,
        },
      });

      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        yield c.text || "";
      }
    } catch (error: any) {
      console.error("Assistant Error:", error);
      throw new Error(error.message || String(error));
    }
  }
}
