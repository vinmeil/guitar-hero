import * as Tone from "tone";
import { SampleLibrary } from "./tonejs-instruments";
import { Circle, Constants, State } from "./types";
import { map, Observable, scan } from "rxjs";

export { attr, generateUniqueId, playNote, not, getAccuracy };

const samples = SampleLibrary.load({
  instruments: SampleLibrary.list,
  baseUrl: "samples/",
});

//////////////////////////////////////////////////////////////////////////////////////////
// taken from asteroids and previous workshops/appliedds
const attr = (e: Element, o: { [p: string]: unknown }) => { for (const k in o) e.setAttribute(k, String(o[k])) }
const not = <T>(f: (x: T) => boolean) => (x: T) => !f(x)
export abstract class RNG {
  // LCG using GCC's constants
  private static m = 0x80000000; // 2**31
  private static a = 1103515245;
  private static c = 12345;
  
  /**
   * Call `hash` repeatedly to generate the sequence of hashes.
   * @param seed
   * @returns a hash of the seed
  */
 public static hash = (seed: number) => (RNG.a * seed + RNG.c) % RNG.m;
 
 /**
  * Takes hash value and scales it to the range [-1, 1]
 */
public static scale = (hash: number) => (2 * hash) / (RNG.m - 1) / 2;
}
//////////////////////////////////////////////////////////////////////////////////////////


// FIXME: function is impure
const generateUniqueId = (): string => {
  return `circle-${Date.now()} - ${Math.floor(Math.random() * 1000)}`;
};

export const getRandomDuration = (randomNumber: number): number => {
  return (randomNumber / 4) + 0.25;
}

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

export const playAttack = (circle: Circle) => {
  const { pitch, velocity } = circle.note;
  const normalizedVelocity = Math.min(Math.max(velocity, 0), 1) / Constants.NOTE_VOLUME_NORMALIZER // divide because it is DAMN loud
  
  Tone.ToneAudioBuffer.loaded().then(() => {
    if (circle.audio) {
      circle.audio.triggerAttack(
        Tone.Frequency(pitch, "midi").toNote(),
        Tone.now(),
        normalizedVelocity
      );
    }
  });
}

export const playRelease = (circle: Circle) => {
  const { pitch } = circle.note;
  Tone.ToneAudioBuffer.loaded().then(() => {
    if (circle.audio) {
      circle.audio.triggerRelease(
        Tone.Frequency(pitch, "midi").toNote(),
        Tone.now()
      );
    }
  });
}

const getAccuracy = (s: State): number => {
  const { nPerfect: n300, nGreat: n100, nGood: n50, nMiss: nmiss } = s;
  const accuracy = ( (300 * n300) + (100 * n100) + (50 * n50) ) / 
              ( 300 * (n300 + n100 + n50 + nmiss) )
  return accuracy * 100;
}


