import { getDbInstance } from '../data/db';
import { Tag, TagInput } from '@/data/models/Tag';

export const addTag = async (tagData: TagInput): Promise<number | undefined> => {
  const db = await getDbInstance();
  try {
    const result = await db.runAsync('INSERT INTO tags (name) VALUES (?)', [tagData.name]);
    console.log('Tag added with ID:', result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        console.warn(`Tag with name "${tagData.name}" already exists.`);
      } else {
        console.error('Error adding tag:', error.message);
      }
    } else {
      console.error('An unexpected error occurred while adding tag:', error);
    }
    throw error; 
  }
};

export const getAllTags = async (): Promise<Tag[]> => {
  const db = await getDbInstance();
  try {
    const allRows = await db.getAllAsync<Tag>('SELECT * FROM tags ORDER BY name ASC');
    return allRows;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error getting all tags:', error.message);
    } else {
      console.error('An unexpected error occurred while getting all tags:', error);
    }
    throw error;
  }
};

export const getTagById = async (id: number): Promise<Tag | null> => {
  const db = await getDbInstance();
  try {
    const tag = await db.getFirstAsync<Tag>('SELECT * FROM tags WHERE id = ?', [id]);
    return tag ?? null;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error getting tag by ID ${id}:`, error.message);
    } else {
      console.error(`An unexpected error occurred while getting tag by ID ${id}:`, error);
    }
    throw error;
  }
};

export const updateTag = async (id: number, tagData: Partial<TagInput>): Promise<number> => {
  const db = await getDbInstance();
  if (!tagData.name) {
    console.log("No name provided to update for tag ID:", id);
    return 0;
  }
  try {
    const result = await db.runAsync('UPDATE tags SET name = ? WHERE id = ?', [tagData.name, id]);
    console.log('Tag updated, changes:', result.changes);
    return result.changes;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error updating tag ID ${id}:`, error.message);
    } else {
      console.error(`An unexpected error occurred while updating tag ID ${id}:`, error);
    }
    throw error;
  }
};

export const deleteTag = async (id: number): Promise<number> => {
  const db = await getDbInstance();
  try {
    // No need to manually delete from receipt_tags if ON DELETE CASCADE is set on the foreign key in receipt_tags table
    const result = await db.runAsync('DELETE FROM tags WHERE id = ?', [id]);
    console.log('Tag deleted, changes:', result.changes);
    return result.changes;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error deleting tag ID ${id}:`, error.message);
    } else {
      console.error(`An unexpected error occurred while deleting tag ID ${id}:`, error);
    }
    throw error;
  }
};