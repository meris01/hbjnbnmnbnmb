document.addEventListener('DOMContentLoaded', () => {

    // --- Mobile Menu Toggle Logic (Keep from previous version) ---
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileNavMenu = document.getElementById('mobile-nav-menu'); // Ensure this ID exists in your HTML nav

    if (mobileMenuToggle && mobileNavMenu) {
        mobileMenuToggle.addEventListener('click', () => {
            mobileNavMenu.classList.toggle('active');
            const isExpanded = mobileNavMenu.classList.contains('active');
            mobileMenuToggle.setAttribute('aria-expanded', isExpanded);
            // document.body.classList.toggle('no-scroll', isExpanded); // Optional body scroll lock
        });
    }

    // --- Contact Form Submission to Google Sheet ---
    const contactForm = document.getElementById('mainContactForm');
    const submitButton = document.getElementById('submitContactBtn');
    const buttonText = submitButton?.querySelector('.btn-text');
    const loader = submitButton?.querySelector('.loader');
    const formFeedback = contactForm?.querySelector('.form-feedback'); // Find feedback within the form
    const formMessage = document.getElementById('formMessage');

    // Your Google Apps Script Webhook URL
    const googleScriptURL = 'https://script.google.com/macros/s/AKfycbwnwX4ehvEWoJzEAVeYQ6JTvc0OT3NSb7dJEGD8vDS2RB-4mxyNrPauky_tHDMORQ1s6A/exec'; // Removed ?gid=0 - usually not needed for POST

    if (contactForm && submitButton && buttonText && loader && formFeedback && formMessage) {
        contactForm.addEventListener('submit', (event) => {
            event.preventDefault(); // Prevent default browser submission

            // Simple check - HTML required should handle most cases
            if (!contactForm.checkValidity()) {
                contactForm.reportValidity();
                return;
            }

            // Show loading state
            buttonText.textContent = 'Sending...';
            loader.style.display = 'inline-block'; // Use inline-block for loader
            submitButton.disabled = true;
            formFeedback.style.display = 'none'; // Hide previous messages
            formFeedback.className = 'form-feedback'; // Reset classes

            // Get form data
            const formData = new FormData(contactForm);

            // Send data to Google Apps Script using fetch
            fetch(googleScriptURL, {
                method: 'POST',
                body: formData,
                // mode: 'no-cors' // *** UNCOMMENT THIS LINE ONLY if you get CORS errors ***
            })
            .then(response => {
                // IMPORTANT: With 'no-cors', response will be opaque and response.ok will likely be false.
                // We cannot reliably check the status code or read the body.
                // So, if fetch completes without a network error, we *assume* it worked.
                // If NOT using 'no-cors', you *can* check response.ok here.
                // if (!response.ok) {
                //     throw new Error(`Network response was not ok (${response.status})`);
                // }
                // return response.text(); // Or response.json() if your script returns JSON
                console.log('Fetch attempt completed.'); // Log for debugging
                return true; // Assume success if fetch didn't throw an error
            })
            // .then(data => { // This block is only useful if NOT using 'no-cors'
            //     console.log('Success Response from Script:', data);
            //     // Add logic here based on what your script returns, e.g., check for a success message
            // })
            .then(() => { // This runs if the fetch promise resolves (assumed success)
                // --- On Assumed Success ---
                formMessage.textContent = 'Thank you! Your message has been sent successfully.';
                formFeedback.className = 'form-feedback success'; // Apply success class
                formFeedback.style.display = 'block';
                contactForm.reset(); // Clear the form
            })
            .catch((error) => {
                // --- On Error ---
                console.error('Error submitting form:', error);
                formMessage.textContent = `Oops! There was a problem sending your message. Please try again later. (${error.message})`;
                formFeedback.className = 'form-feedback error'; // Apply error class
                formFeedback.style.display = 'block';
            })
            .finally(() => {
                // --- Always ---
                // Restore button state
                buttonText.textContent = 'Send Message';
                loader.style.display = 'none';
                submitButton.disabled = false;
            });
        });
    } else {
        console.warn('Contact form elements not found. Form submission JS disabled.');
    }

}); // End DOMContentLoaded