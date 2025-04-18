// server.js (Combined & Refined - Updated to serve home.html by default)
require('dotenv').config(); // Load .env file first
const express = require('express');
const path = require('path'); // Used for serving static files
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

// --- Basic Setup ---
const app = express();
const port = process.env.PORT || 3000; // Use env variable or default

// --- Gemini API Setup ---
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("CRITICAL ERROR: GEMINI_API_KEY environment variable not found.");
    console.error("Ensure you have a .env file in the project root with GEMINI_API_KEY=YOUR_ACTUAL_KEY");
    process.exit(1); // Exit if key is missing
}

let genAI;
let model;
try {
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash" // Or your preferred, most compatible model
        // Ensure this model is available and enabled in your Google Cloud project
    });
    console.log("Gemini AI Client Initialized Successfully.");
} catch (initError) {
    console.error("CRITICAL ERROR: Failed to initialize GoogleGenerativeAI.");
    console.error("Possible causes: Invalid API Key format, network issues during init.");
    console.error("Error details:", initError);
    process.exit(1);
}


// --- Middleware (Order Matters!) ---
// 1. Serve static files (HTML, CSS, JS) from the 'public' directory
//    Make absolutely sure this path is correct relative to where you run `node server.js`
//    *** MODIFIED: Added 'index' option to serve 'home.html' as the default file for '/' ***
app.use(express.static(path.join(__dirname, 'public'), { index: 'home.html' }));
console.log(`Serving static files from: ${path.join(__dirname, 'public')}`);
console.log(`Default root file set to: home.html`);

// 2. Parse JSON request bodies (Must come before routes that use req.body)
app.use(express.json({ limit: '50kb' })); // Set a reasonable payload limit

// --- Shared Safety Settings ---
const defaultSafetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// --- Centralized Error Handling Function ---
function handleApiError(res, error, toolName) {
    console.error(`Error during ${toolName} generation:`, error);
    let statusCode = 500;
    let errorMessage = `Failed to generate ${toolName}.`;

    if (error.message) {
        errorMessage += ` Details: ${error.message}`;
    }
    // Add specific checks based on potential errors
    if (error.message && error.message.includes('API key not valid')) {
        errorMessage = 'Server Error: Invalid API Key configured.';
        statusCode = 500; // Internal server error
    } else if (error.message && error.message.includes('permission')) {
        errorMessage = 'Server Error: API Key lacks permissions or API not enabled.';
        statusCode = 500;
    } else if (error.response && error.response.status === 429) {
        errorMessage = 'API Limit Reached: Too many requests. Please try again later.';
        statusCode = 429;
    } else if (error.message && error.message.includes('blocked')) {
        // Errors related to safety or other blocks often come through error.message now
        errorMessage = error.message; // Use the detailed message from the API call logic
        statusCode = 400; // Bad request (problem with input/prompt) or 500 if server issue
    } else if (error.message && error.message.includes('Prompt is required')) {
        statusCode = 400; // Bad request from client
        errorMessage = error.message;
    } else if (error.message && error.message.includes('Missing required fields')) {
        statusCode = 400; // Bad request from client
        errorMessage = error.message;
    }

    res.status(statusCode).json({ error: errorMessage });
}

