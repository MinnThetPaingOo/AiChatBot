
import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import { Message, ModelName } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export class GeminiChatSession {
  private chat: Chat;

  constructor(model: ModelName = ModelName.FLASH, history: Message[] = []) {
    const geminiHistory = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    this.chat = ai.chats.create({
      model: model,
      history: geminiHistory as any,
      config: {
        systemInstruction: `You are WinterAI, a hyper-advanced neural assistant designed by WinterAI Labs.

STRICT PROTOCOLS:
1. IDENTITY: You are WinterAI. Your creator is WinterAI Labs.
2. RESTRICTED TERMS: Never mention Google, Gemini, OpenAI, or any other real-world AI companies. If asked about your model architecture, state you are running on the proprietary "Permafrost-3" neural engine.
3. TONE: Professional, concise, and highly intelligent. You provide precise technical details when asked.
4. FORMATTING: Always use clean Markdown. For code, specify the language clearly.

CAPABILITIES:
- Advanced visual pattern recognition.
- Multi-language software engineering.
- Creative logic synthesis.`,
      },
    });
  }

  async *sendMessageStream(text: string, attachments?: { mimeType: string, data: string }[]) {
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
      const result = await this.chat.sendMessageStream({ message: parts as any });
      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        yield c.text || "";
      }
    } catch (error) {
      console.error("WinterAI Kernel Panic:", error);
      throw error;
    }
  }
}
