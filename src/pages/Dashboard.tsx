import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Heart, Calendar, MessageSquare, Sparkles, RotateCcw, Loader2, Bug } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { toggleFavorite as toggleFavoriteService } from '../services/favoriteService';
import TokenPurchaseModal from '../components/TokenPurchaseModal';
import PDFPreviewModal from '../components/PDFPreviewModal';
import BugReportModal from '../components/BugReportModal';
import { fetchUserMessages, fetchMessageById, type Message } from '../hooks/useMessages';

// Use Message type from useMessages hook
type GeneratedMessage = Message;

interface MessageStats {
  totalMessages: number;
  monthlyMessages: number;
  favoriteCount: number;
}

const getMessageTypeLabel = (type: string): string => {
  const labels: { [key: string]: string } = {
    'poem': 'Poem',
    'letter': 'Love Letter',
    'love_letter': 'Love Letter',
    'apology': 'Apology Message',
    'text': 'Voicenote Script',
    'giftcard': 'Gift Card',
    'voicenote': 'Voicenote Script',
  };

  return labels[type] || type;
};

export default function Dashboard() {
  const auth = useAuth();
  const user = auth?.user;
  const profile = auth?.profile;
  const [messages, setMessages] = useState<GeneratedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterTone, setFilterTone] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<GeneratedMessage | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isLoadingMessage, setIsLoadingMessage] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerationError, setRegenerationError] = useState('');
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const [favoriteUpdatingId, setFavoriteUpdatingId] = useState<string | null>(null);
  const [showBugReportModal, setShowBugReportModal] = useState(false);

  // Memoize fetchMessages to prevent unnecessary re-renders
  const fetchMessages = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadingError(null);
    
    // Add timeout to prevent infinite loading
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    timeoutId = setTimeout(() => {
      setLoadingError('Loading is taking longer than expected. Please try refreshing the page.');
      setLoading(false);
    }, 10000);

    try {
      const messagesData = await fetchUserMessages(user.id);
      setMessages(messagesData);
      if (timeoutId) clearTimeout(timeoutId);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setLoadingError(error instanceof Error ? error.message : 'Failed to load messages');
      if (timeoutId) clearTimeout(timeoutId);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Check if user is authenticated
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log('Current user:', currentUser);
      
      if (!currentUser) {
        console.error('No user logged in!');
        setLoadingError('Please sign in to view your messages.');
        setLoading(false);
        setMessages([]);
        return;
      }
    };
    
    checkUser();
  }, []);

  useEffect(() => {
    // Only fetch if user exists
    if (user) {
      fetchMessages();
    } else {
      // Clear messages and stop loading if user logs out
      setMessages([]);
      setLoading(false);
      setLoadingError(null);
    }
  }, [user, fetchMessages]);

  // Derive stats from messages so they update when messages change (e.g. after toggling favorite)
  const stats = useMemo((): MessageStats => {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      totalMessages: messages.length,
      monthlyMessages: messages.filter(
        (m) => new Date(m.created_at) >= firstOfMonth
      ).length,
      favoriteCount: messages.filter((m) => m.is_favorite).length,
    };
  }, [messages]);

  // Memoize filtered messages to prevent unnecessary recalculations
  const filteredMessages = useMemo(() => {
    let filtered = [...messages];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          (m.recipient_name ?? '').toLowerCase().includes(query) ||
          m.occasion?.toLowerCase().includes(query) ||
          (m.generated_content ?? '').toLowerCase().includes(query)
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter((m) => m.message_type === filterType);
    }

    if (filterTone !== 'all') {
      filtered = filtered.filter((m) => m.tone === filterTone);
    }

    if (showFavoritesOnly) {
      filtered = filtered.filter((m) => m.is_favorite);
    }

    return filtered;
  }, [messages, searchQuery, filterType, filterTone, showFavoritesOnly]);

  const toggleFavorite = async (messageId: string) => {
    const fromList = messages.find((m) => m.id === messageId);
    const message = fromList ?? (selectedMessage?.id === messageId ? selectedMessage : null);
    if (!message) return;

    setFavoriteError(null);
    setFavoriteUpdatingId(messageId);

    const result = await toggleFavoriteService(messageId, message.is_favorite);

    setFavoriteUpdatingId(null);

    if (!result.success) {
      setFavoriteError('Could not update favorite. Please try again.');
      setTimeout(() => setFavoriteError(null), 4000);
      return;
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, is_favorite: result.newState } : m
      )
    );

    if (selectedMessage?.id === messageId) {
      setSelectedMessage((prev) =>
        prev ? { ...prev, is_favorite: result.newState } : null
      );
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      const { error } = await supabase
        .from('generated_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const openPDFPreview = (_message: GeneratedMessage) => {
    setShowPDFPreview(true);
    // selectedMessage is already set when modal is open, so PDFPreviewModal will use it
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Handle message click - fetch full message details when modal opens
  const handleMessageClick = useCallback(async (messageId: string) => {
    console.log('🔍 Starting message fetch for ID:', messageId);
    console.log('📋 Available messages in state:', messages.length);
    console.log('🔑 Message IDs in state:', messages.map(m => m.id));
    
    setSelectedMessageId(messageId);
    setLoadingError(null);
    
    // Try to get message from local state first
    const localMessage = messages.find(m => m.id === messageId);
    if (localMessage) {
      console.log('✅ Found message in local state:', {
        id: localMessage.id,
        hasContent: !!localMessage.generated_content,
        contentLength: localMessage.generated_content?.length || 0,
        recipient: localMessage.recipient_name
      });
      
      // Ensure generated_content exists
      if (!localMessage.generated_content) {
        console.warn('⚠️ Message found but no generated_content, fetching from DB...');
        // Fall through to fetch from database
      } else {
        setSelectedMessage(localMessage);
        setIsLoadingMessage(false);
        return;
      }
    } else {
      console.log('❌ Message not found in local state, fetching from database...');
    }

    // If not in local state or missing content, fetch from database
    setIsLoadingMessage(true);
    
    try {
      // Check authentication
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        console.error('❌ User not authenticated');
        setLoadingError('User not authenticated');
        setIsLoadingMessage(false);
        return;
      }
      
      console.log('✅ User authenticated:', currentUser.id);
      
      // Fetch message using the helper function
      const messageData = await fetchMessageById(messageId);
      
      console.log('📦 Fetch complete:', { 
        messageData: messageData ? {
          id: messageData.id,
          hasContent: !!messageData.generated_content,
          contentLength: messageData.generated_content?.length || 0,
          recipient: messageData.recipient_name
        } : null
      });
      
      if (messageData) {
        // Log the actual message data structure
        console.log('📋 Message data structure:', {
          id: messageData.id,
          message_type: messageData.message_type,
          recipient_name: messageData.recipient_name,
          generated_content: messageData.generated_content ? `[${messageData.generated_content.length} chars]` : 'MISSING',
          allFields: Object.keys(messageData)
        });
        
        // Check if generated_content is missing or empty
        if (!messageData.generated_content || messageData.generated_content.trim().length === 0) {
          console.error('❌ Message fetched but generated_content is missing or empty!');
          console.error('   Message ID:', messageData.id);
          console.error('   Available fields:', Object.keys(messageData));
          console.error('   Raw data:', messageData);
          
          // Try to get content from input_data if available
          if (messageData.input_data && typeof messageData.input_data === 'object') {
            console.log('   Checking input_data for content...');
          }
          
          setLoadingError(`Message content is missing. Message ID: ${messageData.id}. Please check the database or contact support.`);
          setIsLoadingMessage(false);
          return;
        }
        
        // Ensure recipient_name exists
        if (!messageData.recipient_name) {
          console.warn('⚠️ recipient_name is missing, using fallback');
          messageData.recipient_name = 'Unknown';
        }
        
        setSelectedMessage(messageData);
        // Also update local state if message exists
        setMessages(prev => {
          const exists = prev.find(m => m.id === messageId);
          if (!exists) {
            return [messageData, ...prev];
          } else {
            // Update existing message with fresh data
            return prev.map(m => m.id === messageId ? messageData : m);
          }
        });
        console.log('✅ Message set in state and modal should display');
      } else {
        console.error('❌ Message not found in database');
        setLoadingError('Message not found');
      }
    } catch (error) {
      console.error('❌ Unexpected error loading message:', error);
      setLoadingError('An unexpected error occurred');
    } finally {
      setIsLoadingMessage(false);
    }
  }, [messages]);

  const regenerateMessage = async (messageId: string) => {
    if (!user || !profile) return;

    const REGENERATE_TOKEN_COST = 2;

    if (profile.tokens < REGENERATE_TOKEN_COST) {
      setRegenerationError(`You need ${REGENERATE_TOKEN_COST} tokens to regenerate this message.`);
      setShowTokenModal(true);
      return;
    }

    // Ensure we have the current message content before regenerating
    const currentMessage = messages.find(m => m.id === messageId);
    if (!currentMessage) return;

    setIsRegenerating(true);
    setRegenerationError('');
    
    // Update selected message to show current content while regenerating
    if (selectedMessage?.id === messageId) {
      setSelectedMessage(currentMessage);
    }

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Authentication session expired. Please sign in again.');
      }

      const { data: result, error: invokeError } = await supabase.functions.invoke('regenerate-message', {
        body: {
          messageId: messageId,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (invokeError) {
        if (invokeError.message?.includes('Insufficient tokens') || invokeError.status === 402) {
          const errorData = (invokeError as any).error || {};
          const tokensRequired = errorData.tokens_required ?? REGENERATE_TOKEN_COST;
          setRegenerationError(`Insufficient tokens (${tokensRequired} required). Please purchase more tokens to continue.`);
          setShowTokenModal(true);
          return;
        }
        throw invokeError;
      }

      if (!result || !result.newMessage) {
        throw new Error('No message content returned');
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, generated_content: result.newMessage } : m
        )
      );

      if (selectedMessage?.id === messageId) {
        setSelectedMessage({ ...selectedMessage, generated_content: result.newMessage });
      }

      await auth?.refreshProfile();

      setRegenerationError('');
    } catch (err) {
      console.error('Error regenerating message:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to regenerate message';
      setRegenerationError(errorMessage);
    } finally {
      setIsRegenerating(false);
    }
  };

  // Show loading state with timeout handling
  if (loading && !loadingError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#CC4F4E] animate-spin mx-auto mb-4" />
          <div className="text-text-light">Loading your messages...</div>
        </div>
      </div>
    );
  }

  // Show error state if loading failed
  if (loadingError && messages.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">{loadingError}</div>
          <button
            onClick={() => {
              setLoadingError(null);
              fetchMessages();
            }}
            className="px-6 py-3 bg-[#CC4F4E] text-white rounded-lg hover:opacity-90 transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-text-dark mb-2">Your Dashboard</h1>
        <p className="text-text-light">Manage and view all your generated messages</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-panel border border-border rounded-lg p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[#CC4F4E] bg-opacity-10 rounded-lg">
              <Sparkles className="w-5 h-5 text-[#CC4F4E]" />
            </div>
            <span className="text-text-light text-sm">Token Balance</span>
          </div>
          <p className="text-3xl font-bold text-text-dark">{profile?.tokens || 0}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-panel border border-border rounded-lg p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500 bg-opacity-10 rounded-lg">
              <MessageSquare className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-text-light text-sm">Total Messages</span>
          </div>
          <p className="text-3xl font-bold text-text-dark">{stats.totalMessages}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-panel border border-border rounded-lg p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500 bg-opacity-10 rounded-lg">
              <Calendar className="w-5 h-5 text-green-500" />
            </div>
            <span className="text-text-light text-sm">This Month</span>
          </div>
          <p className="text-3xl font-bold text-text-dark">{stats.monthlyMessages}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-panel border border-border rounded-lg p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-pink-500 bg-opacity-10 rounded-lg">
              <Heart className="w-5 h-5 text-pink-500" />
            </div>
            <span className="text-text-light text-sm">Favorites</span>
          </div>
          <p className="text-3xl font-bold text-text-dark">{stats.favoriteCount}</p>
        </motion.div>
      </div>

      <div className="bg-panel border border-border rounded-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light" />
            <input
              type="text"
              placeholder="Search by recipient name or occasion..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-text-dark placeholder-text-light focus:outline-none focus:border-[#CC4F4E]"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-lg text-text-dark focus:outline-none focus:border-[#CC4F4E]"
            >
              <option value="all">All Types</option>
              <option value="poem">Poem</option>
              <option value="letter">Letter</option>
              <option value="apology">Apology</option>
              <option value="text">Text</option>
              <option value="giftcard">Gift Card</option>
            </select>

            <select
              value={filterTone}
              onChange={(e) => setFilterTone(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-lg text-text-dark focus:outline-none focus:border-[#CC4F4E]"
            >
              <option value="all">All Tones</option>
              <option value="romantic">Romantic</option>
              <option value="heartfelt">Heartfelt</option>
              <option value="honest">Honest</option>
              <option value="apologetic">Apologetic</option>
              <option value="humorous">Humorous</option>
            </select>

            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                showFavoritesOnly
                  ? 'bg-pink-500 text-white'
                  : 'bg-background border border-border text-text-dark hover:border-pink-500'
              }`}
            >
              <Heart className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
              <span className="hidden md:inline">Favorites</span>
            </button>
          </div>
        </div>

        {favoriteError && (
          <div className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 text-sm">
            {favoriteError}
          </div>
        )}

        {filteredMessages.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-text-light mx-auto mb-4" />
            <p className="text-text-light">
              {messages.length === 0
                ? 'No messages yet. Create your first message to get started!'
                : 'No messages match your filters.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMessages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleMessageClick(message.id)}
                className="bg-background border border-border rounded-lg p-4 cursor-pointer hover:border-[#CC4F4E] transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-text-dark mb-1">
                      {message.recipient_name ?? 'Unknown'}
                    </h3>
                    <div className="flex gap-2">
                      <span className="text-xs px-2 py-1 bg-[#CC4F4E] bg-opacity-10 text-[#CC4F4E] rounded">
                        {getMessageTypeLabel(message.message_type)}
                      </span>
                      <span className="text-xs px-2 py-1 bg-blue-500 bg-opacity-10 text-blue-500 rounded">
                        {message.tone ?? ''}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      toggleFavorite(message.id);
                    }}
                    disabled={favoriteUpdatingId === message.id}
                    aria-label={message.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                    className="p-2 rounded-full bg-transparent border-none cursor-pointer flex items-center justify-center transition-all text-pink-500 hover:scale-110 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Heart
                      className={`w-5 h-5 transition-all ${
                        message.is_favorite
                          ? 'fill-red-500 text-red-500'
                          : 'text-gray-400 hover:text-red-500'
                      }`}
                    />
                  </button>
                </div>

                <p className="text-text-light text-sm line-clamp-3 mb-3 message-text">
                  {message.generated_content ?? message.output_text ?? ''}
                </p>

                <div className="flex items-center justify-between text-xs text-text-light">
                  <span>{formatDate(message.created_at)}</span>
                  {message.is_preview && (
                    <span className="px-2 py-1 bg-green-500 bg-opacity-10 text-green-500 rounded">
                      Unlocked
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {(selectedMessage || selectedMessageId) && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => {
            setSelectedMessage(null);
            setSelectedMessageId(null);
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-panel border border-border rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
          >
            {/* Message Header - Only show if message is loaded */}
            {selectedMessage && (
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-text-dark mb-2">
                    Message for {selectedMessage.recipient_name || 'Unknown'}
                  </h2>
                  <div className="flex gap-2 mb-2">
                    <span className="text-sm px-3 py-1 bg-[#CC4F4E] bg-opacity-10 text-[#CC4F4E] rounded">
                      {getMessageTypeLabel(selectedMessage.message_type)}
                    </span>
                    <span className="text-sm px-3 py-1 bg-blue-500 bg-opacity-10 text-blue-500 rounded">
                      {selectedMessage.tone}
                    </span>
                    {selectedMessage.is_preview && (
                      <span className="text-sm px-3 py-1 bg-green-500 bg-opacity-10 text-green-500 rounded">
                        Unlocked from Preview
                      </span>
                    )}
                    {selectedMessage.paid && (
                      <span className="text-sm px-3 py-1 bg-yellow-500 bg-opacity-10 text-yellow-500 rounded">
                        Premium
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    toggleFavorite(selectedMessage.id);
                  }}
                  disabled={favoriteUpdatingId === selectedMessage.id}
                  aria-label={selectedMessage.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                  className="p-2 rounded-full bg-transparent border-none cursor-pointer flex items-center justify-center transition-all text-pink-500 hover:scale-110 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Heart
                    className={`w-6 h-6 transition-all ${
                      selectedMessage.is_favorite
                        ? 'fill-red-500 text-red-500'
                        : 'text-gray-400 hover:text-red-500'
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Error Display */}
            {loadingError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                <p className="font-bold">Error: {loadingError}</p>
                {selectedMessageId && (
                  <p className="text-sm mt-1">Message ID: {selectedMessageId}</p>
                )}
              </div>
            )}

            <div className="bg-background border border-border rounded-lg p-4 mb-4 min-h-[200px]">
              {isLoadingMessage ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-12 h-12 text-[#CC4F4E] animate-spin mb-4" />
                  <p className="text-text-light">Loading message...</p>
                </div>
              ) : isRegenerating ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-12 h-12 text-[#CC4F4E] animate-spin mb-4" />
                  <p className="text-text-light">Regenerating your message...</p>
                </div>
              ) : selectedMessage ? (
                <>
                  <div className="message-text">
                    <p className="text-text-dark whitespace-pre-wrap leading-relaxed">
                      {selectedMessage.generated_content || selectedMessage.output_text || 'No content available'}
                    </p>
                  </div>
                  {selectedMessage.template_url && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-sm text-text-light mb-2">Template Preview:</p>
                      <img 
                        src={selectedMessage.template_url} 
                        alt="Background template"
                        className="w-full h-auto rounded-lg"
                      />
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t border-border text-sm text-text-light">
                    <p>Created: {new Date(selectedMessage.created_at).toLocaleDateString()}</p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-text-light">No content available</p>
                  {selectedMessageId && (
                    <p className="text-sm text-text-light mt-2">Message ID: {selectedMessageId}</p>
                  )}
                </div>
              )}
            </div>

            {regenerationError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500 bg-opacity-10 border border-red-500 rounded-lg p-3 mb-4"
              >
                <p className="text-red-500 text-sm">{regenerationError}</p>
              </motion.div>
            )}

            {selectedMessage && (
              <div className="bg-background border border-border rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <RotateCcw className="w-5 h-5 text-text-light" />
                    <div>
                      <p className="text-sm font-medium text-text-dark">Need a different version?</p>
                      <p className="text-xs text-text-light">Costs 2 tokens to regenerate</p>
                    </div>
                  </div>
                  <button
                    onClick={() => regenerateMessage(selectedMessage.id)}
                    disabled={isRegenerating || !profile || profile.tokens < 2}
                    className="px-4 py-2 bg-[#CC4F4E] text-black rounded-lg hover:opacity-90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isRegenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        Regenerate
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {selectedMessage && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => copyToClipboard(selectedMessage.generated_content || selectedMessage.output_text || '')}
                  className="px-4 py-2 bg-[#CC4F4E] text-black rounded-lg hover:opacity-90 transition-all font-medium"
                >
                  Copy to Clipboard
                </button>
                {(selectedMessage.message_type === 'letter' || selectedMessage.message_type === 'love_letter' || selectedMessage.message_type === 'giftcard') && (
                  <button
                    onClick={() => openPDFPreview(selectedMessage)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:opacity-90 transition-all font-medium"
                  >
                    Download PDF
                  </button>
                )}
                <button
                  onClick={() => deleteMessage(selectedMessage.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:opacity-90 transition-all font-medium"
                >
                  Delete
                </button>
                <button
                  onClick={() => {
                    setSelectedMessage(null);
                    setSelectedMessageId(null);
                  }}
                  className="px-4 py-2 bg-background border border-border text-text-dark rounded-lg hover:border-[#CC4F4E] transition-all font-medium ml-auto"
                >
                  Close
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      <TokenPurchaseModal
        isOpen={showTokenModal}
        onClose={() => {
          setShowTokenModal(false);
          setRegenerationError('');
        }}
        currentTokens={profile?.tokens || 0}
      />

      {showPDFPreview && selectedMessage && (
        <PDFPreviewModal
          isOpen={showPDFPreview}
          onClose={() => setShowPDFPreview(false)}
          message={selectedMessage.generated_content || selectedMessage.output_text || ''}
          templateUrl={selectedMessage.template_url || undefined}
          recipientName={selectedMessage.recipient_name}
          messageType={selectedMessage.message_type}
        />
      )}

      <motion.button
        type="button"
        onClick={() => setShowBugReportModal(true)}
        className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-full bg-[#CC4F4E] text-white shadow-lg hover:shadow-xl z-40 focus:outline-none focus:ring-2 focus:ring-[#CC4F4E] focus:ring-offset-2 focus:ring-offset-background"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Report a bug or get help"
        title="Report a bug or get help"
      >
        <Bug className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium whitespace-nowrap">Need help?</span>
      </motion.button>

      <BugReportModal
        isOpen={showBugReportModal}
        onClose={() => setShowBugReportModal(false)}
        userEmail={profile?.email ?? user?.email ?? ''}
      />
    </div>
  );
}
