chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startPosting") {
    // Start posting in background - don't wait for response
    handlePosting(message.images)
    // Immediately respond so popup doesn't wait
    sendResponse({ success: true, started: true })
    return false
  }
})

async function handlePosting(images) {
  try {
    // Show browser notification that posting has started
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon48.png",
      title: "Twitter Auto Poster",
      message: `Starting to post ${images.length} tweet(s)...`,
    })

    // Find or create Twitter tab
    const twitterTab = await findOrCreateTwitterTab()

    // Wait for tab to load
    await sleep(3000)

    // Post each image
    for (let i = 0; i < images.length; i++) {
      const image = images[i]

      // Show notification for each tweet
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon48.png",
        title: "Twitter Auto Poster",
        message: `Posting tweet ${i + 1} of ${images.length}...`,
      })

      // Execute posting in content script
      const result = await chrome.scripting.executeScript({
        target: { tabId: twitterTab.id },
        func: postTweet,
        args: [image.dataUrl, image.finalText || image.text || ""],
      })

      if (result && result[0] && result[0].result && !result[0].result.success) {
        throw new Error(result[0].result.error || "Failed to post tweet")
      }

      // Wait for delay before next post (except for last image)
      if (i < images.length - 1) {
        await sleep(image.delay * 1000)
      }
    }

    // Show completion notification
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon48.png",
      title: "Twitter Auto Poster",
      message: "All tweets posted successfully! ✓",
    })
  } catch (error) {
    // Show error notification
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon48.png",
      title: "Twitter Auto Poster - Error",
      message: "Error: " + error.message,
    })
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
    const newTab = await chrome.tabs.create({ url: "https://twitter.com/home" })
    // Wait for tab to load
    await sleep(3000)
    return newTab
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// This function will be injected into the Twitter page
async function postTweet(imageDataUrl, tweetText) {
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  try {
    // Wait for page to be ready
    await sleep(2000)

    // Find and click the tweet compose button
    const composeSelectors = [
      'a[data-testid="SideNav_NewTweet_Button"]',
      'a[href="/compose/tweet"]',
      '[data-testid="SideNav_NewTweet_Button"]',
      'a[aria-label="Post"]',
    ]

    let composeButton = null
    for (const selector of composeSelectors) {
      composeButton = document.querySelector(selector)
      if (composeButton) break
    }

    if (composeButton) {
      composeButton.click()
      await sleep(1500)
    }

    // Find the tweet text area
    const textAreaSelectors = [
      'div[data-testid="tweetTextarea_0"]',
      'div[role="textbox"][contenteditable="true"]',
      '.public-DraftEditor-content[contenteditable="true"]',
      'div.DraftEditor-editorContainer div[contenteditable="true"]',
    ]

    let textArea = null
    for (const selector of textAreaSelectors) {
      const elements = document.querySelectorAll(selector)
      for (const el of elements) {
        if (el.offsetParent !== null) {
          textArea = el
          break
        }
      }
      if (textArea) break
    }

    if (!textArea) {
      throw new Error("Could not find tweet text area")
    }

    // STEP 1: Click on text area
    textArea.click()
    textArea.focus()
    await sleep(500)

    // STEP 2: Type text using document.execCommand
    if (tweetText && tweetText.trim()) {
      // Use execCommand to insert text - this properly updates React state
      for (let i = 0; i < tweetText.length; i++) {
        const char = tweetText[i]

        if (char === "\n") {
          // For newlines, use insertLineBreak or insertParagraph
          document.execCommand("insertLineBreak", false)
        } else {
          // Insert each character using execCommand
          document.execCommand("insertText", false, char)
        }

        // Small delay between characters to simulate human typing
        await sleep(30)
      }

      // Wait after typing is complete
      await sleep(1000)
    }

    // STEP 3: Find and click the image attachment button
    const imageButtonSelectors = [
      'div[data-testid="toolBar"] input[type="file"]',
      'input[data-testid="fileInput"]',
      'input[type="file"][accept*="image"]',
    ]

    let fileInput = null
    for (const selector of imageButtonSelectors) {
      fileInput = document.querySelector(selector)
      if (fileInput) break
    }

    if (!fileInput) {
      throw new Error("Could not find image attachment button")
    }

    // STEP 4: Attach the image
    const response = await fetch(imageDataUrl)
    const blob = await response.blob()
    const file = new File([blob], "image.jpg", { type: "image/jpeg" })

    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    fileInput.files = dataTransfer.files

    // Trigger change event to upload the image
    fileInput.dispatchEvent(new Event("change", { bubbles: true }))
    fileInput.dispatchEvent(new Event("input", { bubbles: true }))

    // Wait for image to upload
    await sleep(3000)

    // STEP 5: Find and click post button
    const postButtonSelectors = [
      'button[data-testid="tweetButtonInline"]',
      'button[data-testid="tweetButton"]',
      'div[role="button"][data-testid="tweetButton"]',
    ]

    let postButton = null
    for (const selector of postButtonSelectors) {
      const buttons = document.querySelectorAll(selector)
      for (const btn of buttons) {
        const buttonText = btn.textContent.toLowerCase()
        if ((buttonText.includes("post") || buttonText.includes("tweet")) && !btn.disabled) {
          postButton = btn
          break
        }
      }
      if (postButton) break
    }

    if (!postButton) {
      throw new Error("Could not find post button")
    }

    // Wait a bit before clicking post
    await sleep(1000)

    // Click post button
    postButton.click()

    // Wait for tweet to post
    await sleep(3000)

    return { success: true }
  } catch (error) {
    console.error("Error posting tweet:", error)
    return { success: false, error: error.message }
  }
}
