// sms-generator-frontend/local_dev/script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const projectSelect = document.getElementById('project');
    // Chat Areas
    const smsChatArea = document.getElementById('sms-chat-area');
    const emailChatArea = document.getElementById('email-chat-area');
    const smsChatDisplay = document.getElementById('sms-chat-display');
    const emailChatDisplay = document.getElementById('email-chat-display');
    // Input Fields
    const smsUserInput = document.getElementById('sms-user-input');
    const emailUserInput = document.getElementById('email-user-input');
    // Send Buttons
    const smsSendButton = document.getElementById('sms-send-button');
    const emailSendButton = document.getElementById('email-send-button');
    const settingsForm = document.getElementById('settings-form');
    const marketingFileInput = document.getElementById('marketing-file');
    const smsFileInput = document.getElementById('sms-file');
    const marketingFileStatus = document.getElementById('marketing-file-status');
    const smsFileStatus = document.getElementById('sms-file-status');
    const apiKeyModalElement = document.getElementById('api-key-modal');
    const modalApiKeyInput = document.getElementById('modal-api-key-input');
    const validateKeyButton = document.getElementById('validate-key-button');
    const modalErrorMessage = document.getElementById('modal-error-message');
    const clearProjectButton = document.getElementById('clear-project-button');
    const clearSmsHistoryButton = document.getElementById('clear-sms-history-button');
    const clearEmailHistoryButton = document.getElementById('clear-email-history-button');
    const clearSettingsButton = document.getElementById('clear-settings-button');
    const clearFilesButton = document.getElementById('clear-files-button-left');
    const lengthInput = document.getElementById('length'); // SMS only
    const numResultsInput = document.getElementById('num-results');
    const downloadSmsHistoryButton = document.getElementById('download-sms-history-button');
    const downloadEmailHistoryButton = document.getElementById('download-email-history-button');
    const modeSmsRadio = document.getElementById('mode-sms');
    const modeEmailRadio = document.getElementById('mode-email');
    const emailSubjectInput = document.getElementById('email-subject'); // Email only
    const emailMessageInput = document.getElementById('email-message'); // Email only
    const modeSelectorDiv = document.querySelector('.mode-selector'); // Container for mode buttons
    const dynamicHeader = document.getElementById('dynamic-header'); // New header element

    // --- Bootstrap Modal Instance ---
    const apiKeyModal = new bootstrap.Modal(apiKeyModalElement, {
        backdrop: 'static',
        keyboard: false
    });

    // --- State ---
    let marketingData = "";
    let smsData = "";
    let isGenerating = false;
    let currentApiKey = null;
    let defaultSettingsValues = {};
    let currentMode = 'sms'; // Default mode

    // --- Configuration ---
    const LOCALSTORAGE_API_KEY_NAME = 'userApiKey';
    const LS_PROJECT_KEY = 'smsGenProject';
    const LS_MODE_KEY = 'smsGenMode';
    const LS_HISTORY_KEY_PREFIX = 'smsGenHistory_'; // smsGenHistory_sms, smsGenHistory_email
    const LS_MARKETING_FILE_STATUS_KEY = 'smsGenMarketingFileStatus';
    const LS_SMS_FILE_STATUS_KEY = 'smsGenSmsFileStatus';
    const LS_USER_INPUT_KEY_PREFIX = 'smsGenUserInput_'; // smsGenUserInput_sms, smsGenUserInput_email
    const FRONTEND_SECRET_SALT_VALUE = "BLAKE123";
    const PRODUCTION_BACKEND_BASE_URL = "https://sms-backend-generator.onrender.com";
    const LOCAL_BACKEND_BASE_URL = 'http://localhost:3000';
    const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? LOCAL_BACKEND_BASE_URL
        : PRODUCTION_BACKEND_BASE_URL;
    const GENERATE_URL = `${BASE_URL}/api/generate`;
    const VALIDATE_URL = `${BASE_URL}/api/validate-key`;

    console.log("Using Backend Base URL:", BASE_URL);
    if (FRONTEND_SECRET_SALT_VALUE === "DEV_SALT_REPLACE_IN_BUILD") {
        console.warn("Running with default development salt. Ensure build process runs for production.");
    }

    // --- SVG Icons ---
    const copyIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>`;
    const checkIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check-lg" viewBox="0 0 16 16"><path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022z"/></svg>`;

    // --- Functions ---

    // --- Hashing Function ---
    async function calculateSecretHash(apiKey, salt) {
        if (salt === "DEV_SALT_REPLACE_IN_BUILD") console.warn("Calculating hash with default development salt.");
        if (!apiKey || !salt) { console.error("Cannot calculate hash: API key or salt is missing."); return null; }
        const dataToHash = apiKey + salt;
        const encoder = new TextEncoder();
        const data = encoder.encode(dataToHash);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // --- Modal Functions ---
    function showApiKeyModal() {
        modalErrorMessage.textContent = '';
        modalErrorMessage.style.display = 'none';
        modalApiKeyInput.value = '';
        apiKeyModal.show();
        apiKeyModalElement.addEventListener('shown.bs.modal', () => modalApiKeyInput.focus(), { once: true });
    }
    function hideApiKeyModal() { apiKeyModal.hide(); }
    function handleModalInputKeydown(event) { if (event.key === 'Enter') { event.preventDefault(); handleValidateAndSaveKey(); } }
    async function handleValidateAndSaveKey() {
        const rawKey = modalApiKeyInput.value.trim();
        if (!rawKey) { modalErrorMessage.textContent = 'Please enter an API key.'; modalErrorMessage.style.display = 'block'; return; }
        const keyToValidate = rawKey.toUpperCase();
        if (keyToValidate === "DEBUG") { console.log("DEBUG keyword entered. Hiding modal."); hideApiKeyModal(); return; }
        modalErrorMessage.textContent = 'Validating...';
        modalErrorMessage.style.display = 'block';
        validateKeyButton.disabled = true;
        try {
            const secretHash = await calculateSecretHash(keyToValidate, FRONTEND_SECRET_SALT_VALUE);
            if (!secretHash) { modalErrorMessage.textContent = 'Configuration error (salt). Cannot validate key.'; modalErrorMessage.style.display = 'block'; validateKeyButton.disabled = false; return; }
            const response = await fetch(VALIDATE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': keyToValidate, 'X-Frontend-Secret': secretHash } });
            if (response.ok) {
                localStorage.setItem(LOCALSTORAGE_API_KEY_NAME, keyToValidate);
                currentApiKey = keyToValidate;
                modalErrorMessage.textContent = '';
                modalErrorMessage.style.display = 'none';
                console.log('API Key validated and saved (uppercase).');
                hideApiKeyModal();
                addMessageToChat('ai', 'API Key validated and saved successfully.'); // Removed isError=false
            } else {
                if (response.status === 403) modalErrorMessage.textContent = `Access Denied. Please ensure you are accessing from an allowed location and the key is correct.`;
                else if (response.status === 401) modalErrorMessage.textContent = `Invalid API Key provided.`;
                else { const errorData = await response.json().catch(() => ({})); modalErrorMessage.textContent = `Validation Error: ${errorData.error || response.statusText}`; }
                modalErrorMessage.style.display = 'block';
                console.warn('API Key validation failed:', response.status);
            }
        } catch (error) {
            console.error('Error validating API key:', error);
            modalErrorMessage.textContent = 'Network error during validation. Please try again.';
            modalErrorMessage.style.display = 'block';
        } finally {
            validateKeyButton.disabled = false;
        }
    }
 
    // --- UI Update Functions ---
    function updateDynamicHeader() {
        if (!dynamicHeader || !projectSelect) return; // Safety check
        const modeText = currentMode.toUpperCase();
        const projectValue = projectSelect.value;
        let projectAbbreviation = projectValue; // Default to full name if no match
        if (projectValue === "Bahama Breeze") projectAbbreviation = "BB";
        else if (projectValue === "Cheddars") projectAbbreviation = "CSK";
        else if (projectValue === "Yardhouse") projectAbbreviation = "YH";
 
        dynamicHeader.textContent = `${modeText} Mode - ${projectAbbreviation}`;
    }
 
    // --- Core Functions ---

    // --- Mode Switching ---
    function handleModeChange(newMode) {
        if (newMode === currentMode) return;

        console.log(`Switching mode from ${currentMode} to ${newMode}`);
        const oldHistoryKey = `${LS_HISTORY_KEY_PREFIX}${currentMode}`;
        const oldUserInputKey = `${LS_USER_INPUT_KEY_PREFIX}${currentMode}`;
        const newHistoryKey = `${LS_HISTORY_KEY_PREFIX}${newMode}`;
        const newUserInputKey = `${LS_USER_INPUT_KEY_PREFIX}${newMode}`;

        // Save current state before switching
        const currentChatDisplay = currentMode === 'sms' ? smsChatDisplay : emailChatDisplay;
        const currentUserInput = currentMode === 'sms' ? smsUserInput : emailUserInput;
        localStorage.setItem(oldHistoryKey, currentChatDisplay.innerHTML);
        localStorage.setItem(oldUserInputKey, currentUserInput.value);

        // Update current mode
        currentMode = newMode;

        // Toggle visibility of chat areas
        if (currentMode === 'sms') {
            smsChatArea.classList.remove('d-none');
            smsChatArea.classList.add('d-flex');
            emailChatArea.classList.add('d-none');
            emailChatArea.classList.remove('d-flex');
        } else { // email mode
            emailChatArea.classList.remove('d-none');
            emailChatArea.classList.add('d-flex');
            smsChatArea.classList.add('d-none');
            smsChatArea.classList.remove('d-flex');
        }

        // Update body class for CSS targeting (settings visibility)
        document.body.classList.remove('mode-sms-active', 'mode-email-active');
        document.body.classList.add(`mode-${currentMode}-active`);

        // Load new mode's state
        const newChatDisplay = currentMode === 'sms' ? smsChatDisplay : emailChatDisplay;
        const newUserInput = currentMode === 'sms' ? smsUserInput : emailUserInput;

        const savedHistory = localStorage.getItem(newHistoryKey);
        if (savedHistory) {
            newChatDisplay.innerHTML = savedHistory;
        } else {
            newChatDisplay.innerHTML = ''; // Clear if no history
            addWelcomeMessage(newChatDisplay, currentMode); // Add welcome message
        }
        newChatDisplay.scrollTop = newChatDisplay.scrollHeight;

        const savedInput = localStorage.getItem(newUserInputKey);
        newUserInput.value = savedInput || '';
        autoResizeTextarea(newUserInput); // Resize loaded input

        // Save the new mode
        localStorage.setItem(LS_MODE_KEY, currentMode);

        // Update settings UI
        storeDefaultSettings(); // Recalculate defaults for the new mode
        updateAllSettingsGlows(); // Update glows based on new mode's visible fields
        updateDynamicHeader(); // Update header text
 
        console.log(`Mode switched to ${currentMode}. State loaded/saved.`);
    }

    function addWelcomeMessage(displayElement, mode) {
        const welcomeDiv = document.createElement('div');
        welcomeDiv.classList.add('message', 'ai', 'alert', 'alert-info');
        welcomeDiv.setAttribute('role', 'alert');
        welcomeDiv.textContent = `Welcome to ${mode === 'sms' ? 'SMS' : 'Email'} mode! Select a project and type your request below, or use the settings on the right.`;
        displayElement.appendChild(welcomeDiv);
    }

    // --- Chat Message Handling (Targets correct display) ---
    function addMessageToChat(sender, content) { // Removed isError parameter
        const targetChatDisplay = currentMode === 'sms' ? smsChatDisplay : emailChatDisplay;

        if (!targetChatDisplay) {
            console.error(`addMessageToChat failed: chatDisplay element for mode '${currentMode}' not found!`);
            alert("Critical Error: Chat display area is missing. Please reload the page.");
            return;
        }

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);

        if (sender === 'ai') {
            // Determine class based on content (simple check for "Error:" prefix)
            const isErrorMessage = typeof content === 'string' && content.startsWith('Error:');
            messageDiv.classList.add('alert', isErrorMessage ? 'alert-danger' : 'alert-info');
            messageDiv.setAttribute('role', 'alert');

            let displayContentHTML = '';
            let rawTextForCopy = '';

            // Basic sanitizer function (assign to textContent to escape)
            const sanitize = (str) => {
                if (typeof str !== 'string') return '';
                const temp = document.createElement('div');
                temp.textContent = str;
                return temp.innerHTML;
            };

            const formatEmailItem = (item, index = null) => {
                const subject = item.subject ? sanitize(item.subject) : '(No Subject Provided)';
                // For message, create a <pre> element and set its textContent
                const messagePre = document.createElement('pre');
                messagePre.className = 'email-body';
                messagePre.textContent = item.message || '(No Message Provided)'; // Set raw text here

                const variationLabel = index !== null ? `<strong>Variation ${index + 1}:</strong><br>` : '';
                return `${variationLabel}<strong>Subject:</strong> ${subject}<br><hr class='my-1'><strong>Message:</strong><br>${messagePre.outerHTML}`; // Use outerHTML of the pre tag
            };

            const formatRawTextItem = (item, index = null) => {
                const subject = item.subject || '(No Subject Provided)';
                const message = item.message || '(No Message Provided)';
                const variationLabel = index !== null ? `Variation ${index + 1}:\n` : '';
                return `${variationLabel}Subject: ${subject}\nMessage:\n${message}`;
            };

            if (Array.isArray(content)) { // Handle array of email results
                displayContentHTML = content.map((item, index) => `<div class='email-variation'>${formatEmailItem(item, index)}</div>`).join("<hr class='my-2'>");
                rawTextForCopy = content.map((item, index) => formatRawTextItem(item, index)).join('\n\n---\n\n');
            } else if (typeof content === 'object' && content !== null && (content.subject || content.message)) { // Handle single email result
                displayContentHTML = formatEmailItem(content);
                rawTextForCopy = formatRawTextItem(content);
            } else { // Handle plain text (SMS or error message)
                const text = typeof content === 'string' ? content : JSON.stringify(content);
                displayContentHTML = sanitize(text); // Sanitize plain text
                rawTextForCopy = text;
            }

            messageDiv.innerHTML = displayContentHTML; // Set potentially complex HTML
            messageDiv.dataset.rawText = rawTextForCopy; // Store original structure for copy

            // Add copy button
            const copyButton = document.createElement('button');
            copyButton.type = 'button';
            copyButton.classList.add('btn', 'btn-sm', 'copy-msg-btn');
            copyButton.title = 'Copy message';
            copyButton.innerHTML = copyIconSVG;
            messageDiv.appendChild(copyButton);

        } else { // user message
            const text = typeof content === 'string' ? content : JSON.stringify(content);
            messageDiv.textContent = text; // Use textContent for user messages for safety
            messageDiv.dataset.rawText = text;
        }

        // Removed isError check for user messages

        targetChatDisplay.insertAdjacentElement('beforeend', messageDiv);
        targetChatDisplay.scrollTop = targetChatDisplay.scrollHeight;
        // Save state AFTER adding message
        saveStateToLocalStorage();
    }

    // --- File Handling ---
    function handleFileUpload(event, type) {
        const file = event.target.files[0];
        const statusElement = type === 'marketing' ? marketingFileStatus : smsFileStatus;
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                if (type === 'marketing') { marketingData = content; console.log(`Marketing data loaded (${(content.length / 1024).toFixed(2)} KB).`); }
                else { smsData = content; console.log(`SMS data loaded (${(content.length / 1024).toFixed(2)} KB).`); }
                statusElement.textContent = `Loaded: ${file.name}`;
                statusElement.className = 'file-status small text-muted loaded';
                saveStateToLocalStorage();
            };
            reader.onerror = (e) => {
                console.error("File reading error:", e);
                if (type === 'marketing') marketingData = ""; else smsData = "";
                statusElement.textContent = `Error reading ${file.name}`;
                statusElement.className = 'file-status small text-danger error';
                addMessageToChat('ai', `Error: Error reading file ${file.name}`); // Added "Error:" prefix
                saveStateToLocalStorage();
            };
            reader.readAsText(file);
        } else {
            if (type === 'marketing') marketingData = ""; else smsData = "";
            statusElement.textContent = "No file selected";
            statusElement.className = 'file-status small text-muted';
            saveStateToLocalStorage();
        }
    }

    // --- Settings Handling (Added Robust Null Checks) ---
    function getSettings() {
        const formData = new FormData(settingsForm);
        const settings = {};
        settings.mode = currentMode;

        for (const [key, value] of formData.entries()) {
            if (key === 'marketing_file' || key === 'sms_file' || key === 'modal_api_key_input' || key === 'mode') continue;

            const element = settingsForm.elements[key];
            // **Fix:** Check if element exists before accessing properties
            if (!element) continue;

            // Check classList exists before using it
            const isGlowing = element.classList && element.classList.contains('input-active-glow');
            const hasValue = value && value.trim() !== '';

            if (currentMode === 'sms') {
                if (['length', 'topic', 'date', 'tone', 'href', 'num_results'].includes(key)) {
                    if (isGlowing && hasValue) settings[key] = value;
                } else if (key === 'use_emojis') {
                    const isDefaultChecked = defaultSettingsValues[key] === true;
                    if (isGlowing || (isDefaultChecked && element.checked)) settings[key] = element.checked;
                }
            } else if (currentMode === 'email') {
                if (['subject', 'message', 'topic', 'date', 'tone', 'href', 'num_results'].includes(key)) {
                    if (isGlowing && hasValue) settings[key] = value;
                } else if (key === 'use_emojis') {
                    const isDefaultChecked = defaultSettingsValues[key] === true;
                    if (isGlowing || (isDefaultChecked && element.checked)) settings[key] = element.checked;
                }
            }
        }

        settings.project = projectSelect.value;
        if (!settings.num_results && numResultsInput.value) {
            settings.num_results = numResultsInput.value;
        }
        // Ensure num_results is a valid number >= 1
        let numRes = parseInt(settings.num_results, 10);
        settings.num_results = (!isNaN(numRes) && numRes >= 1) ? numRes : 1;


        if (settings.use_emojis === undefined) {
            const emojiCheckbox = settingsForm.elements['use_emojis'];
            settings.use_emojis = emojiCheckbox ? emojiCheckbox.checked : true;
        }

        return settings;
    }

    // --- Send Message Logic (Targets correct input/button) ---
    function handleSendMessage() {
        if (isGenerating) return;
        const currentUserInput = currentMode === 'sms' ? smsUserInput : emailUserInput;
        const userText = currentUserInput.value.trim();

        // Check if there's anything to send (text input or relevant email settings)
        const hasEmailContent = currentMode === 'email' && (emailSubjectInput.value.trim() || emailMessageInput.value.trim());
        if (!userText && !hasEmailContent) return; // Nothing to send

        if (!currentApiKey) { addMessageToChat('ai', 'Error: API Key not set or validated. Please enter your key.'); showApiKeyModal(); return; }

        if (userText) {
             addMessageToChat('user', userText); // Add user message to the correct chat
        }
        currentUserInput.value = ''; // Clear the correct input
        autoResizeTextarea(currentUserInput); // Resize the cleared input
        saveStateToLocalStorage(); // Save cleared input state
        const settings = getSettings();
        callAIBackend(userText, settings); // Pass user text and settings
    }

    // --- Backend API Call (Targets correct display/button) ---
    async function callAIBackend(userPrompt, settings) {
        if (!currentApiKey) { addMessageToChat('ai', 'Error: Internal Error: API Key missing before sending request.'); showApiKeyModal(); return; }

        const targetChatDisplay = currentMode === 'sms' ? smsChatDisplay : emailChatDisplay;
        const targetSendButton = currentMode === 'sms' ? smsSendButton : emailSendButton;

        isGenerating = true;
        targetSendButton.disabled = true;
        targetSendButton.title = "Generating...";

        const thinkingMessage = document.createElement('div');
        thinkingMessage.classList.add('message', 'ai', 'alert', 'alert-secondary');
        thinkingMessage.setAttribute('role', 'status');
        thinkingMessage.innerHTML = `<span class="spinner-border spinner-border-sm" aria-hidden="true"></span><span class="ms-2">Generating...</span>`;
        targetChatDisplay.appendChild(thinkingMessage);
        targetChatDisplay.scrollTop = targetChatDisplay.scrollHeight;

        // Ensure num_results is valid before sending
        let numRes = parseInt(settings.num_results, 10);
        settings.num_results = (!isNaN(numRes) && numRes >= 1) ? numRes : 1;


        try {
            const secretHash = await calculateSecretHash(currentApiKey, FRONTEND_SECRET_SALT_VALUE);
            if (!secretHash) { addMessageToChat('ai', 'Error: Configuration error (salt). Cannot generate signature.'); isGenerating = false; targetSendButton.disabled = false; if (thinkingMessage.parentNode) targetChatDisplay.removeChild(thinkingMessage); return; }
            console.log("Sending request to backend:", GENERATE_URL);
            console.log("Settings being sent:", settings);
            const response = await fetch(GENERATE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': currentApiKey, 'X-Frontend-Secret': secretHash }, body: JSON.stringify({ userPrompt: userPrompt, settings: settings, marketingData: marketingData, smsData: smsData }) });
            if (thinkingMessage.parentNode) targetChatDisplay.removeChild(thinkingMessage);
            if (!response.ok) {
                let errorMsg = `Error: ${response.status} ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.error) {
                        if (response.status === 401) { errorMsg = `Error: Invalid or unauthorized API Key. Please refresh the page. If the problem persists, contact the administrator.`; localStorage.removeItem(LOCALSTORAGE_API_KEY_NAME); currentApiKey = null; showApiKeyModal(); }
                        else if (response.status === 403) { errorMsg = `Error: Access Denied. (${errorData.error || 'Please ensure you are accessing from an allowed location.'})`; }
                        else { errorMsg = `Error: ${errorData.error}`; }
                    }
                } catch (parseError) { /* Ignore */ }
                console.error("Backend request failed:", errorMsg);
                addMessageToChat('ai', errorMsg); // Error message already contains "Error:"
                return;
            }
            // Check content type to determine how to parse the response
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                // Handle JSON response (Email mode)
                const data = await response.json();
                if (data.error) {
                    console.error("Backend returned a JSON error:", data.error);
                    addMessageToChat('ai', `Error: ${data.error}`);
                } else if (data) {
                    console.log("Received JSON response from backend.");
                    addMessageToChat('ai', data); // Pass the parsed JSON object/array
                } else {
                     console.error("Backend returned empty/invalid JSON response.");
                     addMessageToChat('ai', 'Error: Received an unexpected JSON response format from the server.');
                }
            } else {
                // Handle Text response (SMS mode)
                const textData = await response.text();
                if (textData) {
                    console.log("Received text response from backend.");
                    addMessageToChat('ai', textData); // Pass the raw text
                } else {
                    console.error("Backend returned empty text response.");
                    addMessageToChat('ai', 'Error: Received an empty response from the server.');
                }
            }
        } catch (error) {
            console.error('Network or fetch error:', error);
            const stillThinking = targetChatDisplay.querySelector('.alert-secondary[role="status"]');
            if (stillThinking && stillThinking.parentNode) targetChatDisplay.removeChild(stillThinking);
            addMessageToChat('ai', `Error: Network error: Could not reach the backend. Is it running? (${error.message})`);
        } finally {
            isGenerating = false;
            targetSendButton.disabled = false;
            targetSendButton.title = `Send ${currentMode === 'sms' ? 'SMS' : 'Email'} Request (Ctrl+Enter)`;
        }
    }

    // --- Local Storage Functions (Handles separate modes) ---
    function saveStateToLocalStorage() {
        try {
            // Save project selection
            localStorage.setItem(LS_PROJECT_KEY, projectSelect.value);
            localStorage.setItem(LS_MODE_KEY, currentMode);

            // Save history and input for the CURRENT mode
            const historyKey = `${LS_HISTORY_KEY_PREFIX}${currentMode}`;
            const userInputKey = `${LS_USER_INPUT_KEY_PREFIX}${currentMode}`;
            const currentChatDisplay = currentMode === 'sms' ? smsChatDisplay : emailChatDisplay;
            const currentUserInput = currentMode === 'sms' ? smsUserInput : emailUserInput;
            localStorage.setItem(historyKey, currentChatDisplay.innerHTML);
            localStorage.setItem(userInputKey, currentUserInput.value);

            // Save file statuses (common)
            localStorage.setItem(LS_MARKETING_FILE_STATUS_KEY, marketingFileStatus.textContent);
            localStorage.setItem(LS_SMS_FILE_STATUS_KEY, smsFileStatus.textContent);
            localStorage.setItem(LS_MARKETING_FILE_STATUS_KEY + '_class', marketingFileStatus.className);
            localStorage.setItem(LS_SMS_FILE_STATUS_KEY + '_class', smsFileStatus.className);
        } catch (error) {
            console.error('Error saving state to localStorage:', error);
            addMessageToChat('ai', 'Warning: Could not save application state. LocalStorage might be full or disabled.');
        }
    }
    function loadStateFromLocalStorage() {
        try {
            // Load common state
            // Load project selection
            const savedProject = localStorage.getItem(LS_PROJECT_KEY);
            if (savedProject) {
                projectSelect.value = savedProject;
            }

            const savedMarketingStatus = localStorage.getItem(LS_MARKETING_FILE_STATUS_KEY);
            const savedMarketingStatusClass = localStorage.getItem(LS_MARKETING_FILE_STATUS_KEY + '_class');
            if (savedMarketingStatus) { marketingFileStatus.textContent = savedMarketingStatus; marketingFileStatus.className = savedMarketingStatusClass || 'file-status small text-muted'; }
            const savedSmsStatus = localStorage.getItem(LS_SMS_FILE_STATUS_KEY);
            const savedSmsStatusClass = localStorage.getItem(LS_SMS_FILE_STATUS_KEY + '_class');
            if (savedSmsStatus) { smsFileStatus.textContent = savedSmsStatus; smsFileStatus.className = savedSmsStatusClass || 'file-status small text-muted'; }
            marketingData = ""; // Reset file data on load, user must re-upload
            smsData = "";

            // Determine initial mode
            const savedMode = localStorage.getItem(LS_MODE_KEY);
            currentMode = savedMode || 'sms'; // Default to 'sms' if nothing saved
            if (currentMode === 'email') {
                modeEmailRadio.checked = true;
                smsChatArea.classList.add('d-none');
                smsChatArea.classList.remove('d-flex');
                emailChatArea.classList.remove('d-none');
                emailChatArea.classList.add('d-flex');
            } else { // sms mode (default)
                modeSmsRadio.checked = true;
                emailChatArea.classList.add('d-none');
                emailChatArea.classList.remove('d-flex');
                smsChatArea.classList.remove('d-none');
                smsChatArea.classList.add('d-flex');
            }
            document.body.classList.add(`mode-${currentMode}-active`); // Set body class

            // Load history and input for BOTH modes (so switching works immediately)
            ['sms', 'email'].forEach(mode => {
                const historyKey = `${LS_HISTORY_KEY_PREFIX}${mode}`;
                const userInputKey = `${LS_USER_INPUT_KEY_PREFIX}${mode}`;
                const chatDisplay = mode === 'sms' ? smsChatDisplay : emailChatDisplay;
                const userInput = mode === 'sms' ? smsUserInput : emailUserInput;

                const savedHistory = localStorage.getItem(historyKey);
                if (savedHistory) {
                    chatDisplay.innerHTML = savedHistory;
                } else {
                    chatDisplay.innerHTML = ''; // Clear if no history
                    addWelcomeMessage(chatDisplay, mode); // Add welcome message
                }
                chatDisplay.scrollTop = chatDisplay.scrollHeight; // Scroll to bottom

                const savedInput = localStorage.getItem(userInputKey);
                userInput.value = savedInput || '';
                autoResizeTextarea(userInput); // Resize loaded input
            });

            console.log('State loaded from localStorage.');
        } catch (error) {
            console.error('Error loading state from localStorage:', error);
            addMessageToChat('ai', 'Warning: Could not load saved application state.');
            localStorage.removeItem(LS_PROJECT_KEY); localStorage.removeItem(LS_MODE_KEY);
            localStorage.removeItem(`${LS_HISTORY_KEY_PREFIX}sms`); localStorage.removeItem(`${LS_HISTORY_KEY_PREFIX}email`);
            localStorage.removeItem(LS_MARKETING_FILE_STATUS_KEY); localStorage.removeItem(LS_MARKETING_FILE_STATUS_KEY + '_class');
            localStorage.removeItem(LS_SMS_FILE_STATUS_KEY); localStorage.removeItem(LS_SMS_FILE_STATUS_KEY + '_class');
            // Remove incorrect leftover line from previous single-input logic
        }
    }

    // --- Clear Functions ---
    function clearProject() { projectSelect.selectedIndex = 0; localStorage.removeItem(LS_PROJECT_KEY); console.log('Project selection cleared.'); saveStateToLocalStorage(); }
    function clearHistory(modeToClear) {
        const historyKey = `${LS_HISTORY_KEY_PREFIX}${modeToClear}`;
        const chatDisplayToClear = modeToClear === 'sms' ? smsChatDisplay : emailChatDisplay;

        chatDisplayToClear.innerHTML = ''; // Clear the display
        addWelcomeMessage(chatDisplayToClear, modeToClear); // Add welcome message back
        localStorage.removeItem(historyKey); // Remove from storage
        console.log(`Chat history cleared for ${modeToClear} mode.`);

        // If clearing the currently active mode, save the cleared state
        if (modeToClear === currentMode) {
            saveStateToLocalStorage();
        }
    }
    function clearSettings() { settingsForm.reset(); console.log('Settings cleared.'); updateAllSettingsGlows(); }
    function clearFiles() {
        marketingFileInput.value = ''; // Clear the actual input element value
        smsFileInput.value = '';       // Clear the actual input element value
        marketingData = "";
        smsData = "";
        // Reset status text and class
        marketingFileStatus.textContent = "No file selected";
        smsFileStatus.textContent = "No file selected";
        marketingFileStatus.className = 'file-status small text-muted';
        smsFileStatus.className = 'file-status small text-muted';
        console.log('File selections, data, and UI status cleared.');
        saveStateToLocalStorage(); // Save the cleared state
    }

    // --- Clear Individual Input Function ---
    function handleClearInputButtonClick(event) {
        const clearButton = event.target.closest('.clear-input-btn');
        if (!clearButton) return;
        const targetInputId = clearButton.dataset.targetInput; if (!targetInputId) { console.warn('Clear button clicked, but no target input ID found.'); return; }
        const targetInput = document.getElementById(targetInputId); if (!targetInput) { console.warn(`Clear button clicked, but target input '#${targetInputId}' not found.`); return; }
        const inputName = targetInput.name; if (!inputName || defaultSettingsValues[inputName] === undefined) { console.warn(`Could not find default value for input '${inputName}'. Cannot reset.`); return; }
        const defaultValue = defaultSettingsValues[inputName];
        if (targetInput.type === 'checkbox') targetInput.checked = defaultValue; else targetInput.value = defaultValue;
        triggerInputEvent(targetInput);
        console.log(`Input '${inputName}' reset to default value:`, defaultValue);
    }

    // --- Store Default Settings (Added Robust Null Checks) ---
    function storeDefaultSettings() {
        console.log("Storing default settings values for mode:", currentMode);
        defaultSettingsValues = {};
        for (const element of settingsForm.elements) {
            // **Fix:** Check if element and element.name exist
            if (element && element.name && (element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA')) {
                 const isSmsOnly = element.closest('.sms-only');
                 const isEmailOnly = element.closest('.email-only');

                 // Only store defaults for elements relevant to the current mode
                 if ((currentMode === 'sms' && !isEmailOnly) || (currentMode === 'email' && !isSmsOnly) || (!isSmsOnly && !isEmailOnly)) {
                    if (element.type === 'checkbox') defaultSettingsValues[element.name] = element.defaultChecked;
                    else defaultSettingsValues[element.name] = element.defaultValue || '';
                 }
            }
        }
         console.log("Default settings stored:", defaultSettingsValues);
    }

    // --- Glow Effect Functions (Added Robust Null Checks) ---
    function updateInputGlow(inputElement) {
        const GLOW_CLASS = 'input-active-glow';
        // **Fix:** Check if inputElement and inputElement.name exist
        if (!inputElement || !inputElement.name || inputElement.type === 'file' || inputElement.type === 'hidden' || inputElement.tagName === 'BUTTON') return;

        let isDefault = true;
        const defaultValue = defaultSettingsValues[inputElement.name];

        // If default value wasn't stored for this input in this mode, consider it default
        if (defaultValue === undefined) {
             isDefault = true;
        } else if (inputElement.type === 'checkbox') {
             isDefault = (inputElement.checked === defaultValue);
        } else {
             const currentVal = inputElement.value || '';
             const defaultVal = defaultValue || '';
             isDefault = (currentVal === defaultVal);
        }

        // **Fix:** Check classList exists before modifying
        if (inputElement.classList) {
            if (!isDefault) inputElement.classList.add(GLOW_CLASS);
            else inputElement.classList.remove(GLOW_CLASS);
        }
    }
    function updateAllSettingsGlows() {
        console.log("Updating glows for all settings inputs based on defaults for mode:", currentMode);
        for (const element of settingsForm.elements) {
            // **Fix:** Check element exists before passing
            if (element) {
                updateInputGlow(element);
            }
        }
    }

    // --- Utility Functions ---
    // --- Textarea Auto-Resize (Targets specific textarea) ---
    function autoResizeTextarea(textarea) {
        if (!textarea) return;
        textarea.style.height = 'auto'; // Reset height
        // Min height check prevents collapsing too small
        const minHeight = 40; // Adjust as needed based on your CSS/layout
        textarea.style.height = Math.max(minHeight, textarea.scrollHeight) + 'px'; // Set to scroll height or min height
    }
    function triggerInputEvent(element) { const inputEvent = new Event('input', { bubbles: true, cancelable: true }); element.dispatchEvent(inputEvent); }

    // --- Input Validation Functions ---
    function handleNumericInput(event) { const originalValue = event.target.value; const numericValue = originalValue.replace(/\D/g, ''); if (originalValue !== numericValue) event.target.value = numericValue; }
    function handleLengthBlur(event) { const input = event.target; let value = parseInt(input.value, 10); if (isNaN(value) || value <= 0) { input.value = '140'; triggerInputEvent(input); } }
    function handleNumResultsBlur(event) { const input = event.target; const min = parseInt(input.min, 10) || 1; const max = parseInt(input.max, 10) || 20; let value = parseInt(input.value, 10); if (isNaN(value) || value < min || value > max) { input.value = '1'; triggerInputEvent(input); } }

    // --- Copy Message Function ---
    function handleCopyMessageClick(event) {
        const copyButton = event.target.closest('.copy-msg-btn');
        if (!copyButton) return;
        const messageDiv = copyButton.closest('.message.ai');
        if (!messageDiv || !messageDiv.dataset.rawText) { console.error("Could not find message text to copy."); return; }
        const textToCopy = messageDiv.dataset.rawText;
        navigator.clipboard.writeText(textToCopy).then(() => {
            copyButton.innerHTML = checkIconSVG; copyButton.classList.add('copied'); copyButton.disabled = true;
            setTimeout(() => { copyButton.innerHTML = copyIconSVG; copyButton.classList.remove('copied'); copyButton.disabled = false; }, 1500);
        }).catch(err => {
            console.error('Failed to copy text: ', err); copyButton.title = 'Copy failed!'; setTimeout(() => { copyButton.title = 'Copy message'; }, 2000);
        });
    }

    // --- Download History Function (Refined) ---
    function downloadAiHistory(modeToDownload) {
        const chatDisplayToDownload = modeToDownload === 'sms' ? smsChatDisplay : emailChatDisplay;
        const messages = chatDisplayToDownload.querySelectorAll('.message.ai:not(.alert-info):not(.alert-danger)'); // Exclude welcome/error messages

        if (messages.length === 0) {
            addMessageToChat('ai', `Info: No AI messages to download for ${modeToDownload.toUpperCase()} mode.`); // Changed to Info
            return;
        }

        let content = `AI Generated Content - ${projectSelect.value} (${modeToDownload.toUpperCase()}) - ${new Date().toLocaleString()}\n\n`;
        content += "========================================\n\n";

        messages.forEach((msg, index) => {
            const rawText = msg.dataset.rawText || msg.innerText || msg.textContent; // Fallback chain
            content += `----- Result ${index + 1} -----\n`;
            content += rawText.trim(); // Use the stored raw text
            content += "\n\n========================================\n\n";
        });

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.href = URL.createObjectURL(blob);
        link.download = `ai_content_${projectSelect.value}_${modeToDownload}_${timestamp}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        console.log(`AI history downloaded for ${modeToDownload} mode.`);
    }

    // --- Initialization ---
    async function initializeApp() {
        console.log("Initializing application...");

        currentApiKey = localStorage.getItem(LOCALSTORAGE_API_KEY_NAME);
        if (!currentApiKey) { console.log("API Key not found in localStorage."); showApiKeyModal(); }
        else { console.log("Found API Key in localStorage."); }

        loadStateFromLocalStorage(); // Loads mode, history, etc.

        // Set initial body class AFTER loading mode
        document.body.classList.remove('mode-sms-active', 'mode-email-active');
        document.body.classList.add(`mode-${currentMode}-active`);

        storeDefaultSettings(); // Store defaults based on loaded mode
        updateAllSettingsGlows(); // Apply glows based on loaded mode
        // Resize both textareas after loading potential content
        autoResizeTextarea(smsUserInput);
        autoResizeTextarea(emailUserInput);

        if (currentApiKey) {
             // Determine the active chat display based on the current mode
             const activeChatDisplay = currentMode === 'sms' ? smsChatDisplay : emailChatDisplay;
             const firstMessage = activeChatDisplay.querySelector('.message.ai');
             if (!firstMessage || !firstMessage.textContent.startsWith('Welcome to')) {
                 const existingMessages = activeChatDisplay.querySelectorAll('.message.ai');
                 let alreadyReady = false;
                 existingMessages.forEach(msg => { if (msg.textContent.includes('Ready to generate')) alreadyReady = true; });
                 // Avoid adding duplicate "ready" messages if one was added during key validation
                 if (!alreadyReady && !activeChatDisplay.textContent.includes('API Key validated')) {
                    // Don't add a message here, the welcome message is sufficient
                    // addMessageToChat('ai', `Using stored API Key. Ready to generate in ${currentMode} mode.`);
                 }
             }
        }
        updateDynamicHeader(); // Set initial header text
        console.log(`Application initialized in ${currentMode} mode.`);
    }
 
    // --- Event Listeners ---
    projectSelect.addEventListener('change', () => {
        saveStateToLocalStorage();
        updateDynamicHeader(); // Update header on project change
    });
    marketingFileInput.addEventListener('change', (e) => handleFileUpload(e, 'marketing'));
    smsFileInput.addEventListener('change', (e) => handleFileUpload(e, 'sms'));

    // Mode-specific Send Buttons
    smsSendButton.addEventListener('click', handleSendMessage);
    emailSendButton.addEventListener('click', handleSendMessage);

    // API Key Modal
    validateKeyButton.addEventListener('click', handleValidateAndSaveKey);
    modalApiKeyInput.addEventListener('keydown', handleModalInputKeydown);

    // Clear Buttons
    clearProjectButton.addEventListener('click', clearProject);
    clearSmsHistoryButton.addEventListener('click', () => clearHistory('sms'));
    clearEmailHistoryButton.addEventListener('click', () => clearHistory('email'));
    clearSettingsButton.addEventListener('click', clearSettings);
    clearFilesButton.addEventListener('click', clearFiles);

    // Download Buttons
    downloadSmsHistoryButton.addEventListener('click', () => downloadAiHistory('sms'));
    downloadEmailHistoryButton.addEventListener('click', () => downloadAiHistory('email'));

    // Mode switching listeners
    modeSmsRadio.addEventListener('change', () => handleModeChange('sms'));
    modeEmailRadio.addEventListener('change', () => handleModeChange('email'));

    // Settings form listeners for glow effect & saving state
    settingsForm.addEventListener('input', (event) => {
        // Check if the target is an input/textarea/select/checkbox within the form
        if (event.target && event.target.matches('input, textarea, select')) {
             updateInputGlow(event.target);
             saveStateToLocalStorage(); // Save state when settings change
        }
    });

    // Clear individual setting buttons
    settingsForm.addEventListener('click', handleClearInputButtonClick);

    // Copy button listener (using event delegation on the container for both chat displays)
    const mainContentContainer = document.querySelector('.main-content-container');
    if (mainContentContainer) {
        mainContentContainer.addEventListener('click', handleCopyMessageClick);
    } else {
        console.error("Could not find main content container to attach copy listener.");
    }

    // Add listeners for both textareas (input and keydown)
    [smsUserInput, emailUserInput].forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                autoResizeTextarea(input);
                saveStateToLocalStorage(); // Save input changes
            });
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                    event.preventDefault();
                    handleSendMessage(); // handleSendMessage determines which input to read based on currentMode
                }
            });
        }
    });

     // Input validation listeners
     if(lengthInput) {
        lengthInput.addEventListener('input', handleNumericInput);
        lengthInput.addEventListener('blur', handleLengthBlur);
     }
     if(numResultsInput) {
        numResultsInput.addEventListener('input', handleNumericInput);
        numResultsInput.addEventListener('blur', handleNumResultsBlur);
     }

    initializeApp();
});