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
import { N8nService } from './services/n8nService';
import { SessionManager } from './utils/sessionManager';
import { PreviewService } from './services/previewService';
import PreviewMessageDisplay from './components/PreviewMessageDisplay';
import UnlockPreviewModal from './components/UnlockPreviewModal';

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

  // Refresh profile when user logs in
  useEffect(() => {
    if (user && !profile && !loading) {
      console.log('User logged in but profile missing, refreshing...');
      refreshProfile();
    }
  }, [user, profile, loading, refreshProfile]);

  // Auto-navigate admin users to admin dashboard after login
  useEffect(() => {
    if (user && profile && (profile.is_admin === true || profile.is_admin) && currentView !== 'admin' && currentView !== 'dashboard' && !loading) {
      console.log('Admin user detected, navigating to admin dashboard...', {
        user: !!user,
        hasProfile: !!profile,
        isAdmin: profile.is_admin,
        isAdminType: typeof profile.is_admin,
        currentView,
        loading
      });
      setCurrentView('dashboard'); // Admin users will see AdminDashboard when clicking Dashboard
    }
  }, [user, profile, loading, currentView]);

  // Reset view when user logs out
  useEffect(() => {
    if (!user && !loading) {
      setCurrentView('home');
      setShowAuthModal(false);
    }
  }, [user, loading]);

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

  const handleGenerate = async (formData: FormData) => {
    if (!user) {
      const session = SessionManager.getOrCreateSession();
      if (!session.canGeneratePreview) {
        setShowAuthModal(true);
        return;
      }

      setCurrentFormData(formData);
      setIsGenerating(true);
      setGeneratedMessage('');
      setError('');
      setIsPreviewMode(true);

      try {
        const backendFormData = mapFormDataToBackend(formData);
        const preview = await PreviewService.generatePreview(backendFormData);
        setGeneratedMessage(preview.partialContent);
        setPreviewId(preview.previewId);
        setRemainingPreviews(preview.remainingPreviews);
      } catch (err) {
        console.error('Error generating preview:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate preview');
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    if (!profile || profile.tokens < 2) {
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
      const backendFormData = mapFormDataToBackend(formData);

      const data = await N8nService.generateMessage(backendFormData);
      setGeneratedMessage(data.message);
      await refreshProfile();

      if (formData.messageType === 'giftcard') {
        setShowGiftCardTemplate(true);
      }
    } catch (err) {
      console.error('Error generating message:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate message');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePurchaseTokens = async (tokenCount: number) => {
    if (!user || !profile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ tokens: profile.tokens + tokenCount })
        .eq('id', user.id);

      if (error) throw error;

      await supabase.from('token_transactions').insert({
        user_id: user.id,
        transaction_type: 'purchase',
        amount: tokenCount,
        description: `Purchased ${tokenCount} tokens`,
      });

      await refreshProfile();
      setShowTokenModal(false);
    } catch (err) {
      console.error('Error purchasing tokens:', err);
    }
  };

  const handleRegenerate = async () => {
    if (!profile || profile.tokens < 2) {
      setShowTokenModal(true);
      return;
    }

    if (currentFormData) {
      await handleGenerate(currentFormData);
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

  const handleUnlockSuccess = (fullContent: string, tokensAwarded: number) => {
    setGeneratedMessage(fullContent);
    setIsPreviewMode(false);
    if (tokensAwarded > 0) {
      refreshProfile();
    }
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

  // Admin users see AdminDashboard when clicking Dashboard or Admin
  if ((currentView === 'admin' || currentView === 'dashboard') && user && profile && (profile.is_admin === true || profile.is_admin)) {
    console.log('Rendering AdminDashboard', { currentView, hasUser: !!user, isAdmin: profile.is_admin });
    return <AdminDashboard onNavigate={setCurrentView} />;
  }

  // Regular users see regular Dashboard
  if (currentView === 'dashboard' && user) {
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
            {!loading && user && (
              <>
                {profile ? (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleViewChange('dashboard')}
                      className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 text-text-light hover:text-text-dark hover:bg-background"
                    >
                      <LayoutDashboard className="w-5 h-5" />
                      <span className="hidden md:inline">Dashboard</span>
                    </motion.button>

                    {/* Admin users see AdminDashboard when clicking Dashboard, so no separate Admin button needed */}

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
                  </>
                ) : (
                  <button
                    onClick={() => refreshProfile()}
                    className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 text-text-light hover:text-text-dark hover:bg-background"
                  >
                    Refresh Profile
                  </button>
                )}
              </>
            )}
            {user ? (
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
