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

import { from, fromEvent, interval, merge, Observable, of, Subscription } from "rxjs";
import { map, filter, scan, mergeMap, delay, takeUntil, take } from "rxjs/operators";
import * as Tone from "tone";
import { SampleLibrary } from "./tonejs-instruments";
import { CreateCircle, initialState, reduceState, Tick } from "./state";
import { Action, Constants, State, Viewport } from "./types";
import { updateView } from "./view";
import { generateUniqueId } from "./util";

/** Constants */

const Note = {
    RADIUS: 0.07 * Viewport.CANVAS_WIDTH,
    TAIL_WIDTH: 10,
};

/** User input */

type Key = "KeyD" | "KeyF" | "KeyJ" | "KeyK";

type Event = "keydown" | "keyup" | "keypress";

/** Utility functions */

/** State processing */

// type State = Readonly<{
//     gameEnd: boolean;
// }>;

// const initialState: State = {
//     gameEnd: false,
// } as const;

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

    const key$ = (e: Event, k: Key) =>
      fromEvent<KeyboardEvent>(document, e)
        .pipe(
          filter(({ code }) => code === k),
          filter(({ repeat }) => !repeat))

    // const key$ = fromEvent<KeyboardEvent>(document, "keypress");

    // const fromKey = (keyCode: Key) =>
    //     key$.pipe(filter(({ code }) => code === keyCode));

    /** Determines the rate of time steps */
    const tick$ = interval(Constants.TICK_RATE_MS);
    
    // gets the column that the circle should go to
    const getColumn = (pitch: number, minPitch: number, maxPitch: number): number => {
      const range = maxPitch - minPitch + 1; // finds range of pitch
      const cur = pitch - minPitch;
      const ratio = cur / range;
      return Math.floor(ratio * 4); // return column based on quartile of the current pitch
    }
    
    const columnColors = ["green", "red", "blue", "yellow"]
    
    // process csv
    const values: string[] = csvContents.split("\n").slice(1).filter(Boolean);
    
    // get min and max pitch
    const pitches: number[] = values.map((line) => Number(line.split(",")[3]));
    const minPitch = Math.min(...pitches);
    const maxPitch = Math.max(...pitches);
    
    // turn everything to objects so its easier
    const notes = values.map((line) => {
      const splitLine = line.split(",");
      return {
        user_played: splitLine[0].toLowerCase() === "true",
        instrument: splitLine[1],
        velocity: Number(splitLine[2]),
        pitch: Number(splitLine[3]),
        start: Number(splitLine[4]),
        end: Number(splitLine[5]),
      }
    })
    
    const gameClock$ = tick$.pipe(map(elapsed => new Tick(elapsed)));
    const colOneKeyDown$ = key$("keydown", "KeyD").pipe(map(_ => console.log("green keydown")));
    const colTwoKeyDown$ = key$("keydown", "KeyF").pipe(map(_ => console.log("red keydown")));
    const colThreeKeyDown$ = key$("keydown", "KeyJ").pipe(map(_ => console.log("blue keydown")));
    const colFourKeyDown$ = key$("keydown", "KeyK").pipe(map(_ => console.log("yellow keydown")));
    const colOneKeyUp$ = key$("keyup", "KeyD").pipe(map(_ => console.log("green keyup")));
    const colTwoKeyUp$ = key$("keyup", "KeyF").pipe(map(_ => console.log("red keyup")));
    const colThreeKeyUp$ = key$("keyup", "KeyJ").pipe(map(_ => console.log("blue keyup")));
    const colFourKeyUp$ = key$("keyup", "KeyK").pipe(map(_ => console.log("yellow keyup")));

    const circleStream$ = from(notes).pipe(
      mergeMap(note => of(note).pipe(delay(note.start * 1000))),
      map(note => {
        const column = getColumn(note.pitch, minPitch, maxPitch);
        return new CreateCircle({
          velocity: note.velocity,
          duration: note.end - note.start,
          instrument: note.instrument,
          pitch: note.pitch,
          user_played: note.user_played,
          id: generateUniqueId(),
          r: `${Note.RADIUS}`,
          cx: `${((column + 1) * 20)}%`, // taken from examples above
          cy: Constants.START_Y,
          style: `fill: ${columnColors[column]}`,
          class: "shadow",
        })
      }),
    )


    // TODO: change any to the correct type
    const action$: Observable<any> = merge(
      gameClock$,
      colOneKeyDown$,
      colTwoKeyDown$,
      colThreeKeyDown$,
      colFourKeyDown$,
      colOneKeyUp$,
      colTwoKeyUp$,
      colThreeKeyUp$,
      colFourKeyUp$,
      circleStream$,
    );
    const state$: Observable<State> = action$.pipe( scan(reduceState, initialState) )
    const subscription: Subscription = state$.subscribe(updateView(() => subscription.unsubscribe()));
    
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
        }

        fetch(`${baseUrl}/assets/${Constants.SONG_NAME}.csv`)
            .then((response) => response.text())
            .then((text) => startGame(text))
            .catch((error) =>
                console.error("Error fetching the CSV file:", error),
            );
    });
}
