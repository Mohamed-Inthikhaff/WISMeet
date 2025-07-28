import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the dynamic base URL that works in both client and server environments
 * @returns The base URL for the application
 */
export function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    // Client-side: use window.location.origin
    return window.location.origin;
  }
  
  // Server-side: use environment variable
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
}

/**
 * Generate a meeting link with the correct base URL
 * @param meetingId - The meeting ID
 * @param personal - Whether this is a personal room
 * @returns The complete meeting URL
 */
export function getMeetingLink(meetingId: string, personal: boolean = false): string {
  const baseUrl = getBaseUrl();
  const queryParams = personal ? "?personal=true" : "";
  return `${baseUrl}/meeting/${meetingId}${queryParams}`;
}
