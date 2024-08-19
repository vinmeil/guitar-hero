import * as Tone from "tone";
import { SampleLibrary } from "./tonejs-instruments";
import { Circle, Constants } from "./types";

export { attr, generateUniqueId, playNote, not }

const samples = SampleLibrary.load({
  instruments: SampleLibrary.list,
  baseUrl: "samples/",
});

// taken from asteroids example
const attr = (e: Element, o: { [p: string]: unknown }) => { for (const k in o) e.setAttribute(k, String(o[k])) }
const not = <T>(f: (x: T) => boolean) => (x: T) => !f(x)

const generateUniqueId = (): string => {
  return `circle-${Date.now()} - ${Math.floor(Math.random() * 1000)}`;
};

const playNote = (circle: Circle) => {
  const { instrument, pitch, duration, velocity } = circle.note;
  const normalizedVelocity = Math.min(Math.max(velocity, 0), 1) / Constants.NOTE_VOLUME_NORMALIZER // divide because it is DAMN loud
  
  Tone.ToneAudioBuffer.loaded().then(() => {
    if (samples[instrument]) {
      samples[instrument].toDestination();
      samples[instrument].triggerAttackRelease(
        Tone.Frequency(pitch, "midi").toNote(), // Convert MIDI note to frequency
        duration, // has to be in seconds
        undefined, // Use default time for note onset
        normalizedVelocity
      );
    } else {
      console.error(`Instrument ${instrument} not found in samples.`);
    }
  });
  
  return undefined;
};


