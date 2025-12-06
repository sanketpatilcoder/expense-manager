/***********************************************
 * script.js (FULL FEATURED - Flask Backend)
 * - Signup / Login / Logout (Flask API)
 * - Save / Load / Edit / Delete expenses (per-user)
 * - Search / Filter / Sort
 * - Monthly summary (per-user)
 * - Budget progress, CSV export, Clear All
 ***********************************************/

// Global state
let currentUser = null;
let expensesCache = [];
let budgetCache = 0;

/* ---------- Helpers & Storage ---------- */
function getLoggedUserEmail() {
    return currentUser ? currentUser.email : null;
}

function getBudgetForUser() {
    return budgetCache;
}

function setBudgetForUser(amount) {
    budgetCache = amount;
    localStorage.setItem('budget', String(amount));
}

// Load budget from localStorage on init
if (localStorage.getItem('budget')) {
    budgetCache = parseFloat(localStorage.getItem('budget')) || 0;
}

// Currency formatting helper for Indian Rupees
function formatCurrency(amount) {
    const num = Number(amount) || 0;
    try {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(num);
    } catch (e) {
        // fallback to manual format
        return '₹' + num.toFixed(2);
    }
}

/* ---------- Auth (Flask API) ---------- */
async function registerUser() {
    const name = (document.getElementById("reg-name") || {}).value || "";
    const email = (document.getElementById("reg-email") || {}).value || "";
    const pass = (document.getElementById("reg-pass") || {}).value || "";
    
    if (!name.trim() || !email.trim() || !pass.trim()) {
        showNotification("Please fill all fields.", "error");
        return;
    }
    
    try {
        const result = await authAPI.register(name, email, pass);
        if (result.success) {
            showNotification("Account created! Please login.", "success");
            setTimeout(() => window.location.href = "login.html", 1000);
        }
    } catch (error) {
        showNotification(error.message || "Registration failed", "error");
    }
}

async function loginUser() {
    const email = (document.getElementById("login-email") || {}).value || "";
    const pass = (document.getElementById("login-password") || {}).value || "";
    
    if (!email.trim() || !pass.trim()) {
        showNotification("Enter credentials", "error");
        return;
    }
    
    try {
        const result = await authAPI.login(email, pass);
        if (result.success) {
            currentUser = result.user;
            showNotification("Login successful!", "success");
            setTimeout(() => window.location.href = "index.html", 500);
        }
    } catch (error) {
        showNotification(error.message || "Invalid email or password", "error");
    }
}

async function logoutUser() {
    try {
        await authAPI.logout();
        currentUser = null;
        expensesCache = [];
        showNotification("Logged out successfully", "success");
        setTimeout(() => window.location.href = "login.html", 500);
    } catch (error) {
        console.error("Logout error:", error);
        currentUser = null;
        window.location.href = "login.html";
    }
}

async function checkLogin() {
    try {
        const result = await authAPI.checkAuth();
        if (result.authenticated) {
            currentUser = result.user;
        } else {
            window.location.href = "login.html";
        }
    } catch (error) {
        window.location.href = "login.html";
    }
}

function showLoggedUserNameIfAny() {
    const el = document.getElementById("logged-user-name");
    if (!el) return;
    const name = currentUser ? currentUser.name : "";
    el.innerText = name ? `Hi, ${name}` : "";
}

// Notification system
function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = "slideOut 0.3s ease";
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/* ---------- Expense CRUD (Flask API) ---------- */
async function saveExpense() {
    if (!currentUser) {
        showNotification("Login required", "error");
        window.location.href = "login.html";
        return;
    }

    const title = (document.getElementById("title") || {}).value || "";
    const amount = (document.getElementById("amount") || {}).value || "";
    const category = (document.getElementById("category") || {}).value || "Other";
    let date = (document.getElementById("date") || {}).value || "";

    if (!title.trim() || !amount) {
        showNotification("Please enter title and amount.", "error");
        return;
    }
    if (!date) date = new Date().toISOString().slice(0,10);

    try {
        const result = await expensesAPI.create({
            title: title.trim(),
            amount: parseFloat(amount),
            category,
            date
        });

        if (result.success) {
            // reset inputs
            if (document.getElementById("title")) document.getElementById("title").value = "";
            if (document.getElementById("amount")) document.getElementById("amount").value = "";
            if (document.getElementById("date")) document.getElementById("date").value = "";

            // refresh UI
            await loadExpenses();
            await loadMonthlySummary();
            showNotification("Expense added successfully!", "success");
        }
    } catch (error) {
        showNotification(error.message || "Failed to add expense", "error");
    }
}