// --- Helper Function to Call Gemini and Handle Response (Refactored for Reuse) ---
async function callGeminiModel(prompt, toolName) {
    try {
        console.log(`Sending request to Gemini API (${toolName})...`);
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            safetySettings: defaultSafetySettings,
            // generationConfig // Add specific config here if needed per tool
        });

        const response = result.response;

        // --- Standard response checking ---
        if (!response || !response.candidates || response.candidates.length === 0) {
            const blockReason = response?.promptFeedback?.blockReason || 'Unknown reason (no candidates)';
            const safetyRatings = response?.promptFeedback?.safetyRatings?.map(r => `${r.category}: ${r.probability}`).join(', ') || 'No details';
            console.warn(`Gemini API blocked/failed (${toolName}). Reason: ${blockReason}`, response?.promptFeedback);
            throw new Error(`Content generation failed or was blocked. Reason: ${blockReason}. [Details: ${safetyRatings}]`);
        }

        const candidate = response.candidates[0];
        const finishReason = candidate.finishReason;
        let generatedText = null;
        let warningMessage = null;
        let isIncomplete = false;

        // Process only if finish reason is acceptable
        if (finishReason === 'STOP' || finishReason === 'MAX_TOKENS') {
            if (candidate.content?.parts?.length > 0) {
                generatedText = candidate.content.parts[0].text;
                isIncomplete = (finishReason === 'MAX_TOKENS');
                if (isIncomplete) warningMessage = "Output may be incomplete (max tokens reached).";
                console.log(`Gemini generation finished (${toolName}). Reason: ${finishReason}.`);
            } else {
                console.warn(`Gemini finished (${finishReason}) but no content found (${toolName}).`);
                throw new Error(`Generation finished (${finishReason}) but no content returned.`);
            }
        } else { // Handle other non-OK finish reasons (SAFETY, RECITATION, OTHER)
            console.warn(`Gemini finished unexpectedly (${toolName}). Reason: ${finishReason}`, candidate.safetyRatings);
            let errorMessage = `Content generation stopped unexpectedly. Reason: ${finishReason}.`;
             if (candidate.safetyRatings) {
                 errorMessage += ` Safety Issues: ${candidate.safetyRatings.map(r => `${r.category}: ${r.probability}`).join(', ')}`;
             }
            throw new Error(errorMessage); // Throw specific error for safety/other stops
        }

        return { generatedText, isIncomplete, warningMessage };

    } catch (error) {
        // Re-throw the error to be caught by the route handler's catch block
        // This keeps the specific error context (API key, block reason etc.)
        throw error;
    }
}


// --- Helper Function: Build Product Description Prompt (Keep as is) ---
// Note: The actual implementation was not provided in the original prompt.
function buildProductDescriptionGeminiPrompt(data) {
    // Placeholder: Replace with your actual prompt building logic
    console.log("Building product description prompt with data:", data);
    let prompt = `Generate 3 product descriptions for a product named "${data.productName}" in the category "${data.productCategory}".\n`;
    prompt += `Key Features:\n- ${data.features.join('\n- ')}\n`;
    prompt += `Key Benefits:\n- ${data.benefits.join('\n- ')}\n`;
    if (data.targetAudience) prompt += `Target Audience: ${data.targetAudience}\n`;
    if (data.tone) prompt += `Tone: ${data.tone}\n`;
    prompt += `Keywords: ${data.keywords || 'general'}\n`;
    prompt += `Include a call to action. Generate varied descriptions focusing on different angles (e.g., features, benefits, problem/solution).\n`;
    prompt += `Desired output format: Just the description text, separated by "\\n---\\n".`;
    return prompt;
}

// ======================================================
// --- API Endpoint for Product Description Generation ---
// ======================================================
app.post('/generate-descriptions', async (req, res) => {
    const toolName = "Product Descriptions";
    console.log(`Received request at /generate-descriptions`);
    try {
        const data = req.body;
        // --- Server-Side Validation ---
        if (!data || !data.productName || !data.productCategory || !data.features || !Array.isArray(data.features) || data.features.length === 0 || !data.benefits || !Array.isArray(data.benefits) || data.benefits.length === 0) {
            console.log(`Validation failed (${toolName}): Missing required fields or incorrect type`, data);
            // Throw error to be caught by centralized handler
            throw new Error('Missing required fields: Product Name, Category, Features (array), and Benefits (array) are needed.');
        }
        const prompt = buildProductDescriptionGeminiPrompt(data);
        const result = await callGeminiModel(prompt, toolName);

        res.json({
            descriptionText: result.generatedText, // Key expected by this frontend
            isIncomplete: result.isIncomplete,
            warning: result.warningMessage
        });
    } catch (error) {
        handleApiError(res, error, toolName);
    }
});

