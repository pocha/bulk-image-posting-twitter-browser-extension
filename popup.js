let images = []

const dropZone = document.getElementById("dropZone")
const fileInput = document.getElementById("fileInput")
const imagesList = document.getElementById("imagesList")
const postBtn = document.getElementById("postBtn")
const statusDiv = document.getElementById("status")

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

function renderImages() {
  if (images.length === 0) {
    imagesList.innerHTML = '<div class="empty-state">No images added yet</div>'
    return
  }

  imagesList.innerHTML = images
    .map(
      (img, index) => `
    <div class="image-item">
      <img src="${img.dataUrl}" class="image-preview" alt="${img.name}">
      <div class="image-details">
        <div class="image-name">${img.name}</div>
        <textarea 
          class="tweet-text" 
          placeholder="Enter tweet text for this image..."
          data-index="${index}"
        >${img.text}</textarea>
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
    )
    .join("")

  // Add event listeners
  document.querySelectorAll(".tweet-text").forEach((textarea) => {
    textarea.addEventListener("input", (e) => {
      const index = parseInt(e.target.dataset.index)
      images[index].text = e.target.value
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
    // Send message to background script to handle posting
    chrome.runtime.sendMessage(
      {
        action: "startPosting",
        images: images,
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
