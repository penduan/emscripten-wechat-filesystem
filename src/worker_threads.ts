export class Worker {

  static ENV: "WECHAT_MAIN" | "WECHAT_WORKER" = "WECHAT_MAIN";

  _worker: {
    postMessage: any,
    onMessage: any
  }

  constructor(path: string) {
    if (Worker.ENV === "WECHAT_WORKER") {
      this._worker = {
        // 最好是在顶层声明一个变量用来引用woker变量
        // @ts-ignore
        postMessage: worker.postMessage,
        // @ts-ignore
        onMessage: worker.onMessage
      }
    } else {
      this._worker = wx.createWorker(path);
    }

    this._worker.onMessage((data: any) => {
      if (this.onmessage) {
        this.onmessage(data);
      } else {
        throw new Error("Not found onmessage method.");
      }
    });
  }

  _events: Function[] = [];

  onmessage?: (e: {data: any}) => void;
  onerror?: (reason: any) => void;

  on(name: "message" | "error" | "detachedExit", listener: (e: {data: any}) => void) {
    // pass
  }

  // 与Web Worker格式一致
  postMessage(data: any) {
    this._worker.postMessage({data});
  }

  terminate() {

  }

}