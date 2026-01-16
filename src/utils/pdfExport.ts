import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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

    // Wait for all images to load
    console.log('⏳ Waiting for images to load...');
    await waitForImagesToLoad(element);
    
    // Give a small additional delay to ensure rendering is complete
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('📸 Capturing element to canvas...');

    // Convert HTML element to canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: true,
      imageTimeout: 15000, // Wait up to 15 seconds for images
      removeContainer: false,
    });

    console.log('✅ Canvas created:', {
      width: canvas.width,
      height: canvas.height,
    });

    // Get canvas dimensions
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // A4 dimensions in mm
    const pdfWidth = 210;
    const pdfHeight = 297;

    // Calculate scaling to fit A4
    const ratio = Math.min(
      pdfWidth / (canvasWidth / 2),
      pdfHeight / (canvasHeight / 2)
    );

    const imgWidth = (canvasWidth / 2) * ratio;
    const imgHeight = (canvasHeight / 2) * ratio;

    console.log('📐 PDF dimensions:', {
      imgWidth: imgWidth.toFixed(2),
      imgHeight: imgHeight.toFixed(2),
      ratio: ratio.toFixed(4),
    });

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Convert canvas to image (use PNG for better quality)
    const imgData = canvas.toDataURL('image/png', 1.0);

    console.log('🖼️ Image data created (length:', imgData.length, 'bytes)');

    // Center the image on the page
    const xOffset = (pdfWidth - imgWidth) / 2;
    const yOffset = (pdfHeight - imgHeight) / 2;

    // Add image to PDF
    pdf.addImage(
      imgData,
      'PNG',
      Math.max(0, xOffset),
      Math.max(0, yOffset),
      imgWidth,
      imgHeight,
      undefined,
      'FAST' // Compression mode
    );

    console.log('✅ PDF created successfully');

    // Save PDF
    pdf.save(fileName);

    console.log('✅ PDF downloaded:', fileName);
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    throw error;
  }
};
