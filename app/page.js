'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import GoogleSheetsIntegration from '@/components/GoogleSheetsIntegration';
import {
  Coffee,
  UtensilsCrossed,
  Car,
  Smartphone,
  Trash2,
  Loader2,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

const PLACEHOLDERS = [
  'Try: coffee 80',
  'Try: uber to office 150',
  'Try: movie tickets 600',
  'Try: groceries 1200',
  'Try: lunch 250',
  'Try: auto 50',
];

const QUICK_BUTTONS = [
  { label: 'Coffee', amount: 80, icon: Coffee },
  { label: 'Lunch', amount: 200, icon: UtensilsCrossed },
  { label: 'Auto', amount: 50, icon: Car },
  { label: 'Tea', amount: 20, icon: Coffee },
];

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
  const [expenseText, setExpenseText] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const inputRef = useRef(null);
  const { toast } = useToast();

  // Rotate placeholder every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Auto-focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fetch expenses and stats
  useEffect(() => {
    fetchExpenses();
    fetchStats();
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

  const handleAddExpense = async (text) => {
    if (!text.trim()) return;

    setLoading(true);
    try {
      // Step 1: Parse the expense using AI
      const parseResponse = await fetch('/api/expenses/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!parseResponse.ok) {
        const errorData = await parseResponse.json();
        throw new Error(errorData.error || 'Failed to parse expense');
      }

      const parsed = await parseResponse.json();

      // Step 2: Save the expense
      const saveResponse = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save expense');
      }

      const { expense } = await saveResponse.json();

      // Success! Update UI
      setExpenses([expense, ...expenses]);
      setExpenseText('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);

      // Refresh stats
      fetchStats();

      toast({
        title: 'Expense added!',
        description: `₹${expense.amount} for ${expense.description}`,
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

  const handleQuickAdd = async (label, amount) => {
    await handleAddExpense(`${label} ${amount}`);
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
        {/* Expense Input Section */}
        <Card className="mb-6 border-2 border-blue-200 shadow-lg" data-testid="expense-input-card">
          <CardContent className="pt-6">
            <div className="relative">
              <Input
                ref={inputRef}
                type="text"
                placeholder={PLACEHOLDERS[placeholderIndex]}
                value={expenseText}
                onChange={(e) => setExpenseText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handleAddExpense(expenseText);
                  }
                }}
                className="text-lg h-14 pr-12"
                disabled={loading}
                data-testid="expense-input"
              />
              {loading && (
                <Loader2 className="absolute right-4 top-4 h-6 w-6 animate-spin text-blue-500" />
              )}
              {showSuccess && (
                <CheckCircle2 className="absolute right-4 top-4 h-6 w-6 text-green-500" data-testid="success-icon" />
              )}
            </div>

            {/* Quick Add Buttons */}
            <div className="flex gap-2 mt-4 flex-wrap">
              {QUICK_BUTTONS.map((btn) => {
                const Icon = btn.icon;
                return (
                  <Button
                    key={btn.label}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAdd(btn.label, btn.amount)}
                    disabled={loading}
                    className="flex-1 min-w-[100px]"
                    data-testid={`quick-add-${btn.label.toLowerCase()}`}
                  >
                    <Icon className="h-4 w-4 mr-1" />
                    {btn.label} ₹{btn.amount}
                  </Button>
                );
              })}
            </div>
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
            {expenses.length === 0 ? (
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
