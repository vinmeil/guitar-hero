import { SampleLibrary } from "./tonejs-instruments";
import { Action, Circle, CircleLine, Constants, filterEverythingParams, moveEverythingParams, State, Viewport } from "./types";
import { attr, getRandomDuration, not, playNote, RNG } from "./util";
import * as Tone from "tone";

export { Tick, CreateCircle, reduceState, initialState, HitCircle, KeyUpHold };

class Tick implements Action {
  constructor(public readonly elapsed: number) { }
  /** 
   * @param s old State
   * @returns new State
   */
  apply(s: State): State {
      const {
        expiredCircles,
        expiredBgCircles,
        updatedCircleProps,
        updatedBgCircleProps,
        updatedTailProps,
        expiredTails,
        missed,
        updatedHoldCircles
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
          // time: this.elapsed * Constants.TICK_RATE_MS,
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
    const outOfBounds = (circle: Circle): boolean => (
      // userPlayed and !userPlayed have different timings to allow for user played circles
      ( Number(circle.cy) > Constants.HITCIRCLE_CENTER && !circle.note.userPlayed ) ||
      ( Number(circle.cy) > Constants.HITCIRCLE_CENTER + Constants.USERPLAYED_CIRCLE_VISIBLE_EXTRA && circle.note.userPlayed )
    );
      
    const expiredCircles = circleProps.filter(circle => outOfBounds(circle) || circle.circleClicked),
          expiredBgCircles = bgCircleProps.filter(outOfBounds),
          updatedCircleProps = circleProps.filter(not(outOfBounds)),
          updatedBgCircleProps = bgCircleProps.filter(not(outOfBounds)),
          updatedTailProps = tailProps.filter(tail => parseInt(tail.y1) < Constants.HITCIRCLE_CENTER),
          expiredTails = tailProps.filter(tail => parseInt(tail.y1) >= Constants.HITCIRCLE_CENTER),
          missed = expiredCircles.find(circle => !circle.circleClicked && circle.note.userPlayed);

    const updatedHoldCircles = holdCircles.filter(circle =>
      ( Number(circle.cy) <= Constants.HITCIRCLE_CENTER + // add length of tail
                              ( (1000 / Constants.TICK_RATE_MS) *
                              Constants.PIXELS_PER_TICK * circle.note.duration ) &&
        circle.isHoldNote &&
        circle.circleClicked ) 
    )
            
    return { expiredCircles, expiredBgCircles, updatedCircleProps, updatedBgCircleProps, updatedTailProps, expiredTails, missed, updatedHoldCircles };
  }

  static moveCircle = (circle: Circle): Circle => {
    const newCy = Number(circle.cy) + Constants.PIXELS_PER_TICK;
    return {
      ...circle,
      cy: `${newCy}`,
    }
  }

  static moveTail = (tail: CircleLine): CircleLine => {
    const newY1 = parseInt(tail.y1) + Constants.PIXELS_PER_TICK;
    const newY2 = Math.min(parseInt(tail.y2) + Constants.PIXELS_PER_TICK, Constants.HITCIRCLE_CENTER);
    return {
      ...tail,
      y1: `${newY1}`,
      y2: `${newY2}`,
    };
  }
}

class KeyUpHold implements Action {
  constructor(public readonly key: "KeyA" | "KeyS" | "KeyK" | "KeyL") { }

