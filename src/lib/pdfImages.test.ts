// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { preparePdfImage } from "./pdfImages";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("bounds large visuals to 1200 pixels and encodes JPEG instead of raw chart pixels", async () => {
  class LoadedImage {
    naturalWidth = 2400;
    naturalHeight = 1488;
    onload?: () => void;
    onerror?: () => void;
    set src(_value: string) { queueMicrotask(() => this.onload?.()); }
  }
  vi.stubGlobal("Image", LoadedImage);
  const fillRect = vi.fn();
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ fillStyle: "", fillRect, drawImage } as unknown as CanvasRenderingContext2D);
  const encode = vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,compact");
  const result = await preparePdfImage("data:image/png;base64,large");
  expect(result.width).toBe(1200);
  expect(result.height).toBe(744);
  expect(encode).toHaveBeenCalledWith("image/jpeg", 0.88);
  expect(fillRect).toHaveBeenCalledWith(0, 0, 1200, 744);
});