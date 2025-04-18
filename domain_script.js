// public/js/domain_script.js (or appropriate filename - SECURED)

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const form = document.getElementById('domain-generator-form');
    const businessNameInput = document.getElementById('business-name');
    const industrySelect = document.getElementById('industry');
    const keywordsContainer = document.getElementById('keywords-container');
    const addKeywordBtn = document.getElementById('add-keyword-btn');
    const extensionCheckboxes = document.querySelectorAll('input[name="extensions"]');
    const nameStyleRadios = document.querySelectorAll('input[name="nameStyle"]');
    const maxLengthSlider = document.getElementById('max-length');
    const maxLengthValue = document.getElementById('max-length-value');
    const availabilityFilterCheckbox = document.getElementById('availability-filter'); // Assuming this is the main filter toggle?
    const advancedOptionsToggle = document.querySelector('.advanced-options summary');
    const alliterationCheckbox = document.querySelector('input[name="alliteration"]');
    const includeNumbersCheckbox = document.querySelector('input[name="includeNumbers"]');
    const allowHyphensCheckbox = document.querySelector('input[name="allowHyphens"]');
    const prefixInput = document.getElementById('prefix');
    const suffixInput = document.getElementById('suffix');
    const generateBtn = document.getElementById('generate-btn');
    const usageTracker = document.getElementById('usage-tracker');
    const generationsLeftSpan = document.getElementById('generations-left');
    const usageBar = document.getElementById('usage-bar');

    const resultsSection = document.getElementById('results-section');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const errorDetails = document.getElementById('error-details'); // Optional details span
    const domainResultsContainer = document.getElementById('domain-results');
    const noResultsDiv = document.getElementById('no-results');

    const listViewBtn = document.getElementById('list-view-btn');
    const gridViewBtn = document.getElementById('grid-view-btn');
    const sortOptionsSelect = document.getElementById('sort-options');
    const filterBtnDesktop = document.getElementById('filter-btn-desktop');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');

    // Comparison Elements
    const compareSection = document.getElementById('compare-section');
    const compareTray = document.getElementById('compare-tray');
    const compareCountSpan = document.getElementById('compare-count');
    const compareNowBtn = document.getElementById('compare-now-btn');
    const clearCompareBtn = document.getElementById('clear-compare-btn');

    // Mobile Elements
    const fabFilter = document.getElementById('fab-filter');
    const fabFavorites = document.getElementById('fab-favorites');
    const favoritesCountBadge = document.getElementById('favorites-count');
    const filterSheet = document.getElementById('filter-sheet');
    const closeSheetBtn = document.getElementById('close-sheet-btn');
    const overlay = document.getElementById('overlay');
    const filterAvailabilityRadios = document.querySelectorAll('input[name="filterAvailability"]');
    const filterExtensionsContainer = document.getElementById('filter-extensions');
    const filterCharacteristicsContainer = document.getElementById('filter-characteristics');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');

    // Modal Elements
    const modal = document.getElementById('detailed-view-modal');
    const closeModalBtn = modal?.querySelector('.close-modal-btn'); // Safer query
    const modalDomainName = document.getElementById('modal-domain-name');

    // --- Backend Configuration ---
    const BACKEND_API_ENDPOINT_GENERATE = '/api/generate-domains'; // Endpoint for AI generation
    const BACKEND_API_ENDPOINT_AVAILABILITY = '/api/check-availability'; // Endpoint for checking availability

    // --- State Variables ---
    let generatedDomains = []; // Raw list from backend (after parsing)
    let displayedDomains = []; // Filtered/sorted list for display
    let favorites = JSON.parse(localStorage.getItem('gemcontent_favorites') || '[]');
    let compareList = [];
    let searchHistory = JSON.parse(localStorage.getItem('gemcontent_history') || '[]');
    let generationsLeft = 10; // Example - should ideally sync with backend if users log in
    const MAX_GENERATIONS = 10; // Example
    let isGenerating = false; // Prevent double clicks

    // --- Initial Setup ---
    if (maxLengthSlider && maxLengthValue) updateMaxLengthValue();
    if (usageTracker) updateUsageTracker();
    updateFavoritesDisplay();
    addInitialKeywordInput(); // Add the first keyword input if container is empty
    populateFilterExtensions(); // Populate with defaults initially
    populateFilterCharacteristics(); // Populate with defaults initially
    const currentYearElement = document.getElementById('current-year');
    if (currentYearElement) currentYearElement.textContent = new Date().getFullYear();
    if (resultsSection) resultsSection.style.display = 'none'; // Hide results initially
    if (compareSection) compareSection.style.display = 'none'; // Hide compare initially

    // --- Event Listeners ---
    // (Keep all existing listeners from the previous code, ensuring null checks)
    if (maxLengthSlider) maxLengthSlider.addEventListener('input', updateMaxLengthValue);
    if (addKeywordBtn) addKeywordBtn.addEventListener('click', () => addKeywordInput(true)); // Pass true to show remove button
    if (keywordsContainer) keywordsContainer.addEventListener('click', handleKeywordRemove);
    if (form) form.addEventListener('submit', (e) => handleFormSubmit(e));

    if (listViewBtn) listViewBtn.addEventListener('click', () => setViewMode('list'));
    if (gridViewBtn) gridViewBtn.addEventListener('click', () => setViewMode('grid'));
    if (sortOptionsSelect) sortOptionsSelect.addEventListener('change', applySorting);

    if (filterBtnDesktop) filterBtnDesktop.addEventListener('click', toggleFilterSheet);
    if (fabFilter) fabFilter.addEventListener('click', toggleFilterSheet);
    if (closeSheetBtn) closeSheetBtn.addEventListener('click', toggleFilterSheet);
    if (overlay) overlay.addEventListener('click', toggleFilterSheet);
    if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', () => { applyFilteringAndSorting(); toggleFilterSheet(); });

    if (exportCsvBtn) exportCsvBtn.addEventListener('click', () => exportResults('csv'));
    if (exportPdfBtn) exportPdfBtn.addEventListener('click', () => exportResults('pdf'));

    if (fabFavorites) fabFavorites.addEventListener('click', showFavorites); // Define showFavorites if needed

    if (domainResultsContainer) domainResultsContainer.addEventListener('click', handleCardAction);

    if (clearCompareBtn) clearCompareBtn.addEventListener('click', clearComparison);
    if (compareNowBtn) compareNowBtn.addEventListener('click', showComparison); // Define showComparison if needed
    if (compareTray) compareTray.addEventListener('click', handleRemoveCompareItem);

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => { if (modal && event.target == modal) closeModal(); });
    window.addEventListener('keydown', (event) => { if (modal && modal.style.display === "block" && event.key === "Escape") closeModal(); });

    // --- Pull to refresh (Keep basic simulation or remove/replace) ---
    let touchstartY = 0;
    document.addEventListener('touchstart', e => { touchstartY = e.touches[0].clientY; }, { passive: true });
    document.addEventListener('touchend', e => {
        if (!e.changedTouches || e.changedTouches.length === 0) return;
        const touchendY = e.changedTouches[0].clientY;
        if (window.scrollY === 0 && touchendY > touchstartY + 100) {
            console.log('Pull detected - simulating refresh');
            handleFormSubmit(new Event('submit'), true); // Pass refresh flag
        }
    }, { passive: true });


    // --- Functions ---

    function updateMaxLengthValue() {
        if (maxLengthSlider && maxLengthValue) {
            maxLengthValue.textContent = maxLengthSlider.value;
        }
    }

    function addInitialKeywordInput() {
         if (keywordsContainer && keywordsContainer.children.length === 0) {
             addKeywordInput(false); // Add one without showing remove button initially
         }
         updateKeywordRemoveButtons(); // Ensure visibility is correct
    }

    function addKeywordInput(showRemove = true) {
        if (!keywordsContainer) return;
        const keywordGroup = document.createElement('div');
        keywordGroup.className = 'keyword-input-group';
        keywordGroup.innerHTML = `
            <input type="text" name="keywords[]" placeholder="e.g., design, tech" class="gem-input" aria-label="Keyword input">
            <button type="button" class="btn-remove-keyword" style="display: ${showRemove ? 'inline-block' : 'none'}" aria-label="Remove keyword"><i class="fas fa-times"></i></button>
        `;
        keywordsContainer.appendChild(keywordGroup);
        updateKeywordRemoveButtons(); // Update visibility after adding
    }

    function handleKeywordRemove(event) {
        const removeButton = event.target.closest('.btn-remove-keyword');
        if (removeButton && keywordsContainer && keywordsContainer.children.length > 1) {
             removeButton.closest('.keyword-input-group')?.remove();
             updateKeywordRemoveButtons(); // Update visibility after removing
        }
    }

    function updateKeywordRemoveButtons() {
         if (!keywordsContainer) return;
         const groups = keywordsContainer.querySelectorAll('.keyword-input-group');
         const showRemove = groups.length > 1;
         groups.forEach((group, index) => {
             const btn = group.querySelector('.btn-remove-keyword');
             if (btn) {
                 // Show remove button for all if more than one exists
                 btn.style.display = showRemove ? 'inline-block' : 'none';
             }
         });
    }

    async function handleFormSubmit(event, isRefresh = false) {
        event.preventDefault();
        if (isGenerating) return;

        if (!isRefresh && generationsLeft <= 0) {
             showError("Generation limit reached for this session.");
             return;
         }

        isGenerating = true; // Set flag
        hideError();
        if (resultsSection) resultsSection.style.display = 'block';
        if (domainResultsContainer) domainResultsContainer.innerHTML = '';
        if (noResultsDiv) noResultsDiv.style.display = 'none';
        if (loadingIndicator) loadingIndicator.style.display = 'block';
        if (fabFilter) fabFilter.style.display = 'flex';
        if (fabFavorites) fabFavorites.style.display = 'flex';
        if (compareSection) compareSection.style.display = 'none';

        const userInput = getFormDataFromDom(); // Get current form values

        // --- Construct Prompt ---
        const prompt = createDomainPrompt(userInput);
        console.log("Generated Prompt (to send to backend):", prompt);

        try {
            // --- Call Backend for Generation ---
            const backendResponse = await callBackendAPIGenerate(prompt);

            if (backendResponse.error) {
                throw new Error(backendResponse.error);
            }
            handleBackendWarnings(backendResponse); // Show warnings

            // --- Process Generated Text & Check Availability ---
            // Assuming backend returns the text that needs parsing + availability checks
            if (backendResponse.generatedText) {
                generatedDomains = await processApiResponseAndCheckAvailability(backendResponse.generatedText, userInput.extensions);
            } else {
                generatedDomains = []; // No text received
            }

            if (!isRefresh) {
                saveToHistory(userInput, generatedDomains.length); // Save inputs
                generationsLeft--;
                updateUsageTracker();
            }

            // Apply initial filters/sort and render
            applyFilteringAndSorting();

            if (displayedDomains.length === 0 && !backendResponse.error) { // Only show 'no results' if no error occurred
                if (noResultsDiv) noResultsDiv.style.display = 'block';
            }

        } catch (error) {
            console.error("Domain Generation Process Error:", error);
            showError(error.message || "Failed to generate domain ideas.", error.stack); // Show error + optional details
            generatedDomains = [];
            displayedDomains = [];
            if (noResultsDiv) noResultsDiv.style.display = 'block'; // Show no results on error
        } finally {
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            isGenerating = false; // Reset flag
        }
    }

    function getFormDataFromDom() {
        const formData = new FormData(form);
        return {
            businessName: formData.get('business-name')?.trim() || null,
            industry: formData.get('industry') || null,
            keywords: Array.from(form.querySelectorAll('input[name="keywords[]"]')).map(input => input.value.trim()).filter(k => k),
            extensions: Array.from(extensionCheckboxes).filter(cb => cb.checked).map(cb => cb.value),
            nameStyle: form.querySelector('input[name="nameStyle"]:checked')?.value || 'short',
            maxLength: parseInt(maxLengthSlider?.value || '20', 10),
            prioritizeAvailable: availabilityFilterCheckbox?.checked || false,
            advanced: {
                alliteration: alliterationCheckbox?.checked || false,
                includeNumbers: includeNumbersCheckbox?.checked || false,
                allowHyphens: allowHyphensCheckbox?.checked || false,
                prefix: prefixInput?.value.trim() || null,
                suffix: suffixInput?.value.trim() || null,
            }
        };
    }

    function createDomainPrompt(userInput) {
        // (Keep the prompt structure from the previous answer)
        let prompt = `Generate 30+ domain name ideas based on:\n`;
        if (userInput.businessName) prompt += `- Business Name: ${userInput.businessName}\n`;
        if (userInput.industry) prompt += `- Industry: ${userInput.industry}\n`;
        if (userInput.keywords.length > 0) prompt += `- Keywords: ${userInput.keywords.join(', ')}\n`;
        prompt += `- Preferred Extensions: ${userInput.extensions.join(', ')}\n`;
        prompt += `- Style: ${userInput.nameStyle}\n`;
        prompt += `- Max Length: ${userInput.maxLength} chars\n`;
        if (userInput.advanced.alliteration) prompt += `- Prefer Alliteration\n`;
        if (userInput.advanced.includeNumbers) prompt += `- Allow Numbers\n`;
        if (userInput.advanced.allowHyphens) prompt += `- Allow Hyphens\n`;
        if (userInput.advanced.prefix) prompt += `- Prefix: ${userInput.advanced.prefix}\n`;
        if (userInput.advanced.suffix) prompt += `- Suffix: ${userInput.advanced.suffix}\n`;
        prompt += `\nProvide suggestions categorized (e.g., Primary, Extension Variations, Creative). For each: domain name, Brandability score (1-10), Memorability score (1-10), SEO-friendliness (Good/Fair/Poor), Pronunciation Clarity (Clear/Fair/Difficult), Typo Susceptibility (Low/Medium/High), Trademark Risk (Low/Medium/High - estimate).\nFormat clearly for parsing. `;
        if (userInput.prioritizeAvailable) prompt += `Prioritize likely available domains. `;
        prompt += `Generate at least 30 diverse options.`;
        return prompt;
    }

    async function callBackendAPIGenerate(prompt) {
        // Calls the backend endpoint responsible for getting suggestions from Gemini
        console.log(`--- Sending Prompt to Backend Endpoint: ${BACKEND_API_ENDPOINT_GENERATE} ---`);
        try {
            const response = await fetch(BACKEND_API_ENDPOINT_GENERATE, {
                method: 'POST', headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ prompt: prompt }) // Backend expects prompt
            });
            let responseData;
            try { responseData = await response.json(); }
            catch (e) {
                const textError = await response.text(); console.error(`Backend GENERATE response not JSON. Status: ${response.status}. Body: ${textError.substring(0, 500)}...`);
                return { error: `Server returned status ${response.status}, response not JSON.` };
            }
            if (!response.ok || responseData.error) {
                const errorMessage = responseData?.error || `Request failed with status ${response.status}`; console.error("Backend GENERATE Error Response:", responseData);
                return { error: errorMessage };
            }
            // Expecting { generatedText: "...", warning: ..., isIncomplete: ... }
            return responseData;
        } catch (error) {
            console.error('Error calling backend GENERATE API:', error);
            let message = error.message.includes('Failed to fetch') ? `Network error: Could not connect to backend.` : (error.message || 'Unknown network error.');
            return { error: message };
        }
    }

    async function checkAvailabilityBackend(domainName) {
        // Calls the backend endpoint responsible for checking domain availability
        // console.log(`Checking availability via backend for: ${domainName}`); // Debug log
        try {
            const response = await fetch(`${BACKEND_API_ENDPOINT_AVAILABILITY}?domain=${encodeURIComponent(domainName)}`);
            if (!response.ok) {
                console.error(`Availability check failed for ${domainName}: ${response.status}`);
                return null; // Indicate unknown status on non-OK response
            }
            const data = await response.json(); // Expects { available: true/false }
            if (typeof data.available !== 'boolean') {
                 console.error(`Invalid availability response for ${domainName}:`, data);
                 return null;
            }
            return data.available;
        } catch (error) {
            console.error(`Network error during availability check for ${domainName}:`, error);
            return null; // Indicate unknown on network errors
        }
    }

     function handleBackendWarnings(backendResponse) {
         if (backendResponse.isIncomplete) {
             const warnMsg = backendResponse.warning || "The AI response may have been cut short. Results might be incomplete.";
             showWarning(warnMsg);
             console.warn("Backend indicated incompleteness.");
         } else if (backendResponse.warning) {
              showWarning(backendResponse.warning);
         }
     }


    async function processApiResponseAndCheckAvailability(responseText, requestedExtensions) {
        console.log("Processing backend response text...");
        // 1. Parse the text response from Gemini (via backend)
        const parsedDomains = parseGeminiResponseText(responseText, requestedExtensions);
        if (parsedDomains.length === 0) {
            console.warn("No domains parsed from the response text.");
            return []; // Return empty if parsing failed
        }

        // 2. Check Availability via Backend (in parallel)
        console.log(`Checking availability for ${parsedDomains.length} parsed domains...`);
        const availabilityPromises = parsedDomains.map(domain => checkAvailabilityBackend(domain.name)); // Use backend check
        const availabilityResults = await Promise.allSettled(availabilityPromises);

        // 3. Update domain objects with availability status and tags
        parsedDomains.forEach((domain, index) => {
            const result = availabilityResults[index];
            if (result.status === 'fulfilled') {
                domain.available = result.value; // true, false, or null
            } else {
                console.error(`Failed to check availability for ${domain.name}:`, result.reason);
                domain.available = null; // Mark as unknown
            }
            // Update tags based on final status
            updateAvailabilityTags(domain);
        });

        console.log("Finished processing and availability checks.");
        return parsedDomains;
    }

    function parseGeminiResponseText(responseText, requestedExtensions) {
        // Parses the TEXT BLOCK returned by Gemini
        const lines = responseText.trim().split('\n');
        const domains = [];
        let currentCategory = 'general'; // Default
        const categoryKeywords = { /* ... define category keywords as before ... */
             primary: ["Primary", "Top Suggestions"], extension: ["Extension Variations"], industry: ["Industry Specific"],
             creative: ["Creative", "Unique"], short: ["Short", "Concise"], brandable: ["Brandable"]
        };

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.startsWith('---') || trimmedLine.startsWith('===')) continue;

            let isCategoryHeader = false;
            for (const [key, keywords] of Object.entries(categoryKeywords)) {
                 if (keywords.some(kw => trimmedLine.toLowerCase().includes(kw.toLowerCase())) && trimmedLine.split(' ').length < 6) {
                    currentCategory = key; isCategoryHeader = true; break;
                 }
            }
            if (isCategoryHeader) continue;

            // Regex to capture domain and optional key: value pairs
            const lineMatch = trimmedLine.match(/([\w-]+\.[a-zA-Z]{2,})\s*(.*)/i);
            if (lineMatch) {
                const domainName = lineMatch[1].trim().toLowerCase();
                const restOfLine = lineMatch[2] || '';
                const extension = "." + domainName.split('.').pop();

                // Basic check: ensure the parsed extension was requested
                 if (!requestedExtensions.includes(extension) && requestedExtensions.length > 0) {
                     // console.log(`Skipping domain ${domainName} due to unrequested extension ${extension}`);
                     continue; // Skip if extension wasn't requested (and some *were* requested)
                 }

                const fields = {};
                const fieldRegex = /(\b(?:Brandability|Memorability|SEO|Pronunciation|Typo|Trademark(?: Risk)?)\b)\s*[:\-]?\s*([\w\/]+(?:\s*\/\s*\d+)?|\d+\s*\/\s*10|Low|Medium|High|Good|Fair|Poor|Clear|Difficult|Yes|No)/gi;
                let fieldMatch;
                while ((fieldMatch = fieldRegex.exec(restOfLine)) !== null) {
                     let key = fieldMatch[1].trim().toLowerCase().replace(/\s+/g, '').replace('risk',''); // Normalize key
                     fields[key] = fieldMatch[2].trim();
                }

                 const domainData = {
                    id: domainName, name: domainName, extension: extension,
                    brandability: fields['brandability'] || 'N/A', memorability: fields['memorability'] || 'N/A',
                    seo: fields['seo'] || 'N/A', pronunciation: fields['pronunciation'] || 'N/A',
                    typo: fields['typo'] || 'N/A', trademark: fields['trademark'] || 'N/A',
                    category: currentCategory, tags: [currentCategory, extension.substring(1)],
                    isPrimary: currentCategory === 'primary', available: null // Set later
                };
                // Add 'short' tag
                if (domainName.split('.')[0].length <= 6 && !domainData.tags.includes('short')) domainData.tags.push('short');
                domains.push(domainData);
            } else {
                 console.warn("Could not parse line as domain:", trimmedLine);
            }
        }
        return domains;
    }

     function updateAvailabilityTags(domain) {
         // Remove old availability tags first
         domain.tags = domain.tags.filter(t => t !== 'available' && t !== 'taken' && t !== 'unknown');
         // Add the correct tag based on the status
         if (domain.available === true) domain.tags.push('available');
         else if (domain.available === false) domain.tags.push('taken');
         else domain.tags.push('unknown');
     }

    // --- Render Domain Cards ---
    function renderDomainCards(domainsToRender) {
        // (Keep the renderDomainCards function from the previous answer)
        // It iterates through domainsToRender and creates card HTML.
         if (!domainResultsContainer || !noResultsDiv) return;
         domainResultsContainer.innerHTML = '';
         noResultsDiv.style.display = domainsToRender.length === 0 ? 'block' : 'none';

         if (domainsToRender.length > 0) {
             populateFilterExtensions(domainsToRender); populateFilterCharacteristics(domainsToRender);
         } else {
              // Optionally clear filters if no results? Or leave them as is?
              // populateFilterExtensions([]); populateFilterCharacteristics([]);
         }

         domainsToRender.forEach(domain => { /* ... create card HTML ... */
            const card = document.createElement('div');
            const availabilityClass = domain.available === true ? 'available' : (domain.available === false ? 'taken' : 'unknown');
            card.className = `domain-card ${availabilityClass} ${domain.isPrimary ? 'primary' : ''}`;
            card.dataset.domain = domain.name;
            let availabilityText = domain.available === true ? 'Available' : (domain.available === false ? 'Taken' : 'Unknown');
            const isFavorite = favorites.includes(domain.name); const favoriteIcon = isFavorite ? 'fas fa-heart' : 'far fa-heart';
            const isCompared = compareList.includes(domain.name); const compareIcon = isCompared ? 'fas fa-check' : 'fas fa-balance-scale';
            const compareBtnText = isCompared ? 'Added' : 'Compare'; const compareBtnDisabled = !isCompared && compareList.length >= 5;
            const formatScore = (score) => { /* ... score formatting logic ... */
                if (!score || score === 'N/A') return 'N/A'; const lowerScore = score.toLowerCase(); const scoreMatch = lowerScore.match(/^(\d+)\s*\/\s*10/); if (scoreMatch) return `${scoreMatch[1]}/10`; if (lowerScore === 'high' || lowerScore === 'good' || lowerScore === 'clear' || lowerScore === 'yes') return 'High'; if (lowerScore === 'medium' || lowerScore === 'fair') return 'Medium'; if (lowerScore === 'low' || lowerScore === 'poor' || lowerScore === 'no' || lowerScore === 'difficult') return 'Low'; return score.charAt(0).toUpperCase() + score.slice(1);
            };
            card.innerHTML = `
                <div class="card-header">
                    <h3 class="domain-name">${escapeHtml(domain.name)}</h3>
                    <span class="availability-status ${availabilityClass}">${availabilityText}</span>
                </div>
                <div class="card-body">
                    <div class="evaluation-metrics">
                        <span title="Brandability"><i class="fas fa-star"></i> ${formatScore(domain.brandability)}</span>
                        <span title="Memorability"><i class="fas fa-brain"></i> ${formatScore(domain.memorability)}</span>
                        <span title="SEO"><i class="fas fa-search"></i> ${formatScore(domain.seo)}</span>
                        <span title="Pronunciation"><i class="fas fa-volume-up"></i> ${formatScore(domain.pronunciation)}</span>
                        <span title="Typo Risk"><i class="fas fa-keyboard"></i> ${formatScore(domain.typo)}</span>
                        <span title="Trademark Risk"><i class="fas fa-trademark"></i> ${formatScore(domain.trademark)}</span>
                    </div>
                    <div class="domain-tags">${domain.tags.map(tag => `<span class="tag tag-${escapeHtml(tag).replace('.', '').toLowerCase()}">${escapeHtml(tag)}</span>`).join('')}</div>
                </div>
                <div class="card-actions">
                    <button class="btn btn-secondary btn-small btn-compare ${isCompared ? 'active' : ''}" data-action="compare" data-domain="${escapeHtml(domain.name)}" ${compareBtnDisabled ? 'disabled' : ''} title="${compareBtnDisabled ? 'Compare list full' : (isCompared ? 'Remove from Compare' : 'Add to Compare')}"><i class="${compareIcon}"></i> ${compareBtnText}</button>
                    <button class="btn btn-secondary btn-small btn-favorite ${isFavorite ? 'active' : ''}" data-action="favorite" data-domain="${escapeHtml(domain.name)}" title="${isFavorite ? 'Remove Favorite' : 'Add Favorite'}"><i class="${favoriteIcon}"></i> Favorite</button>
                    <a href="${generateRegistrationLink(domain.name)}" class="btn btn-primary btn-small btn-register" target="_blank" rel="noopener noreferrer" data-action="register" ${domain.available !== true ? 'style="display:none;"' : ''} title="Check registration"><i class="fas fa-cash-register"></i> Register</a>
                    <button class="btn btn-secondary btn-small btn-details" data-action="details" data-domain="${escapeHtml(domain.name)}"><i class="fas fa-info-circle"></i> Details</button>
                </div>`;
            domainResultsContainer.appendChild(card);
         });
         updateCompareSectionVisibility();
         updateCompareButtonsState();
    }

    function generateRegistrationLink(domainName) {
        // (Keep placeholder or add real links)
         console.warn("Using placeholder registration link.");
         return `https://www.godaddy.com/domainsearch/find?checkAvail=1&domainToCheck=${encodeURIComponent(domainName)}`;
     }

    // --- View Mode, Sorting, Filtering (Keep functions from previous answer) ---
    function setViewMode(mode) { /* ... */
        if (!domainResultsContainer || !listViewBtn || !gridViewBtn) return;
        domainResultsContainer.classList.toggle('list-view', mode === 'list');
        domainResultsContainer.classList.toggle('grid-view', mode === 'grid');
        listViewBtn.classList.toggle('active', mode === 'list');
        gridViewBtn.classList.toggle('active', mode === 'grid');
    }
    function applySorting() { /* ... sorting logic using displayedDomains ... */
         if (!sortOptionsSelect) return; const sortBy = sortOptionsSelect.value; const parseScore = (score) => { /* ... */ if (!score || score === 'N/A') return 0; const lowerScore = score.toLowerCase(); const scoreMatch = lowerScore.match(/^(\d+)\s*\/\s*10/); if (scoreMatch) return parseInt(scoreMatch[1], 10); if (lowerScore === 'high' || lowerScore === 'good' || lowerScore === 'clear' || lowerScore === 'yes') return 9; if (lowerScore === 'medium' || lowerScore === 'fair') return 6; if (lowerScore === 'low' || lowerScore === 'poor' || lowerScore === 'no' || lowerScore === 'difficult') return 2; return 0; };
         displayedDomains.sort((a, b) => { let compareResult = 0; switch (sortBy) { case 'availability': const valA = a.available === true ? 2 : (a.available === null ? 1 : 0); const valB = b.available === true ? 2 : (b.available === null ? 1 : 0); compareResult = valB - valA; break; case 'length': compareResult = (a.name.split('.')[0]?.length || 99) - (b.name.split('.')[0]?.length || 99); break; case 'length-desc': compareResult = (b.name.split('.')[0]?.length || 0) - (a.name.split('.')[0]?.length || 0); break; case 'brandability': compareResult = parseScore(b.brandability) - parseScore(a.brandability); break; case 'memorability': compareResult = parseScore(b.memorability) - parseScore(a.memorability); break; default: const originalIndexA = generatedDomains.findIndex(d => d.id === a.id); const originalIndexB = generatedDomains.findIndex(d => d.id === b.id); const scoreA = (a.available === true ? 2000 : (a.available === null ? 1000 : 0)) + (a.isPrimary ? 100 : 0) - originalIndexA; const scoreB = (b.available === true ? 2000 : (b.available === null ? 1000 : 0)) + (b.isPrimary ? 100 : 0) - originalIndexB; compareResult = scoreB - scoreA; break; } if (compareResult === 0) { return a.name.localeCompare(b.name); } return compareResult; });
         renderDomainCards(displayedDomains);
     }
    function applyFilteringAndSorting() { /* ... filtering logic using generatedDomains, update displayedDomains ... */
         const availabilityFilter = document.querySelector('input[name="filterAvailability"]:checked')?.value || 'all';
         const selectedExtensions = Array.from(filterExtensionsContainer?.querySelectorAll('input[type="checkbox"]:checked') || []).map(cb => cb.value);
         const selectedCharacteristics = Array.from(filterCharacteristicsContainer?.querySelectorAll('input[type="checkbox"]:checked') || []).map(cb => cb.value);
         displayedDomains = generatedDomains.filter(domain => {
             if (availabilityFilter === 'available' && domain.available !== true) return false; if (availabilityFilter === 'taken' && domain.available !== false) return false;
             if (selectedExtensions.length > 0 && !selectedExtensions.includes(domain.extension)) return false;
             if (selectedCharacteristics.length > 0) { const domainChars = new Set([domain.category, ...domain.tags.filter(t => !t.startsWith('.') && !['available','taken','unknown'].includes(t))]); if (domain.isPrimary) domainChars.add('primary'); if (!selectedCharacteristics.some(char => domainChars.has(char))) return false; }
             return true;
         });
         console.log(`Filtered to ${displayedDomains.length} domains.`);
         applySorting(); // Re-render with sorted results
     }
    function populateFilterExtensions(domains = generatedDomains) { /* ... */
        if (!filterExtensionsContainer) return; const uniqueExtensions = [...new Set(domains.map(d => d.extension))].sort(); const previouslyChecked = Array.from(filterExtensionsContainer.querySelectorAll('input:checked')).map(cb => cb.value); filterExtensionsContainer.innerHTML = ''; uniqueExtensions.forEach(ext => { const isChecked = previouslyChecked.includes(ext); const label = document.createElement('label'); label.innerHTML = `<input type="checkbox" name="filterExt" value="${ext}" ${isChecked ? 'checked' : ''}> ${escapeHtml(ext)}`; filterExtensionsContainer.appendChild(label); });
    }
    function populateFilterCharacteristics(domains = generatedDomains) { /* ... */
        if (!filterCharacteristicsContainer) return; const characteristics = new Set(['primary', 'short']); domains.forEach(d => { d.tags.forEach(tag => { if (!tag.startsWith('.') && !['available','taken','unknown'].includes(tag)) characteristics.add(tag); }); if(d.category && !characteristics.has(d.category)) characteristics.add(d.category); }); const sortedCharacteristics = [...characteristics].sort(); const previouslyChecked = Array.from(filterCharacteristicsContainer.querySelectorAll('input:checked')).map(cb => cb.value); filterCharacteristicsContainer.innerHTML = ''; sortedCharacteristics.forEach(char => { const isChecked = previouslyChecked.includes(char); const label = document.createElement('label'); const displayText = char.charAt(0).toUpperCase() + char.slice(1); label.innerHTML = `<input type="checkbox" name="filterChars" value="${char}" ${isChecked ? 'checked' : ''}> ${escapeHtml(displayText)}`; filterCharacteristicsContainer.appendChild(label); });
     }
    function toggleFilterSheet() { /* ... */
         if (!filterSheet || !overlay) return; const isOpen = filterSheet.classList.contains('open'); if (isOpen) { filterSheet.classList.remove('open'); overlay.classList.remove('active'); document.body.style.overflow = ''; } else { filterSheet.scrollTop = 0; filterSheet.classList.add('open'); overlay.classList.add('active'); document.body.style.overflow = 'hidden'; }
    }

    // --- Card Actions, Favorites, Comparison, Modal (Keep functions from previous answer) ---
    function handleCardAction(event) { /* ... handle favorite, compare, details clicks ... */
         const targetButton = event.target.closest('button[data-action]'); const targetLink = event.target.closest('a[data-action]');
         if (targetButton) { const action = targetButton.dataset.action; const domainName = targetButton.dataset.domain; if (!domainName) return; if (action === 'favorite') toggleFavorite(domainName, targetButton); else if (action === 'compare') toggleCompare(domainName, targetButton); else if (action === 'details') showDetailsModal(domainName); }
         else if (targetLink && targetLink.dataset.action === 'register') { console.log(`Register link clicked: ${targetLink.href}`); }
    }
    function toggleFavorite(domainName, button) { /* ... add/remove from favorites array & localStorage, update button UI ... */
         const icon = button.querySelector('i'); const index = favorites.indexOf(domainName); if (index > -1) { favorites.splice(index, 1); icon.className = 'far fa-heart'; button.classList.remove('active'); button.setAttribute('aria-pressed', 'false'); } else { favorites.push(domainName); icon.className = 'fas fa-heart'; button.classList.add('active'); button.setAttribute('aria-pressed', 'true'); } localStorage.setItem('gemcontent_favorites', JSON.stringify(favorites)); updateFavoritesDisplay();
    }
    function updateFavoritesDisplay() { /* ... update badge count ... */ if (favoritesCountBadge) { const count = favorites.length; favoritesCountBadge.textContent = count; favoritesCountBadge.classList.toggle('show', count > 0); } }
    function showFavorites() { /* ... alert or show modal ... */ alert(favorites.length > 0 ? `Favorites:\n${favorites.join('\n')}` : "No favorites added."); }
    function toggleCompare(domainName, button) { /* ... add/remove from compareList, update button UI, update tray ... */
        if (!button || button.disabled) return; const icon = button.querySelector('i'); const index = compareList.indexOf(domainName);
        if (index > -1) { compareList.splice(index, 1); button.classList.remove('active'); icon.className = 'fas fa-balance-scale'; button.innerHTML = `<i class="fas fa-balance-scale"></i> Compare`; button.setAttribute('aria-pressed', 'false'); removeCompareItemFromTray(domainName); }
        else { if (compareList.length < 5) { compareList.push(domainName); button.classList.add('active'); icon.className = 'fas fa-check'; button.innerHTML = `<i class="fas fa-check"></i> Added`; button.setAttribute('aria-pressed', 'true'); addCompareItemToTray(domainName); } else { alert("Max 5 domains in comparison."); return; } }
        updateCompareTray(); updateCompareButtonsState();
    }
    function addCompareItemToTray(domainName) { /* ... add item div to compareTray ... */ if (!compareTray) return; const item = document.createElement('div'); item.className = 'compare-item'; item.dataset.domain = domainName; item.innerHTML = `<span>${escapeHtml(domainName)}</span><button class="remove-compare-item" data-domain="${escapeHtml(domainName)}" aria-label="Remove">×</button>`; compareTray.appendChild(item); }
    function removeCompareItemFromTray(domainName) { /* ... remove item div from compareTray ... */ if (!compareTray) return; const item = compareTray.querySelector(`.compare-item[data-domain="${domainName}"]`); if (item) item.remove(); }
    function handleRemoveCompareItem(event) { /* ... handle click on 'x' in tray ... */ const removeButton = event.target.closest('.remove-compare-item'); if (removeButton) { const domainName = removeButton.dataset.domain; const cardButton = domainResultsContainer?.querySelector(`.btn-compare[data-domain="${domainName}"]`); if (cardButton) { toggleCompare(domainName, cardButton); } else { const index = compareList.indexOf(domainName); if (index > -1) compareList.splice(index, 1); removeCompareItemFromTray(domainName); updateCompareTray(); updateCompareButtonsState(); } } }
    function updateCompareTray() { /* ... update count span and compareNowBtn disabled state ... */ if (compareCountSpan) compareCountSpan.textContent = compareList.length; if (compareNowBtn) compareNowBtn.disabled = compareList.length < 2; updateCompareSectionVisibility(); }
    function updateCompareButtonsState() { /* ... enable/disable card compare buttons based on list count ... */ const maxReached = compareList.length >= 5; domainResultsContainer?.querySelectorAll('.btn-compare').forEach(btn => { const domain = btn.dataset.domain; const isAdded = compareList.includes(domain); btn.disabled = maxReached && !isAdded; btn.title = btn.disabled ? 'Compare list full' : (isAdded ? 'Remove from Compare' : 'Add to Compare'); }); }
    function updateCompareSectionVisibility() { /* ... show/hide compare section based on list content ... */ if (compareSection) { compareSection.style.display = (generatedDomains.length > 0 && compareList.length > 0) ? 'block' : 'none'; } }
    function clearComparison() { /* ... clear list, tray, reset buttons ... */ compareList = []; if (compareTray) compareTray.innerHTML = ''; updateCompareTray(); domainResultsContainer?.querySelectorAll('.btn-compare.active').forEach(btn => { btn.classList.remove('active'); btn.innerHTML = `<i class="fas fa-balance-scale"></i> Compare`; btn.setAttribute('aria-pressed', 'false'); }); updateCompareButtonsState(); }
    function showComparison() { /* ... show comparison modal/alert ... */ if (compareList.length < 2) return; const domainsToCompare = generatedDomains.filter(d => compareList.includes(d.id)); if (domainsToCompare.length < 2) { alert("Couldn't find details for comparison."); return; } let comparisonText = "Domain Comparison:\n\n"; domainsToCompare.forEach(d => { comparisonText += `--- ${d.name} ---\nStatus: ${d.available === true ? 'Available' : (d.available === false ? 'Taken' : 'Unknown')}\nBrandability: ${d.brandability}\nMemorability: ${d.memorability}\nSEO: ${d.seo}\n\n`; }); alert(comparisonText); }
    function showDetailsModal(domainName) { /* ... populate and show modal ... */
        const domain = generatedDomains.find(d => d.name === domainName); if (!domain || !modal) return; if (modalDomainName) modalDomainName.textContent = domain.name; let detailsContainer = modal.querySelector('.domain-details-area'); if (!detailsContainer) { detailsContainer = document.createElement('div'); detailsContainer.className = 'domain-details-area'; modal.querySelector('.modal-content')?.appendChild(detailsContainer); }
        let statusText, statusClass; switch(domain.available) { case true: statusText = 'Available'; statusClass = 'text-success'; break; case false: statusText = 'Taken'; statusClass = 'text-danger'; break; default: statusText = 'Unknown'; statusClass = 'text-muted'; break; }
        detailsContainer.innerHTML = `<p><strong>Status:</strong> <span class="${statusClass}">${statusText}</span></p><h4>Details:</h4><ul><li>Brandability: ${domain.brandability||'N/A'}</li><li>Memorability: ${domain.memorability||'N/A'}</li><li>SEO: ${domain.seo||'N/A'}</li><li>Pronunciation: ${domain.pronunciation||'N/A'}</li><li>Typo Risk: ${domain.typo||'N/A'}</li><li>Trademark Risk: ${domain.trademark||'N/A'} <small>(Est.)</small></li></ul><div class="modal-actions" style="margin-top: 20px;">${domain.available === true ? `<a href="${generateRegistrationLink(domain.name)}" class="btn btn-primary" target="_blank">Register Now</a>` : ''}<button class="btn btn-secondary btn-small btn-modal-compare" data-domain="${domain.name}" style="margin-left: 10px;" ${compareList.length >= 5 && !compareList.includes(domain.name) ? 'disabled' : ''}>${compareList.includes(domain.name) ? 'Added to Compare' : 'Add to Compare'}</button><button class="btn btn-secondary btn-small btn-modal-favorite" data-domain="${domain.name}" style="margin-left: 10px;">${favorites.includes(domain.name) ? 'Favorited' : 'Add to Favorites'}</button></div>`;
        // Add listeners for modal buttons
         const modalCompareBtn = detailsContainer.querySelector('.btn-modal-compare'); if(modalCompareBtn) modalCompareBtn.addEventListener('click', () => { const cardBtn = domainResultsContainer?.querySelector(`.btn-compare[data-domain="${domain.name}"]`); if(cardBtn) toggleCompare(domain.name, cardBtn); else { if (!compareList.includes(domain.name) && compareList.length < 5) { compareList.push(domain.name); addCompareItemToTray(domain.name); updateCompareTray(); updateCompareButtonsState(); modalCompareBtn.textContent = 'Added to Compare'; } else if(compareList.length >= 5) alert('Max 5 domains'); } /* update modal button state */ });
         const modalFavoriteBtn = detailsContainer.querySelector('.btn-modal-favorite'); if(modalFavoriteBtn) modalFavoriteBtn.addEventListener('click', () => { const cardBtn = domainResultsContainer?.querySelector(`.btn-favorite[data-domain="${domain.name}"]`); if(cardBtn) toggleFavorite(domain.name, cardBtn); else { const index = favorites.indexOf(domain.name); if(index > -1) favorites.splice(index, 1); else favorites.push(domain.name); localStorage.setItem('gemcontent_favorites', JSON.stringify(favorites)); updateFavoritesDisplay(); } modalFavoriteBtn.textContent = favorites.includes(domain.name) ? 'Favorited' : 'Add to Favorites'; });
        modal.style.display = "block"; modal.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
     }
     function closeModal() { /* ... hide modal, restore scroll ... */ if(modal) { modal.style.display = "none"; modal.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; } }

    // --- Export (Keep functions from previous answer) ---
    function exportResults(format) { /* ... */
        if (displayedDomains.length === 0) { alert("No results to export."); return; }
        const dataToExport = displayedDomains.map(d => ({ Domain: d.name, Available: d.available === true ? 'Yes' : (d.available === false ? 'No' : 'Unknown'), Category: d.category || 'N/A', Primary: d.isPrimary ? 'Yes' : 'No', Brandability: d.brandability || 'N/A', Memorability: d.memorability || 'N/A', SEO: d.seo || 'N/A', Pronunciation: d.pronunciation || 'N/A', Typo: d.typo || 'N/A', TrademarkRisk: d.trademark || 'N/A', Tags: d.tags.join(', ') }));
        const timestamp = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-'); const filename = `gemcontent_domains_${timestamp}.${format}`;
        if (format === 'csv') exportToCsv(filename, dataToExport); else if (format === 'pdf') exportToPdf(filename, dataToExport);
    }
    function exportToCsv(filename, data) { /* ... CSV generation and download ... */
        if (!data || data.length === 0) return; try { const header = Object.keys(data[0]).join(','); const rows = data.map(row => Object.values(row).map(value => { const stringValue = String(value ?? ''); if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) return `"${stringValue.replace(/"/g, '""')}"`; return stringValue; }).join(',')); const csvContent = `\uFEFF${header}\n${rows.join('\n')}`; const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); if (link.download !== undefined) { const url = URL.createObjectURL(blob); link.setAttribute("href", url); link.setAttribute("download", filename); link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); } else alert("CSV export not supported."); } catch (error) { console.error("CSV Export Error:", error); alert("Error creating CSV."); }
    }
    function exportToPdf(filename, data) { /* ... PDF generation using jsPDF and jsPDF-AutoTable ... */
         if (typeof jspdf === 'undefined' || typeof jspdf.plugin?.autoTable === 'undefined') { alert("PDF Library not loaded."); return; } if (!data || data.length === 0) return; try { const { jsPDF } = jspdf; const doc = new jsPDF(); const tableColumn = Object.keys(data[0]); const tableRows = data.map(row => Object.values(row).map(val => String(val ?? 'N/A'))); doc.autoTable({ head: [tableColumn], body: tableRows, startY: 20, theme: 'grid', styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' }, headStyles: { fillColor: [32, 178, 170], textColor: [255, 255, 255], fontStyle: 'bold' }, didDrawPage: function (data) { doc.setFontSize(12); doc.text("GemContent Domain Ideas", data.settings.margin.left, 15); } }); doc.save(filename); } catch (error) { console.error("PDF Export Error:", error); alert("Error creating PDF."); }
    }

    // --- History & Usage (Keep functions from previous answer) ---
    function saveToHistory(userInput, resultCount) { /* ... save userInput to localStorage ... */ try { const searchEntry = { timestamp: new Date().toISOString(), query: { businessName: userInput.businessName, industry: userInput.industry, keywords: userInput.keywords, extensions: userInput.extensions, nameStyle: userInput.nameStyle, maxLength: userInput.maxLength, }, resultsCount: resultCount, id: Date.now() }; searchHistory.unshift(searchEntry); if (searchHistory.length > 20) searchHistory.pop(); localStorage.setItem('gemcontent_history', JSON.stringify(searchHistory)); } catch (error) { console.error("History save failed:", error); } }
    function updateUsageTracker() { /* ... update usage bar and generations left text ... */ if (!usageTracker || !generationsLeftSpan || !usageBar) return; generationsLeftSpan.textContent = generationsLeft; const percentage = Math.max(0, (generationsLeft / MAX_GENERATIONS) * 100); usageBar.style.width = `${percentage}%`; if (percentage <= 0) usageBar.style.background = 'var(--error-red)'; else if (percentage < 30) usageBar.style.background = 'var(--orange)'; else usageBar.style.background = 'var(--gradient)'; if (generateBtn) { generateBtn.disabled = generationsLeft <= 0; generateBtn.title = generationsLeft <= 0 ? "Generation limit reached" : ""; generateBtn.style.cursor = generationsLeft <= 0 ? 'not-allowed' : 'pointer'; } }

    // --- Error Handling (Keep functions from previous answer) ---
    function showError(message, details = '') { /* ... display error message ... */ if (!errorMessage || !errorDetails) return; document.querySelectorAll('.warning-message').forEach(el => el.remove()); errorMessage.style.display = 'block'; errorMessage.querySelector('p:first-child').textContent = message; errorDetails.textContent = details; if (loadingIndicator) loadingIndicator.style.display = 'none'; errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    function hideError() { /* ... hide error message ... */ if (!errorMessage) return; errorMessage.style.display = 'none'; if (errorDetails) errorDetails.textContent = ''; }

    // --- HTML Escaping Helper ---
    function escapeHtml(unsafe) { /* ... */ if (typeof unsafe !== 'string') return ''; return unsafe.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, "").replace(/'/g, "'"); }

}); // End DOMContentLoaded