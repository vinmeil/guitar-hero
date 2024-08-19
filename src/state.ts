import { SampleLibrary } from "./tonejs-instruments";
import { Action, Circle, CircleLine, Constants, State, Viewport } from "./types";
import { attr, generateUniqueId, not, playNote } from "./util";
import * as Tone from "tone";

export { Tick, CreateCircle, reduceState, initialState, HitCircle, KeyUpHold };

class Tick implements Action {
  constructor(public readonly elapsed: number) { }
  /** 
   * @param s old State
   * @returns new State
   */
  apply(s: State): State {
      const movedCircleProps = s.circleProps.map(Tick.moveCircle)
      const movedTailProps = s.tailProps.map(Tick.moveTail)
      const movedHoldCircles = s.holdCircles.map(Tick.moveCircle)

      const outOfBounds = (circle: Circle): boolean => (
        // userPlayed and !userPlayed have different timings to allow for user played circles
        ( Number(circle.cy) > Constants.HITCIRCLE_CENTER && !circle.userPlayed ) ||
        ( Number(circle.cy) > Constants.HITCIRCLE_CENTER + Constants.USERPLAYED_CIRCLE_VISIBLE_EXTRA && circle.userPlayed )
      );
        
      const expiredCircles = movedCircleProps.filter(circle => outOfBounds(circle) || circle.circleClicked);
      const updatedCircleProps = movedCircleProps.filter(not(outOfBounds));
      const updatedTailProps = movedTailProps.filter(tail => parseInt(tail.y1) < Constants.HITCIRCLE_CENTER);
      const expiredTails = movedTailProps.filter(tail => parseInt(tail.y1) >= Constants.HITCIRCLE_CENTER);
      const missed = expiredCircles.find(circle => !circle.circleClicked && circle.userPlayed);

      const updatedHoldCircles = movedHoldCircles.filter(circle =>
        ( Number(circle.cy) <= Constants.HITCIRCLE_CENTER + // add length of tail
                                ( (1000 / Constants.TICK_RATE_MS) *
                                Constants.PIXELS_PER_TICK * circle.duration ) &&
          circle.isHoldNote )
      )
        
      return {
          ...s,
          circleProps: updatedCircleProps,
          tailProps: updatedTailProps,
          holdCircles: updatedHoldCircles,
          combo: missed ? 0 : s.combo,
          highestCombo: Math.max(s.combo, s.highestCombo),
          exit: expiredCircles,
          exitTails: expiredTails,
          time: this.elapsed,
      };
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
  constructor(public readonly key: string, private samples: { [key: string]: Tone.Sampler }) { }

  /**
   * @param s old State
   * @returns new State
   */
  apply(s: State): State {
    return {
      ...s,
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
      .find(circle => {
        const cy = Number(circle.cy);
        return  cy >= Constants.HITCIRCLE_CENTER - Constants.HITCIRCLE_RANGE &&
                cy <= Constants.HITCIRCLE_CENTER + Constants.HITCIRCLE_RANGE + Constants.USERPLAYED_CIRCLE_VISIBLE_EXTRA &&
                circle.cx == `${(col + 1) * 20}%` &&
                circle.userPlayed;
      });

    if (!lowestCircleInColumn) {
      return s;
    }

    const updatedCircleProps = s.circleProps.filter(circle => circle.id !== lowestCircleInColumn.id);
    const filteredHoldCircles = s.holdCircles.filter(circle => circle.id !== lowestCircleInColumn.id);
    const newCircle = { ...lowestCircleInColumn, circleClicked: true };

    return {
      ...s,
      circleProps: updatedCircleProps,
      exit: s.exit.concat(newCircle),
      holdCircles: filteredHoldCircles.concat(newCircle),
      combo: s.combo + 1,
      score: s.score + 1,
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

    return {
      ...s,
      circleProps: s.circleProps.concat(this.circle),
      tailProps: tail ? s.tailProps.concat(tail) : s.tailProps,
      holdCircles: this.circle.isHoldNote && this.circle.userPlayed ? s.holdCircles.concat(this.circle) : s.holdCircles,
    };
  }

  static createCircleSVG = (circle: Circle): CircleLine | undefined => {
    if (!circle.userPlayed) {
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
  tailProps: [],
  holdCircles: [],
  exit: [],
  exitTails: [],
  gameEnd: false,
  score: 0,
  combo: 0,
  highestCombo: 0,
};

/**
 * state transducer
 * @param s input State
 * @param action type of action to apply to the State
 * @returns a new State 
 */
const reduceState = (s: State, action: Action) => action.apply(s);