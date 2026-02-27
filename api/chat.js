// Vercel Serverless Function — runs in US region (iad1), not Myanmar browser IP
// This prevents the "User location is not supported" FAILED_PRECONDITION error.

export const config = {
    runtime: "nodejs",
    regions: ["iad1"], // Force US East (Washington DC) — Gemini API allows this region
};

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
    }

    try {
        const { contents, model, systemInstruction } = req.body;

        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents,
                    generationConfig: {},
                    systemInstruction: systemInstruction
                        ? { parts: [{ text: systemInstruction }] }
                        : undefined,
                }),
            }
        );

        if (!geminiRes.ok) {
            const errText = await geminiRes.text();
            return res.status(geminiRes.status).json({ error: errText });
        }

        // Stream the SSE response back to the browser
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const reader = geminiRes.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(decoder.decode(value, { stream: true }));
        }

        res.end();
    } catch (err) {
        console.error("Proxy error:", err);
        res.status(500).json({ error: err.message || "Internal server error" });
    }
}
