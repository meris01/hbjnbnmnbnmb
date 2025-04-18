document.addEventListener('DOMContentLoaded', () => {

    // --- Reusable Elements ---
    const backToTopButton = document.getElementById('back-to-top');
    const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
    const mobileNav = document.querySelector('.mobile-nav');
    const mobileNavIcon = mobileNavToggle?.querySelector('i');
    const readingProgressBar = document.getElementById('reading-progress-bar');

    // --- Back to Top Button ---
    const scrollFunction = () => {
        // Back to top visibility
        if (window.scrollY > 300) {
            if (!backToTopButton.classList.contains('visible')) {
                backToTopButton.classList.add('visible');
                backToTopButton.style.display = 'block';
            }
        } else {
            if (backToTopButton.classList.contains('visible')) {
                backToTopButton.classList.remove('visible');
                // Optional fade out: setTimeout(() => { backToTopButton.style.display = 'none'; }, 300);
            }
        }

        // Reading Progress Bar (Uncomment if needed for single posts primarily)
        /*
        if (readingProgressBar) {
            const scrollHeight = document.documentElement.scrollHeight;
            const clientHeight = document.documentElement.clientHeight;
            const scrollTop = window.scrollY;
            const maxScroll = scrollHeight - clientHeight;
            const progress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
            readingProgressBar.style.width = `${progress}%`;
        }
        */
    };

    window.addEventListener('scroll', scrollFunction);

    backToTopButton?.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // --- Mobile Navigation Toggle ---
    if (mobileNavToggle && mobileNav && mobileNavIcon) {
        mobileNavToggle.addEventListener('click', () => {
            const isExpanded = mobileNavToggle.getAttribute('aria-expanded') === 'true';
            mobileNavToggle.setAttribute('aria-expanded', !isExpanded);
            mobileNav.classList.toggle('active');
            mobileNavIcon.classList.toggle('fa-bars');
            mobileNavIcon.classList.toggle('fa-times');
        });
    }

    // --- Category Filtering ---
    const filterButtons = document.querySelectorAll('.filter-btn');
    const sidebarFilterLinks = document.querySelectorAll('.categories-widget a[data-filter-link]');
    const blogCards = document.querySelectorAll('.blog-card');

    function filterCards(filter) {
        filterButtons.forEach(btn => {
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        blogCards.forEach(card => {
            const cardCategory = card.dataset.category;
            if (filter === 'all' || cardCategory === filter) {
                card.classList.remove('hidden');
                card.style.display = 'flex'; // Ensure it uses flex display
            } else {
                card.classList.add('hidden');
                 card.style.display = 'none';
            }
        });
         // Reset Load More button/state if needed after filtering
         resetLoadMore();
    }

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filter = button.dataset.filter;
            filterCards(filter);
        });
    });

     sidebarFilterLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const filter = link.dataset.filterLink;
            filterCards(filter);
            // Optional: Scroll to the top of the grid after filtering from sidebar
            document.querySelector('.blog-grid-section')?.scrollIntoView({ behavior: 'smooth' });
        });
    });

    // --- Search Functionality (Basic Frontend Simulation) ---
    const searchInput = document.getElementById('blog-search');
    const suggestionsBox = document.getElementById('search-suggestions');
    // Dummy data for suggestions - replace with actual data source/fetch
    const allPostTitles = Array.from(document.querySelectorAll('.card-title a')).map(a => ({ title: a.textContent, href: a.href }));

    searchInput?.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        suggestionsBox.innerHTML = ''; // Clear previous suggestions

        if (query.length > 1) {
            const filteredTitles = allPostTitles.filter(post => post.title.toLowerCase().includes(query)).slice(0, 5); // Limit suggestions

            if (filteredTitles.length > 0) {
                filteredTitles.forEach(post => {
                    const suggestionLink = document.createElement('a');
                    suggestionLink.href = post.href;
                    suggestionLink.textContent = post.title;
                    suggestionsBox.appendChild(suggestionLink);
                });
                suggestionsBox.style.display = 'block';
            } else {
                suggestionsBox.style.display = 'none';
            }
        } else {
            suggestionsBox.style.display = 'none';
        }
    });

     // Hide suggestions when clicking outside
     document.addEventListener('click', (e) => {
        if (suggestionsBox && !searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
            suggestionsBox.style.display = 'none';
        }
     });

    // Basic search filtering on Enter/Button click (adjust as needed)
    const searchButton = document.querySelector('.search-bar button');
    const performSearch = () => {
        const query = searchInput.value.toLowerCase().trim();
         suggestionsBox.style.display = 'none'; // Hide suggestions on search execution
        blogCards.forEach(card => {
            const title = card.querySelector('.card-title a')?.textContent.toLowerCase() || '';
            const excerpt = card.querySelector('.card-excerpt')?.textContent.toLowerCase() || '';
            const matches = title.includes(query) || excerpt.includes(query);

            if (matches) {
                 card.classList.remove('hidden');
                 card.style.display = 'flex';
            } else {
                 card.classList.add('hidden');
                 card.style.display = 'none';
            }
        });
         // Reset Load More after search
         resetLoadMore();
          // Clear active filter button if search is used
        filterButtons.forEach(btn => btn.classList.remove('active'));
        // Optionally activate 'All' or a 'Search Results' indicator
    };

    searchButton?.addEventListener('click', performSearch);
    searchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });


    // --- Infinite Scroll / Load More Simulation ---
    const loadMoreBtn = document.getElementById('load-more-btn');
    const loadingIndicator = document.getElementById('loading-indicator');
    const blogGrid = document.querySelector('.blog-grid');
    let itemsToShow = 6; // Initial number of items visible (adjust based on your grid design)
    const increment = 6; // How many items to load each time
    let allVisibleCards = []; // Track currently visible cards based on filters/search

    function updateVisibleCards() {
        allVisibleCards = Array.from(blogCards).filter(card => !card.classList.contains('hidden'));
        showItems(itemsToShow); // Re-apply visibility limit
        updateLoadMoreButton();
    }

     function showItems(count) {
        allVisibleCards.forEach((card, index) => {
            if (index < count) {
                card.style.display = 'flex'; // Show item
            } else {
                card.style.display = 'none'; // Hide item beyond the limit
            }
        });
    }

    function updateLoadMoreButton() {
        if (itemsToShow >= allVisibleCards.length) {
            loadMoreBtn.style.display = 'none'; // Hide button if all items shown
        } else {
            loadMoreBtn.style.display = 'inline-block'; // Show button
        }
         loadingIndicator.style.display = 'none'; // Hide loader
         loadMoreBtn.disabled = false;
    }

     function resetLoadMore() {
        itemsToShow = 6; // Reset count
        updateVisibleCards();
     }

    loadMoreBtn?.addEventListener('click', () => {
        loadMoreBtn.disabled = true;
        loadingIndicator.style.display = 'inline-block';

        // Simulate network delay
        setTimeout(() => {
            itemsToShow += increment;
            showItems(itemsToShow);
            updateLoadMoreButton();
        }, 800); // Simulate loading time
    });

    // Initial setup
     updateVisibleCards();


    // --- Newsletter Subscription Simulation ---
    const newsletterForm = document.getElementById('newsletter-form');
    const newsletterMessage = document.getElementById('newsletter-message');

    newsletterForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const emailInput = newsletterForm.querySelector('input[type="email"]');
        const submitButton = newsletterForm.querySelector('button');

        // Basic validation
        if (emailInput.value && emailInput.validity.valid) {
            newsletterMessage.textContent = 'Subscribing...';
            newsletterMessage.className = 'form-message info'; // Use a neutral class
            submitButton.disabled = true;

            // Simulate API call
            setTimeout(() => {
                // Simulate success/error randomly or based on email
                const success = Math.random() > 0.2; // 80% chance of success
                if (success) {
                    newsletterMessage.textContent = 'Success! Thanks for subscribing.';
                    newsletterMessage.className = 'form-message success';
                    emailInput.value = ''; // Clear input on success
                } else {
                    newsletterMessage.textContent = 'Oops! Something went wrong. Please try again.';
                    newsletterMessage.className = 'form-message error';
                }
                 submitButton.disabled = false;
            }, 1500);

        } else {
            newsletterMessage.textContent = 'Please enter a valid email address.';
            newsletterMessage.className = 'form-message error';
        }
    });

    // --- Additional Feature Placeholders (Requires more setup/libraries) ---
    // - Image Lightbox: Needs a library like Fancybox or Lightbox2 initialized on image links.
    // - Code Syntax Highlighting: Needs a library like Highlight.js initialized on code blocks (usually on single post pages).
    // - Social Sharing: Requires integrating specific social network APIs or using a sharing library. Share counts often need a backend service.
    // - Comments: Requires a backend system or a third-party service like Disqus.
    // - Print/PDF: Basic print styles are in CSS. PDF export usually needs a server-side library or a complex JS library like jsPDF.

});