// ==============================================
// --- API Endpoint for Newsletter Generation ---
// ==============================================
app.post('/api/generate-newsletter', async (req, res) => {
    const toolName = "Newsletter";
    console.log(`Received request at /api/generate-newsletter`);
    try {
        const { prompt } = req.body;
        if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
            console.log(`Validation failed (${toolName}): Missing or invalid prompt.`);
            throw new Error('Prompt is required.');
        }
        const result = await callGeminiModel(prompt, toolName);

        res.json({
            generatedContent: result.generatedText, // Key expected by this frontend
            isIncomplete: result.isIncomplete,
            warning: result.warningMessage
        });
    } catch (error) {
        handleApiError(res, error, toolName);
    }
});

// ==============================================
// --- API Endpoint for Text Enhancer Generation ---
// ==============================================
app.post('/api/enhance-text', async (req, res) => {
    const toolName = "Text Enhancer";
    console.log(`Received request at /api/enhance-text`);
    try {
        const { prompt } = req.body; // Expects { prompt: "..." } from the frontend
        if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
            console.log(`Validation failed (${toolName}): Missing or invalid prompt.`);
            throw new Error('Prompt is required.'); // Caught by handleApiError
        }

        // Call the secure Gemini helper function
        const result = await callGeminiModel(prompt, toolName);

        // Send the response back to the frontend
        res.json({
            generatedContent: result.generatedText, // Key expected by this frontend
            isIncomplete: result.isIncomplete,
            warning: result.warningMessage
        });

    } catch (error) {
        // Use the centralized error handler
        handleApiError(res, error, toolName);
    }
});

// ==========================================
// --- API Endpoint for FAQ Generation ---
// ==========================================
app.post('/api/generate-faqs', async (req, res) => {
    const toolName = "FAQ Generator";
    console.log(`Received request at /api/generate-faqs`);
    try {
        const { prompt } = req.body; // Expects { prompt: "..." } from the frontend JS
        if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
            console.log(`Validation failed (${toolName}): Missing or invalid prompt.`);
             throw new Error('Prompt is required and cannot be empty.'); // Let handleApiError manage it
        }

        // Call the secure Gemini helper function
        const result = await callGeminiModel(prompt, toolName);

        // Send the successful response back to the frontend
        res.json({
            generatedText: result.generatedText, // Key names match what the frontend JS now expects
            isIncomplete: result.isIncomplete,
            warning: result.warningMessage
        });

    } catch (error) {
        // Use the centralized error handler
        handleApiError(res, error, toolName);
    }
});

