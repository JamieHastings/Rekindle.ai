import React, { useEffect, useState } from 'react';
import { Users, DollarSign, FileText, TrendingUp, Star } from 'lucide-react';
import { supabase, UserFeedback, Profile } from '../../lib/supabase';

interface DashboardStats {
  totalUsers: number;
  totalRevenue: number;
  totalTemplates: number;
  totalMessages: number;
  newUsersThisMonth: number;
  revenueThisMonth: number;
  totalFeedback: number;
  averageRating: number;
}

interface RecentFeedbackItem extends UserFeedback {
  user_email?: string;
}

export const AdminDashboardView: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalRevenue: 0,
    totalTemplates: 0,
    totalMessages: 0,
    newUsersThisMonth: 0,
    revenueThisMonth: 0,
    totalFeedback: 0,
    averageRating: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentFeedback, setRecentFeedback] = useState<RecentFeedbackItem[]>([]);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        usersResult,
        templatesResult,
        messagesResult,
        paymentsResult,
        newUsersResult,
        recentPaymentsResult,
        feedbackResult,
        feedbackData,
        recentFeedbackResult
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('design_templates').select('id', { count: 'exact', head: true }),
        supabase.from('generated_messages').select('id', { count: 'exact', head: true }),
        supabase.from('stripe_payments').select('amount_cents').eq('status', 'succeeded'),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', firstOfMonth.toISOString()),
        supabase
          .from('stripe_payments')
          .select('amount_cents')
          .eq('status', 'succeeded')
          .gte('created_at', firstOfMonth.toISOString()),
        supabase.from('user_feedback').select('id', { count: 'exact', head: true }),
        supabase.from('user_feedback').select('rating'),
        supabase
          .from('user_feedback')
          .select('*, user_id')
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      const totalRevenue = paymentsResult.data?.reduce((sum, p) => sum + (p.amount_cents || 0), 0) || 0;
      const revenueThisMonth = recentPaymentsResult.data?.reduce((sum, p) => sum + (p.amount_cents || 0), 0) || 0;

      const averageRating = feedbackData.data && feedbackData.data.length > 0
        ? feedbackData.data.reduce((sum, f) => sum + f.rating, 0) / feedbackData.data.length
        : 0;

      if (recentFeedbackResult.data) {
        const feedbackWithEmails = await Promise.all(
          recentFeedbackResult.data.map(async (feedback) => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', feedback.user_id)
              .single();
            return { ...feedback, user_email: profileData?.email };
          })
        );
        setRecentFeedback(feedbackWithEmails);
      }

      setStats({
        totalUsers: usersResult.count || 0,
        totalTemplates: templatesResult.count || 0,
        totalMessages: messagesResult.count || 0,
        totalRevenue: totalRevenue / 100,
        newUsersThisMonth: newUsersResult.count || 0,
        revenueThisMonth: revenueThisMonth / 100,
        totalFeedback: feedbackResult.count || 0,
        averageRating,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[#F3DADA]">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Dashboard Overview</h2>
        <p className="text-[#F3DADA]">Welcome to the Rekindle.ai admin dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white/5 rounded-lg p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-sm text-[#F3DADA]">+{stats.newUsersThisMonth} this month</span>
          </div>
          <h3 className="text-2xl font-bold mb-1">{stats.totalUsers}</h3>
          <p className="text-[#F3DADA] text-sm">Total Users</p>
        </div>

        <div className="bg-white/5 rounded-lg p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            <span className="text-sm text-[#F3DADA]">${stats.revenueThisMonth.toFixed(2)} this month</span>
          </div>
          <h3 className="text-2xl font-bold mb-1">${stats.totalRevenue.toFixed(2)}</h3>
          <p className="text-[#F3DADA] text-sm">Total Revenue</p>
        </div>

        <div className="bg-white/5 rounded-lg p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <FileText className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-1">{stats.totalTemplates}</h3>
          <p className="text-[#F3DADA] text-sm">Active Templates</p>
        </div>

        <div className="bg-white/5 rounded-lg p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-500/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-1">{stats.totalMessages}</h3>
          <p className="text-[#F3DADA] text-sm">Messages Generated</p>
        </div>

        <div className="bg-white/5 rounded-lg p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <Star className="w-6 h-6 text-yellow-400" />
            </div>
            <span className="text-sm text-[#F3DADA]">{stats.totalFeedback} reviews</span>
          </div>
          <h3 className="text-2xl font-bold mb-1">{stats.averageRating.toFixed(1)} / 5.0</h3>
          <p className="text-[#F3DADA] text-sm">Average Rating</p>
        </div>
      </div>

      <div className="bg-white/5 rounded-lg p-6 border border-white/10">
        <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-left">
            <div className="font-medium mb-1">Manage Users</div>
            <div className="text-sm text-[#F3DADA]">View and manage user accounts</div>
          </button>
          <button className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-left">
            <div className="font-medium mb-1">View Analytics</div>
            <div className="text-sm text-[#F3DADA]">Check sales and usage metrics</div>
          </button>
          <button className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-left">
            <div className="font-medium mb-1">Upload Template</div>
            <div className="text-sm text-[#F3DADA]">Add new design templates</div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 rounded-lg p-6 border border-white/10">
          <h3 className="text-xl font-bold mb-4">Recent Feedback</h3>
          {recentFeedback.length === 0 ? (
            <p className="text-[#F3DADA] text-sm">No feedback yet</p>
          ) : (
            <div className="space-y-3">
              {recentFeedback.map((feedback) => (
                <div key={feedback.id} className="py-2 border-b border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{feedback.user_email || 'Unknown User'}</span>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={i < feedback.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}
                        />
                      ))}
                    </div>
                  </div>
                  {feedback.comment && (
                    <p className="text-[#F3DADA] text-sm line-clamp-2">{feedback.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white/5 rounded-lg p-6 border border-white/10">
          <h3 className="text-xl font-bold mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[#F3DADA]">Database</span>
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">Healthy</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#F3DADA]">Storage</span>
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">Healthy</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#F3DADA]">API Status</span>
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">Operational</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
