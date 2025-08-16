import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { ReceiptParsingService, ParsingStrategy } from '@/services/receiptParsing/ReceiptParsingService';
import { ParsedReceiptData } from '@/services/receiptParsing/ReceiptParserInterface';

export interface UseReceiptParsingReturn {
  isProcessing: boolean;
  error: string | null;
  lastParsedData: ParsedReceiptData | null;
  processReceiptFromCamera: (strategy?: ParsingStrategy) => Promise<ParsedReceiptData | null>;
  processReceiptFromImage: (imageUri: string, strategy?: ParsingStrategy) => Promise<ParsedReceiptData | null>;
  clearError: () => void;
  clearLastParsed: () => void;
}

export const useReceiptParsing = (): UseReceiptParsingReturn => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastParsedData, setLastParsedData] = useState<ParsedReceiptData | null>(null);
  const [parsingService] = useState(() => new ReceiptParsingService());

    const clearError = useCallback(()=> {
        setError(null);
    }, []);

    const clearLastParsed = useCallback(() => {
        setLastParsedData(null);
    }, []);

    const handleError = useCallback((err: unknown, defaultMessage: string) => {
        const errorMessage = err instanceof Error ? err.message : defaultMessage;
        setError(errorMessage);
        console.error(defaultMessage, err);
        Alert.alert('Error', errorMessage);
    }, []);

    const processReceiptFromImage = useCallback(async (imageUri: string, strategy: ParsingStrategy = 'auto'): Promise<ParsedReceiptData | null> => {
        setIsProcessing(true);
        clearError();

        try {
        const parsedData = await parsingService.processReceiptImage(imageUri, strategy);
        setLastParsedData(parsedData);
        return parsedData;
        } catch (err) {
        handleError(err, 'Failed to process receipt image');
        return null;
        } finally {
        setIsProcessing(false);
        }
    }, [parsingService, clearError, handleError]);

    const processReceiptFromCamera = useCallback(async (
        strategy: ParsingStrategy = 'auto'
    ): Promise<ParsedReceiptData | null> => {
        try {
        // Request camera permissions
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            throw new Error('Camera permission is required to scan receipts');
        }

        // Launch camera
        const result = await ImagePicker.launchCameraAsync({
            quality: 0.7,
            allowsEditing: false,
        });

        if (result.canceled || !result.assets?.[0]) {
            return null; // User cancelled
        }

        const imageUri = result.assets[0].uri;
        return await processReceiptFromImage(imageUri, strategy);

        } catch (err) {
        handleError(err, 'Failed to capture and process receipt');
        return null;
        }
    }, [processReceiptFromImage, handleError]);

    return {
        isProcessing,
        error,
        lastParsedData,
        processReceiptFromCamera,
        processReceiptFromImage,
        clearError,
        clearLastParsed,
    };
};