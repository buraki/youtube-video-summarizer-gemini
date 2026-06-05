# Chrome Web Store Listing — Gemini YouTube Video Summarizer

> Last Updated: 2026-05-31

## Store Listing

**Extension Name**
Gemini YouTube Video Summarizer

**Short Description**
Summarize YouTube videos in seconds using Gemini 1.5 Flash. Fully integrated into YouTube's native 3-dots menus.

**Detailed Description**
⚠️ **IMPORTANT NOTE:** To use this extension, you must provide your own Google Gemini API Key. You can get a free key from Google AI Studio in less than a minute. The extension runs entirely on your local browser and connects directly to Google's official API, keeping your keys and data 100% private and secure.

Summarize any YouTube video in seconds without leaving your current page! Powered by Google's Gemini 1.5 Flash model, the Gemini YouTube Video Summarizer lets you grasp key insights, takeaways, and outlines from video transcripts instantaneously.

Perfect for students, researchers, professionals, and busy learners who want to pre-screen video content or review core arguments in a fraction of the time.

FEATURES:
- Native Integration: The "Summarize with Gemini" option integrates directly into YouTube's native 3-dots menu on video cards (homepage, subscriptions, search, etc.) and player controls.
- Glassmorphic Sidebar: A beautiful slide-over translucent panel displays summaries without disrupting your browsing context.
- Interactive Conversational Q&A: Ask questions directly about the video context, especially on details not included in the summary. Ask follow-up queries with full context preservation and conversational state memory.
- Perfect YouTube Typography: Beautifully styled with `"Roboto"` and `"YouTube Sans"`, matching YouTube's exact text sizing, line heights, and neutral light-theme colors.
- Progress Tracker: Real-time visual steps showing you when video details are read, captions are processed, and Gemini is compiling.
- Multi-lingual Support: Instantly switch and generate summaries in Turkish, English, Spanish, German, French, Russian, and Portuguese.
- Fallback Capability: For videos without captions/transcripts (music or disabled settings), the AI compiles a summary using video descriptions, tags, and metadata.
- Clipboard Ready: Copy the clean Markdown formatted summary with a single click.

HOW TO USE IT:
1. Load the extension and click its toolbar icon to input your free Gemini API Key (obtained from Google AI Studio).
2. Browse YouTube and click the 3-dots menu button on any video thumbnail or card.
3. Select "Summarize with Gemini".
4. The premium sidebar panel will slide in from the right, display the summary, and let you ask conversational follow-up questions at the bottom!

PRIVACY NOTE:
We value your privacy. The extension runs entirely client-side. Your Gemini API key is stored securely in your local browser sync storage and is only ever sent directly to Google's official Gemini API servers. No user details, search history, or video interactions are collected, monitored, or transmitted to any third-party servers.

**Category**
Productivity

**Single Purpose**
Summarizes YouTube videos directly on the YouTube website using Gemini AI.

**Primary Language**
English

---

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128×128 PNG | ✅ Ready | `icons/icon-128.png` |
| Screenshot 1 | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 2 | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 3 | 1280×800 or 640×400 | ⬜ Not created | |

### Screenshot Notes
- **Screenshot 1**: In-context demonstration showing a YouTube search results page, clicking the 3-dots on a video thumbnail card, and highlighting the injected "Summarize with Gemini" menu item.
- **Screenshot 2**: Displaying the sliding glassmorphic sidebar panel actively showing a formatted English summary (Overview, Key Takeaways with time markers, and Conclusion) alongside the video feed.
- **Screenshot 3**: Displaying the options popup UI demonstrating API Key entry, visibility toggle, and the selected language picker dropdown.

---

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | Required to save the user's preferred summary language and secure Gemini API Key across synced Chrome instances. |
| `*://*.youtube.com/*` | host_permissions | Required to detect video thumbnail 3-dots interactions, inject custom menu options on the YouTube site, and fetch watch page HTML/JSON transcript tracks. |
| `*://generativelanguage.googleapis.com/*` | host_permissions | Required to enable the background service worker to send POST queries to the Gemini API (`gemini-1.5-flash`) for summary generation. |

---

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** Yes (Processed locally only)

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Website content | Yes | Yes (Only to Google Gemini API) | We fetch the YouTube transcript text and video metadata, which is sent directly and securely to the Google Gemini API to compile the requested summary. | No (Sent only to Google's official API endpoints, never shared or stored on developer servers). |

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

---

## Privacy Policy

**Privacy Policy URL**
https://github.com/developer/gemini-youtube-summarizer/blob/main/PRIVACY.md

---

## Distribution

**Visibility**: Public
**Regions**: All regions
**Pricing**: Free

---

## Developer Info

**Publisher Name**
AI Sparkle Extensions

**Contact Email**
support@aisparkle.dev

**Support URL / Email**
https://github.com/developer/gemini-youtube-summarizer/issues

**Homepage URL**
https://github.com/developer/gemini-youtube-summarizer

---

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.0 | 2026-05-31 | Initial release with YouTube native menu integration, glassmorphic sidebar summaries, and multi-lingual support. | Draft |

---

## Review Notes

### Known Issues / Limitations
- Short-form content (YouTube Shorts) are supported, but summary length is naturally constrained by the short duration of the video.
- Auto-generated captions are supported, but translation quality corresponds to YouTube's caption transcript fidelity.

---

## Tester Instructions (Submit to Chrome Web Store Console)

> [!IMPORTANT]
> When submitting your extension in the Chrome Web Store Developer Console, paste the following instructions in the **"Tester instructions"** text box under the **"Privacy practices"** or **"Store listing"** section.
> You **MUST** provide a temporary, valid Gemini API Key inside the instructions so the reviewer can test the extension successfully without having to create their own key.

### Tester Instructions Text to Copy:
```text
TESTER INSTRUCTIONS:
This extension is a client-side utility that summarizes YouTube videos using Google's Gemini API. It requires a Gemini API Key to function. 

Please use the following active, pre-configured Gemini API Key to test all features of the extension during your review:
API KEY: [PASTE_A_VALID_API_KEY_HERE]

STEPS TO TEST & REPRODUCE:
1. Install the extension.
2. Click on the extension's toolbar icon to open the configuration popup.
3. Paste the Gemini API Key provided above into the "Gemini API Key" input field.
4. Click the "Save API Key" button (it will display a green checkmark indicating the key is validated and saved).
5. Open any watchable YouTube video with English captions/transcripts (e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ).
6. Click the native YouTube 3-dots menu icon below the video player (next to Share/Download buttons) or on any video thumbnail card.
7. Click the "Summarize with Gemini" option (marked with a blue sparkle icon).
8. A beautiful glassmorphic sidebar panel will slide in from the right and successfully generate a complete, structured summary using Gemini 1.5 Flash.
9. Type a question in the "Ask a question..." chatbox at the bottom of the sidebar (e.g., "What is the main topic?") and click Send to test the interactive Q&A dialogue.
```
