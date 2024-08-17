import { Circle, CircleLine, State, Viewport } from "./types"
import { attr, playNote } from "./util";

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

    const combo = document.getElementById("comboText");
    if (combo) {
      const comboDigits = s.combo.toString().length - 1;
      attr(combo, { x: `${96 - (6 * comboDigits)}`})
      combo.textContent = `${s.combo}`;
    }

    console.log("s.tail size", s.tailProps)

    s.exitTails.forEach(line => {
      const lineSVG = document.getElementById(line.id);
      if (lineSVG) {
        lineSVG.remove();
      }
    })

    s.exit
      .map((circle) => {
        // if (!circle.userPlayed || circle.circleClicked) {
        if (!circle.userPlayed) {
          playNote(circle);
        }
        return circle;
      })
      .forEach(circle => {
        const circleSVG = document.getElementById(circle.id);
        if (circleSVG) {
          circleSVG.remove();
        }
      })
  }
}
