export interface KismetCsvColumn<T> {
  /** Unique identifier for the column */
  id: string;
  /** Header label shown in the table / CSV */
  label: string;
  /**
   * Returns the value that should be written to the CSV for the provided row.
   * The value is converted to a string during serialization.
   */
  getValue: (row: T) => unknown;
}

export interface KismetCsvSnapshot<T> {
  /** Columns that are currently visible in the table */
  columns: KismetCsvColumn<T>[];
  /** Rows in the order they are currently displayed */
  rows: T[];
}

const needsQuoting = (value: string) => /[",\n]/.test(value);

const normaliseValue = (value: unknown): string => {
  if (value == null) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => normaliseValue(item)).join('; ');
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (error) {
      return '';
    }
  }

  return String(value);
};

export const escapeCsvValue = (value: unknown): string => {
  const stringValue = normaliseValue(value);
  if (stringValue === '') {
    return '';
  }

  if (needsQuoting(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

export const serializeVisibleSnapshotToCsv = <T,>({
  columns,
  rows,
}: KismetCsvSnapshot<T>): string => {
  if (!columns.length) {
    return '';
  }

  const header = columns.map((column) => escapeCsvValue(column.label)).join(',');
  const lines = rows.map((row) =>
    columns.map((column) => escapeCsvValue(column.getValue(row))).join(','),
  );

  return [header, ...lines].join('\n');
};
