/**
 * Inside this file you will use the classes and functions from rx.js
 * to add visuals to the svg element in index.html, animate them, and make them interactive.
 *
 * Study and complete the tasks in observable exercises first to get ideas.
 *
 * Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
 *
 * You will be marked on your functional programming style
 * as well as the functionality that you implement.
 *
 * Document your code!
 */

import "./style.css";

import { from, fromEvent, interval, merge, of } from "rxjs";
import { map, filter, scan, mergeMap, delay } from "rxjs/operators";
import * as Tone from "tone";
import { SampleLibrary } from "./tonejs-instruments";

/** Constants */

const Viewport = {
    CANVAS_WIDTH: 200,
    CANVAS_HEIGHT: 400,
} as const;

const Constants = {
    TICK_RATE_MS: 500,
    SONG_NAME: "RockinRobin",
    START_Y: "0",
} as const;

const Note = {
    RADIUS: 0.07 * Viewport.CANVAS_WIDTH,
    TAIL_WIDTH: 10,
};

/** User input */

type Key = "KeyH" | "KeyJ" | "KeyK" | "KeyL";

type Event = "keydown" | "keyup" | "keypress";

/** Utility functions */

/** State processing */

type State = Readonly<{
    gameEnd: boolean;
}>;

const initialState: State = {
    gameEnd: false,
} as const;

/**
 * Updates the state by proceeding with one time step.
 *
 * @param s Current state
 * @returns Updated state
 */
const tick = (s: State) => s;

/** Rendering (side effects) */

/**
 * Displays a SVG element on the canvas. Brings to foreground.
 * @param elem SVG element to display
 */
const show = (elem: SVGGraphicsElement) => {
    elem.setAttribute("visibility", "visible");
    elem.parentNode!.appendChild(elem);
};

/**
 * Hides a SVG element on the canvas.
 * @param elem SVG element to hide
 */
const hide = (elem: SVGGraphicsElement) =>
    elem.setAttribute("visibility", "hidden");

/**
 * Creates an SVG element with the given properties.
 *
 * See https://developer.mozilla.org/en-US/docs/Web/SVG/Element for valid
 * element names and properties.
 *
 * @param namespace Namespace of the SVG element
 * @param name SVGElement name
 * @param props Properties to set on the SVG element
 * @returns SVG element
 */
const createSvgElement = (
    namespace: string | null,
    name: string,
    props: Record<string, string> = {},
) => {
    const elem = document.createElementNS(namespace, name) as SVGElement;
    Object.entries(props).forEach(([k, v]) => elem.setAttribute(k, v));
    return elem;
};

/**
 * This is the function called on page load. Your main game loop
 * should be called here.
 */