/* ---------- Render + Controls ---------- */
// core renderer with search/filter/sort support
async function loadExpenses(options = {}) {
    // options: search, category, fromDate, toDate, sortBy ('date-desc','date-asc','amount-desc','amount-asc','title-asc')
    const container = document.getElementById("expense-list");
    if (!container) return;
    
    if (!currentUser) {
        container.innerHTML = "<p>Please login</p>";
        return;
    }

    try {
        const result = await expensesAPI.getAll();
        if (result.success) {
            expensesCache = result.expenses;
        }
    } catch (error) {
        console.error("Failed to load expenses:", error);
        showNotification("Failed to load expenses", "error");
        expensesCache = [];
    }

    let result = expensesCache.slice();

    // apply filters
    const search = (options.search || document.getElementById("search")?.value || "").trim().toLowerCase();
    const filterCategory = options.category || document.getElementById("filter-category")?.value || "all";
    const fromDate = options.fromDate || document.getElementById("filter-from")?.value || "";
    const toDate = options.toDate || document.getElementById("filter-to")?.value || "";
    const sortBy = options.sortBy || document.getElementById("sort-by")?.value || "date-desc";

    if (search) {
        result = result.filter(r => (r.title || "").toLowerCase().includes(search) || (r.category || "").toLowerCase().includes(search));
    }
    if (filterCategory && filterCategory !== "all") {
        result = result.filter(r => r.category === filterCategory);
    }
    if (fromDate) {
        const f = new Date(fromDate);
        result = result.filter(r => new Date(r.date) >= f);
    }
    if (toDate) {
        const t = new Date(toDate);
        result = result.filter(r => new Date(r.date) <= t);
    }

    // sorting
    if (sortBy === "date-desc") result.sort((a,b) => new Date(b.date) - new Date(a.date));
    else if (sortBy === "date-asc") result.sort((a,b) => new Date(a.date) - new Date(b.date));
    else if (sortBy === "amount-desc") result.sort((a,b) => b.amount - a.amount);
    else if (sortBy === "amount-asc") result.sort((a,b) => a.amount - b.amount);
    else if (sortBy === "title-asc") result.sort((a,b) => a.title.localeCompare(b.title));

    // render
    container.innerHTML = "";
    if (result.length === 0) {
        container.innerHTML = "<div class='empty'>No expenses match your filters.</div>";
        showBudgetProgress(); // still show progress
        return;
    }

    result.forEach((exp, i) => {
        container.innerHTML += `
            <div class="expense-card" data-id="${exp.id}" style="--i:${i}">
                <div class="card-left">
                    <h3>${escapeHtml(exp.title)}</h3>
                    <p>${escapeHtml(exp.category)} • ${escapeHtml(exp.date)}</p>
                </div>
                <div class="card-right">
                    <span class="amount">${formatCurrency(exp.amount)}</span>
                    <div class="card-actions">
                        <button class="btn-edit" onclick="openEditModal(${exp.id})">Edit</button>
                        <button class="btn-delete" onclick="confirmDelete(${exp.id})">Delete</button>
                    </div>
                </div>
            </div>
        `;
    });

    showBudgetProgress();
}

// escape helper
function escapeHtml(text) {
    if (!text) return "";
    return text.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[m]);
}

/* ---------- Edit / Delete ---------- */
function openEditModal(expenseId) {
    const exp = expensesCache.find(e => e.id === expenseId);
    if (!exp) {
        showNotification("Expense not found", "error");
        return;
    }

    // populate modal fields
    document.getElementById("edit-id").value = exp.id;
    document.getElementById("edit-title").value = exp.title;
    document.getElementById("edit-amount").value = exp.amount;
    document.getElementById("edit-category").value = exp.category;
    document.getElementById("edit-date").value = exp.date;

    // show modal
    document.getElementById("edit-modal").classList.add("open");
}

function closeEditModal() {
    document.getElementById("edit-modal").classList.remove("open");
}

