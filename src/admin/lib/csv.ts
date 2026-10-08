/**
 * CSV for exports. Used by the mock layer to build files in the browser;
 * the real API should generate exports on the server (so they can be
 * permission-checked and logged) using the same rules:
 *
 *  · RFC 4180 quoting;
 *  · a cell that starts with = + - @ or a control character is prefixed
 *    with an apostrophe, so a name like "=HYPERLINK(…)" cannot run as a
 *    formula when an admin opens the file in a spreadsheet (CSV injection);
 *  · UTF-8 with a byte-order mark, so Arabic names open correctly in Excel.
 */
export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

function cell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s) && typeof v === 'string') s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export function toCsv<T>(rows: readonly T[], columns: ReadonlyArray<CsvColumn<T>>): string {
  const head = columns.map((c) => cell(c.header)).join(',');
  const body = rows.map((r) => columns.map((c) => cell(c.value(r))).join(','));
  return [head, ...body].join('\r\n');
}

export function csvBlob(text: string): Blob {
  return new Blob(['﻿', text], { type: 'text/csv;charset=utf-8' });
}

/** Saves a file the browser already has (an export) under its name. */
export function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
