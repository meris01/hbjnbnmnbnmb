document.addEventListener('DOMContentLoaded', () => {
    const stripePublicKey = 'YOUR_STRIPE_PUBLISHABLE_KEY'; // <-- IMPORTANT: Replace with your actual Publishable Key
    let stripe;

    try {
        stripe = Stripe(stripePublicKey);
    } catch (error) {
        console.error("Error initializing Stripe:", error);
        // Optionally display an error message to the user
        // alert("Payment processing is currently unavailable. Please try again later.");
        return; // Stop execution if Stripe fails to initialize
    }


    const checkoutButtons = document.querySelectorAll('.stripe-checkout-button');

    checkoutButtons.forEach(button => {
        button.addEventListener('click', async (event) => {
            const priceId = event.target.dataset.stripePriceId;

            if (!priceId) {
                console.error('Stripe Price ID not found on the button.');
                alert('Could not initiate checkout. Please try again or contact support.');
                return;
            }

            // Inform user that checkout is starting
            event.target.textContent = 'Redirecting to Checkout...';
            event.target.disabled = true;

            console.log(`Attempting checkout for Price ID: ${priceId}`);

            // !!! --- BACKEND INTEGRATION NEEDED --- !!!
            // You need a backend endpoint (e.g., /create-checkout-session)
            // that takes the priceId, creates a Stripe Checkout Session,
            // and returns the session ID.

            try {
                // **Example:** Fetch session ID from your backend
                const response = await fetch('/create-checkout-session', { // Replace with your actual backend endpoint
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ priceId: priceId }), // Send the Price ID to backend
                });

                if (!response.ok) {
                    throw new Error(`Server error: ${response.statusText}`);
                }

                const session = await response.json();

                if (!session.id) {
                     throw new Error('Invalid session data received from server.');
                }

                // Redirect to Stripe Checkout
                const { error } = await stripe.redirectToCheckout({
                    sessionId: session.id
                });

                // If redirectToCheckout fails (e.g., network error), handle it
                if (error) {
                    console.error('Stripe redirectToCheckout error:', error);
                    alert(`Checkout Error: ${error.message}. Please try again.`);
                    // Re-enable button if redirect fails
                    event.target.textContent = `Choose ${event.target.closest('.pricing-tier').querySelector('h3').textContent}`; // Or original text
                    event.target.disabled = false;
                }

            } catch (fetchError) {
                console.error('Error fetching checkout session:', fetchError);
                alert('Could not connect to the checkout server. Please check your connection or contact support.');
                 // Re-enable button on fetch error
                event.target.textContent = `Choose ${event.target.closest('.pricing-tier').querySelector('h3').textContent}`; // Or original text
                event.target.disabled = false;
            }

        });
    });

    // --- FAQ Accordion Logic (Copy from Homepage JS if needed) ---
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const questionButton = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        const icon = item.querySelector('.faq-icon');

        if (questionButton) {
            questionButton.addEventListener('click', () => {
                const isActive = item.classList.contains('active');

                // Close all other items (optional)
                // faqItems.forEach(otherItem => {
                //     if (otherItem !== item) {
                //         otherItem.classList.remove('active');
                //         otherItem.querySelector('.faq-answer').style.maxHeight = null;
                //         otherItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
                //     }
                // });

                // Toggle current item
                item.classList.toggle('active');
                questionButton.setAttribute('aria-expanded', !isActive);

                if (item.classList.contains('active')) {
                    answer.style.maxHeight = answer.scrollHeight + "px";
                     // Add padding styles when active if needed by CSS transition
                     // answer.style.paddingTop = '20px';
                     // answer.style.paddingBottom = '20px';
                } else {
                    answer.style.maxHeight = null;
                     // Remove padding styles when inactive if needed by CSS transition
                    // answer.style.paddingTop = '0';
                    // answer.style.paddingBottom = '0';
                }
            });
        }
    });

    // --- Mobile Menu Toggle Logic (Copy from Homepage JS if needed) ---
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileNavMenu = document.getElementById('mobile-nav-menu'); // Make sure your mobile nav has this ID

    if (mobileMenuToggle && mobileNavMenu) {
         mobileMenuToggle.addEventListener('click', () => {
             mobileNavMenu.classList.toggle('active'); // Assumes .active class controls visibility
             // Optional: Toggle aria-expanded attribute on the button
             const isExpanded = mobileNavMenu.classList.contains('active');
             mobileMenuToggle.setAttribute('aria-expanded', isExpanded);
         });
    }


}); // End DOMContentLoaded