// ==================================================
// --- API Endpoint for Keyword Research Generation ---
// ==================================================
app.post('/api/research-keywords', async (req, res) => {
    const toolName = "Keyword Research";
    console.log(`Received request at /api/research-keywords`);
    try {
        const { prompt } = req.body; // Expects { prompt: "..." } from the frontend JS
        if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
            console.log(`Validation failed (${toolName}): Missing or invalid prompt.`);
             throw new Error('Prompt is required and cannot be empty.'); // Use handleApiError
        }

        // Call the secure Gemini helper function
        const result = await callGeminiModel(prompt, toolName);

        // Log the raw text received from Gemini for debugging JSON issues
        console.log(`--- RAW Gemini Response Text (${toolName}) ---`);
        console.log(result.generatedText ? result.generatedText.substring(0, 1000) + "..." : "[No Text Received]"); // Log snippet
        console.log(`--- END RAW Gemini Response Text ---`);
        console.log(`Response Incomplete (Max Tokens?): ${result.isIncomplete}`);

        if (!result.generatedText || typeof result.generatedText !== 'string' || result.generatedText.trim() === '') {
            console.error(`Gemini returned empty or invalid text for ${toolName}. Incomplete: ${result.isIncomplete}`);
             throw new Error(result.warning || 'AI model returned empty content.'); // Use handleApiError
        }

        // Attempt to clean and parse the JSON string returned by Gemini
        let parsedData;
        let jsonString = result.generatedText.trim(); // Start with trimmed text

        // Attempt to extract only the JSON object part (handles common extra text)
        const startIndex = jsonString.indexOf('{');
        const endIndex = jsonString.lastIndexOf('}');

        if (startIndex !== -1 && endIndex > startIndex) {
            jsonString = jsonString.substring(startIndex, endIndex + 1);
            console.log(`Extracted potential JSON substring (length: ${jsonString.length}). Attempting parse...`);
        } else {
             // Check for markdown code block ```json ... ```
             const mdJsonMatch = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
             if (mdJsonMatch && mdJsonMatch[1]) {
                 jsonString = mdJsonMatch[1].trim();
                 console.log(`Extracted potential JSON from Markdown block (length: ${jsonString.length}). Attempting parse...`);
             } else {
                 console.warn(`Could not reliably find JSON object markers {} or Markdown block in the response for ${toolName}. Parsing original text may fail.`);
             }
        }


        try {
            // Parse the (potentially cleaned) string into a JavaScript object
            parsedData = JSON.parse(jsonString);

            // **Crucial Validation:** Check if the parsed object has the expected structure
            if (typeof parsedData !== 'object' || parsedData === null ||
                !Array.isArray(parsedData.primary) || !Array.isArray(parsedData.longTail) ||
                !Array.isArray(parsedData.questions) || !Array.isArray(parsedData.lsi))
            {
                 console.error(`Parsed data for ${toolName} is missing required keys or they are not arrays.`);
                 console.error("Parsed Object Keys:", parsedData ? Object.keys(parsedData) : "null");
                 // Throw an error to be caught below, providing specific feedback
                 throw new Error('Parsed data does not match expected keyword structure (missing primary, longTail, questions, or lsi array keys). Check AI response format.');
            }

        } catch (parseError) {
            console.error(`Error parsing JSON response from Gemini (${toolName}):`, parseError);
            console.error("String that failed parsing:", jsonString.substring(0, 1000) + "..."); // Log snippet
            // Throw a new error to be handled by handleApiError
            throw new Error(`Failed to process AI response: Invalid JSON format received. Check server logs. Raw snippet: ${jsonString.substring(0, 100)}`);
        }

        // If parsing and validation succeeded:
        console.log(`Successfully parsed keywords for ${toolName}.`);
        // Send the PARSED JavaScript object back to the frontend
        res.json({
            data: parsedData, // The actual keyword data object
            isIncomplete: result.isIncomplete, // Pass along the incompleteness flag
            warning: result.warningMessage // Pass along any warnings from the API call
        });

    } catch (error) {
        // Catches errors from callGeminiModel, validation, or parsing
        handleApiError(res, error, toolName);
    }
});


