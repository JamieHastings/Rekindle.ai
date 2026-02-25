import { useState, useEffect, useRef } from 'react';
import { Copy, Check, RotateCcw, Loader2, Download, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PDFPreviewModal from './PDFPreviewModal';

interface MessageDisplayProps {
  message: string;
  isGenerating: boolean;
  onRegenerate: () => void;
  hasTokens: boolean;
  error?: string;
  templateUrl?: string;
  templateGradient?: string;
  borderColor?: string;
  accentColor?: string;
  recipientName?: string;
  messageType?: string;
}

export default function MessageDisplay({
  message,
  isGenerating,
  onRegenerate,
  hasTokens,
  error,
  templateUrl,
  templateGradient,
  borderColor,
  accentColor,
  recipientName,
  messageType,
}: MessageDisplayProps) {
  const firstMountRef = useRef(true);
  // #region agent log
  (() => {
    const isFirstMount = firstMountRef.current;
    if (isFirstMount) firstMountRef.current = false;
    fetch('http://127.0.0.1:7242/ingest/b82c46f0-2300-44a2-a8cb-ae7c62dc77a5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MessageDisplay.tsx:render',message:isFirstMount?'H5: First mount props':'MessageDisplay received props',data:{firstMount:isFirstMount,hasMessage:!!message,messageLength:message?.length??0,templateUrl:templateUrl??null,hasTemplateUrl:!!templateUrl,messageType:messageType??null},hypothesisId:'H5',timestamp:Date.now()})}).catch(()=>{});
  })();
  // #endregion
  const [copied, setCopied] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);

  // Preload background image before allowing PDF preview/download
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/b82c46f0-2300-44a2-a8cb-ae7c62dc77a5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MessageDisplay.tsx:useEffect-preload',message:'Preload effect run',data:{templateUrl:templateUrl??null,hasTemplateUrl:!!templateUrl},hypothesisId:'H4',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (templateUrl) {
      setBackgroundLoaded(false);
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b82c46f0-2300-44a2-a8cb-ae7c62dc77a5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MessageDisplay.tsx:image-onload',message:'H5: Background image onload (effect closure)',data:{templateUrl:templateUrl??null},hypothesisId:'H5',timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        console.log('✅ Background loaded:', templateUrl);
        setBackgroundLoaded(true);
      };

      img.onerror = (err) => {
        console.error('❌ Background failed to load:', err);
        setBackgroundLoaded(false);
      };

      img.src = templateUrl;
    } else {
      setBackgroundLoaded(true); // No template, ready to go
    }
  }, [templateUrl]);

  const handleCopy = async () => {
    if (message) {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isGenerating) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center h-full min-h-[400px]"
      >
        <motion.div
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <Loader2 className="w-16 h-16 text-[#CC4F4E]" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl text-text-light mt-4"
        >
          Writing from your heart...
        </motion.p>
        <div className="mt-4 flex items-center gap-2">
          <motion.span
            className="w-2 h-2 bg-[#CC4F4E] rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            className="w-2 h-2 bg-[#CC4F4E] rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
          />
          <motion.span
            className="w-2 h-2 bg-[#CC4F4E] rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
          />
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center h-full min-h-[400px]"
      >
        <div className="max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-xl text-text-dark mb-2">Oops! Something went wrong</p>
          <p className="text-base text-text-light">{error}</p>
        </div>
      </motion.div>
    );
  }

  if (!message) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center h-full min-h-[400px] text-center"
      >
        <div className="max-w-md">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <svg
              className="w-24 h-24 mx-auto mb-6 text-text-light opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
          </motion.div>
          <p className="text-2xl text-text-light mb-4">
            Fill out the form to generate your personalized message
          </p>
          <p className="text-lg text-text-light opacity-70">
            AI will craft a heartfelt message based on your inputs
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="message-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="flex flex-col space-y-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-panel border border-border rounded-lg p-6"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="prose prose-invert max-w-none"
          >
            {message.split('\n').map((paragraph, idx) => (
              <motion.p
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="text-base leading-relaxed mb-3 last:mb-0 text-text-light"
              >
                {paragraph}
              </motion.p>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="flex gap-2"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCopy}
            className="flex-1 px-4 py-3 bg-[#CC4F4E] text-black rounded-lg hover:opacity-90 transition-all shadow-lg font-medium flex items-center justify-center gap-2"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Copied!
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-2"
                >
                  <Copy className="w-5 h-5" />
                  Copy
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {(messageType === 'letter' || messageType === 'love_letter' || messageType === 'giftcard') && (
            <motion.button
              whileHover={backgroundLoaded ? { scale: 1.02 } : {}}
              whileTap={backgroundLoaded ? { scale: 0.98 } : {}}
              onClick={() => backgroundLoaded && setShowPDFPreview(true)}
              disabled={!!templateUrl && !backgroundLoaded}
              className={`px-4 py-3 rounded-lg transition-all shadow-lg font-medium flex items-center justify-center gap-2 ${
                templateUrl && !backgroundLoaded
                  ? 'bg-background border border-border text-text-light cursor-wait opacity-70'
                  : 'bg-background border border-border text-text-light hover:bg-panel disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {templateUrl && !backgroundLoaded ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading template...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Preview / Download PDF
                </>
              )}
            </motion.button>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="flex items-center justify-between p-4 bg-background border border-border rounded-lg"
        >
          <div className="flex items-center gap-3">
            <RotateCcw className="w-5 h-5 text-text-light" />
            <div>
              <p className="text-sm font-medium text-text-dark">Need changes?</p>
              <p className="text-xs text-text-light">Costs 2 tokens to regenerate</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRegenerate}
            disabled={!hasTokens}
            className="px-4 py-2 bg-[#CC4F4E] text-black rounded-lg hover:opacity-90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Regenerate
          </motion.button>
        </motion.div>

        {/* PDF Preview Modal - only for letter and giftcard */}
        {(messageType === 'letter' || messageType === 'love_letter' || messageType === 'giftcard') && (
          <PDFPreviewModal
            isOpen={showPDFPreview}
            onClose={() => setShowPDFPreview(false)}
            message={message}
            templateUrl={templateUrl}
            templateGradient={templateGradient}
            borderColor={borderColor}
            accentColor={accentColor}
            recipientName={recipientName}
            messageType={messageType}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
