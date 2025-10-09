// Content script for Twitter page
// This runs in the context of Twitter/X web pages

console.log("Twitter Auto Poster content script loaded")

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message)

  if (message.action === "checkTwitterPage") {
    sendResponse({ isTwitter: true })
  }

  return true
})