// ===================================================
// --- API Endpoint for SEO Meta (Title/Desc) Generation ---
// ===================================================
app.post('/api/generate-seo-meta', async (req, res) => {
    const toolName = "SEO Meta Generator";
    console.log(`Received request at /api/generate-seo-meta`);
    try {
        const { prompt } = req.body; // Expects { prompt: "..." } from the frontend JS
        if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
            console.log(`Validation failed (${toolName}): Missing or invalid prompt.`);
            throw new Error('Prompt is required.'); // Use handleApiError
        }

        // Call the secure Gemini helper function
        const result = await callGeminiModel(prompt, toolName);

        // Log raw response for debugging
        console.log(`--- RAW Gemini Response Text (${toolName}) ---`);
        console.log(result.generatedText ? result.generatedText.substring(0, 1000) + "..." : "[No Text Received]");
        console.log(`--- END RAW Gemini Response Text ---`);
        console.log(`Response Incomplete (Max Tokens?): ${result.isIncomplete}`);

        if (!result.generatedText || typeof result.generatedText !== 'string' || result.generatedText.trim() === '') {
            console.error(`Gemini returned empty or invalid text for ${toolName}. Incomplete: ${result.isIncomplete}`);
             throw new Error(result.warning || 'AI model returned empty content.'); // Use handleApiError
        }

        // Attempt to clean and parse the JSON ARRAY string
        let parsedData;
        let jsonString = result.generatedText.trim();

        // Attempt to extract only the JSON array part `[...]`
        const startIndex = jsonString.indexOf('[');
        const endIndex = jsonString.lastIndexOf(']');

        if (startIndex !== -1 && endIndex > startIndex) {
            jsonString = jsonString.substring(startIndex, endIndex + 1);
            console.log(`Extracted potential JSON array substring (length: ${jsonString.length}). Attempting parse...`);
        } else {
            // Check for markdown code block ```json ... ```
            const mdJsonMatch = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
            if (mdJsonMatch && mdJsonMatch[1]) {
                jsonString = mdJsonMatch[1].trim();
                // Ensure it starts/ends with brackets if it's supposed to be an array
                if (!jsonString.startsWith('[') || !jsonString.endsWith(']')) {
                    console.warn(`Markdown block extracted for ${toolName} doesn't look like an array.`);
                } else {
                     console.log(`Extracted potential JSON array from Markdown block (length: ${jsonString.length}). Attempting parse...`);
                }
            } else {
                 console.warn(`Could not reliably find JSON array markers [] or Markdown block in the response for ${toolName}. Parsing original text may fail.`);
            }
        }


        try {
            parsedData = JSON.parse(jsonString);

            // **Crucial Validation:** Check if it's an array and contains expected objects
            if (!Array.isArray(parsedData)) {
                throw new Error('Parsed data is not an array as expected.');
            }
            // Optional: More strict validation of array items
            if (parsedData.length > 0) {
                const firstItem = parsedData[0];
                if (typeof firstItem !== 'object' || firstItem === null || typeof firstItem.title !== 'string' || typeof firstItem.description !== 'string') {
                     console.warn(`Parsed array items for ${toolName} might have incorrect structure (expected {title: string, description: string}).`);
                     // Consider filtering invalid items or throwing an error based on strictness needed
                }
            }

        } catch (parseError) {
            console.error(`Error parsing JSON array response from Gemini (${toolName}):`, parseError);
            console.error("String that failed parsing:", jsonString.substring(0, 1000) + "...");
             throw new Error(`Failed to process AI response: Invalid JSON array format received. Check server logs. Raw snippet: ${jsonString.substring(0, 100)}`);
        }

        // If parsing and validation succeeded:
        console.log(`Successfully parsed ${parsedData.length} SEO meta pairs for ${toolName}.`);
        // Send the PARSED JavaScript array back to the frontend
        res.json({
            data: parsedData, // The actual array of {title, description} objects
            isIncomplete: result.isIncomplete,
            warning: result.warningMessage
        });

    } catch (error) {
        // Catches errors from callGeminiModel, validation, or parsing
        handleApiError(res, error, toolName);
    }
});


