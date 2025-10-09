# Twitter Auto Poster - Chrome Extension

A Chrome extension that allows you to automatically post multiple images to Twitter with custom text and configurable delays between posts.

## Features

- 🖼️ Drag & drop multiple images
- ✍️ Custom tweet text for each image
- ⏱️ Configurable delay between posts (in seconds)
- 🎯 Automatic Twitter tab handling
- 📝 Clean, intuitive UI

## Installation Steps

### 1. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select your `twitter-auto-poster` folder
5. The extension should now appear in your extensions list

### 2. Pin the Extension

1. Click the puzzle piece icon in Chrome toolbar
2. Find "Twitter Auto Poster" and click the pin icon
3. The extension icon will now appear in your toolbar

## How to Use

- **Click the extension icon** in your Chrome toolbar
- **Common Text Template** is text which will be applied to all the tweets. You can specify regular expression to pick text from the image name.

Eg. for image name `ABCAPITAL_2025-09-05_17-50-53_db7d7.png`, to get text as

```
Stock Name: ABCAPITAL
Date: 05-09-2025
```

The input area will look like

```
regex: ^([A-Z]+)_(\d{4})-(\d{2})-(\d{2})
Stock Name: \1
Date: \4-\3-\2
```

The common text will be appended to individual tweet text

- **Drag and drop images** into the drop zone (or click to select files)
- **Enter tweet text** for each image in the provided text boxes
- **Set delay** (in seconds) for the pause between each post
- **Click "Post to Twitter"** button

The extension will:

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

```

```
