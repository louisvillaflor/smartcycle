// PASSWORD VALIDATION AND STRENGTH CHECKER

const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');
const passwordError = document.getElementById('passwordError');
const confirmError = document.getElementById('confirmError');
const resetButton = document.querySelector('.reset-button');
const form = document.getElementById('resetPasswordForm');
const successMessage = document.getElementById('successMessage');
const strengthBars = document.querySelector('.strength-bars');
const strengthLabel = document.getElementById('strengthLabel');

// Password validation rules
const passwordRules = {
    minLength: 8,
    hasUpperCase: /[A-Z]/,
    hasLowerCase: /[a-z]/,
    hasNumber: /[0-9]/,
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/
};

// Check password strength
function checkPasswordStrength(password) {
    let strength = 0;
    
    if (password.length >= passwordRules.minLength) strength++;
    if (passwordRules.hasUpperCase.test(password)) strength++;
    if (passwordRules.hasLowerCase.test(password)) strength++;
    if (passwordRules.hasNumber.test(password)) strength++;
    if (passwordRules.hasSpecialChar.test(password)) strength++;
    
    return strength;
}

// Update strength indicator
function updateStrengthIndicator(strength) {
    // Remove all strength classes
    strengthBars.classList.remove('weak', 'fair', 'good', 'excellent');
    strengthLabel.classList.remove('weak', 'fair', 'good', 'excellent');
    
    if (strength === 0) {
        strengthLabel.textContent = '';
    } else if (strength <= 2) {
        strengthBars.classList.add('weak');
        strengthLabel.classList.add('weak');
        strengthLabel.textContent = 'Weak';
    } else if (strength === 3) {
        strengthBars.classList.add('fair');
        strengthLabel.classList.add('fair');
        strengthLabel.textContent = 'Fair';
    } else if (strength === 4) {
        strengthBars.classList.add('good');
        strengthLabel.classList.add('good');
        strengthLabel.textContent = 'Good';
    } else if (strength === 5) {
        strengthBars.classList.add('excellent');
        strengthLabel.classList.add('excellent');
        strengthLabel.textContent = 'Excellent';
    }
}

// Validate password against all rules
function isPasswordValid(password) {
    return password.length >= passwordRules.minLength &&
           passwordRules.hasUpperCase.test(password) &&
           passwordRules.hasLowerCase.test(password) &&
           passwordRules.hasNumber.test(password) &&
           passwordRules.hasSpecialChar.test(password);
}

// Real-time password validation and strength checking
newPasswordInput.addEventListener('input', function() {
    const password = this.value;
    const strength = checkPasswordStrength(password);
    const strengthContainer = document.querySelector('.password-strength');
    
    // Show/hide strength indicator based on input
    if (password.length > 0) {
        strengthContainer.classList.add('show');
    } else {
        strengthContainer.classList.remove('show');
    }
    
    // Update strength indicator
    updateStrengthIndicator(strength);
    
    // Validate password
    if (password.length > 0) {
        if (isPasswordValid(password)) {
            this.classList.remove('invalid');
            this.classList.add('valid');
            this.setAttribute('aria-invalid', 'false');
            passwordError.classList.remove('show');
        } else {
            this.classList.remove('valid');
            this.classList.add('invalid');
            this.setAttribute('aria-invalid', 'true');
            passwordError.classList.add('show');
        }
        
        // Also check if confirm password matches
        if (confirmPasswordInput.value.length > 0) {
            validateConfirmPassword();
        }
    } else {
        this.classList.remove('valid', 'invalid');
        this.setAttribute('aria-invalid', 'false');
        passwordError.classList.remove('show');
    }
});

// Validate confirm password
function validateConfirmPassword() {
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    if (confirmPassword.length > 0) {
        if (confirmPassword === newPassword && isPasswordValid(newPassword)) {
            confirmPasswordInput.classList.remove('invalid');
            confirmPasswordInput.classList.add('valid');
            confirmPasswordInput.setAttribute('aria-invalid', 'false');
            confirmError.classList.remove('show');
        } else {
            confirmPasswordInput.classList.remove('valid');
            confirmPasswordInput.classList.add('invalid');
            confirmPasswordInput.setAttribute('aria-invalid', 'true');
            confirmError.classList.add('show');
        }
    } else {
        confirmPasswordInput.classList.remove('valid', 'invalid');
        confirmPasswordInput.setAttribute('aria-invalid', 'false');
        confirmError.classList.remove('show');
    }
}

// Real-time confirm password validation
confirmPasswordInput.addEventListener('input', validateConfirmPassword);

// PASSWORD TOGGLE FUNCTIONS
function togglePassword(inputId, iconId) {
    const passwordInput = document.getElementById(inputId);
    const toggleIcon = document.getElementById(iconId);
    const toggleButton = toggleIcon.closest('.toggle-password');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleButton.setAttribute('aria-pressed', 'true');
        toggleButton.setAttribute('aria-label', 'Hide password');
        // Eye icon when password is visible
        toggleIcon.innerHTML = `
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
        `;
    } else {
        passwordInput.type = 'password';
        toggleButton.setAttribute('aria-pressed', 'false');
        toggleButton.setAttribute('aria-label', 'Show password');
        // Eye-off icon when password is hidden
        toggleIcon.innerHTML = `
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
        `;
    }
}

// FORM SUBMISSION
form.addEventListener('submit', function (e) {
    e.preventDefault();

    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    let isValid = true;

    // Validate new password
    if (!isPasswordValid(newPassword)) {
        newPasswordInput.classList.add('invalid');
        newPasswordInput.classList.remove('valid');
        newPasswordInput.setAttribute('aria-invalid', 'true');
        passwordError.classList.add('show');
        isValid = false;
        newPasswordInput.focus();
    } else {
        newPasswordInput.classList.remove('invalid');
        newPasswordInput.classList.add('valid');
        newPasswordInput.setAttribute('aria-invalid', 'false');
        passwordError.classList.remove('show');
    }

    // Validate confirm password
    if (confirmPassword !== newPassword || !isPasswordValid(newPassword)) {
        confirmPasswordInput.classList.add('invalid');
        confirmPasswordInput.classList.remove('valid');
        confirmPasswordInput.setAttribute('aria-invalid', 'true');
        confirmError.classList.add('show');
        isValid = false;
        
        if (isPasswordValid(newPassword)) {
            confirmPasswordInput.focus();
        }
    } else {
        confirmPasswordInput.classList.remove('invalid');
        confirmPasswordInput.classList.add('valid');
        confirmPasswordInput.setAttribute('aria-invalid', 'false');
        confirmError.classList.remove('show');
    }

    // Stop if validation failed
    if (!isValid) {
        return;
    }

    // Show loading state
    resetButton.disabled = true;
    resetButton.classList.add('loading');

    // Simulate call, replace with actual password reset logic
    setTimeout(() => {
        // Remove loading state
        resetButton.disabled = false;
        resetButton.classList.remove('loading');
        
        // Hide form and show success message
        form.style.display = 'none';
        successMessage.classList.add('show');
        
    }, 2000); 
});
