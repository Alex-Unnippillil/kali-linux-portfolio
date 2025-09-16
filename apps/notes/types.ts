export interface Note {
  id: string;
  title: string;
  body: string;
  labelId: string;
  createdAt: number;
  updatedAt: number;
}

export interface NoteDraft {
  title: string;
  body: string;
  labelId: string;
}
