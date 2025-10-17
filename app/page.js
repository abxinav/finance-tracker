'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import GoogleSheetsIntegration from '@/components/GoogleSheetsIntegration';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import {
  Trash2,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from 'lucide-react';

const CATEGORY_COLORS = {
  Food: 'bg-orange-500',
  Transport: 'bg-blue-500',
  Entertainment: 'bg-purple-500',
  Shopping: 'bg-pink-500',
  Bills: 'bg-yellow-500',
  Health: 'bg-green-500',
  Other: 'bg-gray-500',
};

const CATEGORY_ICONS = {
  Food: '🍔',
  Transport: '🚗',
  Entertainment: '🎬',
  Shopping: '🛍️',
  Bills: '💡',
  Health: '⚕️',
  Other: '📌',
};

export default function ExpenseTracker() {
  const [expenses, setExpenses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const { toast } = useToast();

  // Manual form state
  const [manualName, setManualName] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualCategory, setManualCategory] = useState('Other');

  // Fetch expenses and stats
  useEffect(() => {
    const loadInitialData = async () => {
      setIsInitialLoading(true);
      await Promise.all([fetchExpenses(), fetchStats()]);
      setIsInitialLoading(false);
    };
    loadInitialData();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await fetch('/api/expenses');
      if (!response.ok) {
        console.error('Failed to fetch expenses:', response.status);
        return;
      }
      const data = await response.json();
      setExpenses(data.expenses || []);
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
      setExpenses([]);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/expenses/stats');
      if (!response.ok) {
        console.error('Failed to fetch stats:', response.status);
        return;
      }
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setStats(null);
    }
  };

  const handleManualAdd = async (e) => {
    e.preventDefault();
    if (!manualName.trim() || !manualAmount) return;

    setLoading(true);
    try {
      const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';

      const newExpense = {
        id: uuidv4(),
        user_id: MOCK_USER_ID,
        amount: parseInt(manualAmount),
        category: manualCategory,
        description: manualName,
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('expenses')
        .insert([newExpense])
        .select()
        .single();

      if (error) throw error;

      // Success! Update UI
      setExpenses([data, ...expenses]);
      setManualName('');
      setManualAmount('');
      setManualCategory('Other');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);

      // Refresh stats
      fetchStats();

      toast({
        title: 'Expense added!',
        description: `₹${data.amount} for ${data.description}`,
      });
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add expense',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (expenseId) => {
    try {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete expense');
      }

      setExpenses(expenses.filter((e) => e.id !== expenseId));
      fetchStats();

      toast({
        title: 'Expense deleted',
      });
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete expense',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const monthlyBudget = 10000;
  const budgetUsed = stats?.thisWeekTotal || 0;
  const budgetProgress = Math.min((budgetUsed / monthlyBudget) * 100, 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900" data-testid="app-title">💰 SpendWise</h1>
              <p className="text-sm text-gray-600">Track expenses in seconds</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-600">This Week</p>
                <p className="text-lg font-bold text-gray-900" data-testid="weekly-total">
                  ₹{stats?.thisWeekTotal?.toLocaleString('en-IN') || 0}
                </p>
              </div>
            </div>
          </div>
          
          {/* Google Sheets Integration */}
          <div className="mb-4">
            <GoogleSheetsIntegration />
          </div>
          
          {/* Budget Progress */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">Weekly Budget</span>
              <span className="font-semibold">
                ₹{budgetUsed.toLocaleString('en-IN')} / ₹{monthlyBudget.toLocaleString('en-IN')}
              </span>
            </div>
            <Progress value={budgetProgress} className="h-2" data-testid="budget-progress" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Expense Input Form */}
        <Card className="mb-6 border-2 border-blue-200 shadow-lg" data-testid="expense-input-card">
          <CardHeader>
            <CardTitle className="text-lg">Add Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualAdd} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <Input
                    type="text"
                    placeholder="Expense name (e.g., Gym)"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    disabled={loading}
                    className="h-12"
                    data-testid="manual-name-input"
                  />
                </div>
                <div className="md:col-span-1">
                  <Input
                    type="number"
                    placeholder="Amount (₹)"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    disabled={loading}
                    className="h-12"
                    data-testid="manual-amount-input"
                  />
                </div>
                <div className="md:col-span-1">
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    disabled={loading}
                    className="w-full h-12 px-3 rounded-md border border-gray-300 bg-white text-gray-900"
                    data-testid="manual-category-select"
                  >
                    <option value="Food">🍔 Food</option>
                    <option value="Transport">🚗 Transport</option>
                    <option value="Entertainment">🎬 Entertainment</option>
                    <option value="Shopping">🛍️ Shopping</option>
                    <option value="Bills">💡 Bills</option>
                    <option value="Health">⚕️ Health</option>
                    <option value="Other">📌 Other</option>
                  </select>
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading || !manualName.trim() || !manualAmount}
                className="w-full h-12"
                data-testid="manual-submit-button"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Add Expense'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* This Week Stats */}
        {stats && stats.thisWeekTotal !== undefined && (
          <Card className="mb-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white" data-testid="weekly-stats-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>This Week</span>
                {stats.percentageChange !== 0 && (
                  <div className="flex items-center gap-1 text-sm">
                    {stats.percentageChange > 0 ? (
                      <>
                        <TrendingUp className="h-4 w-4" />
                        <span data-testid="percentage-increase">{stats.percentageChange}% more</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-4 w-4" />
                        <span data-testid="percentage-decrease">{Math.abs(stats.percentageChange)}% less</span>
                      </>
                    )}
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold mb-4" data-testid="weekly-total-large">
                ₹{(stats.thisWeekTotal || 0).toLocaleString('en-IN')}
              </div>
              <div className="flex gap-2 flex-wrap">
                {stats.categoryBreakdown && Object.entries(stats.categoryBreakdown).map(([category, amount]) => (
                  <Badge
                    key={category}
                    variant="secondary"
                    className="bg-white/20 text-white"
                    data-testid={`category-badge-${category.toLowerCase()}`}
                  >
                    {CATEGORY_ICONS[category]} {category}: ₹{amount}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Expenses */}
        <Card data-testid="recent-expenses-card">
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {isInitialLoading ? (
              <div className="text-center py-12" data-testid="loading-state">
                <Loader2 className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
                <p className="text-gray-600">Loading expenses...</p>
              </div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-12" data-testid="empty-state">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No expenses yet!</p>
                <p className="text-sm text-gray-500 mt-2">
                  Add your first expense above. Try typing "coffee 80"
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.slice(0, 10).map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    data-testid={`expense-item-${expense.id}`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className={`w-10 h-10 rounded-full ${CATEGORY_COLORS[expense.category]} flex items-center justify-center text-white text-xl`}
                      >
                        {CATEGORY_ICONS[expense.category]}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900" data-testid="expense-description">
                          {expense.description}
                        </p>
                        <p className="text-sm text-gray-600">
                          {expense.category} • {formatDate(expense.date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-lg font-bold text-gray-900" data-testid="expense-amount">
                        ₹{expense.amount.toLocaleString('en-IN')}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(expense.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        data-testid={`delete-expense-${expense.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
