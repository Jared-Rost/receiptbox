import { getDbInstance } from '../data/db';
import { Folder, FolderInput } from '@/data/models/Folder';

export const addFolder = async (folderData: FolderInput): Promise<number | undefined> => {
  const db = await getDbInstance();
  try {
    const result = await db.runAsync(
      'INSERT INTO folders (name, parentId) VALUES (?, ?)',
      [folderData.name, folderData.parentId ?? null]
    );
    console.log('Folder added with ID:', result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error adding folder:', error.message);
    } else {
      console.error('An unexpected error occurred while adding folder:', error);
    }
    throw error;
  }
};

export const getAllFolders = async (): Promise<Folder[]> => {
  const db = await getDbInstance();
  try {
    const allRows = await db.getAllAsync<Folder>('SELECT * FROM folders ORDER BY parentId ASC, name ASC');
    return allRows;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error getting all folders:', error.message);
    } else {
      console.error('An unexpected error occurred while getting all folders:', error);
    }
    throw error;
  }
};

export const getFolderById = async (id: number): Promise<Folder | null> => {
  const db = await getDbInstance();
  try {
    const folder = await db.getFirstAsync<Folder>('SELECT * FROM folders WHERE id = ?', [id]);
    return folder ?? null;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error getting folder by ID ${id}:`, error.message);
    } else {
      console.error(`An unexpected error occurred while getting folder by ID ${id}:`, error);
    }
    throw error;
  }
};

export const getFoldersByParentId = async (parentId: number | null): Promise<Folder[]> => {
    const db = await getDbInstance();
    try {
        let folders: Folder[];
        if (parentId === null) {
            folders = await db.getAllAsync<Folder>('SELECT * FROM folders WHERE parentId IS NULL ORDER BY name ASC');
        } else {
            folders = await db.getAllAsync<Folder>('SELECT * FROM folders WHERE parentId = ? ORDER BY name ASC', [parentId]);
        }
        return folders;
    } catch (error) {
        if (error instanceof Error) {
            console.error(`Error getting folders for parent ID ${parentId}:`, error.message);
        } else {
            console.error(`An unexpected error occurred while getting folders for parent ID ${parentId}:`, error);
        }
        throw error;
    }
};

export const updateFolder = async (id: number, folderData: Partial<FolderInput>): Promise<number> => {
  const db = await getDbInstance();
  const fieldsToUpdate: string[] = [];
  const values: (string | number | null)[] = [];

  if (folderData.name !== undefined) {
    fieldsToUpdate.push('name = ?');
    values.push(folderData.name);
  }
  if (folderData.parentId !== undefined) { // Allows moving folder or making it top-level
    fieldsToUpdate.push('parentId = ?');
    values.push(folderData.parentId ?? null);
  }

  if (fieldsToUpdate.length === 0) {
    console.log("No fields to update for folder ID:", id);
    return 0;
  }

  values.push(id); // For the WHERE clause
  const sql = `UPDATE folders SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;

  try {
    const result = await db.runAsync(sql, values);
    console.log('Folder updated, changes:', result.changes);
    return result.changes;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error updating folder ID ${id}:`, error.message);
    } else {
      console.error(`An unexpected error occurred while updating folder ID ${id}:`, error);
    }
    throw error;
  }
};

export const deleteFolder = async (id: number): Promise<number> => {
  const db = await getDbInstance();
  try {
    const result = await db.runAsync('DELETE FROM folders WHERE id = ?', [id]);
    console.log('Folder deleted, changes:', result.changes);
    return result.changes;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error deleting folder ID ${id}:`, error.message);
    } else {
      console.error(`An unexpected error occurred while deleting folder ID ${id}:`, error);
    }
    throw error;
  }
};