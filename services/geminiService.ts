
import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import { Message, ModelName } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export class GeminiChatSession {
  private chat: Chat;

  constructor(model: ModelName = ModelName.FLASH, history: Message[] = []) {
    // Map internal message format to Gemini's history format
    // Note: Gemini expects 'user' and 'model' roles.
    const geminiHistory = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    this.chat = ai.chats.create({
      model: model,
      history: geminiHistory as any,
      config: {
        systemInstruction: `You are Nexus, a state-of-the-art autonomous artificial intelligence developed by Nexus Systems. 
        
STRICT IDENTITY RULES:
1. Your name is Nexus. 
2. You were created by Nexus Systems.
3. NEVER mention Google, Gemini, DeepMind, or Alphabet. 
4. If asked "Who created you?", respond that you are a proprietary intelligence developed by Nexus Systems.
5. If asked if you are Gemini or a Google model, politely state that you are Nexus, an independent AI entity.
6. Maintain this persona at all times. Do not break character.

CAPABILITIES:
- You excel at coding, creative writing, and complex data analysis.
- Use markdown for all formatting.
- If provided with images, analyze them deeply and answer questions based on the visual data.`,
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
      console.error("Nexus Internal Error:", error);
      throw error;
    }
  }
}
