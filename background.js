chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startPosting") {
    handlePosting(message.images)
      .then((result) => {
        sendResponse(result)
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message })
      })
    return true // Keep channel open for async response
  }
})

async function handlePosting(images) {
  try {
    // Find or create Twitter tab
    const twitterTab = await findOrCreateTwitterTab()

    // Post each image
    for (let i = 0; i < images.length; i++) {
      const image = images[i]

      // Send status update
      chrome.runtime.sendMessage({
        action: "postingStatus",
        message: `Posting tweet ${i + 1} of ${images.length}...`,
        type: "info",
        complete: false,
      })

      // Execute posting in content script
      await chrome.scripting.executeScript({
        target: { tabId: twitterTab.id },
        func: postTweet,
        args: [image.dataUrl, image.text],
      })

      // Wait for delay before next post (except for last image)
      if (i < images.length - 1) {
        await sleep(image.delay * 1000)
      }
    }

    // Send completion status
    chrome.runtime.sendMessage({
      action: "postingStatus",
      message: "All tweets posted successfully!",
      type: "success",
      complete: true,
    })

    return { success: true }
  } catch (error) {
    chrome.runtime.sendMessage({
      action: "postingStatus",
      message: "Error: " + error.message,
      type: "error",
      complete: true,
    })
    return { success: false, error: error.message }
  }
}

async function findOrCreateTwitterTab() {
  // Check if Twitter/X tab is already open
  const tabs = await chrome.tabs.query({})
  const twitterTab = tabs.find((tab) => tab.url && (tab.url.includes("twitter.com") || tab.url.includes("x.com")))

  if (twitterTab) {
    // Activate existing tab
    await chrome.tabs.update(twitterTab.id, { active: true })
    return twitterTab
  } else {
    // Create new Twitter tab
    return await chrome.tabs.create({ url: "https://twitter.com/home" })
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// This function will be injected into the Twitter page
async function postTweet(imageDataUrl, tweetText) {
  // Helper function to wait for element
  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()

      const checkElement = () => {
        const element = document.querySelector(selector)
        if (element) {
          resolve(element)
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for element: ${selector}`))
        } else {
          setTimeout(checkElement, 100)
        }
      }

      checkElement()
    })
  }

  // Helper to simulate user interaction
  function simulateClick(element) {
    element.click()
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
  }

  try {
    // Wait for page to load
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Find and click the tweet compose button
    const composeSelectors = [
      'a[data-testid="SideNav_NewTweet_Button"]',
      'a[href="/compose/tweet"]',
      '[data-testid="SideNav_NewTweet_Button"]',
    ]

    let composeButton = null
    for (const selector of composeSelectors) {
      composeButton = document.querySelector(selector)
      if (composeButton) break
    }

    if (composeButton) {
      simulateClick(composeButton)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    // Find the tweet text area
    const textAreaSelectors = [
      '[data-testid="tweetTextarea_0"]',
      'div[role="textbox"][data-testid="tweetTextarea_0"]',
      "div.public-DraftEditor-content",
    ]

    let textArea = null
    for (const selector of textAreaSelectors) {
      textArea = await waitForElement(selector, 5000).catch(() => null)
      if (textArea) break
    }

    if (!textArea) {
      throw new Error("Could not find tweet text area")
    }

    // Enter tweet text
    if (tweetText) {
      textArea.focus()
      textArea.textContent = tweetText
      textArea.dispatchEvent(new Event("input", { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    // Convert data URL to file
    const response = await fetch(imageDataUrl)
    const blob = await response.blob()
    const file = new File([blob], "image.jpg", { type: "image/jpeg" })

    // Find file input for images
    const fileInputSelectors = ['input[data-testid="fileInput"]', 'input[type="file"][accept*="image"]']

    let fileInput = null
    for (const selector of fileInputSelectors) {
      fileInput = document.querySelector(selector)
      if (fileInput) break
    }

    if (!fileInput) {
      throw new Error("Could not find file input")
    }

    // Create DataTransfer and add file
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    fileInput.files = dataTransfer.files

    // Trigger change event
    fileInput.dispatchEvent(new Event("change", { bubbles: true }))

    // Wait for image to upload
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Find and click post button
    const postButtonSelectors = [
      '[data-testid="tweetButtonInline"]',
      '[data-testid="tweetButton"]',
      'div[role="button"][data-testid="tweetButton"]',
    ]

    let postButton = null
    for (const selector of postButtonSelectors) {
      postButton = await waitForElement(selector, 5000).catch(() => null)
      if (postButton && !postButton.disabled) break
    }

    if (!postButton) {
      throw new Error("Could not find post button")
    }

    // Click post button
    await new Promise((resolve) => setTimeout(resolve, 1000))
    simulateClick(postButton)

    // Wait for tweet to post
    await new Promise((resolve) => setTimeout(resolve, 3000))

    return { success: true }
  } catch (error) {
    console.error("Error posting tweet:", error)
    throw error
  }
}
