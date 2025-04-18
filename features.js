document.addEventListener('DOMContentLoaded', function() {

    // --- Tool Filtering Logic ---
    const filterButtons = document.querySelectorAll('#tool-filters .filter-btn');
    const toolCards = document.querySelectorAll('#tools-grid .tool-card');

    if (filterButtons.length > 0 && toolCards.length > 0) {
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                const filterValue = button.getAttribute('data-filter');

                // Update active button state
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Filter cards
                toolCards.forEach(card => {
                    const cardCategories = card.getAttribute('data-category').split(' '); // Handle multiple categories

                    // Check if the filter is 'all' or if the card's categories include the filter value
                    if (filterValue === 'all' || cardCategories.includes(filterValue)) {
                        // --- Simple Show/Hide (using display: none in CSS) ---
                        card.classList.remove('hide');
                        // card.style.display = 'flex'; // Or 'block', must match card's default display

                        /* --- OR --- Animation Logic (if using opacity/transform in CSS .hide) ---
                        card.style.opacity = '1';
                        card.style.transform = 'scale(1)';
                        card.style.height = ''; // Reset height
                        card.style.padding = ''; // Reset padding
                        card.style.margin = ''; // Reset margin
                        card.style.border = ''; // Reset border
                        card.style.pointerEvents = 'auto';
                        setTimeout(() => { card.classList.remove('hide'); }, 0); // Remove class after styles apply
                        */

                    } else {
                        // --- Simple Show/Hide ---
                         card.classList.add('hide');
                        // card.style.display = 'none';

                        /* --- OR --- Animation Logic ---
                        card.classList.add('hide'); // Apply transition classes
                        card.style.opacity = '0';
                        card.style.transform = 'scale(0.95)';
                        card.style.height = '0';
                        card.style.padding = '0';
                        card.style.margin = '0';
                        card.style.overflow = 'hidden';
                        card.style.border = 'none';
                        card.style.pointerEvents = 'none';
                        */
                    }
                });
            });
        });
    }

    // --- Dynamic Year in Footer ---
    const yearSpan = document.getElementById('current-year');
    if(yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

});