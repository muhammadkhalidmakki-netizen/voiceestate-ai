// A soft "ringing" tone played while the demo call is connecting, so the lead
// isn't left in silence before the AI voice agent picks up. Generated with the
// Web Audio API: no audio file and no dependency.
//
// Pattern: a double ring (two short bursts), then a pause, repeated.

const FREQUENCIES = [440, 480]; // the classic ringback pair
const VOLUME = 0.06; // deliberately quiet; the assistant's voice follows
const BURST_SECONDS = 0.4;
const GAP_SECONDS = 0.2;
const PAUSE_SECONDS = 2;
const CYCLE_SECONDS = BURST_SECONDS * 2 + GAP_SECONDS + PAUSE_SECONDS;
const FADE_SECONDS = 0.03;

export type RingTone = { stop: () => void };

type AudioContextCtor = typeof AudioContext;

/** Starts the ring tone. Returns a handle whose stop() is safe to call twice.
 *  Does nothing (and never throws) if the browser has no Web Audio. */
export function startRingTone(): RingTone {
  const noop: RingTone = { stop: () => {} };
  if (typeof window === "undefined") return noop;

  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!Ctor) return noop;

  let ctx: AudioContext;
  try {
    ctx = new Ctor();
  } catch {
    return noop;
  }
  void ctx.resume().catch(() => {});

  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);
  const oscillators = FREQUENCIES.map((hz) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = hz;
    osc.connect(gain);
    osc.start();
    return osc;
  });

  const burst = (at: number) => {
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(VOLUME, at + FADE_SECONDS);
    gain.gain.setValueAtTime(VOLUME, at + BURST_SECONDS - FADE_SECONDS);
    gain.gain.linearRampToValueAtTime(0, at + BURST_SECONDS);
  };
  let scheduledUntil = ctx.currentTime + 0.05;
  const scheduleAhead = () => {
    // keep about 8 seconds of rings queued
    while (scheduledUntil < ctx.currentTime + 8) {
      burst(scheduledUntil);
      burst(scheduledUntil + BURST_SECONDS + GAP_SECONDS);
      scheduledUntil += CYCLE_SECONDS;
    }
  };
  scheduleAhead();
  const timer = setInterval(scheduleAhead, 2000);

  let stopped = false;
  return {
    stop() {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
      try {
        const now = ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.08);
        for (const osc of oscillators) osc.stop(now + 0.1);
      } catch {
        // already stopped
      }
      setTimeout(() => void ctx.close().catch(() => {}), 200);
    },
  };
}
