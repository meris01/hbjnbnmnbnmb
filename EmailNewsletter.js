// public/js/EmailNewsletter.js

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements (Keep as is) ---
    const form = document.getElementById('newsletter-form');
    const generateBtn = document.getElementById('generate-btn');
    const btnText = generateBtn.querySelector('.btn-text');
    const loadingSpinner = generateBtn.querySelector('.loading-spinner');
    const errorMessage = document.getElementById('error-message');
    const keyPointsContainer = document.getElementById('key-points-container');
    const addKeyPointBtn = document.getElementById('add-key-point');
    const desktopViewBtn = document.getElementById('desktop-view-btn');
    const mobileViewBtn = document.getElementById('mobile-view-btn');
    const previewContainer = document.getElementById('email-preview-container');
    const previewContent = document.getElementById('email-preview-content');
    const generatedOutputSection = document.getElementById('generated-output');
    const generatedSectionsContainer = document.getElementById('generated-sections');
    const copyHtmlBtn = document.getElementById('copy-html-btn');
    const copyTextBtn = document.getElementById('copy-text-btn');
    const copyHtmlContent = document.getElementById('copy-html-content');
    const copyTextContent = document.getElementById('copy-text-content');
    const subjectScoreEl = document.getElementById('subject-score');
    const spamCheckEl = document.getElementById('spam-check');
    const readabilityScoreEl = document.getElementById('readability-score');
    const ctrPredictionEl = document.getElementById('ctr-prediction');
    const mobileGenerateBtn = document.getElementById('mobile-generate-btn');
    const mobilePreviewBtn = document.getElementById('mobile-preview-btn');

    // --- Backend Configuration ---
    // ** CHANGE THIS TO MATCH THE ROUTE IN YOUR server.js **
    const BACKEND_API_ENDPOINT = '/api/generate-newsletter';

    // --- State ---
    let generatedData = null;

    // --- Event Listeners (Keep as is) ---
    form.addEventListener('submit', handleSubmit);
    addKeyPointBtn.addEventListener('click', addKeyPointInput);
    desktopViewBtn.addEventListener('click', () => setPreviewMode('desktop'));
    mobileViewBtn.addEventListener('click', () => setPreviewMode('mobile'));
    generatedSectionsContainer.addEventListener('click', handleSectionCopy);
    copyHtmlBtn.addEventListener('click', () => copyToClipboard(copyHtmlContent.value, copyHtmlBtn, 'HTML'));
    copyTextBtn.addEventListener('click', () => copyToClipboard(copyTextContent.value, copyTextBtn, 'Text'));
    if (mobileGenerateBtn) mobileGenerateBtn.addEventListener('click', () => generateBtn.click());
    if (mobilePreviewBtn) mobilePreviewBtn.addEventListener('click', () => {
        previewContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    document.querySelectorAll('.premium-feature').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            alert('This is a Premium Feature! Upgrade GemContent to unlock.');
        });
    });

    // --- Core Functions ---

    function addKeyPointInput() {
        // (Keep this function as is)
        const inputCount = keyPointsContainer.querySelectorAll('textarea').length;
        if (inputCount >= 5) {
            alert("Maximum of 5 key points allowed.");
            return;
        }
        const newTextarea = document.createElement('textarea');
        newTextarea.name = 'key_points[]';
        newTextarea.rows = '2';
        newTextarea.placeholder = `Enter key point #${inputCount + 1}...`;
        keyPointsContainer.appendChild(newTextarea);
    }

    async function handleSubmit(event) {
        event.preventDefault();
        clearResultsAndErrors();
        showLoading(true);
        generatedData = null;

        // --- Form Data Retrieval (Keep as is) ---
        const formData = new FormData(form);
        const purpose = formData.get('purpose');
        const industry = formData.get('industry');
        const subjectIdea = formData.get('subject');
        const abTestSubject = formData.get('ab-test-subject') === 'on';
        const tone = formData.get('tone');
        const audience = formData.get('audience');
        const length = formData.get('length');
        const ctaText = formData.get('cta-text');
        const ctaLink = formData.get('cta-link');
        const keyPoints = Array.from(formData.getAll('key_points[]'))
                              .map(p => p.trim())
                              .filter(p => p !== '');

        // --- Basic Validation (Keep as is) ---
        if (!purpose || !subjectIdea || keyPoints.length === 0 || !tone || !length) {
            showError("Please fill in all required fields (Purpose, Subject Idea, Key Points, Tone, Length).");
            showLoading(false);
            return;
        }

        // --- Construct Prompt Locally (Keep as is) ---
        const prompt = buildGeminiPrompt(
            purpose, industry, subjectIdea, abTestSubject, keyPoints,
            tone, audience, length, ctaText, ctaLink
        );
        // console.log("Constructed Prompt (sending to backend):\n", prompt); // Optional Debug

        // --- *** Call Backend API *** ---
        try {
            // Use the dedicated function to call the backend
            const backendResponse = await callBackendAPI(prompt);
            // console.log("Received from Backend:", backendResponse); // Debug

            // Backend should send { generatedContent: '...', isIncomplete: bool, warning: '...' } or { error: '...' }
            if (backendResponse.error) {
                 // Handle errors reported by the backend (API issues, validation, etc.)
                showError(`Backend Error: ${backendResponse.error}`);

            } else if (backendResponse.generatedContent) {
                // Process successful response from backend
                const generatedText = backendResponse.generatedContent;
                generatedData = parseGeminiResponse(generatedText); // Parse the JSON *string*

                if (generatedData) {
                     // Successfully parsed the structured data
                    renderGeneratedContent(generatedData);
                    updatePreview(generatedData);
                    updateOptimizationPlaceholders(generatedData);
                    generatedOutputSection.style.display = 'block';

                    // Display warning if content might be incomplete
                    if (backendResponse.isIncomplete || backendResponse.warning) {
                         showWarning(backendResponse.warning || "Content may be incomplete (e.g., max length reached).");
                    }

                    // Scroll to results smoothly
                     generatedOutputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

                } else {
                    // Parsing failed, but we received some text content
                    console.error("Failed to parse structured response from backend. Showing raw text.");
                    renderRawTextFallback(generatedText); // Show raw text
                    showError("Could not fully parse the AI response structure. Raw output shown below.");
                    generatedOutputSection.style.display = 'block';
                     generatedOutputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            } else {
                // Handle unexpected backend response structure (no error, no content)
                 showError("Received an unexpected response from the backend server.");
                console.error("Unexpected backend response structure:", backendResponse);
            }

        } catch (error) {
             // Catch errors from callBackendAPI (network errors, failed JSON parse of backend response)
            console.error("Frontend Error during API call:", error);
            showError(`An error occurred: ${error.message}. Check the console and ensure the backend server is running.`);
        } finally {
            showLoading(false);
        }
    }

    function buildGeminiPrompt(purpose, industry, subjectIdea, abTestSubject, keyPoints, tone, audience, length, ctaText, ctaLink) {
        // (Keep this function exactly as it was - it builds the prompt string)
        let prompt = `Generate content for an email newsletter with the following specifications:

        **Purpose:** ${purpose}
        ${industry ? `**Industry/Context:** ${industry}\n` : ''}
        **Core Subject Idea:** ${subjectIdea}
        **Key Points to Cover:**\n${keyPoints.map(p => `- ${p}`).join('\n')}
        **Desired Tone:** ${tone}
        ${audience ? `**Target Audience:** ${audience}\n` : ''}
        **Desired Length:** ${length} (Interpret this relatively for the main body content)
        ${ctaText ? `**Call to Action Button Text:** ${ctaText}\n` : ''}
        ${ctaLink ? `**Call to Action Link:** ${ctaLink}\n` : ''}

        **Output Requirements:**
        Provide the output as a single, valid JSON object. The JSON object should have the following keys:

        1.  "subject_lines": An array of strings. Include ${abTestSubject ? '2-3' : '1'} compelling subject line options. Keep them concise and engaging.
        2.  "preview_text": A short, intriguing preview text (snippet) string that complements the subject line (max 100 characters).
        3.  "greeting": A suitable greeting string (e.g., "Hi [Name]," or "Hello everyone,"). Use a placeholder like "[Name]" if personalization is implied.
        4.  "introduction": An introductory paragraph string (1-2 sentences) that grabs attention and sets the stage.
        5.  "body_sections": An array of strings. Each string is a paragraph for the main body content, expanding on the key points. Generate a number of paragraphs appropriate for the desired length. Ensure smooth transitions between points.
        6.  "cta_section": An object with two keys:
            *   "text": A short paragraph string leading into the call to action.
            *   "button_text": The text for the CTA button (use the provided "${ctaText || 'Learn More'}" or suggest a relevant one if none was provided).
        7.  "closing": A concluding paragraph string (1-2 sentences) summarizing or offering final thoughts.
        8.  "signature": A generic signature string (e.g., "Best regards,\nThe GemContent Team").

        **Example JSON Structure:**
        \`\`\`json
        {
          "subject_lines": ["Subject Option 1", "Subject Option 2"],
          "preview_text": "Short preview text here...",
          "greeting": "Hi [Name],",
          "introduction": "Introductory paragraph...",
          "body_sections": [
            "Paragraph covering point 1...",
            "Paragraph covering point 2..."
          ],
          "cta_section": {
            "text": "Ready to learn more?",
            "button_text": "Click Here"
          },
          "closing": "Final closing thoughts...",
          "signature": "Cheers,\\nYour Team Name"
        }
        \`\`\`

        Ensure the generated content is well-written, fits the specified tone, and directly addresses the key points and purpose. Use newline characters (\\n) within strings where appropriate for readability in the final email (e.g., in the signature).`;

        return prompt;
    }

    // --- Backend API Call Function ---
    // This function now handles the actual 'fetch' to your server
    async function callBackendAPI(prompt) {
        console.log(`Sending request to backend: ${BACKEND_API_ENDPOINT}`);
        try {
            const response = await fetch(BACKEND_API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Send the prompt constructed by buildGeminiPrompt
                body: JSON.stringify({ prompt: prompt })
            });

            // Try parsing JSON regardless of status code to get potential error messages from backend
            let responseData;
            try {
                responseData = await response.json();
            } catch (e) {
                // Handle non-JSON responses (like HTML error pages from server)
                 const textError = await response.text(); // Try reading body as text
                 console.error(`Backend response not valid JSON. Status: ${response.status}. Body: ${textError.substring(0, 500)}...`);
                 throw new Error(`Server returned status ${response.status}, but the response was not readable JSON.`);
            }

            if (!response.ok) {
                // Use error message from backend JSON if available, otherwise use status
                const errorMessage = responseData?.error || `Request failed with status: ${response.status}`;
                console.error("Backend API Error Response Data:", responseData);
                throw new Error(errorMessage); // Throw error to be caught by handleSubmit
            }

            // If response.ok, return the parsed JSON data
            return responseData; // e.g., { generatedContent: '...', isIncomplete: false, warning: null }

        } catch (error) {
            console.error('Error in callBackendAPI:', error);
            // Improve network error message
            if (error.message.includes('Failed to fetch') || error instanceof TypeError) {
                 throw new Error(`Network error trying to reach ${BACKEND_API_ENDPOINT}. Ensure the server is running and accessible.`);
            }
            // Re-throw other errors (like the JSON parsing error or the backend error thrown above)
            throw error;
        }
    }

    function parseGeminiResponse(text) {
        // (Keep this function as is - it parses the JSON string from backend)
        if (!text || typeof text !== 'string') {
             console.error("Invalid input to parseGeminiResponse: Expected a non-empty string.");
             return null;
        }
        try {
            const cleanedText = text.replace(/^```json\s*|```$/g, '').trim();
            const parsed = JSON.parse(cleanedText);

            // Basic structural validation
             if (parsed && Array.isArray(parsed.subject_lines) &&
                 typeof parsed.preview_text === 'string' &&
                 typeof parsed.greeting === 'string' &&
                 typeof parsed.introduction === 'string' &&
                 Array.isArray(parsed.body_sections) &&
                 typeof parsed.cta_section === 'object' &&
                 typeof parsed.cta_section.text === 'string' &&
                 typeof parsed.cta_section.button_text === 'string' &&
                 typeof parsed.closing === 'string' &&
                 typeof parsed.signature === 'string')
             {
                 return parsed;
             } else {
                 console.error("Parsed JSON from backend is missing expected keys or has incorrect types:", parsed);
                 return null;
             }
         } catch (error) {
             console.error("Failed to parse JSON response from backend:", error, "\nRaw text received:", text);
             return null;
         }
     }

    function escapeHtml(unsafe) {
         // (Keep this function as is)
        if (typeof unsafe !== 'string') return unsafe;
        // Basic escaping, consider a more robust library if complex HTML in content is possible
        return unsafe
             .replace(/&/g, "&") // Use & consistently
             .replace(/</g, "<")
             .replace(/>/g, ">")
             .replace(/"/g, "")
             .replace(/'/g, "'"); // Use numeric entity for single quote
     }

    function renderGeneratedContent(data) {
         // (Keep this function mostly as is, ensure escapeHtml is used correctly)
         generatedSectionsContainer.innerHTML = '';
         createSectionCard('Subject Lines', data.subject_lines.join('\n'), 'subject');
         createSectionCard('Preview Text', data.preview_text, 'preview');
         createSectionCard('Greeting', data.greeting, 'greeting');
         createSectionCard('Introduction', data.introduction, 'introduction');
         data.body_sections.forEach((section, index) => {
             createSectionCard(`Body Section ${index + 1}`, section, `body-${index + 1}`);
         });
         createSectionCard('Call-to-Action Text', data.cta_section.text, 'cta-text');
         createSectionCard('CTA Button Text', data.cta_section.button_text, 'cta-button');
         createSectionCard('Closing', data.closing, 'closing');
         createSectionCard('Signature', data.signature, 'signature');
         prepareCopyContent(data);
     }

    function createSectionCard(title, content, idSuffix) {
         // (Keep this function mostly as is, ensure escapeHtml is used correctly)
         const sectionDiv = document.createElement('div');
         sectionDiv.className = 'generated-section';
         const displayContent = escapeHtml(content).replace(/\n/g, '<br>'); // Escaped for display
         const copyContent = content; // Original unescaped for textarea

         sectionDiv.innerHTML = `
             <h4>
                 ${escapeHtml(title)}
                 <button class="copy-btn" data-copy-target-id="${idSuffix}" title="Copy this section">
                     <i class="far fa-copy"></i> Copy
                 </button>
             </h4>
             <div class="content" id="content-${idSuffix}">${displayContent}</div>
             <textarea class="hidden-copy-area" id="copy-${idSuffix}">${escapeHtml(copyContent)}</textarea>
             `; // Escape content for textarea value attribute for safety
         generatedSectionsContainer.appendChild(sectionDiv);
     }

    function renderRawTextFallback(rawText) {
         // (Keep this function as is)
         generatedSectionsContainer.innerHTML = '';
         const sectionDiv = document.createElement('div');
         sectionDiv.className = 'generated-section';
         sectionDiv.innerHTML = `
             <h4>Raw AI Output (Parsing Failed)</h4>
             <div class="content">
                 <pre>${escapeHtml(rawText)}</pre>
             </div>
             <textarea class="hidden-copy-area" id="copy-raw">${escapeHtml(rawText)}</textarea>
             <button class="copy-btn" data-copy-target-id="raw" title="Copy raw output">
                 <i class="far fa-copy"></i> Copy Raw Output
             </button>
         `;
         generatedSectionsContainer.appendChild(sectionDiv);
         copyHtmlBtn.disabled = true;
         copyTextBtn.disabled = true;
     }

     function prepareCopyContent(data) {
         // (Keep this function mostly as is, ensure escapeHtml is used correctly for HTML version)
         const ctaLink = document.getElementById('cta-link')?.value || '#'; // Safely access value

         // Plain Text
         let textContent = `Subject: ${data.subject_lines[0]}\n`;
         textContent += `Preview: ${data.preview_text}\n\n`;
         textContent += `${data.greeting}\n\n`;
         textContent += `${data.introduction}\n\n`;
         textContent += data.body_sections.join('\n\n') + '\n\n';
         textContent += `${data.cta_section.text}\n`;
         textContent += `[ ${data.cta_section.button_text} ] (${ctaLink})\n\n`;
         textContent += `${data.closing}\n\n`;
         textContent += `${data.signature}`;
         copyTextContent.value = textContent;

         // Basic HTML - Ensure all user-generated parts are escaped
         let htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(data.subject_lines[0])}</title></head>`;
         htmlContent += `<body style="font-family: sans-serif; line-height: 1.6;">`;
         htmlContent += `<p>${escapeHtml(data.greeting).replace(/\n/g, '<br>')}</p>`;
         htmlContent += `<p>${escapeHtml(data.introduction).replace(/\n/g, '<br>')}</p>`;
         data.body_sections.forEach(p => {
             htmlContent += `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`;
         });
         htmlContent += `<p>${escapeHtml(data.cta_section.text).replace(/\n/g, '<br>')}</p>`;
         const buttonBgColor = getComputedStyle(document.documentElement).getPropertyValue('--orange').trim() || '#fca311';
         htmlContent += `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 15px 0;"><tr><td align="center" bgcolor="${buttonBgColor}" style="border-radius: 5px;">`;
         // Escape the CTA link and the button text
         htmlContent += `<a href="${escapeHtml(ctaLink)}" target="_blank" style="font-size: 16px; font-family: sans-serif; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 5px; display: inline-block; font-weight: bold;">${escapeHtml(data.cta_section.button_text)}</a>`;
         htmlContent += `</td></tr></table>`;
         htmlContent += `<p>${escapeHtml(data.closing).replace(/\n/g, '<br>')}</p>`;
         htmlContent += `<p style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; font-size: 0.9em; color: #777;">${escapeHtml(data.signature).replace(/\n/g, '<br>')}</p>`;
         htmlContent += `</body></html>`;
         copyHtmlContent.value = htmlContent;

         copyHtmlBtn.disabled = false;
         copyTextBtn.disabled = false;
     }

     function updatePreview(data) {
         // (Keep this function mostly as is, ensure escapeHtml is used correctly)
         previewContent.innerHTML = '';
         const ctaLink = document.getElementById('cta-link')?.value || '#';

         const greetingP = document.createElement('p');
         greetingP.innerHTML = escapeHtml(data.greeting).replace(/\n/g, '<br>');
         const introP = document.createElement('p');
         introP.innerHTML = escapeHtml(data.introduction).replace(/\n/g, '<br>');
         const bodyDiv = document.createElement('div');
         data.body_sections.forEach(p => {
             const bodyP = document.createElement('p');
             bodyP.innerHTML = escapeHtml(p).replace(/\n/g, '<br>');
             bodyDiv.appendChild(bodyP);
         });
         const ctaTextP = document.createElement('p');
         ctaTextP.innerHTML = escapeHtml(data.cta_section.text).replace(/\n/g, '<br>');
         const ctaButtonA = document.createElement('a');
         ctaButtonA.href = escapeHtml(ctaLink); // Escape link
         ctaButtonA.target = "_blank";
         ctaButtonA.className = 'email-cta-button';
         ctaButtonA.textContent = data.cta_section.button_text; // Button text is usually safe, but escape if unsure
         const closingP = document.createElement('p');
         closingP.innerHTML = escapeHtml(data.closing).replace(/\n/g, '<br>');
         const signatureP = document.createElement('p');
         signatureP.className = 'email-signature';
         signatureP.innerHTML = escapeHtml(data.signature).replace(/\n/g, '<br>');

         previewContent.appendChild(greetingP);
         previewContent.appendChild(introP);
         previewContent.appendChild(bodyDiv);
         previewContent.appendChild(ctaTextP);
         const buttonWrapper = document.createElement('p');
         buttonWrapper.appendChild(ctaButtonA);
         previewContent.appendChild(buttonWrapper);
         previewContent.appendChild(closingP);
         previewContent.appendChild(signatureP);
     }

     function updateOptimizationPlaceholders(data) {
         // (Keep this function as is - placeholder logic)
          const subjectLength = data.subject_lines[0]?.length || 0;
          let subjScore = 75;
          if (subjectLength < 20) subjScore -= 10;
          if (subjectLength > 60) subjScore -= 15;
          if (subjectLength > 0 && subjectLength < 10) subjScore -= 20;
          if (/[!?]/.test(data.subject_lines[0])) subjScore += 5;
          if (/\d/.test(data.subject_lines[0])) subjScore += 5;
          subjectScoreEl.textContent = `${Math.max(0, Math.min(100, subjScore))} / 100`;

          const spamWords = ['free', 'win', 'urgent', 'cash', '$$$', 'opportunity', 'limited time', 'click here', '!!!', 'buy now', 'subscribe'];
          const emailTextLower = (copyTextContent.value || "").toLowerCase();
          let spamFound = false;
          for (const word of spamWords) {
              if (emailTextLower.includes(word)) {
                  spamFound = true;
                  break;
              }
          }
          spamCheckEl.textContent = spamFound ? 'Potential Issues' : 'Looks Clear';
          spamCheckEl.style.color = spamFound ? 'var(--orange-dark)' : 'var(--teal)';

          const wordCount = (copyTextContent.value || "").split(/\s+/).filter(Boolean).length;
          let readability = 'Medium';
          if (wordCount < 150) readability = 'Easy';
          if (wordCount > 400) readability = 'Complex';
          readabilityScoreEl.textContent = readability;

          ctrPredictionEl.textContent = `~${(Math.random() * 3 + 1).toFixed(1)}%`;
     }

    function setPreviewMode(mode) {
        // (Keep this function as is)
        if (mode === 'desktop') {
            previewContainer.classList.add('desktop-view');
            previewContainer.classList.remove('mobile-view');
            desktopViewBtn.classList.add('active');
            mobileViewBtn.classList.remove('active');
        } else {
            previewContainer.classList.remove('desktop-view');
            previewContainer.classList.add('mobile-view');
            desktopViewBtn.classList.remove('active');
            mobileViewBtn.classList.add('active');
        }
    }

    function handleSectionCopy(event) {
         // (Keep this function as is)
         const copyButton = event.target.closest('.copy-btn[data-copy-target-id]');
         if (copyButton) {
             const targetIdSuffix = copyButton.getAttribute('data-copy-target-id');
             const textArea = document.getElementById(`copy-${targetIdSuffix}`);
             if (textArea) {
                 copyToClipboard(textArea.value, copyButton, `Section '${targetIdSuffix}'`);
             } else {
                 console.error(`Textarea with id 'copy-${targetIdSuffix}' not found.`);
             }
         }
     }

    // --- Utility Functions ---

    function showLoading(isLoading) {
        // (Keep this function as is)
        if (isLoading) {
            generateBtn.disabled = true;
            if(btnText) btnText.style.display = 'none';
            if(loadingSpinner) loadingSpinner.style.display = 'inline-block';
             if(mobileGenerateBtn) mobileGenerateBtn.disabled = true;
        } else {
            generateBtn.disabled = false;
             if(btnText) btnText.style.display = 'inline';
             if(loadingSpinner) loadingSpinner.style.display = 'none';
             if(mobileGenerateBtn) mobileGenerateBtn.disabled = false;
        }
    }

    function showError(message) {
        // (Keep this function as is)
        errorMessage.innerHTML = escapeHtml(message);
        errorMessage.style.display = 'block';
        // Optionally scroll error into view
        errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function showWarning(message) {
        // Added function to show non-critical warnings (e.g., incomplete)
        const warningDiv = document.createElement('div');
        warningDiv.className = 'warning-message'; // Style this class in your CSS
        warningDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${escapeHtml(message)}`;
        // Insert after the error message container or before results
        errorMessage.parentNode.insertBefore(warningDiv, errorMessage.nextSibling);
    }


    function clearResultsAndErrors() {
        // (Keep this function as is, maybe add clearing warnings)
        errorMessage.textContent = '';
        errorMessage.style.display = 'none';
         // Remove any previous warning messages
        document.querySelectorAll('.warning-message').forEach(el => el.remove());

        generatedOutputSection.style.display = 'none';
        generatedSectionsContainer.innerHTML = '';
        previewContent.innerHTML = '<p class="placeholder-text">Your generated newsletter preview will appear here...</p>';
        subjectScoreEl.textContent = '- / 100';
        spamCheckEl.textContent = 'Pending...';
        spamCheckEl.style.color = 'inherit';
        readabilityScoreEl.textContent = 'Pending...';
        ctrPredictionEl.textContent = '~%';
        copyHtmlContent.value = '';
        copyTextContent.value = '';
        copyHtmlBtn.disabled = true;
        copyTextBtn.disabled = true;
        generatedData = null;
    }

    function copyToClipboard(text, buttonElement, type = 'Content') {
         // (Keep this function as is)
         if (!navigator.clipboard) {
             alert('Clipboard API not available. Please copy manually.');
             return;
         }
         navigator.clipboard.writeText(text).then(() => {
             const originalHtml = buttonElement.innerHTML;
             buttonElement.innerHTML = '<i class="fas fa-check"></i> Copied!';
             buttonElement.disabled = true;
             setTimeout(() => {
                 buttonElement.innerHTML = originalHtml;
                 buttonElement.disabled = false;
             }, 1500);
         }).catch(err => {
             console.error(`Failed to copy ${type}: `, err);
             const originalHtml = buttonElement.innerHTML;
             buttonElement.innerHTML = '<i class="fas fa-times"></i> Failed'; // Provide failure feedback
             setTimeout(() => {
                buttonElement.innerHTML = originalHtml;
                buttonElement.disabled = false;
             }, 2000);
         });
     }

    // --- Initial Setup ---
    setPreviewMode('desktop');
    clearResultsAndErrors();

}); // End DOMContentLoaded