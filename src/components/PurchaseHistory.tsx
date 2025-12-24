import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { supabase, TokenTransaction, StripePayment } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function PurchaseHistory() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [payments, setPayments] = useState<StripePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPurchased, setTotalPurchased] = useState(0);
  const [totalUsed, setTotalUsed] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [transactionsResult, paymentsResult] = await Promise.all([
        supabase
          .from('token_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('stripe_payments')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      if (transactionsResult.data) {
        setTransactions(transactionsResult.data);

        const purchased = transactionsResult.data
          .filter(t => t.transaction_type === 'purchase')
          .reduce((sum, t) => sum + t.amount, 0);

        const used = Math.abs(
          transactionsResult.data
            .filter(t => t.transaction_type === 'usage')
            .reduce((sum, t) => sum + t.amount, 0)
        );

        setTotalPurchased(purchased);
        setTotalUsed(used);
      }

      if (paymentsResult.data) {
        setPayments(paymentsResult.data);

        const spent = paymentsResult.data
          .filter(p => p.status === 'succeeded')
          .reduce((sum, p) => sum + p.amount_cents, 0) / 100;

        setTotalSpent(spent);
      }
    } catch (error) {
      console.error('Error fetching purchase history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'usage':
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      case 'refund':
        return <RefreshCw className="w-5 h-5 text-blue-500" />;
      default:
        return <DollarSign className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'text-green-500';
      case 'usage':
        return 'text-red-500';
      case 'refund':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading purchase history...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Purchase History</h2>
        <p className="text-gray-600">View your token transactions and payment history</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg p-6 border border-gray-200"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500 bg-opacity-10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <span className="text-gray-600 text-sm">Tokens Purchased</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalPurchased}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg p-6 border border-gray-200"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500 bg-opacity-10 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-500" />
            </div>
            <span className="text-gray-600 text-sm">Tokens Used</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalUsed}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg p-6 border border-gray-200"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[#CC4F4E] bg-opacity-10 rounded-lg">
              <DollarSign className="w-5 h-5 text-[#CC4F4E]" />
            </div>
            <span className="text-gray-600 text-sm">Total Spent</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">${totalSpent.toFixed(2)}</p>
        </motion.div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction History</h3>
          {transactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction, index) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white rounded-lg">
                      {getTransactionIcon(transaction.transaction_type)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{transaction.description}</p>
                      <p className="text-sm text-gray-500">{formatDate(transaction.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-semibold ${getTransactionColor(transaction.transaction_type)}`}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount} tokens
                    </p>
                    <p className="text-sm text-gray-500 capitalize">{transaction.transaction_type}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {payments.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
            <div className="space-y-3">
              {payments.map((payment, index) => (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{payment.token_count} tokens</p>
                    <p className="text-sm text-gray-500">{formatDate(payment.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">
                      ${(payment.amount_cents / 100).toFixed(2)}
                    </p>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        payment.status === 'succeeded'
                          ? 'bg-green-100 text-green-700'
                          : payment.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {payment.status}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
