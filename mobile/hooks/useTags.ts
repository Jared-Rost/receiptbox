import { useState, useEffect, useCallback } from 'react';
import { Tag, TagInput } from '@/data/models/Tag';
import * as TagService from '@/services/TagService'; // Assuming TagService.tsx is in services

export const useTags = () => {
  const [tags, setTags] = useState<Tag[]>([]);
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

  const fetchTags = useCallback(async () => {
    setIsLoading(true);
    clearError();
    try {
      const data = await TagService.getAllTags();
      setTags(data);
    } catch (err) {
      handleError(err, 'Failed to fetch tags');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const addTag = useCallback(async (tagData: TagInput) => {
    setIsMutating(true);
    clearError();
    try {
      const newTagId = await TagService.addTag(tagData);
      if (newTagId) {
        await fetchTags();
        return newTagId;
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
      } else {
        throw handleError(err, 'Failed to add tag');
      }
    } finally {
      setIsMutating(false);
    }
  }, [fetchTags]);

  const updateTag = useCallback(async (id: number, tagData: Partial<TagInput>) => {
    setIsMutating(true);
    clearError();
    try {
      const changes = await TagService.updateTag(id, tagData);
      if (changes > 0) {
        await fetchTags(); // Re-fetch the list
      }
      return changes;
    } catch (err) {
      throw handleError(err, `Failed to update tag with ID ${id}`);
    } finally {
      setIsMutating(false);
    }
  }, [fetchTags]);

  const deleteTag = useCallback(async (id: number) => {
    setIsMutating(true);
    clearError();
    try {
      const changes = await TagService.deleteTag(id);
      if (changes > 0) {
        setTags(prevTags => prevTags.filter(tag => tag.id !== id));
      }
      return changes;
    } catch (err) {
      throw handleError(err, `Failed to delete tag with ID ${id}`);
    } finally {
      setIsMutating(false);
    }
  }, []);

  const getTagById = useCallback(async (id: number) => {
    setIsLoading(true); 
    clearError();
    try {
      const tag = await TagService.getTagById(id);
      return tag;
    } catch (err) {
      handleError(err, `Failed to fetch tag with ID ${id}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);


  return {
    tags,
    isLoading,
    isMutating,
    error,
    clearError,
    fetchTags,
    addTag,
    updateTag,
    deleteTag,
    getTagById,
  };
};