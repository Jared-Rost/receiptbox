export interface Tag {
  id: number;
  name: string;
}

export type TagInput = Omit<Tag, 'id'>;