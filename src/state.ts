import { SampleLibrary } from "./tonejs-instruments";
import { Action, Circle, CircleLine, Constants, State, Viewport } from "./types";
import { attr, generateUniqueId, not, playNote } from "./util";
import * as Tone from "tone";

export { Tick, CreateCircle, reduceState, initialState, HitCircle };

class Tick implements Action {
  constructor(public readonly elapsed: number) { }
  /** 
   * @param s old State
   * @returns new State
   */
  apply(s: State): State {
      const { movedCircleProps, movedTailProps, movedHoldCircles, movedBgCircleProps } = Tick.moveEverything({
        circleProps: [...s.circleProps],
        tailProps: [...s.tailProps],
        holdCircles: [...s.holdCircles],
        bgCircleProps: [...s.bgCircleProps]
      })

      const { expiredCircles, expiredBgCircles, updatedCircleProps, updatedBgCircleProps, updatedTailProps, expiredTails, missed, updatedHoldCircles } = Tick.filterEverything({
        movedCircleProps,
        movedTailProps,
        movedHoldCircles,
        movedBgCircleProps
      })
        
      return {
          ...s,
          circleProps: updatedCircleProps,
          bgCircleProps: updatedBgCircleProps,
          tailProps: updatedTailProps,
          holdCircles: updatedHoldCircles,
          combo: missed ? 0 : s.combo,
          highestCombo: Math.max(s.combo, s.highestCombo),
          exit: expiredCircles.concat(expiredBgCircles),
          exitTails: expiredTails,
          time: this.elapsed,
          nmiss: missed ? s.nmiss + 1 : s.nmiss,
      };
  }

  static filterEverything = ({ movedCircleProps, movedTailProps, movedHoldCircles, movedBgCircleProps }: {
    movedCircleProps: Circle[],
    movedTailProps: CircleLine[],
    movedHoldCircles: Circle[],
    movedBgCircleProps: Circle[]
  }) => {
    const outOfBounds = (circle: Circle): boolean => (
      // userPlayed and !userPlayed have different timings to allow for user played circles
      ( Number(circle.cy) > Constants.HITCIRCLE_CENTER && !circle.note.userPlayed ) ||
      ( Number(circle.cy) > Constants.HITCIRCLE_CENTER + Constants.USERPLAYED_CIRCLE_VISIBLE_EXTRA && circle.note.userPlayed )
    );
      
    const expiredCircles = movedCircleProps.filter(circle => outOfBounds(circle) || circle.circleClicked),
          expiredBgCircles = movedBgCircleProps.filter(outOfBounds),
          updatedCircleProps = movedCircleProps.filter(not(outOfBounds)),
          updatedBgCircleProps = movedBgCircleProps.filter(not(outOfBounds)),
          updatedTailProps = movedTailProps.filter(tail => parseInt(tail.y1) < Constants.HITCIRCLE_CENTER),
          expiredTails = movedTailProps.filter(tail => parseInt(tail.y1) >= Constants.HITCIRCLE_CENTER),
          missed = expiredCircles.find(circle => !circle.circleClicked && circle.note.userPlayed);

    const updatedHoldCircles = movedHoldCircles.filter(circle =>
      ( Number(circle.cy) <= Constants.HITCIRCLE_CENTER + // add length of tail
                              ( (1000 / Constants.TICK_RATE_MS) *
                              Constants.PIXELS_PER_TICK * circle.note.duration ) &&
        circle.isHoldNote )
    )
            
    return { expiredCircles, expiredBgCircles, updatedCircleProps, updatedBgCircleProps, updatedTailProps, expiredTails, missed, updatedHoldCircles };
  }

