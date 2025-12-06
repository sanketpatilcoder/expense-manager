# 🚀 Quick Setup Guide

## Step 1: Install Dependencies

Open your terminal/command prompt and run:

```bash
pip install -r requirements.txt
```

## Step 2: Start the Server

Run the Flask application:

```bash
python app.py
```

You should see:
```
Starting Expense Manager Flask application
 * Running on http://0.0.0.0:5000
```

## Step 3: Open in Browser

Navigate to:
```
http://localhost:5000
```

## Step 4: Create Your Account

1. Click "Sign Up" or go to `http://localhost:5000/signup.html`
2. Enter your name, email, and password
3. Click "Sign Up"
4. You'll be redirected to the login page

## Step 5: Login

1. Enter your email and password
2. Click "Login"
3. You'll be redirected to the home page

## 🎉 You're Ready!

Start adding expenses and managing your finances!

---

## Troubleshooting

**Port 5000 already in use?**
- Change the port in `app.py` (line 280): `app.run(debug=True, host='0.0.0.0', port=5001)`

**Database errors?**
- Delete `expense_manager.db` and restart the app

**Can't see logs?**
- The `logs/` directory will be created automatically on first run

---

For more details, see `README.md`

