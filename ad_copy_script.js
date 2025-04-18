// public/js/ad_copy_script.js
document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements (Keep all your existing element selections) ---
    const adCopyForm = document.getElementById('ad-copy-form');
    const platformSelect = document.getElementById('ad-platform');
    const formatSelect = document.getElementById('ad-format');
    const productNameInput = document.getElementById('product-name');
    const productCategoryInput = document.getElementById('product-category');
    const targetAudienceSelect = document.getElementById('target-audience');
    const targetAudienceCustomInput = document.getElementById('target-audience-custom');
    const sellingPointsContainer = document.getElementById('selling-points-container');
    const addSellingPointBtn = document.getElementById('add-selling-point');
    const primaryCtaInput = document.getElementById('primary-cta');
    const charLimitInput = document.getElementById('char-limit');
    const wordLimitInput = document.getElementById('word-limit');
    const toneSelect = document.getElementById('tone-selector');
    const generateButton = document.getElementById('generate-button');
    const generateButtonMobile = document.getElementById('generate-button-mobile');
    const loadingIndicator = document.getElementById('loading-indicator');
    const resultsSection = document.getElementById('results-section');
    const resultsCarousel = document.getElementById('results-carousel');
    const resultsCountSpan = document.getElementById('results-count');
    const currentResultIndicator = document.getElementById('current-result-indicator');
    const prevResultBtn = document.getElementById('prev-result');
    const nextResultBtn = document.getElementById('next-result');
    const copyAllBtn = document.getElementById('copy-all-btn');
    const copyAllMobileBtn = document.getElementById('copy-all-mobile');
    const viewResultsMobileBtn = document.getElementById('view-results-mobile');
    const exportBtn = document.getElementById('export-btn');
    const exportDropdown = document.querySelector('.export-dropdown');
    const saveLibraryBtn = document.getElementById('save-library-btn');
    const previewSection = document.getElementById('preview-section');
    const adPreviewContainer = document.getElementById('ad-preview-container');
    const toggleMobilePreviewBtn = document.getElementById('toggle-mobile-preview');
    const toggleDesktopPreviewBtn = document.getElementById('toggle-desktop-preview');
    const performanceScoreSpan = document.getElementById('performance-score');
    const ctrEstimateSpan = document.getElementById('ctr-estimate');
    const complianceStatusSpan = document.getElementById('compliance-status');
    const previewPlaceholder = document.querySelector('.preview-placeholder');
    const generationsLeftSpan = document.getElementById('generations-left');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileNavMenu = document.getElementById('mobile-nav-menu');
    const bottomActionBar = document.getElementById('bottom-action-bar');
    const errorDisplayArea = document.getElementById('error-display-area'); // ** ADD AN ELEMENT FOR ERRORS in HTML ** <div id="error-display-area" class="error-message" style="display: none;"></div>

    // --- State Variables ---
    let currentVariationIndex = 0;
    let generatedVariations = [];
    const MAX_VARIATIONS = 5; // Keep max variations definition

    // --- Backend Configuration ---
    // ** REMOVE API KEY AND DIRECT URL **
    // const API_ENDPOINT = '...'; // REMOVED
    // const API_KEY = "..."; // <-- !!! REMOVED FOR SECURITY !!!

    // ** ADD BACKEND ENDPOINT URL **
    const BACKEND_API_ENDPOINT = '/api/generate-adcopy'; // Choose a unique path

    // --- Event Listeners (Keep all existing listeners) ---
    if (mobileMenuToggle) mobileMenuToggle.addEventListener('click', () => { /* ... keep logic ... */ });
    if (addSellingPointBtn) addSellingPointBtn.addEventListener('click', () => { /* ... keep logic ... */ });
    if (adCopyForm) adCopyForm.addEventListener('submit', handleFormSubmit);
    if (generateButtonMobile) generateButtonMobile.addEventListener('click', (e) => { e.preventDefault(); adCopyForm.requestSubmit(); });
    if (prevResultBtn) prevResultBtn.addEventListener('click', showPreviousVariation);
    if (nextResultBtn) nextResultBtn.addEventListener('click', showNextVariation);
    if (toggleMobilePreviewBtn) toggleMobilePreviewBtn.addEventListener('click', () => showPreview('mobile'));
    if (toggleDesktopPreviewBtn) toggleDesktopPreviewBtn.addEventListener('click', () => showPreview('desktop'));
    if (resultsCarousel) resultsCarousel.addEventListener('click', handleCopyClick);
    if (copyAllBtn) copyAllBtn.addEventListener('click', copyAllVariations);
    if (copyAllMobileBtn) copyAllMobileBtn.addEventListener('click', copyAllVariations);
    if (exportBtn) exportBtn.addEventListener('click', (e) => { /* ... keep logic ... */ });
    document.addEventListener('click', (e) => { /* ... keep logic for closing dropdown ... */ });
    if (saveLibraryBtn) saveLibraryBtn.addEventListener('click', () => alert('Save to Library is a Premium Feature!'));
    document.getElementById('export-pdf')?.addEventListener('click', (e) => { e.preventDefault(); alert('PDF Export is Premium.'); });
    document.getElementById('export-platform')?.addEventListener('click', (e) => { e.preventDefault(); alert('Direct Platform Export is Premium.'); });
    document.getElementById('export-csv')?.addEventListener('click', (e) => { /* ... keep logic ... */ });
    if (viewResultsMobileBtn) viewResultsMobileBtn.addEventListener('click', () => { /* ... keep logic ... */ });

    // Initialize component states
    disableMobileActionButtons();
    showPreview('mobile'); // Default preview

    // --- Core Functions ---

    // ** MODIFIED handleFormSubmit **
    async function handleFormSubmit(event) {
        event.preventDefault();
        console.log("Form submission triggered");
        clearErrorMessages(); // Clear previous errors

        // Basic Validation
        if (!adCopyForm.checkValidity()) {
            adCopyForm.reportValidity();
            return;
        }

        // Decrement generation count (example) - Keep if using
        if (generationsLeftSpan) {
            let currentCount = parseInt(generationsLeftSpan.textContent);
            if (currentCount <= 0) {
                showError("You've run out of generations! Upgrade to Premium for more.");
                return;
            }
            generationsLeftSpan.textContent = currentCount - 1;
        }

        // --- UI Updates for Loading ---
        if(loadingIndicator) loadingIndicator.style.display = 'block';
        if(resultsSection) resultsSection.style.display = 'none';
        if(previewSection) previewSection.style.display = 'none';
        if(resultsCarousel) resultsCarousel.innerHTML = '';
        if(adPreviewContainer) adPreviewContainer.innerHTML = '<div class="preview-placeholder">Select an ad variation to preview</div>';
        generatedVariations = [];
        currentVariationIndex = 0;
        updateNavigationButtons();
        disableMobileActionButtons();
        if(generateButton) generateButton.disabled = true;
        if(generateButtonMobile) generateButtonMobile.disabled = true;

        // --- Gather Form Data (Keep this part) ---
        const formData = new FormData(adCopyForm);
        const sellingPoints = Array.from(formData.getAll('selling-points[]')).filter(sp => sp.trim() !== '').map(sp => sp.trim());
        const customAudience = formData.get('target-audience-custom').trim();
        const audienceSelected = formData.get('target-audience');
        const audience = audienceSelected === '-- Specify Below --' || !audienceSelected
                         ? customAudience || 'General Audience'
                         : audienceSelected + (customAudience ? `: ${customAudience}` : '');

        const promptData = { // Keep this object for preview rendering context
            platform: formData.get('ad-platform'),
            format: formData.get('ad-format'),
            productName: formData.get('product-name').trim(),
            productCategory: formData.get('product-category').trim(),
            targetAudience: audience,
            sellingPoints: sellingPoints,
            primaryCTA: formData.get('primary-cta').trim(),
            charLimit: formData.get('char-limit') || 'N/A',
            wordLimit: formData.get('word-limit') || 'N/A',
            tone: formData.get('tone-selector'),
        };

        // --- Construct Prompt Locally (Keep this) ---
        const prompt = constructGeminiPrompt(promptData);
        // console.log("Constructed Prompt (sending to backend):", prompt);

        // --- *** Call Backend API INSTEAD of Gemini Directly *** ---
        try {
            console.log(`Calling backend endpoint: ${BACKEND_API_ENDPOINT}`);
            const backendResponse = await fetch(BACKEND_API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Send the constructed prompt in the body
                body: JSON.stringify({ prompt: prompt }),
            });

            const resultData = await backendResponse.json(); // Assume backend sends JSON

            if (!backendResponse.ok) {
                // Handle errors reported by the backend
                console.error("Backend Error:", resultData);
                throw new Error(resultData.error || `Request failed with status ${backendResponse.status}`);
            }

            console.log("Received from Backend:", resultData);

            // Process successful response from backend
            if (resultData.generatedText) {
                 // Parse and display results - pass promptData for context in preview/metrics
                parseAndDisplayResults(resultData.generatedText, promptData);

                // Display warning if content might be incomplete
                if (resultData.isIncomplete || resultData.warning) {
                    showWarning(resultData.warning || "Output might be incomplete (e.g., max length reached).");
                }

                // If results are generated, update UI
                if (generatedVariations.length > 0) {
                    if(resultsSection) resultsSection.style.display = 'block';
                    if(previewSection) previewSection.style.display = 'block';
                    enableMobileActionButtons();
                    // Scroll to results
                    setTimeout(() => {
                        resultsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                } else {
                     // Even if backend response is 200, parsing might fail
                     showError("Received response, but couldn't parse valid ad variations.");
                     if(resultsCarousel) resultsCarousel.innerHTML = `<p class="error-message">Couldn't parse any valid ad variations from the AI response. Please check the console and try refining your input.</p>`;
                     if(resultsSection) resultsSection.style.display = 'block';
                 }

            } else {
                // Handle unexpected success response structure
                 throw new Error("Backend response was successful but missing expected 'generatedText'.");
            }

        } catch (error) {
            console.error("Error during backend communication or processing:", error);
            // Display error to user
            showError(`Error: ${error.message}. Check console for details.`);
            // Optionally show error in results area too
            if(resultsCarousel) resultsCarousel.innerHTML = `<p class="error-message">An error occurred: ${escapeHtml(error.message)}</p>`;
            if(resultsSection) resultsSection.style.display = 'block';

        } finally {
            // --- Hide Loading, Re-enable Buttons ---
            if(loadingIndicator) loadingIndicator.style.display = 'none';
            if(generateButton) generateButton.disabled = false;
            if(generateButtonMobile) generateButtonMobile.disabled = false;
        }
    }

    // --- constructGeminiPrompt (Keep As Is) ---
    // This function still builds the prompt text locally before sending to backend
    function constructGeminiPrompt(data) {
        return `
        You are an expert advertising copywriter. Generate exactly ${MAX_VARIATIONS} unique ad copy variations based on the following details.

        **Ad Context:**
        *   Platform: ${data.platform}
        *   Format: ${data.format}
        *   Product/Service: ${data.productName} (${data.productCategory})
        *   Target Audience: ${data.targetAudience}
        *   Key Selling Points: ${data.sellingPoints.join('; ')}
        *   Primary CTA Goal: ${data.primaryCTA}
        *   Desired Tone: ${data.tone}
        ${data.charLimit !== 'N/A' ? `*   Guideline: Aim for around ${data.charLimit} characters for key text elements where applicable.` : ''}
        ${data.wordLimit !== 'N/A' ? `*   Guideline: Aim for around ${data.wordLimit} words for key text elements where applicable.` : ''}

        **Instructions:**
        For each of the ${MAX_VARIATIONS} variations, provide:
        1.  **Headlines:** 3 to 5 compelling headlines/titles suitable for the platform/format. List each on a new line.
        2.  **Description:** 1 main ad copy/description body.
        3.  **CTA:** 1 clear call-to-action phrase aligning with the goal "${data.primaryCTA}".
        ${(data.platform.includes('Google') || data.platform.includes('Display') || data.format.includes('Search')) ? '4.  **Display URL:** 1 suggested display URL path (e.g., YourSite.com/Offer).' : ''}

        **Output Format:**
        Use the following EXACT structure for EACH variation. DO NOT add any introductory or concluding text outside this structure. Separate each variation block clearly.

        ### VARIATION 1 START ###
        --- HEADLINES ---
        [Headline 1 Text]
        [Headline 2 Text]
        [Headline 3 Text]
        --- DESCRIPTION ---
        [Description text body for Variation 1]
        --- CTA ---
        [Call to Action Text for Variation 1]
        ${(data.platform.includes('Google') || data.platform.includes('Display') || data.format.includes('Search')) ? '--- DISPLAY URL ---\n[Display URL suggestion for Variation 1]' : ''}
        ### VARIATION 1 END ###

        ### VARIATION 2 START ###
        --- HEADLINES ---
        [Headline 1 Text]
        [Headline 2 Text]
        ...
        --- DESCRIPTION ---
        [Description text body for Variation 2]
        --- CTA ---
        [Call to Action Text for Variation 2]
        ${(data.platform.includes('Google') || data.platform.includes('Display') || data.format.includes('Search')) ? '--- DISPLAY URL ---\n[Display URL suggestion for Variation 2]' : ''}
        ### VARIATION 2 END ###

        [Repeat for Variation 3, 4, 5]
        `;
    }

    // --- *** REMOVE callGeminiAPI function *** ---
    // async function callGeminiAPI(prompt) { ... } // DELETE THIS FUNCTION

    // --- parseAndDisplayResults (Keep As Is, but use promptData) ---
    // Make sure it receives promptData to know if displayUrl is expected
    function parseAndDisplayResults(responseText, promptData) { // Added promptData parameter
        console.log("Parsing response text received from backend...");
        generatedVariations = [];

        if (!responseText || typeof responseText !== 'string') {
             console.error("Invalid responseText received for parsing:", responseText);
             showError("Received invalid data from the server.");
             return; // Stop processing
        }

        const variationBlocks = responseText.split(/### VARIATION \d+ START ###/i).slice(1);

        if (variationBlocks.length === 0) {
            console.error("Could not find any variation blocks in response text:\n", responseText);
            // Display raw text if parsing fails completely
            if (resultsCarousel) resultsCarousel.innerHTML = `<p class="error-message">Failed to parse variations. Raw Response:</p><pre class="raw-output">${escapeHtml(responseText)}</pre>`;
            if (resultsSection) resultsSection.style.display = 'block';
            showError("Response format error: No variation blocks found.");
            return;
        }

        variationBlocks.forEach((block, index) => {
            if (index >= MAX_VARIATIONS) return;

            const variation = {
                id: index + 1,
                headlines: [],
                description: '',
                cta: '',
                displayUrl: '' // Initialize
            };

            const headlinesMatch = block.match(/--- HEADLINES ---\s*([\s\S]*?)\s*--- DESCRIPTION ---/i);
            const descriptionMatch = block.match(/--- DESCRIPTION ---\s*([\s\S]*?)\s*--- CTA ---/i);
            const ctaMatch = block.match(/--- CTA ---\s*([\s\S]*?)\s*(?:--- DISPLAY URL ---|### VARIATION \d+ END ###)/i);
            const displayUrlMatch = block.match(/--- DISPLAY URL ---\s*([\s\S]*?)\s*### VARIATION \d+ END ###/i);

            if (headlinesMatch?.[1]) {
                variation.headlines = headlinesMatch[1].split('\n').map(h => h.trim().replace(/^- /, '')).filter(Boolean);
            } else console.warn(`Var ${index + 1}: No Headlines`);

            if (descriptionMatch?.[1]) {
                variation.description = descriptionMatch[1].trim();
            } else console.warn(`Var ${index + 1}: No Description`);

            if (ctaMatch?.[1]) {
                variation.cta = ctaMatch[1].trim();
            } else console.warn(`Var ${index + 1}: No CTA`);

            // Use promptData to check if displayUrl was expected
            const expectDisplayUrl = promptData.platform.includes('Google') || promptData.platform.includes('Display') || promptData.format.includes('Search');
            if (expectDisplayUrl) {
                if (displayUrlMatch?.[1]) {
                    variation.displayUrl = displayUrlMatch[1].trim();
                } else {
                    console.warn(`Var ${index + 1}: No Display URL (expected)`);
                    variation.displayUrl = 'N/A';
                }
            }

            if (variation.headlines.length > 0 || variation.description || variation.cta) {
                generatedVariations.push(variation);
            } else {
                console.warn(`Var ${index + 1}: Skipping empty variation.`);
            }
        });

        console.log("Parsed Variations:", generatedVariations);

        if (generatedVariations.length > 0) {
            displayVariation(currentVariationIndex);
            updateNavigationButtons();
            if(resultsCountSpan) resultsCountSpan.textContent = generatedVariations.length;
        } else {
            if (resultsCarousel) resultsCarousel.innerHTML = `<p class="error-message">Couldn't parse any valid ad variations from the response. Please check the input and try again. Raw Response:</p><pre class="raw-output">${escapeHtml(responseText)}</pre>`;
            if(resultsCountSpan) resultsCountSpan.textContent = 0;
            disableMobileActionButtons();
            showError("Couldn't parse valid variations from the response.");
        }
    }

    // --- displayVariation (Keep As Is) ---
    function displayVariation(index) {
        if (!generatedVariations || index < 0 || index >= generatedVariations.length) return;
        const variation = generatedVariations[index];
        if (!resultsCarousel || !currentResultIndicator) return; // Guard

        resultsCarousel.innerHTML = '';
        const variationDiv = document.createElement('div');
        variationDiv.classList.add('ad-variation', 'active');
        variationDiv.dataset.index = index;

        const createElementHTML = (label, text, type, charLimit = null) => { /* ... keep exact logic ... */ };

        let headlinesHTML = '';
        if (variation.headlines && variation.headlines.length > 0) {
            headlinesHTML = `<div class="ad-element-group"><h4>Headlines <span class="char-count">(${variation.headlines.length} options)</span></h4>`;
            headlinesHTML += variation.headlines.map((h, i) => {
                const count = h.length;
                const headlineLimit = platformSelect?.value.includes('Google') ? 30 : (platformSelect?.value.includes('Facebook') ? 40 : null);
                const limitClass = headlineLimit && count > headlineLimit ? 'over-limit' : '';
                const limitText = headlineLimit ? `(${count}/${headlineLimit})` : `(${count} chars)`;
                const headlineId = `var-${variation.id}-headline-${i}`;
                return `<div class="ad-element headline-item">
                            <div id="${headlineId}" class="element-text">${escapeHtml(h)}</div>
                            <span class="char-count ${limitClass}">${limitText}</span>
                            <button class="copy-btn" data-clipboard-target="#${headlineId}" title="Copy Headline ${i + 1}"><i class="far fa-copy"></i></button>
                        </div>`;
            }).join('');
            headlinesHTML += `</div>`;
        }
        // Use the actual platform/format check used during parsing
        const expectDisplayUrl = platformSelect?.value.includes('Google') || platformSelect?.value.includes('Display') || formatSelect?.value.includes('Search');

        variationDiv.innerHTML = `
            <h3>Variation ${variation.id}
                <button class="btn btn-secondary btn-small copy-full-ad-btn" data-variation-id="${variation.id}" title="Copy Full Variation ${variation.id}">
                    <i class="fas fa-copy"></i> Copy Ad
                </button>
            </h3>
            ${headlinesHTML}
            ${createElementHTML('Description', variation.description, 'desc', platformSelect?.value.includes('Google') ? 90 : null)}
            ${createElementHTML('Call to Action', variation.cta, 'cta')}
            ${expectDisplayUrl ? createElementHTML('Display URL', variation.displayUrl, 'url') : ''}
        `; // Make sure helper uses escapeHtml for text display if needed

        resultsCarousel.appendChild(variationDiv);
        currentResultIndicator.textContent = `Variation ${variation.id}`;
        updateNavigationButtons();
        renderAdPreview(variation);
        updateOptimizationMetrics(variation);
    }

    // --- showNextVariation (Keep As Is) ---
    function showNextVariation() { /* ... keep logic ... */ }
    // --- showPreviousVariation (Keep As Is) ---
    function showPreviousVariation() { /* ... keep logic ... */ }
    // --- updateNavigationButtons (Keep As Is) ---
    function updateNavigationButtons() { /* ... keep logic ... */ }
    // --- handleCopyClick (Keep As Is) ---
    function handleCopyClick(event) { /* ... keep logic ... */ }
    // --- copyAllVariations (Keep As Is) ---
    function copyAllVariations() { /* ... keep logic ... */ }

    // --- Preview Functions (Keep All: showPreview, renderAdPreview, specific renderers, generic renderer) ---
    function showPreview(type) { /* ... keep logic ... */ }
    function renderAdPreview(variation) { /* ... keep logic ... */ }
    function renderGoogleSearchPreview(variation) { /* ... keep logic ... */ }
    function renderFacebookPostPreview(variation) { /* ... keep logic ... */ }
    function renderLinkedInPreview(variation) { /* ... keep logic ... */ }
    function renderGenericPreview(variation) { /* ... keep logic ... */ }

    // --- updateOptimizationMetrics (Keep As Is) ---
    function updateOptimizationMetrics(variation) { /* ... keep logic ... */ }

    // --- exportToCSV (Keep As Is) ---
    function exportToCSV() { /* ... keep logic ... */ }

    // --- Mobile UI Helpers (Keep All) ---
    function disableMobileActionButtons() { /* ... keep logic ... */ }
    function enableMobileActionButtons() { /* ... keep logic ... */ }

    // --- Utility Functions ---
    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe
             .replace(/&/g, "&")
             .replace(/</g, "<")
             .replace(/>/g, ">")
             .replace(/"/g, "")
             .replace(/'/g, "'");
     }

    function showError(message) {
        if (errorDisplayArea) {
            errorDisplayArea.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${escapeHtml(message)}`;
            errorDisplayArea.style.display = 'block';
            // Optional: Scroll error into view
            // errorDisplayArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            console.error("Error display area not found. Message:", message);
            alert(message); // Fallback
        }
    }
     function showWarning(message) {
         // Display non-critical warnings (e.g., incomplete)
         if (errorDisplayArea) { // Reuse error area or create a dedicated warning area
             const warningDiv = document.createElement('div');
             warningDiv.className = 'warning-message'; // Style this differently
             warningDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${escapeHtml(message)}`;
             errorDisplayArea.parentNode.insertBefore(warningDiv, errorDisplayArea.nextSibling);
             warningDiv.style.display = 'block';
         } else {
             console.warn("Warning:", message);
         }
     }

    function clearErrorMessages() {
        if (errorDisplayArea) {
            errorDisplayArea.textContent = '';
            errorDisplayArea.style.display = 'none';
        }
        // Remove any previous warning messages
        document.querySelectorAll('.warning-message').forEach(el => el.remove());
    }

    // --- Initial Setup ---
    showPreview('mobile'); // Default preview

    // --- Optional Scroll Behaviour (Keep As Is) ---
    let lastScrollTop = 0;
     window.addEventListener("scroll", function() { /* ... keep logic ... */ }, false);

}); // End DOMContentLoaded