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

import { from, fromEvent, interval, merge, Observable, of, Subscription, timer } from "rxjs";
import { map, filter, scan, mergeMap, delay, takeUntil, take, switchMap, toArray, tap, mergeWith, last } from "rxjs/operators";
import * as Tone from "tone";
import { SampleLibrary } from "./tonejs-instruments";
import { CreateCircle, initialState, HitCircle, reduceState, Tick, KeyUpHold } from "./state";
import { Action, Circle, Constants, NoteType, State, Viewport } from "./types";
import { updateView } from "./view";
import { playNote, RNG } from "./util";

/** Constants */

const Note = {
    RADIUS: 0.07 * Viewport.CANVAS_WIDTH,
    TAIL_WIDTH: 10,
};

/** User input */

type Key = "KeyA" | "KeyS" | "KeyK" | "KeyL";

type Event = "keydown" | "keyup" | "keypress";

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
    
    // process csv
    const values: string[] = csvContents.split("\n").slice(1).filter(Boolean);
    
    // turn everything to objects so its easier
    const notes: NoteType[] = values.map((line) => {
      const splitLine = line.split(",");
      return {
        userPlayed: splitLine[0].toLowerCase() === "true",
        instrument: splitLine[1],
        velocity: Number(splitLine[2]),
        pitch: Number(splitLine[3]),
        start: Number(splitLine[4]),
        end: Number(splitLine[5]),
        duration: Number(splitLine[5]) - Number(splitLine[4]),
      } as const
    })
    
    const gameClock$ = tick$.pipe(map(elapsed => new Tick(elapsed))),
          colOneKeyDown$ = key$("keydown", "KeyA").pipe(map(_ => new HitCircle("KeyA"))),
          colTwoKeyDown$ = key$("keydown", "KeyS").pipe(map(_ => new HitCircle("KeyS"))),
          colThreeKeyDown$ = key$("keydown", "KeyK").pipe(map(_ => new HitCircle("KeyK"))),
          colFourKeyDown$ = key$("keydown", "KeyL").pipe(map(_ => new HitCircle("KeyL"))),
          colOneKeyUp$ = key$("keyup", "KeyA").pipe(map(_ => new KeyUpHold("KeyA"))),
          colTwoKeyUp$ = key$("keyup", "KeyS").pipe(map(_ => new KeyUpHold("KeyS"))),
          colThreeKeyUp$ = key$("keyup", "KeyK").pipe(map(_ => new KeyUpHold("KeyK"))),
          colFourKeyUp$ = key$("keyup", "KeyL").pipe(map(_ => new KeyUpHold("KeyL")));

    const circleStream$ = from(notes).pipe(
      mergeMap(note => of(note).pipe(delay(note.start * 1000))),
      map(note => {
        return new CreateCircle({
          id: "0",
          r: `${Note.RADIUS}`,
          cx: `0%`, // taken from examples above
          cy: Constants.START_Y,
          style: `fill: green`,
          class: "shadow",
          note: note,
          circleClicked: false,
          isHoldNote: note.end - note.start >= 1 && note.userPlayed ? true : false,
          tailHeight: ( 1000 / Constants.TICK_RATE_MS ) * Constants.PIXELS_PER_TICK * (note.end - note.start) - 50,
          audio: samples[note.instrument],
        })
      }),
    )

    const action$ = merge(
      gameClock$,
      colOneKeyDown$,
      colTwoKeyDown$,
      colThreeKeyDown$,
      colFourKeyDown$,
      colOneKeyUp$,
      colTwoKeyUp$,
      colThreeKeyUp$,
      colFourKeyUp$,
      circleStream$
    );

    const state$ = timer(3000).pipe( // add a 3 second delay to allow the instruments to load
      mergeMap(() => action$),
      scan(reduceState, initialState),
    );

    const subscription: Subscription = state$.subscribe(updateView(() => subscription.unsubscribe()));
    

    }

    // The following simply runs your main function on window load.  Make sure to leave it in place.
    // You should not need to change this, beware if you are.
    if (typeof window !== "undefined") {
      // Load in the instruments and then start your game!
    const samples = SampleLibrary.load({
        instruments: [
            "bass-electric",
            "bassoon",
            "cello",
            "clarinet",
            "contrabass",
            "flute",
            "french-horn",
            "guitar-acoustic",
            "guitar-electric",
            "guitar-nylon",
            "harmonium",
            "harp",
            "organ",
            "piano",
            "saxophone",
            "trombone",
            "trumpet",
            "tuba",
            "violin",
            "xylophone",
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
