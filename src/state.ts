import { Action, Circle, CircleLine, Constants, filterEverythingParams, State, Viewport } from "./types";
import { circleOutOfBounds, getColumn, getNewMutliplier, getRandomDuration, not, RNG, tailOutOfBounds } from "./util";

export { Tick, CreateCircle, reduceState, initialState, HitCircle, KeyUpHold };

class Tick implements Action {
  constructor(public readonly elapsed: number) { }

  apply(s: State): State {
      const {
          expiredCircles, expiredBgCircles, updatedCircleProps, updatedBgCircleProps,
          updatedTailProps, expiredTails, missed, updatedHoldCircles
      } = Tick.filterEverything({
        circleProps: [...s.circleProps],
        tailProps: [...s.tailProps],
        holdCircles: [...s.holdCircles],
        bgCircleProps: [...s.bgCircleProps]
      })
        
      return {
          ...s,
          circleProps: updatedCircleProps.map(Tick.moveCircle),
          bgCircleProps: updatedBgCircleProps.map(Tick.moveCircle),
          tailProps: updatedTailProps.map(Tick.moveTail),
          holdCircles: updatedHoldCircles.map(Tick.moveCircle),
          combo: missed ? 0 : s.combo,
          multiplier: missed ? 1 : s.multiplier,
          highestCombo: Math.max(s.combo, s.highestCombo),
          exit: expiredCircles.concat(expiredBgCircles),
          exitTails: expiredTails,
          time: this.elapsed * Constants.TICK_RATE_MS,
          nMiss: missed ? s.nMiss + 1 : s.nMiss,
          gameEnd: this.elapsed * Constants.TICK_RATE_MS > s.lastNoteEndTime,
      };
  }

  static filterEverything = ({
    circleProps,
    tailProps,
    holdCircles,
    bgCircleProps
  }: filterEverythingParams) => {
    const expiredCircles = circleProps.filter(circle => circleOutOfBounds(circle) || circle.circleClicked),
          expiredBgCircles = bgCircleProps.filter(circleOutOfBounds),
          updatedCircleProps = circleProps.filter(not(circleOutOfBounds)),
          updatedBgCircleProps = bgCircleProps.filter(not(circleOutOfBounds)),
          updatedTailProps = tailProps.filter(not(tailOutOfBounds)),
          expiredTails = tailProps.filter(tailOutOfBounds),
          missed = expiredCircles.find(circle => !circle.circleClicked && circle.note.userPlayed);

    const updatedHoldCircles = holdCircles.filter(circle =>
      ( circle.isHoldNote &&
        circle.circleClicked &&
        Number(circle.cy) <= Constants.HITCIRCLE_CENTER + // add length of tail to allow for triggerRelease
                              ( (1000 / Constants.TICK_RATE_MS) *
                              Constants.PIXELS_PER_TICK * circle.note.duration ) )
    )
            
    return {
      expiredCircles, expiredBgCircles, updatedCircleProps, updatedBgCircleProps,
      updatedTailProps, expiredTails, missed, updatedHoldCircles
    };
  }

  static moveCircle = (circle: Circle): Circle => {
    return {
      ...circle,
      cy: `${Number(circle.cy) + Constants.PIXELS_PER_TICK}`,
    }
  }

  static moveTail = (tail: CircleLine): CircleLine => {
    return {
      ...tail,
      y1: `${parseInt(tail.y1) + Constants.PIXELS_PER_TICK}`,
      y2: `${Math.min(parseInt(tail.y2) + Constants.PIXELS_PER_TICK, Constants.HITCIRCLE_CENTER)}`,
    };
  }
}

class KeyUpHold implements Action {
  constructor(public readonly key: "KeyA" | "KeyS" | "KeyK" | "KeyL") { }

