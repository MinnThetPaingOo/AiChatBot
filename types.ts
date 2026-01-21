
export type Role = 'user' | 'assistant';

export interface Attachment {
  mimeType: string;
  data: string; // Base64
  url: string;  // Preview URL
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  attachments?: Attachment[];
  timestamp: number;
  isStreaming?: boolean;
}

export enum ModelName {
  FLASH = 'gemini-3-flash-preview',
  PRO = 'gemini-3-pro-preview'
}
