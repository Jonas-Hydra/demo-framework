export class Highlighter {
  private overlay: HTMLDivElement | null = null;
  private tooltip: HTMLDivElement | null = null;
  private recordedIndicator: HTMLDivElement | null = null;
  private currentElement: Element | null = null;

  constructor() {
    this.createOverlay();
    this.createTooltip();
  }

  private createOverlay(): void {
    this.overlay = document.createElement('div');
    this.overlay.id = 'cypress-recorder-highlight';
    this.overlay.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 2147483646;
      border: 2px solid #6366f1;
      background-color: rgba(99, 102, 241, 0.1);
      border-radius: 4px;
      transition: all 0.1s ease-out;
      display: none;
    `;
    document.body.appendChild(this.overlay);
  }

  private createTooltip(): void {
    this.tooltip = document.createElement('div');
    this.tooltip.id = 'cypress-recorder-tooltip';
    this.tooltip.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 2147483647;
      background-color: #1e1e2e;
      color: #cdd6f4;
      padding: 6px 10px;
      border-radius: 4px;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
      font-size: 12px;
      max-width: 400px;
      word-break: break-all;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      display: none;
    `;
    document.body.appendChild(this.tooltip);
  }

  highlight(element: Element, selector?: string): void {
    if (!this.overlay || !this.tooltip) return;

    this.currentElement = element;
    const rect = element.getBoundingClientRect();

    // Position overlay
    this.overlay.style.left = `${rect.left - 2}px`;
    this.overlay.style.top = `${rect.top - 2}px`;
    this.overlay.style.width = `${rect.width + 4}px`;
    this.overlay.style.height = `${rect.height + 4}px`;
    this.overlay.style.display = 'block';

    // Position and update tooltip
    if (selector) {
      this.tooltip.textContent = selector;

      // Calculate tooltip position (prefer above element)
      const tooltipHeight = 30;
      const tooltipTop = rect.top - tooltipHeight - 8;
      const tooltipLeft = Math.max(8, Math.min(rect.left, window.innerWidth - 400));

      if (tooltipTop > 8) {
        this.tooltip.style.top = `${tooltipTop}px`;
      } else {
        this.tooltip.style.top = `${rect.bottom + 8}px`;
      }
      this.tooltip.style.left = `${tooltipLeft}px`;
      this.tooltip.style.display = 'block';
    }
  }

  showRecorded(element: Element): void {
    // Brief flash to indicate element was recorded
    if (!this.overlay) return;

    const rect = element.getBoundingClientRect();

    this.overlay.style.left = `${rect.left - 2}px`;
    this.overlay.style.top = `${rect.top - 2}px`;
    this.overlay.style.width = `${rect.width + 4}px`;
    this.overlay.style.height = `${rect.height + 4}px`;
    this.overlay.style.borderColor = '#22c55e';
    this.overlay.style.backgroundColor = 'rgba(34, 197, 94, 0.2)';
    this.overlay.style.display = 'block';

    setTimeout(() => {
      if (this.overlay) {
        this.overlay.style.borderColor = '#6366f1';
        this.overlay.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
        this.overlay.style.display = 'none';
      }
    }, 300);
  }

  hide(): void {
    if (this.overlay) {
      this.overlay.style.display = 'none';
    }
    if (this.tooltip) {
      this.tooltip.style.display = 'none';
    }
    this.currentElement = null;
  }

  showRecordingIndicator(): void {
    if (this.recordedIndicator) return;

    this.recordedIndicator = document.createElement('div');
    this.recordedIndicator.id = 'cypress-recorder-indicator';
    this.recordedIndicator.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="
          width: 10px;
          height: 10px;
          background-color: #ef4444;
          border-radius: 50%;
          animation: pulse 1.5s ease-in-out infinite;
        "></span>
        <span>Recording</span>
      </div>
    `;
    this.recordedIndicator.style.cssText = `
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 2147483647;
      background-color: #1e1e2e;
      color: #cdd6f4;
      padding: 8px 16px;
      border-radius: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(239, 68, 68, 0.3);
    `;

    // Add animation keyframes
    const style = document.createElement('style');
    style.id = 'cypress-recorder-styles';
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
    `;

    if (!document.getElementById('cypress-recorder-styles')) {
      document.head.appendChild(style);
    }

    document.body.appendChild(this.recordedIndicator);
  }

  updateRecordingIndicator(isPaused: boolean): void {
    if (!this.recordedIndicator) return;

    if (isPaused) {
      this.recordedIndicator.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="
            width: 10px;
            height: 10px;
            background-color: #f59e0b;
            border-radius: 2px;
          "></span>
          <span>Paused</span>
        </div>
      `;
      this.recordedIndicator.style.borderColor = 'rgba(245, 158, 11, 0.3)';
    } else {
      this.recordedIndicator.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="
            width: 10px;
            height: 10px;
            background-color: #ef4444;
            border-radius: 50%;
            animation: pulse 1.5s ease-in-out infinite;
          "></span>
          <span>Recording</span>
        </div>
      `;
      this.recordedIndicator.style.borderColor = 'rgba(239, 68, 68, 0.3)';
    }
  }

  hideRecordingIndicator(): void {
    if (this.recordedIndicator) {
      this.recordedIndicator.remove();
      this.recordedIndicator = null;
    }
  }

  destroy(): void {
    this.hide();
    this.hideRecordingIndicator();

    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }

    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }

    const styles = document.getElementById('cypress-recorder-styles');
    if (styles) {
      styles.remove();
    }
  }
}

export const highlighter = new Highlighter();