export function main(csvContents: string, samples: { [key: string]: Tone.Sampler }) {
    // Canvas elements
    const svg = document.querySelector("#svgCanvas") as SVGGraphicsElement &
        HTMLElement;
    const preview = document.querySelector(
        "#svgPreview",
    ) as SVGGraphicsElement & HTMLElement;
    const gameover = document.querySelector("#gameOver") as SVGGraphicsElement &
        HTMLElement;
    const container = document.querySelector("#main") as HTMLElement;

    svg.setAttribute("height", `${Viewport.CANVAS_HEIGHT}`);
    svg.setAttribute("width", `${Viewport.CANVAS_WIDTH}`);

    // Text fields
    const multiplier = document.querySelector("#multiplierText") as HTMLElement;
    const scoreText = document.querySelector("#scoreText") as HTMLElement;
    const highScoreText = document.querySelector(
        "#highScoreText",
    ) as HTMLElement;

    /** User input */

    const key$ = fromEvent<KeyboardEvent>(document, "keypress");

    const fromKey = (keyCode: Key) =>
        key$.pipe(filter(({ code }) => code === keyCode));

    /** Determines the rate of time steps */
    const tick$ = interval(Constants.TICK_RATE_MS);

    /**
     * Renders the current state to the canvas.
     *
     * In MVC terms, this updates the View using the Model.
     *
     * @param s Current state
     */
    const render = (s: State) => {
        // Add blocks to the main grid canvas
        const greenCircle = createSvgElement(svg.namespaceURI, "circle", {
            r: `${Note.RADIUS}`,
            cx: "20%",
            cy: "200",
            style: "fill: green",
            class: "shadow",
        });

        const redCircle = createSvgElement(svg.namespaceURI, "circle", {
            r: `${Note.RADIUS}`,
            cx: "40%",
            cy: "50",
            style: "fill: red",
            class: "shadow",
        });

        const blueCircle = createSvgElement(svg.namespaceURI, "circle", {
            r: `${Note.RADIUS}`,
            cx: "60%",
            cy: "50",
            style: "fill: blue",
            class: "shadow",
        });

        const yellowCircle = createSvgElement(svg.namespaceURI, "circle", {
            r: `${Note.RADIUS}`,
            cx: "80%",
            cy: "-15",
            style: "fill: yellow",
            class: "shadow",
        });

        from(notes).pipe(
          mergeMap(note => 
            of(note).pipe(
              delay(Number(note.start) * 1000),
              map(_ => {
                if (note.user_played) {
                  const column = getColumn(note.pitch, minPitch, maxPitch);
                  createCircle(column);
                }
              })
            )
          ),
        ).subscribe()

        svg.appendChild(greenCircle);
        svg.appendChild(redCircle);
        svg.appendChild(blueCircle);
        svg.appendChild(yellowCircle);
    };

    const getColumn = (pitch: number, minPitch: number, maxPitch: number): number => {
      const range = maxPitch - minPitch + 1;
      const cur = pitch - minPitch;
      const ratio = cur / range;
      return Math.floor(ratio * 4);
    }

    const columnColors = ["green", "red", "blue", "yellow"]
    const createCircle = (column: number) => {
      console.log("Created Circle on column:", column)
      svg.appendChild(createSvgElement(svg.namespaceURI, "circle", {
        r: `${Note.RADIUS}`,
        cx: `${((column + 1) * 20)}%`,
        cy: Constants.START_Y,
        style: `fill: ${columnColors[column]}`,
        class: "shadow",
      }))
    }

    // process csv
    const values: string[] = csvContents.split("\n").slice(1).filter(Boolean);

    // get min and max pitch
    const pitches: number[] = values.map((line) => Number(line.split(",")[3]));
    const minPitch = Math.min(...pitches);
    const maxPitch = Math.max(...pitches);
    console.log(minPitch, maxPitch);

    // turn everything to objects so its easier
    const notes = values.map((line) => {
      const splitLine = line.split(",");
      return {
        user_played: Boolean(splitLine[0]),
        instrument: splitLine[1],
        velocity: splitLine[2],
        pitch: Number(splitLine[3]),
        start: splitLine[4],
        end: splitLine[5],
      }
    })

    console.log(notes)
    

    const source$ = tick$
        .pipe(scan((s: State) => ({ gameEnd: false }), initialState))
        .subscribe((s: State) => {
            render(s);

            if (s.gameEnd) {
                show(gameover);
            } else {
                hide(gameover);
            }
        });
}

// The following simply runs your main function on window load.  Make sure to leave it in place.
// You should not need to change this, beware if you are.
if (typeof window !== "undefined") {
    // Load in the instruments and then start your game!
    const samples = SampleLibrary.load({
        instruments: [
            "bass-electric",
            "violin",
            "piano",
            "trumpet",
            "saxophone",
            "trombone",
            "flute",
        ], // SampleLibrary.list,
        baseUrl: "samples/",
    });

    const startGame = (contents: string) => {
        document.body.addEventListener(
            "mousedown",
            function () {
                main(contents, samples);
            },
            { once: true },
        );
    };

    const { protocol, hostname, port } = new URL(import.meta.url);
    const baseUrl = `${protocol}//${hostname}${port ? `:${port}` : ""}`;

    Tone.ToneAudioBuffer.loaded().then(() => {
        for (const instrument in samples) {
            samples[instrument].toDestination();
            samples[instrument].release = 0.5;
            fetch(`${baseUrl}/assets/${Constants.SONG_NAME}.csv`)
                .then((response) => response.text())
                .then((text) => startGame(text))
                .catch((error) =>
                    console.error("Error fetching the CSV file:", error),
                );
        }
    });
}
