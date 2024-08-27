import * as Tone from "tone";
import { Circle, Constants, State } from "./types";

//////////////////////////////////////////////////////////////////////////////////////////
// taken from asteroids and previous workshops/applieds
// credit goes to Tim Dwyer and the FIT2102 teaching team
export const attr = (e: Element, o: { [p: string]: unknown }) => { for (const k in o) e.setAttribute(k, String(o[k])) }
export const not = <T>(f: (x: T) => boolean) => (x: T) => !f(x)
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

export function isNotNullOrUndefined<T extends object>(input: null | undefined | T): input is T {
  return input != null;
}
//////////////////////////////////////////////////////////////////////////////////////////

/** returns a random number between 0.25 and 0.5 for the random note durations */
export const getRandomDuration = (randomNumber: number): number => {
  // divide by 4 -> [0, 0.25), add 0.25 -> [0.25, 0.5), to avoid 0 duration
  return (randomNumber / 4) + 0.25;
}

/** plays audio for circles */
export const playNote = (circle: Circle) => {
  const { pitch, duration, velocity } = circle.note,
        { isHoldNote, audio } = circle,
        normalizedVelocity = velocity / 127 / Constants.NOTE_VOLUME_NORMALIZER // divide because it is DAMN loud
  
  // wait for it to load or something
  Tone.ToneAudioBuffer.loaded().then(() => {
    if (!audio) {
      return;
    }

    audio.toDestination();
    if (isHoldNote) {
      // only triggerAttack for hold notes so we can trigger release later
      circle.audio.triggerAttack(
        Tone.Frequency(pitch, "midi").toNote(),
        Tone.now(),
        normalizedVelocity
      );
    } else {
      // triggerAttackRelease for every other note
      audio.triggerAttackRelease(
        Tone.Frequency(pitch, "midi").toNote(), // Convert MIDI note to frequency
        duration, // has to be in seconds
        undefined, // Use default time for note onset
        normalizedVelocity
      );
    }
  });
};

/** stops the audio for hold notes */
export const releaseNote = (circle: Circle) => {
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

/** gets the accuracy of the current state */
export const getAccuracy = (s: State): number => {
  const { nPerfect, nGreat, nGood, nMiss } = s;

  // use formula from osu!
  const accuracy = ( (300 * nPerfect) + (100 * nGreat) + (50 * nGood) ) / 
                   ( 300 * (nPerfect + nGreat + nGood + nMiss) )
  return accuracy * 100; // multiply by 100 because the formula returns a ratio
}

/** gets the current state's multiplier based on the combo */
export const getNewMutliplier = (s: State): number => {
  // if youve hit 10 in a row, increase multiplier, make sure combo is more than 0 as well
  if (s.combo % 10 === 0 && s.combo > 0) {
    return parseFloat((s.multiplier + 0.2).toFixed(2));
  }

  return s.multiplier;
}


