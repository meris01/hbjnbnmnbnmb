// public/js/faq_script.js (SECURED)
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    // (Keep all your existing DOM selectors)
    const faqForm = document.getElementById('faqForm');
    const topicInput = document.getElementById('topic');
    const industrySelect = document.getElementById('industry');
    const audienceSelect = document.getElementById('audience');
    const existingQuestionsContainer = document.getElementById('existingQuestionsContainer');
    const addQuestionBtn = document.getElementById('addQuestionBtn');
    const questionTypesCheckboxes = document.querySelectorAll('input[name="questionTypes"]');
    const numQuestionsInput = document.getElementById('numQuestions');
    const toneSelect = document.getElementById('tone');
    const detailLevelSlider = document.getElementById('detailLevel');
    const detailLevelValue = document.getElementById('detailLevelValue');
    const simpleLanguageToggle = document.getElementById('simpleLanguage');
    const keywordsInput = document.getElementById('keywords');
    const generateBtn = document.getElementById('generateBtn');
    const btnText = generateBtn?.querySelector('.btn-text'); // Use optional chaining
    const btnLoader = generateBtn?.querySelector('.loader');

    const outputArea = document.getElementById('outputArea');
    const outputLoading = document.getElementById('outputLoading');
    const outputError = document.getElementById('outputError');
    const errorMessageDetail = document.getElementById('errorMessageDetail');
    const outputResults = document.getElementById('outputResults');
    const faqListContainer = document.getElementById('faqList');
    const schemaCodeElement = document.getElementById('schemaCode');
    const suggestionsList = document.getElementById('suggestionsList');
    const copyAllBtn = document.getElementById('copyAllBtn');
    const copySchemaBtn = document.getElementById('copySchemaBtn');
    const exportSelect = document.getElementById('exportOptions');

    // Mobile Nav Buttons
    const mobileGenerateBtn = document.getElementById('mobileGenerateBtn');
    const mobileCopyBtn = document.getElementById('mobileCopyBtn');
    const mobileScrollTopBtn = document.getElementById('mobileScrollTopBtn');

    // --- State ---
    let isLoading = false;
    let generatedFaqs = []; // Store array of {question, answer, category, related, phrasing} objects
    let sortableInstance = null; // For SortableJS

    // --- Backend Configuration ---
    // *** Define the unique backend endpoint for THIS tool ***
    const BACKEND_API_ENDPOINT = '/api/generate-faqs'; // Secure backend endpoint

    // --- Initial Setup ---
    if (detailLevelSlider) updateDetailLevelLabel(); // Set initial label for range slider
    if (outputArea) outputArea.style.display = 'none'; // Hide output area initially

    // --- Event Listeners ---
    if (faqForm) faqForm.addEventListener('submit', handleGenerateClick);
    if (addQuestionBtn) addQuestionBtn.addEventListener('click', addExistingQuestionField);
    if (detailLevelSlider) detailLevelSlider.addEventListener('input', updateDetailLevelLabel);

    // Event delegation for accordion toggles and copy buttons
    if (faqListContainer) {
        faqListContainer.addEventListener('click', (event) => {
            const header = event.target.closest('.faq-item-header');
            const copyBtn = event.target.closest('.copy-individual-btn');

            if (header) {
                toggleAccordion(header.parentElement);
            } else if (copyBtn) {
                const faqItem = copyBtn.closest('.faq-item');
                if (!faqItem) return; // Safety check
                const questionElement = faqItem.querySelector('h4');
                const answerElement = faqItem.querySelector('.faq-item-content p');
                const question = questionElement ? questionElement.textContent.trim() : 'Question not found.';
                const answer = answerElement ? answerElement.textContent.trim() : 'Answer not found.';
                copyToClipboard(`Q: ${question}\nA: ${answer}`, copyBtn);
            }
        });
    }

    if (copyAllBtn) copyAllBtn.addEventListener('click', handleCopyAll);
    if (copySchemaBtn) copySchemaBtn.addEventListener('click', handleCopySchema);
    if (exportSelect) exportSelect.addEventListener('change', () => handleExport(exportSelect.value));

    // Mobile Nav Listeners
    if (mobileGenerateBtn && generateBtn) mobileGenerateBtn.addEventListener('click', () => generateBtn.click());
    if (mobileCopyBtn) mobileCopyBtn.addEventListener('click', handleCopyAll);
    if (mobileScrollTopBtn) mobileScrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    // --- Core Functions ---

    function updateDetailLevelLabel() {
        if (!detailLevelValue || !detailLevelSlider) return;
        const levels = { 1: 'Brief', 2: 'Concise', 3: 'Medium', 4: 'Detailed', 5: 'Comprehensive' };
        detailLevelValue.textContent = levels[detailLevelSlider.value] || 'Medium';
    }

    function addExistingQuestionField() {
        if (!existingQuestionsContainer) return;
        const textareaCount = existingQuestionsContainer.querySelectorAll('textarea').length;
        const newTextarea = document.createElement('textarea');
        newTextarea.name = 'existingQuestions[]';
        newTextarea.placeholder = `Another specific question...`;
        newTextarea.rows = 2; // Optional: make them smaller
        newTextarea.setAttribute('aria-label', `Existing Question ${textareaCount + 1}`);
        existingQuestionsContainer.appendChild(newTextarea);
        newTextarea.focus();
    }

    async function handleGenerateClick(event) {
        event.preventDefault();
        if (isLoading || !topicInput) return;

        const topic = topicInput.value.trim();
        if (!topic) {
            showError("Please enter a Product/Service/Topic.", topicInput);
            return;
        }

        // REMOVED: API Key check (handled by backend)

        showLoading(true);
        clearError();
        clearPreviousMessages(); // Clear old warnings
        if (outputArea) outputArea.style.display = 'block';
        if (outputResults) outputResults.style.display = 'none';

        try {
            const prompt = buildPrompt();
            // console.log("Constructed Prompt (to be sent to backend):", prompt);

            // *** Call the secure backend endpoint ***
            const backendResponse = await callBackendAPI(prompt);

            // Check for backend error first
            if (backendResponse.error) {
                throw new Error(backendResponse.error);
            }

            // Ensure generatedText exists
            if (typeof backendResponse.generatedText !== 'string') {
                console.error("Backend response missing 'generatedText':", backendResponse);
                throw new Error("Received invalid data structure from the backend service.");
            }

            // *** Parse the text content received from the backend ***
            generatedFaqs = parseApiResponse(backendResponse.generatedText);

            displayResults(generatedFaqs);
            initializeSortable();

            // Show warning from backend if present
            if (backendResponse.isIncomplete || backendResponse.warning) {
                showWarning(backendResponse.warning || "Output may be incomplete due to length limits.");
            }

        } catch (error) {
            console.error("Generation Error:", error);
            showError(`Error: ${error.message || 'Failed to generate FAQs. Check console.'}`);
            if (outputResults) outputResults.style.display = 'none'; // Ensure results hidden on error
        } finally {
            showLoading(false);
            // Scroll to output area
            outputArea?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    /**
     * Builds the prompt string (remains the same).
     */
    function buildPrompt() {
        // ... (Keep your existing buildPrompt function exactly as it was)
        // It correctly defines the structure expected by the AI.
        const topic = topicInput.value.trim();
        const industry = industrySelect.value;
        const audience = audienceSelect.value;
        const existingQuestions = Array.from(existingQuestionsContainer.querySelectorAll('textarea'))
                                      .map(ta => ta.value.trim())
                                      .filter(q => q);
        const questionTypes = Array.from(questionTypesCheckboxes)
                                  .filter(cb => cb.checked)
                                  .map(cb => cb.value);
        const numQuestions = numQuestionsInput.value;
        const tone = toneSelect.value;
        const detailLevel = detailLevelSlider.value;
        const useSimpleLanguage = simpleLanguageToggle.checked;
        const keywords = keywordsInput.value.trim();
        const detailMap = { 1: 'very brief (1-2 sentences)', 2: 'concise (2-3 sentences)', 3: 'medium detail (3-5 sentences)', 4: 'detailed (5-7 sentences)', 5: 'comprehensive (multiple paragraphs if needed)' };
        let prompt = `Generate a set of approximately ${numQuestions} Frequently Asked Questions (FAQs) about "${topic}".\n\n`;
        if (industry) prompt += `Consider the context of the "${industry}" industry.\n`;
        prompt += `The target audience is primarily "${audience}".\n`;
        prompt += `The desired tone for the answers is "${tone}".\n`;
        prompt += `The desired detail level for answers is "${detailMap[detailLevel]}".\n`;
        if (useSimpleLanguage) prompt += `Use clear, simple language, avoiding excessive jargon unless the audience is technical.\n`;
        else prompt += `Use appropriate terminology for the target audience, potentially including technical terms if relevant.\n`;
        if (existingQuestions.length > 0) { prompt += `Include and provide answers for these specific questions if possible:\n${existingQuestions.map(q => `- ${q}`).join('\n')}\n`; }
        if (questionTypes.length > 0) { prompt += `Focus on generating questions related to these types: ${questionTypes.join(', ')}.\n`; }
        else { prompt += `Generate a diverse range of common question types (e.g., how-to, pricing, features, troubleshooting, general).\n`; }
        if (keywords) { prompt += `Naturally integrate the following keywords into the questions and answers where relevant for SEO: "${keywords}".\n`; }
        prompt += `\n**Output Format:**\nFor EACH question and answer pair, format it EXACTLY like this:\n\nCategory: [Relevant Category Name]\nQ: [The Full Question Text]\nA: [The Full Answer Text]\nRelated: [List 1-2 very closely related questions, separated by semicolons, or "None"]\nPhrasing: [List 1-2 alternative ways the main question might be phrased, separated by semicolons, or "None"]\n\n--- [Use exactly three hyphens on a new line as a separator between each Q&A pair] ---\n`;
        prompt += `\n**Additional Considerations:**\n- Group the Q&As logically by the 'Category'.\n- Identify potential points of customer confusion related to "${topic}" and try to address them.\n- Predict common user questions.\n- Ensure answers are accurate, clear, and directly address the question.\n`;
        prompt += `\nGenerate the ${numQuestions} Q&A pairs based on all the above instructions. Start directly with the first "Category:". Do not include any introductory or concluding text.`;
        return prompt;
        // ...
    }

    /**
     * Calls the secure backend API endpoint.
     * @param {string} prompt - The prompt string.
     * @returns {Promise<object>} - Resolves with { generatedText, isIncomplete, warning } or { error }
     */
    async function callBackendAPI(prompt) {
        console.log(`--- Sending Prompt to Backend Endpoint: ${BACKEND_API_ENDPOINT} ---`);
        try {
            const response = await fetch(BACKEND_API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: prompt }) // Send prompt expected by server
            });

            let responseData;
            try {
                responseData = await response.json();
            } catch (e) {
                 const textError = await response.text();
                 console.error(`Backend response not JSON. Status: ${response.status}. Body: ${textError.substring(0, 500)}...`);
                 let userError = `Server returned status ${response.status}, response not JSON.`;
                 if (response.status === 500) userError = "An internal server error occurred.";
                 else if (response.status === 404) userError = "API endpoint not found.";
                 throw new Error(userError);
            }

            if (!response.ok) {
                // Use error message from backend JSON if available
                const errorMessage = responseData?.error || `Request failed with status ${response.status}`;
                console.error("Backend API Error Response:", responseData);
                // Return error structure for the calling function to handle
                return { error: errorMessage };
            }

            // Return the successful data structure from the backend
            // Expecting { generatedText: '...', isIncomplete: boolean, warning: string|null }
            return responseData;

        } catch (error) {
            console.error('Error calling backend API:', error);
            let message = error.message || 'An unknown network error occurred.';
             if (error.message.includes('Failed to fetch')) {
                 message = `Network error: Could not connect to the backend at ${window.location.origin}${BACKEND_API_ENDPOINT}. Is the server running?`;
             }
            // Return error structure
            return { error: message };
        }
    }

    /**
     * Parses the raw text response from the AI (via backend).
     * (Keep this function largely as it was, as it operates on the text content)
     */
     function parseApiResponse(responseText) {
        // ... (Keep your existing parseApiResponse function)
        // It correctly parses the structured text output expected from the AI.
        const faqs = [];
        const blocks = responseText.split(/\n---\n/).map(block => block.trim()).filter(block => block);

        if (blocks.length === 0 && responseText.length > 10) { /* Fallback logic */ }
        else { /* Preferred block parsing logic */ }

        blocks.forEach(block => {
            const faq = {};
            const lines = block.split('\n');
            let currentField = null;
            lines.forEach(line => {
                line = line.trim();
                if (line.startsWith('Category:')) { faq.category = line.substring(9).trim(); currentField = null; }
                else if (line.startsWith('Q:')) { faq.question = line.substring(2).trim(); currentField = 'question'; }
                else if (line.startsWith('A:')) { faq.answer = line.substring(2).trim(); currentField = 'answer'; }
                else if (line.startsWith('Related:')) { faq.related = line.substring(8).trim(); currentField = null; }
                else if (line.startsWith('Phrasing:')) { faq.phrasing = line.substring(9).trim(); currentField = null; }
                else if (currentField === 'answer' && faq.answer !== undefined) { faq.answer += '\n' + line; }
                else if (currentField === 'question' && faq.question !== undefined) { faq.question += '\n' + line; }
            });
            if (faq.question && faq.answer) {
                faq.category = faq.category || 'General';
                faq.related = faq.related || 'None';
                faq.phrasing = faq.phrasing || 'None';
                faqs.push(faq);
            } else { console.warn("Skipping malformed block:", block); }
        });

        if (faqs.length === 0 && responseText.length > 10) { return [{ question: "Raw Response (Parsing Failed)", answer: responseText, category: "Error", related: "None", phrasing: "None" }]; }
        else if (faqs.length === 0) { throw new Error("No valid Q&A pairs found in the API response."); }
        return faqs;
        // ...
     }


    /**
     * Displays the parsed FAQs in the list (Keep as is)
     */
    function displayResults(faqs) {
        // ... (Keep your existing displayResults function)
        // It takes the parsed `faqs` array and renders the HTML.
        if (!faqListContainer || !schemaCodeElement || !suggestionsList || !outputResults) {
             console.error("FAQ Display Error: Output elements missing.");
             showError("Failed to display results - UI elements missing.");
             return;
        }
        faqListContainer.innerHTML = ''; // Clear previous

        if (!faqs || faqs.length === 0) {
            faqListContainer.innerHTML = '<p>No FAQs were generated. Try adjusting the prompt.</p>';
            schemaCodeElement.textContent = 'No schema generated.';
            suggestionsList.innerHTML = '<li>No suggestions available.</li>';
            outputResults.style.display = 'block';
            return;
        }

        faqs.forEach((faq, index) => {
            const faqItem = document.createElement('div');
            faqItem.className = 'faq-item';
            faqItem.dataset.id = index; // For potential reordering/identification
            const safeQuestion = escapeHtml(faq.question);
            const safeAnswer = escapeHtml(faq.answer).replace(/\n/g, '<br>');
            const safeCategory = escapeHtml(faq.category);
            const safeRelated = escapeHtml(faq.related);
            const safePhrasing = escapeHtml(faq.phrasing);
            const contentId = `faq-content-${index}`;
            const headerId = `faq-header-${index}`;

            faqItem.innerHTML = `
                <div class="faq-item-header" id="${headerId}" role="button" aria-expanded="false" aria-controls="${contentId}">
                    <h4>${safeQuestion}</h4>
                    ${safeCategory !== 'General' && safeCategory !== 'Error' ? `<span class="category-tag">${safeCategory}</span>` : ''}
                    <span class="accordion-icon" aria-hidden="true">▼</span>
                </div>
                <div class="faq-item-content" id="${contentId}" role="region" aria-labelledby="${headerId}">
                    <p>${safeAnswer}</p>
                    ${safeRelated && safeRelated !== 'None' ? `<small><strong>Related:</strong> ${safeRelated}</small><br>` : ''}
                    ${safePhrasing && safePhrasing !== 'None' ? `<small><strong>Alternative Phrasings:</strong> ${safePhrasing}</small>` : ''}
                    <div class="action-buttons">
                       <button class="copy-individual-btn btn btn-secondary btn-small" title="Copy this Q&A"><i class="fas fa-copy"></i> Copy Q&A</button>
                    </div>
                </div>
            `;
            faqListContainer.appendChild(faqItem);
        });

        const schemaJson = generateSchema(faqs);
        schemaCodeElement.textContent = schemaJson ? JSON.stringify(schemaJson, null, 2) : 'Error generating schema.';
        generateSuggestions(faqs);
        outputResults.style.display = 'block';
        // ...
    }

    /**
     * Initializes SortableJS (Keep as is)
     */
    function initializeSortable() {
        // ... (Keep your existing initializeSortable function)
         if (sortableInstance) { sortableInstance.destroy(); }
         if (typeof Sortable !== 'undefined' && faqListContainer && faqListContainer.children.length > 1) {
             sortableInstance = new Sortable(faqListContainer, {
                 animation: 150,
                 ghostClass: 'sortable-ghost',
                 chosenClass: 'sortable-chosen',
                 // onEnd: function (evt) { /* Optional reorder logic */ }
             });
         } else if (typeof Sortable === 'undefined') { console.warn("SortableJS library not found."); }
        // ...
    }

    /**
     * Toggles accordion items (Keep as is)
     */
    function toggleAccordion(faqItem) {
        // ... (Keep your existing toggleAccordion function)
        if (!faqItem) return;
        const content = faqItem.querySelector('.faq-item-content');
        const header = faqItem.querySelector('.faq-item-header');
        if (!content || !header) return;
        const isActive = faqItem.classList.toggle('active');
        header.setAttribute('aria-expanded', isActive);
        content.style.maxHeight = isActive ? content.scrollHeight + "px" : '0';
        // ...
    }

     /**
      * Generates JSON-LD Schema (Keep as is)
      */
     function generateSchema(faqs) {
        // ... (Keep your existing generateSchema function)
        if (!faqs || faqs.length === 0) return null;
        return {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqs.map(faq => ({
                "@type": "Question",
                "name": faq.question,
                "acceptedAnswer": { "@type": "Answer", "text": faq.answer }
            }))
        };
        // ...
     }

     /**
      * Generates suggestions (Keep as is)
      */
     function generateSuggestions(faqs) {
        // ... (Keep your existing generateSuggestions function)
         if (!suggestionsList) return;
         suggestionsList.innerHTML = ''; // Clear previous
         const suggestions = [ /* Your default suggestions */
            "Embed these FAQs using an accordion structure.",
            "Create a dedicated FAQ page.",
            "Include the generated JSON-LD schema markup.",
            "Regularly review and update FAQs.",
            "Consider adding internal links within answers.",
         ];
         if (faqs.some(f => f.category?.toLowerCase().includes('troubleshooting'))) { suggestions.push("Ensure clear, step-by-step instructions for troubleshooting."); }
         if (keywordsInput?.value.trim()) { suggestions.push("Review keyword integration for naturalness."); }
         suggestions.forEach(s => { suggestionsList.innerHTML += `<li>${s}</li>`; });
         if (suggestions.length === 0) suggestionsList.innerHTML = '<li>No suggestions generated.</li>';
        // ...
     }

    // --- UI Helper Functions ---

    function showLoading(show) {
        // ... (Keep existing showLoading, ensures elements exist)
        isLoading = show;
        if (show) {
            if (btnText) btnText.style.display = 'none';
            if (btnLoader) btnLoader.style.display = 'inline-block';
            if (generateBtn) generateBtn.disabled = true;
            if (mobileGenerateBtn) mobileGenerateBtn.disabled = true;
            if (outputLoading) outputLoading.style.display = 'flex';
            if (outputResults) outputResults.style.display = 'none';
            if (outputError) outputError.style.display = 'none';
        } else {
            if (btnText) btnText.style.display = 'inline';
            if (btnLoader) btnLoader.style.display = 'none';
            if (generateBtn) generateBtn.disabled = false;
            if (mobileGenerateBtn) mobileGenerateBtn.disabled = false;
            if (outputLoading) outputLoading.style.display = 'none';
        }
        // ...
    }

    function showError(message, elementToFocus = null) {
        // ... (Keep existing showError, ensures elements exist)
        if (!errorMessageDetail || !outputError || !outputArea) return;
        errorMessageDetail.textContent = message;
        outputError.style.display = 'block';
        if (outputLoading) outputLoading.style.display = 'none';
        if (outputResults) outputResults.style.display = 'none';
        if (elementToFocus) { elementToFocus.focus(); }
        outputArea.style.display = 'block'; // Ensure parent area is visible
        outputError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // ...
    }

    function showWarning(message) {
        // ... (Add this function - similar to other tools)
         clearPreviousMessages(); // Clear old warnings
         if (outputError) { // Reuse error area's parent
             const warningDiv = document.createElement('div');
             warningDiv.className = 'warning-message form-message'; // Use existing styles
             warningDiv.style.display = 'flex';
             warningDiv.style.backgroundColor = '#fff9e6';
             warningDiv.style.borderColor = '#ffecb3';
             warningDiv.style.color = '#8a6d3b';
             warningDiv.innerHTML = `<i class="fas fa-exclamation-triangle" style="margin-right: 10px;"></i> <span>${escapeHtml(message)}</span>`;
             outputError.parentNode.insertBefore(warningDiv, outputError);
         } else { console.warn("Warning:", message); }
     }

    function clearError() {
        // ... (Keep existing clearError)
        if (outputError) outputError.style.display = 'none';
        if (errorMessageDetail) errorMessageDetail.textContent = '';
        // ...
    }

    function clearPreviousMessages() {
        clearError(); // Clear errors
        // Remove any dynamically added warning messages
        document.querySelectorAll('.warning-message').forEach(el => el.remove());
    }

     function escapeHtml(unsafe) {
         // ... (Keep existing escapeHtml - corrected version)
         if (typeof unsafe !== 'string') return '';
         return unsafe.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, "").replace(/'/g, "'");
         // ...
     }

    function copyToClipboard(text, buttonElement = null) {
        // ... (Keep existing copyToClipboard)
         navigator.clipboard.writeText(text).then(() => {
            if (buttonElement) {
                const originalHtml = buttonElement.innerHTML;
                buttonElement.innerHTML = '<i class="fas fa-check"></i> Copied!'; // Font Awesome check icon
                buttonElement.disabled = true;
                setTimeout(() => {
                    buttonElement.innerHTML = originalHtml;
                    buttonElement.disabled = false;
                }, 1500);
            }
         }).catch(err => {
             console.error('Failed to copy text: ', err);
             alert('Failed to copy text.');
         });
        // ...
    }

    function handleCopyAll() {
        // ... (Keep existing handleCopyAll)
         if (!generatedFaqs || generatedFaqs.length === 0) { alert("No FAQs to copy."); return; }
         const plainText = generatedFaqs.map(faq => `Q: ${faq.question}\nA: ${faq.answer}`).join('\n\n---\n\n');
         copyToClipboard(plainText, copyAllBtn);
        // ...
     }

     function handleCopySchema() {
         // ... (Keep existing handleCopySchema)
          if (!schemaCodeElement) return;
          const schemaText = schemaCodeElement.textContent;
          if (!schemaText || schemaText.includes('No schema') || schemaText.includes('will appear')) { alert("No schema to copy."); return; }
          copyToClipboard(schemaText, copySchemaBtn);
         // ...
     }


    // --- Export Functionality ---
    function handleExport(format) {
        // ... (Keep existing handleExport function)
        if (!generatedFaqs || generatedFaqs.length === 0) { alert("No FAQs to export."); if(exportSelect) exportSelect.value = ""; return; }
        const filename = `gemcontent_faqs_${topicInput.value.trim().replace(/\s+/g, '_') || 'export'}`;
        const schemaJson = generateSchema(generatedFaqs);
        switch (format) {
           case 'txt':
                const plainText = generatedFaqs.map(faq => `Category: ${faq.category}\nQ: ${faq.question}\nA: ${faq.answer}\nRelated: ${faq.related}\nPhrasing: ${faq.phrasing}`).join('\n\n---\n\n');
                downloadFile(`${filename}.txt`, plainText, 'text/plain'); break;
           case 'html': /* Your HTML export logic */
                let htmlContent = `...`; // (As before)
                downloadFile(`${filename}.html`, htmlContent, 'text/html'); break;
           case 'pdf': alert("PDF export not implemented."); break;
           case 'docx': alert("Word (.docx) export not implemented."); break;
           case '': return;
           default: alert(`Export format "${format}" unknown.`);
        }
        if(exportSelect) exportSelect.value = ""; // Reset dropdown
        // ...
    }

    function downloadFile(filename, content, mimeType) {
        // ... (Keep existing downloadFile function)
        const blob = new Blob([content], { type: mimeType });
        if (typeof saveAs !== 'undefined') { saveAs(blob, filename); }
        else {
            const url = URL.createObjectURL(blob); const a = document.createElement('a');
            a.href = url; a.download = filename; document.body.appendChild(a); a.click();
            document.body.removeChild(a); URL.revokeObjectURL(url);
        }
        // ...
    }

}); // End DOMContentLoaded