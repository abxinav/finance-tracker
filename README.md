# SpendWise - AI Personal Expense Manager

## 🚀 Quick Setup Guide

### **IMPORTANT: Database Setup Required**

Before the app can work, you need to set up the Supabase database tables. Follow these steps:

#### Step 1: Access Supabase SQL Editor
1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: `patlahankyhajvonugws`
3. Click on **SQL Editor** in the left sidebar

#### Step 2: Run the Database Migration
1. Copy the entire contents of the file `supabase-setup.sql` (in this project root)
2. Paste it into the SQL Editor
3. Click **Run** to execute the SQL

This will create:
- ✅ `users` table
- ✅ `expenses` table  
- ✅ `user_preferences` table
- ✅ Indexes for performance
- ✅ Row Level Security policies
- ✅ A demo user with sample data

#### Step 3: Verify Tables Created
After running the SQL, check the **Table Editor** in Supabase to verify:
- You should see `users`, `expenses`, and `user_preferences` tables
- The demo user should exist with some sample expenses

#### Step 4: Test the App
Once the database is set up, the app should work! Visit your app URL:
https://spendwise-646.preview.emergentagent.com

---

## ✨ Features Implemented (MVP)

### Core Functionality
- ✅ **AI Expense Parsing**: Type natural language like "coffee 80" and Claude AI automatically extracts:
  - Amount
  - Category (Food, Transport, Entertainment, etc.)
  - Description
  
- ✅ **Instant Expense Tracking**: 
  - Add expenses in seconds
  - Quick add buttons for common expenses
  - Beautiful, smooth animations

- ✅ **Real-time Dashboard**:
  - Weekly spending total
  - Budget progress bar
  - Percentage comparison with last week
  - Category breakdown with badges
  - Recent expenses list

- ✅ **Smart Categories**: 
  - Food, Transport, Entertainment, Shopping, Bills, Health, Other
  - Color-coded with icons
  - AI automatically categorizes based on input

### What You Can Try
1. **Natural Language Input**:
   - "lunch 250"
   - "ola to office 180"
   - "movie tickets 600"
   - "bought headphones 2999"
   
2. **Quick Add Buttons**:
   - Coffee ₹80
   - Lunch ₹200
   - Auto ₹50
   - Tea ₹20

3. **View & Manage**:
   - See all recent expenses
   - Delete expenses with one click
   - View weekly statistics
   - Track budget progress

---

## 🛠 Technical Stack

- **Frontend**: React + Next.js 14 + Tailwind CSS + shadcn/ui
- **Backend**: Next.js API Routes
- **AI**: Claude 3.5 Sonnet (Anthropic)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Ready for Supabase Auth (coming next)

---

## 📦 Environment Variables

All required environment variables are already set in `.env`:

```env
ANTHROPIC_API_KEY=<your-key>
NEXT_PUBLIC_SUPABASE_URL=https://patlahankyhajvonugws.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key>
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-secret>
```

---

## 🎯 Current Status

**✅ PHASE 1 COMPLETE: Core Expense Tracking with AI**

### What's Working:
- AI-powered expense parsing (Claude API)
- Expense CRUD operations
- Beautiful responsive UI
- Weekly statistics
- Category breakdown
- Budget tracking

### Next Steps (Phases):
1. **Phase 2**: Authentication with Supabase Auth
2. **Phase 3**: Charts & Visualizations (Recharts)
3. **Phase 4**: Google Sheets Export
4. **Phase 5**: Voice Input, AI Insights, Dark Mode

---

## 🧪 Testing

Once database is set up, test these scenarios:

1. **AI Parsing**:
   - Type: "coffee 80" → Should parse as Food, ₹80, "Coffee"
   - Type: "uber 150" → Should parse as Transport, ₹150, "Uber ride"
   - Type: "lunch at swiggy 250" → Should parse correctly

2. **Quick Add**:
   - Click "Coffee ₹80" button → Should add instantly

3. **Stats**:
   - Check if weekly total updates
   - Verify category badges show correct amounts
   - Budget progress bar should reflect spending

4. **Delete**:
   - Click trash icon on any expense → Should delete

---

## 🐛 Troubleshooting

### App shows empty/errors:
- **Cause**: Database tables not created
- **Fix**: Run the SQL migration in Supabase (Step 1-2 above)

### AI parsing fails:
- **Cause**: Invalid Anthropic API key
- **Fix**: Verify ANTHROPIC_API_KEY in .env

### Cannot connect to Supabase:
- **Cause**: Wrong URL or key
- **Fix**: Verify Supabase credentials in .env

---

## 📝 API Endpoints

### Expenses
- `GET /api/expenses` - Fetch all expenses
- `GET /api/expenses/weekly` - Get this week's expenses  
- `GET /api/expenses/stats` - Get statistics
- `POST /api/expenses/parse` - Parse natural language
- `POST /api/expenses` - Create expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

---

## 🎨 UI Components

Using shadcn/ui components:
- Button, Input, Card, Badge, Progress
- Toast notifications
- Responsive layout
- Mobile-first design

---

## 👨‍💻 Development

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Access app
http://localhost:3000
```

---

## 📄 License

MIT

---

**Built with ❤️ by Emergent AI Agent**
