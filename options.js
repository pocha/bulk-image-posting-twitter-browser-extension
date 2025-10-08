// options.js

const DB_NAME = "AutoTweeterDB";
const DB_VERSION = 1;
const IMAGE_STORE_NAME = "images";
let db;

// --- 1. Database Management ---

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = (event) => reject("Database error: " + event.target.errorCode);
        
        request.onupgradeneeded = (event) => {
            const dbInstance = event.target.result;
            if (!dbInstance.objectStoreNames.contains(IMAGE_STORE_NAME)) {
                const store = dbInstance.createObjectStore(IMAGE_STORE_NAME, { keyPath: "id", autoIncrement: true });
                store.createIndex("posted", "posted", { unique: false });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };
    });
}

function saveImage(imageBlob, text) {
    return new Promise((resolve, reject) => {
        if (!db) return reject("DB is not open");
        
        const transaction = db.transaction([IMAGE_STORE_NAME], "readwrite");
        const objectStore = transaction.objectStore(IMAGE_STORE_NAME);
        
        // The record now stores the blob directly
        const request = objectStore.add({ data: imageBlob, text: text, posted: false });

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject("Error saving image: " + event.target.errorCode);
    });
}


// --- 2. Settings Management ---

function saveOptions() {
    const tweetText = document.getElementById('tweet-text').value;
    const tweetDelay = document.getElementById('delay-seconds').value; // Changed from delay-minutes
    chrome.storage.sync.set({ tweetText, tweetDelay }, () => {
        const status = document.getElementById('status');
        status.textContent = 'Settings saved!';
        setTimeout(() => { status.textContent = ''; }, 2000);
    });
}

function restoreOptions() {
    chrome.storage.sync.get({ tweetText: '', tweetDelay: 60 }, (items) => { // Default to 60 seconds
        document.getElementById('tweet-text').value = items.tweetText;
        document.getElementById('delay-seconds').value = items.tweetDelay;
    });
}


// --- 3. File Handling and UI ---

function handleFiles(files) {
    const previewContainer = document.getElementById('image-preview-container');
    const tweetText = document.getElementById('tweet-text').value;
    let filesToProcess = Array.from(files).filter(file => file.type.startsWith('image/'));
    let filesProcessed = 0;

    if (filesToProcess.length === 0) return;

    filesToProcess.forEach(file => {
        // Display a preview
        const previewUrl = URL.createObjectURL(file);
        const imgElement = document.createElement('img');
        imgElement.src = previewUrl;
        imgElement.classList.add("w-full", "h-auto", "rounded-md", "object-cover");
        imgElement.onload = () => URL.revokeObjectURL(previewUrl); // Clean up memory
        previewContainer.appendChild(imgElement);

        // Save the actual blob to IndexedDB
        saveImage(file, tweetText)
            .then(() => {
                filesProcessed++;
                if (filesProcessed === filesToProcess.length) {
                    // Notify background script to start the alarm
                    const status = document.getElementById('status');
                    status.textContent = 'Images uploaded successfully!';
                    setTimeout(() => { status.textContent = ''; }, 3000);
                }
            })
            .catch(error => {
                console.error("Failed to save image:", error);
                const status = document.getElementById('status');
                status.textContent = 'Failed to save one or more images.';
                setTimeout(() => { status.textContent = ''; }, 3000);
            });
    });
}

// --- 4. Event Listeners ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await openDB();
    } catch (error) {
        console.error("Failed to open DB:", error);
        document.getElementById('status').textContent = 'Error: Could not open database.';
        return;
    }
    
    restoreOptions();

    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const form = document.getElementById('settings-form');

    // Form submission saves settings
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveOptions(); // Save settings first

        // Send a message to start tweeting immediately
        chrome.runtime.sendMessage({ action: "startTweeting", immediate: true }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error starting tweeting:", chrome.runtime.lastError.message);
                // Maybe show an alert or keep the popup open to show the error
                const status = document.getElementById('status');
                status.textContent = 'Error: ' + chrome.runtime.lastError.message;
            } else {
                console.log(response.status);
                // Close the popup on success
                window.close();
            }
        });
    });

    // File input handling
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => handleFiles(fileInput.files));

    // Drag and drop listeners
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('border-blue-500');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('border-blue-500');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('border-blue-500');
        handleFiles(e.dataTransfer.files);
    });
});
