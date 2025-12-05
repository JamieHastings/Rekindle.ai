import { FormData } from '../components/MessageForm';

interface BackendFormData {
  name: string;
  relationshipLength: string;
  tone: string;
  messageType: 'apology' | 'rekindling' | 'birthday' | 'support' | 'closure';
  occasion?: string;
  additionalDetails: string;
  characterLength: 'short' | 'medium' | 'long';
}

export function mapFormDataToBackend(formData: FormData): BackendFormData {
  const { messageType } = formData;

  // Map old message types to new backend types
  const messageTypeMap: Record<string, 'apology' | 'rekindling' | 'birthday' | 'support' | 'closure'> = {
    poem: 'rekindling',
    letter: 'birthday',
    apology: 'apology',
    text: 'support',
    giftcard: 'rekindling',
  };

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
        messageType: messageTypeMap[messageType],
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
        messageType: messageTypeMap[messageType],
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
        messageType: messageTypeMap[messageType],
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
        messageType: messageTypeMap[messageType],
        occasion: 'Voicenote script',
        additionalDetails: `Creating a voicenote script. Significant message from lover: "${formData.voicenoteSignificantMessage}". Context: ${formData.voicenoteDescription || ''}`,
        characterLength: lengthMap[formData.voicenoteLength || 'medium'],
      };
      break;

    case 'letter':
      backendData = {
        name: formData.recipientName || '',
        relationshipLength: formData.relationship || 'Not specified',
        tone: formData.tone || 'warm',
        messageType: messageTypeMap[messageType],
        occasion: formData.occasion,
        additionalDetails: `${formData.keyPoints ? `Key points: ${formData.keyPoints}. ` : ''}${formData.additionalDetails || ''}`,
        characterLength: lengthMap[formData.length || 'medium'],
      };
      break;

    default:
      throw new Error(`Unknown message type: ${messageType}`);
  }

  return backendData;
}
