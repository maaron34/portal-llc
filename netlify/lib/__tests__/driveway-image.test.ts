import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";
import { MAX_PHOTO_BYTES, checkPhoto, decodeJpeg, encodeJpeg, fitToSize, jpegSize, requestSize, type Rgba } from "../driveway-image";
import { toJpeg } from "../driveway-openai";
import { fixtureBytes } from "./helpers";

const solid = (width: number, height: number): Rgba => ({ width, height, data: new Uint8Array(width * height * 4).fill(140) });

describe("photo validation (what the bytes are, not what the browser claims)", () => {
  it("accepts a normal phone photo", () => {
    const r = checkPhoto(fixtureBytes("photo1.jpg"));
    expect(r).toEqual({ ok: true, width: 640, height: 480 });
  });
  it("refuses a PNG, a PDF, text and an empty file", () => {
    const png = PNG.sync.write(new PNG({ width: 600, height: 600 }));
    expect(checkPhoto(new Uint8Array(png))).toEqual({ ok: false, reason: "type" });
    expect(checkPhoto(new TextEncoder().encode("%PDF-1.7 not a photo"))).toEqual({ ok: false, reason: "type" });
    expect(checkPhoto(new TextEncoder().encode("<script>alert(1)</script>"))).toEqual({ ok: false, reason: "type" });
    expect(checkPhoto(new Uint8Array(0))).toEqual({ ok: false, reason: "size" });
  });
  it("refuses a file over the size limit before reading it", () => {
    const big = new Uint8Array(MAX_PHOTO_BYTES + 1);
    big.set([0xff, 0xd8, 0xff]);
    expect(checkPhoto(big)).toEqual({ ok: false, reason: "size" });
  });
  it("refuses a tiny image, a huge one and a panorama", () => {
    expect(checkPhoto(encodeJpeg(solid(200, 150)))).toEqual({ ok: false, reason: "dimensions" });
    expect(checkPhoto(encodeJpeg(solid(2400, 1800), 30))).toEqual({ ok: false, reason: "dimensions" });
    expect(checkPhoto(encodeJpeg(solid(1536, 480)))).toEqual({ ok: false, reason: "dimensions" });
  });
  it("refuses a JPEG header with nothing behind it", () => {
    expect(checkPhoto(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 2]))).toEqual({ ok: false, reason: "unreadable" });
  });
  it("reads the size from the header", () => {
    expect(jpegSize(encodeJpeg(solid(1536, 1152), 40))).toEqual({ width: 1536, height: 1152 });
  });
});

describe("output shape", () => {
  it("asks the model for the photo's own shape, in multiples of 16", () => {
    expect(requestSize(1536, 1152)).toEqual({ width: 1536, height: 1152 });
    expect(requestSize(1152, 1536)).toEqual({ width: 1152, height: 1536 });
    expect(requestSize(1536, 864)).toEqual({ width: 1536, height: 864 });
    // A photo the page did not snap (an older page, a direct call): nearest multiples, under 1% off.
    expect(requestSize(1500, 1001)).toEqual({ width: 1504, height: 1008 });
  });
  it("leaves a result of the right size untouched", () => {
    const bytes = encodeJpeg(solid(640, 480));
    const r = fitToSize(bytes, 640, 480)!;
    expect(r.resized).toBe(false);
    expect(r.bytes).toBe(bytes);
  });
  it("brings a result of the wrong size back to exactly the photo's size", () => {
    const r = fitToSize(encodeJpeg(solid(1280, 720)), 1500, 1001)!;
    expect(r.resized).toBe(true);
    const back = decodeJpeg(r.bytes)!;
    expect([back.width, back.height]).toEqual([1500, 1001]);
  });
  it("returns null for bytes that are not an image", () => {
    expect(fitToSize(new Uint8Array([1, 2, 3]), 640, 480)).toBeNull();
  });
  it("turns the model's PNG answer into a JPEG and keeps a JPEG as it is", () => {
    const png = new PNG({ width: 64, height: 48 });
    png.data.fill(200);
    const jpeg = toJpeg(new Uint8Array(PNG.sync.write(png)))!;
    expect(jpegSize(jpeg)).toEqual({ width: 64, height: 48 });
    const already = encodeJpeg(solid(64, 48));
    expect(toJpeg(already)).toBe(already);
    expect(toJpeg(new Uint8Array([0, 1, 2, 3]))).toBeNull();
  });
});
