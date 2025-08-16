import { useState, useEffect, useCallback } from 'react';
import { Folder, FolderInput } from '@/data/models/Folder';
import * as FolderService from '@/services/FolderService'; 
import * as ReceiptService from '@/services/ReceiptService';

export const useFolders = () => {
  const [folders, setFolders] = useState<Folder[]>([]); // Stores all folders (flat list)
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMutating, setIsMutating] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const handleError = (err: unknown, defaultMessage: string) => {
    const newError = err instanceof Error ? err : new Error(defaultMessage);
    setError(newError);
    console.error(defaultMessage, err);
    return newError;
  };

  const clearError = () => setError(null);

  const fetchAllFolders = useCallback(async () => {
    setIsLoading(true);
    clearError();
    try {
      const data = await FolderService.getAllFolders();
      setFolders(data); // Keep a flat list, components can build hierarchy if needed
    } catch (err) {
      handleError(err, 'Failed to fetch all folders');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllFolders();
  }, [fetchAllFolders]);

  const getFoldersByParent = useCallback(async (parentId: number | null) => {
    setIsLoading(true);
    clearError();
    try {
      const data = await FolderService.getFoldersByParentId(parentId);
      // This function returns the children, the component would use this.
      // The main 'folders' state still holds the flat list.
      return data;
    } catch (err) {
      handleError(err, `Failed to fetch folders for parent ID ${parentId}`);
      return []; // Return empty array on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addFolder = useCallback(async (folderData: FolderInput) => {
    setIsMutating(true);
    clearError();
    try {
      const newFolderId = await FolderService.addFolder(folderData);
      if (newFolderId) {
        await fetchAllFolders(); // Re-fetch the flat list
        return newFolderId;
      }
    } catch (err) {
      throw handleError(err, 'Failed to add folder');
    } finally {
      setIsMutating(false);
    }
  }, [fetchAllFolders]);

  const updateFolder = useCallback(async (id: number, folderData: Partial<FolderInput>) => {
    setIsMutating(true);
    clearError();
    try {
      const changes = await FolderService.updateFolder(id, folderData);
      if (changes > 0) {
        await fetchAllFolders(); // Re-fetch the flat list
      }
      return changes;
    } catch (err) {
      throw handleError(err, `Failed to update folder with ID ${id}`);
    } finally {
      setIsMutating(false);
    }
  }, [fetchAllFolders]);

  const deleteFolder = useCallback(async (id: number) => {
    setIsMutating(true);
    clearError();
    try {
      // Step 1: Get all subfolders to delete recursively
      const subfolders = folders.filter(folder => folder.parentId === id);
      
      // Step 2: Recursively delete all subfolders first
      for (const subfolder of subfolders) {
        await deleteFolder(subfolder.id); // Recursive call
      }
      
      // Step 3: Delete all receipts in this folder
      await ReceiptService.deleteReceiptsByFolderId(id);
      
      // Step 4: Finally delete the folder itself
      const changes = await FolderService.deleteFolder(id);
      
      if (changes > 0) {
        // Re-fetch to ensure consistency
        await fetchAllFolders();
      }
      return changes;
    } catch (err) {
      throw handleError(err, `Failed to delete folder with ID ${id} and its contents`);
    } finally {
      setIsMutating(false);
    }
  }, [folders, fetchAllFolders]);

  const getFolderById = useCallback(async (id: number) => {
    setIsLoading(true);
    clearError();
    try {
      const folder = await FolderService.getFolderById(id);
      return folder;
    } catch (err) {
      handleError(err, `Failed to fetch folder with ID ${id}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Helper function to build a tree structure from the flat list if needed within the hook
  // Or components can do this. For now, keeping the main state as a flat list.
  // const buildFolderTree = (parentId: number | null = null): any[] => {
  //   return folders
  //     .filter(folder => folder.parentId === parentId)
  //     .map(folder => ({ ...folder, children: buildFolderTree(folder.id) }));
  // };

  return {
    folders, // Flat list of all folders
    isLoading,
    isMutating,
    error,
    clearError,
    fetchAllFolders,
    getFoldersByParent, // To fetch children of a specific parent
    addFolder,
    updateFolder,
    deleteFolder,
    getFolderById,
    // folderTree: buildFolderTree(), // Optionally expose a computed tree
  };
};