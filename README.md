# @neptune3d/electron-ipc

Helpers for creating typed IPC APIs to easily send messages between main and renderer processes in Electron.

## ✨ Features

- Strongly typed IPC contracts
- One-way and two-way communication from renderer to main
- One-way event dispatch from main to renderer
- Secure preload exposure via `contextBridge`
- Symmetric API structure for clarity and maintainability

## 📦 Installation

```bash
npm install @neptune3d/electron-ipc
```

## 🚀 Basic Usage

### 1. Define your IPC API

```ts
// ipc-api.ts
import { oneWayAction, twoWayAction } from "@neptune3d/electron-ipc";

export const toMain = {
  logMessage: oneWayAction<string>(),
  fetchData: twoWayAction<{ id: number }, { name: string }>(),
};

export const toRenderer = {
  notify: oneWayAction<string>(),
};
```

### 2. Create the IPC API

```ts
// shared-ipc.ts
import { createIpcApi } from "@neptune3d/electron-ipc";
import { toMain, toRenderer } from "./ipc-api";

export const ipc = createIpcApi({
  ipcKey: "myIpc",
  toMain,
  toRenderer,
});
```

### 3. Preload Setup

```ts
// preload.ts
import { contextBridge, ipcRenderer } from "electron";
import { ipc } from "./shared-ipc";

ipc.preload({ contextBridge, ipcRenderer });
```

### 4. Main Process Setup

```ts
// main.ts
import { ipcMain, BrowserWindow } from "electron";
import { ipc } from "./shared-ipc";

ipc.main.fromRenderer({
  ipcMain,
  handlers: {
    logMessage: (msg) => console.log("Renderer says:", msg),
    fetchData: async ({ id }) => ({ name: `Item ${id}` }),
  },
});

const win = new BrowserWindow({ ... });
const rendererApi = ipc.main.toRenderer({ window: win });
rendererApi.notify("Hello from main!");
```

### 5. Renderer Usage

```ts
// renderer.ts
import { ipc } from "./shared-ipc";

const toMain = ipc.renderer.toMain();
toMain.logMessage("Hello main!");
toMain.fetchData({ id: 42 }).then((result) => {
  console.log("Received:", result);
});

ipc.renderer.fromMain({
  handlers: {
    notify: (msg) => {
      console.log("Main says:", msg);
    },
  },
});
```

## 🧠 Notes

- `m_<key>` methods are used for renderer → main communication.
- `r_<key>` methods are used to register renderer-side listeners for main → renderer events.
- Two-way actions use `ipcRenderer.invoke()` and `ipcMain.handle()`.
- One-way actions use `ipcRenderer.send()` and `ipcMain.on()` or `webContents.send()`.
