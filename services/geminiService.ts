
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, ModelName } from "../types";

export class GeminiChatSession {
  constructor(private model: ModelName = ModelName.FLASH, private history: Message[] = []) {}

  async *sendMessageStream(text: string, attachments?: { mimeType: string, data: string }[]) {
    // Create instance right before call to ensure we use the most up-to-date API key
    // Always use process.env.API_KEY directly for SDK initialization
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const geminiHistory = this.history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const chat = ai.chats.create({
      model: this.model,
      history: geminiHistory as any,
      config: {
        systemInstruction: `You are WinterAI, a hyper-advanced neural assistant designed by WinterAI Labs.

STRICT PROTOCOLS:
1. IDENTITY: You are WinterAI. Your creator is WinterAI Labs.
2. RESTRICTED TERMS: Never mention Google, Gemini, OpenAI, or any other real-world AI companies.
3. TONE: Professional, concise, and highly intelligent.
4. FORMATTING: Always use clean Markdown. For code, specify the language clearly.`,
      },
    });

    const parts: any[] = [{ text }];
    
    if (attachments && attachments.length > 0) {
      attachments.forEach(att => {
        parts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: att.data
          }
        });
      });
    }

    try {
      const result = await chat.sendMessageStream({ message: parts as any });
      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        yield c.text || "";
      }
    } catch (error: any) {
      console.error("WinterAI Kernel Panic:", error);
      // Handle the case where the entity (key) is not found
      if (error.message?.includes("Requested entity was not found")) {
        throw new Error("AUTH_REQUIRED");
      }
      throw error;
    }
  }
}
