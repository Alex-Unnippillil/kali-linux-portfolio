import { freezeWindowFrames, resumeWindowFrames, runWithWindowScope } from './frame-manager';

export type WindowLifecycleHandlers = {
  freeze?: () => void;
  resume?: () => void;
};

export interface WindowManagerContract {
  readonly id: string;
  registerLifecycle: (handlers: WindowLifecycleHandlers) => () => void;
  freeze: () => void;
  resume: () => void;
  runWithScope: <T>(fn: () => T) => T;
}

class WindowManagerContractImpl implements WindowManagerContract {
  public readonly id: string;
  private handlers = new Set<WindowLifecycleHandlers>();
  private usingFallback = false;
  private frozen = false;

  constructor(id: string) {
    this.id = id;
  }

  registerLifecycle = (handlers: WindowLifecycleHandlers) => {
    this.handlers.add(handlers);
    return () => {
      this.handlers.delete(handlers);
    };
  };

  freeze = () => {
    if (this.frozen) return;
    this.frozen = true;
    let handled = false;
    this.handlers.forEach((handlers) => {
      if (typeof handlers.freeze === 'function') {
        handled = true;
        try {
          handlers.freeze();
        } catch (err) {
          console.error('Failed to run freeze handler for window', this.id, err);
        }
      }
    });

    this.usingFallback = !handled;
    if (this.usingFallback) {
      freezeWindowFrames(this.id);
    }
  };

  resume = () => {
    if (!this.frozen) return;
    this.frozen = false;
    let handled = false;
    this.handlers.forEach((handlers) => {
      if (typeof handlers.resume === 'function') {
        handled = true;
        try {
          handlers.resume();
        } catch (err) {
          console.error('Failed to run resume handler for window', this.id, err);
        }
      }
    });

    if (this.usingFallback) {
      resumeWindowFrames(this.id);
    }
    this.usingFallback = false;
  };

  runWithScope = <T>(fn: () => T): T => runWithWindowScope(this.id, fn);
}

export const createWindowManagerContract = (id: string): WindowManagerContract =>
  new WindowManagerContractImpl(id);

