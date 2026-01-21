import { ExtensionMessage, RecordingState } from '../types';
import { eventRecorder } from './event-recorder';
import { pageAnalyzer } from './page-analyzer';
import { highlighter } from './highlighter';
import './content.css';

console.log('[Cypress Recorder] Content script loaded');

// Initialize: check if we should be recording
chrome.runtime.sendMessage({ type: 'GET_RECORDING_STATE' })
  .then((state: RecordingState) => {
    if (state.isRecording) {
      eventRecorder.start();
      if (state.isPaused) {
        eventRecorder.pause();
      }
      analyzePageAndNotify();
    }
  })
  .catch(error => {
    console.log('[Cypress Recorder] Could not get initial state:', error);
  });

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch(error => {
      console.error('[Cypress Recorder] Error handling message:', error);
      sendResponse({ error: error.message });
    });

  return true; // Keep message channel open for async response
});

async function handleMessage(message: ExtensionMessage): Promise<unknown> {
  switch (message.type) {
    case 'START_RECORDING':
      eventRecorder.start();
      analyzePageAndNotify();
      return { success: true };

    case 'STOP_RECORDING':
      eventRecorder.stop();
      return { success: true };

    case 'PAUSE_RECORDING':
      eventRecorder.pause();
      return { success: true };

    case 'RESUME_RECORDING':
      eventRecorder.resume();
      return { success: true };

    case 'GET_RECORDING_STATE':
      return eventRecorder.getState();

    case 'HIGHLIGHT_ELEMENT':
      const selector = message.payload as string;
      try {
        const element = document.querySelector(selector);
        if (element) {
          highlighter.highlight(element, selector);
          // Auto-hide after 2 seconds
          setTimeout(() => highlighter.hide(), 2000);
        }
      } catch (e) {
        console.error('[Cypress Recorder] Invalid selector:', selector);
      }
      return { success: true };

    default:
      console.warn('[Cypress Recorder] Unknown message type:', message.type);
      return null;
  }
}

function analyzePageAndNotify(): void {
  // Small delay to ensure page is fully loaded
  setTimeout(() => {
    const analysis = pageAnalyzer.analyze();
    chrome.runtime.sendMessage({
      type: 'PAGE_ANALYZED',
      payload: analysis
    }).catch(error => {
      console.error('[Cypress Recorder] Failed to send page analysis:', error);
    });

    console.log('[Cypress Recorder] Page analyzed:', analysis.pageType,
                `(${analysis.confidence}% confidence)`);
  }, 500);
}

// Re-analyze page when DOM changes significantly
let analysisDebounce: number | null = null;
const observer = new MutationObserver((mutations) => {
  // Only analyze if we're recording and there are significant changes
  const state = eventRecorder.getState();
  if (!state.isRecording || state.isPaused) return;

  const significantChange = mutations.some(mutation => {
    // Check for added/removed nodes that could indicate page type change
    if (mutation.addedNodes.length > 5 || mutation.removedNodes.length > 5) {
      return true;
    }
    return false;
  });

  if (significantChange) {
    if (analysisDebounce) {
      clearTimeout(analysisDebounce);
    }
    analysisDebounce = window.setTimeout(() => {
      analyzePageAndNotify();
    }, 1000);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Cleanup on unload
window.addEventListener('unload', () => {
  observer.disconnect();
  eventRecorder.stop();
  highlighter.destroy();
});