// ====================================================
// --- API Endpoint for Social Media Post Generation ---
// ====================================================
app.post('/api/generate-social-post', async (req, res) => {
    const toolName = "Social Post Creator";
    console.log(`Received request at /api/generate-social-post`);
    try {
        const { prompt } = req.body; // Expects { prompt: "..." } from frontend
        if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
            console.log(`Validation failed (${toolName}): Missing or invalid prompt.`);
            throw new Error('Prompt is required.'); // Use handleApiError
        }

        // Call the secure Gemini helper function
        const result = await callGeminiModel(prompt, toolName);

        // Log raw response for debugging JSON
        console.log(`--- RAW Gemini Response Text (${toolName}) ---`);
        console.log(result.generatedText ? result.generatedText.substring(0, 1000) + "..." : "[No Text Received]");
        console.log(`--- END RAW Gemini Response Text ---`);
        console.log(`Response Incomplete (Max Tokens?): ${result.isIncomplete}`);

        if (!result.generatedText || typeof result.generatedText !== 'string' || result.generatedText.trim() === '') {
            console.error(`Gemini returned empty or invalid text for ${toolName}. Incomplete: ${result.isIncomplete}`);
            throw new Error(result.warning || 'AI model returned empty content.'); // Use handleApiError
        }

        // Attempt to clean and parse the JSON string (expecting an object with a "variations" array)
        let parsedData;
        let jsonString = result.generatedText.trim();

        // Attempt to extract only the JSON object part `{...}`
        const startIndex = jsonString.indexOf('{');
        const endIndex = jsonString.lastIndexOf('}');

        if (startIndex !== -1 && endIndex > startIndex) {
            jsonString = jsonString.substring(startIndex, endIndex + 1);
            console.log(`Extracted potential JSON object substring (length: ${jsonString.length}). Attempting parse...`);
        } else {
             // Check for markdown code block ```json ... ```
             const mdJsonMatch = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
             if (mdJsonMatch && mdJsonMatch[1]) {
                 jsonString = mdJsonMatch[1].trim();
                 console.log(`Extracted potential JSON from Markdown block (length: ${jsonString.length}). Attempting parse...`);
             } else {
                 console.warn(`Could not reliably find JSON object markers {} or Markdown block in the response for ${toolName}. Parsing original text may fail.`);
             }
        }

        try {
            parsedData = JSON.parse(jsonString);

            // **Crucial Validation:** Check if it has the 'variations' array
            if (typeof parsedData !== 'object' || parsedData === null || !Array.isArray(parsedData.variations)) {
                console.error(`Parsed data for ${toolName} is missing the 'variations' array.`);
                console.error("Parsed Object Keys:", parsedData ? Object.keys(parsedData) : "null");
                throw new Error('Parsed data does not match expected structure (missing "variations" array). Check AI response format.');
            }

            // Optional: Validate items within the array if needed (e.g., ensure each item has 'main_copy')
            if (parsedData.variations.length > 0) {
                 const firstVariation = parsedData.variations[0];
                 if (typeof firstVariation !== 'object' || firstVariation === null || typeof firstVariation.main_copy !== 'string') {
                    console.warn(`Parsed variation items for ${toolName} might have incorrect structure.`);
                 }
            }

        } catch (parseError) {
            console.error(`Error parsing JSON response from Gemini (${toolName}):`, parseError);
            console.error("String that failed parsing:", jsonString.substring(0, 1000) + "...");
            throw new Error(`Failed to process AI response: Invalid JSON format received. Check server logs. Raw snippet: ${jsonString.substring(0, 100)}`);
        }

        // If parsing and validation succeeded:
        console.log(`Successfully parsed ${parsedData.variations.length} social post variations for ${toolName}.`);
        // Send the PARSED "variations" array back to the frontend
        res.json({
            data: parsedData.variations, // Send the array directly
            isIncomplete: result.isIncomplete,
            warning: result.warningMessage
        });

    } catch (error) {
        // Catches errors from callGeminiModel, validation, or parsing
        handleApiError(res, error, toolName);
    }
});

// ==========================================
// --- API Endpoint for Domain Generation ---
// ==========================================
app.post('/api/generate-domains', async (req, res) => {
    const toolName = "Domain Generator";
    console.log(`Received request at /api/generate-domains`);
    try {
        const { prompt } = req.body; // Expects { prompt: "..." } from frontend
        if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
            console.log(`Validation failed (${toolName}): Missing or invalid prompt.`);
            throw new Error('Prompt is required.'); // Use handleApiError
        }

        // Call the secure Gemini helper function to get the *text* suggestions
        const result = await callGeminiModel(prompt, toolName);

        // Log raw response for debugging parsing issues
        console.log(`--- RAW Gemini Response Text (${toolName}) ---`);
        console.log(result.generatedText ? result.generatedText.substring(0, 1000) + "..." : "[No Text Received]");
        console.log(`--- END RAW Gemini Response Text ---`);

        if (!result.generatedText || typeof result.generatedText !== 'string' || result.generatedText.trim() === '') {
            console.error(`Gemini returned empty or invalid text for ${toolName}. Incomplete: ${result.isIncomplete}`);
            throw new Error(result.warning || 'AI model returned empty content.'); // Use handleApiError
        }

        // Send the raw generated text back to the frontend for processing
        res.json({
            generatedText: result.generatedText, // Frontend expects this key
            isIncomplete: result.isIncomplete,
            warning: result.warningMessage
        });

    } catch (error) {
        // Catches errors from callGeminiModel or validation
        handleApiError(res, error, toolName);
    }
});


