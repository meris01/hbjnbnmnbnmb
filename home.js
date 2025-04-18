document.addEventListener('DOMContentLoaded', () => {
    // --- Smooth Scrolling for Navigation Links ---
    // CSS `scroll-behavior: smooth;` handles this for modern browsers.
    // This JS is a fallback or for more complex scroll logic if needed.
    // const navLinks = document.querySelectorAll('header nav ul li a[href^="#"]');
    // navLinks.forEach(link => {
    //     link.addEventListener('click', function(e) {
    //         e.preventDefault();
    //         const targetId = this.getAttribute('href');
    //         const targetElement = document.querySelector(targetId);
    //         if (targetElement) {
    //             targetElement.scrollIntoView({
    //                 behavior: 'smooth',
    //                 block: 'start' // Align top of target element to top of viewport
    //             });

    //             // Close mobile menu if open after clicking a link
    //             const nav = document.querySelector('header nav');
    //             const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    //             if (nav.classList.contains('active')) {
    //                  nav.classList.remove('active');
    //                  mobileMenuToggle.textContent = '☰'; // Reset hamburger icon
    //                  // Toggle auth buttons visibility if they are part of the mobile menu structure
    //                  const authButtons = document.querySelector('header .auth-buttons');
    //                  // Check how auth buttons are handled in mobile view
    //                  // If they are dynamically shown/hidden with the nav, adjust here.
    //             }
    //         }
    //     });
    // });

    // --- FAQ Accordion ---
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const questionButton = item.querySelector('.faq-question');
        const answerPanel = item.querySelector('.faq-answer');
        const icon = questionButton.querySelector('.faq-icon');

        questionButton.addEventListener('click', () => {
            const isActive = item.classList.contains('active');

            // Optional: Close all other items
            // faqItems.forEach(otherItem => {
            //     if (otherItem !== item && otherItem.classList.contains('active')) {
            //         otherItem.classList.remove('active');
            //         otherItem.querySelector('.faq-answer').style.maxHeight = null;
            //         otherItem.querySelector('.faq-icon').textContent = '+';
            //     }
            // });

            // Toggle the current item
            if (isActive) {
                item.classList.remove('active');
                answerPanel.style.maxHeight = null; // Collapse
                 answerPanel.style.padding = '0 25px'; // Collapse padding (match CSS)
                icon.textContent = '+';
            } else {
                item.classList.add('active');
                // Set max-height to the scrollHeight to allow transition
                answerPanel.style.maxHeight = answerPanel.scrollHeight + "px";
                 answerPanel.style.padding = '0 25px'; // Ensure padding is set before height calculation
                 // We need a slight delay or recalculate scrollHeight *after* padding is applied
                 // Or set padding directly on the inner p element instead. Let's adjust CSS & JS.
                 // *** CSS Adjustment Needed: Add padding to .faq-answer p, not .faq-answer ***
                 // *** JS: Calculate scrollHeight simply ***
                 answerPanel.style.maxHeight = answerPanel.scrollHeight + "px"; // Recalculate if needed
                icon.textContent = '−'; // Use minus sign for open state
                 // Adjust padding *after* setting max-height if needed, or preferably handle padding on inner element
                 // answerPanel.style.padding = '20px 25px'; // Expand padding (match CSS)
            }
        });

         // Ensure correct initial padding state for answer panel based on CSS
         answerPanel.style.padding = '0 25px'; // Set initial padding for consistency
         // **CSS Update:** Remove padding from `.faq-answer` and add it to `.faq-answer p`.
         // Then the JS simplifies to just toggling `maxHeight`.

    });

     // --- Mobile Menu Toggle ---
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const nav = document.querySelector('header nav');
    const authButtonsContainer = document.querySelector('header .auth-buttons'); // Get the container

     // Clone auth buttons to insert into mobile menu structure if needed, or just toggle visibility
     // For simplicity, let's assume the auth buttons are *after* the nav in the HTML
     // and we toggle the 'active' class on the nav, and CSS handles showing/hiding buttons based on that.
     // ** CSS Needs update to handle auth buttons display based on nav.active **
     // Add rule: #header nav.active + .auth-buttons { display: flex/block; }

    if (mobileMenuToggle && nav) {
        mobileMenuToggle.addEventListener('click', () => {
            nav.classList.toggle('active');
            // Toggle hamburger icon
            if (nav.classList.contains('active')) {
                mobileMenuToggle.textContent = '✕'; // Close icon
            } else {
                mobileMenuToggle.textContent = '☰'; // Hamburger icon
            }
             // Toggle auth buttons based on nav state (CSS should handle this preferably)
             // If JS control is needed:
             // if (authButtonsContainer) {
             //    authButtonsContainer.style.display = nav.classList.contains('active') ? 'flex' : 'none'; // Adjust display as needed
             // }
        });
    }

    // --- Optional: Add subtle shadow to header on scroll ---
    // const header = document.getElementById('header');
    // if (header.style.position === 'sticky') { // Only add if sticky header is used
    //     window.addEventListener('scroll', () => {
    //         if (window.scrollY > 30) {
    //             header.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.1)';
    //         } else {
    //              header.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.05)'; // Reset to initial
    //         }
    //     });
    // }


    // --- CSS Adjustment Notes from JS Implementation ---
    // 1. FAQ Padding: Remove padding from `.faq-answer` and add top/bottom padding to `.faq-answer p`.
    //    Example CSS Change:
    //    .faq-answer { ... padding: 0 25px; /* Keep horizontal padding */ }
    //    .faq-answer p { padding-top: 20px; padding-bottom: 20px; margin-bottom: 0; }
    // 2. Mobile Auth Buttons: Ensure CSS rules correctly show/hide `.auth-buttons` when `nav.active` is present,
    //    adjusting for their position in the HTML relative to the `nav` element.
    //    Example CSS Change:
    //    @media (max-width: 991.98px) {
    //        #header .auth-buttons { display: none; } /* Hide by default */
    //        #header nav.active ~ .auth-buttons { /* Use ~ if buttons are siblings after nav */
    //            display: flex;
    //            flex-direction: column;
    //            /* Add styles for mobile auth buttons appearance */
    //            position: absolute; /* Or adjust layout as needed */
    //            top: calc(70px + /* height of nav */);
    //            left: 0;
    //            width: 100%;
    //            background: var(--bg-light);
    //            padding: 15px 30px;
    //            box-shadow: var(--shadow);
    //            border-top: 1px solid var(--border-color);
    //            z-index: 999; /* Below header but above content */
    //        }
    //         #header nav.active ~ .auth-buttons .btn { /* Style buttons inside */
    //             width: 100%;
    //         }
    //    }
    console.log("GemContent Landing Page Initialized");
});



//fearutes page javascript

document.addEventListener('DOMContentLoaded', function() {

    // --- Mobile Menu Toggle ---
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileNav = document.querySelector('.mobile-nav');

    if (menuToggle && mobileNav) {
        menuToggle.addEventListener('click', () => {
            const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
            menuToggle.setAttribute('aria-expanded', !isExpanded);
            mobileNav.classList.toggle('active'); // Toggle a class to show/hide

            // Optional: Change icon on toggle
            const icon = menuToggle.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times'); // Assumes Font Awesome X icon
            }

            // Optional: Prevent body scroll when menu is open
            // document.body.classList.toggle('no-scroll');
        });
    }

    // Add other global/homepage scripts here if needed
    // e.g., sticky header logic, smooth scroll, animations

});
