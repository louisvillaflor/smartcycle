// EMAIL VALIDATION

const emailInput = document.getElementById('email');
const emailError = document.getElementById('emailError');
const resetButton = document.querySelector('.reset-button');
const form = document.getElementById('forgotPasswordForm');
const successMessage = document.getElementById('successMessage');
const resendButton = document.getElementById('resendButton');

// Email regex pattern
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Real-time email validation on input
emailInput.addEventListener('input', function() {
    const email = this.value.trim();
    
    // Only validate if there's input
    if (email.length > 0) {
        if (emailPattern.test(email)) {
            // Valid email
            this.classList.remove('invalid');
            this.classList.add('valid');
            this.setAttribute('aria-invalid', 'false');
            emailError.classList.remove('show');
        } else {
            // Invalid email
            this.classList.remove('valid');
            this.classList.add('invalid');
            this.setAttribute('aria-invalid', 'true');
            emailError.classList.add('show');
        }
    } else {
        // Empty - reset to neutral
        this.classList.remove('valid', 'invalid');
        this.setAttribute('aria-invalid', 'false');
        emailError.classList.remove('show');
    }
});

// FORM SUBMISSION
form.addEventListener('submit', function (e) {
    e.preventDefault();

    const email = emailInput.value.trim();
    let isValid = true;

    // Validate email
    if (!emailPattern.test(email)) {
        emailInput.classList.add('invalid');
        emailInput.classList.remove('valid');
        emailInput.setAttribute('aria-invalid', 'true');
        emailError.classList.add('show');
        isValid = false;
        emailInput.focus();
    } else {
        emailInput.classList.remove('invalid');
        emailInput.classList.add('valid');
        emailInput.setAttribute('aria-invalid', 'false');
        emailError.classList.remove('show');
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
        
        // Hide only the form (keep header visible) and show success message
        form.style.display = 'none';
        successMessage.classList.add('show');
        
        // Store the email for resend functionality
        sessionStorage.setItem('resetEmail', email);
        
    }, 2000); // 2 second simulated delay
});


// RESEND EMAIL FUNCTIONALITY
let resendCooldown = false;

resendButton.addEventListener('click', function() {
    if (resendCooldown) {
        return;
    }

    const email = sessionStorage.getItem('resetEmail');
    
    // Disable button temporarily
    this.disabled = true;
    resendCooldown = true;
    
    // Show loading state
    this.textContent = 'Sending...';

    // Simulate resend, replace with actual logic
    setTimeout(() => {
        this.textContent = 'Email sent!';
        
        // Reset after 2 seconds
        setTimeout(() => {
            this.textContent = 'Resend Email';
            this.disabled = false;
            resendCooldown = false;
        }, 2000);
        
    }, 1500);
});