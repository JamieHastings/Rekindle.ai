import { FormData } from '../components/MessageForm';

interface BackendFormData {
  name: string;
  relationshipLength: string;
  tone: string;
  messageType: 'poem' | 'letter' | 'apology' | 'text' | 'giftcard';
  occasion?: string;
  additionalDetails: string;
  characterLength: 'short' | 'medium' | 'long';
}

export function mapFormDataToBackend(formData: FormData): BackendFormData {
  const { messageType } = formData;

  // Map length values
  const lengthMap: Record<string, 'short' | 'medium' | 'long'> = {
    small: 'short',
    medium: 'medium',
    large: 'long',
    short: 'short',
    long: 'long',
  };

  let backendData: BackendFormData;

  switch (messageType) {
    case 'poem':
      backendData = {
        name: formData.loverName || '',
        relationshipLength: 'Not specified',
        tone: formData.poemTone || 'romantic',
        messageType: 'poem',
        occasion: formData.shortDescription || undefined,
        additionalDetails: `Writing a poem for ${formData.loverName}. What happened: ${formData.whatHappened || ''}. ${formData.shortDescription ? `Additional context: ${formData.shortDescription}` : ''}`,
        characterLength: 'medium',
      };
      break;

    case 'apology':
      backendData = {
        name: formData.apologyLoverName || '',
        relationshipLength: 'Not specified',
        tone: formData.apologyTone || 'apologetic',
        messageType: 'apology',
        occasion: undefined,
        additionalDetails: `Significant message from lover: "${formData.significantMessage}". Context: ${formData.apologyDescription || ''}`,
        characterLength: lengthMap[formData.apologyLength || 'medium'],
      };
      break;

    case 'giftcard':
      backendData = {
        name: formData.giftCardLoverName || '',
        relationshipLength: 'Not specified',
        tone: formData.giftCardTone || 'warm',
        messageType: 'giftcard',
        occasion: 'Gift card message',
        additionalDetails: `Writing a gift card message. What happened: ${formData.giftCardWhatHappened || ''}. ${formData.giftCardDescription ? `Additional context: ${formData.giftCardDescription}` : ''}`,
        characterLength: 'medium',
      };
      break;

    case 'text':
      backendData = {
        name: formData.voicenoteLoverName || '',
        relationshipLength: 'Not specified',
        tone: formData.voicenoteTone || 'conversational',
        messageType: 'text',
        occasion: 'Voicenote script',
        additionalDetails: `Creating a voicenote script. Significant message from lover: "${formData.voicenoteSignificantMessage}". Context: ${formData.voicenoteDescription || ''}`,
        characterLength: lengthMap[formData.voicenoteLength || 'medium'],
      };
      break;

    case 'letter':
      backendData = {
        name: formData.recipientName || '',
        relationshipLength: 'Not specified',
        tone: formData.tone || 'warm',
        messageType: 'letter',
        occasion: undefined,
        additionalDetails: `${formData.keyPoints ? `Key points: ${formData.keyPoints}. ` : ''}${formData.additionalDetails || ''}`,
        characterLength: lengthMap[formData.length || 'medium'],
      };
      break;

    default:
      throw new Error(`Unknown message type: ${messageType}`);
  }

  return backendData;
}
