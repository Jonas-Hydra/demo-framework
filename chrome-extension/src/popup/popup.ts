import {
  RecordingState,
  RecordingSession,
  RecordedAction,
  CodeGenerationOptions,
  ExtensionSettings,
  DEFAULT_SETTINGS,
  STORAGE_KEYS
} from '../types';
import { cypressGenerator } from '../generators/cypress-generator';

class PopupController {
  private currentSession: RecordingSession | null = null;
  private isRecording = false;
  private isPaused = false;
  private currentTabId: number | null = null;
  private settings: ExtensionSettings = { ...DEFAULT_SETTINGS };

  // DOM elements
  private startBtn!: HTMLButtonElement;
  private stopBtn!: HTMLButtonElement;
  private pauseBtn!: HTMLButtonElement;
  private statusEl!: HTMLElement;
  private statusText!: HTMLElement;
  private pageTypeEl!: HTMLElement;
  private pageTypeValue!: HTMLElement;
  private actionCountBadge!: HTMLElement;
  private actionsList!: HTMLElement;
  private codePreview!: HTMLElement;
  private sessionsList!: HTMLElement;
  private clearSessionsBtn!: HTMLButtonElement;
  private copyBtn!: HTMLButtonElement;
  private downloadBtn!: HTMLButtonElement;

  // Options
  private includeA11y!: HTMLInputElement;
  private includeScreenshots!: HTMLInputElement;
  private includeAssertions!: HTMLInputElement;

  // Settings panel elements
  private settingsBtn!: HTMLAnchorElement;
  private settingsPanel!: HTMLElement;
  private closeSettingsBtn!: HTMLButtonElement;
  private saveSettingsBtn!: HTMLButtonElement;
  private resetSettingsBtn!: HTMLButtonElement;

  // Settings inputs
  private settingBaseUrl!: HTMLInputElement;
  private settingDescribeName!: HTMLInputElement;
  private settingTestPrefix!: HTMLInputElement;
  private settingDefaultA11y!: HTMLInputElement;
  private settingDefaultScreenshots!: HTMLInputElement;
  private settingDefaultAssertions!: HTMLInputElement;
  private settingSelectorPriority!: HTMLSelectElement;
  private settingRecordHover!: HTMLInputElement;
  private settingRecordScroll!: HTMLInputElement;
  private settingHighlightElements!: HTMLInputElement;

  constructor() {
    this.initElements();
    this.attachEventListeners();
    this.loadSettings().then(() => {
      this.applySettingsToCheckboxes();
      this.getCurrentTab().then(() => {
        this.loadState();
        this.loadSessions();
      });
    });
  }

  private initElements(): void {
    this.startBtn = document.getElementById('startBtn') as HTMLButtonElement;
    this.stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
    this.pauseBtn = document.getElementById('pauseBtn') as HTMLButtonElement;
    this.statusEl = document.getElementById('status') as HTMLElement;
    this.statusText = this.statusEl.querySelector('.status-text') as HTMLElement;
    this.pageTypeEl = document.getElementById('pageType') as HTMLElement;
    this.pageTypeValue = this.pageTypeEl.querySelector('.value') as HTMLElement;
    this.actionCountBadge = document.getElementById('actionCount') as HTMLElement;
    this.actionsList = document.getElementById('actionsList') as HTMLElement;
    this.codePreview = document.getElementById('codePreview') as HTMLElement;
    this.sessionsList = document.getElementById('sessionsList') as HTMLElement;
    this.clearSessionsBtn = document.getElementById('clearSessionsBtn') as HTMLButtonElement;
    this.copyBtn = document.getElementById('copyBtn') as HTMLButtonElement;
    this.downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;

    this.includeA11y = document.getElementById('includeA11y') as HTMLInputElement;
    this.includeScreenshots = document.getElementById('includeScreenshots') as HTMLInputElement;
    this.includeAssertions = document.getElementById('includeAssertions') as HTMLInputElement;

    // Settings panel elements
    this.settingsBtn = document.getElementById('settingsBtn') as HTMLAnchorElement;
    this.settingsPanel = document.getElementById('settingsPanel') as HTMLElement;
    this.closeSettingsBtn = document.getElementById('closeSettingsBtn') as HTMLButtonElement;
    this.saveSettingsBtn = document.getElementById('saveSettingsBtn') as HTMLButtonElement;
    this.resetSettingsBtn = document.getElementById('resetSettingsBtn') as HTMLButtonElement;

    // Settings inputs
    this.settingBaseUrl = document.getElementById('settingBaseUrl') as HTMLInputElement;
    this.settingDescribeName = document.getElementById('settingDescribeName') as HTMLInputElement;
    this.settingTestPrefix = document.getElementById('settingTestPrefix') as HTMLInputElement;
    this.settingDefaultA11y = document.getElementById('settingDefaultA11y') as HTMLInputElement;
    this.settingDefaultScreenshots = document.getElementById('settingDefaultScreenshots') as HTMLInputElement;
    this.settingDefaultAssertions = document.getElementById('settingDefaultAssertions') as HTMLInputElement;
    this.settingSelectorPriority = document.getElementById('settingSelectorPriority') as HTMLSelectElement;
    this.settingRecordHover = document.getElementById('settingRecordHover') as HTMLInputElement;
    this.settingRecordScroll = document.getElementById('settingRecordScroll') as HTMLInputElement;
    this.settingHighlightElements = document.getElementById('settingHighlightElements') as HTMLInputElement;
  }