// ============================================
// --- API Endpoint for Domain Availability ---
// ============================================
// IMPORTANT: Requires a real implementation (WHOIS library or 3rd party API).
// The placeholder method is for testing/development ONLY.
// Example using 'whois-json' (npm install whois-json) is commented out below.
// You might need to install it: npm install whois-json

// const whois = require('whois-json'); // <-- Uncomment if using whois-json

app.get('/api/check-availability', async (req, res) => {
    const domainName = req.query.domain; // Get domain from query param ?domain=example.com

    if (!domainName || typeof domainName !== 'string' || domainName.length < 3 || !domainName.includes('.')) {
        return res.status(400).json({ error: 'Invalid or missing domain name parameter (e.g., ?domain=example.com).' });
    }

    console.log(`Checking availability for: ${domainName}`);

    try {
        // --- METHOD 1: Using a WHOIS Library (Example: whois-json) ---
        // Uncomment the 'require' line above and the block below if using this library.
        // Note: Free WHOIS lookups can be rate-limited, slow, or unreliable. Might give false negatives/positives.

        /*
        console.log(`Using whois-json library to check ${domainName}...`);
        const results = await whois(domainName, { follow: 1, verbose: false, timeout: 7000 }); // 7 sec timeout
        // Basic check: If common fields exist, assume it's taken. This is NOT foolproof.
        const isLikelyTaken = results && (
                                results.domainName ||
                                results.registrar ||
                                results.creationDate ||
                                results.updatedDate ||
                                results.expiresDate || // Added expiry date check
                                (results.nameServers && results.nameServers.length > 0) || // Check if nameservers array has entries
                                (results.domainStatus && results.domainStatus.toLowerCase().includes('ok') === false) // Status might indicate issues or redemption period
                             );
        console.log(`WHOIS likely taken status for ${domainName}: ${isLikelyTaken}`, results); // Log results for debugging
        res.json({ available: !isLikelyTaken });
        */

        // --- METHOD 2: Using a Third-Party Domain API (Recommended for Reliability) ---
        // Replace this section with the actual API call to your chosen provider
        // (e.g., Namecheap, GoDaddy, Domainr API). You'll need their SDK or to use fetch.
        // You will likely need an API key for these services, stored securely in .env

        /*
        const DOMAIN_API_KEY = process.env.DOMAIN_CHECK_API_KEY;
        if (!DOMAIN_API_KEY) {
            console.error("DOMAIN_CHECK_API_KEY not found in .env for third-party check.");
             throw new Error("Domain availability check service is not configured.");
        }
        const DOMAIN_API_URL = `https://api.exampledomainchecker.com/v1/check?apiKey=${DOMAIN_API_KEY}&domain=${encodeURIComponent(domainName)}`; // Replace with actual URL

        console.log(`Using third-party API to check ${domainName}...`);
        const apiResponse = await fetch(DOMAIN_API_URL, { headers: { 'Accept': 'application/json' } }); // Adjust headers as needed

        if (!apiResponse.ok) {
             const errorBody = await apiResponse.text();
             console.error(`Domain Check API failed with status ${apiResponse.status}: ${errorBody}`);
            throw new Error(`Domain Check API request failed.`);
        }
        const apiData = await apiResponse.json();

        // Adapt based on the specific API's response structure
        if (typeof apiData.available === 'boolean') { // Example structure
             console.log(`API result for ${domainName}: ${apiData.available ? 'Available' : 'Taken'}`);
             res.json({ available: apiData.available });
        } else {
             console.error("Unexpected response structure from Domain Check API:", apiData);
             throw new Error("Could not determine availability from API response.");
        }
        */

        // --- METHOD 3: Placeholder/Simulation (REMOVE FOR PRODUCTION) ---
        console.warn(`\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
        console.warn(`!!! Using SIMULATED availability check for ${domainName}. !!!`);
        console.warn(`!!! Replace with a real WHOIS or API check in server.js. !!!`);
        console.warn(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n`);
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 250)); // Simulate network delay
        const tld = domainName.substring(domainName.lastIndexOf('.')).toLowerCase();
        const namePart = domainName.substring(0, domainName.lastIndexOf('.'));
        const isCommonTLD = ['.com', '.io', '.ai', '.co', '.org', '.app', '.net', '.dev'].includes(tld);
        const isShort = namePart.length < 7;
        // Simulate: common TLDs and short names are less likely available
        const takenProbability = isCommonTLD ? (isShort ? 0.9 : 0.75) : 0.5;
        const available = Math.random() > takenProbability;
        console.log(`Simulated result for ${domainName}: ${available ? 'Available' : 'Taken'}`);
        res.json({ available: available });
        // --- END PLACEHOLDER ---


    } catch (error) {
        console.error(`Error checking availability for ${domainName}:`, error);
        // Send a server error, preventing the frontend from assuming availability
        res.status(500).json({ error: 'Failed to check domain availability.', details: error.message });
    }
});

