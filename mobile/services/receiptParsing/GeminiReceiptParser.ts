import { GoogleGenerativeAI } from '@google/generative-ai';
import { ReceiptParser, ParsedReceiptData } from './ReceiptParserInterface';

export class GeminiReceiptParser implements ReceiptParser {
    private genAI: GoogleGenerativeAI | null = null;

    constructor() {
        const apiKey = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
        if (!apiKey) {
            throw new Error('Google API key is not set');
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    async isAvailable(): Promise<boolean> {
        return this.genAI !== null;
    }

    async parseReceiptData(ocrText: string): Promise<ParsedReceiptData> {
        if(this.genAI === null) {
            throw new Error('Google Generative AI is not initialized');
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
            const prompt = `
                Parse this receipt text and return ONLY a valid JSON object with these exact fields:
                - storeName: string (merchant/store name)
                - date: string (format: YYYY-MM-DD)
                - totalAmount: number (final total paid)
                - notes: string (any additional relevant info)
                
                Receipt text: ${ocrText}
                
                Return only the JSON, no other text.`;
      
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const jsonText = response.text().replace(/```json|```/g, '').trim();
            
            const parsed = JSON.parse(jsonText);
            
            return {
                storeName: parsed.storeName || '',
                date: parsed.date || new Date().toISOString().split('T')[0],
                totalAmount: Number(parsed.totalAmount) || 0,
                notes: parsed.notes || '',
            };

        } catch (error) {
            console.error('Gemini parsing error:', error);
            throw new Error('Failed to parse receipt with Gemini');
        }
    }
}