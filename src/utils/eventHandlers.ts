/**
 * Defensive event handler utilities to prevent _withMods errors in production
 */

export type SafeEventHandler<T = Event> = (event: T) => void | Promise<void>;

/**
 * Wraps an event handler to prevent _withMods errors
 * Provides fallback for undefined handlers
 */
export function createSafeHandler<T = Event>(
  handler: SafeEventHandler<T> | undefined
): SafeEventHandler<T> {
  return (event: T) => {
    try {
      if (handler && typeof handler === 'function') {
        return handler(event);
      }
    } catch (error) {
      console.warn('Event handler error (non-blocking):', error);
    }
  };
}

/**
 * Creates a safe drag event handler that prevents _withMods issues
 */
export function createDragHandlers() {
  return {
    handleDragOver: createSafeHandler<DragEvent>((event) => {
      event.preventDefault();
      event.stopPropagation();
    }),

    handleDragEnter: createSafeHandler<DragEvent>((event) => {
      event.preventDefault();
      event.stopPropagation();
    }),

    handleDragLeave: createSafeHandler<DragEvent>((event) => {
      event.preventDefault();
      event.stopPropagation();
    }),

    handleDrop: createSafeHandler<DragEvent>((event) => {
      event.preventDefault();
      event.stopPropagation();
    })
  };
}

/**
 * Runtime check for Vue helpers availability
 */
export function checkVueHelpersAvailability() {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const issues: string[] = [];

    // Check if common Vue errors are occurring
    const originalError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      if (typeof message === 'string' && message.includes('_withMods')) {
        console.error('🚨 _withMods error detected:', {
          message,
          source,
          lineno,
          colno,
          error
        });
        issues.push('_withMods error detected');
      }

      // Call original handler if it exists
      if (originalError) {
        return originalError(message, source, lineno, colno, error);
      }
      return false;
    };

    return {
      hasIssues: () => issues.length > 0,
      getIssues: () => [...issues],
      clearIssues: () => issues.length = 0
    };
  }

  return {
    hasIssues: () => false,
    getIssues: () => [],
    clearIssues: () => {}
  };
}