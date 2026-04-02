/**
 * Copy text to the clipboard using the Clipboard API.
 * Falls back to document.execCommand for older browsers.
 * Returns true if successful.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textArea);
    return success;
  } catch {
    return false;
  }
}

/**
 * Format keywords as a comma-separated tag string for copying.
 */
export function formatKeywordsAsTags(keywords: string[]): string {
  return keywords.join(", ");
}

/**
 * Format keywords as a hash-tag string for copying.
 */
export function formatKeywordsAsHashtags(keywords: string[]): string {
  return keywords.map((k) => `#${k.replace(/\s+/g, "_")}`).join(" ");
}
