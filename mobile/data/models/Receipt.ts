export interface Receipt {
  id: number;
  storeName: string | null;
  date: string | null;
  totalAmount: number | null;
  imageUri: string | null;
  notes: string | null;
  folderId: number | null;
  createdAt: string; // ISO 8601 date string
  updatedAt: string; // ISO 8601 date string
}

// For creating receipts, createdAt and updatedAt will be set by the service.
// So, they are not part of the direct input from the UI for creation.
// For updates, updatedAt will be set by the service.
export type ReceiptInput = Omit<Receipt, 'id' | 'createdAt' | 'updatedAt'>;

// Update fields except those that are auto-managed by the service.
export type ReceiptUpdateInput = Partial<Omit<Receipt, 'id' | 'createdAt' | 'updatedAt'>>;