async function saveEdit() {
    const id = parseInt(document.getElementById("edit-id").value, 10);
    const title = (document.getElementById("edit-title") || {}).value || "";
    const amount = (document.getElementById("edit-amount") || {}).value || "";
    const category = (document.getElementById("edit-category") || {}).value || "Other";
    const date = (document.getElementById("edit-date") || {}).value || new Date().toISOString().slice(0,10);

    if (!title.trim() || amount === "") {
        showNotification("Please fill title and amount.", "error");
        return;
    }

    try {
        const result = await expensesAPI.update(id, {
            title: title.trim(),
            amount: parseFloat(amount),
            category,
            date
        });

        if (result.success) {
            closeEditModal();
            await loadExpenses();
            await loadMonthlySummary();
            showNotification("Expense updated successfully!", "success");
        }
    } catch (error) {
        showNotification(error.message || "Failed to update expense", "error");
    }
}

function confirmDelete(expenseId) {
    const ok = confirm("Are you sure you want to delete this expense?");
    if (!ok) return;
    deleteExpense(expenseId);
}

async function deleteExpense(expenseId) {
    try {
        const result = await expensesAPI.delete(expenseId);
        if (result.success) {
            await loadExpenses();
            await loadMonthlySummary();
            showNotification("Expense deleted successfully!", "success");
        }
    } catch (error) {
        showNotification(error.message || "Failed to delete expense", "error");
    }
}

/* ---------- Search / Filter / Sort UI Handlers ---------- */
function onFilterChange() {
    loadExpenses();
}
function onSearchInput() {
    loadExpenses();
}
function onSortChange() {
    loadExpenses();
}
function clearFilters() {
    if (document.getElementById("search")) document.getElementById("search").value = "";
    if (document.getElementById("filter-category")) document.getElementById("filter-category").value = "all";
    if (document.getElementById("filter-from")) document.getElementById("filter-from").value = "";
    if (document.getElementById("filter-to")) document.getElementById("filter-to").value = "";
    if (document.getElementById("sort-by")) document.getElementById("sort-by").value = "date-desc";
    loadExpenses();
}

/* ---------- Budget Progress & CSV & Clear ---------- */
function showBudgetProgress() {
    if (!currentUser) {
        const prog = document.getElementById("budget-progress");
        if (prog) prog.style.display = "none";
        return;
    }
    const budget = getBudgetForUser();
    // total for current month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthlyTotal = expensesCache.filter(e => {
        if (!e.date) return false;
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).reduce((s,e) => s + Number(e.amount || 0), 0);

    const prog = document.getElementById("budget-progress");
    if (!prog) return;
    prog.style.display = "block";

    const bar = document.getElementById("budget-bar");
    const pctEl = document.getElementById("budget-percent");
    if (budget <= 0) {
        bar.style.width = "6%";
        pctEl.innerText = `No budget set`;
        document.getElementById("budget-total").innerText = `Spent: ` + formatCurrency(monthlyTotal);
        return;
    }
    const percent = Math.min(100, Math.round((monthlyTotal / budget) * 100));
    bar.style.width = percent + "%";
    pctEl.innerText = `${percent}% of ${formatCurrency(budget)}`;
    document.getElementById("budget-total").innerText = `Spent: ` + formatCurrency(monthlyTotal);
}

function setBudget() {
    if (!currentUser) {
        showNotification("Login required", "error");
        return;
    }
    const val = parseFloat((document.getElementById("budget-amount") || {}).value || "0");
    if (isNaN(val) || val < 0) {
        showNotification("Enter valid budget", "error");
        return;
    }
    setBudgetForUser(val);
    showNotification("Budget saved", "success");
    showBudgetProgress();
}

