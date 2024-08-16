import * as Tone from "tone";
import { SampleLibrary } from "./tonejs-instruments";
import { Circle } from "./types";

export { attr, generateUniqueId, playNote, stopNote }

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
  /**
   * 
   * CURRENT IDEA:
   * edit the state of the game in here, adds a reference to the toDestination() which we can triggerRelease() in
   * stopNote()
   * 
   */
  const { instrument, pitch, duration, velocity, isHoldNote } = circle;
  const normalizedVelocity = Math.min(Math.max(velocity, 0), 1) / 5 // divide because it is DAMN loud
  
  Tone.ToneAudioBuffer.loaded().then(() => {
    if (samples[instrument]) {
      samples[instrument].toDestination();
      samples[instrument].triggerAttackRelease(
        Tone.Frequency(pitch, "midi").toNote(), // Convert MIDI note to frequency
        duration, // has to be in seconds
        undefined, // Use default time for note onset
        normalizedVelocity
      );

      // console.log("start note")
      // if (!isHoldNote) {
        //   samples[instrument].triggerAttackRelease(
        //     Tone.Frequency(pitch, "midi").toNote(), // Convert MIDI note to frequency
        //     duration, // has to be in seconds
        //     undefined, // Use default time for note onset
        //     normalizedVelocity
        //   );
      // } else {
      //   console.log("is hold note in util")

      //   const destination = samples[instrument].triggerAttack(
      //     Tone.Frequency(pitch, "midi").toNote(), // Convert MIDI note to frequency
      //     duration, // has to be in seconds
      //     undefined, // Use default time for note onset
      //   );
      // }
    } else {
      console.error(`Instrument ${instrument} not found in samples.`);
    }
  });

  return undefined;
};

const stopNote = (circle: Circle) => {
  const { instrument, pitch, duration } = circle;

  // console.log("stop note")
  samples[instrument].triggerRelease(
    Tone.Frequency(pitch, "midi").toNote(), // Convert MIDI note to frequency
    duration, // has to be in seconds
  );
}
