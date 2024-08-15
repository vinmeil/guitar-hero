import { Circle, State, Viewport } from "./types"
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

    const updateBodyView = (svg: HTMLElement) => (circle: Circle) => {
      function createNewCircle() {
        const newCircle = document.createElementNS(svg.namespaceURI, "circle") as SVGElement;
        attr(newCircle, { ...circle });
        return newCircle;
      }

      const curCircle = document.getElementById(circle.id) || createNewCircle();
      attr(curCircle, { ...circle });
    }

    s.circleProps.forEach(updateBodyView(svg));

    s.exit
      .map((circle) => {
        if (!circle.userPlayed || circle.circleClicked) {
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
