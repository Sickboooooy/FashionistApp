/**
 * 📄 PDF Service — genera la revista de moda como un PDF REAL (PDFKit).
 *
 * Reemplaza el placeholder anterior (`Buffer.from("PDF simulado…")`) por un
 * documento editorial descargable. Solo texto por robustez (las imágenes del
 * catálogo pueden ser remotas); embeber imágenes es una mejora futura.
 */

import PDFDocument from "pdfkit";

export interface MagazineOutfit {
  id: number;
  name: string;
  description: string;
  occasion: string;
  season?: string;
  imageUrl?: string;
  editorial: string;
}

export interface MagazineContent {
  title: string;
  subtitle: string;
  introduction: string;
  outfits: MagazineOutfit[];
  conclusion: string;
  template: string;
}

const GOLD = "#C8A24B";
const INK = "#1a1a1a";
const MUTED = "#6b6b6b";

/** Construye el PDF de la revista y lo resuelve como un Buffer. */
export function generateMagazinePdf(content: MagazineContent): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 56,
        info: { Title: content.title, Author: "Anna Style" },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const left = doc.page.margins.left;
      const pageWidth = doc.page.width - left - doc.page.margins.right;

      // ── Portada ──────────────────────────────────────────────────────────
      doc.moveDown(4);
      doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(34).text(content.title, { align: "center" });
      doc.moveDown(0.5);
      doc.fillColor(MUTED).font("Helvetica-Oblique").fontSize(14).text(content.subtitle, { align: "center" });
      doc.moveDown(2);
      doc.strokeColor(GOLD).lineWidth(1)
        .moveTo(left + pageWidth * 0.3, doc.y)
        .lineTo(left + pageWidth * 0.7, doc.y)
        .stroke();
      doc.moveDown(2);
      doc.fillColor(INK).font("Helvetica").fontSize(12).text(content.introduction, { align: "justify", lineGap: 4 });

      // ── Un look por página ───────────────────────────────────────────────
      content.outfits.forEach((outfit, i) => {
        doc.addPage();
        doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(12)
          .text(`LOOK ${String(i + 1).padStart(2, "0")}`, { characterSpacing: 3 });
        doc.moveDown(0.3);
        doc.fillColor(INK).font("Helvetica-Bold").fontSize(24).text(outfit.name);
        const meta = [outfit.occasion, outfit.season].filter(Boolean).join("  ·  ");
        if (meta) {
          doc.moveDown(0.2);
          doc.fillColor(MUTED).font("Helvetica-Oblique").fontSize(11).text(meta);
        }
        doc.moveDown(1);
        doc.fillColor(INK).font("Helvetica").fontSize(12).text(outfit.description, { align: "justify", lineGap: 4 });
        if (outfit.editorial) {
          doc.moveDown(1);
          doc.fillColor(GOLD).font("Helvetica-Oblique").fontSize(12).text(outfit.editorial, { align: "justify", lineGap: 4 });
        }
      });

      // ── Cierre ───────────────────────────────────────────────────────────
      doc.addPage();
      doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(20).text("Para cerrar", { align: "center" });
      doc.moveDown(1);
      doc.fillColor(INK).font("Helvetica").fontSize(12).text(content.conclusion, { align: "justify", lineGap: 4 });
      doc.moveDown(3);
      doc.fillColor(MUTED).font("Helvetica").fontSize(9)
        .text(`Generado por Anna Style · ${content.template}`, { align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