  apply(s: State): State {
    const col = Constants.COLUMN_KEYS.indexOf(this.key);
    const colPercentage = Constants.COLUMN_PERCENTAGES[col];

    // this should always return an array of 1 or 0 elements since there can only be 1 clickable hold circle
    // in 1 column at one singular time
    const clickedHoldCirclesInColumn =
      s.holdCircles.filter(circle => 
        circle.cx === colPercentage &&
        circle.note.userPlayed &&
        circle.circleClicked
      );

    // if theres no hold circles in the column where the user keyups, just return
    if (clickedHoldCirclesInColumn.length === 0) {
      return s;
    }

    // since there will only be 1 circle, we can just grab the first element
    const clickedHoldCircle = clickedHoldCirclesInColumn[0],
          filteredHoldCircles = s.holdCircles.filter(circle => circle.id !== clickedHoldCircle.id),
          newCircle = { ...clickedHoldCircle, circleClicked: false };

    const isMissed = Number(newCircle.cy) <=  Constants.HITCIRCLE_CENTER + // add length of tail
                                              ( (1000 / Constants.TICK_RATE_MS) *
                                              Constants.PIXELS_PER_TICK * newCircle.note.duration ) - 100;

    return {
      ...s,
      holdCircles: filteredHoldCircles.concat(newCircle),
      combo: isMissed ? 0 : s.combo,
      multiplier: isMissed ? 1 : getNewMutliplier(s),
      nMiss: isMissed ? s.nMiss + 1 : s.nMiss,
    };
  }
}
class HitCircle implements Action {
  constructor(public readonly key: "KeyA" | "KeyS" | "KeyK" | "KeyL") { }

  /**
   * @param s old State
   * @returns new State
   */
  apply(s: State): State {
    const colIndex = Constants.COLUMN_KEYS.indexOf(this.key);
    
    // get the hittable circles in column to register hit
    const playableCirclesInColumn = s.circleProps
      .filter(circle => {
        const cy = Number(circle.cy);
        return  circle.note.userPlayed &&
                circle.cx == `${(colIndex + 1) * 20}%` &&
                cy >= Constants.HITCIRCLE_CENTER - Constants.HITCIRCLE_RANGE &&
                cy <= Constants.HITCIRCLE_CENTER + Constants.HITCIRCLE_RANGE + Constants.USERPLAYED_CIRCLE_VISIBLE_EXTRA;
      });

    // if user misclicks, add a circle that plays a random instrument for random duration in exit
    if (playableCirclesInColumn.length === 0) {
      const newCircle = HitCircle.createRandomNoteCircle(s);
      return {
        ...s,
        exit: s.exit.concat(newCircle),
      };
    }

    // find lowest circle in column to register hit
    const lowestCircle = playableCirclesInColumn
      .reduce((acc, cur) => (Number(cur.cy) > Number(acc.cy) ? cur : acc), playableCirclesInColumn[0]);

    const circleCy = Number(lowestCircle.cy),
          circleMarginFromCenter = Math.abs(Constants.HITCIRCLE_CENTER - circleCy),
          hitPerfect =
            circleMarginFromCenter <= Constants.HIT_PERFECT_RANGE_END,
          hitGreat =
            circleMarginFromCenter > Constants.HIT_PERFECT_RANGE_END &&
            circleMarginFromCenter <= Constants.HIT_GREAT_RANGE_END,
          hitGood =
            circleMarginFromCenter > Constants.HIT_GREAT_RANGE_END &&
            circleMarginFromCenter <= Constants.HIT_GOOD_RANGE_END,
          updatedCircleProps = s.circleProps.filter(circle => circle.id !== lowestCircle.id),
          filteredHoldCircles = s.holdCircles.filter(circle => circle.id !== lowestCircle.id),
          randomDuration = getRandomDuration(RNG.scale(RNG.hash(s.circleCount))),
          newCircle = { 
            ...lowestCircle,
            circleClicked: true,
            note: {
              ...lowestCircle.note,
              // if misaligned give it random duration
              duration: hitGood ? randomDuration : lowestCircle.note.duration
            }
          };

    return {
      ...s,
      circleProps: updatedCircleProps,
      exit: s.exit.concat(newCircle),
      holdCircles: filteredHoldCircles.concat(newCircle),
      combo: s.combo + 1,
      score: parseFloat((s.score + (1 * s.multiplier)).toFixed(2)),
      multiplier: getNewMutliplier(s),
      nPerfect: hitPerfect ? s.nPerfect + 1 : s.nPerfect,
      nGreat: hitGreat ? s.nGreat + 1 : s.nGreat,
      nGood: hitGood ? s.nGood + 1 : s.nGood,
    };
  }
 
