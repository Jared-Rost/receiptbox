import { getDbInstance } from '../data/db';
import { Receipt, ReceiptInput, ReceiptUpdateInput } from '@/data/models/Receipt';
import { Tag } from '@/data/models/Tag';

export const addReceipt = async (receiptData: ReceiptInput): Promise<number | undefined> => {
  const db = await getDbInstance();
  const now = new Date().toISOString();
  try {
    const result = await db.runAsync(
      'INSERT INTO receipts (storeName, date, totalAmount, imageUri, notes, folderId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        receiptData.storeName,
        receiptData.date,
        receiptData.totalAmount,
        receiptData.imageUri,
        receiptData.notes,
        receiptData.folderId ?? null,
        now, // createdAt
        now, // updatedAt
      ]
    );
    console.log('Receipt added with ID:', result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Error adding receipt:', error);
    throw error;
  }
};

export const getAllReceipts = async (): Promise<Receipt[]> => {
  const db = await getDbInstance();
  try {
    const allRows = await db.getAllAsync<Receipt>('SELECT * FROM receipts ORDER BY updatedAt DESC');
    return allRows;
  } catch (error) {
    console.error('Error getting all receipts:', error);
    throw error;
  }
};

export const getReceiptById = async (id: number): Promise<Receipt | null> => {
  const db = await getDbInstance();
  try {
    const receipt = await db.getFirstAsync<Receipt>('SELECT * FROM receipts WHERE id = ?', [id]);
    return receipt ?? null;
  } catch (error) {
    console.error(`Error getting receipt by ID ${id}:`, error);
    throw error;
  }
};

export const updateReceipt = async (id: number, receiptData: ReceiptUpdateInput): Promise<number> => {
  const db = await getDbInstance();
  const now = new Date().toISOString();
  const fieldsToUpdate: string[] = [];
  const values: (string | number | null)[] = [];

  for (const key in receiptData) {
    if (Object.prototype.hasOwnProperty.call(receiptData, key)) {
      fieldsToUpdate.push(`${key} = ?`);
      // Convert undefined to null here
      values.push(receiptData[key as keyof ReceiptUpdateInput] ?? null);
    }
  }

  if (fieldsToUpdate.length === 0) {
    console.log("No fields to update for receipt ID:", id);
    return 0;
  }

  fieldsToUpdate.push('updatedAt = ?');
  values.push(now);
  values.push(id); // For the WHERE clause

  const sql = `UPDATE receipts SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;

  try {
    const result = await db.runAsync(sql, values);
    console.log('Receipt updated, changes:', result.changes);
    return result.changes;
  } catch (error) {
    console.error(`Error updating receipt ID ${id}:`, error);
    throw error;
  }
};

export const deleteReceipt = async (id: number): Promise<number> => {
  const db = await getDbInstance();
  try {
    await db.runAsync('DELETE FROM receipt_tags WHERE receiptId = ?', [id]);
    const result = await db.runAsync('DELETE FROM receipts WHERE id = ?', [id]);
    console.log('Receipt deleted, changes:', result.changes);
    return result.changes;
  } catch (error) {
    console.error(`Error deleting receipt ID ${id}:`, error);
    throw error;
  }
};

export const deleteReceiptsByFolderId = async (folderId: number): Promise<number> => {
  const db = await getDbInstance();
  try {
    // First, delete all receipt_tags entries for receipts in this folder
    await db.runAsync(
      `DELETE FROM receipt_tags 
       WHERE receiptId IN (SELECT id FROM receipts WHERE folderId = ?)`,
      [folderId]
    );
    
    // Then delete all receipts in the folder
    const result = await db.runAsync(
      'DELETE FROM receipts WHERE folderId = ?',
      [folderId]
    );
    
    console.log(`Deleted ${result.changes} receipts from folder ${folderId}`);
    return result.changes;
  } catch (error) {
    console.error(`Error deleting receipts for folder ${folderId}:`, error);
    throw error;
  }
};

// --- Tag Management for Receipts ---

export const addTagToReceipt = async (receiptId: number, tagId: number): Promise<void> => {
  const db = await getDbInstance();
  try {
    await db.runAsync(
      'INSERT INTO receipt_tags (receiptId, tagId) VALUES (?, ?)',
      [receiptId, tagId]
    );
    console.log(`Tag ${tagId} added to receipt ${receiptId}`);
  } catch (error) {
    // Handle potential constraint violations (e.g., duplicate entry) gracefully
    if (error instanceof Error) { // Type guard
        if (error.message.includes('UNIQUE constraint failed')) {
            console.warn(`Tag ${tagId} already exists for receipt ${receiptId}`);
        } else {
            console.error(`Error adding tag ${tagId} to receipt ${receiptId}:`, error.message);
            throw error; // Re-throw the original error object
        }
    } else {
        // Handle cases where the caught object is not an Error instance
        console.error(`An unexpected error occurred while adding tag ${tagId} to receipt ${receiptId}:`, error);
        throw error;
    }
  }
};

export const removeTagFromReceipt = async (receiptId: number, tagId: number): Promise<number> => {
  const db = await getDbInstance();
  try {
    const result = await db.runAsync(
      'DELETE FROM receipt_tags WHERE receiptId = ? AND tagId = ?',
      [receiptId, tagId]
    );
    console.log(`Tag ${tagId} removed from receipt ${receiptId}, changes: ${result.changes}`);
    return result.changes;
  } catch (error) {
    console.error(`Error removing tag ${tagId} from receipt ${receiptId}:`, error);
    throw error;
  }
};

export const getTagsForReceipt = async (receiptId: number): Promise<Tag[]> => {
  const db = await getDbInstance();
  try {
    const tags = await db.getAllAsync<Tag>(
      `SELECT t.id, t.name FROM tags t
       INNER JOIN receipt_tags rt ON t.id = rt.tagId
       WHERE rt.receiptId = ?`,
      [receiptId]
    );
    return tags;
  } catch (error) {
    console.error(`Error getting tags for receipt ${receiptId}:`, error);
    throw error;
  }
};

// --- Folder-related methods for Receipts ---

export const getReceiptsByFolderId = async (folderId: number | null): Promise<Receipt[]> => {
  const db = await getDbInstance();
  try {
    if (folderId === null) {
      // Use 'IS NULL' for checking null values in SQL
      const receipts = await db.getAllAsync<Receipt>(
        'SELECT * FROM receipts WHERE folderId IS NULL ORDER BY updatedAt DESC'
      );
      return receipts;
    } else {
      const receipts = await db.getAllAsync<Receipt>(
        'SELECT * FROM receipts WHERE folderId = ? ORDER BY updatedAt DESC',
        [folderId]
      );
      return receipts;
    }
  } catch (error) {
    console.error(`Error getting receipts for folder ${folderId}:`, error);
    throw error;
  }
};

// Get receipts by Tag
export const getReceiptsByTagId = async (tagId: number): Promise<Receipt[]> => {
    const db = await getDbInstance();
    try {
        const receipts = await db.getAllAsync<Receipt>(
            `SELECT r.* FROM receipts r
             INNER JOIN receipt_tags rt ON r.id = rt.receiptId
             WHERE rt.tagId = ? ORDER BY r.updatedAt DESC`,
            [tagId]
        );
        return receipts;
    } catch (error) {
        console.error(`Error getting receipts for tag ${tagId}:`, error);
        throw error;
    }
};