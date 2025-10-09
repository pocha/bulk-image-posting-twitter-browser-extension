# Twitter Auto Poster - Chrome Extension

A Chrome extension that allows you to automatically post multiple images to Twitter with custom text and configurable delays between posts.

## Features

- 🖼️ Drag & drop multiple images
- ✍️ Custom tweet text for each image
- ⏱️ Configurable delay between posts (in seconds)
- 🎯 Automatic Twitter tab handling
- 📝 Clean, intuitive UI

## Installation Steps

### 1. Create Extension Files

Create a new folder called `twitter-auto-poster` and create the following files inside it:

**manifest.json** - Main extension configuration
**popup.html** - Extension popup interface
**popup.js** - Popup logic and UI handling
**background.js** - Background service worker for posting
**content.js** - Content script for Twitter pages

(Copy the code from each artifact above into these files)

### 2. Create Icon Images

You need to create three icon images with these dimensions:

- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

You can create simple icon images using any image editor, or use a Twitter bird logo. Place these in the same folder as your other files.

**Quick tip**: You can create a simple colored square as a placeholder icon if needed.

### 3. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select your `twitter-auto-poster` folder
5. The extension should now appear in your extensions list

### 4. Pin the Extension

1. Click the puzzle piece icon in Chrome toolbar
2. Find "Twitter Auto Poster" and click the pin icon
3. The extension icon will now appear in your toolbar

## How to Use

1. **Click the extension icon** in your Chrome toolbar
2. **Drag and drop images** into the drop zone (or click to select files)
3. **Enter tweet text** for each image in the provided text boxes
4. **Set delay** (in seconds) for the pause between each post
5. **Click "Post to Twitter"** button
6. The extension will:
   - Open Twitter (if not already open)
   - Post each image with its text
   - Wait the specified delay before posting the next image

## Important Notes

- ⚠️ **You must be logged into Twitter** before using the extension
- ⏳ Default delay is 5 seconds between posts
- 🔒 The extension only works on twitter.com and x.com domains
- 📸 Only image files are accepted (PNG, JPG, GIF, etc.)

## Troubleshooting

**Extension doesn't post:**

- Make sure you're logged into Twitter
- Check that Twitter's UI hasn't changed (the extension relies on specific UI elements)
- Try manually creating a tweet to ensure Twitter is functioning normally

**Images don't appear:**

- Ensure the images are valid image files
- Check file size (Twitter has limits on image uploads)

**Posts are too fast:**

- Increase the delay value for each image
- Twitter may rate-limit rapid posting

## File Structure

```
twitter-auto-poster/
├── manifest.json
├── popup.html
├── popup.js
├── background.js
├── content.js
├── icon16.png
├── icon48.png
└── icon128.png
```

## Technical Details

- **Manifest Version**: 3
- **Permissions**: activeTab, scripting, tabs
- **Host Permissions**: twitter.com, x.com
- **Content Scripts**: Runs on Twitter/X pages
- **Background**: Service worker for handling posting logic

## Privacy

This extension:

- Does NOT collect any data
- Does NOT send data to external servers
- Only interacts with Twitter when you initiate posting
- Stores images temporarily in memory only

## Limitations

- Twitter's UI must remain relatively consistent
- Rate limiting may apply for rapid posts
- Large images may take longer to upload
- Extension requires Twitter to be accessible and functioning

## Updates

If Twitter changes their UI and the extension stops working, the selectors in `background.js` may need to be updated to match the new UI structure.
