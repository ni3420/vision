import { GoogleGenAI } from '@google/genai';

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
export const model = 'gemini-3.5-flash';