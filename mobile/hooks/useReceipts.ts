import { useState, useEffect, useCallback } from 'react';
import { Receipt, ReceiptInput, ReceiptUpdateInput } from '@/data/models/Receipt';
import { Tag } from '@/data/models/Tag';
import * as ReceiptService from '@/services/ReceiptService';

// Change parameter name from 'initialFolderId' to 'folderId'
export const useReceipts = (folderId?: number | null, tagId?: number | null) => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [tagsForSelectedReceipt, setTagsForSelectedReceipt] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMutating, setIsMutating] = useState<boolean>(false); // For add, update, delete
  const [error, setError] = useState<Error | null>(null);

  const handleError = (err: unknown, defaultMessage: string) => {
    const newError = err instanceof Error ? err : new Error(defaultMessage);
    setError(newError);
    console.error(defaultMessage, err);
    return newError; // Return the error for potential further handling
  };

  const clearError = () => setError(null);

  const fetchReceipts = useCallback(async () => {
    setIsLoading(true);
    clearError();
    try {
      let data: Receipt[];
      // Use the dynamic 'folderId' prop instead of 'initialFolderId'
      if (folderId !== undefined && folderId !== null) {
        data = await ReceiptService.getReceiptsByFolderId(folderId);
      } else if (tagId !== undefined && tagId !== null) {
        data = await ReceiptService.getReceiptsByTagId(tagId);
      } else {
        // Add a case to get receipts for the root folder (where folderId is null)
        data = await ReceiptService.getReceiptsByFolderId(null);
      }
      setReceipts(data);
    } catch (err) {
      handleError(err, 'Failed to fetch receipts');
    } finally {
      setIsLoading(false);
    }
  }, [folderId, tagId]); // Depend on the dynamic folderId

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]); // Re-run if initialFolderId or initialTagId changes

  const getReceiptById = useCallback(async (id: number, fetchTags: boolean = false) => {
    setIsLoading(true);
    clearError();
    setSelectedReceipt(null);
    if (fetchTags) setTagsForSelectedReceipt([]);
    try {
      const data = await ReceiptService.getReceiptById(id);
      setSelectedReceipt(data);
      if (data && fetchTags) {
        await getTagsForReceipt(id); // Fetch tags if receipt is found
      }
      return data;
    } catch (err) {
      handleError(err, `Failed to fetch receipt with ID ${id}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addReceipt = useCallback(async (receiptData: ReceiptInput) => {
    setIsMutating(true);
    clearError();
    try {
      const newReceiptId = await ReceiptService.addReceipt(receiptData);
      if (newReceiptId) {
        await fetchReceipts(); // Re-fetch the list
        return newReceiptId;
      }
    } catch (err) {
      throw handleError(err, 'Failed to add receipt');
    } finally {
      setIsMutating(false);
    }
  }, [fetchReceipts]);

  const updateReceipt = useCallback(async (id: number, receiptData: ReceiptUpdateInput) => {
    setIsMutating(true);
    clearError();
    try {
      const changes = await ReceiptService.updateReceipt(id, receiptData);
      if (changes > 0) {
        await fetchReceipts(); // Re-fetch the list
        // If this receipt was the selected one, update it
        if (selectedReceipt && selectedReceipt.id === id) {
            await getReceiptById(id, true); // Re-fetch selected receipt and its tags
        }
      }
      return changes;
    } catch (err) {
      throw handleError(err, `Failed to update receipt with ID ${id}`);
    } finally {
      setIsMutating(false);
    }
  }, [fetchReceipts, selectedReceipt, getReceiptById]);

  const deleteReceipt = useCallback(async (id: number) => {
    setIsMutating(true);
    clearError();
    try {
      const changes = await ReceiptService.deleteReceipt(id);
      if (changes > 0) {
        // Optimistic update or re-fetch
        setReceipts(prevReceipts => prevReceipts.filter(r => r.id !== id));
        if (selectedReceipt && selectedReceipt.id === id) {
            setSelectedReceipt(null);
            setTagsForSelectedReceipt([]);
        }
      }
      return changes;
    } catch (err) {
      throw handleError(err, `Failed to delete receipt with ID ${id}`);
    } finally {
      setIsMutating(false);
    }
  }, [selectedReceipt]);

  // --- Tag specific operations for a receipt ---
  const addTagToReceipt = useCallback(async (receiptId: number, tagId: number) => {
    setIsMutating(true);
    clearError();
    try {
      await ReceiptService.addTagToReceipt(receiptId, tagId);
      // If this receipt is currently selected, refresh its tags
      if (selectedReceipt && selectedReceipt.id === receiptId) {
        await getTagsForReceipt(receiptId);
      }
    } catch (err) {
      // Error might be a warning if tag already exists, service handles console.warn
      // Only throw if it's a more critical error (service re-throws critical ones)
      if (err instanceof Error && !err.message.includes('UNIQUE constraint failed')) {
        throw handleError(err, `Failed to add tag to receipt ${receiptId}`);
      }
    } finally {
      setIsMutating(false);
    }
  }, [selectedReceipt]);

  const removeTagFromReceipt = useCallback(async (receiptId: number, tagId: number) => {
    setIsMutating(true);
    clearError();
    try {
      await ReceiptService.removeTagFromReceipt(receiptId, tagId);
      // If this receipt is currently selected, refresh its tags
      if (selectedReceipt && selectedReceipt.id === receiptId) {
        await getTagsForReceipt(receiptId);
      }
    } catch (err) {
      throw handleError(err, `Failed to remove tag from receipt ${receiptId}`);
    } finally {
      setIsMutating(false);
    }
  }, [selectedReceipt]);

  const getTagsForReceipt = useCallback(async (receiptId: number) => {
    // This is more of an internal helper for the hook or for a detail view
    // It doesn't set the main isLoading flag, as it's specific to fetching tags for one receipt
    clearError();
    try {
      const tags = await ReceiptService.getTagsForReceipt(receiptId);
      setTagsForSelectedReceipt(tags);
      return tags;
    } catch (err) {
      handleError(err, `Failed to get tags for receipt ${receiptId}`);
      return [];
    }
  }, []);


  return {
    receipts,
    selectedReceipt,
    tagsForSelectedReceipt,
    isLoading,
    isMutating,
    error,
    clearError,
    fetchReceipts, // To allow manual refresh of the main list
    getReceiptById, // To fetch a single receipt, optionally with its tags
    addReceipt,
    updateReceipt,
    deleteReceipt,
    addTagToReceipt,
    removeTagFromReceipt,
    getTagsForReceipt, 
  };
};