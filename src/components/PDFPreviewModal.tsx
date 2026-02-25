import { useRef, useState, useEffect } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import MessageWithTemplate from './MessageWithTemplate';
import { exportMessageToPDF } from '../utils/pdfExport';

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  templateUrl?: string;
  templateGradient?: string;
  borderColor?: string;
  accentColor?: string;
  recipientName?: string;
  messageType?: string;
}

export default function PDFPreviewModal({
  isOpen,
  onClose,
  message,
  templateUrl,
  templateGradient,
  borderColor,
  accentColor,
  recipientName,
  messageType,
}: PDFPreviewModalProps) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);

  // Preload background when modal opens so PDF export has the image ready
  useEffect(() => {
    if (!isOpen) return;
    if (templateUrl) {
      setBackgroundLoaded(false);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        console.log('✅ PDF modal: background loaded:', templateUrl);
        setBackgroundLoaded(true);
      };
      img.onerror = () => setBackgroundLoaded(false);
      img.src = templateUrl;
    } else {
      setBackgroundLoaded(true);
    }
  }, [isOpen, templateUrl]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!exportRef.current) return;

    setIsExporting(true);
    try {
      const fileName = `rekindle-${messageType || 'message'}-${Date.now()}.pdf`;
      await exportMessageToPDF(exportRef.current, fileName);
      alert('PDF downloaded successfully! ✅');
      onClose();
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header - always visible */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900">Preview PDF</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview - scrollable middle section */}
        <div className="p-6 flex justify-center bg-gray-100 overflow-auto min-h-0 flex-1">
          <div className="shadow-2xl">
            <MessageWithTemplate
              ref={exportRef}
              message={message}
              templateUrl={templateUrl}
              templateGradient={templateGradient}
              borderColor={borderColor}
              accentColor={accentColor}
              recipientName={recipientName}
              messageType={messageType}
            />
          </div>
        </div>

        {/* Footer - always visible */}
        <div className="flex gap-3 p-4 border-t border-gray-200 shrink-0 bg-white">
          <button
            onClick={handleDownload}
            disabled={isExporting || (!!templateUrl && !backgroundLoaded)}
            className="flex-1 px-6 py-3 bg-[#CC4F4E] text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
          >
            {(templateUrl && !backgroundLoaded) ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading template...
              </>
            ) : isExporting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Download PDF
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