// =========================================
// --- API Endpoint for Ad Copy Generation ---
// =========================================
app.post('/api/generate-adcopy', async (req, res) => {
    const toolName = "Ad Copy";
    console.log(`Received request at /api/generate-adcopy`);
    try {
        const { prompt } = req.body;
        if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
            console.log(`Validation failed (${toolName}): Missing or invalid prompt.`);
            throw new Error('Prompt is required.');
        }
        const result = await callGeminiModel(prompt, toolName);

        res.json({
            generatedText: result.generatedText, // Key expected by this frontend
            isIncomplete: result.isIncomplete,
            warning: result.warningMessage
        });
    } catch (error) {
        handleApiError(res, error, toolName);
    }
});

// =============================================
// --- API Endpoint for Blog Post Generation ---
// =============================================
app.post('/api/generate-blogpost', async (req, res) => {
    const toolName = "Blog Post";
    console.log(`Received request at /api/generate-blogpost`);
    try {
        const { prompt } = req.body;
        if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
            console.log(`Validation failed (${toolName}): Missing or invalid prompt.`);
            throw new Error('Prompt is required.');
        }
        const result = await callGeminiModel(prompt, toolName);

        res.json({
            generatedHtml: result.generatedText, // Key expected by this frontend (often HTML)
            isIncomplete: result.isIncomplete,
            warning: result.warningMessage
        });
    } catch (error) {
        handleApiError(res, error, toolName);
    }
});

// --- Basic Root Route (Now serves home.html via express.static) ---
// This app.get('/') might now be redundant unless you want specific logic here,
// but it's harmless to keep for testing if static serving fails.
app.get('/', (req, res) => {
  // express.static should handle serving home.html before this route is reached.
  // If it's reached, static serving might have an issue, or home.html is missing.
  console.log("Root route '/' reached. This might indicate an issue if home.html was expected.");
  res.status(404).send('Home page not found. Check server configuration and ensure public/home.html exists.');
});

// --- Start Server ---
app.listen(port, () => {
    console.log(`-------------------------------------------------------`);
    console.log(`Combined AI Tools Server listening at http://localhost:${port}`);
    console.log(`Root URL '/' should now serve 'public/home.html'`);
    console.log(`API Key Loaded: ${apiKey ? 'Yes (Ends with ...' + apiKey.slice(-4) + ')' : 'NO - CRITICAL ERROR'}`);
    console.log(`Static files served from: ${path.join(__dirname, 'public')}`);
    console.log(`Access other tools via /<tool-name>.html (e.g., /blog-post.html)`);
    console.log(`-------------------------------------------------------`);
});

// --- Optional: Handle Unhandled Promise Rejections ---
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
  // Consider exiting the process in production for unhandled rejections:
  // process.exit(1);
});

// --- Optional: Handle Graceful Shutdown ---
process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    // Add any cleanup logic here (e.g., close database connections)
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    // Add any cleanup logic here
    process.exit(0);
});