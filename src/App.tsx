import { useState, useEffect } from 'react';
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
import { mapFormDataToBackend } from './utils/formMapper';
import { SessionManager, MAX_PREVIEWS } from './utils/sessionManager';
import { PreviewService } from './services/previewService';
import PreviewMessageDisplay from './components/PreviewMessageDisplay';
import UnlockPreviewModal from './components/UnlockPreviewModal';
import { getTokenCost, addTokens } from './services/tokenService';

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
  const [selectedTemplate, setSelectedTemplate] = useState('romantic-hearts');
  const [showGiftCardEmail, setShowGiftCardEmail] = useState(false);
  const [messageTypeSelected, setMessageTypeSelected] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewId, setPreviewId] = useState<string>('');
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [remainingPreviews, setRemainingPreviews] = useState(3);
  const [lastGeneratedMessageId, setLastGeneratedMessageId] = useState<string | null>(null);

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
  // Only reset if we were on a protected view (dashboard/admin) and user logs out
  useEffect(() => {
    if (!user && !loading && (currentView === 'dashboard' || currentView === 'admin')) {
      console.log('User logged out from protected view, resetting to home');
      setCurrentView('home');
      setShowAuthModal(false);
    }
  }, [user, loading, currentView]);

  // Role-based route protection: Redirect non-admin users away from admin routes only
  useEffect(() => {
    if (user && profile && !loading && currentView === 'admin') {
      const isAdmin = Boolean(profile.is_admin);
      if (!isAdmin) {
        // Non-admin user trying to access admin route - redirect to home
        console.warn('Non-admin user attempted to access admin route, redirecting...');
        setCurrentView('home');
      }
    }
    
    // Only redirect to home if user explicitly logged out
    // Don't redirect on signup (when there's a generated message)
    if (!user && !loading && (currentView === 'dashboard' || currentView === 'admin')) {
      console.log('User logged out from protected view, resetting to home');
      setCurrentView('home');
      setShowAuthModal(false);
    }
    
    // NEW: Don't reset view or message on signup
    if (user && generatedMessage && currentView === 'generator') {
      console.log('User signed up with generated message - keeping on generator view');
      // Stay on generator view to show the message
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
        maxPreviews: 3
      });
      
      if (!session.canGeneratePreview) {
        console.log('⚠️ Preview limit reached, showing auth modal');
        console.log('💡 To reset preview count for testing, run in console:');
        console.log('   SessionManager.resetPreviewCount()');
        setError(`You've used all ${MAX_PREVIEWS} free previews. Please sign up to continue generating messages!`);
        setShowAuthModal(true);
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
        console.log('📋 Form data:', formData);
        
        const backendFormData = mapFormDataToBackend(formData);
        console.log('✅ Form data mapped to backend format:', backendFormData);
        
        console.log('🚀 Calling PreviewService.generatePreview()...');
        const preview = await PreviewService.generatePreview(backendFormData);
        
        console.log('✅ Preview generated successfully:', {
          previewId: preview.previewId,
          partialContentLength: preview.partialContent.length,
          remainingPreviews: preview.remainingPreviews
        });
        
        setGeneratedMessage(preview.partialContent);
        setPreviewId(preview.previewId);
        setRemainingPreviews(preview.remainingPreviews);
        
        console.log('✅ Preview displayed to user');
      } catch (err) {
        console.error('❌ Error generating preview:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate preview';
        
        // Provide more helpful error messages - DO NOT show auth modal for technical errors
        if (errorMessage.includes('OpenAI API key') || errorMessage.includes('VITE_OPENAI_API_KEY')) {
          setError('OpenAI API key is missing. Please add VITE_OPENAI_API_KEY to .env.local file and restart the dev server.');
        } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
          setError('Invalid OpenAI API key. Please check your .env.local file.');
        } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
          setError('OpenAI rate limit exceeded. Please try again later.');
        } else if (errorMessage.includes('quota')) {
          setError('OpenAI account has insufficient quota. Please check your billing.');
        } else if (errorMessage.includes('Preview limit reached')) {
          // This is the only case where we should show auth modal
          setError(`You've used all ${MAX_PREVIEWS} free previews. Please sign up to continue generating messages!`);
          setShowAuthModal(true);
        } else {
          setError(`Failed to generate preview: ${errorMessage}. Please try again.`);
        }
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    // Check if user has enough tokens (minimum 5 for most message types, 15 for giftcard/love_letter)
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

      console.log('🚀 Calling generate-message edge function...');

      // Call edge function with proper headers
      const { data: result, error: invokeError } = await supabase.functions.invoke('generate-message', {
        body: {
          messageType: formData.messageType,
          promptData: promptData,
          preview: false,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (invokeError) {
        console.error('❌ Edge function error:', invokeError);
        
        // Check if it's an insufficient tokens error
        if (invokeError.message?.includes('Insufficient tokens') || invokeError.status === 402) {
          setError(invokeError.message || 'Insufficient tokens');
          setShowTokenModal(true);
          return;
        }
        
        throw invokeError;
      }

      if (!result) {
        throw new Error('No data returned from edge function');
      }

      console.log('✅ Message generated successfully:', {
        messageId: result.messageId,
        tokens_remaining: result.tokens_remaining,
        tokens_deducted: result.tokens_deducted,
      });

      // Store message ID for regeneration
      if (result.messageId) {
        setLastGeneratedMessageId(result.messageId);
        console.log('💾 Message ID stored:', result.messageId);
      }

      // Display the message
      if (result.full) {
        setGeneratedMessage(result.full);
      } else {
        throw new Error('No message content in response');
      }

      // Refresh profile to get updated token count
      await refreshProfile();

      // Show gift card template if applicable
      if (formData.messageType === 'giftcard') {
        setShowGiftCardTemplate(true);
      }
    } catch (err) {
      console.error('❌ Error generating message:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate message';
      
      if (errorMessage.includes('Insufficient tokens')) {
        setError(errorMessage);
        setShowTokenModal(true);
      } else if (errorMessage.includes('session expired') || errorMessage.includes('Authentication')) {
        setError('Your session expired. Please sign in again.');
        await signOut();
        setShowAuthModal(true);
      } else if (errorMessage.includes('OpenAI')) {
        setError('AI service error. Please try again.');
      } else {
        setError(`Failed to generate message: ${errorMessage}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePurchaseTokens = async (tokenCount: number, paymentId?: string) => {
    if (!user || !profile) return;

    try {
      console.log(`💳 Adding ${tokenCount} tokens to user account...`);
      const addResult = await addTokens(
        tokenCount,
        'purchase',
        paymentId,
        { purchased_at: new Date().toISOString() }
      );
      
      console.log(`✅ Tokens added. New balance: ${addResult.tokens_remaining}`);
      await refreshProfile();
      setShowTokenModal(false);
    } catch (err) {
      console.error('Error purchasing tokens:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to purchase tokens';
      setError(errorMessage);
    }
  };

  const handleRegenerate = async () => {
    if (!user || !profile) {
      setShowTokenModal(true);
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
            .select('id')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (!fetchError && messages?.id) {
            messageIdToRegenerate = messages.id;
            setLastGeneratedMessageId(messages.id);
            console.log('✅ Found most recent message:', messageIdToRegenerate);
          } else {
            setError('No message to regenerate. Please generate a message first.');
            return;
          }
        } else {
          setError('No message to regenerate. Please generate a message first.');
          return;
        }
      } catch (err) {
        console.error('Error finding message:', err);
        setError('No message to regenerate. Please generate a message first.');
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
      });

      const { data: result, error: invokeError } = await supabase.functions.invoke('regenerate-message', {
        body: {
          messageId: messageIdToRegenerate,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (invokeError) {
        console.error('❌ Edge function error:', invokeError);
        
        // Check if it's an insufficient tokens error (402)
        if (invokeError.message?.includes('Insufficient tokens') || invokeError.status === 402) {
          setError(invokeError.message || 'Insufficient tokens');
          setShowTokenModal(true);
          return;
        }
        
        throw invokeError;
      }

      if (!result) {
        throw new Error('No data returned from edge function');
      }
      console.log('✅ Message regenerated via edge function:', {
        tokens_remaining: result.tokens_remaining,
        newMessageLength: result.newMessage?.length,
      });

      // Update UI with regenerated message
      if (result.newMessage) {
        setGeneratedMessage(result.newMessage);
      } else {
        throw new Error('No message content in response');
      }

      // Refresh profile to get updated token count
      await refreshProfile();
    } catch (err) {
      console.error('❌ Error regenerating message:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to regenerate message';
      
      if (errorMessage.includes('session expired') || errorMessage.includes('Authentication')) {
        setError('Your session expired. Please sign in again.');
        await signOut();
        setShowAuthModal(true);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTemplateSelect = (template: string) => {
    setSelectedTemplate(template);
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
  
  // Also handle dashboard view when admin user navigates to it
  // Admin users should see AdminDashboard even when clicking "Dashboard"
  if (user && currentView === 'dashboard' && isAdminUser && !loading && profile) {
    console.log('Admin user navigated to dashboard, showing AdminDashboard');
    return <AdminDashboard onNavigate={setCurrentView} />;
  }

  // Regular users see regular Dashboard
  // Only show regular dashboard if:
  // 1. User is signed in
  // 2. Profile is loaded (not loading)
  // 3. User is NOT an admin
  if (currentView === 'dashboard' && user && !loading && profile && !isAdminUser) {
    return (
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

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg"
              >
                <Coins className="w-5 h-5 text-[#CC4F4E]" />
                <span className="text-text-dark font-medium">{profile?.tokens || 0}</span>
                <span className="text-text-light text-sm hidden md:inline">tokens</span>
              </motion.div>

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
      </div>
    );
  }

  return (
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
                    onClick={async () => {
                      // Ensure profile is loaded before navigating to dashboard
                      if (!profile && !loading) {
                        await refreshProfile();
                      }
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
                    <MessageDisplay
                      message={generatedMessage}
                      isGenerating={isGenerating}
                      onRegenerate={handleRegenerate}
                      hasTokens={(profile?.tokens || 0) >= 2}
                      error={error}
                    />
                  )}

                  {showGiftCardTemplate && generatedMessage && !isGenerating && (
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
        onClose={() => setShowTokenModal(false)}
        onPurchase={handlePurchaseTokens}
        currentTokens={profile?.tokens || 0}
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
      />
    </div>
  );
}

export default App;
