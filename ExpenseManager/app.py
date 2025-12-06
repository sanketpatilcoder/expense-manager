"""
Flask Backend for Expense Manager
- User authentication (login/signup)
- Expense CRUD operations
- Comprehensive logging system
"""

from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import sqlite3
import logging
import os
from logging.handlers import RotatingFileHandler

# Initialize Flask app
app = Flask(__name__, static_folder='.', static_url_path='')
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
CORS(app, supports_credentials=True)

# Configure logging
if not os.path.exists('logs'):
    os.mkdir('logs')

# Create formatters
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# File handler with rotation
file_handler = RotatingFileHandler(
    'logs/expense_manager.log',
    maxBytes=10240000,  # 10MB
    backupCount=10
)
file_handler.setFormatter(formatter)
file_handler.setLevel(logging.INFO)

# Console handler
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
console_handler.setLevel(logging.INFO)

# Configure root logger
app.logger.setLevel(logging.INFO)
app.logger.addHandler(file_handler)
app.logger.addHandler(console_handler)

# Create logger for this module
logger = logging.getLogger(__name__)

# Database setup
def init_db():
    """Initialize the database with required tables"""
    conn = sqlite3.connect('expense_manager.db')
    c = conn.cursor()
    
    # Users table
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT NOT NULL,
                  email TEXT UNIQUE NOT NULL,
                  password TEXT NOT NULL,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    
    # Expenses table
    c.execute('''CREATE TABLE IF NOT EXISTS expenses
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER NOT NULL,
                  title TEXT NOT NULL,
                  amount REAL NOT NULL,
                  category TEXT NOT NULL,
                  date TEXT NOT NULL,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (user_id) REFERENCES users(id))''')
    
    # Activity logs table
    c.execute('''CREATE TABLE IF NOT EXISTS activity_logs
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER,
                  action TEXT NOT NULL,
                  details TEXT,
                  ip_address TEXT,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (user_id) REFERENCES users(id))''')
    
    conn.commit()
    conn.close()
    logger.info("Database initialized successfully")

def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect('expense_manager.db')
    conn.row_factory = sqlite3.Row
    return conn

def log_activity(user_id, action, details=None, ip_address=None):
    """Log user activity"""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('''INSERT INTO activity_logs (user_id, action, details, ip_address)
                 VALUES (?, ?, ?, ?)''',
              (user_id, action, details, ip_address))
    conn.commit()
    conn.close()
    logger.info(f"Activity logged: User {user_id} - {action} - {details}")

# API Routes

