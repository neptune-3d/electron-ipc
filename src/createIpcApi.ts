import type {
  CreateIpcApiProps,
  IpcFromMainProps,
  IpcFromRendererProps,
  IpcGenericToMainApi,
  IpcGenericToRendererApi,
  IpcPreloadProps,
  IpcToMainApi,
  IpcToRendererApi,
  IpcToRendererProps,
} from "./types";

/**
 * Creates a strongly‑typed IPC API wrapper for Electron apps.
 *
 * This helper generates a consistent contract between:
 *   - **Renderer → Main** (`toMain`): fire‑and‑forget or two‑way (invoke/handle) calls.
 *   - **Main → Renderer** (`toRenderer`): one‑way messages sent to a BrowserWindow.
 *
 * It returns three namespaces:
 *   - `preload`: Exposes the API into the renderer’s global scope via `contextBridge`.
 *   - `main`: Provides helpers for wiring up handlers in the main process and sending
 *             messages to renderer windows.
 *   - `renderer`: Provides helpers for calling main process APIs and registering
 *                 callbacks for messages from the main process.
 *
 * Usage:
 *   1. Call `preload()` once in your `preload.ts/js` to expose the API.
 *   2. In the main process, use `main.fromRenderer()` to register handlers and
 *      `main.toRenderer()` to send events to a window.
 *   3. In the renderer, use `renderer.toMain()` to call main APIs and
 *      `renderer.fromMain()` to subscribe to events.
 *
 * @template ToMain    Shape of the renderer→main API (methods and their types).
 * @template ToRenderer Shape of the main→renderer API (events and their payloads).
 * @param props Configuration object containing the IPC key and API definitions.
 * @returns An object with `preload`, `main`, and `renderer` namespaces for wiring IPC.
 */
export function createIpcApi<
  ToMain extends IpcGenericToMainApi,
  ToRenderer extends IpcGenericToRendererApi
>(props: CreateIpcApiProps<ToMain, ToRenderer>) {
  const {
    ipcKey,
    toMain = {} as ToMain,
    toRenderer: toRender = {} as ToRenderer,
  } = props;

  return {
    /**
     * Sets up the IPC bridge in the preload script, exposing a typed API to the renderer process.
     *
     * This function should be called once in your `preload.ts/js` file. It wires up:
     * - Renderer → Main calls (`toMain`): exposes `m_<key>` methods for one-way (`send`) or two-way (`invoke`) IPC.
     * - Main → Renderer listeners (`toRenderer`): exposes `r_<key>` methods to register callbacks for incoming messages.
     *
     * The exposed API is injected into the global `window` object under the given `ipcKey`,
     * allowing the renderer to access it via `window[ipcKey]`.
     *
     * @param ipcRenderer - Electron's ipcRenderer instance.
     * @param contextBridge - Electron's contextBridge for secure API exposure.
     */
    preload({ ipcRenderer, contextBridge }: IpcPreloadProps) {
      const expose: Record<string, any> = {};

      for (const key of Object.keys(toMain)) {
        if (toMain[key].type === "twoWay") {
          expose[`m_${key}`] = (arg: any) => {
            return ipcRenderer.invoke(key, arg);
          };
        }
        //
        else {
          expose[`m_${key}`] = (arg: any) => {
            return ipcRenderer.send(key, arg);
          };
        }
      }

      for (const key of Object.keys(toRender)) {
        expose[`r_${key}`] = (cb: any) => {
          ipcRenderer.on(key, (_: any, arg: any) => cb(arg));
        };
      }

      contextBridge.exposeInMainWorld(ipcKey, expose);
    },
    /**
     * Methods to be called from the main process for IPC setup and communication.
     */
    main: {
      /**
       * Creates a typed API for sending messages from the main process to a renderer window.
       *
       * Each key in the `toRenderer` definition becomes a method that sends a one-way message
       * to the renderer via `window.webContents.send(key, arg)`.
       *
       * The returned object allows the main process to push data or events to the renderer
       * without expecting a response.
       *
       * @param window - The target BrowserWindow instance to send messages to.
       * @returns A typed API object for dispatching messages to the renderer.
       */
      toRenderer({ window }: IpcToRendererProps) {
        const api: Record<string, any> = {};

        for (const key of Object.keys(toRender)) {
          api[key] = (arg: any) => {
            return window.webContents.send(key, arg);
          };
        }

        return api as IpcToRendererApi<ToRenderer>;
      },
      /**
       * Registers IPC handlers in the main process for messages coming from the renderer.
       *
       * For each key in the `toMain` definition:
       * - If the type is `"twoWay"`, it sets up an `ipcMain.handle()` for `invoke`-style calls.
       * - Otherwise, it sets up an `ipcMain.on()` listener for fire-and-forget messages.
       *
       * This enables the main process to respond to renderer-initiated actions with
       * appropriate logic, either synchronously or asynchronously.
       *
       * @param ipcMain - Electron's ipcMain instance used to register handlers.
       * @param handlers - A map of handler functions keyed by message name.
       */
      fromRenderer({ handlers, ipcMain }: IpcFromRendererProps<ToMain>) {
        for (const key of Object.keys(toMain)) {
          if (toMain[key].type === "twoWay") {
            ipcMain.handle(key, (e: any, arg: any) => {
              handlers[key](arg, e);
            });
          }
          //
          else {
            ipcMain.on(key, (e: any, arg: any) => {
              handlers[key](arg, e);
            });
          }
        }
      },
    },
    /**
     * Methods to be called from the renderer process for IPC setup and communication.
     */
    renderer: {
      /**
       * Returns a typed API for sending messages from the renderer to the main process.
       *
       * Each key in the `toMain` definition becomes a method that calls the corresponding
       * exposed function in the preload bridge (`m_<key>`), using either `send` or `invoke`
       * depending on the IPC type.
       *
       * @returns A typed API object for communicating with the main process.
       */
      toMain() {
        const api: Record<string, any> = {};

        for (const key of Object.keys(toMain)) {
          api[key] = (arg: any) => {
            return (window as any)[ipcKey][`m_${key}`](arg);
          };
        }

        return api as IpcToMainApi<ToMain>;
      },
      /**
       * Registers handlers in the renderer for messages sent from the main process.
       *
       * Each key in the `toRenderer` definition becomes a listener via the preload bridge (`r_<key>`),
       * allowing the renderer to respond to events pushed from the main process.
       *
       * @param handlers - A map of callback functions keyed by message name.
       */
      fromMain({ handlers }: IpcFromMainProps<ToRenderer>) {
        for (const key of Object.keys(toRender)) {
          (window as any)[ipcKey][`r_${key}`](handlers[key]);
        }
      },
    },
  };
}
