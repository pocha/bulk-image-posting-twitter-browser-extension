let images = []
let commonText = ""

const dropZone = document.getElementById("dropZone")
const fileInput = document.getElementById("fileInput")
const imagesList = document.getElementById("imagesList")
const postBtn = document.getElementById("postBtn")
const statusDiv = document.getElementById("status")
const commonTextArea = document.getElementById("commonText")

// Common text change handler
commonTextArea.addEventListener("input", (e) => {
  commonText = e.target.value
  renderImages() // Re-render to update previews
})

// Drop zone events
dropZone.addEventListener("click", () => fileInput.click())

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault()
  dropZone.classList.add("dragover")
})

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover")
})

dropZone.addEventListener("drop", (e) => {
  e.preventDefault()
  dropZone.classList.remove("dragover")
  handleFiles(e.dataTransfer.files)
})

fileInput.addEventListener("change", (e) => {
  handleFiles(e.target.files)
})

function handleFiles(files) {
  const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"))

  imageFiles.forEach((file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const imageData = {
        id: Date.now() + Math.random(),
        name: file.name,
        dataUrl: e.target.result,
        text: "",
        delay: 5,
      }
      images.push(imageData)
      renderImages()
      updatePostButton()
    }
    reader.readAsDataURL(file)
  })
}

function processCommonText(filename, commonTextTemplate) {
  if (!commonTextTemplate || !commonTextTemplate.trim()) {
    return ""
  }

  const lines = commonTextTemplate.split("\n")
  let result = commonTextTemplate

  // Check if first line starts with "regex:"
  if (lines[0].trim().toLowerCase().startsWith("regex:")) {
    const regexPattern = lines[0].substring(lines[0].indexOf(":") + 1).trim()
    const templateLines = lines.slice(1) // Rest of the lines

    try {
      const regex = new RegExp(regexPattern)
      const match = filename.match(regex)

      if (match) {
        // Start with the template (without the regex line)
        result = templateLines.join("\n")

        // Replace \1, \2, etc. with captured groups
        for (let i = 1; i < match.length; i++) {
          const placeholder = "\\" + i
          result = result.split(placeholder).join(match[i])
        }
      } else {
        // No match, return template without replacements
        result = templateLines.join("\n")
      }
    } catch (error) {
      console.error("Regex error:", error)
      // If regex is invalid, return the template as-is (without regex line)
      result = templateLines.join("\n")
    }
  }

  return result
}

function getFinalTweetText(image) {
  const commonProcessed = processCommonText(image.name, commonText)
  const imageSpecificText = image.text || ""

  // Combine common text and image-specific text
  if (commonProcessed && imageSpecificText) {
    return commonProcessed + "\n\n" + imageSpecificText
  } else if (commonProcessed) {
    return commonProcessed
  } else {
    return imageSpecificText
  }
}

function renderImages() {
  if (images.length === 0) {
    imagesList.innerHTML = '<div class="empty-state">No images added yet</div>'
    return
  }

  imagesList.innerHTML = images
    .map((img, index) => {
      const finalText = getFinalTweetText(img)
      return `
    <div class="image-item">
      <img src="${img.dataUrl}" class="image-preview" alt="${img.name}">
      <div class="image-details">
        <div class="image-name">${img.name}</div>
        <textarea 
          class="tweet-text" 
          placeholder="Enter additional tweet text for this image..."
          data-index="${index}"
        >${img.text}</textarea>
        ${
          finalText
            ? `
        <div class="preview-section">
          <div class="preview-label">Final Tweet Preview:</div>
          <div class="preview-text">${finalText}</div>
        </div>
        `
            : ""
        }
        <div class="delay-label">Delay before next post (seconds):</div>
        <input 
          type="number" 
          class="delay-input" 
          min="0" 
          value="${img.delay}"
          data-index="${index}"
          placeholder="Delay in seconds"
        >
        <button class="remove-btn" data-index="${index}">Remove</button>
      </div>
    </div>
  `
    })
    .join("")

  // Add event listeners
  document.querySelectorAll(".tweet-text").forEach((textarea) => {
    textarea.addEventListener("input", (e) => {
      const index = parseInt(e.target.dataset.index)
      images[index].text = e.target.value
      renderImages() // Re-render to update preview
    })
  })

  document.querySelectorAll(".delay-input").forEach((input) => {
    input.addEventListener("input", (e) => {
      const index = parseInt(e.target.dataset.index)
      images[index].delay = parseInt(e.target.value) || 0
    })
  })

  document.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.target.dataset.index)
      images.splice(index, 1)
      renderImages()
      updatePostButton()
    })
  })
}

function updatePostButton() {
  postBtn.disabled = images.length === 0
}

function showStatus(message, type) {
  statusDiv.textContent = message
  statusDiv.className = `status ${type}`
  setTimeout(() => {
    statusDiv.className = "status"
  }, 5000)
}

postBtn.addEventListener("click", async () => {
  if (images.length === 0) return

  postBtn.disabled = true
  showStatus("Starting to post tweets...", "info")

  try {
    // Prepare images with final text
    const imagesWithFinalText = images.map((img) => ({
      ...img,
      finalText: getFinalTweetText(img),
    }))

    // Send message to background script to handle posting
    chrome.runtime.sendMessage(
      {
        action: "startPosting",
        images: imagesWithFinalText,
      },
      (response) => {
        if (response && response.success) {
          showStatus("All tweets posted successfully!", "success")
          images = []
          renderImages()
          updatePostButton()
        } else {
          showStatus("Error: " + (response?.error || "Unknown error occurred"), "error")
          postBtn.disabled = false
        }
      }
    )
  } catch (error) {
    showStatus("Error: " + error.message, "error")
    postBtn.disabled = false
  }
})

// Listen for status updates from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "postingStatus") {
    showStatus(message.message, message.type)
    if (message.complete) {
      postBtn.disabled = false
    }
  }
})
