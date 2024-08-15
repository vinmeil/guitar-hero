
export type { Circle, ObjectId, State, Action };
export { Constants, Viewport };

const Constants = {
  TICK_RATE_MS: 8,
  // SONG_NAME: "RockinRobin",
  // SONG_NAME: "ComparedChild",
  SONG_NAME: "Halcyon",
  // SONG_NAME: "FreedomDive",
  // SONG_NAME: "HungarianDanceNo5",
  // SONG_NAME: "SleepingBeauty",
  COLUMN_KEYS: ["KeyD", "KeyF", "KeyJ", "KeyK"],
  START_Y: "0",
} as const;

const Viewport = {
  CANVAS_WIDTH: 200,
  CANVAS_HEIGHT: 400,
} as const;

/**
 * ObjectIds help us identify objects and manage objects which timeout (such as bullets)
 */
type ObjectId = Readonly<{ id: string }>

/**
 * Circle type
 */
type Circle = Readonly<{
  duration: number,
  velocity: number,
  instrument: string,
  pitch: number,
  userPlayed: boolean,
  circleClicked: boolean,
  id: string,
  r: string,
  cx: string,
  cy: string,
  style: string,
  class: string,
}>

/**
 * Game state
 */
type State = Readonly<{
  time: number,
  circleProps: ReadonlyArray<Circle>,
  circleSVGs: ReadonlyArray<SVGElement>,
  exit: ReadonlyArray<Circle>,
  gameEnd: boolean,
  score: number,
}>

/**
 * Actions modify state
 */
interface Action {
  apply(s: State): State;
}
