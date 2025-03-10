# Installation Guide

## Prerequisites

- Google Chrome browser
- Node.js and npm (only if you need to generate the icons)

## Generate Icons (Optional)

If you need to generate the PNG icons from the SVG file:

1. Navigate to the Extension directory
2. Install dependencies:
   ```
   npm install
   ```
3. Run the icon generation script:
   ```
   npm run generate-icons
   ```

## Install the Extension in Chrome

1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" by toggling the switch in the top-right corner
4. Click "Load unpacked"
5. Select the `Extension` directory from this repository
6. The extension should now appear in your Chrome toolbar

## Usage

1. Click the extension icon in your Chrome toolbar
2. Type a company code or name in the search box
3. Select a company from the autocomplete suggestions
4. Click "Access Single Holding" to open the appropriate share registry portal

## Troubleshooting

- If the extension doesn't load, check the Chrome developer console for errors
- If company data doesn't load, ensure you have an active internet connection
- If icons don't appear, make sure you've generated them using the steps above 