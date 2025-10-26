import securityOverviewMeta from '@/templates/reports/security-overview.json';
import incidentResponseMeta from '@/templates/reports/incident-response.json';

export type ReportOrientation = 'portrait' | 'landscape';
export type ReportVariableType = 'string' | 'markdown' | 'date' | 'image';

export interface ReportLayoutConfig {
  format: string;
  orientation: ReportOrientation;
  columns: number;
  theme: string;
  margin?: string;
}

export interface ReportCoverField {
  field: string;
  label: string;
  type: ReportVariableType;
  required?: boolean;
  helperText?: string;
}

interface BaseSectionVariableMeta {
  key: string;
  description?: string;
  required?: boolean;
}

export interface ScalarSectionVariableMeta extends BaseSectionVariableMeta {
  type: ReportVariableType;
}

export interface CollectionVariableField {
  field: string;
  type: ReportVariableType;
  required?: boolean;
  description?: string;
}

export interface CollectionSectionVariableMeta extends BaseSectionVariableMeta {
  type: 'collection';
  itemFields: CollectionVariableField[];
}

export type SectionVariableMeta = ScalarSectionVariableMeta | CollectionSectionVariableMeta;

export interface ReportTemplateSection {
  slug: string;
  title: string;
  description: string;
  required?: boolean;
  variables: SectionVariableMeta[];
}

export interface ReportTemplateMetadata {
  id: string;
  name: string;
  description: string;
  layout: ReportLayoutConfig;
  cover: ReportCoverField[];
  sections: ReportTemplateSection[];
  preview: {
    thumbnail: string;
  };
}

export interface ReportTemplateDefinition extends ReportTemplateMetadata {
  templatePath: string;
  previewThumbnail: string;
  requiredVariables: string[];
  optionalVariables: string[];
}

const TEMPLATE_BASE_PATH = 'templates/reports';

type VariableBuckets = {
  required: string[];
  optional: string[];
};

const rawTemplates: ReportTemplateMetadata[] = [securityOverviewMeta, incidentResponseMeta];

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function isCollection(variable: SectionVariableMeta): variable is CollectionSectionVariableMeta {
  return variable.type === 'collection';
}

function pushPath(buckets: VariableBuckets, path: string, isRequired: boolean) {
  if (isRequired) {
    buckets.required.push(path);
  } else {
    buckets.optional.push(path);
  }
}

function collectCoverPaths(cover: ReportCoverField[]): VariableBuckets {
  const buckets: VariableBuckets = { required: [], optional: [] };

  cover.forEach((field) => {
    const dataPath = `cover.${field.field}`;
    const isRequired = field.required !== false;
    pushPath(buckets, dataPath, isRequired);
  });

  return buckets;
}

function collectSectionPaths(sections: ReportTemplateSection[]): VariableBuckets {
  const buckets: VariableBuckets = { required: [], optional: [] };

  sections.forEach((section) => {
    const sectionRequired = section.required !== false;

    section.variables.forEach((variable) => {
      const variableRequired = sectionRequired && variable.required !== false;

      if (isCollection(variable)) {
        const basePath = variable.key;
        pushPath(buckets, basePath, variableRequired);

        variable.itemFields.forEach((item) => {
          const itemPath = `${basePath}[].${item.field}`;
          const itemRequired = variableRequired && item.required !== false;
          pushPath(buckets, itemPath, itemRequired);
        });
      } else {
        pushPath(buckets, variable.key, variableRequired);
      }
    });
  });

  return buckets;
}

function buildDefinition(meta: ReportTemplateMetadata): ReportTemplateDefinition {
  const coverPaths = collectCoverPaths(meta.cover);
  const sectionPaths = collectSectionPaths(meta.sections);

  const requiredVariables = unique([...coverPaths.required, ...sectionPaths.required]);
  const optionalVariables = unique([...coverPaths.optional, ...sectionPaths.optional]);

  return {
    ...meta,
    templatePath: `${TEMPLATE_BASE_PATH}/${meta.id}.mdx`,
    previewThumbnail: meta.preview.thumbnail,
    requiredVariables,
    optionalVariables,
  };
}

const builtTemplates = rawTemplates.map(buildDefinition);

export const reportTemplates: ReportTemplateDefinition[] = builtTemplates;

export const reportTemplateMap: Record<string, ReportTemplateDefinition> = builtTemplates.reduce<
  Record<string, ReportTemplateDefinition>
>((acc, template) => {
  acc[template.id] = template;
  return acc;
}, {});

export interface ReportTemplateSummary {
  id: string;
  name: string;
  description: string;
  previewThumbnail: string;
  requiredVariables: string[];
}

export function listReportTemplateSummaries(): ReportTemplateSummary[] {
  return reportTemplates.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    previewThumbnail: template.previewThumbnail,
    requiredVariables: template.requiredVariables,
  }));
}

export function getReportTemplate(id: string): ReportTemplateDefinition | undefined {
  return reportTemplateMap[id];
}
