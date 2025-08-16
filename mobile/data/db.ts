import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = "receipt_box_db.db";

export const initializeDB = async (database: SQLite.SQLiteDatabase) => {
  try {
    // Receipts Table
    await database.execAsync(
      `CREATE TABLE IF NOT EXISTS receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        storeName TEXT,
        date TEXT,
        totalAmount REAL,
        imageUri TEXT,
        notes TEXT,
        folderId INTEGER,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (folderId) REFERENCES folders(id) ON DELETE SET NULL
      );`
    );
    console.log('Receipts table created successfully or already exists');

    // Folders Table (Modified for nested folders)
    await database.execAsync(
      `CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parentId INTEGER,
        FOREIGN KEY (parentId) REFERENCES folders(id) ON DELETE CASCADE 
      );`
      // Note: parentId allows for nested folders, can be null for root folders
    );
    console.log('Folders table created successfully or already exists');

    // Tags Table
    await database.execAsync(
      `CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );`
    );
    console.log('Tags table created successfully or already exists');

    // Receipt_Tags Junction Table
    await database.execAsync(
      `CREATE TABLE IF NOT EXISTS receipt_tags (
        receiptId INTEGER NOT NULL,
        tagId INTEGER NOT NULL,
        PRIMARY KEY (receiptId, tagId),
        FOREIGN KEY (receiptId) REFERENCES receipts(id) ON DELETE CASCADE,
        FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE
      );`
    );
    console.log('Receipt_Tags table created successfully or already exists');

  } catch (error) {
    console.error('Error initializing database tables: ', error);
  }
};

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const getDbInstance = async (): Promise<SQLite.SQLiteDatabase> => {
  if (dbInstance !== null) {
    return dbInstance;
  }
  
  dbInstance = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await initializeDB(dbInstance); 
  return dbInstance;
};