import { motion } from 'framer-motion';
import { Lock, Sparkles } from 'lucide-react';

interface PreviewMessageDisplayProps {
  partialContent: string;
  onUnlockClick: () => void;
  remainingPreviews: number;
}

export default function PreviewMessageDisplay({
  partialContent,
  onUnlockClick,
  remainingPreviews,
}: PreviewMessageDisplayProps) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="relative flex-1 bg-panel border border-border rounded-lg p-6 mb-4 overflow-hidden">
        <div className="absolute top-4 right-4 z-10">
          <span className="px-3 py-1 bg-[#CC4F4E] bg-opacity-90 text-white text-sm font-medium rounded-full flex items-center gap-2">
            <Lock className="w-3 h-3" />
            Preview Mode
          </span>
        </div>

        <div className="relative">
          <p className="text-text-dark leading-relaxed whitespace-pre-wrap mb-8">
            {partialContent}
          </p>

          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-panel via-panel to-transparent pointer-events-none" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-panel border-t border-border p-6">
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-[#CC4F4E]" />
              <p className="text-text-dark font-semibold">Want to see the full message?</p>
            </div>
            <p className="text-text-light text-sm">
              Sign up now and get <span className="text-[#CC4F4E] font-semibold">5 free tokens</span> to unlock this message!
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onUnlockClick}
            className="w-full px-6 py-4 bg-[#CC4F4E] text-black rounded-lg hover:opacity-90 transition-all shadow-lg hover:shadow-xl font-medium text-lg flex items-center justify-center gap-2"
          >
            <Lock className="w-5 h-5" />
            Unlock Full Message + Get 5 Free Tokens
          </motion.button>

          {remainingPreviews > 0 && (
            <p className="text-center text-text-light text-sm mt-3">
              {remainingPreviews} preview{remainingPreviews !== 1 ? 's' : ''} remaining
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
