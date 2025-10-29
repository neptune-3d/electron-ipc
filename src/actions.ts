import type { IpcOneWayAction, IpcTwoWayAction } from "./types";

/**
 * Defines a two-way IPC action from renderer to main.
 *
 * Use this to declare renderer→main actions that expect a response,
 * sent via `ipcRenderer.invoke()` and handled in the main process via `ipcMain.handle()`.
 *
 * ⚠️ Two-way IPC is only supported from renderer to main — not the other way around.
 *
 * @template A - Argument type sent from renderer.
 * @template R - Result type returned from main.
 * @returns A typed descriptor for a two-way IPC action.
 */
export function twoWayAction<A, R>(): IpcTwoWayAction<A, R> {
  return {
    type: "twoWay",
    arg: null as A,
    result: null as R,
  };
}

/**
 * Defines a one-way IPC action.
 *
 * Use this to declare:
 * - Renderer → Main actions sent via `ipcRenderer.send()` and handled via `ipcMain.on()`.
 * - Main → Renderer events sent via `webContents.send()` and handled via `ipcRenderer.on()`.
 *
 * ✅ One-way IPC is supported in both directions.
 *
 * @template A - Argument type sent with the message.
 * @returns A typed descriptor for a one-way IPC action.
 */
export function oneWayAction<A>(): IpcOneWayAction<A> {
  return {
    type: "oneWay",
    arg: null as A,
  };
}
