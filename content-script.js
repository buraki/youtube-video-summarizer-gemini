// YouTube Video Summarizer Content Script

(function () {
  let lastClickedVideoUrl = '';
  let sidebarPanel = null;
  let currentLanguage = 'en'; // Default fallback, will sync with storage
  let popupObserverAttached = false;
  
  // Q&A Thread State
  let activeVideoContext = null;
  let activeChatHistory = [];

  // Initialize the script
  init();

  function init() {
    console.log('[Gemini Summarizer] Initializing content script...');
    
    // 1. Sync default language from storage
    chrome.storage.sync.get('defaultLanguage', (data) => {
      if (data.defaultLanguage) {
        currentLanguage = data.defaultLanguage;
        console.log('[Gemini Summarizer] Loaded language:', currentLanguage);
      }
    });

    // 2. Register click listener to track which video's 3-dots button was clicked
    document.addEventListener('click', handleGlobalClick, true);

    // 3. Register MutationObserver to inject our custom item into YouTube's popup menu
    const observer = new MutationObserver(handleDomMutations);
    observer.observe(document.body, { childList: true, subtree: true });

    // 4. Proactively check if popup container already exists and bind Shadow DOM observer
    attachShadowPopupObserver();

    console.log('[Gemini Summarizer] Content script injected successfully!');
  }

  // Intercept click events to extract video URL from the clicked element's parent cards
  function handleGlobalClick(event) {
    const path = event.composedPath();
    let isMenuBtn = false;
    
    console.log('[Gemini Summarizer] Click captured on element:', event.target);
    
    // 1. Walk the composed path to detect a 3-dots action menu click (crossing Shadow DOM boundaries)
    for (const el of path) {
      if (!el.tagName) continue;
      
      const tag = el.tagName.toUpperCase();
      const id = el.id;
      const ariaLabel = el.getAttribute ? el.getAttribute('aria-label') : '';
      const classes = el.classList ? Array.from(el.classList) : [];

      if (
        tag === 'YT-ICON-BUTTON' || 
        id === 'button' || 
        classes.includes('yt-icon-button') ||
        ariaLabel === 'Action menu' ||
        ariaLabel === 'Menu' ||
        classes.includes('menu-button')
      ) {
        isMenuBtn = true;
        break;
      }
    }

    // 2. Traverse the composed path to identify the parent video card container
    let videoUrl = '';
    for (const el of path) {
      if (!el.tagName) continue;
      
      const tag = el.tagName.toUpperCase();
      const id = el.id;
      
      if (
        tag === 'YTD-RICH-ITEM-RENDERER' || 
        tag === 'YTD-VIDEO-RENDERER' || 
        tag === 'YTD-GRID-VIDEO-RENDERER' || 
        tag === 'YTD-COMPACT-VIDEO-RENDERER' || 
        tag === 'YTD-PLAYLIST-VIDEO-RENDERER' ||
        tag === 'YTD-REEL-ITEM-RENDERER' ||
        id === 'dismissible'
      ) {
        // Find anchor tag pointing to video watch url inside this card
        const linkEl = el.querySelector('a[href*="/watch?v="], a[href*="/shorts/"]');
        if (linkEl) {
          videoUrl = linkEl.href;
          break;
        }
      }
    }

    // Fallback: If we clicked the player control's 3-dots button itself on a watch page
    if (!videoUrl && window.location.href.includes('/watch?v=')) {
      videoUrl = window.location.href;
    }

    if (videoUrl) {
      // Clean up the URL (removing playlist tags etc. to get simple watch?v=)
      lastClickedVideoUrl = cleanVideoUrl(videoUrl);
      console.log('[Gemini Summarizer] Associated Video URL found:', lastClickedVideoUrl);
    }

    // ULTIMATE FALLBACK: Always trigger check and inject sweeps on ANY click, regardless of button matching!
    console.log('[Gemini Summarizer] Scheduling injection sweeps...');
    setTimeout(checkForAndInjectMenu, 50);
    setTimeout(checkForAndInjectMenu, 150);
    setTimeout(checkForAndInjectMenu, 300);
    setTimeout(checkForAndInjectMenu, 600);
    setTimeout(checkForAndInjectMenu, 1200);
  }

  // Cleans the YouTube URL to have standard watch?v= format
  function cleanVideoUrl(url) {
    try {
      const urlObj = new URL(url);
      if (urlObj.pathname.startsWith('/shorts/')) {
        const id = urlObj.pathname.split('/')[2];
        return `https://www.youtube.com/watch?v=${id}`;
      }
      const videoId = urlObj.searchParams.get('v');
      if (videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
      }
      return url;
    } catch (e) {
      return url;
    }
  }

  // Mutation observer handler to inject our item into YouTube's native action menu
  function handleDomMutations(mutations) {
    checkForAndInjectMenu();
    attachShadowPopupObserver();
  }

  // Helper to bind observer to ytd-popup-container's Shadow DOM to monitor dynamic Polymer dropdown renders
  function attachShadowPopupObserver() {
    if (popupObserverAttached) return;

    const popupContainer = document.querySelector('ytd-popup-container');
    if (popupContainer && popupContainer.shadowRoot) {
      const popupObserver = new MutationObserver(() => {
        checkForAndInjectMenu();
      });
      popupObserver.observe(popupContainer.shadowRoot, { childList: true, subtree: true });
      popupObserverAttached = true;
      console.log('[Gemini Summarizer] Popup Container Shadow DOM observer successfully attached!');
    }
  }

  // Robust check traversing YouTube's Shadow DOM to find and inject the custom menu item
  function checkForAndInjectMenu() {
    console.log('[Gemini Summarizer] checkForAndInjectMenu sweep running...');
    
    const popupContainer = document.querySelector('ytd-popup-container');
    if (!popupContainer) return;

    // --- PIPELINE A: Modern View Model Structure (yt-list-view-model) ---
    const listViewModel = popupContainer.querySelector('yt-list-view-model');
    if (listViewModel) {
      if (!listViewModel.querySelector('#gemini-summarize-menu-item-modern')) {
        console.log('[Gemini Summarizer] Modern yt-list-view-model found! Injecting modern item...');
        injectModernMenuButton(listViewModel);
      } else {
        console.log('[Gemini Summarizer] Modern menu item already exists.');
      }
      return; // Exit as modern UI is handled
    }

    // --- PIPELINE B: Legacy Polymer Structure (ytd-menu-popup-renderer / tp-yt-paper-listbox) ---
    let menuRenderer = document.querySelector('ytd-menu-popup-renderer') || 
                       popupContainer.querySelector('ytd-menu-popup-renderer');
    
    if (!menuRenderer && popupContainer.shadowRoot) {
      menuRenderer = popupContainer.shadowRoot.querySelector('ytd-menu-popup-renderer');
    }
    
    if (menuRenderer) {
      const listbox = (menuRenderer.shadowRoot ? menuRenderer.shadowRoot.querySelector('tp-yt-paper-listbox') : null) || 
                      menuRenderer.querySelector('tp-yt-paper-listbox');
                      
      if (listbox) {
        if (!listbox.querySelector('#gemini-summarize-menu-item')) {
          console.log('[Gemini Summarizer] Legacy listbox found! Injecting legacy menu item...');
          injectMenuButton(listbox);
        } else {
          console.log('[Gemini Summarizer] Legacy menu item already exists.');
        }
      } else {
        console.log('[Gemini Summarizer] tp-yt-paper-listbox not found inside legacy menuRenderer!');
      }
    } else {
      console.log('[Gemini Summarizer] No compatible menu container found.');
    }
  }

  // Create and inject a beautifully matching "Summarize with Gemini" list item into modern YouTube menus
  function injectModernMenuButton(listViewModel) {
    const customItem = document.createElement('yt-list-item-view-model');
    customItem.id = 'gemini-summarize-menu-item-modern';
    customItem.className = 'style-scope yt-list-view-model';
    
    // We recreate YouTube's standard button layout inside yt-list-item-view-model
    customItem.innerHTML = `
      <div class="yt-list-item-view-model-content" style="cursor: pointer; display: flex; align-items: center; padding: 0 16px; min-height: 40px; width: 100%; box-sizing: border-box; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='rgba(255,255,255,0.08)'" onmouseout="this.style.backgroundColor='transparent'">
        <div style="margin-right: 12px; display: flex; align-items: center; justify-content: center; fill: currentColor; width: 24px; height: 24px; color: var(--yt-spec-text-primary);">
          <!-- Custom sparkle icon -->
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M12 2L14.73 8.35L21.36 9.77L16.29 14.07L17.88 20.65L12 17.06L6.12 20.65L7.71 14.07L2.64 9.77L9.27 8.35L12 2Z" fill="url(#sparkle-grad-modern)"/>
            <defs>
              <linearGradient id="sparkle-grad-modern" x1="2" y1="2" x2="21" y2="21" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#8ab4f8" />
                <stop offset="100%" stop-color="#c58af9" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <span style="flex: 1; font-size: 14px; font-family: Roboto, Arial, sans-serif; color: var(--yt-spec-text-primary); font-weight: 400; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          Summarize with Gemini
        </span>
      </div>
    `;

    customItem.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Close the native YouTube dropdown menu
      const bodyClick = new MouseEvent('click', { bubbles: true });
      document.body.dispatchEvent(bodyClick);

      // Trigger the summarization flow
      const url = lastClickedVideoUrl || window.location.href;
      startSummarizationFlow(url);
    });

    listViewModel.appendChild(customItem);
    console.log('[Gemini Summarizer] Modern menu item injected successfully!');
  }

  // Create and inject a beautifully matching "Summarize with Gemini" list item into YouTube's menu listbox
  function injectMenuButton(listbox) {
    const customItem = document.createElement('ytd-menu-service-item-renderer');
    customItem.id = 'gemini-summarize-menu-item';
    customItem.className = 'style-scope ytd-menu-popup-renderer';
    customItem.setAttribute('role', 'menuitem');

    // Create the inner paper-item styled element exactly like native YouTube items
    customItem.innerHTML = `
      <tp-yt-paper-item class="style-scope ytd-menu-service-item-renderer" role="option" style="cursor: pointer; display: flex; align-items: center; padding: 0 36px 0 16px; min-height: 36px; height: 36px;">
        <span class="style-scope ytd-menu-service-item-renderer" style="margin-right: 16px; display: flex; align-items: center; justify-content: center; color: var(--yt-spec-text-primary); fill: currentColor; width: 24px; height: 24px;">
          <!-- Custom sparkle icon -->
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M12 2L14.73 8.35L21.36 9.77L16.29 14.07L17.88 20.65L12 17.06L6.12 20.65L7.71 14.07L2.64 9.77L9.27 8.35L12 2Z" fill="url(#sparkle-grad-content)"/>
            <defs>
              <linearGradient id="sparkle-grad-content" x1="2" y1="2" x2="21" y2="21" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#8ab4f8" />
                <stop offset="100%" stop-color="#c58af9" />
              </linearGradient>
            </defs>
          </svg>
        </span>
        <span class="style-scope ytd-menu-service-item-renderer" style="flex: 1; font-size: 14px; font-family: Roboto, Arial, sans-serif; color: var(--yt-spec-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          Summarize with Gemini
        </span>
      </tp-yt-paper-item>
    `;

    // Click handler for our custom menu item
    customItem.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Close the native YouTube dropdown menu
      const bodyClick = new MouseEvent('click', { bubbles: true });
      document.body.dispatchEvent(bodyClick);

      // Trigger the summarization flow
      const url = lastClickedVideoUrl || window.location.href;
      startSummarizationFlow(url);
    });

    listbox.appendChild(customItem);
  }

  // Triggers the main sequence
  async function startSummarizationFlow(videoUrl) {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      alert('Could not identify YouTube Video ID. Please make sure the link is valid.');
      return;
    }

    // Refresh default language preference in case it changed
    chrome.storage.sync.get('defaultLanguage', (data) => {
      if (data.defaultLanguage) {
        currentLanguage = data.defaultLanguage;
      }
      // Inject sidebar if not present, and open it
      showSidebar();
      performSummarization(videoId, videoUrl);
    });
  }

  function extractVideoId(url) {
    try {
      const urlObj = new URL(url);
      if (urlObj.pathname.startsWith('/shorts/')) {
        return urlObj.pathname.split('/')[2];
      }
      return urlObj.searchParams.get('v');
    } catch (e) {
      return null;
    }
  }

  // Create and show the Glassmorphic Sidebar panel
  function showSidebar() {
    if (!sidebarPanel) {
      sidebarPanel = document.createElement('div');
      sidebarPanel.id = 'gemini-sidebar-panel';
      sidebarPanel.className = 'gemini-sidebar';
      
      sidebarPanel.innerHTML = `
        <div class="gemini-sidebar-glass"></div>
        <div class="gemini-sidebar-content">
          <!-- Header -->
          <div class="gemini-header">
            <div class="gemini-header-logo">
              <svg class="sparkle-logo" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L14.73 8.35L21.36 9.77L16.29 14.07L17.88 20.65L12 17.06L6.12 20.65L7.71 14.07L2.64 9.77L9.27 8.35L12 2Z" fill="url(#sidebar-grad)"/>
                <defs>
                  <linearGradient id="sidebar-grad" x1="2" y1="2" x2="21" y2="21" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#8ab4f8" />
                    <stop offset="50%" stop-color="#c58af9" />
                    <stop offset="100%" stop-color="#e8f0fe" />
                  </linearGradient>
                </defs>
              </svg>
              <h2>Gemini Video Summarizer</h2>
            </div>
            <button class="gemini-close-btn" id="gemini-close-btn">&times;</button>
          </div>

          <!-- Video Details Card -->
          <div class="gemini-video-info">
            <h3 id="gemini-video-title">Loading video details...</h3>
            <p id="gemini-video-channel"></p>
          </div>

          <!-- Progress / Loading Feed -->
          <div class="gemini-status-area" id="gemini-status-area">
            <div class="status-spinner-container">
              <div class="status-spinner"></div>
              <div class="status-glow"></div>
            </div>
            <div class="status-steps">
              <div class="status-step active" id="step-info">Fetching video details...</div>
              <div class="status-step" id="step-transcript">Retrieving video transcript...</div>
              <div class="status-step" id="step-ai">Gemini generating summary...</div>
            </div>
          </div>

          <!-- Interactive Action Panel -->
          <div class="gemini-actions hidden" id="gemini-actions">
            <!-- Language Dropdown -->
            <div class="gemini-lang-selector">
              <label for="gemini-lang-select">Language:</label>
              <div class="gemini-select-wrapper">
                <select id="gemini-lang-select">
                  <option value="en">English</option>
                  <option value="tr">Türkçe (Turkish)</option>
                  <option value="es">Español (Spanish)</option>
                  <option value="de">Deutsch (German)</option>
                  <option value="fr">Français (French)</option>
                  <option value="ru">Русский (Russian)</option>
                  <option value="pt">Português (Portuguese)</option>
                </select>
              </div>
            </div>

            <!-- Toolbar buttons -->
            <div class="gemini-toolbar">
              <button class="gemini-action-btn" id="gemini-copy-btn" title="Copy to Clipboard">
                <svg class="icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copy
              </button>
              <button class="gemini-action-btn" id="gemini-regen-btn" title="Regenerate Summary">
                <svg class="icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
                </svg>
                Retry
              </button>
            </div>
          </div>

          <!-- Summary TextBox / Content -->
          <div class="gemini-summary-box hidden" id="gemini-summary-box">
            <div class="gemini-summary-content" id="gemini-summary-content"></div>
            
            <!-- Interactive Q&A Section -->
            <div class="gemini-qa-section" id="gemini-qa-section">
              <div class="gemini-qa-divider"></div>
              <h4 class="gemini-qa-header">
                <svg class="icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                Videoya Soru Sor
              </h4>
              
              <!-- Q&A Thread Container -->
              <div class="gemini-qa-thread" id="gemini-qa-thread"></div>
              
              <!-- Q&A Input Container -->
              <div class="gemini-qa-input-container">
                <textarea class="gemini-qa-input" id="gemini-qa-input" placeholder="Video hakkında bir soru sorun..." rows="1"></textarea>
                <button class="gemini-qa-send-btn" id="gemini-qa-send-btn" title="Soruyu Gönder">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(sidebarPanel);

      // Event listeners for sidebar elements
      document.getElementById('gemini-close-btn').addEventListener('click', hideSidebar);
      
      const langSelect = document.getElementById('gemini-lang-select');
      langSelect.addEventListener('change', (e) => {
        currentLanguage = e.target.value;
        updateQaInputPlaceholder();
        // Trigger a regeneration in the new language
        const videoId = extractVideoId(lastClickedVideoUrl || window.location.href);
        if (videoId) {
          performSummarization(videoId, lastClickedVideoUrl || window.location.href);
        }
      });

      document.getElementById('gemini-copy-btn').addEventListener('click', handleCopyText);
      document.getElementById('gemini-regen-btn').addEventListener('click', () => {
        const videoId = extractVideoId(lastClickedVideoUrl || window.location.href);
        if (videoId) {
          performSummarization(videoId, lastClickedVideoUrl || window.location.href);
        }
      });

      // Q&A listeners
      const qaInput = document.getElementById('gemini-qa-input');
      const qaSendBtn = document.getElementById('gemini-qa-send-btn');
      
      if (qaInput && qaSendBtn) {
        qaSendBtn.addEventListener('click', handleSendQuestion);
        qaInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendQuestion();
          }
        });
        
        // Auto-expanding textarea height based on content
        qaInput.addEventListener('input', () => {
          qaInput.style.height = 'auto';
          qaInput.style.height = Math.min(qaInput.scrollHeight, 70) + 'px';
        });
      }
    }

    // Sync selected language with UI
    document.getElementById('gemini-lang-select').value = currentLanguage;
    updateQaInputPlaceholder();

    // Show with animation
    sidebarPanel.classList.add('visible');
  }

  function hideSidebar() {
    if (sidebarPanel) {
      sidebarPanel.classList.remove('visible');
    }
  }

  // Core Orchestration Flow: Fetches transcript and triggers background AI summary
  async function performSummarization(videoId, videoUrl) {
    resetSidebarUI();

    try {
      updateProgressStep('step-info', 'loading');
      
      // Step 1: Fetch YouTube video HTML to parse initial player response
      const videoHtml = await fetchVideoHtml(videoId);
      const playerResponse = extractPlayerResponse(videoHtml);
      
      if (!playerResponse) {
        throw new Error('Could not parse YouTube video metadata. YouTube might have updated its page layout.');
      }

      // Update Video Title & Channel
      const title = playerResponse.videoDetails?.title || 'Unknown Video';
      const channel = playerResponse.videoDetails?.author || 'Unknown Channel';
      const description = playerResponse.videoDetails?.shortDescription || '';
      
      document.getElementById('gemini-video-title').textContent = title;
      document.getElementById('gemini-video-channel').textContent = channel;
      
      updateProgressStep('step-info', 'done');
      updateProgressStep('step-transcript', 'loading');

      // Step 2: Try to retrieve transcript track list
      const captionTracks = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      let transcriptText = '';
      let isFallback = false;

      if (captionTracks && captionTracks.length > 0) {
        const primaryTrack = captionTracks[0];
        
        // Build the caption URL: replace or append fmt=json3 safely to bypass duplicate params
        let captionUrl = primaryTrack.baseUrl;
        if (captionUrl.includes('fmt=')) {
          captionUrl = captionUrl.replace(/fmt=[^&]*/, 'fmt=json3');
        } else {
          captionUrl += '&fmt=json3';
        }
        
        console.log('[Gemini Summarizer] Fetching captions from:', captionUrl);
        const captionResponse = await fetch(captionUrl);
        if (!captionResponse.ok) {
          throw new Error('Failed to retrieve caption tracks from YouTube server.');
        }
        
        const captionText = await captionResponse.text();
        transcriptText = parseCaptionData(captionText);
      } else {
        // Fallback: No transcripts available
        isFallback = true;
        console.log('No captions found, falling back to metadata summarization...');
      }

      updateProgressStep('step-transcript', 'done');
      updateProgressStep('step-ai', 'loading');

      // Populate active video context for Q&A thread
      activeVideoContext = {
        title: title,
        description: description,
        channel: channel,
        transcript: transcriptText || `(Transcript unavailable. Fallback to video metadata description: Channel: ${channel}, Title: ${title}, Description: ${description})`,
        isFallback: isFallback
      };
      activeChatHistory = []; // Reset Q&A thread history for the new video

      // Step 3: Send message to background service-worker to summarize via Gemini API
      chrome.runtime.sendMessage({
        type: 'SUMMARIZE_VIDEO',
        transcript: transcriptText,
        title: title,
        description: description,
        channel: channel,
        language: currentLanguage,
        isFallback: isFallback
      }, (response) => {
        if (chrome.runtime.lastError) {
          showError(`Extension communication error: ${chrome.runtime.lastError.message}`);
          return;
        }

        if (response && response.success) {
          updateProgressStep('step-ai', 'done');
          displaySummary(response.summary);
        } else {
          const errorMsg = response?.error || 'UNKNOWN_ERROR';
          if (errorMsg === 'NO_API_KEY') {
            showError('Gemini API Key is missing. Please click the extension icon in the toolbar and configure your API key first!');
          } else {
            showError(`Gemini Generation Error: ${errorMsg}`);
          }
        }
      });

    } catch (err) {
      showError(err.message || 'An unexpected error occurred while fetching video details.');
    }
  }

  // Fetch the YouTube page content
  async function fetchVideoHtml(videoId) {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    if (!response.ok) {
      throw new Error(`Failed to load video page. Status: ${response.status}`);
    }
    return await response.text();
  }

  // Extract the ytInitialPlayerResponse JSON object using a robust, brace-counting parser
  function extractPlayerResponse(html) {
    const patterns = [
      'ytInitialPlayerResponse = ',
      'var ytInitialPlayerResponse = ',
      'window["ytInitialPlayerResponse"] = '
    ];
    
    let startIndex = -1;
    let patternLength = 0;
    
    for (const pattern of patterns) {
      startIndex = html.indexOf(pattern);
      if (startIndex !== -1) {
        patternLength = pattern.length;
        break;
      }
    }
    
    if (startIndex === -1) {
      console.warn('[Gemini Summarizer] Could not find starting player response pattern in HTML.');
      return null;
    }
    
    // Find the opening brace '{'
    const jsonStart = html.indexOf('{', startIndex + patternLength - 5);
    if (jsonStart === -1) return null;
    
    // Parse using a deterministic brace-counting state machine (ignores semicolons inside string blocks)
    let braceCount = 0;
    let inString = false;
    let escape = false;
    
    for (let i = jsonStart; i < html.length; i++) {
      const char = html[i];
      
      if (inString) {
        if (escape) {
          escape = false;
        } else if (char === '\\') {
          escape = true;
        } else if (char === '"') {
          inString = false;
        }
      } else {
        if (char === '"') {
          inString = true;
        } else if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            const jsonStr = html.substring(jsonStart, i + 1);
            try {
              return JSON.parse(jsonStr);
            } catch (e) {
              console.error('[Gemini Summarizer] Failed to parse brace-counted JSON block:', e);
              return null;
            }
          }
        }
      }
    }
    return null;
  }

  // Merge the JSON caption tracks segment details into clean prose with timing clues
  function mergeTranscriptSegments(data) {
    if (!data.events) return '';
    
    let segments = [];
    data.events.forEach((event) => {
      if (!event.segs) return;
      
      const segmentText = event.segs.map(seg => seg.utf8).join('').trim();
      if (!segmentText) return;

      // Extract approximate timestamp in seconds
      const tSecs = Math.floor((event.tStartMs || 0) / 1000);
      const minutes = Math.floor(tSecs / 60);
      const seconds = String(tSecs % 60).padStart(2, '0');
      const timeTag = `[${minutes}:${seconds}]`;

      // Group into sentences/time-anchors
      segments.push(`${timeTag} ${segmentText}`);
    });

    return segments.join(' ');
  }

  // Parse captions from text, supporting both JSON (json3) and XML (timed text) formats
  function parseCaptionData(text) {
    const trimmed = text.trim();
    console.log('[Gemini Summarizer] Caption raw text preview:', trimmed.substring(0, 100));
    
    // 1. If it looks like JSON
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const data = JSON.parse(trimmed);
        return mergeTranscriptSegments(data);
      } catch (e) {
        console.warn('[Gemini Summarizer] Failed to parse caption JSON, attempting XML extraction:', e);
      }
    }
    
    // 2. If it looks like XML or fallback (Timed Text)
    // Format: <text start="12.3" dur="4.5">Caption text</text>
    const regex = /<text start="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
    let segments = [];
    let match;
    
    while ((match = regex.exec(trimmed)) !== null) {
      const tStartSec = parseFloat(match[1]);
      const rawText = match[2];
      
      // Decode standard XML HTML entities (&amp;, &quot;, &#39;, etc.)
      const decodedText = decodeXmlEntities(rawText);
      
      const minutes = Math.floor(tStartSec / 60);
      const seconds = String(Math.floor(tStartSec % 60)).padStart(2, '0');
      const timeTag = `[${minutes}:${seconds}]`;
      
      segments.push(`${timeTag} ${decodedText}`);
    }
    
    if (segments.length > 0) {
      console.log('[Gemini Summarizer] Successfully parsed XML caption track.');
      return segments.join(' ');
    }
    
    // Fallback: Just return plain text stripped of HTML tags if nothing else matches
    console.warn('[Gemini Summarizer] Could not parse as standard JSON or XML, returning fallback stripped text.');
    return trimmed.replace(/<[^>]*>/g, ' ');
  }

  // Decodes common HTML XML entities
  function decodeXmlEntities(str) {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");
  }

  // Markdown-to-HTML formatter (highly efficient, lightweight parser for standard tags)
  function renderMarkdown(mdText) {
    let html = mdText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Parse main headers: ### Header
    html = html.replace(/^### (.*?)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^# (.*?)$/gm, '<h2>$1</h2>');

    // Parse Bold: **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Parse bullet items: - item or * item
    // Group adjacent list items into single UL tags
    const lines = html.split('\n');
    let inList = false;
    let newLines = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const itemText = line.substring(2);
        if (!inList) {
          newLines.push('<ul>');
          inList = true;
        }
        newLines.push(`<li>${itemText}</li>`);
      } else {
        if (inList) {
          newLines.push('</ul>');
          inList = false;
        }
        
        if (line) {
          // If it is a header, don't wrap in paragraph
          if (line.startsWith('<h') || line.startsWith('</u')) {
            newLines.push(line);
          } else {
            newLines.push(`<p>${line}</p>`);
          }
        }
      }
    }
    
    if (inList) {
      newLines.push('</ul>');
    }

    return newLines.join('\n');
  }

  // Display the completed summary
  function displaySummary(mdText) {
    document.getElementById('gemini-status-area').classList.add('hidden');
    
    const summaryBox = document.getElementById('gemini-summary-box');
    const summaryContent = document.getElementById('gemini-summary-content');
    const actionsArea = document.getElementById('gemini-actions');
    
    summaryContent.innerHTML = renderMarkdown(mdText);
    
    summaryBox.classList.remove('hidden');
    actionsArea.classList.remove('hidden');
  }

  // Handle errors in execution
  function showError(message) {
    document.getElementById('gemini-status-area').classList.add('hidden');
    
    const summaryBox = document.getElementById('gemini-summary-box');
    const summaryContent = document.getElementById('gemini-summary-content');
    const actionsArea = document.getElementById('gemini-actions');
    
    summaryContent.innerHTML = `
      <div class="gemini-error-card">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p>${message}</p>
      </div>
    `;
    
    summaryBox.classList.remove('hidden');
    actionsArea.classList.remove('hidden'); // Leave retry and options active
  }

  // Reset UI components to fresh loading state
  function resetSidebarUI() {
    activeVideoContext = null;
    activeChatHistory = [];

    document.getElementById('gemini-status-area').classList.remove('hidden');
    document.getElementById('gemini-summary-box').classList.add('hidden');
    document.getElementById('gemini-actions').classList.add('hidden');
    document.getElementById('gemini-summary-content').innerHTML = '';
    
    // Clear Q&A thread list
    const qaThread = document.getElementById('gemini-qa-thread');
    if (qaThread) qaThread.innerHTML = '';
    
    const qaInput = document.getElementById('gemini-qa-input');
    if (qaInput) {
      qaInput.value = '';
      qaInput.style.height = '20px';
      qaInput.disabled = false;
      updateQaInputPlaceholder();
    }
    
    const qaSendBtn = document.getElementById('gemini-qa-send-btn');
    if (qaSendBtn) qaSendBtn.disabled = false;

    // Reset video info labels
    document.getElementById('gemini-video-title').textContent = 'Loading video details...';
    document.getElementById('gemini-video-channel').textContent = '';

    // Reset steps states
    resetProgressStep('step-info');
    resetProgressStep('step-transcript');
    resetProgressStep('step-ai');
  }

  // Controls UI active indicators for each step
  function updateProgressStep(stepId, state) {
    const el = document.getElementById(stepId);
    if (!el) return;

    el.className = 'status-step'; // Clear states
    if (state === 'loading') {
      el.classList.add('active');
    } else if (state === 'done') {
      el.classList.add('completed');
    }
  }

  function resetProgressStep(stepId) {
    const el = document.getElementById(stepId);
    if (!el) return;
    el.className = 'status-step';
    if (stepId === 'step-info') {
      el.classList.add('active');
    }
  }

  // Copies the raw summary text to clipboard
  async function handleCopyText() {
    const contentArea = document.getElementById('gemini-summary-content');
    // Extract plain text content
    const text = contentArea.innerText;
    
    try {
      await navigator.clipboard.writeText(text);
      
      const copyBtn = document.getElementById('gemini-copy-btn');
      const originalHtml = copyBtn.innerHTML;
      
      // Show success indicator checkmark
      copyBtn.innerHTML = `
        <svg class="icon-svg success" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Copied!
      `;
      copyBtn.classList.add('success');

      setTimeout(() => {
        copyBtn.innerHTML = originalHtml;
        copyBtn.classList.remove('success');
      }, 2000);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  }

  // Handle Q&A send action
  async function handleSendQuestion() {
    const qaInput = document.getElementById('gemini-qa-input');
    const qaSendBtn = document.getElementById('gemini-qa-send-btn');
    const qaThread = document.getElementById('gemini-qa-thread');
    const summaryBox = document.getElementById('gemini-summary-box');
    
    if (!qaInput || !qaSendBtn || !qaThread) return;
    
    const question = qaInput.value.trim();
    if (!question) return;
    
    // Disable inputs
    qaInput.disabled = true;
    qaSendBtn.disabled = true;
    
    // Append user question
    const turnDiv = document.createElement('div');
    turnDiv.className = 'qa-turn';
    
    const questionBubble = document.createElement('div');
    questionBubble.className = 'qa-question-bubble';
    questionBubble.innerHTML = `
      <div class="qa-bubble-header">
        <span class="qa-badge user">Soru</span>
      </div>
      <div class="qa-bubble-body">${escapeHtml(question)}</div>
    `;
    turnDiv.appendChild(questionBubble);
    qaThread.appendChild(turnDiv);
    
    // Clear input and reset height
    qaInput.value = '';
    qaInput.style.height = '20px';
    
    // Add loading bubble inside the turn
    const loadingBubble = document.createElement('div');
    loadingBubble.className = 'qa-loading-bubble';
    loadingBubble.innerHTML = `
      <div class="qa-loading-dot"></div>
      <div class="qa-loading-dot"></div>
      <div class="qa-loading-dot"></div>
    `;
    turnDiv.appendChild(loadingBubble);
    
    // Scroll to bottom
    summaryBox.scrollTop = summaryBox.scrollHeight;
    
    // Send to background
    chrome.runtime.sendMessage({
      type: 'ASK_QUESTION',
      videoContext: activeVideoContext,
      chatHistory: activeChatHistory,
      newQuestion: question,
      languageCode: currentLanguage
    }, (response) => {
      // Re-enable inputs
      qaInput.disabled = false;
      qaSendBtn.disabled = false;
      qaInput.focus();
      
      // Remove loading bubble
      loadingBubble.remove();
      
      if (chrome.runtime.lastError) {
        appendAnswerError(turnDiv, `Hata: ${chrome.runtime.lastError.message}`);
        return;
      }
      
      if (response && response.success) {
        const answerBubble = document.createElement('div');
        answerBubble.className = 'qa-answer-bubble';
        answerBubble.innerHTML = `
          <div class="qa-bubble-header">
            <span class="qa-badge model">Gemini</span>
          </div>
          <div class="qa-bubble-body">${renderMarkdown(response.answer)}</div>
        `;
        turnDiv.appendChild(answerBubble);
        
        // Save to state history
        activeChatHistory.push({ role: 'user', text: question });
        activeChatHistory.push({ role: 'model', text: response.answer });
      } else {
        const errorMsg = response?.error || 'UNKNOWN_ERROR';
        appendAnswerError(turnDiv, `Hata: ${errorMsg}`);
      }
      
      // Scroll to bottom after answer renders
      setTimeout(() => {
        summaryBox.scrollTop = summaryBox.scrollHeight;
      }, 50);
    });
  }

  function appendAnswerError(parentDiv, errorText) {
    const errorBubble = document.createElement('div');
    errorBubble.className = 'qa-answer-bubble';
    errorBubble.innerHTML = `
      <div class="qa-bubble-header">
        <span class="qa-badge model" style="color: var(--gemini-error);">Hata</span>
      </div>
      <div class="qa-bubble-body" style="color: var(--gemini-error);">${escapeHtml(errorText)}</div>
    `;
    parentDiv.appendChild(errorBubble);
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Updates the placeholder text of the Q&A input box based on selected language
  function updateQaInputPlaceholder() {
    const qaInput = document.getElementById('gemini-qa-input');
    if (!qaInput) return;
    
    const placeholders = {
      en: "Ask a question about this video...",
      tr: "Bu video hakkında bir soru sorun...",
      es: "Haz una pregunta sobre este video...",
      de: "Stellen Sie eine Frage zu diesem Video...",
      fr: "Posez une question sur cette vidéo...",
      ru: "Задайте вопрос об этом видео...",
      pt: "Faça uma pergunta sobre este vídeo..."
    };
    
    qaInput.placeholder = placeholders[currentLanguage] || placeholders.en;
  }
})();
