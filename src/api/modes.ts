import { Context } from ".";

/**
 * Switches to the mode with the given name.
 */
export function toMode(modeName: string): Thenable<void>;

/**
 * Temporarily switches to the mode with the given name.
 */
export function toMode(modeName: string, count: number): Thenable<void>;

export function toMode(modeName: string, count?: number) {
  const context = Context.current,
        extension = context.extension,
        mode = extension.modes.get(modeName);

  if (mode === undefined || mode.isPendingDeletion) {
    throw new Error(`mode ${JSON.stringify(modeName)} does not exist`);
  }

  if (!count) {
    return context.switchToMode(mode);
  }

  const editorState = context.getState(),
        initialMode = editorState.mode,
        disposable = extension
          .createAutoDisposable()
          .disposeOnEvent(editorState.onVisibilityDidChange)
          .addDisposable({
            dispose() {
              context.switchToMode(initialMode);
            },
          });

  return context.switchToMode(mode).then(() => {
    // We must start listening for events after a short delay, otherwise we will
    // be notified of the mode change below, immediately returning to the
    // previous mode.
    setImmediate(() => {
      const { Entry } = extension.recorder;

      disposable
        .addDisposable(extension.recorder.onDidAddEntry((entry) => {
          if (entry instanceof Entry.ExecuteCommand
              && entry.descriptor().identifier.endsWith("updateCount")) {
            // Ignore number inputs.
            return;
          }

          if (entry instanceof Entry.ChangeTextEditor
              || entry instanceof Entry.ChangeTextEditorMode) {
            // Immediately dispose.
            return disposable.dispose();
          }

          if (--count! === 0) {
            disposable.dispose();
          }
        }));
    });
  });
}
