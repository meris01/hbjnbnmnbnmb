// public/js/social_post_script.js (or appropriate filename - SECURED)

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const form = document.getElementById('post-creator-form');
    const generateBtn = document.getElementById('generate-btn');
    const btnText = generateBtn?.querySelector('.btn-text'); // Use optional chaining
    const loadingSpinner = generateBtn?.querySelector('.loading-spinner');
    const resultsContainer = document.getElementById('post-variations');
    const resultsSection = document.getElementById('results');
    const errorMessage = document.getElementById('error-message');
    const platformSelect = document.getElementById('platform');
    // Mobile menu toggle (ensure ID exists in HTML or remove this)
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mainNav = document.querySelector('.main-nav');

    // --- Backend Configuration ---
    const BACKEND_API_ENDPOINT = '/api/generate-social-post'; // Secure backend endpoint

    // --- State ---
    let isGenerating = false;

    // --- Platform Character Limits ---
    const CHAR_LIMITS = {
        Instagram: 2200, Twitter: 280, LinkedIn: 3000,
        Facebook: 63206, TikTok: 2200,
    };

    // --- Initial Setup ---
    if (resultsSection) resultsSection.style.display = 'none'; // Hide initially
    if (errorMessage) errorMessage.style.display = 'none'; // Hide initially

    // --- Event Listeners ---
    if (form) form.addEventListener('submit', handleSubmit);

    // Event delegation for dynamic copy buttons
    if (resultsContainer) {
        resultsContainer.addEventListener('click', handleResultActions);
    }

    // Optional listener for platform changes (e.g., update UI hints)
    if (platformSelect) {
        platformSelect.addEventListener('change', handlePlatformChange);
    }

    // Mobile Menu (Basic example)
    if (mobileMenuToggle && mainNav) {
        mobileMenuToggle.addEventListener('click', () => {
            mainNav.classList.toggle('active'); // Needs corresponding CSS
             mobileMenuToggle.classList.toggle('active');
        });
    }

    // --- Core Functions ---

    async function handleSubmit(event) {
        event.preventDefault();
        if (isGenerating) return;

        clearResultsAndErrors();
        showLoading(true);

        // --- Form Data Retrieval ---
        const formData = getFormData();

        // --- Basic Frontend Validation ---
        if (!formData.platform || !formData.purpose || !formData.topic || !formData.voice) {
            showError("Please fill in all required fields (Platform, Purpose, Topic, Voice).");
            showLoading(false);
            return;
        }

        // --- Construct Prompt for Backend ---
        const prompt = buildGeminiPrompt(
            formData.platform, formData.purpose, formData.topic,
            formData.voice, formData.targetUrl, formData.hasImage, formData.instructions
        );
        // console.log("Prompt to send to backend:", prompt); // For debugging

        // --- Call Secure Backend API ---
        try {
            const backendResponse = await callBackendAPI(prompt);

            // Check for backend communication errors first
            if (backendResponse.error) {
                throw new Error(backendResponse.error);
            }

            // Handle backend warnings or incompleteness flags
            handleBackendWarnings(backendResponse);

            // Check if the actual data (parsed variations) exists
            if (Array.isArray(backendResponse.data) && backendResponse.data.length > 0) {
                renderResults(backendResponse.data, formData.platform);
            } else {
                // Handle cases where backend succeeded but returned empty/invalid data
                 console.warn("Received success but data is missing/invalid:", backendResponse);
                 if (!backendResponse.warning && !backendResponse.isIncomplete) {
                    // Only show generic error if no specific warning was already displayed
                     showError("No post variations were generated. Try refining your inputs.");
                 }
                 // If a warning was shown, don't override it with this generic error
            }
        } catch (error) {
            console.error("API Call or Processing Failed:", error);
            showError(`An error occurred: ${error.message}. Check console.`);
        } finally {
            showLoading(false);
        }
    }

    function getFormData() {
        const data = {};
        if (!form) return data;
        const formData = new FormData(form);
        data.platform = formData.get('platform');
        data.purpose = formData.get('purpose');
        data.topic = formData.get('topic')?.trim() || '';
        data.voice = formData.get('voice');
        data.targetUrl = formData.get('target-url')?.trim() || '';
        data.instructions = formData.get('instructions')?.trim() || '';
        const imageFile = formData.get('product-image'); // Check name attribute in HTML
        data.hasImage = imageFile && imageFile.size > 0;
        return data;
    }

    function buildGeminiPrompt(platform, purpose, topic, voice, targetUrl, hasImage, instructions) {
        // (Keep the prompt from the previous answer - it asks for the JSON structure)
        let prompt = `Generate 5 unique and engaging social media post variations for the ${platform} platform.\n\n**Goal:** ${purpose}\n**Key Topic/Product:** ${topic}\n**Brand Voice:** ${voice}\n`;
        if (targetUrl) { prompt += `**Target URL:** ${targetUrl}\n`; }
        if (hasImage) { prompt += `**Context:** An image related to the topic is available/uploaded.\n`; }
        if (instructions) { prompt += `**Special Instructions:** ${instructions}\n`; }
        prompt += `\nFor each variation, provide the following in a structured JSON format within a main "variations" array:\n1.  **main_copy**: The main post text, optimized for ${platform} (consider length, tone, formatting).\n2.  **hashtags**: An array of 3-5 relevant hashtags.\n3.  **cta_suggestion**: A clear call-to-action suggestion.\n4.  **visual_suggestion**: Brief suggestion for visual content.\n5.  **best_time_suggestion**: General best time to post on ${platform}.\n\n**Output Format Example (ensure valid JSON ONLY):**\n{"variations": [{"main_copy": "Example 1...","hashtags": ["#tag1"],"cta_suggestion": "CTA 1","visual_suggestion": "Visual 1","best_time_suggestion": "Time 1"}, {"main_copy": "Example 2...","hashtags": ["#tag2"],"cta_suggestion": "CTA 2","visual_suggestion": "Visual 2","best_time_suggestion": "Time 2"}]}`; // Condensed example
        return prompt;
    }

    async function callBackendAPI(prompt) {
        // (Keep the callBackendAPI function from the previous SEO tool answer)
        // It handles fetch, error checking, and returns { data: ..., warning: ..., isIncomplete: ... } or { error: ... }
        console.log(`--- Sending Prompt to Backend Endpoint: ${BACKEND_API_ENDPOINT} ---`);
        try {
            const response = await fetch(BACKEND_API_ENDPOINT, {
                method: 'POST', headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ prompt: prompt })
            });
            let responseData;
            try { responseData = await response.json(); }
            catch (e) {
                const textError = await response.text();
                console.error(`Backend response not JSON. Status: ${response.status}. Body: ${textError.substring(0, 500)}...`);
                return { error: `Server returned status ${response.status}, response not JSON.` };
            }
            if (!response.ok || responseData.error) {
                const errorMessage = responseData?.error || `Request failed with status ${response.status}`;
                console.error("Backend API Error Response:", responseData);
                return { error: errorMessage };
            }
            return responseData; // Expecting { data: Array<Variation>, warning: ..., isIncomplete: ... }
        } catch (error) {
            console.error('Error calling backend API:', error);
            let message = error.message.includes('Failed to fetch') ? `Network error: Could not connect to backend.` : (error.message || 'Unknown network error.');
            return { error: message };
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

    function renderResults(variations, platform) {
        if (!resultsContainer || !resultsSection) return;
        resultsContainer.innerHTML = ''; // Clear previous

        variations.forEach((variation, index) => {
            // Add checks for potentially missing variation data
            if (variation && typeof variation.main_copy === 'string') {
                 const card = createPostCard(variation, platform, index + 1);
                 resultsContainer.appendChild(card);
            } else {
                console.warn("Skipping invalid variation data:", variation);
                // Optionally render a placeholder card indicating an issue with this specific variation
            }
        });

        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function createPostCard(variation, platform, index) {
        const card = document.createElement('div');
        card.className = 'post-variation-card'; // Ensure CSS targets this class

        const copyId = `copy-text-${platform}-${index}`;
        const hashtagsId = `copy-hashtags-${platform}-${index}`;
        const fullPostId = `copy-full-${platform}-${index}`;

        // Provide defaults for missing data
        const postCopy = variation.main_copy || "[No main copy generated]";
        const hashtags = Array.isArray(variation.hashtags) ? variation.hashtags : [];
        const cta = variation.cta_suggestion || "N/A";
        const visual = variation.visual_suggestion || "N/A";
        const time = variation.best_time_suggestion || "N/A";

        const fullPostText = `${postCopy}\n\n${hashtags.join(' ')}`;

        const charLimit = CHAR_LIMITS[platform] || 0;
        const currentCount = postCopy.length;
        let countClass = '';
        let countMessage = `(${charLimit} limit)`;
        if (charLimit > 0) {
            if (currentCount > charLimit) countClass = 'error';
            else if (currentCount > charLimit * 0.85) countClass = 'warning'; // Warn if > 85% limit
        } else {
            countMessage = ''; // No limit message if limit is 0
        }

        const formattedCopy = escapeHtml(postCopy).replace(/\n/g, '<br>'); // Format line breaks for HTML display

        let platformIconClass = getPlatformIcon(platform);

        card.innerHTML = `
            <div class="card-header">
                <h3>
                    Variation ${index}
                    <span class="char-count ${countClass}" title="${charLimit > 0 ? `Approx. ${charLimit} character limit for ${platform}` : ''}">${currentCount} chars ${countMessage}</span>
                </h3>
                <i class="mockup-platform-icon ${platformIconClass}" title="${platform}"></i>
            </div>

            <div class="mockup-preview">
                 <div class="mockup-content">${formattedCopy}</div>
                 ${visual !== 'N/A' ? `<div class="visual-indicator" title="Visual Suggestion: ${escapeHtml(visual)}"><i class="fas fa-image"></i></div>` : ''}
            </div>

            <div class="post-details">
                <div class="post-element post-copy">
                    <label for="${copyId}"><i class="fas fa-pen"></i> <strong>Main Copy:</strong></label>
                    <button class="btn btn-copy btn-secondary btn-sm" data-copy-target="${copyId}" title="Copy main text"><i class="far fa-copy"></i></button>
                    <p class="copy-content">${formattedCopy}</p>
                </div>

                <div class="post-element hashtags">
                    <label for="${hashtagsId}"><i class="fas fa-hashtag"></i> <strong>Hashtags:</strong></label>
                    <button class="btn btn-copy btn-secondary btn-sm" data-copy-target="${hashtagsId}" title="Copy hashtags"><i class="far fa-copy"></i></button>
                    <p class="hashtag-list">${hashtags.map(tag => `<span>${escapeHtml(tag)}</span>`).join(' ')}</p>
                </div>

                <div class="post-element cta-suggestion">
                    <strong><i class="fas fa-bullhorn"></i> CTA:</strong> ${escapeHtml(cta)}
                </div>

                <div class="post-element visual-suggestion">
                    <strong><i class="fas fa-image"></i> Visual:</strong> ${escapeHtml(visual)}
                </div>

                 <div class="post-element best-time">
                    <strong><i class="far fa-clock"></i> Timing:</strong> ${escapeHtml(time)}
                </div>
            </div>

            <div class="post-actions">
                <button class="btn btn-primary btn-sm btn-copy-full" data-copy-target="${fullPostId}" title="Copy main text and hashtags">
                    <i class="far fa-copy"></i> Copy Full Post
                </button>
                <button class="btn btn-secondary btn-sm premium-feature" title="Schedule Post (Premium)">
                    <i class="far fa-calendar-alt"></i> Schedule
                </button>
                 <!-- Add other premium buttons if needed -->
            </div>

            <!-- Hidden textareas for easy copying -->
            <textarea id="${copyId}" class="copy-helper">${escapeHtml(postCopy)}</textarea>
            <textarea id="${hashtagsId}" class="copy-helper">${hashtags.join(' ')}</textarea>
            <textarea id="${fullPostId}" class="copy-helper">${escapeHtml(fullPostText)}</textarea>
        `;

        // Add premium feature interaction
        card.querySelectorAll('.premium-feature').forEach(btn => {
            btn.addEventListener('click', showPremiumPrompt);
        });

        return card;
    }

    function getPlatformIcon(platform) {
        switch (platform) {
            case 'Instagram': return 'fab fa-instagram';
            case 'Twitter': return 'fab fa-twitter'; // Or fa-x-twitter
            case 'LinkedIn': return 'fab fa-linkedin-in';
            case 'Facebook': return 'fab fa-facebook-f';
            case 'TikTok': return 'fab fa-tiktok';
            default: return 'fas fa-share-alt'; // Generic share icon
        }
    }

    function showPremiumPrompt() {
         alert('This is a Premium Feature! Upgrade your GemContent plan to unlock scheduling, analytics integration, and more powerful tools.');
         // Could also open a modal: showModal('premium-upsell-modal');
    }

    function handleResultActions(event) {
        // Use closest to find the button and its target ID
        const targetButton = event.target.closest('button[data-copy-target]');
        if (targetButton) {
            const targetId = targetButton.getAttribute('data-copy-target');
            const textElement = document.getElementById(targetId); // Use hidden textarea
            if (textElement && textElement.value) {
                copyToClipboard(textElement.value, targetButton);
            } else {
                console.error("Copy target not found or empty:", targetId);
                alert("Could not find content to copy.");
            }
        }
    }

    function handlePlatformChange() {
        // Example: You could update a character count preview near the input field
        // const limit = CHAR_LIMITS[platformSelect.value] || 0;
        // const previewElement = document.getElementById('char-limit-preview');
        // if (previewElement) {
        //     previewElement.textContent = limit > 0 ? `Approx Limit: ${limit}` : '';
        // }
        console.log(`Platform changed to: ${platformSelect.value}`);
    }

    // --- Utility Functions ---

    function showLoading(isLoading) {
        isGenerating = isLoading; // Update state
        if (!generateBtn || !btnText || !loadingSpinner) return; // Ensure elements exist
        if (isLoading) {
            generateBtn.disabled = true;
            btnText.textContent = 'Generating...';
            loadingSpinner.style.display = 'inline-block';
        } else {
            generateBtn.disabled = false;
            btnText.textContent = 'Generate Posts';
            loadingSpinner.style.display = 'none';
        }
    }

    function showError(message) {
        if (!errorMessage) return;
         document.querySelectorAll('.warning-message').forEach(el => el.remove()); // Clear warnings on new error
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
         if(resultsSection) resultsSection.style.display = 'none'; // Hide results on error
    }

     function showWarning(message) {
         if (!form) return; // Anchor needed
         document.querySelectorAll('.warning-message').forEach(el => el.remove()); // Clear previous
         const warningDiv = document.createElement('div');
         warningDiv.className = 'warning-message form-message';
         /* Add styles */
         warningDiv.style.backgroundColor = '#fff9e6'; warningDiv.style.borderColor = '#ffecb3'; warningDiv.style.color = '#8a6d3b';
         warningDiv.style.marginTop = '15px'; warningDiv.style.marginBottom = '15px'; warningDiv.style.padding = '10px 15px'; warningDiv.style.borderRadius = '4px'; warningDiv.style.display = 'flex';
         warningDiv.innerHTML = `<i class="fas fa-exclamation-triangle" style="margin-right: 10px; margin-top: 2px;"></i> <span>${escapeHtml(message)}</span>`;
         form.parentNode.insertBefore(warningDiv, resultsSection || errorMessage); // Insert before results/error
     }

    function clearResultsAndErrors() {
        if(resultsContainer) resultsContainer.innerHTML = '';
        if(resultsSection) resultsSection.style.display = 'none';
        if(errorMessage) errorMessage.style.display = 'none';
        document.querySelectorAll('.warning-message').forEach(el => el.remove());
    }

    function copyToClipboard(text, buttonElement) {
        navigator.clipboard.writeText(text).then(() => {
            const originalHtml = buttonElement.innerHTML;
            buttonElement.innerHTML = '<i class="fas fa-check"></i> Copied!';
            buttonElement.disabled = true; // Briefly disable
            setTimeout(() => {
                buttonElement.innerHTML = originalHtml;
                 buttonElement.disabled = false;
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            alert('Could not copy text.');
        });
    }

    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return unsafe === null || unsafe === undefined ? '' : String(unsafe);
        return unsafe
             .replace(/&/g, "&")
             .replace(/</g, "<")
             .replace(/>/g, ">")
             .replace(/"/g, "")
             .replace(/'/g, "'"); // Use HTML entity for single quote
     }

}); // End DOMContentLoaded