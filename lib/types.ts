export interface Badge {
  src: string;
  alt: string;
  label: string;
  description?: string;
}

export interface Project {
  title: string;
  description: string;
  image: string;
  tech: string[];
  tags: string[];
  live?: string;
  repo?: string;
}
