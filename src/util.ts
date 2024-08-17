import * as Tone from "tone";
import { SampleLibrary } from "./tonejs-instruments";
import { Circle, Constants } from "./types";

export { attr, generateUniqueId, playNote, startNote, stopNote }

const samples = SampleLibrary.load({
  instruments: SampleLibrary.list,
  baseUrl: "samples/",
});

// taken from asteroids example
const attr = (e: Element, o: { [p: string]: unknown }) => { for (const k in o) e.setAttribute(k, String(o[k])) }

const generateUniqueId = (): string => {
  return `circle-${Date.now()} - ${Math.floor(Math.random() * 1000)}`;
};

const playNote = (circle: Circle) => {
  const { instrument, pitch, duration, velocity, isHoldNote } = circle;
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

const startNote = (circle: Circle) => {
  // for some reason hold notes are very loud, so i made them 10x quieter
  const normalizedVelocity = Math.min(Math.max(circle.velocity, 0), 1) / (Constants.NOTE_VOLUME_NORMALIZER * 4)
  console.log("trigger attack called", circle)
  samples[circle.instrument].triggerAttack(
    Tone.Frequency(circle.pitch, "midi").toNote(),
    Tone.now(),
    normalizedVelocity
  );
}

const stopNote = (circle: Circle) => {
  samples[circle.instrument].triggerRelease(
    Tone.Frequency(circle.pitch, "midi").toNote(),
    Tone.now()
  );
}

