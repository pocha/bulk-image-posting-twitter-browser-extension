// background.js

const DB_NAME = "AutoTweeterDB";
const DB_VERSION = 1;
const IMAGE_STORE_NAME = "images";

let db;
// Use a map to hold data for tabs that are in the process of being opened.
// This avoids race conditions.
const pendingTweets = new Map();

// --- 1. Database Management ---

function openDB() {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db);
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

function getNextImage() {
    return new Promise(async (resolve, reject) => {
        await openDB();
        const transaction = db.transaction([IMAGE_STORE_NAME], "readonly");
        const store = transaction.objectStore(IMAGE_STORE_NAME);
        const request = store.openCursor(); // Gets the first available record
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            resolve(cursor ? cursor.value : null);
        };
        request.onerror = (event) => reject("Error reading cursor: " + event.target.errorCode);
    });
}

function deleteImage(imageId) {
    return new Promise(async (resolve, reject) => {
        await openDB();
        const transaction = db.transaction([IMAGE_STORE_NAME], "readwrite");
        const store = transaction.objectStore(IMAGE_STORE_NAME);
        const request = store.delete(imageId);
        request.onsuccess = () => {
            console.log(`Image ${imageId} deleted.`);
            resolve();
        };
        request.onerror = (event) => reject("Error deleting image: " + event.target.errorCode);
    });
}

// --- 2. Alarm and Tab Management ---

async function handleAlarm(alarm) {
    if (alarm.name !== "tweetAlarm") return;

    console.log("Tweet alarm triggered.");
    const imageRecord = await getNextImage();

    if (imageRecord) {
        console.log("Found image to post:", imageRecord);
        try {
            const tab = await chrome.tabs.create({ url: "https://x.com/compose/post", active: true });
            // Store the image data temporarily, keyed by the new tab's ID.
            pendingTweets.set(tab.id, imageRecord);
        } catch (error) {
            console.error("Error creating tab:", error);
        }
    } else {
        console.log("No images left to post. Stopping alarm.");
        chrome.alarms.clear("tweetAlarm");
    }
}

// --- 3. Event Listeners ---

// Listener for when a tab is updated (e.g., finishes loading)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Check if this is the tab we're waiting for and if it has finished loading.
    if (changeInfo.status === 'complete' && pendingTweets.has(tabId)) {
        const imageRecord = pendingTweets.get(tabId);
        
        // Convert the Blob to a Data URL to pass it to the content script
        const reader = new FileReader();
        reader.onload = function(event) {
            const dataUrl = event.target.result;

            // Send the data URL to the content script
            chrome.tabs.sendMessage(tabId, {
                action: 'postImage',
                imageDataUrl: dataUrl, // Pass the data URL
                tweetText: imageRecord.text,
                imageId: imageRecord.id,
                imageType: imageRecord.data.type, // Pass mime type
                imageName: imageRecord.data.name || 'image.png' // Pass name, default if none
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Message sending failed:", chrome.runtime.lastError.message);
                } else {
                    console.log("Message sent to content script:", response.status);
                }
                // Clean up the pending record for this tab regardless
                pendingTweets.delete(tabId);
            });
        };
        reader.onerror = function(event) {
            console.error("File reading error:", reader.error);
            pendingTweets.delete(tabId); // Clean up on error
        };
        reader.readAsDataURL(imageRecord.data);
            } else {
                console.log("Message sent to content script:", response.status);
            }
        });
        
        // Clean up the pending record for this tab.
        pendingTweets.delete(tabId);
    }
});

// Main listener for messages from other parts of the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "startTweeting") {
        chrome.storage.sync.get({ tweetDelay: 15 }, (items) => {
            const delay = parseInt(items.tweetDelay, 10);
            // Create a periodic alarm.
            chrome.alarms.create("tweetAlarm", {
                delayInMinutes: delay,
                periodInMinutes: delay
            });
            console.log(`Tweeting alarm set. Delay: ${delay} minutes.`);
            sendResponse({ status: "Alarm set" });
        });
        return true; // Indicates an async response.
    }
    
    if (message.action === "tweetPosted") {
        console.log(`Received confirmation for image ${message.imageId}. Deleting.`);
        deleteImage(message.imageId)
            .then(() => sendResponse({ status: "Image deleted" }))
            .catch(err => sendResponse({ status: "Deletion failed", error: err }));
        return true; // Indicates an async response.
    }
});

// Listener for when the alarm is triggered
chrome.alarms.onAlarm.addListener(handleAlarm);

// Initialize DB on installation
chrome.runtime.onInstalled.addListener(() => {
    console.log("AutoTweeter extension installed/updated.");
    openDB();
});
