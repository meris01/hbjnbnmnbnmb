document.addEventListener('DOMContentLoaded', () => {
    // --- Supabase Client Initialization ---
    // IMPORTANT: Replace with your actual Supabase URL and Anon Key
    const SUPABASE_URL = 'https://qokvbggkkrwtzquigner.supabase.co'; // e.g., 'https://xyz.supabase.co'
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFva3ZiZ2dra3J3dHpxdWlnbmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1MzQwNjIsImV4cCI6MjA2MDExMDA2Mn0.87lEJdWBIrWLZY8FAUNa1-jcDAoKkXNfDXIS62fW7qs'; // Public anon key

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        console.error("Supabase URL or Anon Key is not configured. Please update login.js");
        // Optionally display an error message to the user on the page
        // showAuthError("Configuration error. Please contact support.");
        return; // Stop execution if keys are missing
    }

    const supabase = supabase_js.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- DOM Element Selection ---
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('login-button');
    const buttonText = loginButton.querySelector('.button-text');
    const buttonLoader = loginButton.querySelector('.button-loader');
    const errorMessageElement = document.getElementById('auth-error-message');
    const successMessageElement = document.getElementById('auth-success-message'); // Optional
    const socialLoginButtons = document.querySelectorAll('.btn-social[data-provider]');

    // --- Helper Functions ---
    function showAuthError(message) {
        errorMessageElement.textContent = message;
        errorMessageElement.classList.add('show');
        successMessageElement.classList.remove('show'); // Hide success message if shown
    }

    function clearAuthMessages() {
        errorMessageElement.textContent = '';
        errorMessageElement.classList.remove('show');
        successMessageElement.textContent = '';
        successMessageElement.classList.remove('show');
    }

     function setButtonLoading(isLoading) {
        if (isLoading) {
            loginButton.disabled = true;
            loginButton.classList.add('loading');
            buttonText.style.visibility = 'hidden'; // Hide text
            buttonLoader.style.display = 'inline-block'; // Show loader
        } else {
            loginButton.disabled = false;
            loginButton.classList.remove('loading');
             buttonText.style.visibility = 'visible'; // Show text
            buttonLoader.style.display = 'none'; // Hide loader
        }
    }

    // Basic Frontend Validation (Optional, Supabase handles errors too)
    function validateInput(input) {
        let isValid = true;
        const errorDiv = input.nextElementSibling; // Assuming error div is sibling
        errorDiv.textContent = ''; // Clear previous error
        input.classList.remove('invalid');

        if (input.required && !input.value.trim()) {
            errorDiv.textContent = 'This field is required.';
            isValid = false;
        } else if (input.type === 'email') {
            // Basic email pattern check
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(input.value)) {
                 errorDiv.textContent = 'Please enter a valid email address.';
                 isValid = false;
            }
        } else if (input.type === 'password' && input.required && input.value.length < 6) {
             // Example: Check minimum password length (match Supabase settings if possible)
             errorDiv.textContent = 'Password must be at least 6 characters.';
             isValid = false;
        }

        if (!isValid) {
            input.classList.add('invalid');
        }
        return isValid;
    }


    // --- Check Session on Load ---
    async function checkSession() {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
            console.error("Error getting session:", error);
            return; // Continue to show login page on error
        }
        if (data.session) {
            console.log("User already logged in. Redirecting...");
            // Redirect to the main application/dashboard page
            window.location.href = '/dashboard.html'; // CHANGE TO YOUR DASHBOARD URL
        } else {
            // No active session, user needs to log in.
             // Make form visible smoothly after check (if initially hidden)
             const authContainer = document.querySelector('.auth-container');
             if (authContainer) authContainer.style.opacity = '1';
        }
    }

    // --- Event Listeners ---

    // Email/Password Login
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent default form submission
            clearAuthMessages();

            // Frontend Validation
            const isEmailValid = validateInput(emailInput);
            const isPasswordValid = validateInput(passwordInput);

            if (!isEmailValid || !isPasswordValid) {
                showAuthError("Please fix the errors above.");
                return; // Stop submission if validation fails
            }

            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            setButtonLoading(true);

            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (error) {
                    console.error("Login Error:", error);
                    // Provide user-friendly messages
                    let userMessage = "Login failed. Please check your credentials.";
                    if (error.message.includes("Invalid login credentials")) {
                        userMessage = "Invalid email or password.";
                    } else if (error.message.includes("Email not confirmed")) {
                        userMessage = "Please confirm your email address first.";
                        // Optionally offer resend confirmation link
                    }
                    showAuthError(userMessage);
                } else if (data.user) {
                    // Login successful!
                    console.log("Login successful:", data.user);
                    // Optional: show success message briefly
                    // successMessageElement.textContent = "Login successful! Redirecting...";
                    // successMessageElement.classList.add('show');
                    // await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 sec

                    // Redirect to the dashboard or main app page
                    window.location.href = '/dashboard.html'; // CHANGE TO YOUR DASHBOARD URL
                    // No need to turn off loader if redirecting immediately
                    return; // Exit function after successful redirect
                } else {
                     // Should not happen if error is null and user is null, but handle just in case
                     showAuthError("An unexpected error occurred during login.");
                }

            } catch (catchError) {
                console.error("Unexpected error during login:", catchError);
                showAuthError("An unexpected error occurred. Please try again.");
            } finally {
                 // Only turn off loading if not redirecting immediately
                 setButtonLoading(false);
            }
        });

        // Add input event listeners for real-time validation feedback (optional)
        emailInput.addEventListener('input', () => validateInput(emailInput));
        passwordInput.addEventListener('input', () => validateInput(passwordInput));
    }

    // Social Logins
    socialLoginButtons.forEach(button => {
        button.addEventListener('click', async () => {
            clearAuthMessages();
            const provider = button.getAttribute('data-provider');

            if (!provider) {
                console.error("Social login button missing data-provider attribute.");
                return;
            }

            console.log(`Attempting login with ${provider}...`);
            // Add loading state to social button if desired

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: provider,
                options: {
                    // Optional: Specify redirectTo URL if needed, otherwise uses Supabase settings
                    // redirectTo: window.location.origin + '/auth/callback', // Example
                }
            });

            if (error) {
                console.error(`Error logging in with ${provider}:`, error);
                showAuthError(`Failed to initiate login with ${provider}. ${error.message}`);
                 // Remove loading state from social button
            }
            // Supabase handles the redirect to the provider and back.
            // Success is typically handled on the redirect page or via session check.
            // console.log(`Redirecting for ${provider} login... Data:`, data); // Data is usually null here
        });
    });


    // --- Initial Check ---
    checkSession(); // Check if user is already logged in when the page loads

}); // End DOMContentLoaded