  private attachEventListeners(): void {
    // Control buttons
    this.startBtn.addEventListener('click', () => this.startRecording());
    this.stopBtn.addEventListener('click', () => this.stopRecording());
    this.pauseBtn.addEventListener('click', () => this.togglePause());

    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => this.switchTab(e));
    });

    // Code options
    this.includeA11y.addEventListener('change', () => this.updateCodePreview());
    this.includeScreenshots.addEventListener('change', () => this.updateCodePreview());
    this.includeAssertions.addEventListener('change', () => this.updateCodePreview());

    // Code actions
    this.copyBtn.addEventListener('click', () => this.copyCode());
    this.downloadBtn.addEventListener('click', () => this.downloadCode());

    // Clear sessions
    this.clearSessionsBtn.addEventListener('click', () => this.clearSessions());

    // Settings
    this.settingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.openSettings();
    });
    this.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
    this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
    this.resetSettingsBtn.addEventListener('click', () => this.resetSettings());

    // Close settings on overlay click
    this.settingsPanel.addEventListener('click', (e) => {
      if (e.target === this.settingsPanel) {
        this.closeSettings();
      }
    });

    // Listen for updates from background
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'ACTION_RECORDED') {
        this.handleActionRecorded(message.payload);
      } else if (message.type === 'PAGE_ANALYZED') {
        this.handlePageAnalyzed(message.payload);
      }
    });
  }

  private async getCurrentTab(): Promise<void> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTabId = tab?.id || null;
  }

  private async loadState(): Promise<void> {
    if (!this.currentTabId) return;

    try {
      const state = await chrome.runtime.sendMessage({
        type: 'GET_RECORDING_STATE',
        tabId: this.currentTabId
      }) as RecordingState;

      this.isRecording = state.isRecording;
      this.isPaused = state.isPaused;
      this.currentSession = state.currentSession;

      this.updateUI();

      if (this.currentSession) {
        this.updateActionsList();
        this.updateCodePreview();
      }
    } catch (error) {
      console.error('Failed to load state:', error);
    }
  }

  private async loadSessions(): Promise<void> {
    try {
      const sessions = await chrome.runtime.sendMessage({
        type: 'GET_ALL_SESSIONS'
      }) as RecordingSession[];

      this.renderSessions(sessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }

  private async startRecording(): Promise<void> {
    if (!this.currentTabId) return;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return;

    try {
      const prefix = this.settings.testNamePrefix || 'Recording';
      const state = await chrome.runtime.sendMessage({
        type: 'START_RECORDING',
        tabId: this.currentTabId,
        payload: {
          url: tab.url,
          name: `${prefix} ${new Date().toLocaleTimeString()}`
        }
      }) as RecordingState;

      this.isRecording = true;
      this.isPaused = false;
      this.currentSession = state.currentSession;
      this.updateUI();
      this.updateActionsList();
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }

  private async stopRecording(): Promise<void> {
    if (!this.currentTabId) return;

    try {
      const session = await chrome.runtime.sendMessage({
        type: 'STOP_RECORDING',
        tabId: this.currentTabId
      }) as RecordingSession;

      this.isRecording = false;
      this.isPaused = false;

      if (session) {
        this.currentSession = session;
        this.updateCodePreview();
        this.loadSessions();
        this.showToast('Recording saved!');
      }

      this.updateUI();
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  }

  private async togglePause(): Promise<void> {
    if (!this.currentTabId) return;

    const messageType = this.isPaused ? 'RESUME_RECORDING' : 'PAUSE_RECORDING';

    try {
      await chrome.runtime.sendMessage({
        type: messageType,
        tabId: this.currentTabId
      });

      this.isPaused = !this.isPaused;
      this.updateUI();
    } catch (error) {
      console.error('Failed to toggle pause:', error);
    }
  }

  private updateUI(): void {
    // Update buttons
    this.startBtn.disabled = this.isRecording;
    this.stopBtn.disabled = !this.isRecording;
    this.pauseBtn.disabled = !this.isRecording;

    // Update pause button text
    this.pauseBtn.innerHTML = this.isPaused
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
           <polygon points="5 3 19 12 5 21 5 3"/>
         </svg>Resume`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
           <rect x="6" y="4" width="4" height="16"/>
           <rect x="14" y="4" width="4" height="16"/>
         </svg>Pause`;

    // Update status
    this.statusEl.classList.remove('recording', 'paused');
    if (this.isRecording) {
      if (this.isPaused) {
        this.statusEl.classList.add('paused');
        this.statusText.textContent = 'Paused';
      } else {
        this.statusEl.classList.add('recording');
        this.statusText.textContent = 'Recording...';
      }
    } else {
      this.statusText.textContent = 'Ready to record';
    }

    // Update page type
    if (this.currentSession?.pageType) {
      this.pageTypeEl.classList.remove('hidden');
      this.pageTypeValue.textContent = this.formatPageType(this.currentSession.pageType);
    } else {
      this.pageTypeEl.classList.add('hidden');
    }

    // Update action count
    const count = this.currentSession?.actions.length || 0;
    this.actionCountBadge.textContent = String(count);
  }

  private formatPageType(pageType: string): string {
    return pageType
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private handleActionRecorded(action: RecordedAction): void {
    if (this.currentSession) {
      this.currentSession.actions.push(action);
      this.updateActionsList();
      this.updateCodePreview();
      this.updateUI();
    }
  }

  private handlePageAnalyzed(analysis: { pageType: string }): void {
    if (this.currentSession) {
      this.currentSession.pageType = analysis.pageType as RecordingSession['pageType'];
      this.updateUI();
      this.updateCodePreview();
    }
  }

  private updateActionsList(): void {
    if (!this.currentSession || this.currentSession.actions.length === 0) {
      this.actionsList.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
          <p>Interact with the page to record actions</p>
        </div>
      `;
      return;
    }

    const html = this.currentSession.actions.map((action, index) => `
      <div class="action-item">
        <div class="action-icon">
          ${this.getActionIcon(action.type)}
        </div>
        <div class="action-details">
          <div class="action-type">${action.type}</div>
          <div class="action-selector">${this.truncate(action.selector.selector, 40)}</div>
          ${action.value ? `<div class="action-value">"${this.truncate(action.value, 30)}"</div>` : ''}
        </div>
      </div>
    `).join('');

    this.actionsList.innerHTML = html;
    this.actionsList.scrollTop = this.actionsList.scrollHeight;
  }

  private getActionIcon(type: string): string {
    const icons: Record<string, string> = {
      click: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 12h12"/><path d="M12 6v12"/></svg>',
      type: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>',
      select: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>',
      check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
      submit: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
      navigate: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>'
    };
    return icons[type] || icons.click;
  }

  private updateCodePreview(): void {
    if (!this.currentSession || this.currentSession.actions.length === 0) {
      this.codePreview.innerHTML = '<code>// Record some actions to generate code</code>';
      return;
    }

    const options: CodeGenerationOptions = {
      includeAccessibilityChecks: this.includeA11y.checked,
      includeScreenshots: this.includeScreenshots.checked,
      includeAssertions: this.includeAssertions.checked,
      testName: this.currentSession.name,
      describeName: this.settings.describeName || 'Recorded Test',
      baseUrl: this.settings.baseUrl || undefined
    };

    const code = cypressGenerator.generate(this.currentSession, options);
    this.codePreview.innerHTML = `<code>${this.escapeHtml(code)}</code>`;
  }

  private switchTab(e: Event): void {
    const target = e.target as HTMLElement;
    const tabName = target.dataset.tab;
    if (!tabName) return;

    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });
    target.classList.add('active');

    // Update panels
    document.querySelectorAll('.panel').forEach(panel => {
      panel.classList.add('hidden');
    });
    document.getElementById(`${tabName}Panel`)?.classList.remove('hidden');

    // Refresh content based on tab
    if (tabName === 'code') {
      this.updateCodePreview();
    } else if (tabName === 'sessions') {
      this.loadSessions();
    }
  }

  private renderSessions(sessions: RecordingSession[]): void {
    if (sessions.length === 0) {
      this.sessionsList.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <p>No saved sessions yet</p>
        </div>
      `;
      this.clearSessionsBtn.classList.add('hidden');
      return;
    }

    const html = sessions.map(session => `
      <div class="session-item" data-id="${session.id}">
        <div class="session-info">
          <div class="session-name">${this.escapeHtml(session.name)}</div>
          <div class="session-meta">
            <span>${session.actions.length} actions</span>
            <span>${this.formatDate(session.startTime)}</span>
          </div>
        </div>
        <div class="session-actions">
          <button class="btn btn-secondary btn-small load-session">Load</button>
          <button class="btn btn-danger btn-small delete-session">Delete</button>
        </div>
      </div>
    `).join('');

    this.sessionsList.innerHTML = html;
    this.clearSessionsBtn.classList.remove('hidden');

    // Attach event listeners
    this.sessionsList.querySelectorAll('.load-session').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = (e.target as HTMLElement).closest('.session-item');
        const id = item?.getAttribute('data-id');
        if (id) this.loadSession(id);
      });
    });

    this.sessionsList.querySelectorAll('.delete-session').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = (e.target as HTMLElement).closest('.session-item');
        const id = item?.getAttribute('data-id');
        if (id) this.deleteSession(id);
      });
    });
  }

  private async loadSession(sessionId: string): Promise<void> {
    try {
      const session = await chrome.runtime.sendMessage({
        type: 'GET_SESSION',
        payload: sessionId
      }) as RecordingSession;

      if (session) {
        this.currentSession = session;
        this.updateActionsList();
        this.updateCodePreview();

        // Switch to code tab
        document.querySelector('[data-tab="code"]')?.dispatchEvent(new Event('click'));
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  }

  private async deleteSession(sessionId: string): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: 'DELETE_SESSION',
        payload: sessionId
      });

      this.loadSessions();
      this.showToast('Session deleted');
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  }

  private async clearSessions(): Promise<void> {
    if (!confirm('Delete all saved sessions?')) return;

    const sessions = await chrome.runtime.sendMessage({
      type: 'GET_ALL_SESSIONS'
    }) as RecordingSession[];

    for (const session of sessions) {
      await chrome.runtime.sendMessage({
        type: 'DELETE_SESSION',
        payload: session.id
      });
    }

    this.loadSessions();
    this.showToast('All sessions cleared');
  }

  private async copyCode(): Promise<void> {
    const code = this.codePreview.textContent || '';
    await navigator.clipboard.writeText(code);
    this.showToast('Copied to clipboard!');
  }

  private downloadCode(): void {
    const code = this.codePreview.textContent || '';
    const filename = this.currentSession
      ? `${this.sanitizeFilename(this.currentSession.name)}.cy.js`
      : 'recorded-test.cy.js';

    const blob = new Blob([code], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
    this.showToast('File downloaded!');
  }

  private showToast(message: string): void {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 2000);
  }

  private truncate(str: string, length: number): string {
    return str.length > length ? str.substring(0, length - 3) + '...' : str;
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  private formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private sanitizeFilename(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  // Settings methods
  private async loadSettings(): Promise<void> {
    try {
      const result = await chrome.storage.sync.get(STORAGE_KEYS.SETTINGS);
      if (result[STORAGE_KEYS.SETTINGS]) {
        this.settings = { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.SETTINGS] };
      } else {
        this.settings = { ...DEFAULT_SETTINGS };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  private applySettingsToCheckboxes(): void {
    // Apply default settings to the code options checkboxes
    this.includeA11y.checked = this.settings.defaultIncludeA11y;
    this.includeScreenshots.checked = this.settings.defaultIncludeScreenshots;
    this.includeAssertions.checked = this.settings.defaultIncludeAssertions;
  }

  private openSettings(): void {
    // Populate settings form with current values
    this.settingBaseUrl.value = this.settings.baseUrl;
    this.settingDescribeName.value = this.settings.describeName;
    this.settingTestPrefix.value = this.settings.testNamePrefix;
    this.settingDefaultA11y.checked = this.settings.defaultIncludeA11y;
    this.settingDefaultScreenshots.checked = this.settings.defaultIncludeScreenshots;
    this.settingDefaultAssertions.checked = this.settings.defaultIncludeAssertions;
    this.settingSelectorPriority.value = this.settings.selectorPriority;
    this.settingRecordHover.checked = this.settings.recordHover;
    this.settingRecordScroll.checked = this.settings.recordScroll;
    this.settingHighlightElements.checked = this.settings.highlightElements;

    // Show panel
    this.settingsPanel.classList.remove('hidden');
  }

  private closeSettings(): void {
    this.settingsPanel.classList.add('hidden');
  }

  private async saveSettings(): Promise<void> {
    // Gather settings from form
    this.settings = {
      baseUrl: this.settingBaseUrl.value.trim(),
      describeName: this.settingDescribeName.value.trim() || DEFAULT_SETTINGS.describeName,
      testNamePrefix: this.settingTestPrefix.value.trim() || DEFAULT_SETTINGS.testNamePrefix,
      defaultIncludeA11y: this.settingDefaultA11y.checked,
      defaultIncludeScreenshots: this.settingDefaultScreenshots.checked,
      defaultIncludeAssertions: this.settingDefaultAssertions.checked,
      selectorPriority: this.settingSelectorPriority.value as ExtensionSettings['selectorPriority'],
      excludedClassPatterns: DEFAULT_SETTINGS.excludedClassPatterns,
      recordHover: this.settingRecordHover.checked,
      recordScroll: this.settingRecordScroll.checked,
      highlightElements: this.settingHighlightElements.checked
    };

    try {
      await chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: this.settings });

      // Apply to current checkboxes
      this.applySettingsToCheckboxes();

      // Update code preview with new settings
      this.updateCodePreview();

      // Notify background script of settings change
      await chrome.runtime.sendMessage({
        type: 'SETTINGS_UPDATED',
        payload: this.settings
      });

      this.closeSettings();
      this.showToast('Settings saved!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showToast('Failed to save settings');
    }
  }

  private async resetSettings(): Promise<void> {
    if (!confirm('Reset all settings to defaults?')) return;

    this.settings = { ...DEFAULT_SETTINGS };

    // Update form
    this.settingBaseUrl.value = this.settings.baseUrl;
    this.settingDescribeName.value = this.settings.describeName;
    this.settingTestPrefix.value = this.settings.testNamePrefix;
    this.settingDefaultA11y.checked = this.settings.defaultIncludeA11y;
    this.settingDefaultScreenshots.checked = this.settings.defaultIncludeScreenshots;
    this.settingDefaultAssertions.checked = this.settings.defaultIncludeAssertions;
    this.settingSelectorPriority.value = this.settings.selectorPriority;
    this.settingRecordHover.checked = this.settings.recordHover;
    this.settingRecordScroll.checked = this.settings.recordScroll;
    this.settingHighlightElements.checked = this.settings.highlightElements;

    this.showToast('Settings reset to defaults');
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
