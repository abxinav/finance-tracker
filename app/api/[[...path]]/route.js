import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { 
  createSpreadsheet, 
  updateSpreadsheetWithExpenses,
  getSpreadsheetData,
  parseImportedExpenses
} from '@/lib/googleSheets';
import { getAuthUrl, getTokensFromCode } from '@/lib/googleAuth';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Mock user ID for MVP (will be replaced with real auth later)
const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';

export async function GET(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');

  try {
    // GET /api/expenses - Fetch all expenses
    if (path === '/expenses' || path === '/expenses/') {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', MOCK_USER_ID)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      return NextResponse.json({ expenses: data || [] });
    }

    // GET /api/expenses/weekly - Get this week's expenses
    if (path === '/expenses/weekly' || path === '/expenses/weekly/') {
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', MOCK_USER_ID)
        .gte('date', weekAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;

      return NextResponse.json({ expenses: data || [] });
    }

    // GET /api/expenses/stats - Get expense statistics
    if (path === '/expenses/stats' || path === '/expenses/stats/') {
      const { data: allExpenses, error: allError } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', MOCK_USER_ID);

      if (allError) throw allError;

      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastWeekStart = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

      const thisWeekExpenses = (allExpenses || []).filter(e => 
        new Date(e.date) >= weekAgo
      );
      
      const lastWeekExpenses = (allExpenses || []).filter(e => 
        new Date(e.date) >= lastWeekStart && new Date(e.date) < weekAgo
      );

      const thisWeekTotal = thisWeekExpenses.reduce((sum, e) => sum + e.amount, 0);
      const lastWeekTotal = lastWeekExpenses.reduce((sum, e) => sum + e.amount, 0);

      // Category breakdown
      const categoryBreakdown = {};
      thisWeekExpenses.forEach(expense => {
        if (!categoryBreakdown[expense.category]) {
          categoryBreakdown[expense.category] = 0;
        }
        categoryBreakdown[expense.category] += expense.amount;
      });

      // Calculate percentage change
      let percentageChange = 0;
      if (lastWeekTotal > 0) {
        percentageChange = ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100;
      }

      return NextResponse.json({
        thisWeekTotal,
        lastWeekTotal,
        percentageChange: Math.round(percentageChange),
        categoryBreakdown,
        thisWeekCount: thisWeekExpenses.length,
      });
    }

    // GET /api/google/auth - Get Google OAuth URL
    if (path === '/google/auth' || path === '/google/auth/') {
      const authUrl = getAuthUrl();
      return NextResponse.json({ authUrl });
    }

    // GET /api/google/status - Check Google Sheets connection status
    if (path === '/google/status' || path === '/google/status/') {
      const { data: user, error } = await supabase
        .from('users')
        .select('google_sheet_id, google_access_token')
        .eq('id', MOCK_USER_ID)
        .single();

      if (error) {
        return NextResponse.json({ connected: false });
      }

      return NextResponse.json({
        connected: !!user.google_access_token,
        sheetId: user.google_sheet_id,
      });
    }

    return NextResponse.json({ message: 'API is running' });
  } catch (error) {
    console.error('GET Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');

  try {
    const body = await request.json();

    // POST /api/expenses/parse - Parse natural language expense
    if (path === '/expenses/parse' || path === '/expenses/parse/') {
      const { text } = body;

      if (!text || typeof text !== 'string') {
        return NextResponse.json(
          { error: 'Text input is required' },
          { status: 400 }
        );
      }

      // Call Claude API to parse the expense
      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `You are an expense parser for Indian users. Extract amount (in INR), category, and description from natural language input.

Categories: Food, Transport, Entertainment, Shopping, Bills, Health, Other

Rules:
- Be flexible with casual language and typos
- If category unclear, default to most likely option
- For transport, recognize: uber, ola, auto, metro, bus, petrol
- For food, recognize: lunch, dinner, breakfast, coffee, zomato, swiggy, chai, tea
- Extract brand names when mentioned

Return ONLY valid JSON in this exact format:
{
  "amount": number,
  "category": "Food|Transport|Entertainment|Shopping|Bills|Health|Other",
  "description": "string (capitalize first letter)"
}

Examples:
Input: 'lunch 250' → {"amount": 250, "category": "Food", "description": "Lunch"}
Input: 'ola to office 180' → {"amount": 180, "category": "Transport", "description": "Ola ride"}
Input: 'paid electricity bill 1500' → {"amount": 1500, "category": "Bills", "description": "Electricity bill"}
Input: 'bought headphones 2999' → {"amount": 2999, "category": "Shopping", "description": "Headphones"}

Now parse this:
Input: '${text}'`,
          },
        ],
      });

      const content = message.content[0].text;
      let parsed;
      
      try {
        // Extract JSON from response (handle cases where AI adds extra text)
        const jsonMatch = content.match(/\{[^}]+\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          parsed = JSON.parse(content);
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', content);
        return NextResponse.json(
          { error: 'Could not understand the expense format. Please try again.' },
          { status: 400 }
        );
      }

      // Validate parsed data
      if (!parsed.amount || !parsed.category || !parsed.description) {
        return NextResponse.json(
          { error: 'Could not extract complete expense information' },
          { status: 400 }
        );
      }

      return NextResponse.json(parsed);
    }

    // POST /api/expenses - Create new expense
    if (path === '/expenses' || path === '/expenses/') {
      const { amount, category, description, date } = body;

      if (!amount || !category || !description) {
        return NextResponse.json(
          { error: 'Amount, category, and description are required' },
          { status: 400 }
        );
      }

      const expenseId = uuidv4();
      const expenseDate = date || new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('expenses')
        .insert([
          {
            id: expenseId,
            user_id: MOCK_USER_ID,
            amount: parseInt(amount),
            category,
            description,
            date: expenseDate,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ expense: data }, { status: 201 });
    }

    // POST /api/google/callback - Handle OAuth callback
    if (path === '/google/callback' || path === '/google/callback/') {
      const { code } = body;

      if (!code) {
        return NextResponse.json(
          { error: 'Authorization code is required' },
          { status: 400 }
        );
      }

      // Exchange code for tokens
      const tokens = await getTokensFromCode(code);

      // Store tokens in user table
      const { error } = await supabase
        .from('users')
        .update({
          google_access_token: tokens.access_token,
          google_refresh_token: tokens.refresh_token,
        })
        .eq('id', MOCK_USER_ID);

      if (error) throw error;

      return NextResponse.json({ success: true });
    }

    // POST /api/google/export - Export expenses to Google Sheets
    if (path === '/google/export' || path === '/google/export/') {
      const { timeRange = 'all' } = body;

      // Get user's Google tokens
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('google_access_token, google_sheet_id, name')
        .eq('id', MOCK_USER_ID)
        .single();

      if (userError || !user.google_access_token) {
        return NextResponse.json(
          { error: 'Google account not connected' },
          { status: 401 }
        );
      }

      // Get expenses based on time range
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('user_id', MOCK_USER_ID)
        .order('date', { ascending: false });

      if (timeRange === 'week') {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        query = query.gte('date', weekAgo.toISOString().split('T')[0]);
      } else if (timeRange === 'month') {
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        query = query.gte('date', monthAgo.toISOString().split('T')[0]);
      }

      const { data: expenses, error: expError } = await query;
      if (expError) throw expError;

      if (!expenses || expenses.length === 0) {
        return NextResponse.json(
          { error: 'No expenses to export' },
          { status: 400 }
        );
      }

      let spreadsheetId = user.google_sheet_id;

      // Create sheet if doesn't exist
      if (!spreadsheetId) {
        const title = `My Expenses - ${user.name || 'User'}`;
        const sheet = await createSpreadsheet(user.google_access_token, title);
        spreadsheetId = sheet.spreadsheetId;

        // Save sheet ID
        await supabase
          .from('users')
          .update({ google_sheet_id: spreadsheetId })
          .eq('id', MOCK_USER_ID);
      }

      // Update sheet with expenses
      await updateSpreadsheetWithExpenses(
        user.google_access_token,
        spreadsheetId,
        expenses
      );

      return NextResponse.json({
        success: true,
        spreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
        exportedCount: expenses.length,
      });
    }

    // POST /api/google/import - Import expenses from Google Sheets
    if (path === '/google/import' || path === '/google/import/') {
      const { spreadsheetId, range = 'All Expenses!A:D' } = body;

      if (!spreadsheetId) {
        return NextResponse.json(
          { error: 'Spreadsheet ID is required' },
          { status: 400 }
        );
      }

      // Get user's Google tokens
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('google_access_token')
        .eq('id', MOCK_USER_ID)
        .single();

      if (userError || !user.google_access_token) {
        return NextResponse.json(
          { error: 'Google account not connected' },
          { status: 401 }
        );
      }

      // Get data from sheet
      const data = await getSpreadsheetData(
        user.google_access_token,
        spreadsheetId,
        range
      );

      // Parse and validate expenses
      const expenses = parseImportedExpenses(data);

      if (expenses.length === 0) {
        return NextResponse.json(
          { error: 'No valid expenses found in the sheet' },
          { status: 400 }
        );
      }

      // Check for duplicates and insert new expenses
      let importedCount = 0;
      const errors = [];

      for (const expense of expenses) {
        // Check if expense already exists (same date, amount, description)
        const { data: existing } = await supabase
          .from('expenses')
          .select('id')
          .eq('user_id', MOCK_USER_ID)
          .eq('date', expense.date)
          .eq('amount', expense.amount)
          .eq('description', expense.description)
          .limit(1);

        if (existing && existing.length > 0) {
          continue; // Skip duplicate
        }

        // Insert expense
        const { error } = await supabase
          .from('expenses')
          .insert([
            {
              id: uuidv4(),
              user_id: MOCK_USER_ID,
              ...expense,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);

        if (error) {
          errors.push(`Failed to import: ${expense.description}`);
        } else {
          importedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        importedCount,
        skippedCount: expenses.length - importedCount,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    // POST /api/google/disconnect - Disconnect Google Sheets
    if (path === '/google/disconnect' || path === '/google/disconnect/') {
      const { error } = await supabase
        .from('users')
        .update({
          google_access_token: null,
          google_refresh_token: null,
          google_sheet_id: null,
        })
        .eq('id', MOCK_USER_ID);

      if (error) throw error;

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('POST Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');

  try {
    // DELETE /api/expenses/:id
    const match = path.match(/^\/expenses\/([a-f0-9-]+)/);
    if (match) {
      const expenseId = match[1];

      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)
        .eq('user_id', MOCK_USER_ID);

      if (error) throw error;

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('DELETE Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');

  try {
    const body = await request.json();

    // PUT /api/expenses/:id
    const match = path.match(/^\/expenses\/([a-f0-9-]+)/);
    if (match) {
      const expenseId = match[1];
      const { amount, category, description, date } = body;

      const updateData = {
        updated_at: new Date().toISOString(),
      };

      if (amount !== undefined) updateData.amount = parseInt(amount);
      if (category) updateData.category = category;
      if (description) updateData.description = description;
      if (date) updateData.date = date;

      const { data, error } = await supabase
        .from('expenses')
        .update(updateData)
        .eq('id', expenseId)
        .eq('user_id', MOCK_USER_ID)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ expense: data });
    }

    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('PUT Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
