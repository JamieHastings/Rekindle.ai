import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Heart, Calendar, MessageSquare, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

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
}

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
    'apology': 'Apology',
    'rekindling': 'Rekindling Message',
    'text': 'Text Message',
    'giftcard': 'Gift Card',
    'voicenote': 'Voice Note',
    'birthday': 'Birthday Message',
    'support': 'Support Message',
    'closure': 'Closure Message',
  };
  
  return labels[type] || type; // Fallback to the type itself
};

export default function Dashboard() {
  const auth = useAuth();
  const user = auth?.user;
  const profile = auth?.profile;
  const [messages, setMessages] = useState<GeneratedMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<GeneratedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterTone, setFilterTone] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<GeneratedMessage | null>(null);
  const [stats, setStats] = useState<MessageStats>({
    totalMessages: 0,
    monthlyMessages: 0,
    favoriteCount: 0,
  });

  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [messages, searchQuery, filterType, filterTone, showFavoritesOnly]);

  const fetchMessages = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('generated_messages')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_preview', false) // Only show full messages, not previews
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMessages(data || []);
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

    setStats({
      totalMessages: msgs.length,
      monthlyMessages: msgs.filter(
        (m) => new Date(m.created_at) >= firstOfMonth
      ).length,
      favoriteCount: msgs.filter((m) => m.is_favorite).length,
    });
  };

  const applyFilters = () => {
    let filtered = [...messages];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.recipient_name.toLowerCase().includes(query) ||
          m.occasion?.toLowerCase().includes(query)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-text-light">Loading your messages...</div>
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
                onClick={() => setSelectedMessage(message)}
                className="bg-background border border-border rounded-lg p-4 cursor-pointer hover:border-[#CC4F4E] transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-text-dark mb-1">
                      {message.recipient_name}
                    </h3>
                    <div className="flex gap-2">
                      <span className="text-xs px-2 py-1 bg-[#CC4F4E] bg-opacity-10 text-[#CC4F4E] rounded">
                        {getMessageTypeLabel(message.message_type)}
                      </span>
                      <span className="text-xs px-2 py-1 bg-blue-500 bg-opacity-10 text-blue-500 rounded">
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

                <p className="text-text-light text-sm line-clamp-3 mb-3">
                  {message.generated_content}
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

      {selectedMessage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedMessage(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-panel border border-border rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-text-dark mb-2">
                  Message for {selectedMessage.recipient_name}
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

            <div className="bg-background border border-border rounded-lg p-4 mb-4">
              <p className="text-text-dark whitespace-pre-wrap leading-relaxed">
                {selectedMessage.generated_content}
              </p>
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
                className="px-4 py-2 bg-background border border-border text-text-dark rounded-lg hover:border-[#CC4F4E] transition-all font-medium ml-auto"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
