/**
 * LLM Router
 * 
 * tRPC router for LLM inference using Google Gemini API.
 * Requires authentication.
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { router, protectedProcedure } from '../trpc';

// ============================================================================
// Input Schemas (migrated from server/src/schemas/llm.ts)
// ============================================================================

const llmRunSchema = z.object({
    model: z.enum(['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro']),
    systemPrompt: z.string().optional(),
    userMessage: z.string().min(1, 'User message is required'),
    images: z.array(z.string()).optional(), // base64 encoded strings (without data URI prefix)
});

// ============================================================================
// Helpers
// ============================================================================

/**
 * Detect MIME type from base64 image data
 */
const detectImageMimeType = (imageBase64: string): string => {
    if (imageBase64.startsWith('/9j/')) return 'image/jpeg';
    if (imageBase64.startsWith('iVBORw')) return 'image/png';
    if (imageBase64.startsWith('R0lGOD')) return 'image/gif';
    if (imageBase64.startsWith('UklGR')) return 'image/webp';
    return 'image/jpeg';
};

/**
 * Default safety settings for Gemini
 */
const SAFETY_SETTINGS = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// ============================================================================
// LLM Router
// ============================================================================

export const llmRouter = router({
    /**
     * Run LLM inference
     */
    run: protectedProcedure
        .input(llmRunSchema)
        .mutation(async ({ input }) => {
            const { model, systemPrompt, userMessage, images } = input;

            // Check for API key
            const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
            if (!apiKey) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'GOOGLE_GEMINI_API_KEY is not configured. Please add it to your .env file.',
                });
            }

            // Initialize Gemini
            const genAI = new GoogleGenerativeAI(apiKey);
            const generativeModel = genAI.getGenerativeModel({
                model,
                safetySettings: SAFETY_SETTINGS,
            });

            // Build the prompt parts
            const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

            // Add system prompt if provided
            if (systemPrompt) {
                parts.push({ text: `System Instructions: ${systemPrompt}\n\n` });
            }

            // Add user message
            parts.push({ text: userMessage });

            // Add images if provided (multimodal support)
            if (images && images.length > 0) {
                for (const imageBase64 of images) {
                    parts.push({
                        inlineData: {
                            mimeType: detectImageMimeType(imageBase64),
                            data: imageBase64,
                        },
                    });
                }
            }

            try {
                // Generate content
                const result = await generativeModel.generateContent(parts);
                const response = await result.response;
                const text = response.text();

                return { output: text };
            } catch (error) {
                console.error('❌ LLM API Error:', error);

                if (error instanceof Error) {
                    // Check for quota/rate limit errors
                    if (error.message.includes('quota') || error.message.includes('rate')) {
                        throw new TRPCError({
                            code: 'TOO_MANY_REQUESTS',
                            message: 'API quota exceeded. Please try again later or check your API key limits.',
                        });
                    }

                    // Check for invalid API key
                    if (error.message.includes('API key') || error.message.includes('authentication')) {
                        throw new TRPCError({
                            code: 'UNAUTHORIZED',
                            message: 'Invalid API key. Please check your GOOGLE_GEMINI_API_KEY.',
                        });
                    }

                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: error.message,
                    });
                }

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'An unexpected error occurred while processing your request.',
                });
            }
        }),
});
