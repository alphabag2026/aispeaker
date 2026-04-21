import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { storagePut } from "./storage";

export async function convertPdfToImages(
  pdfBuffer: Buffer,
  projectId: number
): Promise<{ slideOrder: number; imageUrl: string; fileKey: string }[]> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pdf-convert-"));
  const pdfPath = path.join(tmpDir, "input.pdf");
  fs.writeFileSync(pdfPath, pdfBuffer);
  const results: { slideOrder: number; imageUrl: string; fileKey: string }[] = [];
  try {
    try {
      execSync(`which pdftoppm`, { stdio: "ignore" });
      execSync(`pdftoppm -png -r 200 "${pdfPath}" "${path.join(tmpDir, "slide")}"`, { timeout: 120000 });
      const files = fs.readdirSync(tmpDir).filter(f => f.startsWith("slide-") && f.endsWith(".png")).sort();
      for (let i = 0; i < files.length; i++) {
        const imgBuffer = fs.readFileSync(path.join(tmpDir, files[i]));
        const fileKey = `lecture-builder/${projectId}/slides/pdf-${Date.now()}-${i}.png`;
        const { url } = await storagePut(fileKey, imgBuffer, "image/png");
        results.push({ slideOrder: i, imageUrl: url, fileKey });
      }
    } catch {
      const { PDFDocument } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pageCount = pdfDoc.getPageCount();
      for (let i = 0; i < pageCount; i++) {
        const singlePdf = await PDFDocument.create();
        const [copiedPage] = await singlePdf.copyPages(pdfDoc, [i]);
        singlePdf.addPage(copiedPage);
        const singlePdfBytes = await singlePdf.save();
        const singlePath = path.join(tmpDir, `single-${i}.pdf`);
        fs.writeFileSync(singlePath, singlePdfBytes);
        try {
          execSync(`pdftoppm -png -r 200 -singlefile "${singlePath}" "${path.join(tmpDir, `out-${i}`)}"`, { timeout: 30000 });
          const outFile = path.join(tmpDir, `out-${i}.png`);
          if (fs.existsSync(outFile)) {
            const imgBuffer = fs.readFileSync(outFile);
            const fileKey = `lecture-builder/${projectId}/slides/pdf-${Date.now()}-${i}.png`;
            const { url } = await storagePut(fileKey, imgBuffer, "image/png");
            results.push({ slideOrder: i, imageUrl: url, fileKey });
          }
        } catch {
          const sharp = (await import("sharp")).default;
          const page = pdfDoc.getPage(i);
          const { width, height } = page.getSize();
          const svg = `<svg width="${Math.round(width)}" height="${Math.round(height)}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f8f9fa"/><text x="50%" y="50%" text-anchor="middle" fill="#6b7280" font-size="24">PDF Page ${i + 1}</text></svg>`;
          const imgBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
          const fileKey = `lecture-builder/${projectId}/slides/pdf-${Date.now()}-${i}.png`;
          const { url } = await storagePut(fileKey, imgBuffer, "image/png");
          results.push({ slideOrder: i, imageUrl: url, fileKey });
        }
      }
    }
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
  return results;
}

export async function convertPptToImages(
  pptBuffer: Buffer, projectId: number, originalFileName: string
): Promise<{ slideOrder: number; imageUrl: string; fileKey: string }[]> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ppt-convert-"));
  const ext = originalFileName.endsWith(".pptx") ? ".pptx" : ".ppt";
  const pptPath = path.join(tmpDir, `input${ext}`);
  fs.writeFileSync(pptPath, pptBuffer);
  try {
    try { execSync(`which libreoffice`, { stdio: "ignore" }); } catch {
      throw new Error("LibreOffice not available. Please upload individual slide images instead.");
    }
    execSync(`libreoffice --headless --convert-to pdf --outdir "${tmpDir}" "${pptPath}"`, { timeout: 120000, stdio: "ignore" });
    const pdfFile = fs.readdirSync(tmpDir).find(f => f.endsWith(".pdf"));
    if (!pdfFile) throw new Error("PPT to PDF conversion failed");
    const pdfBuffer = fs.readFileSync(path.join(tmpDir, pdfFile));
    return await convertPdfToImages(pdfBuffer, projectId);
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

export async function convertFileToSlideImages(
  fileBuffer: Buffer, fileName: string, mimeType: string, projectId: number
): Promise<{ slideOrder: number; imageUrl: string; fileKey: string }[]> {
  const lowerName = fileName.toLowerCase();
  if (mimeType === "application/pdf" || lowerName.endsWith(".pdf")) {
    return convertPdfToImages(fileBuffer, projectId);
  }
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint") || lowerName.endsWith(".pptx") || lowerName.endsWith(".ppt")) {
    return convertPptToImages(fileBuffer, projectId, fileName);
  }
  if (mimeType.startsWith("image/")) {
    const fileKey = `lecture-builder/${projectId}/slides/img-${Date.now()}.${lowerName.split(".").pop() || "png"}`;
    const { url } = await storagePut(fileKey, fileBuffer, mimeType);
    return [{ slideOrder: 0, imageUrl: url, fileKey }];
  }
  throw new Error(`Unsupported file type: ${mimeType}`);
}
