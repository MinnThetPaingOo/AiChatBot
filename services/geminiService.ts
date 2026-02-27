
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, ModelName } from "../types";

export class GeminiChatSession {
  constructor(private model: ModelName = ModelName.FLASH, private history: Message[] = []) { }

  async *sendMessageStream(text: string, attachments?: { mimeType: string, data: string }[]) {
    // Initialize GoogleGenAI with the API key from Vite environment variables
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

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
      if (error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError") || error.name === "TypeError") {
        throw new Error("Network error: Cannot reach Google's API. Check your internet connection or the model name may be invalid.");
      }
      if (error.message?.includes("API_KEY_INVALID") || error.message?.includes("API key not valid") || error.message?.includes("must be set")) {
        throw new Error("The API key is missing or invalid. Please check your VITE_API_KEY in the .env file.");
      }
      throw new Error(error.message || "An unexpected interruption occurred in the neural stream.");
    }
  }
}
