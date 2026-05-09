import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Dropdown from './Dropdown';
import GiftCardTemplateSelector from './GiftCardTemplateSelector';
import { FEATURES } from '../config/features';

interface MessageFormProps {
  onGenerate: (formData: FormData) => void;
  isGenerating: boolean;
  onMessageTypeSelect?: (selected: boolean) => void;
}

export interface FormData {
  messageType: string;
  // Fields that will be mapped to backend
  name?: string;
  relationshipLength?: string;
  tone?: string;
  occasion?: string;
  additionalDetails?: string;
  characterLength?: string;
  relationshipStatus?: string;
  // Poem fields
  loverName?: string;
  yourName?: string;
  whatHappened?: string;
  poemTone?: string;
  shortDescription?: string;
  // Apology Message fields
  apologyLoverName?: string;
  significantMessage?: string;
  apologyLength?: string;
  apologyTone?: string;
  apologyDescription?: string;
  // Gift Card fields
  giftCardLoverName?: string;
  giftCardYourName?: string;
  giftCardWhatHappened?: string;
  giftCardTone?: string;
  giftCardDescription?: string;
  giftCardTemplate?: string;
  // Voicenote Script fields
  voicenoteLoverName?: string;
  voicenoteSignificantMessage?: string;
  voicenoteLength?: string;
  voicenoteTone?: string;
  voicenoteDescription?: string;
  // Letter fields
  recipientName?: string;
  relationship?: string;
  length?: string;
  keyPoints?: string;
}

const poemToneOptions = [
  { value: 'romantic', label: 'Romantic' },
  { value: 'heartfelt', label: 'Heartfelt' },
  { value: 'apologetic', label: 'Apologetic' },
  { value: 'playful', label: 'Playful' },
  { value: 'sincere', label: 'Sincere' },
];

const apologyToneOptions = [
  { value: 'sincere', label: 'Sincere' },
  { value: 'heartfelt', label: 'Heartfelt' },
  { value: 'apologetic', label: 'Apologetic' },
  { value: 'remorseful', label: 'Remorseful' },
];

const lengthOptions = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

const giftCardToneOptions = [
  { value: 'warm', label: 'Warm' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'heartfelt', label: 'Heartfelt' },
  { value: 'playful', label: 'Playful' },
  { value: 'sincere', label: 'Sincere' },
];

const voicenoteToneOptions = [
  { value: 'conversational', label: 'Conversational' },
  { value: 'sincere', label: 'Sincere' },
  { value: 'heartfelt', label: 'Heartfelt' },
  { value: 'casual', label: 'Casual' },
];

const letterToneOptions = [
  { value: 'warm', label: 'Warm & Friendly' },
  { value: 'formal', label: 'Formal & Professional' },
  { value: 'heartfelt', label: 'Heartfelt & Emotional' },
  { value: 'playful', label: 'Playful & Fun' },
  { value: 'sincere', label: 'Sincere & Honest' },
];

const letterLengthOptions = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
];

const relationshipStatusOptions = [
  { value: 'broken up', label: 'Broken Up' },
  { value: 'toxic', label: 'Toxic' },
  { value: 'unsure', label: 'Unsure' },
];

const getMessageTypeLabel = (messageType: string): string => {
  const typeMap: Record<string, string> = {
    poem: 'Poem',
    letter: 'Love Letter',
    apology: 'Apology Message',
    text: 'Voicenote Script',
    giftcard: 'Gift Card',
  };
  return typeMap[messageType] || messageType;
};

