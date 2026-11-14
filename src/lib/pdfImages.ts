/** Bound raster resolution and encode opaque PDF visuals efficiently. */
export async function preparePdfImage(dataUrl: string): Promise<{ dataUrl: string; width: number; height: number }> {
  const image = new Image();
  const loaded = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Image timeout")), 3000);
    image.onload = () => { clearTimeout(timer); resolve(); };
    image.onerror = () => { clearTimeout(timer); reject(new Error("Invalid image")); };
  });
  image.src = dataUrl;
  await loaded;
  const ratio = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image conversion unavailable");
  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const result = { dataUrl: canvas.toDataURL("image/jpeg", 0.88), width: canvas.width, height: canvas.height };
  canvas.width = 0;
  canvas.height = 0;
  return result;
}