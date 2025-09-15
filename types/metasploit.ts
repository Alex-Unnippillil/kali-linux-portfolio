export interface ModuleOption {
  name: string;
  required: boolean;
  description: string;
}

export interface ModuleMetadata {
  name: string;
  description: string;
  tags: string[];
  options: ModuleOption[];
}
