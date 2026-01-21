import {
  RecordedAction,
  ActionType,
  ElementInfo,
  RecordingState
} from '../types';
import { selectorGenerator } from './selector-generator';
import { highlighter } from './highlighter';

type EventHandler = EventListener;

export class EventRecorder {
  private isRecording = false;
  private isPaused = false;
  private handlers: Map<string, EventHandler> = new Map();
  private inputTimers: Map<Element, number> = new Map();
  private lastInputValues: Map<Element, string> = new Map();
  private pendingInputs: Map<Element, { value: string; timestamp: number }> = new Map();

  // Debounce delay for input events (ms)
  private readonly INPUT_DEBOUNCE = 500;

  start(): void {
    if (this.isRecording) return;

    this.isRecording = true;
    this.isPaused = false;
    this.attachEventListeners();
    highlighter.showRecordingIndicator();

    console.log('[Cypress Recorder] Recording started');
  }

  stop(): void {
    this.isRecording = false;
    this.isPaused = false;
    this.removeEventListeners();
    this.flushPendingInputs();
    highlighter.hideRecordingIndicator();
    highlighter.hide();

    console.log('[Cypress Recorder] Recording stopped');
  }

  pause(): void {
    this.isPaused = true;
    highlighter.updateRecordingIndicator(true);
    console.log('[Cypress Recorder] Recording paused');
  }

  resume(): void {
    this.isPaused = false;
    highlighter.updateRecordingIndicator(false);
    console.log('[Cypress Recorder] Recording resumed');
  }

  getState(): { isRecording: boolean; isPaused: boolean } {
    return { isRecording: this.isRecording, isPaused: this.isPaused };
  }

  private attachEventListeners(): void {
    // Click handler
    const clickHandler = this.handleClick.bind(this) as EventListener;
    document.addEventListener('click', clickHandler, true);
    this.handlers.set('click', clickHandler);

    // Input handler (for typing)
    const inputHandler = this.handleInput.bind(this) as EventListener;
    document.addEventListener('input', inputHandler, true);
    this.handlers.set('input', inputHandler);

    // Change handler (for select, checkbox, radio)
    const changeHandler = this.handleChange.bind(this) as EventListener;
    document.addEventListener('change', changeHandler, true);
    this.handlers.set('change', changeHandler);

    // Submit handler
    const submitHandler = this.handleSubmit.bind(this) as EventListener;
    document.addEventListener('submit', submitHandler, true);
    this.handlers.set('submit', submitHandler);

    // Mouseover for highlighting
    const mouseoverHandler = this.handleMouseover.bind(this) as EventListener;
    document.addEventListener('mouseover', mouseoverHandler, true);
    this.handlers.set('mouseover', mouseoverHandler);

    // Mouseout to hide highlight
    const mouseoutHandler = this.handleMouseout.bind(this) as EventListener;
    document.addEventListener('mouseout', mouseoutHandler, true);
    this.handlers.set('mouseout', mouseoutHandler);

    // Keydown for special keys
    const keydownHandler = this.handleKeydown.bind(this) as EventListener;
    document.addEventListener('keydown', keydownHandler, true);
    this.handlers.set('keydown', keydownHandler);
  }

  private removeEventListeners(): void {
    for (const [event, handler] of this.handlers) {
      document.removeEventListener(event, handler, true);
    }
    this.handlers.clear();

    // Clear input timers
    for (const timer of this.inputTimers.values()) {
      clearTimeout(timer);
    }
    this.inputTimers.clear();
    this.lastInputValues.clear();
  }

  private shouldRecord(): boolean {
    return this.isRecording && !this.isPaused;
  }

  private isRecorderElement(element: Element): boolean {
    // Don't record interactions with our own UI elements
    const id = element.id || '';
    return id.startsWith('cypress-recorder-');
  }

  private handleClick(event: MouseEvent): void {
    if (!this.shouldRecord()) return;

    const target = event.target as Element;
    if (!target || this.isRecorderElement(target)) return;

    // Skip if this is a click on an input (typing will be recorded separately)
    const tagName = target.tagName.toLowerCase();
    if (['input', 'textarea'].includes(tagName)) {
      return;
    }

    // Flush any pending input for other elements
    this.flushPendingInputs();

    const action = this.createAction('click', target);
    this.recordAction(action);

    highlighter.showRecorded(target);
  }

  private handleInput(event: Event): void {
    if (!this.shouldRecord()) return;

    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (!target || this.isRecorderElement(target)) return;

    const tagName = target.tagName.toLowerCase();
    if (!['input', 'textarea'].includes(tagName)) return;

    // Skip password fields for security
    if (target instanceof HTMLInputElement && target.type === 'password') {
      return;
    }

    // Debounce input events
    const existingTimer = this.inputTimers.get(target);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Store pending input
    this.pendingInputs.set(target, {
      value: target.value,
      timestamp: Date.now()
    });

    // Set new timer
    const timer = window.setTimeout(() => {
      this.flushInputForElement(target);
    }, this.INPUT_DEBOUNCE);

    this.inputTimers.set(target, timer);
  }

