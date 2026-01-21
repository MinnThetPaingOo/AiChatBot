import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, ModelName } from "../types";

export class GeminiChatSession {
  constructor(private model: ModelName = ModelName.FLASH, private history: Message[] = []) {}

  async *sendMessageStream(text: string, attachments?: { mimeType: string, data: string }[]) {
    // API key is required from the environment
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
      // Signal to the UI that we need to prompt for a key selection
      throw new Error("FREE_KEY_MISSING");
    }

    const ai = new GoogleGenAI({ apiKey });

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
          systemInstruction: "You are WinterAI, a helpful and efficient free assistant. Keep responses clear and concise.",
        },
      });

      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        yield c.text || "";
      }
    } catch (error: any) {
      console.error("Free Engine Error:", error);
      throw new Error(error.message || "Connection interrupted.");
    }
  }
}
