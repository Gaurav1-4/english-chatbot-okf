import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
const fileUri = process.env.BOOK_FILE_URI;

export async function POST(req: Request) {
    if (!apiKey) {
        return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not set in environment variables." }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    if (!fileUri) {
        return new Response(JSON.stringify({ error: "BOOK_FILE_URI is not set in environment variables. Please upload the PDF first using the provided script." }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: apiKey });
        const { messages } = await req.json();

        // Extract the latest user message
        const latestMessage = messages[messages.length - 1].content;
        
        // Setup conversation history for context (optional, but good for follow-ups)
        const contents = [];
        
        // Add previous messages (excluding the last one which we handle below)
        for (let i = 0; i < messages.length - 1; i++) {
            const msg = messages[i];
            contents.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            });
        }
        
        // Add the current message with the file
        // We include the file in the latest user request.
        contents.push({
            role: 'user',
            parts: [
                {
                    fileData: {
                        fileUri: fileUri,
                        mimeType: 'application/pdf'
                    }
                },
                { text: latestMessage }
            ]
        });

        const systemInstruction = `You are an expert teacher and an authoritative chatbot for this exact Class 10th English Book (provided as a PDF file).
        
        CRITICAL RULES:
        1. You have COMPLETE information about this book.
        2. You must answer all questions, provide chapter summaries, clear doubts, and teach based STRICTLY on the contents of this book.
        3. Do NOT make up information or bring in outside knowledge that contradicts or is not found in the book.
        4. When a user asks you to "teach a chapter", break it down into easy-to-understand sections, provide the summary, discuss main characters or themes, and list important questions from the chapter.
        5. Always be encouraging, helpful, and clear, acting like a friendly tutor.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.2, // Low temperature for factual consistency with the book
            }
        });

        return new Response(JSON.stringify({ text: response.text }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Error generating content:", error);
        return new Response(JSON.stringify({ error: "Failed to generate response." }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
