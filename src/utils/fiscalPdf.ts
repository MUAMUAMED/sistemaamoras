export const createFiscalPdfFile = async (element: HTMLElement, fileName: string) => {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    logging: false,
    scale: Math.max(2, Math.min(window.devicePixelRatio || 1, 3)),
    useCORS: true,
  });

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const margin = 10;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;
  const imageHeight = (canvas.height * contentWidth) / canvas.width;
  const image = canvas.toDataURL('image/png');
  const pageCount = Math.max(1, Math.ceil(imageHeight / contentHeight));

  for (let page = 0; page < pageCount; page += 1) {
    if (page > 0) pdf.addPage();
    pdf.addImage(image, 'PNG', margin, margin - page * contentHeight, contentWidth, imageHeight, undefined, 'FAST');
  }

  const normalizedName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  return new File([pdf.output('blob')], normalizedName, { type: 'application/pdf' });
};

export const downloadFile = (file: File) => {
  const url = URL.createObjectURL(file);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
