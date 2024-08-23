import { delay, of, take } from "rxjs";
import { Circle, CircleLine, Constants, State, Viewport } from "./types"
import { attr, getAccuracy, playAttack, playNote, playRelease } from "./util";
import * as Tone from "tone";

export { updateView }

/**
 * Update the SVG game view.  
 * 
 * @param onFinish a callback function to be applied when the game ends.  For example, to clean up subscriptions.
 * @param s the current game model State
 * @returns void
 */
const updateView = (onFinish: () => void) => {
  return function(s: State): void {
    const svg = document.querySelector("#svgCanvas") as SVGGraphicsElement &
    HTMLElement;

    const updateCircleView = (svg: HTMLElement) => (props: Circle | CircleLine) => {
      function createNewSVG() {
        const newSVGObject = document.createElementNS(svg.namespaceURI, "circle") as SVGElement;
        attr(newSVGObject, { ...props });
        return newSVGObject;
      }

      const curSVG = document.getElementById(props.id) || createNewSVG();
      attr(curSVG, { ...props });
    }

    // update view of circles and tails
    s.circleProps.forEach(updateCircleView(svg));
    s.tailProps.forEach(updateCircleView(svg));
    const scoreHTML = document.getElementById("scoreText");
    if (scoreHTML) {
      scoreHTML.textContent = `${s.score}`;
    }

    // update combo text
    const combo = document.getElementById("comboText");
    if (combo) {
      const comboDigits = s.combo.toString().length - 1;
      attr(combo, { x: `${96 - (6 * comboDigits)}`})
      combo.textContent = `${s.combo}`;
    }

    // update highest combo text
    const highestCombo = document.getElementById("highestComboText");
    if (highestCombo) {
      highestCombo.textContent = `${s.highestCombo}`;
    }

    // update accuracy text
    const accuracyText = document.getElementById("accuracyText");
    if (accuracyText) {
      const accuracy = getAccuracy(s);
      accuracyText.textContent = `${accuracy.toFixed(2)}%`;
    }

    // update tails
    s.exitTails.forEach(line => {
      const lineSVG = document.getElementById(line.id);
      if (lineSVG) {
        lineSVG.remove();
      }
    })

    // update non hold circles
    s.exit
      .map((circle) => {
        if ( (!circle.isHoldNote && !circle.note.userPlayed ) || ( circle.circleClicked && !circle.isHoldNote ) ) {
          playNote(circle);
        }

        if ( circle.circleClicked && circle.isHoldNote ) {
          playAttack(circle);
        }

        return circle;
      })
      .forEach(circle => {
        const circleSVG = document.getElementById(circle.id);
        if (circleSVG) {
          circleSVG.remove();
        }
      })

    // update hold circles
    s.holdCircles
      .forEach(circle => {
        if (!circle.isHoldNote) { // somehow non hold notes are getting here
          return circle;
        }

        // check if the circle is either not being held down or
        // if the circle has reached the end of its duration (using y coordinate)
        if (!circle.circleClicked ||
            Number(circle.cy) >=  Constants.HITCIRCLE_CENTER + // add length of tail
                                  ( (1000 / Constants.TICK_RATE_MS) *
                                  Constants.PIXELS_PER_TICK * circle.note.duration )
        ) {
          playRelease(circle);
        }
        
      });


    if (s.gameEnd) {
      const gameOver = document.getElementById("gameOver");
      if (gameOver) {
        attr(gameOver, { visibility: "visible" });
      }
      onFinish();
    }
  }
}
