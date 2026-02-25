import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const isCrossOrigin = (url: string): boolean => {
  try {
    return new URL(url, window.location.href).origin !== window.location.origin;
  } catch {
    return false;
  }
};

/** Approach B1: Replace cross-origin img srcs with blob URLs, capture, then restore. */
async function exportMessageToPDFWithBlobProxy(
  element: HTMLElement,
  fileName: string
): Promise<void> {
  const images = element.getElementsByTagName('img');
  const replacements: { img: HTMLImageElement; originalSrc: string; objectUrl: string }[] = [];

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const src = img.getAttribute('src') || img.src;
    if (!src || !isCrossOrigin(src)) continue;
    try {
      const res = await fetch(src, { mode: 'cors' });
      if (!res.ok) continue;
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      replacements.push({ img, originalSrc: src, objectUrl });
      img.src = objectUrl;
    } catch (e) {
      console.warn('Failed to proxy image for PDF:', src, e);
    }
  }

  await waitForImagesToLoad(element);
  await new Promise((r) => setTimeout(r, 500));

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: null,
    logging: true,
    imageTimeout: 15000,
    removeContainer: false,
    foreignObjectRendering: false,
  });

  for (const { img, originalSrc, objectUrl } of replacements) {
    img.src = originalSrc;
    URL.revokeObjectURL(objectUrl);
  }

  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const pdfWidth = 210;
  const pdfHeight = 297;
  const ratio = Math.min(
    pdfWidth / (canvasWidth / 2),
    pdfHeight / (canvasHeight / 2)
  );
  const imgWidth = (canvasWidth / 2) * ratio;
  const imgHeight = (canvasHeight / 2) * ratio;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const imgData = canvas.toDataURL('image/png', 1.0);
  const xOffset = (pdfWidth - imgWidth) / 2;
  const yOffset = (pdfHeight - imgHeight) / 2;
  pdf.addImage(imgData, 'PNG', Math.max(0, xOffset), Math.max(0, yOffset), imgWidth, imgHeight, undefined, 'FAST');
  pdf.save(fileName);
  console.log('✅ PDF downloaded (blob proxy):', fileName);
}

// Helper function to wait for all images to load
const waitForImagesToLoad = (element: HTMLElement): Promise<void> => {
  return new Promise((resolve) => {
    const images = element.getElementsByTagName('img');
    
    if (images.length === 0) {
      resolve();
      return;
    }

    let loadedCount = 0;
    const totalImages = images.length;

    const imageLoaded = () => {
      loadedCount++;
      console.log(`📸 Image loaded: ${loadedCount}/${totalImages}`);
      if (loadedCount === totalImages) {
        console.log('✅ All images loaded');
        resolve();
      }
    };

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (img.complete) {
        imageLoaded();
      } else {
        img.addEventListener('load', imageLoaded);
        img.addEventListener('error', () => {
          console.warn('⚠️ Image failed to load:', img.src);
          imageLoaded(); // Continue anyway
        });
      }
    }
  });
};

export const exportMessageToPDF = async (
  element: HTMLElement,
  fileName: string = 'rekindle-message.pdf'
): Promise<void> => {
  try {
    console.log('🎨 Starting PDF generation...');

    // Option A: allowTaint true so html2canvas draws the cross-origin background image
    console.log('⏳ Waiting for images to load...');
    await waitForImagesToLoad(element);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: true,
      imageTimeout: 15000,
      removeContainer: false,
      foreignObjectRendering: false,
    });

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const pdfWidth = 210;
    const pdfHeight = 297;
    const ratio = Math.min(
      pdfWidth / (canvasWidth / 2),
      pdfHeight / (canvasHeight / 2)
    );
    const imgWidth = (canvasWidth / 2) * ratio;
    const imgHeight = (canvasHeight / 2) * ratio;

    let imgData: string;
    try {
      imgData = canvas.toDataURL('image/png', 1.0);
    } catch (taintError) {
      console.warn('⚠️ Canvas tainted, retrying with blob proxy...', taintError);
      await exportMessageToPDFWithBlobProxy(element, fileName);
      return;
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    const xOffset = (pdfWidth - imgWidth) / 2;
    const yOffset = (pdfHeight - imgHeight) / 2;
    pdf.addImage(
      imgData,
      'PNG',
      Math.max(0, xOffset),
      Math.max(0, yOffset),
      imgWidth,
      imgHeight,
      undefined,
      'FAST'
    );
    pdf.save(fileName);
    console.log('✅ PDF downloaded:', fileName);
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    throw error;
  }
};
