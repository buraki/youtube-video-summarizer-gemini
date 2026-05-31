# Privacy Policy for Gemini YouTube Video Summarizer

*Last Updated: May 31, 2026*

This Privacy Policy explains how the **Gemini YouTube Video Summarizer** Chrome Extension ("we", "our", or "the extension") handles user data. We are committed to protecting your privacy and ensuring a secure, transparent browsing experience.

---

## 1. Information Collection & Use

The extension is designed to run entirely client-side. We do not collect, store, or transmit any personally identifiable information (PII). 

To perform the core video summarization and Q&A functions, the extension temporarily reads and processes the following data:
- **YouTube Video Content & Transcripts**: The extension extracts video transcript lines, title, channel name, and description from the active YouTube watch tab you select.
- **User Queries**: When you use the interactive Q&A feature, the extension processes the text questions you write to formulate answers.

This data is processed **locally** in your browser and is only transmitted directly and securely to **Google's official Gemini API servers** (`*://generativelanguage.googleapis.com/*`) to compile the requested summaries and chat responses.

---

## 2. API Key Security & Storage

- Your Gemini API Key is stored securely on your local device using Chrome's synced storage API (`chrome.storage.sync`).
- The API key is only used to authenticate your requests directly with Google's Gemini API endpoints.
- We **never** store, transmit, or share your API Key with the developer, any third-party servers, or analytical services.

---

## 3. Data Transmission & Third-Party Services

The extension communicates directly with:
- **YouTube (`*://*.youtube.com/*`)**: To fetch transcript XML/JSON tracks and video details.
- **Google Gemini API (`*://generativelanguage.googleapis.com/*`)**: To send context paragraphs and retrieve summaries.

No other external servers or APIs are called. No tracking, telemetry, or analytics scripts are embedded in the extension.

---

## 4. Data Sharing & Retention

- **No Sale of Data**: We do not sell, rent, or trade your data or queries with third parties under any circumstances.
- **No Retention**: We do not retain copies of your video transcripts, summaries, or questions. All conversations inside the sidebar are ephemeral and are completely cleared when you navigate away, summarize a new video, or close the browser tab.
- **Local Purge**: You can wipe all saved settings (including your API Key and default language preferences) at any time by clicking the extension's toolbar icon and clearing the input fields, or by simply uninstalling the extension.

---

## 5. Chrome Web Store Compliance

We strictly adhere to the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/user-data/):
- **Single Purpose**: All permissions requested (`storage`, YouTube host permissions, and Gemini API host permissions) are strictly necessary to support the core, single-purpose function of summarizing YouTube videos on-site.
- **Data Minimization**: We only request the minimum required permissions to read YouTube transcript streams and call the Gemini API.

---

## 6. Contact & Support

If you have any questions or feedback regarding this Privacy Policy or the security of your data, please open an issue on our GitHub repository:
🔗 [GitHub Issues](https://github.com/buraki/youtube-video-summarizer-gemini/issues)
