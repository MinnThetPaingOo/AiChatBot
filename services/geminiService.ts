
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, ModelName } from "../types";

export class GeminiChatSession {
  constructor(private model: ModelName = ModelName.FLASH, private history: Message[] = []) {}

  async *sendMessageStream(text: string, attachments?: { mimeType: string, data: string }[]) {
    // Fixed: Initialize GoogleGenAI directly with process.env.API_KEY per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
          systemInstruction: "You are WinterAI, a helpful, precise, and efficient free assistant. Keep responses clear, professional, and use Markdown for all formatting.",
        },
      });

      for await (const chunk of result) {
        // Fixed: Directly access .text property as per guidelines (it's a getter, not a method)
        const c = chunk as GenerateContentResponse;
        yield c.text || "";
      }
    } catch (error: any) {
      console.error("Neural Interface Error:", error);
      // If the error indicates a missing key at the SDK level, we pass a clear message.
      if (error.message?.includes("API_KEY_INVALID") || error.message?.includes("not found")) {
        throw new Error("The API key is missing or invalid in this deployment. Please verify your environment configuration.");
      }
      throw new Error(error.message || "An unexpected interruption occurred in the neural stream.");
    }
  }
}
