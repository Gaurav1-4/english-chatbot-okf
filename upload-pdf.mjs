import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

// Load env vars if available, though this is a standalone script
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("Error: Please set GEMINI_API_KEY environment variable.");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: apiKey });

async function uploadFile() {
    const filePath = path.join(process.cwd(), '../ed9b3239b1999b90a4a3f8cc4742c0fe4fc3ed85-2.pdf');
    
    if (!fs.existsSync(filePath)) {
        console.error(`Error: File not found at ${filePath}`);
        process.exit(1);
    }
    
    console.log("Uploading file to Gemini...");
    
    try {
        const response = await ai.files.upload({
            file: filePath,
            mimeType: 'application/pdf',
            displayName: 'Class 10th English Book'
        });
        
        console.log("Upload successful!");
        console.log("---------------------------------------------------");
        console.log(`File Name: ${response.name}`);
        console.log(`File URI: ${response.uri}`);
        console.log(`Display Name: ${response.displayName}`);
        console.log("---------------------------------------------------");
        console.log("Please copy the File URI and add it to your .env.local file as BOOK_FILE_URI");
        
    } catch (error) {
        console.error("Failed to upload file:", error);
    }
}

uploadFile();
