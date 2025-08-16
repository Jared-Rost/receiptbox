import { ReceiptParser, ParsedReceiptData } from './ReceiptParserInterface';

export class RuleBasedReceiptParser implements ReceiptParser {
    async isAvailable(): Promise<boolean> {
        return true; // Always available for rule-based parsing
    }

    async parseReceiptData(ocrText: string): Promise<ParsedReceiptData> {
    const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Extract store name (usually first few non-empty lines)
    const storeName = this.extractStoreName(lines);
    
    // Extract date
    const date = this.extractDate(ocrText);
    
    // Extract total amount
    const totalAmount = this.extractTotalAmount(ocrText);
    
    // Calculate confidence based on what we found
    const confidence = this.calculateConfidence(storeName, date, totalAmount);
    
    return {
      storeName: storeName || '',
      date: date || new Date().toISOString().split('T')[0],
      totalAmount: totalAmount || 0,
      notes: '',
    };
  }

    private extractStoreName(lines: string[]): string {
    // Take first line that's not a common receipt header
    const skipWords = ['receipt', 'invoice', 'copy', 'customer', 'thank you'];
    
    for (const line of lines.slice(0, 3)) {
      const lowercaseLine = line.toLowerCase();
      if (!skipWords.some(word => lowercaseLine.includes(word)) && line.length > 2) {
        return line;
      }
    }
    
    return lines[0] || '';
  }

  private extractDate(text: string): string {
    // Common date patterns
    const patterns = [
      /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/g,          // MM/DD/YYYY or MM-DD-YYYY
      /\b(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/g,          // YYYY/MM/DD or YYYY-MM-DD
      /\b(\d{1,2}\s+\w+\s+\d{4})\b/g,                    // DD Month YYYY
      /\b(\w+\s+\d{1,2},?\s+\d{4})\b/g                   // Month DD, YYYY
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const dateStr = match[0];
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString().split('T')[0];
        }
      }
    }

    return '';
  }

  private extractTotalAmount(text: string): number {
    // Look for total patterns
    const totalPatterns = [
      /(?:total|amount due|balance|grand total)[:\s]*\$?(\d+\.?\d{0,2})/gi,
      /\$(\d+\.\d{2})(?=\s*$)/gm, // Dollar amount at end of line
      /(\d+\.\d{2})(?=\s*$)/gm    // Amount at end of line
    ];

    const amounts: number[] = [];

    for (const pattern of totalPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const amount = parseFloat(match[1]);
        if (!isNaN(amount) && amount > 0) {
          amounts.push(amount);
        }
      }
    }

    // Return the largest amount found (likely the total)
    return amounts.length > 0 ? Math.max(...amounts) : 0;
  }

  private calculateConfidence(storeName: string, date: string, totalAmount: number): number {
    let confidence = 0;
    
    if (storeName && storeName.length > 2) confidence += 0.4;
    if (date && date !== new Date().toISOString().split('T')[0]) confidence += 0.3;
    if (totalAmount > 0) confidence += 0.3;
    
    return Math.min(confidence, 1.0);
  }
}