  private flushInputForElement(element: HTMLInputElement | HTMLTextAreaElement): void {
    const pending = this.pendingInputs.get(element);
    if (!pending) return;

    const lastValue = this.lastInputValues.get(element) || '';
    if (pending.value === lastValue) {
      this.pendingInputs.delete(element);
      return;
    }

    this.lastInputValues.set(element, pending.value);
    this.pendingInputs.delete(element);
    this.inputTimers.delete(element);

    const action = this.createAction('type', element, pending.value);
    action.timestamp = pending.timestamp;
    this.recordAction(action);

    highlighter.showRecorded(element);
  }

  private flushPendingInputs(): void {
    for (const [element] of this.pendingInputs) {
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        this.flushInputForElement(element);
      }
    }
  }

  private handleChange(event: Event): void {
    if (!this.shouldRecord()) return;

    const target = event.target as HTMLElement;
    if (!target || this.isRecorderElement(target)) return;

    const tagName = target.tagName.toLowerCase();

    if (tagName === 'select') {
      const select = target as HTMLSelectElement;
      const action = this.createAction('select', target, select.value);
      this.recordAction(action);
      highlighter.showRecorded(target);
    } else if (target instanceof HTMLInputElement) {
      if (target.type === 'checkbox' || target.type === 'radio') {
        const action = this.createAction('check', target, String(target.checked));
        this.recordAction(action);
        highlighter.showRecorded(target);
      }
    }
  }

  private handleSubmit(event: Event): void {
    if (!this.shouldRecord()) return;

    const target = event.target as HTMLFormElement;
    if (!target || this.isRecorderElement(target)) return;

    // Flush any pending inputs first
    this.flushPendingInputs();

    const action = this.createAction('submit', target);
    this.recordAction(action);
    highlighter.showRecorded(target);
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (!this.shouldRecord()) return;

    const target = event.target as Element;
    if (!target || this.isRecorderElement(target)) return;

    // Record Enter key on input fields
    if (event.key === 'Enter') {
      const tagName = target.tagName.toLowerCase();
      if (['input', 'textarea'].includes(tagName)) {
        // Flush pending input first
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
          this.flushInputForElement(target);
        }

        // Record the Enter key as part of the type action value
        const pending = this.pendingInputs.get(target);
        if (pending) {
          pending.value += '{enter}';
        }
      }
    }
  }

  private handleMouseover(event: MouseEvent): void {
    if (!this.shouldRecord()) return;

    const target = event.target as Element;
    if (!target || this.isRecorderElement(target)) return;

    // Don't highlight non-interactive elements
    if (!this.isInteractiveElement(target)) return;

    const selector = selectorGenerator.generate(target);
    highlighter.highlight(target, selector.selector);
  }

  private handleMouseout(event: MouseEvent): void {
    if (!this.isRecording) return;

    const target = event.target as Element;
    if (!target || this.isRecorderElement(target)) return;

    highlighter.hide();
  }

  private isInteractiveElement(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    const interactiveTags = [
      'a', 'button', 'input', 'select', 'textarea',
      'label', 'details', 'summary'
    ];

    if (interactiveTags.includes(tagName)) return true;

    // Check for role
    const role = element.getAttribute('role');
    const interactiveRoles = [
      'button', 'link', 'checkbox', 'radio', 'textbox',
      'combobox', 'listbox', 'menuitem', 'tab', 'switch'
    ];
    if (role && interactiveRoles.includes(role)) return true;

    // Check for click handlers (limited detection)
    if (element.hasAttribute('onclick')) return true;

    // Check for tabindex
    if (element.hasAttribute('tabindex')) return true;

    return false;
  }

  private createAction(type: ActionType, element: Element, value?: string): RecordedAction {
    const selector = selectorGenerator.generate(element);
    const elementInfo = this.getElementInfo(element);

    return {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: Date.now(),
      selector,
      element: elementInfo,
      value
    };
  }

  private getElementInfo(element: Element): ElementInfo {
    const rect = element.getBoundingClientRect();
    const attributes: Record<string, string> = {};

    for (const attr of element.attributes) {
      attributes[attr.name] = attr.value;
    }

    const info: ElementInfo = {
      tagName: element.tagName.toLowerCase(),
      attributes,
      rect: rect.width > 0 ? rect : null
    };

    if (element.id) info.id = element.id;
    if (element.className) info.className = element.className;
    if (element.textContent) {
      info.textContent = element.textContent.trim().substring(0, 100);
    }

    if (element instanceof HTMLInputElement) {
      info.inputType = element.type;
      if (element.placeholder) info.placeholder = element.placeholder;
      if (element.name) info.name = element.name;
    }

    const role = element.getAttribute('role');
    if (role) info.role = role;

    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) info.ariaLabel = ariaLabel;

    return info;
  }

  private recordAction(action: RecordedAction): void {
    // Send to background script
    chrome.runtime.sendMessage({
      type: 'ACTION_RECORDED',
      payload: action
    }).catch(error => {
      console.error('[Cypress Recorder] Failed to record action:', error);
    });

    console.log('[Cypress Recorder] Action recorded:', action.type, action.selector.selector);
  }
}

export const eventRecorder = new EventRecorder();
