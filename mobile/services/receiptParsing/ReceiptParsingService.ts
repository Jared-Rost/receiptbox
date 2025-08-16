import { GeminiReceiptParser } from './GeminiReceiptParser';
import { RuleBasedReceiptParser } from './RuleBasedReceiptParser';
import { TextRecognitionService } from '../ocr/TextRecognitionService';
import { ParsedReceiptData } from './ReceiptParserInterface';

export type ParsingStrategy = 'auto' | 'gemini' | 'rules';

export class ReceiptParsingService {
    private geminiParser = new GeminiReceiptParser();
    private ruleBasedParser = new RuleBasedReceiptParser();

    async processReceiptImage(imageUri: string, strategy: ParsingStrategy = 'auto'): Promise<ParsedReceiptData> {
        try {
            // Step 1: Extract text using OCR
            const ocrText = await TextRecognitionService.extractTextFromImage(imageUri);
            
            if (!ocrText || ocrText.trim().length === 0) {
                throw new Error('No text found in image');
            }

            // Step 2: Parse text based on strategy
            return await this.parseReceiptText(ocrText, strategy);
        } catch (error) {
            console.error('Error processing receipt:', error);
            // Return fallback data
            return {
                storeName: '',
                date: new Date().toISOString().split('T')[0],
                totalAmount: 0,
                notes: 'Auto-parsing failed - please enter manually',
            };
        }
    }

    private async parseReceiptText(ocrText: string, strategy: ParsingStrategy): Promise<ParsedReceiptData> {
        switch (strategy) {
            case 'gemini':
                return await this.geminiParser.parseReceiptData(ocrText);

            case 'rules':
                return await this.ruleBasedParser.parseReceiptData(ocrText);

            case 'auto':
            default:
                // Try Gemini first, fall back to rules
                if (await this.geminiParser.isAvailable()) {
                try {
                    return await this.geminiParser.parseReceiptData(ocrText);
                } catch (error) {
                    console.warn('Gemini parsing failed, falling back to rules:', error);
                    return await this.ruleBasedParser.parseReceiptData(ocrText);
                }
                } else {
                return await this.ruleBasedParser.parseReceiptData(ocrText);
                }
        }
    }
}