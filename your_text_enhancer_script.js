// public/js/your_text_enhancer_script.js (REVISED)
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    // (Keep all your existing DOM element selectors)
    const originalTextInput = document.getElementById('originalText');
    const enhanceBtn = document.getElementById('enhanceBtn');
    const btnText = enhanceBtn?.querySelector('.btn-text');
    const btnLoader = enhanceBtn?.querySelector('.loader');
    const fab = document.getElementById('fab');
    const outputPlaceholder = document.getElementById('outputPlaceholder');
    const outputLoading = document.getElementById('outputLoading');
    const outputError = document.getElementById('outputError');
    const errorMessageDetail = document.getElementById('errorMessageDetail');
    const outputResults = document.getElementById('outputResults');
    const outputActions = document.getElementById('outputActions');

    // --- Target SINGLE Output Elements ---
    // We will reuse the first set of elements for the single result
    const versionTabsContainer = outputResults?.querySelector('.version-tabs'); // Get the tabs container
    const version1Content = document.getElementById('version1'); // The container for the single result
    const diffOutput = document.getElementById('diffOutput1'); // Use the first diff output area
    const analysisOutput = document.getElementById('analysis1'); // Use the first analysis output area
    const suggestionsList = document.getElementById('suggestionsList');

    // --- Buttons in Output Header ---
    const historyBtn = outputActions?.querySelector('button[onclick*="showVersionHistory"]'); // Find history button if needed
    const exportSelect = document.getElementById('exportOptions');
    // Add a new ID to your HTML for a single copy button in the header, or we find it dynamically
    const copyEnhancedBtn = document.getElementById('copyEnhancedBtn'); // *** ADD id="copyEnhancedBtn" TO A BUTTON IN outputActions in your HTML ***

    const inputWordCount = document.getElementById('inputWordCount');
    const inputCharCount = document.getElementById('inputCharCount');

    // --- Controls ---
    const purposeSelect = document.getElementById('purpose');
    const toneSelect = document.getElementById('tone');
    const readingLevelSelect = document.getElementById('readingLevel');
    const lengthModifierSelect = document.getElementById('lengthModifier');
    const keywordsInput = document.getElementById('keywords');
    const industryTermsToggle = document.getElementById('industryTerms');
    const grammarCheckToggle = document.getElementById('grammarCheck');

    // --- Version History & Modals ---
    const versionHistoryModal = document.getElementById('versionHistoryModal');
    const historyList = document.getElementById('historyList');

    // --- Controls Panel ---
    const controlsPanel = document.getElementById('controlsPanel');
    const controlsContent = controlsPanel?.querySelector('.controls-content');
    const controlsToggleButton = controlsPanel?.querySelector('.panel-toggle');

    // --- State ---
    let currentOriginalText = '';
    let currentVersionData = null; // Stores data for ONE version: { versionText: "...", analysis: {...}, diffHtml: "..." }
    let versionHistory = []; // Store past results { timestamp: Date, original: "...", versionData: {...} }
    let isLoading = false;

    // --- Backend Configuration ---
    const BACKEND_API_ENDPOINT = '/api/enhance-text';

    // --- Diff Match Patch Initialization ---
    const dmp = new diff_match_patch();

    // --- Initial UI Setup ---
    if (originalTextInput) updateTextInfo();
    if (versionTabsContainer) versionTabsContainer.style.display = 'none'; // Hide tabs container initially
    // Hide the content areas for V2 and V3 permanently if they exist
    const version2Content = document.getElementById('version2');
    const version3Content = document.getElementById('version3');
    if(version2Content) version2Content.style.display = 'none';
    if(version3Content) version3Content.style.display = 'none';

    // --- Event Listeners ---
    if (enhanceBtn) enhanceBtn.addEventListener('click', handleEnhanceClick);
    if (fab) fab.addEventListener('click', handleEnhanceClick);
    if (originalTextInput) originalTextInput.addEventListener('input', updateTextInfo);
    if (copyEnhancedBtn) copyEnhancedBtn.addEventListener('click', handleCopyEnhanced); // Listener for the new copy button

    // --- Core Functions ---

    async function handleEnhanceClick() {
        if (isLoading) return;

        const originalText = originalTextInput?.value.trim() ?? '';
        if (!originalText) {
            showError("Please enter some text to enhance.", originalTextInput);
            return;
        }

        currentOriginalText = originalText;
        showLoading(true);
        clearError();
        clearPreviousMessages(); // Clear warnings too
        if (outputResults) outputResults.style.display = 'none';
        if (outputPlaceholder) outputPlaceholder.style.display = 'none';
        if (outputActions) outputActions.style.display = 'none';
        if (versionTabsContainer) versionTabsContainer.style.display = 'none'; // Ensure tabs stay hidden

        try {
            const prompt = buildPrompt(originalText);
            const backendResponse = await callBackendAPI(prompt);
            processBackendResponse(backendResponse);

            if (currentVersionData) {
                addResultToHistory(currentOriginalText, currentVersionData);
            }

        } catch (error) {
            console.error("Enhancement process failed:", error);
            showError(`Error: ${error.message || 'Failed to enhance content. Check console.'}`);
            if (outputPlaceholder) outputPlaceholder.style.display = 'block';
        } finally {
            showLoading(false);
        }
    }

    /**
     * Builds the prompt for the backend (Requests ONE version).
     */
    function buildPrompt(text) {
        // ... (Keep the buildPrompt function asking for ONE version - from previous answer)
        const purpose = purposeSelect.value;
        const tone = toneSelect.value;
        const readingLevel = readingLevelSelect.value;
        const lengthModifier = lengthModifierSelect.value;
        const keywords = keywordsInput.value.trim();
        const useIndustryTerms = industryTermsToggle.checked;
        const fixGrammar = grammarCheckToggle.checked;

        let prompt = `Please rewrite and enhance the following text, providing one optimized version.\n\n`;
        prompt += `**Rewriting Purpose:** ${purpose}.\n`;
        prompt += `**Desired Tone:** ${tone}.\n`;
        prompt += `**Target Reading Level:** Aim for a ${readingLevel} reading level.\n`;
        prompt += `**Length:** ${lengthModifier}.\n`;
        if (fixGrammar) {
            prompt += `**Correction:** Correct grammar and spelling errors thoroughly.\n`;
        } else {
            prompt += `**Correction:** Preserve original grammar and spelling unless it severely hinders meaning.\n`;
        }
        if (keywords) {
            prompt += `**Keywords:** Ensure the following keywords/phrases are included naturally and emphasized where appropriate: "${keywords}".\n`;
        }
        if (useIndustryTerms) {
            prompt += `**Terminology:** Use relevant industry-specific terminology where appropriate.\n`;
        } else {
            prompt += `**Terminology:** Avoid overly technical jargon unless essential; prefer clearer language.\n`;
        }
        prompt += `**Additional Enhancements:**\n`;
        prompt += `- Improve sentence structure for better flow and clarity.\n`;
        prompt += `- Enhance vocabulary, replacing weak words with stronger alternatives.\n`;
        prompt += `- Adjust active/passive voice for better impact (generally prefer active).\n`;
        prompt += `- Recommend or add suitable transition phrases between sentences and paragraphs.\n`;
        prompt += `- Consider basic SEO principles like keyword placement if keywords are provided.\n\n`;
        prompt += `**Original Text:**\n"${text}"\n\n`;
        prompt += `**Output:**\nProvide only the single best rewritten and enhanced version of the text based on the instructions. Do not include explanations before or after the enhanced text itself.`;
        return prompt;
        // ...
    }

    /**
     * Calls the backend proxy securely.
     */
    async function callBackendAPI(prompt) {
        // ... (Keep the callBackendAPI function - from previous answer)
        console.log(`--- Sending Prompt to Backend Endpoint: ${BACKEND_API_ENDPOINT} ---`);
        try {
            const response = await fetch(BACKEND_API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ prompt: prompt })
            });
            let responseData;
            try { responseData = await response.json(); }
            catch (e) {
                 const textError = await response.text();
                 console.error(`Backend response not JSON. Status: ${response.status}. Body: ${textError.substring(0, 500)}...`);
                 let userError = `Server returned status ${response.status}, response not JSON.`;
                 if (response.status === 500) userError = "An internal server error occurred.";
                 else if (response.status === 404) userError = "API endpoint not found.";
                 throw new Error(userError);
            }
            if (!response.ok) {
                const errorMessage = responseData?.error || `Request failed with status ${response.status}`;
                console.error("Backend API Error Response:", responseData);
                throw new Error(errorMessage);
            }
            return responseData; // Expecting { generatedContent, isIncomplete, warning }
        } catch (error) {
            console.error('Error calling backend API:', error);
            if (error.message.includes('Failed to fetch')) {
                 throw new Error(`Network error: Could not connect to backend. Is the server running?`);
            } else if (error.message.includes('JSON')) {
                 throw new Error(`Communication error: Unexpected response from server.`);
            }
            throw error;
        }
        // ...
    }

    /**
     * Processes the structured response from OUR backend for the SINGLE version.
     */
    function processBackendResponse(backendResponse) {
        // ... (Keep the processBackendResponse function - from previous answer)
        currentVersionData = null;
        if (backendResponse.error) { throw new Error(backendResponse.error); }
        if (typeof backendResponse.generatedContent !== 'string') {
            console.error("Invalid backend response structure:", backendResponse);
            throw new Error("Backend response missing expected 'generatedContent'.");
        }
        const enhancedText = backendResponse.generatedContent.trim();
        // Optional: Add check if enhancedText is empty, maybe throw error or show specific message
        // if (!enhancedText) { throw new Error("Enhancement returned empty content."); }

        const analysis = analyzeText(enhancedText, keywordsInput?.value.trim() ?? '');
        const diffs = dmp.diff_main(currentOriginalText, enhancedText);
        dmp.diff_cleanupSemantic(diffs);
        const diffHtml = dmp.diff_prettyHtml(diffs);

        currentVersionData = { versionText: enhancedText, analysis: analysis, diffHtml: diffHtml };
        const suggestions = generatePlaceholderSuggestions(currentVersionData);
        displayResults(currentVersionData, suggestions); // Pass single object

         if (backendResponse.isIncomplete || backendResponse.warning) {
             showWarning(backendResponse.warning || "Output may be incomplete.");
         }
        // ...
    }

    /**
     * Analyzes text for metrics (Keep as is)
     */
    function analyzeText(text, keywords) {
        // ... (Keep your existing analyzeText function)
         const words = text ? text.match(/\b\w+\b/g) || [] : [];
         const wordCount = words.length;
         const charCount = text.length;
         const avgWordsPerMinute = 200;
         const readingTimeMinutes = wordCount / avgWordsPerMinute;
         const readingTimeEstimate = readingTimeMinutes < 1 ? "< 1 min" : `${Math.ceil(readingTimeMinutes)} min read`;
         const sentences = text ? text.match(/[^.!?]+[.!?]+/g) || [] : [];
         const sentenceCount = sentences.length || 1;
         const simulatedGradeLevel = Math.max(1, Math.min(18, Math.round((wordCount / sentenceCount) * 0.4)));
         const readabilityScore = `~ Grade ${simulatedGradeLevel}`;
         let keywordCount = 0;
         let density = "0%";
         const keywordList = keywords ? keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k) : [];
         if (keywordList.length > 0 && wordCount > 0) {
             const lowerCaseText = text.toLowerCase();
             keywordList.forEach(kw => {
                 const regex = new RegExp(`\\b${kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi');
                 keywordCount += (lowerCaseText.match(regex) || []).length;
             });
             density = ((keywordCount / wordCount) * 100).toFixed(1) + '%';
         }
         const keywordDensity = `${keywordCount} (${density})`;
         const toneConsistency = `Target: ${toneSelect?.value ?? 'N/A'}`; // Use optional chaining
         return { wordCount, charCount, readingTime: readingTimeEstimate, readabilityScore, keywordDensity, toneConsistency };
        // ...
    }

    /**
     * Generates suggestions (Keep as is)
     */
     function generatePlaceholderSuggestions(versionData) {
         // ... (Keep your existing generatePlaceholderSuggestions function)
         const suggestions = [];
         if (!versionData) return suggestions;
         if (currentOriginalText.length > 50) { suggestions.push(`<strong>Plagiarism Risk:</strong> Consider running through a dedicated plagiarism checker.`); }
         if (grammarCheckToggle?.checked) { suggestions.push(`<strong>Grammar & Style:</strong> AI attempted corrections. Review closely.`); }
         else { suggestions.push(`<strong>Grammar & Style:</strong> AI preserved original grammar. Manual review recommended.`); }
         suggestions.push(`<strong>Sentence Structure:</strong> Check for sentence length variation and clarity.`);
         suggestions.push(`<strong>Vocabulary:</strong> Ensure word choices match the intended ${toneSelect?.value ?? ''} tone and ${readingLevelSelect?.value ?? ''} reading level.`);
         suggestions.push(`<strong>Voice:</strong> Review use of active vs. passive voice.`);
         suggestions.push(`<strong>Transitions:</strong> Verify smooth transitions between ideas.`);
         if (keywordsInput?.value.trim()) { suggestions.push(`<strong>SEO:</strong> Keywords incorporated. Check for natural integration.`); }
         return suggestions;
         // ...
     }

    /**
     * Displays the results for the SINGLE enhanced version in the first tab area.
     */
    function displayResults(versionData, suggestions) {
        if (!outputResults || !version1Content || !diffOutput || !analysisOutput || !suggestionsList || !outputActions) {
            console.error("Critical error: One or more output display elements are missing!");
            showError("Error displaying results. UI elements missing."); // Show error to user
            return;
        }
        outputResults.style.display = 'block';
        outputActions.style.display = 'flex'; // Show header actions (copy, export, history)
        if (outputPlaceholder) outputPlaceholder.style.display = 'none';
        clearError(); // Clear previous errors

        // --- Ensure only Version 1 container is active and visible ---
        if (versionTabsContainer) versionTabsContainer.style.display = 'none'; // Keep tabs hidden
        version1Content.classList.add('active'); // Ensure the first content area is active
        version1Content.style.display = 'block'; // Make sure it's visible

        // Hide V2/V3 content areas (redundant if done initially, but safe)
        const v2 = document.getElementById('version2');
        const v3 = document.getElementById('version3');
        if(v2) v2.style.display = 'none';
        if(v3) v3.style.display = 'none';

        // --- Populate the single result elements ---
        diffOutput.innerHTML = versionData.diffHtml;
        diffOutput.scrollTop = 0;

        const analysis = versionData.analysis;
        analysisOutput.innerHTML = `
            <div>Words: <span>${analysis.wordCount}</span></div>
            <div>Reading Time: <span>${analysis.readingTime}</span></div>
            <div>Readability: <span title="Estimated Grade Level">${analysis.readabilityScore}</span></div>
            <div>Keyword Density: <span title="Count (% of total words)">${analysis.keywordDensity}</span></div>
            <div>Tone Check: <span title="Compared to target tone">${analysis.toneConsistency}</span></div>
        `;

        // --- Clear unused elements (just in case) ---
        const diffOutput2 = document.getElementById('diffOutput2');
        const diffOutput3 = document.getElementById('diffOutput3');
        const analysis2 = document.getElementById('analysis2');
        const analysis3 = document.getElementById('analysis3');
        if(diffOutput2) diffOutput2.innerHTML = '';
        if(diffOutput3) diffOutput3.innerHTML = '';
        if(analysis2) analysis2.innerHTML = '';
        if(analysis3) analysis3.innerHTML = '';

        // Remove per-version copy buttons if they exist
        version1Content.querySelectorAll('.btn[onclick*="copyVersionContent"]').forEach(btn => btn.remove());
        // (No need to query for V2/V3 buttons as those containers are hidden)


        // Populate Suggestions
        suggestionsList.innerHTML = suggestions.map(s => `<li>${s}</li>`).join('');
        if (suggestions.length === 0) {
             suggestionsList.innerHTML = '<li>No specific suggestions generated.</li>';
        }

        // Scroll results into view
        outputResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // --- UI Helper Functions ---

    function showLoading(show) {
        // ... (Keep existing showLoading function) ...
        isLoading = show;
        if (show) {
            if (btnText) btnText.style.display = 'none';
            if (btnLoader) btnLoader.style.display = 'inline-block';
            if (enhanceBtn) enhanceBtn.disabled = true;
            if (fab) { fab.disabled = true; fab.style.opacity = '0.7'; fab.style.cursor = 'not-allowed'; }
            if (outputLoading) outputLoading.style.display = 'flex';
        } else {
            if (btnText) btnText.style.display = 'inline';
            if (btnLoader) btnLoader.style.display = 'none';
            if (enhanceBtn) enhanceBtn.disabled = false;
            if (fab) { fab.disabled = false; fab.style.opacity = '1'; fab.style.cursor = 'pointer'; }
            if (outputLoading) outputLoading.style.display = 'none';
        }
        // ...
    }

    function showError(message, elementToFocus = null) {
        // ... (Keep existing showError function, ensure it hides results/actions) ...
        if (!errorMessageDetail || !outputError) return;
        errorMessageDetail.textContent = message;
        outputError.style.display = 'block';
        if (outputResults) outputResults.style.display = 'none';
        if (outputLoading) outputLoading.style.display = 'none';
        if (outputActions) outputActions.style.display = 'none'; // Hide actions on error
        if (versionTabsContainer) versionTabsContainer.style.display = 'none'; // Hide tabs on error
        outputError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (elementToFocus) { elementToFocus.focus(); }
        // ...
    }

     function showWarning(message) {
        // ... (Keep existing showWarning function) ...
        clearPreviousMessages(); // Clear previous warnings first
        if (outputError) {
            const warningDiv = document.createElement('div');
            warningDiv.className = 'warning-message form-message';
            warningDiv.style.display = 'flex';
            warningDiv.style.backgroundColor = '#fff9e6';
            warningDiv.style.borderColor = '#ffecb3';
            warningDiv.style.color = '#8a6d3b';
            warningDiv.innerHTML = `<i class="fas fa-exclamation-triangle" style="margin-right: 10px;"></i> <span>${escapeHtml(message)}</span>`;
            outputError.parentNode.insertBefore(warningDiv, outputError);
        } else { console.warn("Warning:", message); }
        // ...
     }

    function clearError() {
        if (outputError) outputError.style.display = 'none';
        if (errorMessageDetail) errorMessageDetail.textContent = '';
    }

     function clearPreviousMessages() {
         if (outputError) outputError.style.display = 'none';
         // Remove any dynamically added warning messages
         document.querySelectorAll('.warning-message').forEach(el => el.remove());
     }

    function updateTextInfo() {
        // ... (Keep existing updateTextInfo function) ...
        if (!originalTextInput || !inputWordCount || !inputCharCount) return;
        const text = originalTextInput.value;
        const wordCount = (text.match(/\b\w+\b/g) || []).length;
        const charCount = text.length;
        inputWordCount.textContent = wordCount;
        inputCharCount.textContent = charCount;
        // ...
    }

    // --- Clipboard & Input Helpers ---
    window.pasteContent = async () => { /* ... keep existing ... */ };
    window.clearInput = () => { /* ... keep existing ... */ };

    /**
     * Handles copying the single enhanced text.
     */
    function handleCopyEnhanced() {
         if (!currentVersionData || !currentVersionData.versionText) {
             alert("Nothing to copy. Please enhance text first.");
             return;
         }
         copyToClipboard(currentVersionData.versionText, copyEnhancedBtn); // Pass the button element for feedback
    }

    /**
     * Copies text to clipboard and provides feedback on the button.
     */
    function copyToClipboard(text, buttonElement) {
        navigator.clipboard.writeText(text).then(() => {
            if (buttonElement) {
                const originalHtml = buttonElement.innerHTML; // Store original HTML (might include icon)
                const originalTitle = buttonElement.title;
                buttonElement.innerHTML = '<i class="fas fa-check"></i> Copied!';
                buttonElement.title = 'Copied!';
                buttonElement.disabled = true;
                setTimeout(() => {
                    buttonElement.innerHTML = originalHtml;
                    buttonElement.title = originalTitle;
                    buttonElement.disabled = false;
                }, 2000);
            } else {
                // Fallback if button not passed
                alert("Content copied to clipboard!");
            }
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Could not copy text. Browser might not support this or permissions denied.');
        });
    }


    // --- Responsive Controls Toggle ---
     window.toggleControls = () => { /* ... keep existing ... */ }
     function checkControlsVisibility() { /* ... keep existing ... */ }
     checkControlsVisibility();
     window.addEventListener('resize', checkControlsVisibility);


    // --- Export Functionality (Adapted for Single Version) ---
    window.exportContent = (format) => {
        // ... (Keep exportContent function using currentVersionData - from previous answer)
        if (!currentVersionData || !currentVersionData.versionText) {
            alert("Nothing to export yet. Please enhance text first.");
            return;
        }
        const contentToExport = currentVersionData.versionText;
        const originalContent = currentOriginalText;
        const filename = `gemcontent_enhanced_output`;
        switch (format) {
            case 'txt': downloadFile(`${filename}.txt`, contentToExport, 'text/plain'); break;
            case 'html':
                 const htmlContent = `<!DOCTYPE html><html><head><title>${filename}</title></head><body><h1>Enhanced Content</h1><pre>${escapeHtml(contentToExport)}</pre><hr><h2>Original Text</h2><pre>${escapeHtml(originalContent)}</pre></body></html>`;
                 downloadFile(`${filename}.html`, htmlContent, 'text/html'); break;
            case 'pdf': alert("PDF export not implemented."); break;
            case 'docx': alert("Word (.docx) export not implemented."); break;
            case '': break;
            default: alert(`Export format "${format}" not recognized.`);
        }
         if (exportSelect) exportSelect.value = ""; // Reset select
        // ...
    };

    function downloadFile(filename, content, mimeType) { /* ... keep existing ... */ }
    function escapeHtml(unsafe) { /* ... keep existing (corrected) ... */
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, " ").replace(/'/g, "'");
    }


    // --- Version History (Adapted for Single Version Data) ---
    function addResultToHistory(original, versionData) { /* ... keep existing (single data) ... */
        const historyEntry = {
            timestamp: new Date(),
            original: original,
            versionData: JSON.parse(JSON.stringify(versionData)) // Deep copy
        };
        versionHistory.unshift(historyEntry);
        updateHistoryList();
    }

    function updateHistoryList() { /* ... keep existing ... */
        if (!historyList) return;
        if (versionHistory.length === 0) { historyList.innerHTML = '<p>No history available yet.</p>'; return; }
        historyList.innerHTML = versionHistory.map((entry, index) => `
            <div class="history-item" data-index="${index}">
                <strong>${entry.timestamp.toLocaleString()}</strong> - ${escapeHtml(entry.original.substring(0, 50))}...
                <button class="btn btn-secondary btn-small" onclick="loadHistoryItem(${index})"><i class="fas fa-eye"></i> View</button> <!-- Changed icon -->
                <button class="btn btn-secondary btn-small" onclick="compareHistoryItem(${index})"><i class="fas fa-exchange-alt"></i> Compare</button>
            </div>
        `).join('');
    }

    window.showVersionHistory = () => { /* ... keep existing ... */
        updateHistoryList();
        if(versionHistoryModal) versionHistoryModal.style.display = 'block';
    };
    window.closeModal = (modalId) => { /* ... keep existing ... */
         const modal = document.getElementById(modalId);
         if (modal) {
             modal.style.display = 'none';
             const comparisonArea = document.getElementById('historyComparison');
             if(comparisonArea) { comparisonArea.innerHTML = ''; comparisonArea.style.display = 'none'; }
         }
    };

    window.loadHistoryItem = (index) => { /* ... keep existing (single data) ... */
        if (index >= 0 && index < versionHistory.length) {
            const entry = versionHistory[index];
            currentOriginalText = entry.original;
            currentVersionData = entry.versionData;
            if(originalTextInput) originalTextInput.value = currentOriginalText;
            updateTextInfo();
            displayResults(currentVersionData, generatePlaceholderSuggestions(currentVersionData));
            closeModal('versionHistoryModal');
            const toolElement = document.getElementById('rewriter-tool');
            if(toolElement) toolElement.scrollIntoView({ behavior: 'smooth' });
        }
    };

    window.compareHistoryItem = (index) => { /* ... keep existing placeholder ... */
         alert(`Comparison feature for history item ${index + 1} is not fully implemented.`);
         const comparisonArea = document.getElementById('historyComparison');
         if (comparisonArea && index >= 0 && index < versionHistory.length) {
              const entry = versionHistory[index];
              comparisonArea.innerHTML = `<h4>Comparing: ${entry.timestamp.toLocaleString()}</h4>
                                          <p><strong>Original:</strong><br><pre>${escapeHtml(entry.original)}</pre></p>
                                          <p><strong>Version (Start):</strong><br><pre>${escapeHtml(entry.versionData?.versionText.substring(0, 300))}...</pre></p>
                                          <p><em>(Full comparison logic needed here)</em></p>
                                          <button class="btn btn-secondary btn-small" onclick="this.parentElement.style.display='none'; this.parentElement.innerHTML='';">Close Comparison</button>`;
              comparisonArea.style.display = 'block'; // Show the comparison area
         }
    };

    // Keep modal closing logic
    window.onclick = function(event) { /* ... keep existing ... */
        if (event.target == versionHistoryModal) { closeModal('versionHistoryModal'); }
    };


}); // End DOMContentLoaded