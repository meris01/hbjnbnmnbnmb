document.addEventListener('DOMContentLoaded', () => {

    // --- Back to Top Button ---
    const backToTopButton = document.getElementById('back-to-top');

    const scrollFunction = () => {
        if (window.scrollY > 300) {
            if (!backToTopButton.classList.contains('visible')) {
                backToTopButton.classList.add('visible');
                backToTopButton.style.display = 'block'; // Ensure display is set correctly
            }
        } else {
             if (backToTopButton.classList.contains('visible')) {
                backToTopButton.classList.remove('visible');
                // Optionally fade out before hiding completely
                // setTimeout(() => { backToTopButton.style.display = 'none'; }, 400); // Match CSS transition time
             }
        }
    };

    window.addEventListener('scroll', scrollFunction);

    backToTopButton.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // --- Mobile Navigation Toggle ---
    const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
    const mobileNav = document.querySelector('.mobile-nav');
    const mobileNavIcon = mobileNavToggle.querySelector('i'); // Get the icon element

    if (mobileNavToggle && mobileNav) {
        mobileNavToggle.addEventListener('click', () => {
            const isExpanded = mobileNavToggle.getAttribute('aria-expanded') === 'true';
            mobileNavToggle.setAttribute('aria-expanded', !isExpanded);
            mobileNav.classList.toggle('active');

            // Change icon based on state
            if (!isExpanded) {
                mobileNavIcon.classList.remove('fa-bars');
                mobileNavIcon.classList.add('fa-times'); // Change to close icon
            } else {
                mobileNavIcon.classList.remove('fa-times');
                mobileNavIcon.classList.add('fa-bars'); // Change back to bars icon
            }
        });
    }

    // --- Expandable/Collapsible Sections (for Mobile view) ---
    const policySections = document.querySelectorAll('.policy-section');

    policySections.forEach(section => {
        const title = section.querySelector('.section-title');
        const toggleButton = section.querySelector('.toggle-section');
        const content = section.querySelector('.section-content');

        if (title && toggleButton && content) {
            // Initialize state based on CSS (content initially hidden on mobile)
            // Check if the button is visible (meaning we are likely on mobile)
            const isMobileView = window.getComputedStyle(toggleButton).display !== 'none';

            if (isMobileView) {
                // Start collapsed on mobile
                toggleButton.setAttribute('aria-expanded', 'false');
                content.style.maxHeight = '0';
                content.style.opacity = '0';
                content.style.paddingTop = '0';
                content.style.marginBottom = '0'; // Ensure no margin when collapsed
            } else {
                 // Ensure expanded on desktop
                toggleButton.setAttribute('aria-expanded', 'true');
                section.classList.add('expanded'); // Add class for potential desktop-specific expanded styles if needed
                 content.style.maxHeight = null; // Remove inline style for CSS to control
                 content.style.opacity = null;
                 content.style.paddingTop = null;
                 content.style.marginBottom = null;
            }

            // Use title for click event as it covers a larger area
            title.addEventListener('click', (e) => {
                // Only toggle if the toggle button itself is visible (i.e., on mobile)
                 if (window.getComputedStyle(toggleButton).display !== 'none') {
                    const isExpanded = toggleButton.getAttribute('aria-expanded') === 'true';

                    toggleButton.setAttribute('aria-expanded', !isExpanded);
                    section.classList.toggle('expanded'); // Use a class to manage expanded state

                    if (!isExpanded) {
                        // Expanding
                        content.style.maxHeight = content.scrollHeight + "px"; // Set max-height to content height
                        content.style.opacity = '1';
                        content.style.paddingTop = '15px'; // Match CSS expanded padding
                        content.style.marginBottom = '1.2em'; // Match CSS expanded margin
                    } else {
                        // Collapsing
                        content.style.maxHeight = '0';
                        content.style.opacity = '0';
                        content.style.paddingTop = '0';
                        content.style.marginBottom = '0';
                    }
                 }
            });
        }
    });

     // Re-evaluate section collapse state on window resize
     window.addEventListener('resize', () => {
        policySections.forEach(section => {
            const toggleButton = section.querySelector('.toggle-section');
            const content = section.querySelector('.section-content');
             if (toggleButton && content) {
                const isMobileView = window.getComputedStyle(toggleButton).display !== 'none';
                const isExpanded = section.classList.contains('expanded');

                if (!isMobileView) {
                    // Desktop view: Ensure all are expanded and styles are reset
                    toggleButton.setAttribute('aria-expanded', 'true');
                    section.classList.add('expanded');
                    content.style.maxHeight = null;
                    content.style.opacity = null;
                    content.style.paddingTop = null;
                    content.style.marginBottom = null;
                } else {
                    // Mobile view: Reset styles based on current expanded state
                    if (!isExpanded) {
                        toggleButton.setAttribute('aria-expanded', 'false');
                        content.style.maxHeight = '0';
                        content.style.opacity = '0';
                         content.style.paddingTop = '0';
                         content.style.marginBottom = '0';
                    } else {
                         toggleButton.setAttribute('aria-expanded', 'true');
                         content.style.maxHeight = content.scrollHeight + "px";
                         content.style.opacity = '1';
                         content.style.paddingTop = '15px';
                         content.style.marginBottom = '1.2em';
                    }
                }
             }
        });
     });


    // --- Smooth Scrolling for Table of Contents Links ---
    const tocLinks = document.querySelectorAll('.toc a[href^="#"]');

    tocLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                // Calculate offset needed for sticky header + some breathing room
                const header = document.querySelector('.site-header');
                const headerHeight = header ? header.offsetHeight : 0;
                const offset = headerHeight + 20; // Adjust '20' as needed for spacing

                const bodyRect = document.body.getBoundingClientRect().top;
                const elementRect = targetElement.getBoundingClientRect().top;
                const elementPosition = elementRect - bodyRect;
                const offsetPosition = elementPosition - offset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });

                // Optional: If sections are collapsible on mobile, ensure the target section is expanded
                const section = targetElement.closest('.policy-section');
                if (section && !section.classList.contains('expanded')) {
                     const toggleButton = section.querySelector('.toggle-section');
                     const content = section.querySelector('.section-content');
                      if (toggleButton && content && window.getComputedStyle(toggleButton).display !== 'none') {
                        toggleButton.setAttribute('aria-expanded', 'true');
                        section.classList.add('expanded');
                        content.style.maxHeight = content.scrollHeight + "px";
                        content.style.opacity = '1';
                        content.style.paddingTop = '15px';
                        content.style.marginBottom = '1.2em';
                      }
                }
            }
        });
    });

    // --- Placeholder for Cookie Consent Interaction ---
    // Example: If you had a button/link in the footer for cookie settings
    // const cookieSettingsLink = document.getElementById('cookie-settings-link');
    // if (cookieSettingsLink) {
    //     cookieSettingsLink.addEventListener('click', (e) => {
    //         e.preventDefault();
    //         // Logic to open your cookie consent management modal/tool
    //         console.log("Open cookie settings...");
    //         // You might want to automatically scroll to the cookie section as well:
    //         // document.querySelector('#privacy-choices').scrollIntoView({ behavior: 'smooth' });
    //     });
    // }
    // Note: A full cookie banner implementation would typically involve checking for existing consent
    // (e.g., in localStorage or a cookie) and displaying a banner if no consent is found.
    // That logic is usually separate and runs on page load across the site.

});