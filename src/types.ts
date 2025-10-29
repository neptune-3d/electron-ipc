import type {
  BrowserWindow,
  ContextBridge,
  IpcMain,
  IpcMainInvokeEvent,
  IpcRenderer,
} from "electron";

export type CreateIpcApiProps<
  ToMain extends IpcGenericToMainApi,
  ToRenderer extends IpcGenericToRendererApi
> = {
  ipcKey: string;
  toMain?: ToMain;
  toRenderer?: ToRenderer;
};

export type IpcPreloadProps = {
  ipcRenderer: IpcRenderer;
  contextBridge: ContextBridge;
};

export type IpcToRendererProps = { window: BrowserWindow };

export type IpcFromRendererProps<ToMain extends IpcGenericToMainApi> = {
  handlers: IpcToMainHandlers<ToMain>;
  ipcMain: IpcMain;
};

export type IpcFromMainProps<ToRenderer extends IpcGenericToRendererApi> = {
  handlers: IpcToRendererHandlers<ToRenderer>;
};

export type IpcToMainApi<T extends IpcGenericToMainApi> = {
  [Key in keyof T]: (
    arg: T[Key]["arg"]
  ) => T[Key] extends IpcTwoWayAction<any, infer R>
    ? Promise<Awaited<R>>
    : void;
};

export type IpcToRendererApi<T extends IpcGenericToRendererApi> = {
  [Key in keyof T]: (arg: T[Key]["arg"]) => void;
};

export type IpcToMainHandlers<T extends IpcGenericToMainApi> = {
  [Key in keyof T]: (
    arg: T[Key]["arg"],
    e: IpcMainInvokeEvent
  ) => T[Key] extends IpcTwoWayAction<any, infer R> ? R : void;
};

export type IpcToRendererHandlers<T extends IpcGenericToMainApi> = {
  [Key in keyof T]: (arg: T[Key]["arg"]) => void;
};

export type IpcGenericToMainApi = Record<
  string,
  IpcOneWayAction<any> | IpcTwoWayAction<any, any>
>;

export type IpcGenericToRendererApi = Record<string, IpcOneWayAction<any>>;

export type IpcTwoWayAction<A, R> = {
  type: "twoWay";
  arg: A;
  result: R;
};

export type IpcOneWayAction<P> = {
  type: "oneWay";
  arg: P;
};
