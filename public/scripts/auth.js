// Auth utility functions
function showMessage(elementId, message, isError = true) {
    const messageElement = document.getElementById(elementId);
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.classList.add('show');
        
        // Hide other message type
        const otherMessageId = isError ? 'successMessage' : 'errorMessage';
        const otherElement = document.getElementById(otherMessageId);
        if (otherElement) {
            otherElement.classList.remove('show');
        }
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            messageElement.classList.remove('show');
        }, 5000);
    }
}

function setLoading(buttonId, isLoading) {
    const button = document.getElementById(buttonId);
    if (button) {
        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }
}

// Safely parse JSON responses (handles empty/non-JSON bodies)
async function parseResponseJSON(response) {
    try {
        const text = await response.text();
        if (!text) return { success: response.ok };
        return JSON.parse(text);
    } catch (err) {
        console.warn('Failed to parse JSON response:', err);
        return { success: response.ok, message: 'Unexpected server response' };
    }
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    // Basic validation
    if (!email || !password) {
        showMessage('errorMessage', 'Please fill in all fields');
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage('errorMessage', 'Please enter a valid email address');
        return;
    }
    
    setLoading('loginBtn', true);
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
    const data = await parseResponseJSON(response);
        
        if (data.success) {
            showMessage('successMessage', 'Login successful! Redirecting...', false);
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);
        } else {
            showMessage('errorMessage', data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('errorMessage', 'Network error. Please try again.');
    } finally {
        setLoading('loginBtn', false);
    }
}

// Handle signup form submission
async function handleSignup(event) {
    event.preventDefault();
    
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;
    
    // Basic validation
    if (!fullName || !email || !password || !confirmPassword) {
        showMessage('errorMessage', 'Please fill in all fields');
        return;
    }
    
    if (!agreeTerms) {
        showMessage('errorMessage', 'Please agree to the Terms of Service');
        return;
    }
    
    // Name validation
    if (fullName.length < 2) {
        showMessage('errorMessage', 'Full name must be at least 2 characters long');
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage('errorMessage', 'Please enter a valid email address');
        return;
    }
    
    // Password validation
    if (password.length < 6) {
        showMessage('errorMessage', 'Password must be at least 6 characters long');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('errorMessage', 'Passwords do not match');
        return;
    }
    
    setLoading('signupBtn', true);
    
    try {
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fullName,
                email,
                password,
                confirmPassword
            })
        });
        
    const data = await parseResponseJSON(response);
        
        if (data.success) {
            showMessage('successMessage', 'Account created successfully! Redirecting...', false);
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);
        } else {
            showMessage('errorMessage', data.message || 'Signup failed');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showMessage('errorMessage', 'Network error. Please try again.');
    } finally {
        setLoading('signupBtn', false);
    }
}

// Password strength checker
function checkPasswordStrength(password) {
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.querySelector('.strength-text');
    
    if (!strengthBar || !strengthText) return;
    
    let strength = 0;
    let strengthLabel = '';
    
    // Length check
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    
    // Character variety checks
    if (/[a-z]/.test(password)) strength += 12;
    if (/[A-Z]/.test(password)) strength += 12;
    if (/[0-9]/.test(password)) strength += 13;
    if (/[^A-Za-z0-9]/.test(password)) strength += 13;
    
    // Update strength bar
    strengthBar.style.setProperty('--strength', `${strength}%`);
    
    // Update strength text
    if (strength < 25) {
        strengthLabel = 'Very Weak';
        strengthText.style.color = '#ef4444';
    } else if (strength < 50) {
        strengthLabel = 'Weak';
        strengthText.style.color = '#f97316';
    } else if (strength < 75) {
        strengthLabel = 'Good';
        strengthText.style.color = '#eab308';
    } else {
        strengthLabel = 'Strong';
        strengthText.style.color = '#22c55e';
    }
    
    strengthText.textContent = `Password strength: ${strengthLabel}`;
    
    // Update CSS custom property for bar width
    const afterElement = window.getComputedStyle(strengthBar, '::after');
    strengthBar.style.setProperty('--strength-width', `${strength}%`);
    
    // Apply the width using a data attribute that CSS can read
    strengthBar.setAttribute('data-strength', strength);
}

// Add CSS for password strength bar animation
const style = document.createElement('style');
style.textContent = `
.strength-bar::after {
    width: attr(data-strength 0%);
    transition: width 0.3s ease;
}
.strength-bar[data-strength="0"]::after { width: 0%; }
.strength-bar[data-strength]::after { 
    width: calc(var(--strength-width, 0%) * 1);
}
`;
document.head.appendChild(style);

// Form input enhancements
document.addEventListener('DOMContentLoaded', function() {
    // Add input focus effects
    const inputs = document.querySelectorAll('.form-group input');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            if (!this.value) {
                this.parentElement.classList.remove('focused');
            }
        });
        
        // Keep focused state if input has value
        if (input.value) {
            input.parentElement.classList.add('focused');
        }
    });
    
    // Real-time email validation
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('blur', function() {
            const email = this.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            
            if (email && !emailRegex.test(email)) {
                this.style.borderColor = '#ef4444';
                this.setCustomValidity('Please enter a valid email address');
            } else {
                this.style.borderColor = '#d1d5db';
                this.setCustomValidity('');
            }
        });
    }
});