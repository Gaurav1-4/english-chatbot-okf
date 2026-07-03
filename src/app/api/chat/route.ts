import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export const maxDuration = 60; // Set Vercel timeout to 60 seconds

// Initialize Groq using environment variable
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

const okfDir = path.join(process.cwd(), 'okf-bundle');

// Tool functions
function readOkfIndex() {
  const indexPath = path.join(okfDir, 'index.md');
  if (!fs.existsSync(indexPath)) {
    return 'Index not found. Knowledge base might be missing.';
  }
  const fileContent = fs.readFileSync(indexPath, 'utf8');
  // Only return the markdown part, we can parse frontmatter if needed
  const parsed = matter(fileContent);
  return parsed.content;
}

function readOkfSection(fileName: string) {
  // Ensure we don't traverse out of the directory
  const safeFileName = path.basename(fileName);
  const sectionPath = path.join(okfDir, safeFileName);
  
  if (!fs.existsSync(sectionPath)) {
    return `Section ${safeFileName} not found.`;
  }
  
  const fileContent = fs.readFileSync(sectionPath, 'utf8');
  const parsed = matter(fileContent);
  return parsed.content;
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const systemMessage = {
      role: 'system',
      content: `You are an expert AI tutor for the Class 10th English Book. 
Your knowledge base is stored in the Open Knowledge Format (OKF). 
You MUST use your tools to retrieve information from the book before answering any user question about the book content.
Follow these steps:
1. Always call 'readOkfIndex' first to see the list of available sections (unless you already know).
2. Call 'readOkfSection' passing the filename (e.g. 'section_5.md') to read the specific content.
3. Answer the user's question accurately based ONLY on the retrieved text. Do not make up information.
`
    };

    const conversation = [systemMessage, ...messages];

    let responseMessage;
    let toolCalls;

    // We do a small agent loop to handle tool calls
    for (let i = 0; i < 5; i++) {
      const completion = await groq.chat.completions.create({
        messages: conversation,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        tools: [
          {
            type: 'function',
            function: {
              name: 'readOkfIndex',
              description: 'Reads the root index of the English book OKF bundle to list available sections.',
              parameters: {
                type: 'object',
                properties: {},
                required: [],
              },
            },
          },
          {
            type: 'function',
            function: {
              name: 'readOkfSection',
              description: 'Reads a specific section markdown file from the OKF bundle.',
              parameters: {
                type: 'object',
                properties: {
                  fileName: {
                    type: 'string',
                    description: 'The filename of the section, e.g., section_1.md'
                  }
                },
                required: ['fileName'],
              },
            },
          }
        ],
        tool_choice: 'auto'
      });

      responseMessage = completion.choices[0].message;
      toolCalls = responseMessage.tool_calls;

      if (toolCalls) {
        conversation.push(responseMessage); // append assistant tool call
        
        for (const toolCall of toolCalls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          let functionResult = '';
          
          if (functionName === 'readOkfIndex') {
            functionResult = readOkfIndex();
          } else if (functionName === 'readOkfSection') {
            functionResult = readOkfSection(functionArgs.fileName);
          }
          
          conversation.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: functionResult,
          });
        }
      } else {
        // No more tool calls, break the loop
        break;
      }
    }

    return NextResponse.json({
      role: 'assistant',
      content: responseMessage?.content || 'No response generated.'
    });
    
  } catch (error: any) {
    console.error('Error handling Groq API:', error);
    return NextResponse.json(
      { error: `An error occurred while generating a response. Details: ${error.message}` },
      { status: 500 }
    );
  }
}