  static moveEverything = ({ circleProps, tailProps, holdCircles, bgCircleProps }: {
    circleProps: Circle[],
    tailProps: CircleLine[],
    holdCircles: Circle[],
    bgCircleProps: Circle[]
  }) => {
    const movedCircleProps = circleProps.map(Tick.moveCircle),
          movedTailProps = tailProps.map(Tick.moveTail),
          movedHoldCircles = holdCircles.map(Tick.moveCircle),
          movedBgCircleProps = bgCircleProps.map(Tick.moveCircle);

    return { movedCircleProps, movedTailProps, movedHoldCircles, movedBgCircleProps }
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

class HitCircle implements Action {
  constructor(public readonly key: string) { }

  /**
   * @param s old State
   * @returns new State
   */
  apply(s: State): State {
    const col = Constants.COLUMN_KEYS.indexOf(this.key as "KeyA" | "KeyS" | "KeyK" | "KeyL");
    
    const lowestCircleInColumn = s.circleProps
      .filter(circle => {
        const cy = Number(circle.cy);
        return  cy >= Constants.HITCIRCLE_CENTER - Constants.HITCIRCLE_RANGE &&
                cy <= Constants.HITCIRCLE_CENTER + Constants.HITCIRCLE_RANGE + Constants.USERPLAYED_CIRCLE_VISIBLE_EXTRA &&
                circle.cx == `${(col + 1) * 20}%` &&
                circle.note.userPlayed;
      });

      
    if (lowestCircleInColumn.length === 0) {
      return s;
    }

    const lowestCircle = lowestCircleInColumn
      .reduce((acc, cur) => (Number(cur.cy) > Number(acc.cy) ? cur : acc), lowestCircleInColumn[0]);

    const circleCy = Number(lowestCircle.cy),
          circleMarginFromCenter = Math.abs(Constants.HITCIRCLE_CENTER - circleCy),
          hit300 = circleMarginFromCenter <= 25,
          hit100 = circleMarginFromCenter > 25 && circleMarginFromCenter <= 55,
          hit50 = circleMarginFromCenter > 55 && circleMarginFromCenter <= 90,
          updatedCircleProps = s.circleProps.filter(circle => circle.id !== lowestCircle.id),
          filteredHoldCircles = s.holdCircles.filter(circle => circle.id !== lowestCircle.id),
          newCircle = { ...lowestCircle, circleClicked: true };

    return {
      ...s,
      circleProps: updatedCircleProps,
      exit: s.exit.concat(newCircle),
      holdCircles: filteredHoldCircles.concat(newCircle),
      combo: s.combo + 1,
      score: s.score + 1,
      n300: hit300 ? s.n300 + 1 : s.n300,
      n100: hit100 ? s.n100 + 1 : s.n100,
      n50: hit50 ? s.n50 + 1 : s.n50,
    };
  }
}

class CreateCircle implements Action {
  constructor(public readonly circle: Circle) { }

  /**
   * @param s old State
   * @returns new State
   */
  apply(s: State): State {
    const tail = CreateCircle.createCircleSVG(this.circle);
    const isUserPlayed = this.circle.note.userPlayed;

    return {
      ...s,
      circleProps: isUserPlayed ? s.circleProps.concat(this.circle) : s.circleProps,
      bgCircleProps: !isUserPlayed ? s.bgCircleProps.concat(this.circle) : s.bgCircleProps,
      tailProps: tail ? s.tailProps.concat(tail) : s.tailProps,
      holdCircles: this.circle.isHoldNote && this.circle.note.userPlayed ? s.holdCircles.concat(this.circle) : s.holdCircles,
    };
  }

  static createCircleSVG = (circle: Circle): CircleLine | undefined => {
    if (!circle.note.userPlayed) {
      return undefined;
    }

    if (document.getElementById(circle.id)) {
      return undefined;
    }

    const svg = document.querySelector("#svgCanvas") as SVGGraphicsElement &
      HTMLElement;
    const newCircle = document.createElementNS(svg.namespaceURI, "circle") as SVGElement;
    attr(newCircle, { ...circle });
    svg.appendChild(newCircle);

    if (!circle.isHoldNote) {
      return undefined;
    }

    if (circle.isHoldNote && circle.tailHeight) {
      const tailProps = {
        id: generateUniqueId(),
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
  n300: 0,
  n100: 0,
  n50: 0,
  nmiss: 0,
};

/**
 * state transducer
 * @param s input State
 * @param action type of action to apply to the State
 * @returns a new State 
 */
const reduceState = (s: State, action: Action) => action.apply(s);