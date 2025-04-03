
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const projectSelect = document.getElementById('project');
    const chatDisplay = document.getElementById('chat-display');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const settingsForm = document.getElementById('settings-form');
    const marketingFileInput = document.getElementById('marketing-file');
    const smsFileInput = document.getElementById('sms-file');
    const marketingFileStatus = document.getElementById('marketing-file-status');
    const smsFileStatus = document.getElementById('sms-file-status');

    // State
    let marketingData = "";
    let smsData = ""; // Store raw text content
    let isGenerating = false; // Prevent multiple simultaneous requests

    // --- Configuration ---
    // URL for the backend API endpoint
    const LOCAL_BACKEND_URL = 'http://localhost:3000/api/generate';
    // !! IMPORTANT !! Replace this placeholder with your actual deployed Render URL after deployment
    const PRODUCTION_BACKEND_URL = 'https://sms-backend-generator.onrender.com/api/generate';

    // Determine which URL to use (simple check for localhost)
    const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? LOCAL_BACKEND_URL
        : PRODUCTION_BACKEND_URL;

    console.log("Using Backend URL:", BACKEND_URL);
    if (BACKEND_URL.includes('your-render-app-name')) {
         console.warn("Reminder: Update PRODUCTION_BACKEND_URL in script.js with your actual Render URL.");
         addMessageToChat('ai', "Developer Note: Remember to update the PRODUCTION_BACKEND_URL in script.js after deploying the backend!", true);
    }

    // --- Event Listeners ---
    sendButton.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !e.shiftKey && !e.altKey) {
            e.preventDefault(); // Prevent newline in textarea
            handleSendMessage();
        }
    });
    marketingFileInput.addEventListener('change', (e) => handleFileUpload(e, 'marketing'));
    smsFileInput.addEventListener('change', (e) => handleFileUpload(e, 'sms'));
    userInput.addEventListener('input', autoResizeTextarea);

    // --- Functions ---

    function addMessageToChat(sender, text, isError = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        if (isError) {
            messageDiv.classList.add('error');
        }
        // Basic text setting preserves line breaks from AI
        messageDiv.textContent = text;
        chatDisplay.appendChild(messageDiv);
        // Scroll to the bottom
        chatDisplay.scrollTop = chatDisplay.scrollHeight;
    }

    function handleFileUpload(event, type) {
        const file = event.target.files[0];
        const statusElement = type === 'marketing' ? marketingFileStatus : smsFileStatus;

        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                if (type === 'marketing') {
                    marketingData = content;
                    console.log(`Marketing data loaded (${(content.length / 1024).toFixed(2)} KB).`);
                } else { // sms
                    smsData = content;
                     console.log(`SMS data loaded (${(content.length / 1024).toFixed(2)} KB).`);
                }
                statusElement.textContent = `Loaded: ${file.name}`;
                statusElement.className = 'file-status loaded'; // Reset class
            };
            reader.onerror = (e) => {
                console.error("File reading error:", e);
                if (type === 'marketing') marketingData = ""; else smsData = "";
                statusElement.textContent = `Error reading ${file.name}`;
                statusElement.className = 'file-status error'; // Error class
                addMessageToChat('ai', `Error reading file ${file.name}`, true);
            };
            reader.readAsText(file); // Read as text
        } else {
            // Reset if file selection is cancelled
            if (type === 'marketing') marketingData = "";
            else smsData = "";
            statusElement.textContent = "No file selected";
            statusElement.className = 'file-status'; // Reset class
        }
    }

    function handleSendMessage() {
        if (isGenerating) return; // Don't send if already waiting for response

        const userText = userInput.value.trim();
        if (!userText) return; // Don't send empty messages

        addMessageToChat('user', userText);
        userInput.value = ''; // Clear input field
        autoResizeTextarea(); // Reset textarea height

        const settings = getSettings();
        callAIBackend(userText, settings);
    }

    function getSettings() {
        const formData = new FormData(settingsForm);
        const settings = {};
        for (const [key, value] of formData.entries()) {
            // Convert checkbox value to boolean
            if (key === 'use_emojis') {
                settings[key] = value === 'on'; // 'on' if checked
            } else if (value) { // Only include non-empty settings
                settings[key] = value;
            }
        }
        settings.project = projectSelect.value; // Get project from dropdown
        // Add loaded file data (potentially large, handled by backend)
        settings.marketingData = marketingData;
        settings.smsData = smsData;
        return settings;
    }

    async function callAIBackend(userPrompt, settings) {
        isGenerating = true;
        sendButton.disabled = true;
        sendButton.title = "Generating...";

        const thinkingMessage = document.createElement('div');
        thinkingMessage.classList.add('message', 'ai');
        thinkingMessage.textContent = 'Generating...';
        chatDisplay.appendChild(thinkingMessage);
        chatDisplay.scrollTop = chatDisplay.scrollHeight;

        try {
            console.log("Sending request to backend:", BACKEND_URL);
            const response = await fetch(BACKEND_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Send everything in the body
                body: JSON.stringify({
                    userPrompt: userPrompt,
                    settings: settings, // contains topic, date, tone etc AND project
                    // File content is now inside the 'settings' object
                    marketingData: settings.marketingData,
                    smsData: settings.smsData
                }),
            });

             // Always remove "Thinking..." message
             chatDisplay.removeChild(thinkingMessage);

            if (!response.ok) {
                let errorMsg = `Error: ${response.status} ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.error) {
                        errorMsg = `Error: ${errorData.error}`;
                    }
                } catch (parseError) { /* Ignore */ }
                console.error("Backend request failed:", errorMsg);
                addMessageToChat('ai', errorMsg, true);
                return;
            }

            const data = await response.json();

            if (data.text) {
                console.log("Received response from backend.");
                addMessageToChat('ai', data.text); // Add the actual AI response
            } else if (data.error) {
                console.error("Backend returned an error:", data.error);
                addMessageToChat('ai', `Error: ${data.error}`, true);
            } else {
                 console.error("Unexpected response format from backend:", data);
                 addMessageToChat('ai', 'Received an unexpected response format from the server.', true);
            }

        } catch (error) {
            console.error('Network or fetch error:', error);
            // Ensure thinking message is removed if fetch fails
            const stillThinking = chatDisplay.querySelector('.message.ai:last-child');
            if (stillThinking && stillThinking.textContent === 'Generating...'){
                chatDisplay.removeChild(stillThinking);
            }
            addMessageToChat('ai', `Network error: Could not reach the backend. Is it running? (${error.message})`, true);
        } finally {
             isGenerating = false; // Re-enable sending
             sendButton.disabled = false;
             sendButton.title = "Send Message (Ctrl+Enter)";
        }
    }

    function autoResizeTextarea() {
        userInput.style.height = 'auto'; // Reset height
        // Set height to scrollHeight, but not exceeding max-height from CSS
        const maxHeight = parseInt(window.getComputedStyle(userInput).maxHeight, 10);
        const newHeight = Math.min(userInput.scrollHeight, maxHeight);
        userInput.style.height = newHeight + 'px';
    }

    // Initial setup
    autoResizeTextarea(); // Set initial size correctly

});
