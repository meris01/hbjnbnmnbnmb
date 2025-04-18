// public/js/keyword_script.js (or appropriate filename - COMPLETE & SECURED)

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const form = document.getElementById('keyword-research-form');
    const generateBtn = document.getElementById('generate-btn');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const resultsOutput = document.getElementById('results-output');
    const resultsDisplayArea = document.getElementById('results-display-area');
    const categoryTabsWrapper = document.querySelector('.category-tabs-wrapper');
    const addUrlBtn = document.getElementById('add-url-btn');
    const competitorUrlsContainer = document.getElementById('competitor-urls-container');
    const currentYearSpan = document.getElementById('current-year');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mainNav = document.querySelector('.main-nav');

    // Action Bar Elements
    const resultsActionsBar = document.querySelector('.results-actions-bar');
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    const copySelectedBtn = document.getElementById('copy-selected-btn');
    const saveSelectedBtn = document.getElementById('save-selected-btn');
    const exportBtn = document.getElementById('export-btn'); // Main button to toggle dropdown
    const exportDropdownButtons = document.querySelectorAll('.export-dropdown button'); // Buttons inside dropdown

    // Mobile UI Elements
    const bottomSheet = document.getElementById('filter-options-sheet');
    const sheetOverlay = document.querySelector('.sheet-overlay');
    const closeSheetBtn = document.querySelector('.close-sheet-btn');
    const fab = document.getElementById('fab');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const filterRelevanceRange = document.getElementById('filter-min-relevance');
    const filterRelevanceValue = document.querySelector('.range-value'); // Ensure this exists in your HTML
    const filterIntentCheckboxes = document.querySelectorAll('input[name="filter_intent"]');

    // Usage Indicator
    const usageIndicator = document.getElementById('usage-limit-indicator');

    // --- State ---
    let competitorUrlCount = 1;
    let currentResultsData = null; // Stores the PARSED keyword object { primary: [...], ... }
    let currentCategory = 'primary'; // Default category
    let batchSelectedKeywords = new Set();
    let isGenerating = false;
    let currentFilters = getDefaultFilters(); // Initialize with default filters

    // --- Backend Configuration ---
    const BACKEND_API_ENDPOINT = '/api/research-keywords'; // Secure backend endpoint

    // --- Initial Setup ---
    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    if (usageIndicator) updateUsageIndicator(0, 10); // Example initial usage
    if (resultsActionsBar) resultsActionsBar.style.display = 'none'; // Hide actions initially
    if (resultsOutput) resultsOutput.style.display = 'none'; // Hide results section initially
    updateActionButtonsState(); // Disable buttons initially

    // --- Event Listeners ---
    if (form) form.addEventListener('submit', handleGenerate);
    if (addUrlBtn) addUrlBtn.addEventListener('click', addCompetitorInput);
    if (categoryTabsWrapper) categoryTabsWrapper.addEventListener('click', handleCategoryClick);
    if (selectAllCheckbox) selectAllCheckbox.addEventListener('change', handleSelectAllToggle);
    if (copySelectedBtn) copySelectedBtn.addEventListener('click', handleCopySelected);
    if (saveSelectedBtn) saveSelectedBtn.addEventListener('click', handleSaveSelected);
    if (exportDropdownButtons) {
        exportDropdownButtons.forEach(button => {
            button.addEventListener('click', () => handleExport(button.dataset.format));
        });
    }
    // Toggle export dropdown visibility if needed
    if (exportBtn) {
        exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = e.currentTarget.closest('.export-options')?.querySelector('.export-dropdown');
            if (dropdown) {
                dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
            }
        });
         // Close dropdown if clicking outside
         document.addEventListener('click', (e) => {
             const exportOptionsDiv = document.querySelector('.export-options');
             const dropdown = exportOptionsDiv?.querySelector('.export-dropdown');
             if (dropdown && dropdown.style.display === 'block') {
                 if (!exportOptionsDiv.contains(e.target)) {
                     dropdown.style.display = 'none';
                 }
             }
         });
    }


    if (resultsDisplayArea) {
        resultsDisplayArea.addEventListener('click', handleCardAction);
        resultsDisplayArea.addEventListener('change', handleCardCheckboxChange);
    }
    if (mobileMenuToggle && mainNav) {
        mobileMenuToggle.addEventListener('click', () => {
            mainNav.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
        });
    }
    if (fab) fab.addEventListener('click', () => toggleBottomSheet(true));
    if (closeSheetBtn) closeSheetBtn.addEventListener('click', () => toggleBottomSheet(false));
    if (sheetOverlay) sheetOverlay.addEventListener('click', () => toggleBottomSheet(false));
    if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', handleApplyFilters);
    if (filterRelevanceRange && filterRelevanceValue) {
        filterRelevanceRange.addEventListener('input', (e) => {
            filterRelevanceValue.textContent = e.target.value;
        });
    }

    // --- Core Functions ---

    async function handleGenerate(event) {
        event.preventDefault();
        if (isGenerating || !form) return;

        showLoading(true);
        clearResultsAndErrors();
        currentResultsData = null;

        const formData = getFormData();

        if (!formData.seedKeyword.trim()) {
             showError("Please enter a seed keyword.");
             showLoading(false);
             return;
        }

        const prompt = createGeminiPrompt(formData);

        try {
            const backendResponse = await callBackendAPI(prompt);

            // Check for backend communication errors first
            if (backendResponse.error) {
                throw new Error(backendResponse.error);
            }

            // Check for incompleteness warning from backend
            if (backendResponse.isIncomplete) {
                const warnMsg = backendResponse.warning || "The AI response may have been cut short due to length limits. Results might be incomplete.";
                showWarning(warnMsg);
                console.warn("Backend indicated the response was potentially incomplete.");
            } else if (backendResponse.warning) {
                 // Show other warnings even if not incomplete
                 showWarning(backendResponse.warning);
            }

            // Check if keyword data exists and is in the expected format
            if (backendResponse.data && typeof backendResponse.data === 'object' && Object.keys(backendResponse.data).length > 0) {
                currentResultsData = backendResponse.data; // Store the parsed data
                currentFilters = getDefaultFilters(); // Reset filters
                applyAndDisplayResults(); // Apply filters and render the default category

                if (resultsOutput) resultsOutput.style.display = 'block';
                if (resultsActionsBar) resultsActionsBar.style.display = 'flex';
                if (usageIndicator) updateUsageIndicator(1, 10); // Placeholder

                // Ensure the UI reflects the default category after results load
                switchCategory('primary', false); // Switch state without rendering
                applyAndDisplayResults(); // Now render the 'primary' category

            } else {
                 // If no data or wrong format, but no specific error/warning, show generic message
                 console.warn("Received success but data is missing/invalid:", backendResponse);
                 if (!backendResponse.warning && !backendResponse.isIncomplete) {
                     showError('No keyword ideas found or response format was unexpected.');
                 }
                 // If there *was* a warning, it's already shown, so don't show this error too.
            }

        } catch (error) {
            console.error("Keyword Research Error:", error);
            showError(error.message || 'An error occurred during keyword research.');
        } finally {
            showLoading(false);
            updateActionButtonsState(); // Update buttons after process completes
        }
    }

    function getFormData() {
        const data = {};
        if (!form) return data; // Return empty if form doesn't exist
        const formData = new FormData(form);
        data.seedKeyword = formData.get('seed-keyword') || '';
        data.industry = formData.get('industry-niche') || '';
        data.contentType = formData.get('content-type') || '';
        data.searchIntent = formData.get('search-intent') || '';
        data.competitorUrls = formData.getAll('competitor-urls[]').filter(url => url && url.trim() !== '');
        return data;
    }

    function createGeminiPrompt(data) {
        // This function defines the prompt that asks for the specific JSON structure
        let prompt = `Act as an expert SEO keyword researcher. Generate keyword ideas based on the seed keyword "${data.seedKeyword}".

Provide the results in a JSON object with the following four keys: "primary", "longTail", "questions", and "lsi".
Each key should contain an array of keyword objects. Each keyword object must have these properties:
- "keyword": The suggested keyword phrase (string).
- "relevance": A score from 0 to 100 indicating relevance to the seed keyword (integer).
- "intent": The likely search intent ('informational', 'transactional', 'navigational', 'commercial', or 'mixed') (string).
- "contentType": Suggested suitable content type ('blog_post', 'product_page', 'landing_page', 'service_page', 'guide_tutorial', 'comparison', 'other') (string).

Context for generation:`;
        if (data.industry) prompt += `\n- Industry/Niche: ${data.industry}`;
        if (data.contentType) prompt += `\n- Target Content Type: ${data.contentType}`;
        if (data.searchIntent) prompt += `\n- Desired Primary Intent: ${data.searchIntent}`;
        if (data.competitorUrls.length > 0) {
            prompt += `\n- Analyze competitor content for ideas: ${data.competitorUrls.join(', ')}`;
        }

        prompt += `\n\nGenerate around 10-15 relevant keywords for each category (primary, longTail, questions, lsi). Prioritize quality and relevance over quantity. Ensure the output is ONLY the valid JSON object described above, with no introductory text, markdown formatting (like \`\`\`json), or explanations.`;

        // console.log("--- Sending Prompt to Backend --- \n", prompt); // Keep for debugging if needed
        return prompt;
    }

    async function callBackendAPI(prompt) {
        console.log(`--- Sending Prompt to Backend Endpoint: ${BACKEND_API_ENDPOINT} ---`);
        try {
            const response = await fetch(BACKEND_API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ prompt: prompt })
            });

            let responseData;
            try {
                responseData = await response.json();
            } catch (e) {
                 const textError = await response.text();
                 console.error(`Backend response not JSON. Status: ${response.status}. Body: ${textError.substring(0, 500)}...`);
                 return { error: `Server returned status ${response.status}, response not JSON.` };
            }

            if (!response.ok || responseData.error) {
                const errorMessage = responseData?.error || `Request failed with status ${response.status}`;
                console.error("Backend API Error Response:", responseData);
                return { error: errorMessage };
            }

            // Expecting { data: { primary: [...], ... }, warning: ..., isIncomplete: ... }
            return responseData;

        } catch (error) {
            console.error('Error calling backend API:', error);
            let message = error.message || 'An unknown network error occurred.';
             if (error.message.includes('Failed to fetch')) {
                 message = `Network error: Could not connect to the backend. Is the server running?`;
             }
            return { error: message };
        }
    }

    // --- UI Update Functions ---

    function showLoading(isLoading) {
        isGenerating = isLoading;
        if (!generateBtn || !loadingIndicator) return;
        if (isLoading) {
            loadingIndicator.style.display = 'flex';
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<div class="loader-button"></div> Generating...';
        } else {
            loadingIndicator.style.display = 'none';
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-search"></i> Find Keywords';
        }
    }

    function clearResultsAndErrors() {
        if (resultsOutput) resultsOutput.style.display = 'none';
        if (resultsActionsBar) resultsActionsBar.style.display = 'none';
        if (resultsDisplayArea) resultsDisplayArea.innerHTML = '';
        if (errorMessage) errorMessage.style.display = 'none';
        // Clear dynamic warning messages
        document.querySelectorAll('.warning-message').forEach(el => el.remove());
        batchSelectedKeywords.clear();
        if (selectAllCheckbox) {
             selectAllCheckbox.checked = false;
             selectAllCheckbox.indeterminate = false; // Reset indeterminate state
             selectAllCheckbox.disabled = true; // Disable until results are shown
        }
        currentResultsData = null;
        currentCategory = 'primary';
        // Reset tabs visually
        document.querySelectorAll('.category-tab.active').forEach(t => t.classList.remove('active'));
        document.querySelector('.category-tab[data-category="primary"]')?.classList.add('active');
    }

    function showError(message) {
        if (!errorMessage || !resultsOutput) return;
        // Clear previous warnings first
        document.querySelectorAll('.warning-message').forEach(el => el.remove());
        errorMessage.querySelector('p').textContent = message;
        errorMessage.style.display = 'block';
        resultsOutput.style.display = 'none'; // Hide results area
    }

    function showWarning(message) {
         if (errorMessage) { // Display warning near the error area or results area
             // Remove previous warnings to avoid duplicates
             document.querySelectorAll('.warning-message').forEach(el => el.remove());

             const warningDiv = document.createElement('div');
             warningDiv.className = 'warning-message form-message'; // Use common styling
             warningDiv.style.display = 'flex';
             warningDiv.style.backgroundColor = '#fff9e6';
             warningDiv.style.borderColor = '#ffecb3';
             warningDiv.style.color = '#8a6d3b';
             warningDiv.style.marginTop = '10px';
             warningDiv.style.padding = '10px 15px';
             warningDiv.style.borderRadius = '4px';
             warningDiv.innerHTML = `<i class="fas fa-exclamation-triangle" style="margin-right: 10px; margin-top: 2px;"></i> <span>${escapeHtml(message)}</span>`;
             // Insert after the error message div OR at the top of the results output if no error
             const targetParent = resultsOutput || errorMessage.parentNode;
             const insertBeforeElement = errorMessage.style.display !== 'none' ? errorMessage.nextSibling : targetParent.firstChild;
             targetParent.insertBefore(warningDiv, insertBeforeElement);

         } else { console.warn("Warning:", message); }
     }

     function applyAndDisplayResults() {
        if (!currentResultsData || !resultsDisplayArea) return;

        const categoryData = currentResultsData[currentCategory] || [];

        // Filter the data based on currentFilters
        const filteredData = categoryData.filter(kw => {
             // Gracefully handle if keyword properties are missing
             const relevance = typeof kw.relevance === 'number' ? kw.relevance : 0;
             const intent = typeof kw.intent === 'string' ? kw.intent : '';
             const meetsRelevance = relevance >= currentFilters.minRelevance;
             const meetsIntent = currentFilters.intents.includes(intent);
             return meetsRelevance && meetsIntent;
        });

        renderKeywordCards(filteredData);
        updateActionButtonsState(); // Update based on filtered results
     }

     function renderKeywordCards(keywords) {
        if (!resultsDisplayArea || !selectAllCheckbox) return;
        resultsDisplayArea.innerHTML = ''; // Clear previous

        if (!keywords || keywords.length === 0) {
            resultsDisplayArea.innerHTML = '<p class="no-results-message">No keywords match the current filters in this category.</p>';
            selectAllCheckbox.disabled = true; // Keep disabled
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
            return;
        }

        selectAllCheckbox.disabled = false; // Enable if there are keywords

        const fragment = document.createDocumentFragment();
        keywords.forEach((kwData, index) => {
            // Ensure kwData has expected properties before creating card
            if (kwData && typeof kwData.keyword === 'string') {
                const card = createKeywordCardElement(kwData, index);
                fragment.appendChild(card);
            } else {
                console.warn("Skipping invalid keyword data:", kwData);
            }
        });
        resultsDisplayArea.appendChild(fragment);

        checkSelectAllState(); // Update 'Select All' based on rendered cards
     }

    function createKeywordCardElement(kwData, index) {
         const card = document.createElement('div');
         card.classList.add('keyword-card');
         // Use attribute-safe keyword for dataset
         const safeKeywordAttr = escapeHtml(kwData.keyword);
         card.dataset.keyword = safeKeywordAttr;

         const isSelected = batchSelectedKeywords.has(kwData.keyword); // Check using original keyword

         // Safely access properties with defaults
         const keywordDisplay = escapeHtml(kwData.keyword);
         const relevance = typeof kwData.relevance === 'number' ? kwData.relevance : 'N/A';
         const intent = typeof kwData.intent === 'string' ? kwData.intent : 'unknown';
         const contentType = typeof kwData.contentType === 'string' ? kwData.contentType : 'unknown';


         card.innerHTML = `
            <div class="card-main">
                <label class="card-select-keyword" title="Select keyword: ${keywordDisplay}">
                    <input type="checkbox" class="keyword-checkbox" data-keyword="${safeKeywordAttr}" ${isSelected ? 'checked' : ''}>
                    <span class="keyword-text">${keywordDisplay}</span>
                </label>
                <div class="card-actions">
                    <button class="copy-btn btn-icon" title="Copy Keyword" data-keyword="${safeKeywordAttr}">
                        <i class="fas fa-copy"></i>
                    </button>
                    </div>
            </div>
            <div class="card-details">
                <span class="detail-item" title="Relevance Score">
                    <i class="fas fa-star"></i> <strong>${relevance}</strong>
                </span>
                <span class="detail-item" title="Search Intent: ${intent}" data-intent="${intent}">
                    <i class="${getIntentIcon(intent)}"></i> ${capitalizeFirstLetter(intent)}
                </span>
                <span class="detail-item" title="Suggested Content Type">
                    <i class="fas fa-file-alt"></i> ${formatContentType(contentType)}
                </span>
            </div>
        `;
        return card;
    }

    function handleCategoryClick(event) {
         const tab = event.target.closest('.category-tab');
         if (tab && tab.dataset.category) {
             switchCategory(tab.dataset.category);
         }
     }

    function switchCategory(category, shouldRender = true) {
        currentCategory = category;
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === category);
        });

        const activeTab = document.querySelector(`.category-tab[data-category="${category}"]`);
        if (activeTab && window.innerWidth < 992) {
             activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }

        batchSelectedKeywords.clear(); // Clear selection when switching category

        if (shouldRender && currentResultsData) {
            applyAndDisplayResults(); // Re-filter and re-render
        } else {
             updateActionButtonsState(); // Update buttons even if not rendering (e.g., clear selection)
             if (selectAllCheckbox) { // Reset select all checkbox state visually
                 selectAllCheckbox.checked = false;
                 selectAllCheckbox.indeterminate = false;
             }
        }
    }


    // --- Interactivity & Actions ---

    function addCompetitorInput() {
        if (!competitorUrlsContainer || !addUrlBtn) return;
        competitorUrlCount++;
        const wrapper = document.createElement('div');
        wrapper.classList.add('input-wrapper'); // Assuming you have styles for this
        wrapper.innerHTML = `
            <input type="url" id="competitor-url-${competitorUrlCount}" name="competitor-urls[]" class="gem-input" placeholder="https://another-competitor.com/page" aria-label="Competitor URL ${competitorUrlCount}">
        `;
        competitorUrlsContainer.insertBefore(wrapper, addUrlBtn);
    }


     function handleCardAction(event) {
         const copyBtn = event.target.closest('.copy-btn');
         if (copyBtn && copyBtn.dataset.keyword) {
             copyToClipboard(copyBtn.dataset.keyword, copyBtn); // Use original keyword from dataset
             return;
         }
     }

    function handleCardCheckboxChange(event) {
        const checkbox = event.target;
        if (checkbox.classList.contains('keyword-checkbox') && checkbox.dataset.keyword) {
            const keyword = checkbox.dataset.keyword; // Use original keyword from dataset
            if (checkbox.checked) {
                batchSelectedKeywords.add(keyword);
            } else {
                batchSelectedKeywords.delete(keyword);
            }
            updateActionButtonsState();
            checkSelectAllState();
        }
    }

    function handleSelectAllToggle() {
         if (!selectAllCheckbox || !resultsDisplayArea) return;
         const isChecked = selectAllCheckbox.checked;
         const visibleCheckboxes = resultsDisplayArea.querySelectorAll('.keyword-checkbox');

         visibleCheckboxes.forEach(checkbox => {
             checkbox.checked = isChecked;
             const keyword = checkbox.dataset.keyword; // Get keyword from dataset
             if (keyword) { // Ensure keyword exists
                 if (isChecked) {
                     batchSelectedKeywords.add(keyword);
                 } else {
                     batchSelectedKeywords.delete(keyword);
                 }
             }
         });
         updateActionButtonsState();
    }

     function checkSelectAllState() {
        if (!selectAllCheckbox || !resultsDisplayArea) return;
        const visibleCheckboxes = resultsDisplayArea.querySelectorAll('.keyword-checkbox');
        if (visibleCheckboxes.length === 0) {
             selectAllCheckbox.checked = false;
             selectAllCheckbox.indeterminate = false;
             return;
        }
        const numVisible = visibleCheckboxes.length;
        const numSelected = Array.from(visibleCheckboxes).filter(cb => cb.checked).length;

        if (numSelected === numVisible) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else if (numSelected > 0) {
             selectAllCheckbox.checked = false;
             selectAllCheckbox.indeterminate = true;
        } else {
             selectAllCheckbox.checked = false;
             selectAllCheckbox.indeterminate = false;
        }
    }


    function updateActionButtonsState() {
        if (!copySelectedBtn || !saveSelectedBtn || !selectAllCheckbox) return;
        const hasSelection = batchSelectedKeywords.size > 0;
        copySelectedBtn.disabled = !hasSelection;
        saveSelectedBtn.disabled = !hasSelection;

        // Enable/disable export buttons based on *any* results existing
        const hasResults = currentResultsData && Object.keys(currentResultsData).some(cat => currentResultsData[cat].length > 0);
        const exportOptionsDiv = document.querySelector('.export-options');
        if (exportOptionsDiv) {
             const mainExportButton = exportOptionsDiv.querySelector('.main-export-btn'); // Check if you have this ID/class
             if (mainExportButton) mainExportButton.disabled = !hasResults;
             exportDropdownButtons.forEach(btn => btn.disabled = !hasResults);
        }
    }

     function handleCopySelected() {
         if (batchSelectedKeywords.size === 0) return;
         const keywordsToCopy = Array.from(batchSelectedKeywords).join('\n');
         copyToClipboard(keywordsToCopy, copySelectedBtn, "Keywords Copied!");
     }

     function handleSaveSelected() {
        if (batchSelectedKeywords.size === 0) return;
        const isLoggedIn = false; // Placeholder - implement real check
        if (!isLoggedIn) {
            alert("Please log in or sign up to save keywords.");
            return;
        }
        const keywordsToSave = Array.from(batchSelectedKeywords);
        console.log("Simulating save for:", keywordsToSave);
        alert(`${keywordsToSave.length} keywords saved to your list! (Simulated)`);
        // In real app: callBackendSaveKeywords(keywordsToSave).then(...).catch(...);
     }

    function handleExport(format) {
        if (!currentResultsData) {
            alert("No results to export.");
            return;
        }
        const dataToExport = [];
        // Export keywords from ALL categories that match current filters
        Object.keys(currentResultsData).forEach(category => {
            if (Array.isArray(currentResultsData[category])) {
                currentResultsData[category].forEach(kw => {
                    const relevance = typeof kw.relevance === 'number' ? kw.relevance : 0;
                    const intent = typeof kw.intent === 'string' ? kw.intent : '';
                    if (relevance >= currentFilters.minRelevance && currentFilters.intents.includes(intent)) {
                         dataToExport.push({
                             Category: capitalizeFirstLetter(category),
                             Keyword: kw.keyword || '',
                             Relevance: relevance,
                             Intent: capitalizeFirstLetter(intent),
                             'Content Type': formatContentType(kw.contentType || '')
                         });
                    }
                });
            }
        });

         if (dataToExport.length === 0) {
            alert("No keywords match the current filters to export.");
            return;
        }

        const seedKeyword = getFormData().seedKeyword.replace(/[^a-z0-9]/gi, '_') || 'export';
        const filename = `gemcontent_keywords_${seedKeyword}`;

        if (format === 'csv') {
            exportToCSV(dataToExport, `${filename}.csv`);
        } else if (format === 'pdf') {
            alert("PDF Export is not implemented in this version.");
        } else {
            console.warn("Unknown export format requested:", format);
            return; // Don't hide dropdown for unknown format
        }

        // Hide dropdown after selection
        const dropdown = document.querySelector('.export-options .export-dropdown');
        if (dropdown) dropdown.style.display = 'none';
    }

    // --- Mobile UI Specific Functions ---

    function toggleBottomSheet(show) {
         if (!bottomSheet || !filterRelevanceRange || !filterRelevanceValue) return;
         if (show) {
             filterRelevanceRange.value = currentFilters.minRelevance;
             filterRelevanceValue.textContent = currentFilters.minRelevance;
             filterIntentCheckboxes.forEach(cb => { cb.checked = currentFilters.intents.includes(cb.value); });
             bottomSheet.classList.add('active');
             sheetOverlay?.classList.add('active'); // Show overlay
         } else {
             bottomSheet.classList.remove('active');
             sheetOverlay?.classList.remove('active'); // Hide overlay
         }
    }

     function handleApplyFilters() {
         if (!filterRelevanceRange) return;
         const newMinRelevance = parseInt(filterRelevanceRange.value, 10);
         const selectedIntents = Array.from(filterIntentCheckboxes)
                                     .filter(cb => cb.checked)
                                     .map(cb => cb.value);

         currentFilters = {
             minRelevance: newMinRelevance,
             intents: selectedIntents.length > 0 ? selectedIntents : getDefaultFilters().intents // Use default if none selected
         };

         toggleBottomSheet(false);
         if (currentResultsData) {
             applyAndDisplayResults(); // Re-filter and re-render the current category
         }
     }

     function getDefaultFilters() {
         return {
             minRelevance: 50, // Default minimum relevance
             intents: ['informational', 'transactional', 'navigational', 'commercial', 'mixed'] // Default: all intents
         };
     }


    // --- Helper Functions ---

    function copyToClipboard(text, buttonElement = null, successMessage = "Copied!") {
        if (!navigator.clipboard) {
            alert("Clipboard access is not available or denied in this browser.");
            return;
        }
        navigator.clipboard.writeText(text).then(() => {
            if (buttonElement) {
                const originalContent = buttonElement.innerHTML;
                 const originalTitle = buttonElement.title;
                buttonElement.innerHTML = `<i class="fas fa-check"></i>`; // Just the check icon might be cleaner
                buttonElement.title = successMessage;
                buttonElement.classList.add('copied');
                buttonElement.disabled = true; // Briefly disable
                setTimeout(() => {
                    buttonElement.innerHTML = originalContent;
                    buttonElement.title = originalTitle;
                    buttonElement.classList.remove('copied');
                    buttonElement.disabled = false;
                }, 1800);
            }
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert("Could not copy text to clipboard.");
        });
    }

    function capitalizeFirstLetter(string) { return string ? string.charAt(0).toUpperCase() + string.slice(1) : ''; }
    function formatContentType(type) { return type ? type.split('_').map(capitalizeFirstLetter).join(' ') : 'N/A'; }
    function getIntentIcon(intent) { switch (intent) { case 'informational': return 'fas fa-info-circle'; case 'transactional': return 'fas fa-shopping-cart'; case 'navigational': return 'fas fa-map-marker-alt'; case 'commercial': return 'fas fa-search-dollar'; case 'mixed': return 'fas fa-random'; default: return 'fas fa-question-circle'; } }
    function updateUsageIndicator(used, total) { if (usageIndicator) { usageIndicator.querySelector('span').textContent = `Usage: ${used}/${total} Credits`; } }
    function escapeHtml(unsafe) { if (typeof unsafe !== 'string') return ''; return unsafe.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, "").replace(/'/g, "'"); }

    function exportToCSV(data, filename) {
        if (!data || data.length === 0) return;
        try {
            const headers = Object.keys(data[0]);
            const csvRows = [headers.join(',')]; // Header row
            data.forEach(row => {
                const values = headers.map(header => {
                    const value = row[header] === null || row[header] === undefined ? '' : row[header];
                    const escaped = ('' + value).replace(/"/g, '""'); // Escape double quotes
                    return `"${escaped}"`; // Wrap values
                });
                csvRows.push(values.join(','));
            });
            const csvString = csvRows.join('\n');
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

            // Use FileSaver.js if available, otherwise fallback
            if (typeof saveAs !== 'undefined') {
                saveAs(blob, filename);
            } else {
                const link = document.createElement('a');
                if (link.download !== undefined) {
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', filename);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                } else {
                    alert("CSV export download not fully supported by this browser. Please try copying the data.");
                }
            }
        } catch (error) {
            console.error("Error exporting to CSV:", error);
            alert("An error occurred during CSV export.");
        }
    }

}); // End DOMContentLoaded