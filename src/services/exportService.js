const downloadFile = (content, filename, type) => {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  const safeTitle = filename.replace(/[/\\?%*:|"<>]/g, '-');
  link.href = url;
  link.download = safeTitle;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToMarkdown = (bookTitle, highlights) => {
  if (!highlights || highlights.length === 0) return;

  const author = highlights[0]?.Autor || "Desconocido";
  const date = new Date().toLocaleDateString();

  let content = `---
title: "${bookTitle}"
author: "${author}"
exported_on: ${date}
source: Miru Highlights
---

# ${bookTitle}
**Autor:** ${author}

---

`;

  const sortedHighlights = [...highlights].sort((a, b) => a.Pagina - b.Pagina);

  sortedHighlights.forEach((h) => {
    content += `> ${h.Highlight}\n\n`;
    content += `**Capítulo:** ${h.Capitulo || "N/A"} | **Pág:** ${h.Pagina} | **Fecha:** ${h.Fecha}\n\n---\n\n`;
  });

  downloadFile(content, `${bookTitle}_Highlights.md`, "text/markdown;charset=utf-8");
};

export const exportToJson = (bookTitle, highlights) => {
  if (!highlights || highlights.length === 0) return;
  const data = {
    bookTitle,
    author: highlights[0]?.Autor || "Desconocido",
    exportedOn: new Date().toISOString(),
    highlights: highlights.map(h => ({
      text: h.Highlight,
      page: h.Pagina,
      chapter: h.Capitulo,
      date: h.Fecha
    }))
  };
  downloadFile(JSON.stringify(data, null, 2), `${bookTitle}_Highlights.json`, "application/json");
};

export const exportToWord = async (bookTitle, highlights) => {
  if (!highlights || highlights.length === 0) return;

  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import("docx");

  const author = highlights[0]?.Autor || "Desconocido";
  const sortedHighlights = [...highlights].sort((a, b) => a.Pagina - b.Pagina);

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: bookTitle,
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          text: `Autor: ${author}`,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        ...sortedHighlights.flatMap(h => [
          new Paragraph({
            children: [
              new TextRun({
                text: h.Highlight,
                italics: true,
              }),
            ],
            indent: { left: 720 },
            spacing: { before: 200, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Capítulo: ${h.Capitulo || "N/A"} | Pág: ${h.Pagina} | Fecha: ${h.Fecha}`,
                size: 18,
                color: "666666",
              }),
            ],
            spacing: { after: 200 },
          }),
        ])
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  downloadFile(blob, `${bookTitle}_Highlights.docx`, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
};

export const exportToPdf = async (bookTitle, highlights) => {
  if (!highlights || highlights.length === 0) return;

  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF();
  const author = highlights[0]?.Autor || "Desconocido";
  const sortedHighlights = [...highlights].sort((a, b) => a.Pagina - b.Pagina);

  // Title
  doc.setFontSize(20);
  doc.setTextColor(108, 99, 255); // Accent color
  const titleLines = doc.splitTextToSize(bookTitle, 170);
  doc.text(titleLines, 20, 20);

  let y = 20 + (titleLines.length * 10);

  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Autor: ${author}`, 20, y);
  y += 15;

  doc.setDrawColor(200);
  doc.line(20, y, 190, y);
  y += 10;

  sortedHighlights.forEach((h) => {
    // Check for page break
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(11);
    doc.setTextColor(34);
    const textLines = doc.splitTextToSize(`"${h.Highlight}"`, 160);

    // Check if block fits on current page
    if (y + (textLines.length * 6) + 15 > 285) {
      doc.addPage();
      y = 20;
    }

    doc.text(textLines, 25, y);
    y += (textLines.length * 6) + 5;

    doc.setFontSize(9);
    doc.setTextColor(150);
    const meta = `Cap: ${h.Capitulo || "N/A"} | Pag: ${h.Pagina} | Fecha: ${h.Fecha}`;
    doc.text(meta, 25, y);
    y += 12;

    doc.setDrawColor(240);
    doc.line(25, y - 5, 185, y - 5);
  });

  doc.save(`${bookTitle.replace(/[/\\?%*:|"<>]/g, '-')}_Highlights.pdf`);
};

export const exportAllToMarkdown = (allHighlightsByBook) => {
  Object.entries(allHighlightsByBook).forEach(([title, highlights]) => {
    exportToMarkdown(title, highlights);
  });
};

export const exportAllToJson = (allHighlightsByBook) => {
  Object.entries(allHighlightsByBook).forEach(([title, highlights]) => {
    exportToJson(title, highlights);
  });
};

export const exportAllToWord = async (allHighlightsByBook) => {
  for (const [title, highlights] of Object.entries(allHighlightsByBook)) {
    await exportToWord(title, highlights);
  }
};

export const exportAllToPdf = async (allHighlightsByBook) => {
  for (const [title, highlights] of Object.entries(allHighlightsByBook)) {
    await exportToPdf(title, highlights);
  }
};
