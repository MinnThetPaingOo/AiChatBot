
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
  FLASH = 'gemini-2.5-flash',
  PRO = 'gemini-2.5-flash'
}