  static createRandomNoteCircle = (s: State): Circle => {
    const randomNumber = RNG.scale(RNG.hash(s.circleCount)),
          randomInstrumentIndex = Math.floor(randomNumber * Constants.INSTRUMENTS.length),
          randomDuration = getRandomDuration(randomNumber) ,
          newCircle = {
            id: `circle-${s.circleCount}`,
            r: `${0.07 * Viewport.CANVAS_WIDTH}`,
            cx: `0%`,
            cy: Constants.HITCIRCLE_CENTER.toString(),
            style: `fill: green`,
            class: "circle",
            note: {
              userPlayed: false,
              instrument: Constants.INSTRUMENTS[randomInstrumentIndex],
              velocity: Math.random(),
              pitch: Math.floor(Math.random() * 127),
              start: s.time,
              end: s.time + randomDuration,
              duration: randomDuration,
            },
            circleClicked: true,
            isHoldNote: false,
          } as Circle;


    return newCircle;
  }
}

class CreateCircle implements Action {
  constructor(public readonly circle: Circle) { }

  /**
   * @param s old State
   * @returns new State
   */
  apply(s: State): State {
    const [column, updatedPrevTimeInColumn] = getColumn(this.circle, s);

    const newCircle = {
      ...this.circle,
      id: `circle-${s.circleCount}`,
      cx: Constants.COLUMN_PERCENTAGES[column],
      style: `fill: ${Constants.COLUMN_COLORS[column]}`
    }

    const tail = CreateCircle.createTail(newCircle);
    const isUserPlayed = newCircle.note.userPlayed;

    return {
      ...s,
      circleProps: isUserPlayed ? s.circleProps.concat(newCircle) : s.circleProps,
      bgCircleProps: !isUserPlayed ? s.bgCircleProps.concat(newCircle) : s.bgCircleProps,
      tailProps: tail ? s.tailProps.concat(tail) : s.tailProps,
      holdCircles: newCircle.isHoldNote && newCircle.note.userPlayed ? s.holdCircles.concat(newCircle) : s.holdCircles,
      circleCount: s.circleCount + 1,
      prevTimeInColumn: updatedPrevTimeInColumn,
    };
  }

  static createTail = (circle: Circle): CircleLine | undefined => {
    // if circle isnt user_played circle or isnt a hold note, dont create tail object
    if (!circle.note.userPlayed || !circle.isHoldNote) {
      return undefined;
    }

    const tailProps = {
      id: `tail-${circle.id}`,
      x1: circle.cx,
      x2: circle.cx,
      y1: `-${circle.tailHeight}`,
      y2: circle.cy,
      stroke: Constants.COLUMN_COLORS[Constants.COLUMN_PERCENTAGES.indexOf(circle.cx as "20%" | "40%" | "60%" | "80%")],
      strokeWidth: "15",
      opacity: "1",
    }

    return tailProps;
  }
}

const initialState: State = { 
  time: 0,
  circleProps: [],
  bgCircleProps: [],
  tailProps: [],
  holdCircles: [],
  exit: [],
  exitTails: [],
  gameEnd: false,
  score: 0,
  combo: 0,
  highestCombo: 0,
  nPerfect: 0,
  nGreat: 0,
  nGood: 0,
  nMiss: 0,
  circleCount: 0,
  prevTimeInColumn: [0, 0, 0, 0],
  multiplier: 1,
  lastNoteEndTime: 0,
};

/**
 * state transducer
 * @param s input State
 * @param action type of action to apply to the State
 * @returns a new State 
 */
const reduceState = (s: State, action: Action) => action.apply(s);