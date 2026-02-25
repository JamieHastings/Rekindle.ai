import { forwardRef } from 'react';

interface MessageWithTemplateProps {
  message: string;
  templateUrl?: string;
  templateGradient?: string;
  borderColor?: string;
  accentColor?: string;
  recipientName?: string;
  messageType?: string;
}

const MessageWithTemplate = forwardRef<HTMLDivElement, MessageWithTemplateProps>(
  ({ message, templateUrl, templateGradient, borderColor, accentColor, recipientName, messageType }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          width: '794px',
          minHeight: '1123px',
          position: 'relative',
          backgroundColor: 'white',
        }}
      >
        {/* Background image as actual img element (works better with html2canvas) */}
        {templateUrl && (
          <img
            src={templateUrl}
            alt="Template background"
            crossOrigin="anonymous"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: 0,
            }}
          />
        )}
        
        {/* Overlay for better text readability */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          zIndex: 1,
        }} />
        
        {/* Content container */}
        <div style={{
          position: 'relative',
          zIndex: 10,
          padding: '60px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{
              fontSize: '36px',
              fontFamily: "'Playfair Display', serif",
              fontWeight: 'bold',
              marginBottom: '10px',
              color: '#DC2626',
            }}>
              {messageType === 'love_letter' && 'A Love Letter'}
              {messageType === 'letter' && 'A Love Letter'}
              {messageType === 'poem' && 'A Poem for You'}
              {messageType === 'apology' && 'An Apology'}
              {messageType === 'text' && 'A Voicenote Script'}
              {messageType === 'giftcard' && 'Gift Card Message'}
              {!messageType && 'A Special Message'}
            </h1>
            {recipientName && (
              <p style={{
                fontSize: '20px',
                color: '#4B5563',
                fontStyle: 'italic',
              }}>
                For {recipientName}
              </p>
            )}
          </div>

          {/* Decorative line */}
          <div style={{
            width: '100px',
            height: '3px',
            backgroundColor: '#FCA5A5',
            margin: '0 auto 30px auto',
          }} />

          {/* Message content */}
          <div style={{ flex: 1, marginBottom: '30px' }}>
            <div style={{
              fontSize: '18px',
              color: '#1F2937',
              lineHeight: '1.75',
              whiteSpace: 'pre-wrap',
              fontFamily: "'Crimson Text', serif",
              textAlign: 'justify',
            }}>
              {message}
            </div>
          </div>

          {/* Footer decorative line */}
          <div style={{
            width: '100px',
            height: '3px',
            backgroundColor: '#FCA5A5',
            margin: '30px auto 0 auto',
          }} />

          {/* Branding footer */}
          <div style={{
            textAlign: 'center',
            marginTop: '30px',
            fontSize: '14px',
            color: '#9CA3AF',
          }}>
            Created with ❤️ by Rekindle.ai
          </div>
        </div>
      </div>
    );
  }
);

MessageWithTemplate.displayName = 'MessageWithTemplate';

export default MessageWithTemplate;
