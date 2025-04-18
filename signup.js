document.addEventListener('DOMContentLoaded', () => {

    // --- Mobile Menu Toggle Logic (Copy from global/other JS) ---
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileNavMenu = document.getElementById('mobile-nav-menu'); // Ensure this ID exists

    if (mobileMenuToggle && mobileNavMenu) {
        mobileMenuToggle.addEventListener('click', () => {
            mobileNavMenu.classList.toggle('active');
            const isExpanded = mobileNavMenu.classList.contains('active');
            mobileMenuToggle.setAttribute('aria-expanded', isExpanded);
        });
    }

    // --- Supabase Initialization ---
    // IMPORTANT: Replace with your actual Supabase URL and Anon Key
    // It's best practice to use environment variables for these,
    // but for this example, we'll place them here.
    const SUPABASE_URL = 'https://qokvbggkkrwtzquigner.supabase.co'; // <-- Replace! e.g., 'https://your-project-ref.supabase.co'
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFva3ZiZ2dra3J3dHpxdWlnbmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1MzQwNjIsImV4cCI6MjA2MDExMDA2Mn0.87lEJdWBIrWLZY8FAUNa1-jcDAoKkXNfDXIS62fW7qs'; // <-- Replace!

    let supabase;
    try {
        supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
             console.warn("Supabase URL or Anon Key is not configured correctly. Sign up will not work.");
             // Optionally disable the form if keys are missing
        }
    } catch (error) {
        console.error("Error initializing Supabase:", error);
         // Optionally disable the form or show a persistent error
    }


    // --- Signup Form Handling ---
    const signupForm = document.getElementById('signup-form');
    const signupButton = document.getElementById('signupBtn');
    const emailInput = document.getElementById('signup-email');
    const passwordInput = document.getElementById('signup-password');
    const confirmPasswordInput = document.getElementById('signup-confirm-password');
    const buttonText = signupButton?.querySelector('.btn-text');
    const loader = signupButton?.querySelector('.loader');
    const formFeedback = signupForm?.querySelector('.form-feedback'); // Find feedback within the form
    const formMessage = document.getElementById('formMessage');

    // Helper to show feedback
    const showFeedback = (message, type = 'error') => {
        if (!formFeedback || !formMessage) return;
        formMessage.textContent = message;
        formFeedback.className = `form-feedback ${type}`; // Apply class
        formFeedback.style.display = 'block';
    };

    // Helper to hide feedback
    const hideFeedback = () => {
         if (!formFeedback) return;
         formFeedback.style.display = 'none';
         formMessage.textContent = '';
         formFeedback.className = 'form-feedback'; // Reset class
    };

    if (signupForm && signupButton && emailInput && passwordInput && confirmPasswordInput && buttonText && loader && formFeedback && formMessage && supabase) {

        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            hideFeedback(); // Clear previous messages

            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            // --- Basic Client-Side Validation ---
            if (!email || !password || !confirmPassword) {
                showFeedback('Please fill in all required fields.');
                return;
            }
            if (password.length < 8) {
                 showFeedback('Password must be at least 8 characters long.');
                 return;
            }
            if (password !== confirmPassword) {
                showFeedback('Passwords do not match.');
                confirmPasswordInput.focus(); // Focus on the mismatching field
                return;
            }

            // --- Show Loading State ---
            buttonText.textContent = 'Signing Up...';
            loader.style.display = 'inline-block';
            signupButton.disabled = true;

            try {
                // --- Call Supabase signUp ---
                const { data, error } = await supabase.auth.signUp({
                    email: email,
                    password: password,
                     // Optional: Add options like redirect URL or user metadata
                    // options: {
                    //   emailRedirectTo: 'https://example.com/welcome',
                    //   data: { full_name: 'Optional Name' } // Example metadata
                    // }
                });

                if (error) {
                    // Throw the error to be caught by the catch block
                    throw error;
                }

                 // --- Handle Success ---
                 // Supabase signUp usually requires email confirmation by default.
                 // data.user exists even if confirmation is needed. data.session is often null here.
                 console.log('Sign up attempt successful (data):', data);
                 if (data.user && data.user.identities && data.user.identities.length === 0) {
                     // This might indicate the user already exists but hasn't confirmed.
                     // Supabase might just resend the confirmation email in this case.
                     showFeedback('Please check your email for a confirmation link (it might be from a previous attempt).', 'success');
                 } else if (data.user) {
                     showFeedback('Sign up successful! Please check your email to verify your account.', 'success');
                     signupForm.reset(); // Clear the form on success
                 } else {
                      // This case might indicate an issue like user already exists and is confirmed
                      // Check Supabase settings if you want to allow re-signups or handle differently
                      showFeedback('Sign up process initiated. Check your email or try logging in if you already have an account.');
                 }


            } catch (error) {
                // --- Handle Errors ---
                console.error('Supabase Sign Up Error:', error);
                // Provide user-friendly messages
                let friendlyMessage = 'Sign up failed. Please try again.';
                if (error.message) {
                    if (error.message.includes('User already registered')) {
                        friendlyMessage = 'This email is already registered. Try logging in instead.';
                    } else if (error.message.includes('Password should be at least')) {
                         friendlyMessage = 'Password is too short. Please use at least 8 characters.';
                    } else {
                        // Generic message for other errors
                         friendlyMessage = `An error occurred: ${error.message}`;
                    }
                }
                showFeedback(friendlyMessage, 'error');

            } finally {
                // --- Always: Restore Button State ---
                buttonText.textContent = 'Sign Up';
                loader.style.display = 'none';
                signupButton.disabled = false;
            }
        });

    } else {
        console.warn('Signup form elements or Supabase client not found/initialized. Signup JS disabled.');
        // Optionally disable the form button if Supabase didn't initialize
        if(signupButton && !supabase) signupButton.disabled = true;
    }

}); // End DOMContentLoaded