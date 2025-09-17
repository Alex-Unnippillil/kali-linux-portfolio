import { DragSession, DragSource, DragTarget, DropContext, ModifierState } from './types';

interface ActiveSession<TPayload = unknown> extends DragSession<TPayload> {}

type SourceMap = Map<string, DragSource<any, any>>;
type TargetMap = Map<string, DragTarget<any, any>>;

function createId() {
  return `drag-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export class DragDropRegistry {
  private sources: SourceMap = new Map();
  private targets: TargetMap = new Map();
  private activeSession?: ActiveSession;
  private hoverTargetId?: string;
  private lastModifiers: ModifierState = {};

  registerSource<TPayload, TData = unknown>(source: DragSource<TPayload, TData>) {
    this.sources.set(source.windowId, source as DragSource<any, any>);
    return () => {
      const stored = this.sources.get(source.windowId);
      if (stored && stored === source) {
        this.sources.delete(source.windowId);
      }
    };
  }

  registerTarget<TPayload, TData = unknown>(target: DragTarget<TPayload, TData>) {
    this.targets.set(target.id, target as DragTarget<any, any>);
    return () => {
      const stored = this.targets.get(target.id);
      if (!stored) return;
      if (this.hoverTargetId === target.id) {
        this.emitDragLeave(target.id, this.lastModifiers);
        this.hoverTargetId = undefined;
      }
      this.targets.delete(target.id);
    };
  }

  beginDrag<TPayload>(options: { sourceWindowId: string; payload: TPayload; id?: string }) {
    const { sourceWindowId, payload, id } = options;
    if (this.activeSession) {
      this.cancelDrag();
    }
    const session: ActiveSession<TPayload> = {
      id: id ?? createId(),
      sourceWindowId,
      payload,
    };
    this.activeSession = session;
    this.lastModifiers = {};
    this.hoverTargetId = undefined;
    const source = this.sources.get(sourceWindowId);
    source?.callbacks?.onDragStart?.(session);
    return session;
  }

  setHoverTarget(targetId: string, modifiers: ModifierState = {}) {
    const session = this.requireSession();
    const target = this.requireTarget(targetId);
    if (target.accepts && !target.accepts(session)) {
      if (this.hoverTargetId === targetId) {
        this.emitDragLeave(targetId, modifiers);
        this.hoverTargetId = undefined;
      }
      return false;
    }

    if (this.hoverTargetId === targetId) {
      this.lastModifiers = { ...modifiers };
      return true;
    }

    if (this.hoverTargetId) {
      this.emitDragLeave(this.hoverTargetId, modifiers);
    }

    this.hoverTargetId = targetId;
    this.lastModifiers = { ...modifiers };
    target.onDragEnter?.(this.createContext(target, modifiers));
    return true;
  }

  async drop(targetId: string, modifiers: ModifierState = {}) {
    const session = this.requireSession();
    const target = this.requireTarget(targetId);

    if (target.accepts && !target.accepts(session)) {
      return undefined;
    }

    if (this.hoverTargetId && this.hoverTargetId !== targetId) {
      this.emitDragLeave(this.hoverTargetId, modifiers);
    }

    this.hoverTargetId = targetId;
    this.lastModifiers = { ...modifiers };

    const context = this.createContext(target, modifiers);
    const source = this.sources.get(session.sourceWindowId);

    try {
      const result = await target.onDrop(context);
      const finalResult = result ?? { operation: 'none' };
      source?.callbacks?.onDropComplete?.(session, finalResult, context);
      return finalResult;
    } catch (err) {
      source?.callbacks?.onDragCancel?.(session);
      throw err;
    } finally {
      try {
        target.onDragLeave?.(context);
      } finally {
        source?.callbacks?.onDragEnd?.(session);
        this.activeSession = undefined;
        this.hoverTargetId = undefined;
        this.lastModifiers = {};
      }
    }
  }

  cancelDrag(modifiers: ModifierState = {}) {
    const session = this.activeSession;
    if (!session) return;
    const source = this.sources.get(session.sourceWindowId);
    if (this.hoverTargetId) {
      this.emitDragLeave(this.hoverTargetId, modifiers);
    }
    source?.callbacks?.onDragCancel?.(session);
    source?.callbacks?.onDragEnd?.(session);
    this.activeSession = undefined;
    this.hoverTargetId = undefined;
    this.lastModifiers = {};
  }

  reset() {
    this.sources.clear();
    this.targets.clear();
    this.activeSession = undefined;
    this.hoverTargetId = undefined;
    this.lastModifiers = {};
  }

  getActiveSession() {
    return this.activeSession;
  }

  private requireSession(): ActiveSession {
    if (!this.activeSession) {
      throw new Error('No active drag session');
    }
    return this.activeSession;
  }

  private requireTarget(targetId: string) {
    const target = this.targets.get(targetId);
    if (!target) {
      throw new Error(`Unknown drag target: ${targetId}`);
    }
    return target;
  }

  private createContext<TPayload, TData>(
    target: DragTarget<TPayload, TData>,
    modifiers: ModifierState
  ): DropContext<TPayload, TData> {
    const session = this.requireSession() as DragSession<TPayload>;
    return {
      session,
      target: {
        id: target.id,
        windowId: target.windowId,
        data: target.data as TData,
      },
      modifiers,
    };
  }

  private emitDragLeave(targetId: string, modifiers: ModifierState) {
    const target = this.targets.get(targetId);
    if (!target || !this.activeSession) return;
    target.onDragLeave?.(this.createContext(target, modifiers));
  }
}
