import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Heart, Calendar, MessageSquare, Sparkles, RotateCcw, Loader2, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import TokenPurchaseModal from '../../components/TokenPurchaseModal';

interface GeneratedMessage {
  id: string;
  recipient_name: string;
  message_type: string;
  tone: string;
  generated_content: string;
  created_at: string;
  is_favorite: boolean;
  is_preview?: boolean;
  occasion?: string;
  user_id: string;
  input_data?: Record<string, unknown>;
  profiles?: {
    email: string;
  };
}

function normalizeAdminMessage(row: any): GeneratedMessage {
  const input = row.input_data || {};
  return {
    ...row,
    recipient_name: row.recipient_name ?? input.recipientName ?? input.name ?? input.loverName ?? 'Unknown',
    occasion: row.occasion ?? input.occasion,
  };
}

interface MessageStats {
  totalMessages: number;
  monthlyMessages: number;
  totalUsers: number;
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

export const AdminMessagesView = () => {
  const auth = useAuth();
  const user = auth?.user;
  const profile = auth?.profile;
  const [messages, setMessages] = useState<GeneratedMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<GeneratedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterTone, setFilterTone] = useState<string>('all');
  const [selectedMessage, setSelectedMessage] = useState<GeneratedMessage | null>(null);
  const [stats, setStats] = useState<MessageStats>({
    totalMessages: 0,
    monthlyMessages: 0,
    totalUsers: 0,
  });
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerationError, setRegenerationError] = useState('');

  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [messages, searchQuery, filterType, filterTone]);

  const fetchMessages = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('generated_messages')
        .select(`
          *,
          profiles(email)
        `)
        .eq('is_preview', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMessages((data || []).map(normalizeAdminMessage));
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (msgs: GeneratedMessage[]) => {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const uniqueUsers = new Set(msgs.map(m => m.user_id));

    setStats({
      totalMessages: msgs.length,
      monthlyMessages: msgs.filter(
        (m) => new Date(m.created_at) >= firstOfMonth
      ).length,
      totalUsers: uniqueUsers.size,
    });
  };

  const applyFilters = () => {
    let filtered = [...messages];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.recipient_name.toLowerCase().includes(query) ||
          m.occasion?.toLowerCase().includes(query) ||
          m.profiles?.email.toLowerCase().includes(query)
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter((m) => m.message_type === filterType);
    }

    if (filterTone !== 'all') {
      filtered = filtered.filter((m) => m.tone === filterTone);
    }

    setFilteredMessages(filtered);
  };

  const toggleFavorite = async (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    const newFavoriteStatus = !message.is_favorite;

    try {
      const { error } = await supabase
        .from('generated_messages')
        .update({ is_favorite: newFavoriteStatus })
        .eq('id', messageId);

      if (error) throw error;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, is_favorite: newFavoriteStatus } : m
        )
      );

      if (selectedMessage?.id === messageId) {
        setSelectedMessage({ ...selectedMessage, is_favorite: newFavoriteStatus });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
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

  const downloadMessage = (message: GeneratedMessage) => {
    const blob = new Blob([message.generated_content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `message-${message.recipient_name}-${new Date(message.created_at).toLocaleDateString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const regenerateMessage = async (messageId: string) => {
    if (!user || !profile) return;

    const REGENERATE_TOKEN_COST = 2;

    setIsRegenerating(true);
    setRegenerationError('');

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

      setRegenerationError('');
    } catch (err) {
      console.error('Error regenerating message:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to regenerate message';
      setRegenerationError(errorMessage);
    } finally {
      setIsRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#F3DADA]">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold mb-2">Message History</h1>
        <p className="text-[#F3DADA]">View and manage all generated messages</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[#CC4F4E] bg-opacity-20 rounded-lg">
              <MessageSquare className="w-5 h-5 text-[#F3DADA]" />
            </div>
            <span className="text-[#F3DADA] text-sm">Total Messages</span>
          </div>
          <p className="text-3xl font-bold">{stats.totalMessages}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500 bg-opacity-20 rounded-lg">
              <Calendar className="w-5 h-5 text-[#F3DADA]" />
            </div>
            <span className="text-[#F3DADA] text-sm">This Month</span>
          </div>
          <p className="text-3xl font-bold">{stats.monthlyMessages}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500 bg-opacity-20 rounded-lg">
              <User className="w-5 h-5 text-[#F3DADA]" />
            </div>
            <span className="text-[#F3DADA] text-sm">Active Users</span>
          </div>
          <p className="text-3xl font-bold">{stats.totalUsers}</p>
        </motion.div>
      </div>

      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#F3DADA]" />
            <input
              type="text"
              placeholder="Search by recipient, occasion, or user email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-[#F3DADA] focus:outline-none focus:border-[#CC4F4E]"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#CC4F4E]"
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
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-[#CC4F4E]"
            >
              <option value="all">All Tones</option>
              <option value="romantic">Romantic</option>
              <option value="heartfelt">Heartfelt</option>
              <option value="honest">Honest</option>
              <option value="apologetic">Apologetic</option>
              <option value="humorous">Humorous</option>
            </select>
          </div>
        </div>

        {filteredMessages.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-[#F3DADA] mx-auto mb-4" />
            <p className="text-[#F3DADA]">
              {messages.length === 0
                ? 'No messages yet.'
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
                onClick={() => setSelectedMessage(message)}
                className="bg-white/5 border border-white/20 rounded-lg p-4 cursor-pointer hover:border-[#CC4F4E] transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold mb-1">
                      {message.recipient_name}
                    </h3>
                    <p className="text-xs text-[#F3DADA] mb-2">
                      <User className="w-3 h-3 inline mr-1" />
                      {message.profiles?.email || 'Unknown user'}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-xs px-2 py-1 bg-[#CC4F4E] bg-opacity-20 text-[#F3DADA] rounded">
                        {getMessageTypeLabel(message.message_type)}
                      </span>
                      <span className="text-xs px-2 py-1 bg-blue-500 bg-opacity-20 text-[#F3DADA] rounded">
                        {message.tone}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(message.id);
                    }}
                    className="text-pink-500 hover:scale-110 transition-transform"
                  >
                    <Heart
                      className={`w-5 h-5 ${message.is_favorite ? 'fill-current' : ''}`}
                    />
                  </button>
                </div>

                <p className="text-[#F3DADA] text-sm line-clamp-3 mb-3">
                  {message.generated_content}
                </p>

                <div className="flex items-center justify-between text-xs text-[#F3DADA]">
                  <span>{formatDate(message.created_at)}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {selectedMessage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedMessage(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#471212] border border-white/20 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  Message for {selectedMessage.recipient_name}
                </h2>
                <p className="text-sm text-[#F3DADA] mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  User: {selectedMessage.profiles?.email || 'Unknown'}
                </p>
                <div className="flex gap-2 mb-2">
                  <span className="text-sm px-3 py-1 bg-[#CC4F4E] bg-opacity-20 text-[#F3DADA] rounded">
                    {getMessageTypeLabel(selectedMessage.message_type)}
                  </span>
                  <span className="text-sm px-3 py-1 bg-blue-500 bg-opacity-20 text-[#F3DADA] rounded">
                    {selectedMessage.tone}
                  </span>
                </div>
              </div>
              <button
                onClick={() => toggleFavorite(selectedMessage.id)}
                className="text-pink-500 hover:scale-110 transition-transform"
              >
                <Heart
                  className={`w-6 h-6 ${selectedMessage.is_favorite ? 'fill-current' : ''}`}
                />
              </button>
            </div>

            <div className="bg-white/5 border border-white/20 rounded-lg p-4 mb-4">
              <AnimatePresence mode="wait">
                {isRegenerating ? (
                  <motion.div
                    key="regenerating"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-8"
                  >
                    <Loader2 className="w-12 h-12 text-[#CC4F4E] animate-spin mb-4" />
                    <p className="text-[#F3DADA]">Regenerating message...</p>
                  </motion.div>
                ) : (
                  <motion.p
                    key="content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-white whitespace-pre-wrap leading-relaxed"
                  >
                    {selectedMessage.generated_content}
                  </motion.p>
                )}
              </AnimatePresence>
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

            <div className="bg-white/5 border border-white/20 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RotateCcw className="w-5 h-5 text-[#F3DADA]" />
                  <div>
                    <p className="text-sm font-medium">Need a different version?</p>
                    <p className="text-xs text-[#F3DADA]">Admin regeneration (no token cost)</p>
                  </div>
                </div>
                <button
                  onClick={() => regenerateMessage(selectedMessage.id)}
                  disabled={isRegenerating}
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

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => copyToClipboard(selectedMessage.generated_content)}
                className="px-4 py-2 bg-[#CC4F4E] text-black rounded-lg hover:opacity-90 transition-all font-medium"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => downloadMessage(selectedMessage)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:opacity-90 transition-all font-medium"
              >
                Download
              </button>
              <button
                onClick={() => deleteMessage(selectedMessage.id)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:opacity-90 transition-all font-medium"
              >
                Delete
              </button>
              <button
                onClick={() => setSelectedMessage(null)}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg hover:border-[#CC4F4E] transition-all font-medium ml-auto"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
