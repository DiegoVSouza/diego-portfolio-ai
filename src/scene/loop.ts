/**
 * One frame request at a time. A frame that is entered by a direct call (the first draw) while another request is pending must cancel it,
 * or two chains of requests live on and every frame is drawn twice (the second time with a zero time step).
 */
export interface FrameScheduler {
  /** Ask for a frame when `wanted()` allows it and none is pending. */
  schedule(): void;
  /** Called first thing in a frame, whether it came from a request or from a direct call: forgets and cancels any pending request. */
  enter(): void;
  /** Cancel the pending request, if any. */
  cancel(): void;
}

export function createFrameScheduler(
  frame: (now: number) => void,
  wanted: () => boolean,
  api: { request: (callback: (now: number) => void) => number; cancel: (id: number) => void } = {
    request: (callback) => requestAnimationFrame(callback),
    cancel: (id) => cancelAnimationFrame(id),
  },
): FrameScheduler {
  let id = 0;
  const cancel = () => {
    if (id) api.cancel(id);
    id = 0;
  };
  return {
    schedule() {
      if (id || !wanted()) return;
      id = api.request(frame);
    },
    enter: cancel,
    cancel,
  };
}