function exportCSV() {
    if (!currentUser) {
        showNotification("Login required", "error");
        return;
    }
    if (expensesCache.length === 0) {
        showNotification("No expenses to export", "error");
        return;
    }

    const header = ["Title", "Amount", "Category", "Date", "Created At"];
    const rows = expensesCache.map(r => [r.title, r.amount, r.category, r.date, r.created_at]);
    const csv = [header, ...rows].map(r => r.map(String).map(c => `"${c.replace(/"/g,'""')}"`).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses_${currentUser.email}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification("CSV exported successfully!", "success");
}

async function clearAllExpensesForUser() {
    if (!confirm("Clear ALL expenses for your account? This cannot be undone.")) return;
    if (!currentUser) return;
    
    try {
        // Delete all expenses one by one (or implement bulk delete in API)
        for (const expense of expensesCache) {
            await expensesAPI.delete(expense.id);
        }
        await loadExpenses();
        await loadMonthlySummary();
        showNotification("All expenses cleared", "success");
    } catch (error) {
        showNotification("Failed to clear expenses", "error");
    }
}

/* ---------- Monthly Summary (per-user) ---------- */
async function loadMonthlySummary() {
    const monthNameEl = document.getElementById("month-name");
    const totalEl = document.getElementById("total-month-expense");
    const catEl = document.getElementById("category-summary");
    const listEl = document.getElementById("monthly-list");

    if (!monthNameEl || !totalEl || !catEl || !listEl) return;

    if (!currentUser) {
        monthNameEl.innerText = "";
        totalEl.innerText = formatCurrency(0);
        catEl.innerHTML = "";
        listEl.innerHTML = "<p>Please login</p>";
        return;
    }

    const now = new Date();
    monthNameEl.innerText = now.toLocaleString("default", { month: "long", year: "numeric" });

    try {
        const result = await summaryAPI.getMonthly();
        if (result.success) {
            const monthlyTotal = result.monthly_total || 0;
            const catTotals = result.category_totals || {};
            
            totalEl.innerText = formatCurrency(monthlyTotal);

            catEl.innerHTML = "";
            if (Object.keys(catTotals).length === 0) {
                catEl.innerHTML = "<div class='empty'>No expenses this month</div>";
            } else {
                for (const c in catTotals) {
                    catEl.innerHTML += `<div class="cat-item"><span>${escapeHtml(c)}</span><strong>${formatCurrency(catTotals[c])}</strong></div>`;
                }
            }

            // Get monthly expenses for list
            const monthlyData = expensesCache.filter(e => {
                if (!e.date) return false;
                const d = new Date(e.date);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).sort((a,b) => new Date(b.date) - new Date(a.date));

            listEl.innerHTML = "";
            if (monthlyData.length === 0) {
                listEl.innerHTML = "<div class='empty'>No expenses this month</div>";
            } else {
                monthlyData.forEach((e,i) => {
                    listEl.innerHTML += `<div class="expense-card" style="--i:${i}"><h3>${escapeHtml(e.title)}</h3><p>${escapeHtml(e.category)} • ${escapeHtml(e.date)}</p><span class="amount">${formatCurrency(e.amount)}</span></div>`;
                });
            }
        }
    } catch (error) {
        console.error("Failed to load summary:", error);
    }
}

/* ---------- Init on DOMContentLoaded ---------- */
document.addEventListener("DOMContentLoaded", async function() {
    // Check authentication on protected pages
    const protectedPages = ['index.html', 'add.html', 'list.html', 'summary.html', 'categories.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage)) {
        try {
            const result = await authAPI.checkAuth();
            if (result.authenticated) {
                currentUser = result.user;
            } else {
                window.location.href = "login.html";
                return;
            }
        } catch (error) {
            window.location.href = "login.html";
            return;
        }
    }

    showLoggedUserNameIfAny();

    // wire up filter/search events if they exist
    const searchEl = document.getElementById("search");
    if (searchEl) searchEl.addEventListener("input", onSearchInput);

    const filterCategory = document.getElementById("filter-category");
    if (filterCategory) filterCategory.addEventListener("change", onFilterChange);

    const filterFrom = document.getElementById("filter-from");
    const filterTo = document.getElementById("filter-to");
    if (filterFrom) filterFrom.addEventListener("change", onFilterChange);
    if (filterTo) filterTo.addEventListener("change", onFilterChange);

    const sortBy = document.getElementById("sort-by");
    if (sortBy) sortBy.addEventListener("change", onSortChange);

    // Edit modal buttons
    const editSaveBtn = document.getElementById("edit-save-btn");
    if (editSaveBtn) editSaveBtn.addEventListener("click", saveEdit);
    const editCancelBtn = document.getElementById("edit-cancel-btn");
    if (editCancelBtn) editCancelBtn.addEventListener("click", closeEditModal);

    // budget set
    const setBudgetBtn = document.getElementById("set-budget-btn");
    if (setBudgetBtn) setBudgetBtn.addEventListener("click", setBudget);

    // export / clear
    const exportBtn = document.getElementById("export-csv-btn");
    if (exportBtn) exportBtn.addEventListener("click", exportCSV);
    const clearAllBtn = document.getElementById("clear-all-btn");
    if (clearAllBtn) clearAllBtn.addEventListener("click", clearAllExpensesForUser);

    // load initial UI if on pages
    await loadExpenses();
    showBudgetProgress();
    await loadMonthlySummary();
});
