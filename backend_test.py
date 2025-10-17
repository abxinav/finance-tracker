#!/usr/bin/env python3
"""
SpendWise Backend API Testing Script
Tests all backend APIs for expense tracking functionality
"""

import requests
import json
import sys
from datetime import datetime

# Base URL from environment
BASE_URL = "https://spendwise-646.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

def log_test(test_name, status, details=""):
    """Log test results with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    status_symbol = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
    print(f"[{timestamp}] {status_symbol} {test_name}")
    if details:
        print(f"    Details: {details}")
    print()

def test_expense_parsing():
    """Test POST /api/expenses/parse - Claude AI expense parsing"""
    print("=" * 60)
    print("TEST 1: Expense Parsing (Claude AI)")
    print("=" * 60)
    
    try:
        # Test with simple expense text
        test_data = {"text": "coffee 80"}
        response = requests.post(f"{API_BASE}/expenses/parse", 
                               json=test_data, 
                               timeout=30)
        
        print(f"Request URL: {API_BASE}/expenses/parse")
        print(f"Request Body: {json.dumps(test_data)}")
        print(f"Response Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response Data: {json.dumps(data, indent=2)}")
            
            # Validate response structure
            required_fields = ['amount', 'category', 'description']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                log_test("Expense Parsing", "FAIL", f"Missing fields: {missing_fields}")
                return False
            
            # Validate data types and values
            if not isinstance(data['amount'], (int, float)) or data['amount'] <= 0:
                log_test("Expense Parsing", "FAIL", f"Invalid amount: {data['amount']}")
                return False
                
            if not isinstance(data['category'], str) or not data['category']:
                log_test("Expense Parsing", "FAIL", f"Invalid category: {data['category']}")
                return False
                
            if not isinstance(data['description'], str) or not data['description']:
                log_test("Expense Parsing", "FAIL", f"Invalid description: {data['description']}")
                return False
            
            log_test("Expense Parsing", "PASS", f"Parsed: ₹{data['amount']} for {data['description']} ({data['category']})")
            return True
        else:
            error_text = response.text
            log_test("Expense Parsing", "FAIL", f"HTTP {response.status_code}: {error_text}")
            return False
            
    except requests.exceptions.Timeout:
        log_test("Expense Parsing", "FAIL", "Request timeout (30s) - Claude API might be slow")
        return False
    except requests.exceptions.ConnectionError:
        log_test("Expense Parsing", "FAIL", "Connection error - API server not reachable")
        return False
    except Exception as e:
        log_test("Expense Parsing", "FAIL", f"Unexpected error: {str(e)}")
        return False

def test_expense_creation():
    """Test POST /api/expenses - Create new expense"""
    print("=" * 60)
    print("TEST 2: Expense Creation")
    print("=" * 60)
    
    try:
        # Test expense data
        test_expense = {
            "amount": 150,
            "category": "Food",
            "description": "Lunch at restaurant",
            "date": "2024-01-15"
        }
        
        response = requests.post(f"{API_BASE}/expenses", 
                               json=test_expense, 
                               timeout=10)
        
        print(f"Request URL: {API_BASE}/expenses")
        print(f"Request Body: {json.dumps(test_expense)}")
        print(f"Response Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 201:
            data = response.json()
            print(f"Response Data: {json.dumps(data, indent=2)}")
            
            # Validate response structure
            if 'expense' not in data:
                log_test("Expense Creation", "FAIL", "Missing 'expense' field in response")
                return False
            
            expense = data['expense']
            required_fields = ['id', 'amount', 'category', 'description', 'date', 'user_id']
            missing_fields = [field for field in required_fields if field not in expense]
            
            if missing_fields:
                log_test("Expense Creation", "FAIL", f"Missing fields in expense: {missing_fields}")
                return False
            
            log_test("Expense Creation", "PASS", f"Created expense ID: {expense['id']}")
            return True
        else:
            error_text = response.text
            print(f"Response Body: {error_text}")
            
            # Check for specific Supabase errors
            if "PGRST" in error_text:
                log_test("Expense Creation", "FAIL", f"Supabase error: {error_text}")
            elif response.status_code == 401:
                log_test("Expense Creation", "FAIL", f"Authentication error: {error_text}")
            elif response.status_code == 400:
                log_test("Expense Creation", "FAIL", f"Validation error: {error_text}")
            else:
                log_test("Expense Creation", "FAIL", f"HTTP {response.status_code}: {error_text}")
            return False
            
    except requests.exceptions.ConnectionError:
        log_test("Expense Creation", "FAIL", "Connection error - API server not reachable")
        return False
    except Exception as e:
        log_test("Expense Creation", "FAIL", f"Unexpected error: {str(e)}")
        return False

def test_get_expenses():
    """Test GET /api/expenses - Fetch all expenses"""
    print("=" * 60)
    print("TEST 3: Get Expenses")
    print("=" * 60)
    
    try:
        response = requests.get(f"{API_BASE}/expenses", timeout=10)
        
        print(f"Request URL: {API_BASE}/expenses")
        print(f"Response Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response Data: {json.dumps(data, indent=2)}")
            
            # Validate response structure
            if 'expenses' not in data:
                log_test("Get Expenses", "FAIL", "Missing 'expenses' field in response")
                return False
            
            expenses = data['expenses']
            if not isinstance(expenses, list):
                log_test("Get Expenses", "FAIL", "Expenses field is not a list")
                return False
            
            log_test("Get Expenses", "PASS", f"Retrieved {len(expenses)} expenses")
            
            # If there are expenses, validate structure of first one
            if expenses:
                first_expense = expenses[0]
                required_fields = ['id', 'amount', 'category', 'description', 'date']
                missing_fields = [field for field in required_fields if field not in first_expense]
                
                if missing_fields:
                    log_test("Get Expenses", "WARN", f"Expense missing fields: {missing_fields}")
                else:
                    print(f"    Sample expense: ₹{first_expense['amount']} - {first_expense['description']}")
            
            return True
        else:
            error_text = response.text
            print(f"Response Body: {error_text}")
            
            # Check for specific Supabase errors
            if "PGRST" in error_text:
                log_test("Get Expenses", "FAIL", f"Supabase error: {error_text}")
            elif response.status_code == 401:
                log_test("Get Expenses", "FAIL", f"Authentication error: {error_text}")
            else:
                log_test("Get Expenses", "FAIL", f"HTTP {response.status_code}: {error_text}")
            return False
            
    except requests.exceptions.ConnectionError:
        log_test("Get Expenses", "FAIL", "Connection error - API server not reachable")
        return False
    except Exception as e:
        log_test("Get Expenses", "FAIL", f"Unexpected error: {str(e)}")
        return False

def test_google_sheets_status():
    """Test GET /api/google/status - Check Google Sheets connection"""
    print("=" * 60)
    print("TEST 4: Google Sheets Status")
    print("=" * 60)
    
    try:
        response = requests.get(f"{API_BASE}/google/status", timeout=10)
        
        print(f"Request URL: {API_BASE}/google/status")
        print(f"Response Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response Data: {json.dumps(data, indent=2)}")
            
            # Validate response structure
            if 'connected' not in data:
                log_test("Google Sheets Status", "FAIL", "Missing 'connected' field in response")
                return False
            
            connected = data['connected']
            if not isinstance(connected, bool):
                log_test("Google Sheets Status", "FAIL", "Connected field is not boolean")
                return False
            
            status_msg = "Connected" if connected else "Not connected"
            if connected and 'sheetId' in data:
                status_msg += f" (Sheet ID: {data['sheetId']})"
            
            log_test("Google Sheets Status", "PASS", f"Status: {status_msg}")
            return True
        else:
            error_text = response.text
            print(f"Response Body: {error_text}")
            log_test("Google Sheets Status", "FAIL", f"HTTP {response.status_code}: {error_text}")
            return False
            
    except requests.exceptions.ConnectionError:
        log_test("Google Sheets Status", "FAIL", "Connection error - API server not reachable")
        return False
    except Exception as e:
        log_test("Google Sheets Status", "FAIL", f"Unexpected error: {str(e)}")
        return False

def test_google_oauth_url():
    """Test GET /api/google/auth - Get OAuth URL"""
    print("=" * 60)
    print("TEST 5: Google OAuth URL")
    print("=" * 60)
    
    try:
        response = requests.get(f"{API_BASE}/google/auth", timeout=10)
        
        print(f"Request URL: {API_BASE}/google/auth")
        print(f"Response Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response Data: {json.dumps(data, indent=2)}")
            
            # Validate response structure
            if 'authUrl' not in data:
                log_test("Google OAuth URL", "FAIL", "Missing 'authUrl' field in response")
                return False
            
            auth_url = data['authUrl']
            if not isinstance(auth_url, str) or not auth_url.startswith('https://'):
                log_test("Google OAuth URL", "FAIL", f"Invalid auth URL: {auth_url}")
                return False
            
            # Check if URL contains expected Google OAuth components
            if 'accounts.google.com' not in auth_url or 'oauth2' not in auth_url:
                log_test("Google OAuth URL", "FAIL", f"URL doesn't look like Google OAuth: {auth_url}")
                return False
            
            log_test("Google OAuth URL", "PASS", f"Valid OAuth URL generated")
            print(f"    URL: {auth_url[:100]}...")
            return True
        else:
            error_text = response.text
            print(f"Response Body: {error_text}")
            log_test("Google OAuth URL", "FAIL", f"HTTP {response.status_code}: {error_text}")
            return False
            
    except requests.exceptions.ConnectionError:
        log_test("Google OAuth URL", "FAIL", "Connection error - API server not reachable")
        return False
    except Exception as e:
        log_test("Google OAuth URL", "FAIL", f"Unexpected error: {str(e)}")
        return False

def run_all_tests():
    """Run all backend API tests"""
    print("🧪 SPENDWISE BACKEND API TESTING")
    print("=" * 60)
    print(f"Testing API at: {API_BASE}")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Track test results
    test_results = []
    
    # Run tests in the specified order
    test_results.append(("Expense Parsing (Claude AI)", test_expense_parsing()))
    test_results.append(("Expense Creation", test_expense_creation()))
    test_results.append(("Get Expenses", test_get_expenses()))
    test_results.append(("Google Sheets Status", test_google_sheets_status()))
    test_results.append(("Google OAuth URL", test_google_oauth_url()))
    
    # Summary
    print("=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, result in test_results if result)
    total = len(test_results)
    
    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
    
    print()
    print(f"Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed!")
        return True
    else:
        print("⚠️  Some tests failed - check logs above for details")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)