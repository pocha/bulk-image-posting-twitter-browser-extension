// content.js

// --- 1. Message Listener ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'postImage' && message.imageUrl) {
        if (document.getElementById('autotweeter-helper')) {
            console.log('AutoTweeter: Helper UI is already visible.');
            sendResponse({ status: 'UI Already Active' });
            return;
        }
        injectHelperUI(message.imageUrl, message.tweetText || '', message.imageId);
        sendResponse({ status: 'UI Injected' });
    }
    return true; // Keep message channel open for async response
});


// --- 2. UI Injection ---
function injectHelperUI(imageUrl, tweetText, imageId) {
    // Remove any existing helper UI first
    const existingHelper = document.getElementById('autotweeter-helper');
    if (existingHelper) existingHelper.remove();

    const helper = document.createElement('div');
    helper.id = 'autotweeter-helper';
    helper.innerHTML = `
        <div id="autotweeter-header">
            <h3>AutoTweeter</h3>
            <button id="autotweeter-close-button">&times;</button>
        </div>
        <div id="autotweeter-body">
            <p>Ready to post this tweet:</p>
            <img id="autotweeter-image-preview" src="${imageUrl}" alt="Tweet Image Preview">
            <p id="autotweeter-text-preview">${escapeHTML(tweetText)}</p>
        </div>
        <div id="autotweeter-status">Waiting for action...</div>
        <div id="autotweeter-footer">
            <button id="autotweeter-cancel-button">Cancel</button>
            <button id="autotweeter-post-button">Inject into Tweet Box</button>
        </div>
    `;
    document.body.appendChild(helper);

    // --- Event Listeners ---
    const postButton = document.getElementById('autotweeter-post-button');
    const cancelButton = document.getElementById('autotweeter-cancel-button');
    const closeButton = document.getElementById('autotweeter-close-button');

    const handlePost = async () => {
        postButton.textContent = 'Injecting...';
        postButton.disabled = true;
        cancelButton.disabled = true;

        const success = await populateTweetBox(imageUrl, tweetText);
        
        if (success) {
            updateHelperStatus('Success! You can now post the tweet.', false);
            chrome.runtime.sendMessage({ action: 'tweetPosted', imageId: imageId });
            // Don't remove the helper UI immediately, let the user see the success message
            setTimeout(() => removeHelperUI(imageUrl), 5000); 
        } else {
            // The populateTweetBox function now handles its own error UI updates
            postButton.textContent = 'Retry Injection';
            postButton.disabled = false;
            cancelButton.disabled = false;
        }
    };

    const handleCancel = () => {
        chrome.runtime.sendMessage({ action: 'injectionCancelled' });
        removeHelperUI(imageUrl);
    };

    postButton.addEventListener('click', handlePost);
    cancelButton.addEventListener('click', handleCancel);
    closeButton.addEventListener('click', handleCancel);
}
// --- 3. Robust Tweet Box Population ---
// A helper function to update the status UI
function updateHelperStatus(message, isError = false) {
    const statusDiv = document.getElementById('autotweeter-status');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.style.color = isError ? '#ff6b6b' : '#90ee90'; // Light red for error, light green for success/info
    }
}

async function populateTweetBox(imageUrl, tweetText) {
    try {
        updateHelperStatus('Preparing to post...');

        // --- Step 1: Convert dataURL to File object ---
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const fileName = `image_${Date.now()}.png`;
        const file = new File([blob], fileName, { type: blob.type });

        // --- Step 2: Find the hidden file input ---
        // Increased timeout for slower connections/systems
        const fileInput = await findElement('input[data-testid="fileInput"]', 10000);
        if (!fileInput) {
            console.error('AutoTweeter: File input not found.');
            updateHelperStatus('Error: Could not find the image upload input.', true);
            return false;
        }

        // --- Step 3: Attach the file to the input ---
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('AutoTweeter: Dispatched file change event.');
        updateHelperStatus('Image attached. Waiting for preview...');

        // --- Step 4: Wait for the image preview to appear ---
        // This is crucial. Twitter/X processes the upload and creates a preview.
        const imagePreview = await findElement('div[data-testid="tweetPhoto"]', 15000);
        if (!imagePreview) {
            console.error('AutoTweeter: Image preview did not appear after upload.');
            updateHelperStatus('Error: Image upload failed or timed out.', true);
            return false;
        }
        console.log('AutoTweeter: Image preview detected.');
        updateHelperStatus('Image loaded. Inserting text...');

        // --- Step 5: Find the tweet text area and insert text ---
        const tweetBox = await findElement('div[data-testid="tweetTextarea_0"]', 5000);
        if (!tweetBox) {
            console.error('AutoTweeter: Tweet textarea not found.');
            updateHelperStatus('Error: Could not find the text input area.', true);
            return false;
        }

        // Focus the tweet box
        tweetBox.focus();
        tweetBox.click(); // A click can help trigger placeholder removal and focus events

        // Insert text in a way that React's state management will recognize
        document.execCommand('insertText', false, tweetText);

        // Dispatching an 'input' event can be a good fallback/additional measure
        tweetBox.dispatchEvent(new Event('input', { bubbles: true, data: tweetText }));
        
        console.log('AutoTweeter: Text inserted and events dispatched.');
        updateHelperStatus('Ready to post!');

        return true;

    } catch (error) {
        console.error('AutoTweeter: Error populating tweet box:', error);
        updateHelperStatus(`An unexpected error occurred: ${error.message}`, true);
        // Clean up the UI on error
        setTimeout(() => removeHelperUI(), 5000);
        return false;
    }
}
        tweetBox.focus();
        // Use `insertText` for compatibility with the rich text editor.
        document.execCommand('insertText', false, tweetText);

        return true;

    } catch (error) {
        console.error('AutoTweeter: Error populating tweet box:', error);
        return false;
    }
}

// --- 4. Utility: Find Element with Polling ---
// Waits for an element to be available in the DOM.
function findElement(selector, timeout) {
    return new Promise(resolve => {
        const startTime = Date.now();
        const interval = setInterval(() => {
            const element = document.querySelector(selector);
            if (element) {
                clearInterval(interval);
                resolve(element);
            } else if (Date.now() - startTime > timeout) {
                clearInterval(interval);
                resolve(null); // Element not found within timeout
            }
        }, 500); // Check every 500ms
    });
}


// --- 5. UI Removal ---
function removeHelperUI(imageUrl) {
    const helper = document.getElementById('autotweeter-helper');
    if (helper) helper.remove();
    if (imageUrl) URL.revokeObjectURL(imageUrl);
}

// --- 6. Utility: Escape HTML ---
function escapeHTML(str) {
    const p = document.createElement("p");
    p.textContent = str;
    return p.innerHTML;
}
