# 💰 Expense Manager - Professional Web Application

A modern, full-featured expense management system with Flask backend, comprehensive logging, and a beautiful professional UI.

## ✨ Features

- 🔐 **Secure Authentication** - Flask-based login/signup with password hashing
- 📊 **Expense Management** - Create, read, update, and delete expenses
- 📈 **Monthly Summary** - View expenses by category and month
- 🔍 **Advanced Filtering** - Search, filter by category, date range, and sort
- 💾 **Data Export** - Export expenses to CSV
- 📝 **Activity Logging** - Comprehensive logging system for all user actions
- 🎨 **Modern UI** - Beautiful, responsive design with animations and graphics
- 💰 **Budget Tracking** - Set and monitor monthly budgets

## 🚀 Quick Start

### Prerequisites

- Python 3.7 or higher
- pip (Python package manager)

### Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd ExpenseManager
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Flask application:**
   ```bash
   python app.py
   ```

4. **Open your browser and navigate to:**
   ```
   http://localhost:5000
   ```

## 📁 Project Structure

```
ExpenseManager/
├── app.py                 # Flask backend server
├── requirements.txt       # Python dependencies
├── expense_manager.db     # SQLite database (created automatically)
├── logs/                  # Application logs directory
│   └── expense_manager.log
├── js/
│   ├── api.js            # API client for Flask backend
│   └── script.js         # Main frontend JavaScript
├── css/
│   ├── login.css         # Login page styles
│   ├── home.css          # Home page styles
│   ├── add.css           # Add expense page styles
│   ├── list.css          # Expense list page styles
│   ├── summary.css       # Summary page styles
│   └── navbar.css        # Navigation bar styles
├── login.html            # Login page
├── signup.html           # Signup page
├── index.html            # Home page
├── add.html              # Add expense page
├── list.html             # View expenses page
└── summary.html          # Monthly summary page
```

## 🔧 Configuration

### Database

The application uses SQLite database (`expense_manager.db`) which is automatically created on first run. The database includes:

- **users** - User accounts with hashed passwords
- **expenses** - Expense records linked to users
- **activity_logs** - Comprehensive activity logging

### Logging

Logs are stored in the `logs/` directory:
- **expense_manager.log** - Main application log file
- Logs rotate automatically (10MB max, 10 backup files)
- Logs include timestamps, user actions, IP addresses, and error details

### API Endpoints

- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/check-auth` - Check authentication status
- `GET /api/expenses` - Get all expenses for logged-in user
- `POST /api/expenses` - Create new expense
- `PUT /api/expenses/<id>` - Update expense
- `DELETE /api/expenses/<id>` - Delete expense
- `GET /api/summary` - Get monthly summary

## 🎨 UI Features

- **Modern Gradient Backgrounds** - Animated gradient backgrounds with floating elements
- **Glass Morphism** - Frosted glass effect on cards and forms
- **Smooth Animations** - CSS animations and transitions throughout
- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Interactive Elements** - Hover effects, button animations, and visual feedback
- **Professional Typography** - Clean, modern font styling
- **Notification System** - Toast notifications for user actions

## 📝 Usage

1. **Sign Up**: Create a new account with your name, email, and password
2. **Login**: Use your credentials to access the application
3. **Add Expenses**: Click "Add Expense" to record new expenses
4. **View Expenses**: Browse all your expenses with filtering and sorting options
5. **Monthly Summary**: View category-wise breakdown of monthly expenses
6. **Set Budget**: Set a monthly budget and track your spending
7. **Export Data**: Download your expenses as a CSV file

## 🔒 Security Features

- Password hashing using Werkzeug's secure password hashing
- Session-based authentication
- SQL injection protection via parameterized queries
- User data isolation (users can only access their own expenses)
- Comprehensive activity logging for security auditing

## 📊 Logging

The application logs:
- User registrations and logins
- All expense operations (create, update, delete)
- Error messages and stack traces
- IP addresses for security tracking
- Timestamps for all activities

View logs in: `logs/expense_manager.log`

## 🛠️ Development

### Running in Development Mode

The Flask app runs in debug mode by default. To change this, modify `app.py`:

```python
app.run(debug=False, host='0.0.0.0', port=5000)
```

### Database Reset

To reset the database, simply delete `expense_manager.db` and restart the application.

## 🐛 Troubleshooting

**Issue: Port 5000 already in use**
- Solution: Change the port in `app.py` or stop the process using port 5000

**Issue: Database errors**
- Solution: Delete `expense_manager.db` and restart the application

**Issue: CORS errors**
- Solution: Ensure Flask-CORS is installed and configured correctly

**Issue: Logs directory not found**
- Solution: The application will create the `logs/` directory automatically

## 📄 License

This project is open source and available for personal and commercial use.

## 👨‍💻 Author

Expense Manager - Professional Expense Tracking System

---

**Enjoy managing your expenses! 💰✨**

