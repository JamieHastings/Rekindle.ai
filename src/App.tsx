import { useState, useEffect, useRef } from 'react';
import { Coins, LogOut, LayoutDashboard, Home as HomeIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MessageForm, { FormData } from './components/MessageForm';
import MessageDisplay from './components/MessageDisplay';
import AuthModal from './components/AuthModal';
import TokenPurchaseModal from './components/TokenPurchaseModal';
import GiftCardTemplateSelector from './components/GiftCardTemplateSelector';
import GiftCardEmailModal from './components/GiftCardEmailModal';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import { useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';
import { SessionManager, MAX_PREVIEWS } from './utils/sessionManager';
import { PreviewService } from './services/previewService';
import PreviewMessageDisplay from './components/PreviewMessageDisplay';
import UnlockPreviewModal from './components/UnlockPreviewModal';
import { getTokenCost } from './services/tokenService';
import { generateMessage } from './services/messageGenerator';
import PaymentModal from './components/PaymentModal';
import ErrorBoundary from './components/ErrorBoundary';
import { FEATURES } from './config/features';

type View = 'home' | 'generator' | 'dashboard' | 'admin';

function App() {
  const { user, profile, signOut, refreshProfile, loading } = useAuth();
  const [currentView, setCurrentView] = useState<View>('home');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [error, setError] = useState('');
  const [currentFormData, setCurrentFormData] = useState<FormData | null>(null);
  const [showGiftCardTemplate, setShowGiftCardTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedTemplateUrl, setSelectedTemplateUrl] = useState<string>('');
  const [selectedTemplateData, setSelectedTemplateData] = useState<{
    url?: string;
    gradient?: string;
    borderColor?: string;
    accentColor?: string;
  } | null>(null);
  const [showGiftCardEmail, setShowGiftCardEmail] = useState(false);
  const [messageTypeSelected, setMessageTypeSelected] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewId, setPreviewId] = useState<string>('');
  /** Id of the generated_messages row for the current preview (so unlock can update it with full content instead of inserting a duplicate). */
  const [previewGeneratedMessageId, setPreviewGeneratedMessageId] = useState<string | null>(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [remainingPreviews, setRemainingPreviews] = useState(3);
  const [lastGeneratedMessageId, setLastGeneratedMessageId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // H2/H5 fix: ref holds template URL from same tick as generation so first render after setGeneratedMessage has it even if state hasn't flushed
  const templateUrlRef = useRef<string>('');
  const templateDataRef = useRef<{ gradient?: string; borderColor?: string; accentColor?: string } | null>(null);
  /** Full preview message (so unlock modal can show full content after sign-up instead of partial). */
  const fullPreviewMessageRef = useRef<string | null>(null);

  // Refresh profile when user logs in
  useEffect(() => {
    if (user && !profile && !loading) {
      console.log('User logged in but profile missing, refreshing...');
      refreshProfile();
    }
  }, [user, profile, loading, refreshProfile]);


  // Handle admin navigation - ensure profile is loaded and user is admin
  useEffect(() => {
    // Only run this effect when we're on an admin route (not regular dashboard)
    if (user && currentView === 'admin') {
      console.log('Admin route effect triggered', { 
        hasUser: !!user, 
        hasProfile: !!profile, 
        loading, 
        currentView
      });
      
      // If profile is not loaded and we're not currently loading, try to load it
      if (!profile && !loading) {
        console.log('Profile not loaded, attempting refresh...');
        refreshProfile().catch(err => {
          console.error('Failed to refresh profile:', err);
        });
      }
      
      // If profile is loaded, check admin status and redirect if not admin
      if (profile && !loading) {
        const checkIsAdmin = Boolean(profile.is_admin);
        
        if (!checkIsAdmin && currentView === 'admin') {
          console.log('User is not admin, redirecting to home');
          setCurrentView('home');
        }
      }
    }
  }, [user, profile, loading, currentView, refreshProfile]);

  // Auto-navigate admin users to admin dashboard after login (optional - can be removed if not desired)
  // This effect is commented out to allow manual navigation, but can be enabled if auto-navigation is desired
  // useEffect(() => {
  //   const isAdmin = profile && (profile.is_admin === true || profile.is_admin === 1 || profile.is_admin === 'true');
  //   if (user && profile && isAdmin && currentView !== 'admin' && currentView !== 'dashboard' && !loading) {
  //     console.log('Admin user detected, navigating to admin dashboard...', {
  //       user: !!user,
  //       hasProfile: !!profile,
  //       isAdmin: profile.is_admin,
  //       isAdminType: typeof profile.is_admin,
  //       currentView,
  //       loading
  //     });
  //     setCurrentView('admin'); // Use 'admin' view for consistency
  //   }
  // }, [user, profile, loading, currentView]);

  // Reset view when user logs out (but allow anonymous users to use generator)
  // Role-based route protection and view management
  useEffect(() => {
    // Redirect non-admin users away from admin routes
    if (user && profile && !loading && currentView === 'admin') {
      const isAdmin = Boolean(profile.is_admin);
      if (!isAdmin) {
        console.warn('Non-admin user attempted to access admin route, redirecting...');
        setCurrentView('home');
      }
    }
    
    // Redirect to home if user logs out from protected views
    if (!user && !loading && (currentView === 'dashboard' || currentView === 'admin')) {
      console.log('User logged out from protected view, resetting to home');
      setCurrentView('home');
      setShowAuthModal(false);
    }
    
    // Keep generator view when user signs up with generated message
    if (user && generatedMessage && currentView === 'generator') {
      console.log('User signed up with generated message - keeping on generator view');
      setMessageTypeSelected(true);
      setIsPreviewMode(false);
    }
  }, [user, profile, loading, currentView, generatedMessage]);

  // Debug logging
  useEffect(() => {
    console.log('App state:', { 
      hasUser: !!user, 
      hasProfile: !!profile, 
      isAdmin: profile?.is_admin,
      isAdminType: typeof profile?.is_admin,
      isAdminValue: profile?.is_admin,
      loading,
      currentView 
    });
    
    // Additional check for admin
    if (user && profile) {
      console.log('User and profile exist:', {
        userId: user.id,
        profileId: profile.id,
        isAdmin: profile.is_admin,
        isAdminStrict: profile.is_admin === true,
        profileKeys: Object.keys(profile)
      });
    }
  }, [user, profile, loading, currentView]);

  // Add this new useEffect to handle post-signup state
  useEffect(() => {
    // When user signs up and has a message, keep it visible
    if (user && profile && generatedMessage && currentView === 'generator') {
      console.log('📝 User authenticated with message - ensuring visibility');
      setMessageTypeSelected(true);
      setIsPreviewMode(false);
      setShowUnlockModal(false); // Close unlock modal if still open
    }
  }, [user, profile, generatedMessage, currentView]);

  const handleGenerate = async (formData: FormData) => {
    if (!user) {
      const session = SessionManager.getOrCreateSession();
      console.log('🔍 Anonymous user preview check:', {
        sessionId: session.id,
        previewCount: session.previewCount,
        canGeneratePreview: session.canGeneratePreview,
        maxPreviews: MAX_PREVIEWS,
      });

      if (!session.canGeneratePreview) {
        console.log('⚠️ Preview limit reached');
        setError(`You've used all ${MAX_PREVIEWS} free previews. Please sign up to continue generating messages!`);
        return;
      }

      console.log('✅ Preview generation allowed, proceeding...');

      setCurrentFormData(formData);
      setIsGenerating(true);
      setGeneratedMessage('');
      setError('');
      setIsPreviewMode(true);

      try {
        console.log('🔄 Starting preview generation for anonymous user');
        console.log('📝 Message type:', formData.messageType);

        const preview = await PreviewService.generatePreview(formData);
        console.log('✅ Preview generated successfully');

        // Anonymous session ID for linking on signup
        const anonymousSessionId = localStorage.getItem('anonymous_session_id') || crypto.randomUUID();
        if (!localStorage.getItem('anonymous_session_id')) {
          localStorage.setItem('anonymous_session_id', anonymousSessionId);
          console.log('🆔 Created anonymous session:', anonymousSessionId);
        }

        const { data: savedMessage, error: saveError } = await supabase
          .from('generated_messages')
          .insert({
            user_id: null,
            message_type: formData.messageType,
            input_data: {
              name: formData.loverName || formData.recipientName || formData.apologyLoverName || formData.voicenoteLoverName || formData.giftCardLoverName || '',
              tone: formData.tone || formData.poemTone || formData.apologyTone || formData.voicenoteTone || formData.giftCardTone || 'heartfelt',
              relationshipLength: formData.relationshipLength || '',
              additionalDetails: formData.additionalDetails || formData.whatHappened || formData.significantMessage || formData.voicenoteSignificantMessage || formData.giftCardWhatHappened || '',
              occasion: formData.occasion || '',
              anonymous_session_id: anonymousSessionId,
            },
            tone: formData.tone || formData.poemTone || formData.apologyTone || formData.voicenoteTone || formData.giftCardTone || 'heartfelt',
            character_length: formData.length || formData.characterLength || formData.apologyLength || formData.voicenoteLength || 'medium',
            generated_content: preview.fullMessage,
            is_preview: true,
            status: 'completed',
          })
          .select()
          .single();

        if (saveError) {
          console.error('❌ Error saving anonymous message:', saveError);
          setPreviewId(preview.previewId || '');
          setPreviewGeneratedMessageId(null);
        } else {
          console.log('✅ Anonymous message saved to database:', savedMessage?.id);
          setPreviewId(preview.previewId || savedMessage?.id || '');
          setPreviewGeneratedMessageId(savedMessage?.id ?? null);
        }

        fullPreviewMessageRef.current = preview.fullMessage;
        setGeneratedMessage(preview.partialContent);
        setRemainingPreviews(preview.remainingPreviews);
        console.log('✅ Preview displayed to user');
      } catch (err) {
        console.error('❌ Error generating preview:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate preview';

        if (errorMessage.includes('OpenAI API key') || errorMessage.includes('VITE_OPENAI_API_KEY')) {
          setError('OpenAI API key is missing. Please add VITE_OPENAI_API_KEY to .env.local file and restart the dev server.');
        } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
          setError('Invalid OpenAI API key. Please check your .env.local file.');
        } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
          setError('OpenAI rate limit exceeded. Please try again later.');
        } else if (errorMessage.includes('quota')) {
          setError('OpenAI account has insufficient quota. Please check your billing.');
        } else if (errorMessage.includes('Preview limit reached')) {
          setError(`You've used all ${MAX_PREVIEWS} free previews. Please sign up to continue generating messages!`);
        } else {
          setError(`Failed to generate preview: ${errorMessage}. Please try again.`);
        }
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    // Check if user has enough tokens (costs vary by type: 6 for letter/gift card, 4 for poem/apology/voicenote, etc.)
    const tokenCost = getTokenCost(formData.messageType);
    if (!profile || profile.tokens < tokenCost) {
      setShowTokenModal(true);
      return;
    }

    setCurrentFormData(formData);
    setIsGenerating(true);
    setGeneratedMessage('');
    setError('');
    setShowGiftCardTemplate(false);
    setIsPreviewMode(false);

    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b82c46f0-2300-44a2-a8cb-ae7c62dc77a5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:handleGenerate-start',message:'Generation flow started',data:{messageType:formData.messageType},hypothesisId:'H1',timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      templateUrlRef.current = '';
      templateDataRef.current = null;
      console.log('📝 Generating message for authenticated user');
      console.log('  - Message type:', formData.messageType);
      console.log('  - User ID:', user.id);
      console.log('  - Token cost:', tokenCost);
      console.log('  - Current tokens:', profile.tokens);

      // Get fresh session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Session error:', sessionError);
        throw new Error('Authentication session expired. Please sign in again.');
      }
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b82c46f0-2300-44a2-a8cb-ae7c62dc77a5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:after-session',message:'Session obtained',data:{},hypothesisId:'H2',timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      console.log('✅ Valid session obtained');

      // Prepare prompt data
      const promptData: any = {
        name: formData.loverName || formData.recipientName || formData.apologyLoverName || formData.voicenoteLoverName || formData.giftCardLoverName || '',
        tone: formData.tone || formData.poemTone || formData.apologyTone || formData.voicenoteTone || formData.giftCardTone || 'heartfelt',
        relationshipLength: formData.relationshipLength || '',
        additionalDetails: formData.additionalDetails || formData.whatHappened || formData.significantMessage || formData.voicenoteSignificantMessage || formData.giftCardWhatHappened || '',
      };

      if (formData.occasion) {
        promptData.occasion = formData.occasion;
      }

      if (formData.characterLength || formData.length || formData.apologyLength || formData.voicenoteLength) {
        promptData.characterLength = formData.characterLength || formData.length || formData.apologyLength || formData.voicenoteLength || 'medium';
      }

      // Letter-specific: so promptEngine gets recipient_name and your_name for the love letter template
      if (formData.messageType === 'letter') {
        promptData.recipientName = formData.recipientName ?? '';
        promptData.yourName = formData.yourName ?? '';
        promptData.length = formData.length ?? promptData.characterLength ?? 'medium';
        promptData.keyPoints = formData.keyPoints ?? '';
      }

      // Apology-specific: so promptEngine gets lover_name and context for the apology template (no placeholders)
      if (formData.messageType === 'apology') {
        promptData.apologyLoverName = formData.apologyLoverName ?? '';
        promptData.significantMessage = formData.significantMessage ?? '';
        promptData.apologyLength = formData.apologyLength ?? promptData.characterLength ?? 'medium';
        promptData.apologyTone = formData.apologyTone ?? 'sincere';
        promptData.apologyDescription = formData.apologyDescription ?? '';
      }

      // Check if a template is selected (for letter type with template selector)
      let templateId: string | undefined;
      let templateUrl: string | undefined;

      // For letter or giftcard, check if template is selected via GiftCardTemplateSelector
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b82c46f0-2300-44a2-a8cb-ae7c62dc77a5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:template-branch',message:'Template branch check',data:{messageType:formData.messageType,giftCardTemplate:formData.giftCardTemplate ?? null,willEnterBranch:!!((formData.messageType==='letter'||formData.messageType==='giftcard')&&formData.giftCardTemplate)},hypothesisId:'H1',timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if ((formData.messageType === 'letter' || formData.messageType === 'giftcard') && formData.giftCardTemplate) {
        templateId = formData.giftCardTemplate;
        console.log('🎨 Template selected for letter:', templateId);
        
        // Fetch template URL
        try {
          const { data: template, error: templateError } = await supabase
            .from('design_templates')
            .select('image_url, preview_gradient, border_color, accent_color')
            .eq('id', templateId)
            .eq('is_active', true)
            .single();
          
          if (!templateError && template) {
            templateUrl = template.image_url;
            setSelectedTemplate(templateId);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/b82c46f0-2300-44a2-a8cb-ae7c62dc77a5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:before-setSelectedTemplateUrl',message:'H2: about to call setSelectedTemplateUrl (order check)',data:{url:template.image_url,seq:'A'},hypothesisId:'H2',timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            templateUrlRef.current = template.image_url;
            templateDataRef.current = { gradient: template.preview_gradient, borderColor: template.border_color, accentColor: template.accent_color };
            setSelectedTemplateUrl(template.image_url);
            setSelectedTemplateData({
              url: template.image_url,
              gradient: template.preview_gradient,
              borderColor: template.border_color,
              accentColor: template.accent_color,
            });
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/b82c46f0-2300-44a2-a8cb-ae7c62dc77a5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:after-setSelectedTemplateUrl',message:'State set after template fetch',data:{templateImageUrl:template.image_url},hypothesisId:'H2',timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            console.log('✅ Template URL fetched:', templateUrl);
          } else {
            console.error('❌ Error fetching template:', templateError);
          }
        } catch (err) {
          console.error('❌ Exception fetching template:', err);
        }
      }

      // For giftcard type, template is selected after generation
      // We'll handle that separately when the template is selected

      // Step 1: Save message stub
      const { data: messageStub, error: stubError } = await supabase
        .from('generated_messages')
        .insert({
          user_id: user?.id || null,
          message_type: formData.messageType,
          template_id: templateId || null,
          template_url: templateUrl || null,
          input_data: promptData,
          tone: formData.tone || promptData.tone || 'heartfelt',
          character_length: formData.length || formData.characterLength || 'medium',
          generated_content: '',
          status: 'generating',
          is_preview: !user,
          paid: !!templateId,
        })
        .select()
        .single();

      if (stubError) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b82c46f0-2300-44a2-a8cb-ae7c62dc77a5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:stub-error',message:'Stub insert failed',data:{error:stubError?.message},hypothesisId:'H3',timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        console.error('Error creating message stub:', stubError);
        setError(stubError.message || 'Failed to create message');
        setIsGenerating(false);
        return;
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b82c46f0-2300-44a2-a8cb-ae7c62dc77a5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:stub-created',message:'Message stub created',data:{stubId:messageStub?.id,template_id:templateId??null,template_url:templateUrl??null},hypothesisId:'H2',timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      console.log('✅ Message stub created:', {
        id: messageStub?.id,
        template_id: templateId,
        template_url: templateUrl,
      });

      try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b82c46f0-2300-44a2-a8cb-ae7c62dc77a5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:before-generateMessage',message:'About to call OpenAI',data:{},hypothesisId:'H4',timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        console.log('🤖 Generating message...');

        const GENERATE_TIMEOUT_MS = 90000;
        const generatedText = await Promise.race([
          generateMessage(formData.messageType, promptData),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('Generation timed out. Please try again.')), GENERATE_TIMEOUT_MS)
          ),
        ]);

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b82c46f0-2300-44a2-a8cb-ae7c62dc77a5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:after-generateMessage',message:'OpenAI returned',data:{length:generatedText?.length},hypothesisId:'H4',timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        console.log('✅ Message generated');

        const { error: updateError } = await supabase
          .from('generated_messages')
          .update({
            generated_content: generatedText,
            status: 'completed',
          })
          .eq('id', messageStub.id);

        if (updateError) throw updateError;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b82c46f0-2300-44a2-a8cb-ae7c62dc77a5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:after-db-update',message:'DB update done',data:{},hypothesisId:'H5',timestamp:Date.now()})}).catch(()=>{});
        // #endregion

        const { error: tokenError } = await supabase
          .from('profiles')
          .update({ tokens: profile.tokens - tokenCost })
          .eq('id', user.id);

        if (tokenError) throw tokenError;

        // Optional audit log (same for all message types). Never block showing the result.
        const { error: txError } = await supabase.from('token_transactions').insert({
          user_id: user.id,
          transaction_type: 'usage',
          amount: -tokenCost,
          description: `Generated ${formData.messageType}`,
        });
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b82c46f0-2300-44a2-a8cb-ae7c62dc77a5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:after-token-transaction',message:'Token transaction done',data:{txError:txError?.message||null},hypothesisId:'H5',timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        if (txError) {
          console.warn('Token transaction log failed (schema may differ); generation still succeeded:', txError.message);
        }

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b82c46f0-2300-44a2-a8cb-ae7c62dc77a5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:before-setGeneratedMessage',message:'H2: about to call setGeneratedMessage (order check)',data:{messageLength:generatedText?.length??0,seq:'B'},hypothesisId:'H2',timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        setGeneratedMessage(generatedText);
        setLastGeneratedMessageId(messageStub.id);
        // Refresh profile in background so a hang never blocks clearing the loading state
        refreshProfile().catch(() => {});

        if (formData.messageType === 'giftcard') {
          setShowGiftCardTemplate(true);
        }
      } catch (genErr) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b82c46f0-2300-44a2-a8cb-ae7c62dc77a5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:inner-catch',message:'Generation error',data:{err:genErr instanceof Error ? genErr.message : String(genErr)},hypothesisId:'H7',timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        console.error('❌ Generation error:', genErr);
        const errMsg = genErr instanceof Error ? genErr.message : 'Generation failed';
        if (errMsg.includes('Insufficient tokens')) {
          setError(errMsg);
          setShowTokenModal(true);
        } else {
          setError(errMsg);
        }
      } finally {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b82c46f0-2300-44a2-a8cb-ae7c62dc77a5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:inner-finally',message:'Inner finally - setIsGenerating(false)',data:{},hypothesisId:'H8',timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        setIsGenerating(false);
      }
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b82c46f0-2300-44a2-a8cb-ae7c62dc77a5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:outer-catch',message:'Outer catch',data:{err:err instanceof Error ? err.message : String(err)},hypothesisId:'H7',timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      console.error('❌ Error generating message:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate message';
      
      if (errorMessage.includes('Insufficient tokens')) {
        setError(errorMessage);
        setShowTokenModal(true);
      } else if (errorMessage.includes('session expired') || errorMessage.includes('Authentication')) {
        setError('Your session expired. Please sign in again.');
        await signOut();
      } else if (errorMessage.includes('OpenAI')) {
        setError('AI service error. Please try again.');
      } else {
        setError(`Failed to generate message: ${errorMessage}`);
      }
    } finally {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b82c46f0-2300-44a2-a8cb-ae7c62dc77a5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:outer-finally',message:'Outer finally - setIsGenerating(false)',data:{},hypothesisId:'H8',timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!user || !profile) {
      setError('Please sign in to regenerate messages.');
      return;
    }

    // Check if we have a message ID to regenerate
    // If not, try to get the most recent message for this user
    let messageIdToRegenerate = lastGeneratedMessageId;
    
    if (!messageIdToRegenerate) {
      console.log('⚠️ No messageId stored, attempting to find most recent message...');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          // Try to get the most recent message from the database
          const { data: messages, error: fetchError } = await supabase
            .from('generated_messages')
            .select('id, message_type, created_at')
            .eq('is_preview', false) // Only get full messages, not previews
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(); // Use maybeSingle() instead of single() to handle no results gracefully
          
          console.log('🔍 Message lookup result:', { messages, fetchError });
          
          if (!fetchError && messages?.id) {
            messageIdToRegenerate = messages.id;
            setLastGeneratedMessageId(messages.id);
            console.log('✅ Found most recent message:', messageIdToRegenerate);
          } else {
            console.error('❌ Failed to find message:', fetchError);
            setError('No message to regenerate. Please generate a message first.');
            setIsGenerating(false);
            return;
          }
        } else {
          console.error('❌ No session found');
          setError('No message to regenerate. Please generate a message first.');
          setIsGenerating(false);
          return;
        }
      } catch (err) {
        console.error('❌ Error finding message:', err);
        setError('No message to regenerate. Please generate a message first.');
        setIsGenerating(false);
        return;
      }
    }

    // Regeneration always costs 2 tokens (not the message type cost)
    const REGENERATE_TOKEN_COST = 2;
    const currentTokens = profile.tokens;

    // Check if user has enough tokens for regeneration (2 tokens)
    if (currentTokens < REGENERATE_TOKEN_COST) {
      setError(`Insufficient tokens. You need ${REGENERATE_TOKEN_COST} tokens to regenerate. You currently have ${currentTokens} tokens.`);
      setShowTokenModal(true);
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      // Get access token for edge function
      // Get fresh session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Session error:', sessionError);
        throw new Error('Authentication session expired. Please sign in again.');
      }

      console.log('🔄 Regenerating message via edge function:', {
        messageId: messageIdToRegenerate,
        tokenCost: REGENERATE_TOKEN_COST,
        currentTokens: currentTokens,
      });

      const { data: result, error: invokeError } = await supabase.functions.invoke('regenerate-message', {
        body: {
          messageId: messageIdToRegenerate,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('📦 Regenerate response:', { result, invokeError });

      if (invokeError) {
        console.error('❌ Edge function error:', invokeError);
        console.error('Error details:', {
          message: invokeError.message,
          status: invokeError.status,
          error: invokeError,
        });
        
        // Check if it's an insufficient tokens error (402)
        if (invokeError.message?.includes('Insufficient tokens') || invokeError.status === 402) {
          setError(invokeError.message || 'Insufficient tokens');
          setShowTokenModal(true);
          return;
        }

        // Check for message not found error
        if (invokeError.message?.includes('Message not found') || invokeError.message?.includes('access denied') || invokeError.status === 404) {
          setError('Message not found. Please generate a new message.');
          // Clear the stored message ID so it doesn't try to regenerate a non-existent message
          setLastGeneratedMessageId(null);
          return;
        }
        
        throw invokeError;
      }

      if (!result) {
        console.error('❌ No result returned from edge function');
        throw new Error('No data returned from edge function');
      }

      // Check if result contains an error (even with 200 status)
      if ((result as any)?.error) {
        console.error('❌ Error in response body:', (result as any).error);
        throw new Error((result as any).error || 'Failed to regenerate message');
      }

      console.log('✅ Message regenerated via edge function:', {
        success: (result as any)?.success,
        tokens_remaining: (result as any)?.tokens_remaining,
        newMessageLength: (result as any)?.newMessage?.length,
      });

      // Update UI with regenerated message
      if ((result as any)?.newMessage) {
        setGeneratedMessage((result as any).newMessage);
        console.log('✅ Message updated in UI');
      } else {
        console.error('❌ No newMessage in result:', result);
        throw new Error('No message content in response');
      }

      // Refresh profile to get updated token count
      await refreshProfile();
    } catch (err) {
      console.error('❌ Error regenerating message:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to regenerate message';
      
      if (errorMessage.includes('Insufficient tokens')) {
        setError(errorMessage);
        setShowTokenModal(true);
      } else if (errorMessage.includes('session expired') || errorMessage.includes('Authentication')) {
        setError('Your session expired. Please sign in again.');
        await signOut();
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTemplateSelect = async (templateId: string) => {
    setSelectedTemplate(templateId);
    console.log('🎨 Template selected:', templateId);
    
    // Fetch template data when template is selected
    try {
      const { data: template, error: templateError } = await supabase
        .from('design_templates')
        .select('image_url, preview_gradient, border_color, accent_color')
        .eq('id', templateId)
        .eq('is_active', true)
        .single();
      
      if (!templateError && template) {
        setSelectedTemplateUrl(template.image_url);
        setSelectedTemplateData({
          url: template.image_url,
          gradient: template.preview_gradient,
          borderColor: template.border_color,
          accentColor: template.accent_color,
        });
        console.log('✅ Template data fetched:', {
          url: template.image_url,
          hasGradient: !!template.preview_gradient
        });
      } else {
        console.error('❌ Error fetching template:', templateError);
      }
    } catch (err) {
      console.error('❌ Exception fetching template:', err);
    }
  };

  const handleSendGiftCard = () => {
    setShowGiftCardEmail(true);
  };

  const handleUnlockClick = () => {
    setShowUnlockModal(true);
  };

  const handleUnlockSuccess = (fullContent: string, tokensAwarded: number, messageId?: string) => {
    console.log('🔓 Unlocking message:', {
      contentLength: fullContent.length,
      messageId,
      tokensAwarded
    });
    
    // Set the generated message
    setGeneratedMessage(fullContent);
    setIsPreviewMode(false);
    
    // Store message ID for regeneration
    if (messageId) {
      setLastGeneratedMessageId(messageId);
      console.log('💾 Stored message ID:', messageId);
    }
    
    // Refresh profile to get updated tokens
    if (tokensAwarded > 0) {
      refreshProfile();
    }
    
    // Make sure we stay on generator view to show the message
    if (currentView !== 'generator') {
      setCurrentView('generator');
    }
    
    // Ensure message type is selected so the display shows
    setMessageTypeSelected(true);
    
    console.log('✅ Message unlocked and displayed');
  };

  const handleViewChange = (view: View) => {
    setCurrentView(view);
    if (view === 'home') {
      setGeneratedMessage('');
      setError('');
      setShowGiftCardTemplate(false);
      setMessageTypeSelected(false);
    }
  };

  // Helper function to check if user is admin
  const isAdminUser = profile ? Boolean(profile.is_admin) : false;

  // Role-based routing: Admin users see AdminDashboard
  // Only handle 'admin' view here - dashboard view is handled separately below
  if (user && currentView === 'admin') {
    // If still loading initial auth state, show loading
    if (loading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-text-light">Loading...</div>
        </div>
      );
    }
    
    // If profile is not loaded, show loading state
    // The useEffect will handle the refresh, but we'll also show a helpful message
    if (!profile) {
      console.log('Profile not loaded in routing check, showing loading state');
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="text-text-light mb-2">Loading profile...</div>
            <div className="text-text-light text-sm">Please wait while we verify your access.</div>
          </div>
        </div>
      );
    }
    
    // Profile is loaded, check if user is admin
    const checkIsAdmin = Boolean(profile.is_admin);
    
    console.log('Admin routing check', {
      currentView,
      hasProfile: !!profile,
      isAdminValue: profile?.is_admin,
      checkIsAdmin,
      loading
    });
    
    if (checkIsAdmin) {
      console.log('Rendering AdminDashboard', { 
        currentView, 
        hasUser: !!user, 
        hasProfile: !!profile,
        isAdmin: profile?.is_admin, 
        checkIsAdmin,
        loading 
      });
      return <AdminDashboard onNavigate={setCurrentView} />;
    } else {
      // User has profile but is not admin - redirect to home
      console.log('User is not admin, redirecting to home');
      setCurrentView('home');
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-text-light">Redirecting...</div>
        </div>
      );
    }
  }
  

  // Regular users see regular Dashboard
  // Show dashboard if user is signed in (don't wait for profile to load)
  if (currentView === 'dashboard' && user) {
    // If profile is loaded and user is definitely an admin, show admin dashboard
    if (profile && isAdminUser) {
      console.log('Admin user navigated to dashboard, showing AdminDashboard');
      return <AdminDashboard onNavigate={setCurrentView} />;
    }
    
    // For all other cases (profile loading, profile null, or not admin), show regular dashboard
    // Dashboard component will handle its own loading state
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-background">
          <nav className="bg-panel border-b border-border">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <motion.div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => handleViewChange('home')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <img src="/Rekendle_ai_logo.PNG" alt="Rekendle.ai" className="h-16" />
            </motion.div>
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleViewChange('home')}
                className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 text-text-light hover:text-text-dark"
              >
                <HomeIcon className="w-5 h-5" />
                <span className="hidden md:inline">Home</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleViewChange('dashboard')}
                className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 bg-[#CC4F4E] text-black"
              >
                <LayoutDashboard className="w-5 h-5" />
                <span className="hidden md:inline">Dashboard</span>
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setShowTokenModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg cursor-pointer hover:border-[#CC4F4E] transition-colors"
              >
                <Coins className="w-5 h-5 text-[#CC4F4E]" />
                <span className="text-text-dark font-medium">{profile?.tokens || 0}</span>
                <span className="text-text-light text-sm hidden md:inline">tokens</span>
              </motion.button>

              <button
                onClick={async () => {
                  await signOut();
                  setCurrentView('home');
                }}
                className="px-4 py-2 text-text-light hover:text-text-dark transition-colors flex items-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden md:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </nav>
          <Dashboard />
          <TokenPurchaseModal
            isOpen={showTokenModal}
            onClose={() => setShowTokenModal(false)}
            currentTokens={profile?.tokens || 0}
          />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
      <nav className="bg-panel border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => handleViewChange('home')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <img src="/Rekendle_ai_logo.PNG" alt="Rekendle.ai" className="h-16" />
          </motion.div>
          <div className="flex items-center gap-4">
            {user && (
              <>
                {/* Admin users see Admin Dashboard button */}
                {isAdminUser ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      console.log('Admin Dashboard button clicked', { 
                        hasProfile: !!profile, 
                        isAdmin: profile?.is_admin,
                        loading,
                        currentView 
                      });
                      
                      // Directly set the view - the routing logic will handle rendering
                      handleViewChange('admin');
                    }}
                    className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 text-text-light hover:text-text-dark hover:bg-background"
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    <span className="hidden md:inline">Admin Dashboard</span>
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      // Navigate immediately - Dashboard component will handle loading
                      handleViewChange('dashboard');
                    }}
                    className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 text-text-light hover:text-text-dark hover:bg-background"
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    <span className="hidden md:inline">Dashboard</span>
                  </motion.button>
                )}

                {/* Admin users see AdminDashboard when clicking Dashboard, so no separate Admin button needed */}

                {profile && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg cursor-pointer hover:border-[#CC4F4E] transition-colors"
                    onClick={() => setShowTokenModal(true)}
                  >
                    <Coins className="w-5 h-5 text-[#CC4F4E]" />
                    <span className="text-text-dark font-medium">{profile.tokens || 0}</span>
                    <span className="text-text-light text-sm hidden md:inline">tokens</span>
                  </motion.div>
                )}
              </>
            )}
            {user ? (
              <button
                onClick={async () => {
                  try {
                    await signOut();
                    // Clear all local state
                    setCurrentView('home');
                    setShowAuthModal(false);
                    setGeneratedMessage('');
                    setError('');
                    setCurrentFormData(null);
                  } catch (error) {
                    console.error('Error during sign out:', error);
                    // Even if sign out fails, try to clear state and redirect
                    setCurrentView('home');
                    setShowAuthModal(false);
                  }
                }}
                className="px-4 py-2 text-text-light hover:text-text-dark transition-colors flex items-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden md:inline">Sign Out</span>
              </button>
            ) : (
              currentView !== 'home' && (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-6 py-3 text-lg text-text-light hover:text-text-dark transition-colors"
                >
                  Sign In
                </button>
              )
            )}
          </div>
        </div>
      </nav>

      {currentView === 'home' ? (
        <motion.section
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="max-w-7xl mx-auto px-6 py-24"
        >
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="font-heading text-6xl md:text-7xl font-bold text-text-dark mb-6 leading-tight"
            >
              Can't find the right words?
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-2xl md:text-3xl text-text-light mb-12 leading-relaxed"
            >
              Let AI speak from the heart
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex gap-4 justify-center"
            >
              <motion.button
                onClick={() => handleViewChange('generator')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-10 py-5 text-lg bg-[#CC4F4E] text-black rounded-lg hover:opacity-90 transition-all shadow-lg hover:shadow-xl font-medium"
              >
                Create My Message Now
              </motion.button>
            </motion.div>
          </div>
        </motion.section>
      ) : (
        <motion.div
          key="generator"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="max-w-7xl mx-auto px-6 py-8"
        >
          <div className={`grid grid-cols-1 ${messageTypeSelected ? 'lg:grid-cols-2' : ''} gap-6 overflow-hidden rounded-2xl`}>
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-panel p-6 flex flex-col"
            >
              <h2 className="text-2xl font-bold text-text-dark mb-4">
                Tell us about your message
              </h2>
              <MessageForm
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
                onMessageTypeSelect={setMessageTypeSelected}
              />
            </motion.div>

            <AnimatePresence>
              {messageTypeSelected && (
                <motion.div
                  key="message-display"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  transition={{ duration: 0.5 }}
                  className="bg-background p-6 flex flex-col"
                >
                  <h2 className="text-2xl font-bold text-text-dark mb-4">
                    Your Generated Message
                  </h2>
                  {isPreviewMode && generatedMessage && !isGenerating ? (
                    <PreviewMessageDisplay
                      partialContent={generatedMessage}
                      onUnlockClick={handleUnlockClick}
                      remainingPreviews={remainingPreviews}
                    />
                  ) : (
                    <>
                      {/* #region agent log */}
                      {(() => {
                        const urlEmptyWithMessage = !!generatedMessage && !selectedTemplateUrl;
                        fetch('http://127.0.0.1:7242/ingest/b82c46f0-2300-44a2-a8cb-ae7c62dc77a5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:MessageDisplay-render',message:'H2/H5: Props at render',data:{selectedTemplateUrl:selectedTemplateUrl||null,hasGeneratedMessage:!!generatedMessage,generatedMessageLength:generatedMessage?.length??0,messageType:currentFormData?.messageType??null,STALE_RENDER:urlEmptyWithMessage},hypothesisId:'H2,H5',timestamp:Date.now()})}).catch(()=>{});
                        return null;
                      })()}
                      {/* #endregion */}
                      <MessageDisplay
                        message={generatedMessage}
                        isGenerating={isGenerating}
                        onRegenerate={handleRegenerate}
                        hasTokens={(profile?.tokens || 0) >= 2}
                        error={error}
                        recipientName={
                          currentFormData?.loverName ||
                          currentFormData?.recipientName ||
                          currentFormData?.apologyLoverName ||
                          currentFormData?.giftCardLoverName ||
                          currentFormData?.name ||
                          undefined
                        }
                        messageType={currentFormData?.messageType}
                        templateUrl={selectedTemplateUrl || templateUrlRef.current || undefined}
                        templateGradient={selectedTemplateData?.gradient ?? templateDataRef.current?.gradient}
                        borderColor={selectedTemplateData?.borderColor ?? templateDataRef.current?.borderColor}
                        accentColor={selectedTemplateData?.accentColor ?? templateDataRef.current?.accentColor}
                      />
                    </>
                  )}

                  {FEATURES.DESIGN_TEMPLATES && showGiftCardTemplate && generatedMessage && !isGenerating && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-6 space-y-4"
                    >
                      <GiftCardTemplateSelector
                        onTemplateSelect={handleTemplateSelect}
                        selectedTemplate={selectedTemplate}
                      />
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSendGiftCard}
                        className="w-full px-6 py-3 bg-[#CC4F4E] text-black rounded-lg hover:opacity-90 transition-all shadow-lg hover:shadow-xl font-medium flex items-center justify-center gap-2"
                      >
                        Send Gift Card
                      </motion.button>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      <TokenPurchaseModal
        isOpen={showTokenModal}
        onClose={() => {
          setShowTokenModal(false);
        }}
        currentTokens={profile?.tokens || 0}
      />

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        amount="2.99"
        description="Message"
        itemType="message"
        onPaymentSuccess={() => setShowPaymentModal(false)}
      />

      <GiftCardEmailModal
        isOpen={showGiftCardEmail}
        onClose={() => setShowGiftCardEmail(false)}
        message={generatedMessage}
        template={selectedTemplate}
        recipientName={currentFormData?.giftCardLoverName || ''}
        senderName={currentFormData?.giftCardYourName || ''}
      />

      <UnlockPreviewModal
        isOpen={showUnlockModal}
        onClose={() => setShowUnlockModal(false)}
        onUnlockSuccess={handleUnlockSuccess}
        previewId={previewId}
        generatedMessageId={previewGeneratedMessageId ?? undefined}
        fullMessage={fullPreviewMessageRef.current ?? generatedMessage}
      />

      </div>
    </ErrorBoundary>
  );
}

export default App;
