// public/js/seo_script.js (or appropriate filename - SECURED)

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const form = document.getElementById('seo-generator-form');
    const generateBtn = document.getElementById('generate-btn');
    const resultsOutput = document.getElementById('results-output');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const refineOptions = document.getElementById('refine-options');
    const refineBtn = document.getElementById('refine-btn');
    const addKeywordBtn = document.getElementById('add-keyword-btn');
    const secondaryKeywordsContainer = document.getElementById('secondary-keywords-container');
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const tipsList = document.getElementById('contextual-tips');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mainNav = document.querySelector('.main-nav');
    const currentYearSpan = document.getElementById('current-year');

    // --- State & Config ---
    const MAX_HISTORY_ITEMS = 10;
    let keywordInputCount = 1; // For unique IDs
    let currentResults = []; // Stores the last generated array of {title, description} objects
    let generationHistory = JSON.parse(localStorage.getItem('gemContentSeoHistory') || '[]');
    let isGenerating = false; // Prevent multiple concurrent requests

    // --- Backend Configuration ---
    const BACKEND_API_ENDPOINT = '/api/generate-seo-meta'; // Secure backend endpoint

    // --- Tips ---
    const seoTips = [
        "Include your main keyword naturally, preferably near the beginning.",
        "Highlight unique selling points (USPs) or benefits.",
        "Use numbers (e.g., 'Top 10', 'Save 20%') to increase CTR.",
        "Keep titles around 55-60 characters to avoid truncation.",
        "Meta descriptions (around 150-160 chars) should be compelling summaries.",
        "Add a clear call-to-action (CTA) in the description if appropriate.",
        "Match search intent: Is the user looking to learn, buy, or compare?",
        "Ensure your title and description accurately reflect the page content.",
        "Use power words like 'Ultimate', 'Proven', 'Exclusive', 'Fast'.",
        "Check how competitors are writing their titles and descriptions."
    ];

    // --- Initial Setup ---
    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    if (refineOptions) refineOptions.style.display = 'none'; // Hide refine initially
    if (resultsOutput) resultsOutput.innerHTML = ''; // Clear results area initially
    loadHistory();
    updateClearHistoryButtonVisibility();
    updateContextualTips(); // Show initial tips

    // --- Event Listeners ---
    if (form) form.addEventListener('submit', handleGenerate);
    if (addKeywordBtn) addKeywordBtn.addEventListener('click', addKeywordInput);
    if (refineBtn) refineBtn.addEventListener('click', handleRefine);
    if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', clearHistory);

    // Event delegation for dynamic buttons (copy, save, history items)
    document.body.addEventListener('click', (event) => {
        const copyButton = event.target.closest('.gem-button-copy');
        const saveButton = event.target.closest('.gem-button-save');
        const historyItem = event.target.closest('.history-item');

        if (copyButton) {
            handleCopy(copyButton);
        } else if (saveButton) {
            handleSave(saveButton);
        } else if (historyItem) {
            handleLoadHistoryItem(historyItem);
        }
    });

    // Mobile Menu Toggle
    if (mobileMenuToggle && mainNav) {
        mobileMenuToggle.addEventListener('click', () => {
            mainNav.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
        });
    }

    // --- Core Functions ---

    async function handleGenerate(event) {
        event.preventDefault();
        if (isGenerating) return; // Prevent double clicks

        showLoading(true);
        clearResultsAndErrors();
        if (refineOptions) refineOptions.style.display = 'none'; // Hide refine options during generation

        const formData = getFormData();

        // Basic frontend validation
        if (!formData.mainKeyword) {
             showError("Please enter a Main Keyword.");
             showLoading(false);
             return;
        }
        if (!formData.pageDescription) {
            showError("Please enter a Page Description or Topic.");
            showLoading(false);
            return;
        }

        const prompt = createGeminiPrompt(formData);

        try {
            // *** Call the secure backend endpoint ***
            const backendResponse = await callBackendAPI(prompt);

            // Check for backend errors first
            if (backendResponse.error) {
                throw new Error(backendResponse.error);
            }

            // Check for incompleteness or other warnings
             if (backendResponse.isIncomplete) {
                 const warnMsg = backendResponse.warning || "The AI response may have been cut short due to length limits. Results might be incomplete.";
                 showWarning(warnMsg);
                 console.warn("Backend indicated the response was potentially incomplete.");
             } else if (backendResponse.warning) {
                  showWarning(backendResponse.warning);
             }

            // Check if the data is an array and has results
            if (Array.isArray(backendResponse.data) && backendResponse.data.length > 0) {
                currentResults = backendResponse.data; // Store the PARSED array from backend
                displayResults(currentResults, formData);
                saveToHistory(formData); // Save inputs, not results, to history
                updateContextualTips();
                if (refineOptions) refineOptions.style.display = 'block'; // Show refine button
            } else {
                // Handle cases where backend returned success but data is empty/invalid
                 console.warn("Received success but data is missing/invalid:", backendResponse);
                 if (!backendResponse.warning && !backendResponse.isIncomplete) {
                     showError('No results were generated. Try adjusting your inputs.');
                 }
            }
        } catch (error) {
            console.error("Generation Error:", error);
            showError(error.message || 'An error occurred while generating. Please check console or try again.');
        } finally {
            showLoading(false);
        }
    }

    function handleRefine(event) {
        event.preventDefault(); // Prevent default if it's ever a button in a form
        // Trigger a new generation using the current values in the form fields
        handleGenerate(new Event('submit')); // Simulate form submission event
    }

    function getFormData() {
        const data = {};
        if (!form) return data;
        const formData = new FormData(form);
        data.targetUrl = formData.get('target-url')?.trim() || '';
        data.mainKeyword = formData.get('main-keyword')?.trim() || '';
        data.secondaryKeywords = formData.getAll('secondary-keywords[]').map(kw => kw.trim()).filter(kw => kw !== '');
        data.pageDescription = formData.get('page-description')?.trim() || '';
        data.titleCharCount = formData.get('title-char-count') || '60'; // Default if missing
        data.descCharCount = formData.get('desc-char-count') || '155'; // Default if missing
        data.industry = formData.get('industry-niche') || '';
        return data;
    }

    function createGeminiPrompt(data) {
        // This prompt asks the AI (via backend) for the specific JSON array structure
        let prompt = `Generate 5 unique and compelling SEO-optimized title and meta description pairs for a web page based on the following information:\n\nPage Context:\n- Main Keyword: "${data.mainKeyword}"`;
        if (data.secondaryKeywords.length > 0) {
            prompt += `\n- Secondary Keywords: ${data.secondaryKeywords.join(', ')}`;
        }
        prompt += `\n- Page Description/Topic: "${data.pageDescription}"`; // Use clearer label
        if (data.targetUrl) {
            prompt += `\n- Target URL (for context): ${data.targetUrl}`; // Clarify purpose
        }
        if (data.industry) {
            prompt += `\n- Industry/Niche: ${data.industry}`;
        }
        prompt += `\n\nConstraints & Style:\n- Title Target Length: Around ${data.titleCharCount} characters. Should be engaging and include the main keyword naturally. Avoid excessive capitalization.\n- Meta Description Target Length: Around ${data.descCharCount} characters. Should be a concise, persuasive summary of the page content, encouraging clicks. Include the main keyword or related terms naturally. Might include a subtle call-to-action.\n- Tone: Professional yet engaging and click-worthy (unless industry suggests otherwise).\n\nOutput Format:\nProvide the results strictly as a valid JSON array of objects. Each object must have ONLY two keys: "title" (string) and "description" (string). Do not include any text before the opening bracket '[' or after the closing bracket ']'. Do not use markdown formatting. Example: [{"title": "Example Title", "description": "Example description."},{"title": "Another Title", "description": "Another description."}]`;
        return prompt;
    }

    async function callBackendAPI(prompt) {
        console.log(`--- Sending Prompt to Backend Endpoint: ${BACKEND_API_ENDPOINT} ---`);
        try {
            const response = await fetch(BACKEND_API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ prompt: prompt }) // Send prompt expected by server
            });

            let responseData;
            try {
                responseData = await response.json();
            } catch (e) {
                 const textError = await response.text();
                 console.error(`Backend response not JSON. Status: ${response.status}. Body: ${textError.substring(0, 500)}...`);
                 return { error: `Server returned status ${response.status}, response not JSON.` };
            }

            // Check for backend application errors first
            if (!response.ok || responseData.error) {
                const errorMessage = responseData?.error || `Request failed with status ${response.status}`;
                console.error("Backend API Error Response:", responseData);
                return { error: errorMessage };
            }

            // Return the successful data structure from the backend
            // Expecting { data: [ {title, description}, ... ], warning: ..., isIncomplete: ... }
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
        if (!loadingIndicator || !generateBtn) return;
        if (isLoading) {
            loadingIndicator.style.display = 'flex';
            generateBtn.disabled = true;
            generateBtn.textContent = 'Generating...';
            if(refineBtn) refineBtn.disabled = true; // Disable refine during generation
        } else {
            loadingIndicator.style.display = 'none';
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate Titles & Descriptions';
             if(refineBtn) refineBtn.disabled = false;
        }
    }

    function clearResultsAndErrors() {
        if (resultsOutput) resultsOutput.innerHTML = '';
        if (errorMessage) errorMessage.style.display = 'none';
        // Clear dynamic warning messages
        document.querySelectorAll('.warning-message').forEach(el => el.remove());
        currentResults = []; // Clear stored results
    }

    function showError(message) {
        if (!errorMessage || !resultsOutput) return;
        // Clear previous warnings
        document.querySelectorAll('.warning-message').forEach(el => el.remove());
        errorMessage.querySelector('p').textContent = message;
        errorMessage.style.display = 'block';
        resultsOutput.innerHTML = ''; // Clear any partial results
    }

    function showWarning(message) {
         if (errorMessage) { // Display warning near the error area or results area
              // Clear previous warnings
             document.querySelectorAll('.warning-message').forEach(el => el.remove());

             const warningDiv = document.createElement('div');
             warningDiv.className = 'warning-message form-message';
             // ... (styling as before) ...
             warningDiv.style.backgroundColor = '#fff9e6'; warningDiv.style.borderColor = '#ffecb3'; warningDiv.style.color = '#8a6d3b';
             warningDiv.style.marginTop = '10px'; warningDiv.style.padding = '10px 15px'; warningDiv.style.borderRadius = '4px'; warningDiv.style.display = 'flex';
             warningDiv.innerHTML = `<i class="fas fa-exclamation-triangle" style="margin-right: 10px; margin-top: 2px;"></i> <span>${escapeHtml(message)}</span>`;

             // Insert below the form, before results or error
             form.parentNode.insertBefore(warningDiv, resultsOutput || errorMessage);

         } else { console.warn("Warning:", message); }
     }

    function displayResults(results, formData) {
        if (!resultsOutput) return;
        resultsOutput.innerHTML = '<h3>Generated Options</h3>'; // Reset with heading

        results.forEach((result, index) => {
            // Ensure result object and its properties exist
            const title = typeof result.title === 'string' ? result.title : 'No Title Generated';
            const description = typeof result.description === 'string' ? result.description : 'No Description Generated';
            const titleLength = title.length;
            const descLength = description.length;
            const targetTitle = parseInt(formData.titleCharCount, 10) || 60;
            const targetDesc = parseInt(formData.descCharCount, 10) || 155;

            const resultElement = document.createElement('div');
            resultElement.classList.add('result-item', 'card'); // Added card class for potential styling

            // Generate preview URL safely
            let previewUrlDisplay = 'example.com'; // Default
            let fullUrlForPreview = `https://example.com/${formData.mainKeyword.replace(/\s+/g, '-') || 'page'}`;
             try {
                 if (formData.targetUrl && formData.targetUrl.startsWith('http')) {
                    const urlObj = new URL(formData.targetUrl);
                    fullUrlForPreview = urlObj.href; // Use the full valid URL
                    previewUrlDisplay = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname.length > 1 ? urlObj.pathname : ''}`;
                 }
             } catch (e) { console.warn("Invalid target URL for preview:", formData.targetUrl); }
             previewUrlDisplay = previewUrlDisplay.length > 60 ? previewUrlDisplay.substring(0, 57) + '...' : previewUrlDisplay;

            resultElement.innerHTML = `
                <div class="result-header">
                    <h4>Option ${index + 1}</h4>
                    <div class="result-actions">
                        <button class="gem-button gem-button-copy btn-icon" data-type="title" title="Copy Title"><i class="fas fa-copy"></i></button>
                        <button class="gem-button gem-button-copy btn-icon" data-type="description" title="Copy Description"><i class="fas fa-paragraph"></i></button> <!-- Different icon -->
                        <button class="gem-button gem-button-save btn-icon" title="Save to Account (Requires Login)"><i class="fas fa-save"></i></button>
                    </div>
                </div>
                <div class="result-content">
                    <p><strong>Title:</strong> ${escapeHtml(title)} <span class="char-counter ${getCharCountClass(titleLength, targetTitle)}">(${titleLength})</span></p>
                    <p><strong>Description:</strong> ${escapeHtml(description)} <span class="char-counter ${getCharCountClass(descLength, targetDesc)}">(${descLength})</span></p>
                </div>
                <details class="serp-preview-container">
                    <summary>SERP Preview</summary>
                    <div class="serp-preview" title="Simulated Search Result Preview">
                        <div class="serp-preview-title">${escapeHtml(title)}</div>
                        <div class="serp-preview-url">${escapeHtml(previewUrlDisplay)}</div>
                        <div class="serp-preview-desc">${escapeHtml(description)}</div>
                    </div>
                </details>
                <textarea style="position: absolute; left: -9999px; top: -9999px;" aria-hidden="true" class="copy-helper-title">${escapeHtml(title)}</textarea>
                <textarea style="position: absolute; left: -9999px; top: -9999px;" aria-hidden="true" class="copy-helper-description">${escapeHtml(description)}</textarea>
            `;
            resultsOutput.appendChild(resultElement);
        });
    }

    function getCharCountClass(currentLength, targetLength) {
        const upperTolerance = 5; // How many chars OVER is still ok/optimal?
        const lowerToleranceOptimal = 5; // How many chars UNDER is still optimal?
        // const lowerToleranceAcceptable = 15; // How many chars under is just 'acceptable'

        if (currentLength > targetLength + upperTolerance) {
            return 'too-long'; // Definitely too long
        } else if (currentLength >= targetLength - lowerToleranceOptimal && currentLength <= targetLength + upperTolerance) {
             return 'optimal'; // Good range
        }
        // Optional: Add a 'too-short' class if desired
        // else if (currentLength < targetLength - lowerToleranceAcceptable) {
        //     return 'too-short';
        // }
        return ''; // Within acceptable range but maybe not perfectly optimal
    }

    function updateContextualTips() {
        if (!tipsList) return;
        // Show 3 random, unique tips
        const shuffledTips = seoTips.sort(() => 0.5 - Math.random());
        const selectedTips = shuffledTips.slice(0, 3);
        tipsList.innerHTML = selectedTips.map(tip => `<li>${escapeHtml(tip)}</li>`).join('');
    }

    // --- Interactivity Functions ---

    function addKeywordInput() {
        if (!secondaryKeywordsContainer || !addKeywordBtn) return;
        keywordInputCount++;
        const wrapper = document.createElement('div');
        wrapper.classList.add('keyword-input-wrapper'); // Use this class for styling/removal
        const newKeywordInput = document.createElement('input');
        newKeywordInput.type = 'text';
        newKeywordInput.id = `secondary-keyword-${keywordInputCount}`; // Unique ID
        newKeywordInput.name = 'secondary-keywords[]';
        newKeywordInput.classList.add('gem-input');
        newKeywordInput.placeholder = `Another relevant keyword...`;
        newKeywordInput.setAttribute('aria-label', `Secondary Keyword ${keywordInputCount}`);
        wrapper.appendChild(newKeywordInput);
        // Add a remove button for dynamic inputs
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = '✕'; // Or use an icon
        removeBtn.classList.add('remove-keyword-btn');
        removeBtn.title = 'Remove keyword input';
        removeBtn.setAttribute('aria-label', 'Remove keyword input');
        removeBtn.onclick = () => wrapper.remove(); // Simple remove action
        wrapper.appendChild(removeBtn);

        secondaryKeywordsContainer.insertBefore(wrapper, addKeywordBtn);
        newKeywordInput.focus(); // Focus the new input
    }

    function handleCopy(button) {
        const resultItem = button.closest('.result-item');
        if (!resultItem) return;
        const type = button.getAttribute('data-type'); // 'title' or 'description'
        const textElement = resultItem.querySelector(`.copy-helper-${type}`);

        if (textElement && textElement.value && navigator.clipboard) {
            navigator.clipboard.writeText(textElement.value).then(() => {
                const originalHtml = button.innerHTML; // Store icon HTML
                button.innerHTML = '<i class="fas fa-check"></i>'; // Check icon
                button.classList.add('copied');
                button.disabled = true;
                setTimeout(() => {
                    button.innerHTML = originalHtml;
                    button.classList.remove('copied');
                    button.disabled = false;
                }, 1500);
            }).catch(err => {
                console.error('Failed to copy:', err);
                alert('Failed to copy text.');
            });
        } else if (!navigator.clipboard) {
            alert('Clipboard API not available or denied.');
        } else {
            console.error('Copy source element not found for type:', type);
        }
    }

    function handleSave(button) {
        const isLoggedIn = false; // ** Replace with your actual login check **
        if (!isLoggedIn) {
            alert('Please log in or sign up to save results.');
            // Optional: Redirect to login page or show login modal
            return;
        }

        const resultItem = button.closest('.result-item');
        if (!resultItem) return;
        const title = resultItem.querySelector('.copy-helper-title')?.value || '';
        const description = resultItem.querySelector('.copy-helper-description')?.value || '';

        if (!title && !description) {
            alert("Nothing to save for this option.");
            return;
        }

        console.log("Simulating save:", { title, description });
        // ** Add your actual backend API call here to save the data **
        // Example: saveToAccount({ title, description }).then(() => { ... });
        const originalHtml = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i>';
        button.disabled = true;
        // Simulate success feedback
        setTimeout(() => {
            button.innerHTML = originalHtml;
            button.disabled = false;
            alert('Result saved to your account! (Simulated)');
        }, 1000);
    }

    // --- History Functions ---

    function saveToHistory(formData) {
        const historyEntry = {
            timestamp: new Date().toISOString(),
            // Store only the necessary inputs to reload the form state
            inputs: {
                targetUrl: formData.targetUrl,
                mainKeyword: formData.mainKeyword,
                secondaryKeywords: formData.secondaryKeywords,
                pageDescription: formData.pageDescription,
                titleCharCount: formData.titleCharCount,
                descCharCount: formData.descCharCount,
                industry: formData.industry
            }
        };

        generationHistory.unshift(historyEntry);
        if (generationHistory.length > MAX_HISTORY_ITEMS) {
            generationHistory = generationHistory.slice(0, MAX_HISTORY_ITEMS);
        }
        localStorage.setItem('gemContentSeoHistory', JSON.stringify(generationHistory));
        loadHistory();
        updateClearHistoryButtonVisibility();
    }

    function loadHistory() {
        if (!historyList) return;
        generationHistory = JSON.parse(localStorage.getItem('gemContentSeoHistory') || '[]'); // Ensure up-to-date
        if (generationHistory.length === 0) {
            historyList.innerHTML = '<li class="no-history">No recent generations found.</li>';
            return;
        }
        historyList.innerHTML = generationHistory.map((item, index) => {
            const date = new Date(item.timestamp);
            const displayKeyword = item.inputs?.mainKeyword || 'Untitled Generation';
            const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            return `
                <li class="history-item" data-index="${index}" role="button" tabindex="0" title="Reload inputs for: ${escapeHtml(displayKeyword)}">
                    <span class="history-keyword">${escapeHtml(displayKeyword)}</span>
                    <span class="history-date">${formattedDate}</span>
                </li>
            `;
        }).join('');
    }

     function handleLoadHistoryItem(historyItemElement) {
        if (!form) return;
        const index = parseInt(historyItemElement.getAttribute('data-index'), 10);
        if (isNaN(index) || index < 0 || index >= generationHistory.length) return;

        const historyEntry = generationHistory[index];
        const inputs = historyEntry.inputs;
        if (!inputs) { console.warn("History item missing input data:", index); return; }

        // Populate form fields safely using optional chaining
        form.elements['target-url'].value = inputs.targetUrl || '';
        form.elements['main-keyword'].value = inputs.mainKeyword || '';
        form.elements['page-description'].value = inputs.pageDescription || '';
        form.elements['title-char-count'].value = inputs.titleCharCount || '60';
        form.elements['desc-char-count'].value = inputs.descCharCount || '155';
        form.elements['industry-niche'].value = inputs.industry || '';

        // Clear existing dynamic keyword inputs before adding saved ones
        secondaryKeywordsContainer?.querySelectorAll('.keyword-input-wrapper').forEach((wrapper, i) => {
             if (i > 0) wrapper.remove(); // Remove all except the first one
        });
        keywordInputCount = 1; // Reset counter for unique IDs

        const firstKeywordInput = document.getElementById('secondary-keyword-1');
        if (firstKeywordInput) {
             firstKeywordInput.value = inputs.secondaryKeywords?.[0] || ''; // Set first or clear it
        }

        // Add inputs for remaining saved keywords
        if (inputs.secondaryKeywords && inputs.secondaryKeywords.length > 1) {
            for (let i = 1; i < inputs.secondaryKeywords.length; i++) {
                addKeywordInput(); // Adds a new input structure with unique ID
                const newInput = document.getElementById(`secondary-keyword-${keywordInputCount}`);
                if (newInput) {
                    newInput.value = inputs.secondaryKeywords[i];
                }
            }
        }

        // Optional: Indicate loading success, scroll, clear results?
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        clearResultsAndErrors(); // Clear old results when loading history
        if(refineOptions) refineOptions.style.display = 'none'; // Hide refine options
        // Optionally trigger generation: handleGenerate(new Event('submit'));
     }

    function clearHistory() {
        if (confirm('Are you sure you want to clear your generation history? This cannot be undone.')) {
            generationHistory = [];
            localStorage.removeItem('gemContentSeoHistory');
            loadHistory();
            updateClearHistoryButtonVisibility();
        }
    }

    function updateClearHistoryButtonVisibility() {
         if (clearHistoryBtn) {
            clearHistoryBtn.style.display = generationHistory.length > 0 ? 'inline-block' : 'none';
         }
     }

     // Helper function to escape HTML
     function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, "").replace(/'/g, "'");
    }

}); // End DOMContentLoaded