
export type { Circle, ObjectId, State, Action };
export { Constants, Viewport };

const Constants = {
  TICK_RATE_MS: 10,
  SONG_NAME: "RockinRobin",
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
  objCount: number,
  gameEnd: boolean,
  score: number,
}>

/**
 * Actions modify state
 */
interface Action {
  apply(s: State): State;
}
