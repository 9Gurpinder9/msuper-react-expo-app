// frontend/src/utils/dateFormatter.ts

/**
 * Parses an ISO date string safely across all platforms.
 */
export const parseISODate = (isoString: string | Date): Date => {
  if (!isoString) return new Date();
  if (isoString instanceof Date) return isoString;
  
  // Strip timezone if present to avoid off-by-one errors from local offset shifts
  const parts = isoString.split('T')[0].split('-').map(Number);
  if (parts.length === 3) {
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  }
  return new Date(isoString);
};

/**
 * Formats a Date object or ISO string to local DD-MM-YYYY format.
 * Example: 2026-06-05T00:00:00.000Z -> "05-06-2026"
 */
export const formatDate = (dateInput: Date | string | null | undefined): string => {
  if (!dateInput) return '-';
  try {
    const date = parseISODate(dateInput);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (error) {
    return String(dateInput);
  }
};

/**
 * Formats a Date object or ISO string to 12-hour Time format (HH:MM AM/PM).
 * Example: "2026-06-05T14:30:00.000Z" -> "02:30 PM"
 */
export const formatTime = (dateInput: Date | string | null | undefined): string => {
  if (!dateInput) return '-';
  try {
    const date = new Date(dateInput);
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const strHours = String(hours).padStart(2, '0');
    return `${strHours}:${minutes} ${ampm}`;
  } catch (error) {
    return '';
  }
};

/**
 * Formats Date object or ISO string to "DD-MM-YYYY HH:MM AM/PM"
 */
export const formatDateTime = (dateInput: Date | string | null | undefined): string => {
  if (!dateInput) return '-';
  const dateStr = formatDate(dateInput);
  const timeStr = formatTime(dateInput);
  return timeStr !== '-' ? `${dateStr} ${timeStr}` : dateStr;
};