export default function MessageForm({ onGenerate, isGenerating, onMessageTypeSelect }: MessageFormProps) {
  const [messageTypeSelected, setMessageTypeSelected] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    messageType: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(formData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleDropdownChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const handleMessageTypeSelect = (type: string) => {
    setFormData({ messageType: type });
    setMessageTypeSelected(true);
    onMessageTypeSelect?.(true);
  };

  const handleBackToSelection = () => {
    setMessageTypeSelected(false);
    setFormData({ messageType: '' });
    onMessageTypeSelect?.(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AnimatePresence mode="wait">
        {!messageTypeSelected ? (
          <>
            <label className="block text-base font-medium text-text-dark mb-2">
              Message Type
            </label>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'poem', label: 'Poem' },
                { value: 'letter', label: 'Love Letter' },
                { value: 'apology', label: 'Apology Message' },
                ...(FEATURES.VOICENOTE_MESSAGE
                  ? [{ value: 'text' as const, label: 'Voicenote scripts' }]
                  : []),
                ...(FEATURES.GIFT_CARD_MESSAGE
                  ? [{ value: 'giftcard' as const, label: 'Gift Cards' }]
                  : []),
              ].map((type) => (
                <motion.button
                  key={type.value}
                  type="button"
                  onClick={() => handleMessageTypeSelect(type.value)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 rounded-lg transition-all bg-background border border-border text-text-light hover:border-[#CC4F4E] hover:bg-panel"
                >
                  {type.label}
                </motion.button>
              ))}
            </div>
          </>
        ) : (
          <motion.div
            key="message-form"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
          <div className="flex items-center gap-2 mb-4">
            <button
              type="button"
              onClick={handleBackToSelection}
              className="text-text-light hover:text-text-dark transition-colors text-sm"
            >
              ← Back to Message Types
            </button>
          </div>

          {/* Message Type Title */}
          <h2 className="text-2xl font-bold text-text-dark mb-6">
            {getMessageTypeLabel(formData.messageType)}
          </h2>

          {/* Poem Fields */}
          {formData.messageType === 'poem' && (
            <div className="space-y-4">
              <Dropdown
                label="Relationship Status"
                options={relationshipStatusOptions}
                value={formData.relationshipStatus || ''}
                onChange={(value) => handleDropdownChange('relationshipStatus', value)}
                required
              />
              <div>
                <label htmlFor="loverName" className="block text-base font-medium text-text-dark mb-2">
                  Lover's Name
                </label>
                <input
                  type="text"
                  id="loverName"
                  name="loverName"
                  value={formData.loverName || ''}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-light focus:outline-none focus:ring-2 focus:ring-[#CC4F4E]"
                  placeholder="e.g., Sarah"
                />
              </div>

              <div>
                <label htmlFor="yourName" className="block text-base font-medium text-text-dark mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  id="yourName"
                  name="yourName"
                  value={formData.yourName || ''}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-light focus:outline-none focus:ring-2 focus:ring-[#CC4F4E]"
                  placeholder="e.g., John"
                />
              </div>

              <div>
                <label htmlFor="whatHappened" className="block text-base font-medium text-text-dark mb-2">
                  What happened / What did you do wrong?
                </label>
                <textarea
                  id="whatHappened"
                  name="whatHappened"
                  value={formData.whatHappened || ''}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-light focus:outline-none focus:ring-2 focus:ring-[#CC4F4E] resize-none"
                  placeholder="Describe what happened..."
                />
              </div>

              <Dropdown
                label="Tone of Poem"
                options={poemToneOptions}
                value={formData.poemTone || 'romantic'}
                onChange={(value) => handleDropdownChange('poemTone', value)}
                required
              />

              <div>
                <label htmlFor="shortDescription" className="block text-base font-medium text-text-dark mb-2">
                  Short Description (Optional)
                </label>
                <textarea
                  id="shortDescription"
                  name="shortDescription"
                  value={formData.shortDescription || ''}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-light focus:outline-none focus:ring-2 focus:ring-[#CC4F4E] resize-none"
                  placeholder="Any additional context..."
                />
              </div>
            </div>
          )}

          {/* Apology Message Fields */}
          {formData.messageType === 'apology' && (
            <div className="space-y-4">
              <Dropdown
                label="Relationship Status"
                options={relationshipStatusOptions}
                value={formData.relationshipStatus || ''}
                onChange={(value) => handleDropdownChange('relationshipStatus', value)}
                required
              />
              <div>
                <label htmlFor="apologyLoverName" className="block text-base font-medium text-text-dark mb-2">
                  Lover's Name
                </label>
                <input
                  type="text"
                  id="apologyLoverName"
                  name="apologyLoverName"
                  value={formData.apologyLoverName || ''}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-light focus:outline-none focus:ring-2 focus:ring-[#CC4F4E]"
                  placeholder="e.g., Sarah"
                />
              </div>

              <div>
                <label htmlFor="significantMessage" className="block text-base font-medium text-text-dark mb-2">
                  Significant Message from Lover
                </label>
                <textarea
                  id="significantMessage"
                  name="significantMessage"
                  value={formData.significantMessage || ''}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-light focus:outline-none focus:ring-2 focus:ring-[#CC4F4E] resize-none"
                  placeholder="What did your lover say that was significant?"
                />
              </div>

              <Dropdown
                label="Length"
                options={lengthOptions}
                value={formData.apologyLength || 'medium'}
                onChange={(value) => handleDropdownChange('apologyLength', value)}
                required
              />

              <Dropdown
                label="Tone"
                options={apologyToneOptions}
                value={formData.apologyTone || 'sincere'}
                onChange={(value) => handleDropdownChange('apologyTone', value)}
                required
              />

              <div>
                <label htmlFor="apologyDescription" className="block text-base font-medium text-text-dark mb-2">
                  Short Description
                </label>
                <textarea
                  id="apologyDescription"
                  name="apologyDescription"
                  value={formData.apologyDescription || ''}
                  onChange={handleChange}
                  required
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-light focus:outline-none focus:ring-2 focus:ring-[#CC4F4E] resize-none"
                  placeholder="Brief description of the situation..."
                />
              </div>
            </div>
          )}

          {/* Gift Card Fields */}
          {formData.messageType === 'giftcard' && (
            <div className="space-y-4">
              <Dropdown
                label="Relationship Status"
                options={relationshipStatusOptions}
                value={formData.relationshipStatus || ''}
                onChange={(value) => handleDropdownChange('relationshipStatus', value)}
                required
              />

              {FEATURES.DESIGN_TEMPLATES && (
                <GiftCardTemplateSelector
                  onTemplateSelect={(template) => handleDropdownChange('giftCardTemplate', template)}
                  selectedTemplate={formData.giftCardTemplate || ''}
                  category="gift_card"
                />
              )}

              <div>
                <label htmlFor="giftCardLoverName" className="block text-base font-medium text-text-dark mb-2">
                  Lover's Name
                </label>
                <input
                  type="text"
                  id="giftCardLoverName"
                  name="giftCardLoverName"
                  value={formData.giftCardLoverName || ''}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-light focus:outline-none focus:ring-2 focus:ring-[#CC4F4E]"
                  placeholder="e.g., Sarah"
                />
              </div>

              <div>
                <label htmlFor="giftCardYourName" className="block text-base font-medium text-text-dark mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  id="giftCardYourName"
                  name="giftCardYourName"
                  value={formData.giftCardYourName || ''}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-light focus:outline-none focus:ring-2 focus:ring-[#CC4F4E]"
                  placeholder="e.g., John"
                />
              </div>

              <div>
                <label htmlFor="giftCardWhatHappened" className="block text-base font-medium text-text-dark mb-2">
                  What happened / What did you do wrong?
                </label>
                <textarea
                  id="giftCardWhatHappened"
                  name="giftCardWhatHappened"
                  value={formData.giftCardWhatHappened || ''}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-light focus:outline-none focus:ring-2 focus:ring-[#CC4F4E] resize-none"
                  placeholder="Describe what happened..."
                />
              </div>

              <Dropdown
                label="Tone"
                options={giftCardToneOptions}
                value={formData.giftCardTone || 'warm'}
                onChange={(value) => handleDropdownChange('giftCardTone', value)}
                required
              />

              <div>
                <label htmlFor="giftCardDescription" className="block text-base font-medium text-text-dark mb-2">
                  Short Description (Optional)
                </label>
                <textarea
                  id="giftCardDescription"
                  name="giftCardDescription"
                  value={formData.giftCardDescription || ''}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-light focus:outline-none focus:ring-2 focus:ring-[#CC4F4E] resize-none"
                  placeholder="Any additional context..."
                />
              </div>
            </div>
          )}

          {/* Voicenote Script Fields */}
          {formData.messageType === 'text' && (
            <div className="space-y-4">
              <Dropdown
                label="Relationship Status"
                options={relationshipStatusOptions}
                value={formData.relationshipStatus || ''}
                onChange={(value) => handleDropdownChange('relationshipStatus', value)}
                required
              />
              <div>
                <label htmlFor="voicenoteLoverName" className="block text-base font-medium text-text-dark mb-2">
                  Lover's Name
                </label>
                <input
                  type="text"
                  id="voicenoteLoverName"
                  name="voicenoteLoverName"
                  value={formData.voicenoteLoverName || ''}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-light focus:outline-none focus:ring-2 focus:ring-[#CC4F4E]"
                  placeholder="e.g., Sarah"
                />
              </div>

              <div>
                <label htmlFor="voicenoteSignificantMessage" className="block text-base font-medium text-text-dark mb-2">
                  Significant Message from Lover
                </label>
                <textarea
                  id="voicenoteSignificantMessage"
                  name="voicenoteSignificantMessage"
                  value={formData.voicenoteSignificantMessage || ''}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-light focus:outline-none focus:ring-2 focus:ring-[#CC4F4E] resize-none"
                  placeholder="What did your lover say that was significant?"
                />
              </div>

              <Dropdown
                label="Length"
                options={lengthOptions}
                value={formData.voicenoteLength || 'medium'}
                onChange={(value) => handleDropdownChange('voicenoteLength', value)}
                required
              />

              <Dropdown
                label="Tone"
                options={voicenoteToneOptions}
                value={formData.voicenoteTone || 'conversational'}
                onChange={(value) => handleDropdownChange('voicenoteTone', value)}
                required
              />

              <div>
                <label htmlFor="voicenoteDescription" className="block text-base font-medium text-text-dark mb-2">
                  Short Description
                </label>
                <textarea
                  id="voicenoteDescription"
                  name="voicenoteDescription"
                  value={formData.voicenoteDescription || ''}
                  onChange={handleChange}
                  required
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-light focus:outline-none focus:ring-2 focus:ring-[#CC4F4E] resize-none"
                  placeholder="Brief description of what you want to say..."
                />
              </div>
            </div>
          )}

          {/* Letter Fields */}
          {formData.messageType === 'letter' && (
            <div className="space-y-4">
              <Dropdown
                label="Relationship Status"
                options={relationshipStatusOptions}
                value={formData.relationshipStatus || ''}
                onChange={(value) => handleDropdownChange('relationshipStatus', value)}
                required
              />

              {FEATURES.DESIGN_TEMPLATES && (
                <GiftCardTemplateSelector
                  onTemplateSelect={(template) => handleDropdownChange('giftCardTemplate', template)}
                  selectedTemplate={formData.giftCardTemplate || ''}
                  category="love_letter"
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="recipientName" className="block text-base font-medium text-text-dark mb-2">
                    Recipient Name
                  </label>
                  <input
                    type="text"
                    id="recipientName"
                    name="recipientName"
                    value={formData.recipientName || ''}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-light focus:outline-none focus:ring-2 focus:ring-[#CC4F4E]"
                    placeholder="e.g., Sarah"
                  />
                </div>

                <div>
                  <label htmlFor="yourName" className="block text-base font-medium text-text-dark mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    id="yourName"
                    name="yourName"
                    value={formData.yourName || ''}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-light focus:outline-none focus:ring-2 focus:ring-[#CC4F4E]"
                    placeholder="e.g., John"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Dropdown
                  label="Tone"
                  options={letterToneOptions}
                  value={formData.tone || 'warm'}
                  onChange={(value) => handleDropdownChange('tone', value)}
                  required
                />

                <Dropdown
                  label="Length"
                  options={letterLengthOptions}
                  value={formData.length || 'medium'}
                  onChange={(value) => handleDropdownChange('length', value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="keyPoints" className="block text-base font-medium text-text-dark mb-2">
                  Key Points to Include
                </label>
                <textarea
                  id="keyPoints"
                  name="keyPoints"
                  value={formData.keyPoints || ''}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-light focus:outline-none focus:ring-2 focus:ring-[#CC4F4E] resize-none"
                  placeholder="What do you want to say? (e.g., Thank them for always being there)"
                />
              </div>

              <div>
                <label htmlFor="additionalDetails" className="block text-base font-medium text-text-dark mb-2">
                  Additional Details (Optional)
                </label>
                <textarea
                  id="additionalDetails"
                  name="additionalDetails"
                  value={formData.additionalDetails || ''}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-light focus:outline-none focus:ring-2 focus:ring-[#CC4F4E] resize-none"
                  placeholder="Any other context or specific memories to mention..."
                />
              </div>
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isGenerating}
            className="w-full px-6 py-3 bg-[#CC4F4E] text-black rounded-lg hover:opacity-90 transition-all shadow-lg hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Message'
            )}
          </motion.button>
        </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
