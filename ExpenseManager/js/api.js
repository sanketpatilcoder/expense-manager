/**
 * API Client for Expense Manager
 * Handles all communication with Flask backend
 */

const API_BASE_URL = 'http://localhost:5000/api';

// Helper function for API calls
async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include' // Important for session cookies
    };
    
    if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Request failed');
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Auth API
const authAPI = {
    async register(name, email, password) {
        return await apiCall('/register', 'POST', { name, email, password });
    },
    
    async login(email, password) {
        return await apiCall('/login', 'POST', { email, password });
    },
    
    async logout() {
        return await apiCall('/logout', 'POST');
    },
    
    async checkAuth() {
        return await apiCall('/check-auth', 'GET');
    }
};

// Expenses API
const expensesAPI = {
    async getAll() {
        return await apiCall('/expenses', 'GET');
    },
    
    async create(expense) {
        return await apiCall('/expenses', 'POST', expense);
    },
    
    async update(id, expense) {
        return await apiCall(`/expenses/${id}`, 'PUT', expense);
    },
    
    async delete(id) {
        return await apiCall(`/expenses/${id}`, 'DELETE');
    }
};

// Summary API
const summaryAPI = {
    async getMonthly() {
        return await apiCall('/summary', 'GET');
    }
};

