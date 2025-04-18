// public/js/blog_post_script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements (Keep all your existing selectors) ---
    const form = document.getElementById('generator-form');
    const topicInput = document.getElementById('blog-topic');
    const keywordsInput = document.getElementById('keywords');
    const lengthSelect = document.getElementById('content-length');
    const toneSelect = document.getElementById('tone');
    const audienceInput = document.getElementById('target-audience');
    const briefTextarea = document.getElementById('brief');
    const fileInput = document.getElementById('reference-file'); // Keep if used
    const generateBtn = document.getElementById('generate-btn');
    const generateBtnText = generateBtn?.querySelector('.btn-text'); // Use optional chaining
    const generateBtnSpinner = generateBtn?.querySelector('.spinner');
    const usageCounter = document.getElementById('usage-counter');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message'); // Main error display
    const errorDetails = document.getElementById('error-details'); // Optional details span
    const resultsSection = document.getElementById('results-section');
    const generatedContentDiv = document.getElementById('generated-content');
    const copyBtn = document.getElementById('copy-btn');
    const exportTxtBtn = document.getElementById('export-txt-btn');
    const exportMdBtn = document.getElementById('export-md-btn');
    const exportHtmlBtn = document.getElementById('export-html-btn');
    const saveBtn = document.getElementById('save-btn');
    const keywordCountSpan = document.getElementById('keyword-count');
    const readabilityScoreSpan = document.getElementById('readability-score');
    const seoScoreSpan = document.getElementById('seo-score');
    const wordCountSpan = document.getElementById('word-count');
    const readingTimeSpan = document.getElementById('reading-time');
    const sampleLinks = document.querySelectorAll('.sample-link');
    const currentYearSpan = document.getElementById('current-year');
    const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
    const mobileNav = document.querySelector('.mobile-nav');
    const exportBtn = document.getElementById('export-btn');
    const exportOptions = document.querySelector('.export-options');

    // --- Backend Configuration ---
    // *** Define the unique backend endpoint for this tool ***
    const BACKEND_API_ENDPOINT = '/api/generate-blogpost';

    // --- Initial Setup ---
    if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    if (exportOptions) exportOptions.style.display = 'none'; // Hide initially

    // --- Functions ---

    function showLoading() {
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.classList.add('loading');
        }
        // Use optional chaining for elements that might not exist on all pages
        generateBtnSpinner?.style.setProperty('display', 'inline-block', 'important'); // Force display
        generateBtnText?.style.setProperty('opacity', '0');
        if (loadingIndicator) loadingIndicator.style.display = 'block';
        if (errorMessage) errorMessage.style.display = 'none'; // Hide errors
        if (resultsSection) resultsSection.style.display = 'none';
        loadingIndicator?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function hideLoading() {
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.classList.remove('loading');
        }
        generateBtnSpinner?.style.setProperty('display', 'none');
        generateBtnText?.style.setProperty('opacity', '1');
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }

    function showError(message, details = '') {
        hideLoading();
        if (errorMessage) {
            errorMessage.style.display = 'flex'; // Use flex if your CSS relies on it
            const msgSpan = errorMessage.querySelector('span');
            if (msgSpan) msgSpan.textContent = message;
            // Only display details if the element exists and details are provided
            if (errorDetails) {
                errorDetails.textContent = details;
                errorDetails.style.display = details ? 'block' : 'none'; // Show/hide details
            }
            errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            console.error("Error display element not found!");
            alert(`Error: ${message}\nDetails: ${details}`);
        }
        if (resultsSection) resultsSection.style.display = 'none';
    }

    function showWarning(message) {
        // Similar to showError but for non-critical warnings
        if (errorMessage) { // Reuse error area or add a dedicated warning div
            const warningDiv = document.createElement('div');
            // Add a distinct class for styling
            warningDiv.className = 'warning-message form-message'; // Use existing CSS?
            warningDiv.style.display = 'flex';
            warningDiv.style.backgroundColor = '#fff9e6'; // Example warning color
            warningDiv.style.borderColor = '#ffecb3';
            warningDiv.style.color = '#8a6d3b';
            warningDiv.innerHTML = `<i class="fas fa-exclamation-triangle" style="margin-right: 10px;"></i> <span>${escapeHtml(message)}</span>`;
            // Insert *before* the main error message div
            errorMessage.parentNode.insertBefore(warningDiv, errorMessage);
        } else {
            console.warn("Warning:", message);
        }
    }

    function clearPreviousMessages() {
        if (errorMessage) errorMessage.style.display = 'none';
        // Remove any dynamically added warning messages
        document.querySelectorAll('.warning-message').forEach(el => el.remove());
    }


    function showResults(generatedHtml, inputData) {
        clearPreviousMessages(); // Clear errors/warnings before showing results
        if (resultsSection) {
            resultsSection.style.display = 'block';
            if (generatedContentDiv) {
                generatedContentDiv.innerHTML = generatedHtml;
                updateMetrics(generatedHtml, inputData.keywords || '');
            } else {
                console.error("Generated content display element not found!");
            }
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            console.error("Results section element not found!");
        }
    }

    /**
     * Constructs the prompt for the Gemini API (remains the same)
     */
    function constructPrompt(data) {
        // (Keep this function exactly as you provided it)
        let prompt = `Generate a comprehensive, SEO-optimized blog post about "${data.topic}".

        **Target Keywords:** ${data.keywords || 'None specified'} (Incorporate these naturally throughout the post, especially in headings and key paragraphs).
        **Desired Length:** ${data.length}.
        **Tone of Voice:** ${data.tone}.
        **Target Audience:** ${data.audience || 'a general audience'}.
        **Structure Requirements:**
        - Start with an engaging introduction.
        - Use clear H2 and H3 headings for sections and sub-sections. Incorporate keywords into headings where appropriate.
        - Break down complex topics into easy-to-understand paragraphs.
        - Include bullet points or numbered lists for clarity where suitable.
        - End with a strong conclusion summarizing key points and potentially including a call-to-action.
        - Ensure natural keyword integration, avoiding keyword stuffing.
        **Additional Instructions:** ${data.brief || 'None.'}
        **Output Format:** Please provide the response as well-formatted HTML content. Use appropriate <p>, <h2>, <h3>, <ul>, <ol>, <li>, <strong>, <em> tags where semantically correct. Do not include <html>, <head>, or <body> tags, just the core blog post content itself, ready to be inserted into a container div. Ensure proper paragraph breaks.
        `;
        return prompt;
    }

    /**
     * Calls your backend proxy using fetch.
     * @param {string} prompt - The prompt to send to the backend.
     * @returns {Promise<object>} - A promise that resolves with the backend response object (e.g., { generatedHtml: '...' }).
     * @throws {Error} - Throws an error if the fetch fails or backend returns an error status.
     */
    async function callBackendAPI(prompt) {
        console.log(`--- Sending Prompt to Backend Endpoint: ${BACKEND_API_ENDPOINT} ---`);
        try {
            const response = await fetch(BACKEND_API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: prompt }) // Send prompt in expected format
            });

            // Try parsing JSON regardless of status for error messages
            let responseData;
            try {
                responseData = await response.json();
            } catch (e) {
                 const textError = await response.text(); // Read as text if JSON fails
                 console.error(`Backend response not JSON. Status: ${response.status}. Body: ${textError.substring(0, 500)}...`);
                 throw new Error(`Server returned status ${response.status}, response not JSON.`);
            }

            if (!response.ok) {
                // Use error message from backend JSON if available
                const errorMessage = responseData?.error || `Request failed with status ${response.status}`;
                console.error("Backend API Error Response:", responseData);
                throw new Error(errorMessage);
            }

            // Return the parsed JSON data on success
            return responseData; // Expecting { generatedHtml: '...', isIncomplete: ..., warning: ... }

        } catch (error) {
            console.error('Error calling backend API:', error);
            if (error.message.includes('Failed to fetch')) {
                throw new Error(`Network error: Could not connect to the backend at ${BACKEND_API_ENDPOINT}. Is the server running?`);
            }
            throw error; // Re-throw other errors
        }
    }

    /**
     * Calculates basic metrics and updates the display (Keep as is)
     */
    function updateMetrics(htmlContent, keywordsString) { /* ... keep logic ... */ }

    /**
     * Copies text to the clipboard (Keep as is)
     */
    function copyToClipboard(text, buttonElement) { /* ... keep logic ... */ }

    /**
     * Basic HTML to Markdown conversion (Keep as is)
     */
    function htmlToMarkdown(html) { /* ... keep logic ... */ }

    /**
     * Triggers a file download (Keep as is)
     */
    function downloadFile(filename, content, mimeType) { /* ... keep logic ... */ }

    /**
    * Utility to escape HTML chars
    */
    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe
             .replace(/&/g, "&")
             .replace(/</g, "<")
             .replace(/>/g, ">")
             .replace(/"/g, "")
             .replace(/'/g, "'");
     }

    // --- Event Listener Setup ---

    // Form Submission
    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            clearPreviousMessages(); // Clear old errors/warnings
            showLoading();

            // --- Gather Form Data ---
            const formData = {
                topic: topicInput?.value.trim() ?? '',
                keywords: keywordsInput?.value.trim() ?? '',
                length: lengthSelect?.value ?? 'medium',
                tone: toneSelect?.value ?? 'neutral',
                audience: audienceInput?.value.trim() ?? '',
                brief: briefTextarea?.value.trim() ?? '',
            };

            // --- Basic Validation ---
            if (!formData.topic) {
                hideLoading();
                showError('Please provide a Blog Topic / Title.');
                topicInput?.focus();
                return;
            }

            try {
                const prompt = constructPrompt(formData);
                // console.log("Constructed Prompt:", prompt);

                // --- Call Backend ---
                const backendResponse = await callBackendAPI(prompt);

                // --- Process Backend Response ---
                if (backendResponse.error) { // Check for explicit error key first
                     throw new Error(backendResponse.error); // Let the catch block handle it
                 } else if (backendResponse.generatedHtml) {
                     hideLoading();
                     showResults(backendResponse.generatedHtml, formData); // Display success
                     // Show warning if backend indicated incompleteness
                     if (backendResponse.isIncomplete || backendResponse.warning) {
                         showWarning(backendResponse.warning || "Output may be incomplete.");
                     }
                 } else {
                     // Handle unexpected success structure
                     throw new Error("Backend response missing expected 'generatedHtml'.");
                 }

            } catch (error) {
                console.error("Generation process failed:", error);
                hideLoading();
                // Use the detailed error message from the caught error
                showError('Failed to generate content.', error.message || 'An unknown error occurred.');
            }
        });
    } else {
        console.error("Generator form not found!");
    }

    // --- Other Event Listeners (Keep as is) ---
    if (copyBtn) copyBtn.addEventListener('click', () => { /* ... */ });

    const setupExportButton = (btn, generatorFn, defaultFilename, mimeType) => { /* ... keep logic ... */ };
    setupExportButton(exportTxtBtn, (div) => div.innerText || div.textContent || '', 'blog_post', 'text/plain');
    setupExportButton(exportMdBtn, (div) => htmlToMarkdown(div.innerHTML), 'blog_post', 'text/markdown');
    setupExportButton(exportHtmlBtn, (div) => { /*... keep logic ...*/ }, 'blog_post', 'text/html');

    if (exportBtn && exportOptions) { exportBtn.addEventListener('click', (e) => { /* ... */ }); }
    document.addEventListener('click', (e) => { /* Close dropdown logic */ });
    if (saveBtn) saveBtn.addEventListener('click', () => { /* Placeholder logic */ });
    if (sampleLinks) sampleLinks.forEach(link => { link.addEventListener('click', (e) => { /* ... */ }); });
    if (mobileNavToggle && mobileNav) { mobileNavToggle.addEventListener('click', () => { /* ... */ }); }

}); // End DOMContentLoaded