export interface BulkRenameOptions {
  /**
   * Template containing one or more `#` characters which will be replaced
   * with incrementing numbers. The amount of `#` characters controls the
   * zero padding. For example `file_##.txt` will generate `file_01.txt`,
   * `file_02.txt`, ...
   */
  template: string;
  /** Starting number for the sequence (default: 1) */
  start?: number;
}

/**
 * Apply a bulk rename pattern to a list of filenames. Only numbering logic is
 * handled here – the caller is responsible for actually renaming files on disk.
 *
 * @param files - Array of original file names
 * @param options - Rename options including the template and starting number
 * @returns Array of new file names generated from the template
 */
export function bulkRename(
  files: string[],
  options: BulkRenameOptions | string,
): string[] {
  const opts: BulkRenameOptions =
    typeof options === 'string' ? { template: options } : options;
  const start = opts.start ?? 1;

  const match = opts.template.match(/#+/);
  const padLength = match ? match[0].length : 0;

  return files.map((_, i) => {
    const num = String(start + i).padStart(padLength, '0');
    if (match) {
      return opts.template.replace(/#+/, num);
    }
    // If no placeholder provided simply append the number at the end
    return opts.template + num;
  });
}

export default bulkRename;
