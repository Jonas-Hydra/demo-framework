import {
  RecordingSession,
  RecordingState,
  ExtensionSettings,
  STORAGE_KEYS,
  DEFAULT_SETTINGS
} from '../types';

export class StorageManager {
  // Session management
  async saveSession(session: RecordingSession): Promise<void> {
    const sessions = await this.getAllSessions();
    const existingIndex = sessions.findIndex(s => s.id === session.id);

    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }

    await chrome.storage.local.set({
      [STORAGE_KEYS.SESSIONS]: sessions
    });
  }

  async getAllSessions(): Promise<RecordingSession[]> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SESSIONS);
    return result[STORAGE_KEYS.SESSIONS] || [];
  }

  async getSession(sessionId: string): Promise<RecordingSession | null> {
    const sessions = await this.getAllSessions();
    return sessions.find(s => s.id === sessionId) || null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    const sessions = await this.getAllSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);
    await chrome.storage.local.set({
      [STORAGE_KEYS.SESSIONS]: filtered
    });
  }

  async clearAllSessions(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEYS.SESSIONS);
  }

  // Current session management
  async setCurrentSession(session: RecordingSession | null): Promise<void> {
    if (session) {
      await chrome.storage.local.set({
        [STORAGE_KEYS.CURRENT_SESSION]: session
      });
    } else {
      await chrome.storage.local.remove(STORAGE_KEYS.CURRENT_SESSION);
    }
  }

  async getCurrentSession(): Promise<RecordingSession | null> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.CURRENT_SESSION);
    return result[STORAGE_KEYS.CURRENT_SESSION] || null;
  }

  // Recording state management
  async setRecordingState(state: RecordingState): Promise<void> {
    await chrome.storage.local.set({
      [STORAGE_KEYS.RECORDING_STATE]: state
    });
  }

  async getRecordingState(): Promise<RecordingState> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.RECORDING_STATE);
    return result[STORAGE_KEYS.RECORDING_STATE] || {
      isRecording: false,
      isPaused: false,
      currentSession: null
    };
  }

  // Settings management
  async getSettings(): Promise<ExtensionSettings> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.SETTINGS] };
  }

  async saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
    const current = await this.getSettings();
    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: { ...current, ...settings }
    });
  }

  // Utility methods
  async exportData(): Promise<{
    sessions: RecordingSession[];
    settings: ExtensionSettings;
  }> {
    const sessions = await this.getAllSessions();
    const settings = await this.getSettings();
    return { sessions, settings };
  }

  async importData(data: {
    sessions?: RecordingSession[];
    settings?: Partial<ExtensionSettings>;
  }): Promise<void> {
    if (data.sessions) {
      await chrome.storage.local.set({
        [STORAGE_KEYS.SESSIONS]: data.sessions
      });
    }
    if (data.settings) {
      await this.saveSettings(data.settings);
    }
  }
}

export const storageManager = new StorageManager();
