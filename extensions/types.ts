export interface ExtensionRequirements {
  core?: string;
}

export interface ExtensionManifest {
  id: string;
  sandbox: 'worker' | 'iframe';
  code: string;
  requires?: ExtensionRequirements;
}
