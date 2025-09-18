export interface ArtifactMedia {
  src: string;
  alt?: string;
  caption?: string;
}

export interface Artifact {
  name: string;
  type: string;
  description: string;
  size: number;
  plugin: string;
  timestamp: string;
  user?: string;
  /** Optional additional notes that should accompany the artifact section. */
  notes?: string;
  /**
   * When present an image preview is embedded in the exported HTML report.
   * The alt text should describe the visual for screen reader users.
   */
  evidenceImage?: ArtifactMedia;
  /**
   * Allows authors to promote an artifact to a custom heading level.
   * Defaults to <h3> in the generated report if omitted.
   */
  headingLevel?: number;
}
