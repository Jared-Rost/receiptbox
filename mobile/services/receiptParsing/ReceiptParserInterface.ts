export interface ParsedReceiptData {
    storeName: string;
    date: string;
    totalAmount: number;
    notes?: string;
}

export interface ReceiptParser {
    parseReceiptData(ocrText: string): Promise<ParsedReceiptData>;
    isAvailable(): Promise<boolean>;
}