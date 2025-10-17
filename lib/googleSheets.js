import { google } from 'googleapis';

// Create OAuth2 client
export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_BASE_URL}/auth/google/callback`
  );
}

// Get Google Sheets client with access token
export function getSheetsClient(accessToken) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.sheets({ version: 'v4', auth });
}

// Create a new spreadsheet
export async function createSpreadsheet(accessToken, title) {
  const sheets = getSheetsClient(accessToken);
  
  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: 'All Expenses',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
        {
          properties: {
            title: 'Summary',
          },
        },
      ],
    },
  });
  
  return response.data;
}

// Format expenses for Google Sheets
export function formatExpensesForSheets(expenses) {
  // Header row
  const headers = ['Date', 'Description', 'Category', 'Amount (₹)'];
  
  // Data rows
  const rows = expenses.map(expense => [
    expense.date,
    expense.description,
    expense.category,
    expense.amount,
  ]);
  
  return [headers, ...rows];
}

// Format summary for Google Sheets
export function formatSummaryForSheets(expenses) {
  const categoryTotals = {};
  let totalAmount = 0;
  
  expenses.forEach(expense => {
    if (!categoryTotals[expense.category]) {
      categoryTotals[expense.category] = 0;
    }
    categoryTotals[expense.category] += expense.amount;
    totalAmount += expense.amount;
  });
  
  const rows = [
    ['Category', 'Amount (₹)'],
    ['', ''],
    ['TOTAL SPENT', totalAmount],
    ['', ''],
    ['BY CATEGORY', ''],
  ];
  
  Object.entries(categoryTotals).forEach(([category, amount]) => {
    rows.push([category, amount]);
  });
  
  return rows;
}

// Update spreadsheet with expense data
export async function updateSpreadsheetWithExpenses(accessToken, spreadsheetId, expenses) {
  const sheets = getSheetsClient(accessToken);
  
  // Update All Expenses sheet
  const expensesData = formatExpensesForSheets(expenses);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'All Expenses!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: expensesData,
    },
  });
  
  // Update Summary sheet
  const summaryData = formatSummaryForSheets(expenses);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Summary!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: summaryData,
    },
  });
  
  // Format the sheets
  await formatSpreadsheet(accessToken, spreadsheetId);
  
  return { success: true, updatedCells: expensesData.length + summaryData.length };
}

// Format spreadsheet with colors and styles
export async function formatSpreadsheet(accessToken, spreadsheetId) {
  const sheets = getSheetsClient(accessToken);
  
  const requests = [
    // Format header row in All Expenses sheet
    {
      repeatCell: {
        range: {
          sheetId: 0,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: {
              red: 0.26,
              green: 0.52,
              blue: 0.96,
            },
            textFormat: {
              foregroundColor: {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
              },
              fontSize: 11,
              bold: true,
            },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    },
    // Auto-resize columns in All Expenses sheet
    {
      autoResizeDimensions: {
        dimensions: {
          sheetId: 0,
          dimension: 'COLUMNS',
          startIndex: 0,
          endIndex: 4,
        },
      },
    },
    // Format Summary sheet header
    {
      repeatCell: {
        range: {
          sheetId: 1,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: {
              red: 0.26,
              green: 0.52,
              blue: 0.96,
            },
            textFormat: {
              foregroundColor: {
                red: 1.0,
                green: 1.0,
                blue: 1.0,
              },
              fontSize: 11,
              bold: true,
            },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    },
  ];
  
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests,
    },
  });
}

// Get data from spreadsheet
export async function getSpreadsheetData(accessToken, spreadsheetId, range) {
  const sheets = getSheetsClient(accessToken);
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  
  return response.data.values || [];
}

// Parse imported expense data
export function parseImportedExpenses(data) {
  if (!data || data.length < 2) {
    throw new Error('Invalid data format. Expected headers and at least one row.');
  }
  
  const headers = data[0].map(h => h.toLowerCase());
  const rows = data.slice(1);
  
  // Find column indexes
  const dateIdx = headers.findIndex(h => h.includes('date'));
  const descIdx = headers.findIndex(h => h.includes('description') || h.includes('desc'));
  const catIdx = headers.findIndex(h => h.includes('category') || h.includes('cat'));
  const amountIdx = headers.findIndex(h => h.includes('amount') || h.includes('₹'));
  
  if (dateIdx === -1 || descIdx === -1 || catIdx === -1 || amountIdx === -1) {
    throw new Error('Required columns not found. Expected: Date, Description, Category, Amount');
  }
  
  const expenses = [];
  const validCategories = ['Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Health', 'Other'];
  
  rows.forEach((row, idx) => {
    if (!row || row.length === 0 || !row[amountIdx]) return;
    
    const category = row[catIdx] || 'Other';
    const amount = parseFloat(String(row[amountIdx]).replace(/[^0-9.-]/g, ''));
    
    if (isNaN(amount) || amount <= 0) return;
    
    expenses.push({
      date: row[dateIdx] || new Date().toISOString().split('T')[0],
      description: row[descIdx] || 'Imported expense',
      category: validCategories.includes(category) ? category : 'Other',
      amount: Math.round(amount),
    });
  });
  
  return expenses;
}
