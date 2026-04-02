import * as XLSX from 'xlsx';

/**
 * Parse CSV/XLSX file to keyword list.
 * Reads the first column of the first sheet, filters empty cells, deduplicates.
 */
export function parseKeywordsFromFile(file: ArrayBuffer, filename: string): string[] {
  const workbook = XLSX.read(file, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  // Extract first column only, flatten, convert to string, filter empty, deduplicate
  const firstColumnValues = data
    .map((row) => (Array.isArray(row) ? row[0] : undefined))
    .filter((v) => v !== undefined && v !== null && String(v).trim() !== '')
    .map((v) => String(v).trim());
  return [...new Set(firstColumnValues)];
}

/**
 * Export analysis results to XLSX and trigger download in the browser.
 */
export function exportToExcel(data: Record<string, unknown>[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '키워드 분석');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
