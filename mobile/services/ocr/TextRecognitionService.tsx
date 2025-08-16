// Mock OCR service for testing

export class TextRecognitionService {
  static async extractTextFromImage(imageUri: string): Promise<string> {
    try {
      console.log('Mock OCR processing image:', imageUri);
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Return realistic mock receipt text
      const mockReceiptText = `TARGET STORE T-0123
123 MAIN STREET
ANYTOWN, ST 12345
(555) 123-4567

GROCERY ITEMS           $25.99
HOUSEHOLD ITEMS         $12.50
PAPER TOWELS            $8.99
MILK                    $3.49
SUBTOTAL               $46.97
TAX                     $3.76
TOTAL                  $50.73

THANK YOU FOR SHOPPING!
${new Date().toLocaleDateString()}
${new Date().toLocaleTimeString()}

CARD ENDING IN 1234
APPROVAL CODE: 123456`;

      console.log('Mock OCR completed');
      return mockReceiptText;
      
    } catch (error) {
      console.error('OCR error:', error);
      throw new Error('Failed to extract text from image');
    }
  }
}