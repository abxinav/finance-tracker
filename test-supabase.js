// Test Supabase Connection
// Run this to verify Supabase is connected

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing Supabase Connection...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? 'Present ✓' : 'Missing ✗');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials missing!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection by fetching from users table
async function testConnection() {
  try {
    console.log('\n1. Testing connection to users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name')
      .limit(1);

    if (usersError) {
      console.error('❌ Users table error:', usersError.message);
      if (usersError.code === 'PGRST205') {
        console.error('\n⚠️  The users table does NOT exist in Supabase!');
        console.error('You need to run the database setup SQL first.');
      }
    } else {
      console.log('✅ Users table accessible!');
      console.log('Found users:', users);
    }

    console.log('\n2. Testing connection to expenses table...');
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('id, description, amount')
      .limit(1);

    if (expensesError) {
      console.error('❌ Expenses table error:', expensesError.message);
      if (expensesError.code === 'PGRST205') {
        console.error('\n⚠️  The expenses table does NOT exist in Supabase!');
        console.error('You need to run the database setup SQL first.');
      }
    } else {
      console.log('✅ Expenses table accessible!');
      console.log('Found expenses:', expenses);
    }

    console.log('\n3. Testing RLS policies...');
    const testUserId = '00000000-0000-0000-0000-000000000001';
    const { data: insertTest, error: insertError } = await supabase
      .from('expenses')
      .insert([
        {
          id: '00000000-0000-0000-0000-000000000999',
          user_id: testUserId,
          amount: 1,
          category: 'Food',
          description: 'Test insert',
          date: new Date().toISOString().split('T')[0],
        },
      ])
      .select();

    if (insertError) {
      console.error('❌ Insert test failed:', insertError.message);
      if (insertError.code === '42501') {
        console.error('\n⚠️  RLS policy is BLOCKING inserts!');
        console.error('Run the fix SQL: ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;');
      }
    } else {
      console.log('✅ Insert test successful!');
      // Clean up test
      await supabase.from('expenses').delete().eq('id', '00000000-0000-0000-0000-000000000999');
    }

    console.log('\n═══════════════════════════════════════');
    console.log('SUPABASE CONNECTION TEST COMPLETE');
    console.log('═══════════════════════════════════════\n');
  } catch (error) {
    console.error('❌ Connection test failed:', error);
  }
}

testConnection();