@app.route('/api/register', methods=['POST'])
def register():
    """User registration endpoint"""
    try:
        data = request.get_json()
        name = data.get('name', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '').strip()
        
        if not name or not email or not password:
            logger.warning(f"Registration attempt with missing fields: {email}")
            return jsonify({'success': False, 'message': 'All fields are required'}), 400
        
        if len(password) < 6:
            logger.warning(f"Registration attempt with weak password: {email}")
            return jsonify({'success': False, 'message': 'Password must be at least 6 characters'}), 400
        
        conn = get_db_connection()
        c = conn.cursor()
        
        # Check if user exists
        c.execute('SELECT id FROM users WHERE email = ?', (email,))
        if c.fetchone():
            conn.close()
            logger.warning(f"Registration attempt with existing email: {email}")
            return jsonify({'success': False, 'message': 'Email already registered'}), 400
        
        # Create user
        hashed_password = generate_password_hash(password)
        c.execute('''INSERT INTO users (name, email, password)
                     VALUES (?, ?, ?)''',
                  (name, email, hashed_password))
        user_id = c.lastrowid
        conn.commit()
        conn.close()
        
        log_activity(user_id, 'REGISTER', f'New user registered: {name}', request.remote_addr)
        logger.info(f"User registered successfully: {email}")
        
        return jsonify({
            'success': True,
            'message': 'Account created successfully',
            'user': {'id': user_id, 'name': name, 'email': email}
        }), 201
        
    except Exception as e:
        logger.error(f"Registration error: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': 'Server error occurred'}), 500

@app.route('/api/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '').strip()
        
        if not email or not password:
            logger.warning(f"Login attempt with missing credentials")
            return jsonify({'success': False, 'message': 'Email and password are required'}), 400
        
        conn = get_db_connection()
        c = conn.cursor()
        c.execute('SELECT id, name, email, password FROM users WHERE email = ?', (email,))
        user = c.fetchone()
        conn.close()
        
        if not user or not check_password_hash(user['password'], password):
            logger.warning(f"Failed login attempt: {email}")
            return jsonify({'success': False, 'message': 'Invalid email or password'}), 401
        
        # Set session
        session['user_id'] = user['id']
        session['user_email'] = user['email']
        session['user_name'] = user['name']
        
        log_activity(user['id'], 'LOGIN', f'User logged in: {user["name"]}', request.remote_addr)
        logger.info(f"User logged in successfully: {email}")
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': {
                'id': user['id'],
                'name': user['name'],
                'email': user['email']
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': 'Server error occurred'}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    """User logout endpoint"""
    try:
        user_id = session.get('user_id')
        if user_id:
            log_activity(user_id, 'LOGOUT', 'User logged out', request.remote_addr)
            logger.info(f"User logged out: user_id={user_id}")
        
        session.clear()
        return jsonify({'success': True, 'message': 'Logged out successfully'}), 200
    except Exception as e:
        logger.error(f"Logout error: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': 'Server error occurred'}), 500

@app.route('/api/check-auth', methods=['GET'])
def check_auth():
    """Check if user is authenticated"""
    user_id = session.get('user_id')
    if user_id:
        return jsonify({
            'authenticated': True,
            'user': {
                'id': user_id,
                'name': session.get('user_name'),
                'email': session.get('user_email')
            }
        }), 200
    return jsonify({'authenticated': False}), 401

@app.route('/api/expenses', methods=['GET'])
def get_expenses():
    """Get all expenses for logged-in user"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'message': 'Authentication required'}), 401
        
        conn = get_db_connection()
        c = conn.cursor()
        c.execute('''SELECT id, title, amount, category, date, created_at
                     FROM expenses WHERE user_id = ? ORDER BY date DESC, created_at DESC''',
                  (user_id,))
        expenses = [dict(row) for row in c.fetchall()]
        conn.close()
        
        logger.info(f"Expenses retrieved for user_id={user_id}, count={len(expenses)}")
        return jsonify({'success': True, 'expenses': expenses}), 200
        
    except Exception as e:
        logger.error(f"Get expenses error: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': 'Server error occurred'}), 500

@app.route('/api/expenses', methods=['POST'])
def create_expense():
    """Create a new expense"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'message': 'Authentication required'}), 401
        
        data = request.get_json()
        title = data.get('title', '').strip()
        amount = float(data.get('amount', 0))
        category = data.get('category', 'Other')
        date = data.get('date') or datetime.now().strftime('%Y-%m-%d')
        
        if not title or amount <= 0:
            return jsonify({'success': False, 'message': 'Title and valid amount are required'}), 400
        
        conn = get_db_connection()
        c = conn.cursor()
        c.execute('''INSERT INTO expenses (user_id, title, amount, category, date)
                     VALUES (?, ?, ?, ?, ?)''',
                  (user_id, title, amount, category, date))
        expense_id = c.lastrowid
        conn.commit()
        conn.close()
        
        log_activity(user_id, 'CREATE_EXPENSE', f'Created expense: {title} - ₹{amount}', request.remote_addr)
        logger.info(f"Expense created: id={expense_id}, user_id={user_id}, title={title}")
        
        return jsonify({
            'success': True,
            'message': 'Expense added successfully',
            'expense': {'id': expense_id, 'title': title, 'amount': amount, 'category': category, 'date': date}
        }), 201
        
    except Exception as e:
        logger.error(f"Create expense error: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': 'Server error occurred'}), 500

@app.route('/api/expenses/<int:expense_id>', methods=['PUT'])
def update_expense(expense_id):
    """Update an existing expense"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'message': 'Authentication required'}), 401
        
        data = request.get_json()
        title = data.get('title', '').strip()
        amount = float(data.get('amount', 0))
        category = data.get('category', 'Other')
        date = data.get('date')
        
        if not title or amount <= 0:
            return jsonify({'success': False, 'message': 'Title and valid amount are required'}), 400
        
        conn = get_db_connection()
        c = conn.cursor()
        
        # Verify ownership
        c.execute('SELECT user_id FROM expenses WHERE id = ?', (expense_id,))
        expense = c.fetchone()
        if not expense or expense['user_id'] != user_id:
            conn.close()
            return jsonify({'success': False, 'message': 'Expense not found'}), 404
        
        c.execute('''UPDATE expenses SET title = ?, amount = ?, category = ?, date = ?
                     WHERE id = ? AND user_id = ?''',
                  (title, amount, category, date, expense_id, user_id))
        conn.commit()
        conn.close()
        
        log_activity(user_id, 'UPDATE_EXPENSE', f'Updated expense: {expense_id} - {title}', request.remote_addr)
        logger.info(f"Expense updated: id={expense_id}, user_id={user_id}")
        
        return jsonify({'success': True, 'message': 'Expense updated successfully'}), 200
        
    except Exception as e:
        logger.error(f"Update expense error: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': 'Server error occurred'}), 500

@app.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    """Delete an expense"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'message': 'Authentication required'}), 401
        
        conn = get_db_connection()
        c = conn.cursor()
        
        # Verify ownership
        c.execute('SELECT title, user_id FROM expenses WHERE id = ?', (expense_id,))
        expense = c.fetchone()
        if not expense or expense['user_id'] != user_id:
            conn.close()
            return jsonify({'success': False, 'message': 'Expense not found'}), 404
        
        c.execute('DELETE FROM expenses WHERE id = ? AND user_id = ?', (expense_id, user_id))
        conn.commit()
        conn.close()
        
        log_activity(user_id, 'DELETE_EXPENSE', f'Deleted expense: {expense_id} - {expense["title"]}', request.remote_addr)
        logger.info(f"Expense deleted: id={expense_id}, user_id={user_id}")
        
        return jsonify({'success': True, 'message': 'Expense deleted successfully'}), 200
        
    except Exception as e:
        logger.error(f"Delete expense error: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': 'Server error occurred'}), 500

@app.route('/api/summary', methods=['GET'])
def get_summary():
    """Get monthly summary for logged-in user"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'message': 'Authentication required'}), 401
        
        conn = get_db_connection()
        c = conn.cursor()
        
        # Get current month expenses
        current_month = datetime.now().strftime('%Y-%m')
        c.execute('''SELECT category, SUM(amount) as total
                     FROM expenses
                     WHERE user_id = ? AND date LIKE ?
                     GROUP BY category''',
                  (user_id, f'{current_month}%'))
        
        category_totals = {row['category']: row['total'] for row in c.fetchall()}
        
        c.execute('''SELECT SUM(amount) as total
                     FROM expenses
                     WHERE user_id = ? AND date LIKE ?''',
                  (user_id, f'{current_month}%'))
        monthly_total = c.fetchone()['total'] or 0
        
        conn.close()
        
        return jsonify({
            'success': True,
            'monthly_total': monthly_total,
            'category_totals': category_totals
        }), 200
        
    except Exception as e:
        logger.error(f"Get summary error: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': 'Server error occurred'}), 500

# Serve static files
@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/<path:path>')
def serve_static(path):
    return app.send_static_file(path)

if __name__ == '__main__':
    init_db()
    logger.info("Starting Expense Manager Flask application")
    app.run(debug=True, host='0.0.0.0', port=5000)

