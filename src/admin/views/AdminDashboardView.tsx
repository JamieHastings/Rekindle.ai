import React, { useEffect, useState } from 'react';
import { Users, DollarSign, FileText, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DashboardStats {
  totalUsers: number;
  totalRevenue: number;
  totalTemplates: number;
  totalMessages: number;
  newUsersThisMonth: number;
  revenueThisMonth: number;
}

export const AdminDashboardView: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalRevenue: 0,
    totalTemplates: 0,
    totalMessages: 0,
    newUsersThisMonth: 0,
    revenueThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [usersResult, templatesResult, messagesResult, paymentsResult, newUsersResult, recentPaymentsResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('message_templates').select('id', { count: 'exact', head: true }),
        supabase.from('generated_messages').select('id', { count: 'exact', head: true }),
        supabase.from('stripe_payments').select('amount_cents').eq('status', 'completed'),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', firstOfMonth.toISOString()),
        supabase
          .from('stripe_payments')
          .select('amount_cents')
          .eq('status', 'completed')
          .gte('created_at', firstOfMonth.toISOString()),
      ]);

      const totalRevenue = paymentsResult.data?.reduce((sum, p) => sum + (p.amount_cents || 0), 0) || 0;
      const revenueThisMonth = recentPaymentsResult.data?.reduce((sum, p) => sum + (p.amount_cents || 0), 0) || 0;

      setStats({
        totalUsers: usersResult.count || 0,
        totalTemplates: templatesResult.count || 0,
        totalMessages: messagesResult.count || 0,
        totalRevenue: totalRevenue / 100,
        newUsersThisMonth: newUsersResult.count || 0,
        revenueThisMonth: revenueThisMonth / 100,
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span className="text-[#F3DADA]">New user registration</span>
              <span className="text-sm">Just now</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span className="text-[#F3DADA]">Payment received</span>
              <span className="text-sm">5 min ago</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span className="text-[#F3DADA]">Template uploaded</span>
              <span className="text-sm">1 hour ago</span>
            </div>
          </div>
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
