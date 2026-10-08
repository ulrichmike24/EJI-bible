import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI } from '@google/genai';

export function getResolvedApiKey(customKey?: string): string | undefined {
  return (
    customKey ||
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY
  );
}

export function createGeminiClient(customKey?: string) {
  const apiKey = getResolvedApiKey(customKey);
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export const gemini = createGeminiClient();

export const DEFAULT_MODEL = 'gemini-3.1-flash-lite';
export const FALLBACK_MODELS = ['gemini-flash-latest', 'gemini-3.8-flash'];

