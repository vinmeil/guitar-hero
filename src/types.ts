export type { Circle, CircleLine, State, Action, NoteType };
export { Constants, Viewport };

import * as Tone from "tone";

const Viewport = {
  CANVAS_WIDTH: 200,
  CANVAS_HEIGHT: 400,
} as const;

const Constants = {
  TICK_RATE_MS: 6,
  SONG_LIST: [
    "RockinRobin",
    "ComparedChild",
    "BusToAnotherWorld",
    "UnderKids",
    "RainingAfterAll",
    "LowAsDirt",
    "DifficultMode",
    "TrappedInThePast",
    "MouIiKai",
    "ThroughTheFireAndTheFlames_hard",
    "FreedomDive",
    "HungarianDanceNo5",
    "SleepingBeauty",
  ],
  COLUMN_KEYS: ["KeyA", "KeyS", "KeyK", "KeyL"],
  COLUMN_COLORS: ["green", "red", "blue", "yellow"],
  COLUMN_PERCENTAGES: ["20%", "40%", "60%", "80%"],
  HITCIRCLE_CENTER: Viewport.CANVAS_HEIGHT - 50,
  HITCIRCLE_RANGE: 70,
  USERPLAYED_CIRCLE_VISIBLE_EXTRA: 40,
  START_Y: "-15",
  PIXELS_PER_TICK: 4,
  NOTE_VOLUME_NORMALIZER: 10,
  HIT_PERFECT_RANGE_END: 25,
  HIT_GREAT_RANGE_END: 55,
  HIT_GOOD_RANGE_END: 90,
  INSTRUMENTS: [
    "bass-electric",
    "bassoon",
    "cello",
    "clarinet",
    "contrabass",
    "flute",
    "french-horn",
    "guitar-acoustic",
    "guitar-electric",
    "guitar-nylon",
    "harmonium",
    "harp",
    "organ",
    "piano",
    "saxophone",
    "trombone",
    "trumpet",
    "tuba",
    "violin",
    "xylophone",
  ],
} as const;

/** Type for notes read from CSV */
type NoteType = Readonly<{
  userPlayed: boolean;
  instrument: string;
  velocity: number;
  pitch: number;
  start: number;
  end: number;
  duration: number;
}>;

/** Circle type */
type Circle = Readonly<{
  id: string;
  r: string;
  cx: string;
  cy: string;
  style: string;
  class: string;
  note: NoteType;
  circleClicked: boolean;
  strokeWidth?: number;
  tailHeight?: number;
  isHoldNote: boolean;
  audio: Tone.Sampler;
}>;

/** Type for tail/hold notes */
type CircleLine = Readonly<{
  id: string;
  x1: string;
  x2: string;
  y1: string;
  y2: string;
  stroke: string;
  strokeWidth: string;
  opacity: string;
}>;

/** Game state */
type State = Readonly<{
  time: number;
  circleProps: ReadonlyArray<Circle>;
  bgCircleProps: ReadonlyArray<Circle>;
  tailProps: ReadonlyArray<CircleLine>;
  holdCircles: ReadonlyArray<Circle>;
  exit: ReadonlyArray<Circle>;
  exitTails: ReadonlyArray<CircleLine>;
  gameEnd: boolean;
  score: number;
  combo: number;
  highestCombo: number;
  nPerfect: number;
  nGreat: number;
  nGood: number;
  nMiss: number;
  circleCount: number;
  prevTimeInColumn: ReadonlyArray<number>;
  multiplier: number;
  lastNoteEndTime: number;
  randomNumber: number;
}>;
interface Action {
  apply(s: State): State;
}

/** Type for the filterEverything method in the Tick class */
export type filterEverythingParams = {
  circleProps: Circle[];
  tailProps: CircleLine[];
  holdCircles: Circle[];
  bgCircleProps: Circle[];
};
