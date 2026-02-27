// Type declaration for the AI Studio runtime API injected into the window object
interface AiStudio {
    hasSelectedApiKey(): Promise<boolean>;
    openSelectKey(): Promise<void>;
}

interface Window {
    aistudio?: AiStudio;
}
