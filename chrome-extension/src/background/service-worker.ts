import {
  ExtensionMessage,
  RecordingSession,
  RecordingState,
  RecordedAction
} from '../types';
import { storageManager } from './storage-manager';

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Current recording state per tab
const tabRecordingState: Map<number, RecordingState> = new Map();

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Cypress Test Recorder installed');

  // Initialize default state
  await storageManager.setRecordingState({
    isRecording: false,
    isPaused: false,
    currentSession: null
  });
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  const tabId = sender.tab?.id || message.tabId;

  handleMessage(message, tabId)
    .then(sendResponse)
    .catch(error => {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    });

  return true; // Keep message channel open for async response
});

async function handleMessage(message: ExtensionMessage, tabId?: number): Promise<unknown> {
  switch (message.type) {
    case 'START_RECORDING':
      return startRecording(tabId, message.payload as { name?: string; url: string });

    case 'STOP_RECORDING':
      return stopRecording(tabId);

    case 'PAUSE_RECORDING':
      return pauseRecording(tabId);

    case 'RESUME_RECORDING':
      return resumeRecording(tabId);

    case 'ACTION_RECORDED':
      return recordAction(tabId, message.payload as RecordedAction);

    case 'PAGE_ANALYZED':
      return handlePageAnalyzed(tabId, message.payload);

    case 'GET_RECORDING_STATE':
      return getRecordingState(tabId);

    case 'GET_SESSION':
      return storageManager.getSession(message.payload as string);

    case 'GET_ALL_SESSIONS':
      return storageManager.getAllSessions();

    case 'DELETE_SESSION':
      return storageManager.deleteSession(message.payload as string);

    default:
      console.warn('Unknown message type:', message.type);
      return null;
  }
}

async function startRecording(
  tabId: number | undefined,
  payload: { name?: string; url: string }
): Promise<RecordingState> {
  if (!tabId) {
    throw new Error('No tab ID provided');
  }

  const session: RecordingSession = {
    id: generateId(),
    name: payload.name || `Recording ${new Date().toLocaleString()}`,
    url: payload.url,
    startTime: Date.now(),
    actions: []
  };

  const state: RecordingState = {
    isRecording: true,
    isPaused: false,
    currentSession: session
  };

  tabRecordingState.set(tabId, state);
  await storageManager.setCurrentSession(session);
  await storageManager.setRecordingState(state);

  // Notify content script to start recording
  await chrome.tabs.sendMessage(tabId, {
    type: 'START_RECORDING',
    payload: state
  });

  // Update badge
  await updateBadge(tabId, 'REC');

  return state;
}

async function stopRecording(tabId: number | undefined): Promise<RecordingSession | null> {
  if (!tabId) {
    throw new Error('No tab ID provided');
  }

  const state = tabRecordingState.get(tabId);
  if (!state?.currentSession) {
    return null;
  }

  // Finalize session
  state.currentSession.endTime = Date.now();
  await storageManager.saveSession(state.currentSession);

  const completedSession = state.currentSession;

  // Reset state
  const newState: RecordingState = {
    isRecording: false,
    isPaused: false,
    currentSession: null
  };

  tabRecordingState.set(tabId, newState);
  await storageManager.setCurrentSession(null);
  await storageManager.setRecordingState(newState);

  // Notify content script to stop recording
  await chrome.tabs.sendMessage(tabId, {
    type: 'STOP_RECORDING'
  });

  // Clear badge
  await updateBadge(tabId, '');

  return completedSession;
}

async function pauseRecording(tabId: number | undefined): Promise<RecordingState | null> {
  if (!tabId) {
    throw new Error('No tab ID provided');
  }

  const state = tabRecordingState.get(tabId);
  if (!state?.isRecording) {
    return null;
  }

  state.isPaused = true;
  tabRecordingState.set(tabId, state);
  await storageManager.setRecordingState(state);

  // Notify content script
  await chrome.tabs.sendMessage(tabId, {
    type: 'PAUSE_RECORDING'
  });

  await updateBadge(tabId, '||');

  return state;
}

async function resumeRecording(tabId: number | undefined): Promise<RecordingState | null> {
  if (!tabId) {
    throw new Error('No tab ID provided');
  }

  const state = tabRecordingState.get(tabId);
  if (!state?.isRecording) {
    return null;
  }

  state.isPaused = false;
  tabRecordingState.set(tabId, state);
  await storageManager.setRecordingState(state);

  // Notify content script
  await chrome.tabs.sendMessage(tabId, {
    type: 'RESUME_RECORDING'
  });

  await updateBadge(tabId, 'REC');

  return state;
}

async function recordAction(
  tabId: number | undefined,
  action: RecordedAction
): Promise<boolean> {
  if (!tabId) {
    return false;
  }

  const state = tabRecordingState.get(tabId);
  if (!state?.isRecording || state.isPaused || !state.currentSession) {
    return false;
  }

  state.currentSession.actions.push(action);
  await storageManager.setCurrentSession(state.currentSession);

  return true;
}

async function handlePageAnalyzed(
  tabId: number | undefined,
  payload: unknown
): Promise<void> {
  if (!tabId) return;

  const state = tabRecordingState.get(tabId);
  if (state?.currentSession && payload) {
    const analysis = payload as { pageType: string };
    state.currentSession.pageType = analysis.pageType as RecordingSession['pageType'];
    await storageManager.setCurrentSession(state.currentSession);
  }
}

async function getRecordingState(tabId: number | undefined): Promise<RecordingState> {
  if (tabId && tabRecordingState.has(tabId)) {
    return tabRecordingState.get(tabId)!;
  }
  return storageManager.getRecordingState();
}

async function updateBadge(tabId: number, text: string): Promise<void> {
  try {
    await chrome.action.setBadgeText({ text, tabId });
    await chrome.action.setBadgeBackgroundColor({
      color: text === 'REC' ? '#e53935' : text === '||' ? '#ff9800' : '#4caf50',
      tabId
    });
  } catch (error) {
    console.error('Error updating badge:', error);
  }
}

// Handle tab updates (e.g., navigation)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    const state = tabRecordingState.get(tabId);
    if (state?.isRecording && !state.isPaused) {
      // Re-inject content script state after navigation
      try {
        await chrome.tabs.sendMessage(tabId, {
          type: 'START_RECORDING',
          payload: state
        });

        // Record navigation action
        if (tab.url && state.currentSession) {
          const navigationAction: RecordedAction = {
            id: generateId(),
            type: 'navigate',
            timestamp: Date.now(),
            url: tab.url,
            selector: {
              selector: '',
              strategy: 'css-path',
              confidence: 100,
              isUnique: true,
              alternatives: []
            },
            element: {
              tagName: 'window',
              attributes: {},
              rect: null
            }
          };
          state.currentSession.actions.push(navigationAction);
          await storageManager.setCurrentSession(state.currentSession);
        }
      } catch (error) {
        console.log('Content script not ready yet');
      }
    }
  }
});

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const state = tabRecordingState.get(tabId);
  if (state?.currentSession) {
    // Save session before cleanup
    state.currentSession.endTime = Date.now();
    await storageManager.saveSession(state.currentSession);
  }
  tabRecordingState.delete(tabId);
});
