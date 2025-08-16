export interface Folder {
  id: number;
  name: string;
  parentId: number | null; // For nested folders
}

export type FolderInput = Omit<Folder, 'id'>;