  apply(s: State): State {
    const col = Constants.COLUMN_KEYS.indexOf(this.key);
    const colPercentage = Constants.COLUMN_PERCENTAGES[col];

    // this should always return an array of 1 or 0 elements since there can only be clickable hold circle
    // in 1 column at one singular time
    const clickedHoldCirclesInColumn = s.holdCircles.filter(circle => 
                                                        circle.cx === colPercentage &&
                                                        circle.note.userPlayed &&
                                                        circle.circleClicked
                                                    );
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

    const isIncreaseMultiplier = s.combo % 10 == 0 && s.combo > 0;
    
    return {
      ...s,
      holdCircles: filteredHoldCircles.concat(newCircle),
      combo: isMissed ? 0 : s.combo + 1,
      multiplier: isMissed ? 1 : parseFloat((s.multiplier + (isIncreaseMultiplier ? 0.2 : 0)).toFixed(2)),
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
    const col = Constants.COLUMN_KEYS.indexOf(this.key);
    
    // get the lowest circle in column to register hit
    const playableCirclesInColumn = s.circleProps
      .filter(circle => {
        const cy = Number(circle.cy);
        return  cy >= Constants.HITCIRCLE_CENTER - Constants.HITCIRCLE_RANGE &&
                cy <= Constants.HITCIRCLE_CENTER + Constants.HITCIRCLE_RANGE + Constants.USERPLAYED_CIRCLE_VISIBLE_EXTRA &&
                circle.cx == `${(col + 1) * 20}%` &&
                circle.note.userPlayed;
      });

    // if user misclicks, add a circle that plays a random instrument for random duration in exit
    if (playableCirclesInColumn.length === 0) {
      // + 1 because scale is [-1, 1], and / 2 to get [0, 1], -0.01 so it doesnt result in 1 which would give index OOB error
      const newCircle = HitCircle.createRandomNoteCircle(s);
      return {
        ...s,
        exit: s.exit.concat(newCircle),
      };
    }

    const lowestCircle = playableCirclesInColumn
      .reduce((acc, cur) => (Number(cur.cy) > Number(acc.cy) ? cur : acc), playableCirclesInColumn[0]);

    const circleCy = Number(lowestCircle.cy),
          circleMarginFromCenter = Math.abs(Constants.HITCIRCLE_CENTER - circleCy),
          hitPerfect = circleMarginFromCenter <= 25,
          hitGreat = circleMarginFromCenter > 25 && circleMarginFromCenter <= 55,
          hitGood = circleMarginFromCenter > 55 && circleMarginFromCenter <= 90,
          updatedCircleProps = s.circleProps.filter(circle => circle.id !== lowestCircle.id),
          filteredHoldCircles = s.holdCircles.filter(circle => circle.id !== lowestCircle.id),
          randomDuration = getRandomDuration(RNG.scale(RNG.hash(s.circleCount))),
          newCircle = { 
            ...lowestCircle,
            circleClicked: true,
            note: {
              ...lowestCircle.note,
              duration: hitGood ? randomDuration : lowestCircle.note.duration
            }
          };

    const isIncreaseMultiplier = s.combo % 10 == 0 && s.combo > 0;

    return {
      ...s,
      circleProps: updatedCircleProps,
      exit: s.exit.concat(newCircle),
      holdCircles: filteredHoldCircles.concat(newCircle),
      combo: s.combo + 1,
      score: parseFloat((s.score + (1 * s.multiplier)).toFixed(2)),
      multiplier: newCircle.isHoldNote ? s.multiplier : parseFloat((s.multiplier + (isIncreaseMultiplier ? 0.2 : 0)).toFixed(2)),
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
    const [column, updatedPrevColumnTimes] = CreateCircle.getColumn(this.circle.note.start, this.circle.note.userPlayed, s);

    const newCircle = {
      ...this.circle,
      id: `circle-${s.circleCount}`,
      cx: `${(column + 1) * 20}%`,
      style: `fill: ${Constants.COLUMN_COLORS[column]}`
    }

    const tail = CreateCircle.createSVG(newCircle);
    const isUserPlayed = newCircle.note.userPlayed;

    return {
      ...s,
      circleProps: isUserPlayed ? s.circleProps.concat(newCircle) : s.circleProps,
      bgCircleProps: !isUserPlayed ? s.bgCircleProps.concat(newCircle) : s.bgCircleProps,
      tailProps: tail ? s.tailProps.concat(tail) : s.tailProps,
      holdCircles: newCircle.isHoldNote && newCircle.note.userPlayed ? s.holdCircles.concat(newCircle) : s.holdCircles,
      circleCount: s.circleCount + 1,
      prevColumnTimes: updatedPrevColumnTimes,
    };
  }

  static getColumn(startTime: number, userPlayed: boolean, s: State): [number, readonly number[]] {
    const randomNumber = RNG.scale(RNG.hash(startTime * 1000)),
          columns = [0, 1, 2, 3],
          modifier = [-1, 1],
          currentTime = startTime,
          randomIndex = Math.floor(randomNumber * modifier.length),
          initialColumn = Math.floor(randomNumber * columns.length);
    
    function findColumn(column: number, counter: number): number {
      if (counter <= 0 || Math.abs(s.prevColumnTimes[column] - currentTime) > 0.150) {
        return column;
      }
      const newColumn = (column + modifier[randomIndex] + 4) % 4;
      return findColumn(newColumn, counter - 1);
    }

    const newColumn = findColumn(initialColumn, 3);

    const updatedPrevColumnTimes = userPlayed
    ? s.prevColumnTimes.map((time, index) => index === newColumn ? currentTime : time)
    : s.prevColumnTimes;

    return [newColumn, updatedPrevColumnTimes];
  }

  static createSVG = (circle: Circle): CircleLine | undefined => {
    // if circle isnt user_played circle, dont create svg
    if (!circle.note.userPlayed) {
      return undefined;
    }

    // if circle already exists, dont create svg
    if (document.getElementById(circle.id)) {
      return undefined;
    }

    const svg = document.querySelector("#svgCanvas") as SVGGraphicsElement & HTMLElement;
    const newCircle = document.createElementNS(svg.namespaceURI, "circle") as SVGElement;
    attr(newCircle, { ...circle });
    svg.appendChild(newCircle);

    // if its not a hold note, dont create tail -> return now
    if (!circle.isHoldNote) {
      return undefined;
    }

    // check just in case, if its a hold note then create a tail svg
    if (circle.isHoldNote && circle.tailHeight) {
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
      const tail = document.createElementNS(svg.namespaceURI, "line") as SVGElement;
      attr(tail, { ...tailProps, "stroke-width": tailProps.strokeWidth });
      svg.appendChild(tail);
      return tailProps;
    }
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
  totalCircleCount: 0,
  prevColumnTimes: [0, 0, 0, 0],
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