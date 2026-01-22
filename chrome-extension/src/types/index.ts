// Recording session types
export interface RecordingSession {
  id: string;
  name: string;
  url: string;
  startTime: number;
  endTime?: number;
  actions: RecordedAction[];
  pageType?: PageType;
}

// Recorded action types
export type ActionType = 'click' | 'type' | 'navigate' | 'select' | 'check' | 'submit' | 'scroll' | 'hover';

export interface RecordedAction {
  id: string;
  type: ActionType;
  timestamp: number;
  selector: SelectorResult;
  element: ElementInfo;
  value?: string;
  url?: string;
  pageType?: PageType;
}

// Selector types
export type SelectorStrategy =
  | 'data-testid'
  | 'data-cy'
  | 'data-test'
  | 'aria-label'
  | 'role'
  | 'id'
  | 'text'
  | 'class'
  | 'css-path';

export interface SelectorResult {
  selector: string;
  strategy: SelectorStrategy;
  confidence: number; // 0-100
  isUnique: boolean;
  alternatives: AlternativeSelector[];
}

export interface AlternativeSelector {
  selector: string;
  strategy: SelectorStrategy;
  confidence: number;
}

// Element information
export interface ElementInfo {
  tagName: string;
  id?: string;
  className?: string;
  textContent?: string;
  attributes: Record<string, string>;
  rect: DOMRect | null;
  inputType?: string;
  placeholder?: string;
  name?: string;
  role?: string;
  ariaLabel?: string;
}

// Page type detection
export type PageType =
  | 'login-form'
  | 'registration-form'
  | 'contact-form'
  | 'search'
  | 'list'
  | 'table'
  | 'detail'
  | 'generic';

export interface PageAnalysisResult {
  pageType: PageType;
  confidence: number;
  features: PageFeatures;
  suggestedAssertions: AssertionTemplate[];
}

export interface PageFeatures {
  hasPasswordField: boolean;
  hasEmailField: boolean;
  hasSearchInput: boolean;
  hasTable: boolean;
  hasList: boolean;
  formFieldCount: number;
  hasConfirmPassword: boolean;
  hasTextarea: boolean;
  hasResultsContainer: boolean;
  hasSingleH1: boolean;
  hasMainContent: boolean;
  hasImages: boolean;
}

// Assertion templates
export interface AssertionTemplate {
  type: AssertionType;
  description: string;
  code: string;
}

export type AssertionType =
  | 'visibility'
  | 'text-content'
  | 'count'
  | 'attribute'
  | 'url'
  | 'form-validation'
  | 'accessibility';

// Message types for extension communication
export type MessageType =
  | 'START_RECORDING'
  | 'STOP_RECORDING'
  | 'PAUSE_RECORDING'
  | 'RESUME_RECORDING'
  | 'ACTION_RECORDED'
  | 'GET_SESSION'
  | 'GET_ALL_SESSIONS'
  | 'DELETE_SESSION'
  | 'EXPORT_CODE'
  | 'PAGE_ANALYZED'
  | 'GET_RECORDING_STATE'
  | 'HIGHLIGHT_ELEMENT'
  | 'SETTINGS_UPDATED';

export interface ExtensionMessage {
  type: MessageType;
  payload?: unknown;
  tabId?: number;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  currentSession: RecordingSession | null;
}

// Code generation options
export interface CodeGenerationOptions {
  includeAccessibilityChecks: boolean;
  includeScreenshots: boolean;
  includeAssertions: boolean;
  testName: string;
  describeName: string;
  baseUrl?: string;
}

// Storage keys
export const STORAGE_KEYS = {
  SESSIONS: 'cypress_recorder_sessions',
  CURRENT_SESSION: 'cypress_recorder_current_session',
  RECORDING_STATE: 'cypress_recorder_state',
  SETTINGS: 'cypress_recorder_settings'
} as const;

// Settings
export interface ExtensionSettings {
  // Code generation
  baseUrl: string;
  describeName: string;
  testNamePrefix: string;

  // Default options
  defaultIncludeA11y: boolean;
  defaultIncludeScreenshots: boolean;
  defaultIncludeAssertions: boolean;

  // Selector preferences
  selectorPriority: 'data-testid' | 'id' | 'name' | 'role' | 'auto';
  excludedClassPatterns: string[];

  // Recording options
  recordHover: boolean;
  recordScroll: boolean;
  highlightElements: boolean;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  // Code generation
  baseUrl: '',
  describeName: 'Recorded Test',
  testNamePrefix: 'Recording',

  // Default options
  defaultIncludeA11y: true,
  defaultIncludeScreenshots: true,
  defaultIncludeAssertions: true,

  // Selector preferences
  selectorPriority: 'auto',
  excludedClassPatterns: [
    'ng-*',      // Angular
    'sc-*',      // Styled-components
    'css-*',     // Emotion/CSS-in-JS
    'jsx-*',     // Styled-jsx
    '_*',        // CSS Modules hashes
    'style__*',  // CSS Modules
    'Mui*',      // Material-UI
    'chakra-*',  // Chakra UI
    'ant-*',     // Ant Design
    'tw-*'       // Tailwind dynamic
  ],

  // Recording options
  recordHover: false,
  recordScroll: false,
  highlightElements: true
};
