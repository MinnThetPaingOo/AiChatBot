
import { Message, ModelName } from "../types";

const SYSTEM_INSTRUCTION =
  "You are WinterAI, a helpful, precise, and efficient free assistant. Keep responses clear, professional, and use Markdown for all formatting.";

export class GeminiChatSession {
  constructor(
    private model: ModelName = ModelName.FLASH,
    private history: Message[] = []
  ) { }

  async *sendMessageStream(
    text: string,
    attachments?: { mimeType: string; data: string }[]
  ) {
    // Build the contents array (conversation history + new message)
    const contents = this.history.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [
        { text: msg.content },
        ...(msg.attachments?.map((att) => ({
          inlineData: { mimeType: att.mimeType, data: att.data },
        })) || []),
      ],
    }));

    contents.push({
      role: "user",
      parts: [
        { text },
        ...(attachments?.map((att) => ({
          inlineData: { mimeType: att.mimeType, data: att.data },
        })) || []),
      ],
    });

    try {
      // ✅ Call our own backend proxy (/api/chat) instead of Gemini directly.
      // This ensures the request goes from Vercel's US server → Gemini,
      // bypassing the Myanmar IP geo-restriction.
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          contents,
          systemInstruction: SYSTEM_INSTRUCTION,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      // Parse the Server-Sent Events (SSE) stream from the proxy
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") return;
            try {
              const parsed = JSON.parse(data);
              const textChunk =
                parsed?.candidates?.[0]?.content?.parts?.[0]?.text || "";
              if (textChunk) yield textChunk;
            } catch {
              // Skip malformed SSE lines
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Neural Interface Error:", error);
      if (
        error.message?.includes("Failed to fetch") ||
        error.message?.includes("NetworkError") ||
        error.name === "TypeError"
      ) {
        throw new Error(
          "Network error: Cannot reach the server. Check your internet connection."
        );
      }
      throw new Error(
        error.message || "An unexpected interruption occurred in the neural stream."
      );
    }
  }
}
