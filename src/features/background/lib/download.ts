export const CHECKERBOARD_STYLE = {
  backgroundImage:
    "linear-gradient(45deg, rgba(148,163,184,0.25) 25%, transparent 25%, transparent 75%, rgba(148,163,184,0.25) 75%), linear-gradient(45deg, rgba(148,163,184,0.25) 25%, transparent 25%, transparent 75%, rgba(148,163,184,0.25) 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 8px 8px",
};

export async function downloadFile(url: string, filename: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
