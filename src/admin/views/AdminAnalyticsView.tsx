import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, ShoppingCart, Users as UsersIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Payment {
  id: string;
  user_id: string;
  amount_cents: number;
  status: string;
  token_count: number;
  created_at: string;
}

interface AnalyticsData {
  totalRevenue: number;
  totalPurchases: number;
  averageOrderValue: number;
  revenueByMonth: { month: string; revenue: number }[];
  topPurchasers: { email: string; totalSpent: number }[];
}

export const AdminAnalyticsView: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalRevenue: 0,
    totalPurchases: 0,
    averageOrderValue: 0,
    revenueByMonth: [],
    topPurchasers: [],
  });
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data: paymentsData, error } = await supabase
        .from('stripe_payments')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const payments = paymentsData || [];
      setPayments(payments);

      const totalRevenue = payments.reduce((sum, p) => sum + (p.amount_cents || 0), 0) / 100;
      const totalPurchases = payments.length;
      const averageOrderValue = totalPurchases > 0 ? totalRevenue / totalPurchases : 0;

      const revenueByMonth = calculateRevenueByMonth(payments);

      setAnalytics({
        totalRevenue,
        totalPurchases,
        averageOrderValue,
        revenueByMonth,
        topPurchasers: [],
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRevenueByMonth = (payments: Payment[]) => {
    const monthlyData: { [key: string]: number } = {};

    payments.forEach(payment => {
      const date = new Date(payment.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = 0;
      }
      monthlyData[monthKey] += (payment.amount_cents || 0) / 100;
    });

    return Object.entries(monthlyData)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, revenue]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue,
      }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[#F3DADA]">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Sales & Analytics</h2>
        <p className="text-[#F3DADA]">Track revenue, purchases, and user engagement</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 rounded-lg p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <h3 className="text-3xl font-bold mb-1">${analytics.totalRevenue.toFixed(2)}</h3>
          <p className="text-[#F3DADA] text-sm">Total Revenue</p>
        </div>

        <div className="bg-white/5 rounded-lg p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <h3 className="text-3xl font-bold mb-1">{analytics.totalPurchases}</h3>
          <p className="text-[#F3DADA] text-sm">Total Purchases</p>
        </div>

        <div className="bg-white/5 rounded-lg p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <h3 className="text-3xl font-bold mb-1">${analytics.averageOrderValue.toFixed(2)}</h3>
          <p className="text-[#F3DADA] text-sm">Average Order Value</p>
        </div>
      </div>

      <div className="bg-white/5 rounded-lg p-6 border border-white/10">
        <h3 className="text-xl font-bold mb-4">Revenue by Month</h3>
        <div className="space-y-3">
          {analytics.revenueByMonth.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-[#F3DADA]">{item.month}</span>
              <div className="flex items-center gap-4">
                <div className="w-48 bg-white/10 rounded-full h-2">
                  <div
                    className="bg-green-400 h-2 rounded-full"
                    style={{
                      width: `${Math.min((item.revenue / Math.max(...analytics.revenueByMonth.map(m => m.revenue))) * 100, 100)}%`,
                    }}
                  />
                </div>
                <span className="text-white font-medium w-20 text-right">${item.revenue.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white/5 rounded-lg p-6 border border-white/10">
        <h3 className="text-xl font-bold mb-4">Recent Payments</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[#F3DADA] border-b border-white/10">
              <tr>
                <th className="pb-3">Payment ID</th>
                <th className="pb-3">User ID</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Tokens</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.slice(0, 10).map((payment) => (
                <tr key={payment.id} className="border-b border-white/5">
                  <td className="py-3 truncate max-w-[100px]">{payment.id.substring(0, 8)}...</td>
                  <td className="py-3 truncate max-w-[100px]">{payment.user_id.substring(0, 8)}...</td>
                  <td className="py-3 font-medium">${(payment.amount_cents / 100).toFixed(2)}</td>
                  <td className="py-3">{payment.token_count || 0}</td>
                  <td className="py-3">
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                      {payment.status}
                    </span>
                  </td>
                  <td className="py-3 text-[#F3DADA]">
                    {new Date(payment.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 rounded-lg p-6 border border-white/10">
          <h3 className="text-xl font-bold mb-4">Content Usage</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[#F3DADA]">Total Messages Generated</span>
              <span className="text-xl font-bold">-</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#F3DADA]">Average per User</span>
              <span className="text-xl font-bold">-</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#F3DADA]">Most Popular Type</span>
              <span className="text-xl font-bold">-</span>
            </div>
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-6 border border-white/10">
          <h3 className="text-xl font-bold mb-4">Template Analytics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[#F3DADA]">Total Templates</span>
              <span className="text-xl font-bold">-</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#F3DADA]">Most Used Template</span>
              <span className="text-xl font-bold">-</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#F3DADA]">Templates Added This Month</span>
              <span className="text-xl font-bold">-</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
