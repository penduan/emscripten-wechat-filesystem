// import fs from "fs";

import { ERRNO_CODES, getEmscriptenErrorCode, getWechatErrorMessage } from "./errnoCodes";
import { DEBUG } from "./config";

// type NodeFSType = typeof fs;
type NodeFSType = any;

// type FSStats = keyof fs.Stats;
type FSStats = 
| "atime" 
| "blksize"
| "blocks"
| "ctime"
| "dev"
| "gid"
| "ino"
| "mode"
| "mtime"
| "nlink"
| "rdev"
| "size"
| "uid"
| "isDirectory"
| "isFile"
| "isSymbolicLink";

type StatsType = Record<FSStats, number | Date | Function>

const StringFlags = {
  0: "r",
  2: "r+",
  65: "w",
  66: "w+",
  193: "wx",
  194: "wx+",
  577: "w",
  578: "w+",
  5185: "as",
  5186: "as+",
  1089: "a",
  1090: "a+",
  1217: "ax",
  1218: "ax+"
}

// @ts-nocheck
export class SymbolicLink {
  readonly SYMLINK_MAP_PATH = wx.env.USER_DATA_PATH + "/.symbols";
  
  _symlinkMap: Record<string, string>;
  _symlinkRegExp: RegExp = /^/;

  constructor(readonly _fs: WechatMiniprogram.FileSystemManager) {
    try {
      let data = this._fs.readFileSync(this.SYMLINK_MAP_PATH, "utf8") as string;
      this._symlinkMap = JSON.parse(data);
    } catch(e) {
      this._symlinkMap = {};
    }
    this.initialRegExp();
  }

  protected initialRegExp() {
    let linkedPaths = Object.keys(this._symlinkMap).map((i) => i.replace(/./g, "\\.")).sort((a, b) => b.length - a.length).join("|");
    this._symlinkRegExp = new RegExp(`^${linkedPaths}`);
  }

  protected updateSymlinkTable() {
    try {
      this._fs.writeFileSync(this.SYMLINK_MAP_PATH, JSON.stringify(this._symlinkMap), "utf8");
      this.initialRegExp();
    } catch(e) {
      console.error("Symlink table not support.");
    }
  }

  protected addSymlink(targetPath: string, newPath: string) {
    this._symlinkMap[newPath] = targetPath;
    try {
      this._fs.writeFileSync(newPath, "", "utf8");
      this.updateSymlinkTable();
    } catch(e) {
      throw new Error("" + ERRNO_CODES.EBADE);
    }
  }

  isSymlink(targetPath: string) {
    return this._symlinkMap[targetPath];
  }

  getSymlink(targetPath: string) {
    let matchResult = targetPath.match(this._symlinkRegExp);

    if (matchResult && matchResult[0].length > 0) {
      let targetPaths = targetPath.split("/");
      let linkedPaths = matchResult[0].split("/");
      if (linkedPaths.every((item, index) => item == targetPaths[index])) {
        return targetPath.replace(matchResult[0], this._symlinkMap[matchResult[0]]);
      }
    }
    return false;
  }

  symlinkSync(absoluteTargetPath: string, absoluteNewPath: string) {
    try {
      // 检查并映射目标文件/文件夹的最终路径，并检查是否存在目标文件/文件夹
      let targetIsLink = this.getSymlink(absoluteTargetPath);
      if (targetIsLink) {
        absoluteTargetPath = targetIsLink;
      }
      let stat = this._fs.statSync(absoluteTargetPath);
    } catch(e) {
      throw new Error("" + ERRNO_CODES.ENOENT);
    }

    try {
      // 检查创建的新连接路径是否已经存在文件/文件夹
      let stat = this._fs.statSync(absoluteNewPath);
      throw new Error("" + ERRNO_CODES.EEXIST);
    } catch(e) {}

    this.addSymlink(absoluteTargetPath, absoluteNewPath);
  }

  unlink(absolutePath: string) {
    delete this._symlinkMap[absolutePath];
    this.updateSymlinkTable();
  }

  readlinkSync(absolutePath: string) {
    try {
      // 检查是否存在相关路径文件/文件夹
      this._fs.statSync(absolutePath);
    } catch(e) {
      // @ts-ignore
      if (DEBUG) console.log("SymbolicLink.readlinkSync.error", e.message);
      throw new Error("" + ERRNO_CODES.ENOENT);
    }

    let symlinkPath = this.isSymlink(absolutePath);
    if (!symlinkPath) {
      if (DEBUG) console.log("SymbolicLink.nolink.error");
      throw new Error("" + ERRNO_CODES.EINVAL);
    }
    return symlinkPath;
  }
}

export class NumberStack {
  _stacks: number[];
  constructor(readonly length: number, start: number = 0) {
    this._stacks = new Array(length).fill(0).map((_, index) => index + start);
  }
  free() {
    return this._stacks.shift()!;
  }
  add(stackId: number) {
    this._stacks.unshift(stackId);
  }
}

export class WeChatFSStream {

  _fdStrMap = new Map<number, string>();
  _fdPathMap = new Map<number, string>();
  _stack: NumberStack;
  _fs: WechatMiniprogram.FileSystemManager & {
    openSync: any,
    readSync: any,
    writeSync: any,
    closeSync: any
  };
  constructor(fs: WechatMiniprogram.FileSystemManager) {
    this._stack = new NumberStack(1000);
    this._fs = fs as any;
  }

  getFDStr(fd: number) {
    return this._fdStrMap.get(fd);
  }

  /** 传入前应该是已经替换的绝对路径（路径中可能是使用了软链接的目标路径） */
  openSync(absoluteFilePath: string, flag: string) {
    try {
      let fdStr = this._fs.openSync({ filePath: absoluteFilePath, flag });
      let fd = this._stack.free();
      this._fdStrMap.set(fd, fdStr);
      return fd;
    } catch(e) {
      const code = getEmscriptenErrorCode(e as Error);
      throw new Error(code);
    }
  }

  readSync(fd: number, data: ArrayBuffer, offset = 0, length = 0, position: number | null = null) {
    try {
      let fdStr = this._fdStrMap.get(fd);
      let newData = data;
      let newOffset = offset;
      // 微信限制写入的单个文件最大10MB?
      if (data.byteLength > (10 << 20)) {
        newData = new ArrayBuffer(length);
        newOffset = 0;
      }

      let readResult = this._fs.readSync({
        fd: fdStr, 
        arrayBuffer: newData,
        offset: newOffset,
        length, 
        position
      });
      if (newData !== data) {
        let dataView = new Int8Array(data, offset, length);
        let newDataView = new Int8Array(newData);
        dataView.set(newDataView, 0);
      }
      return readResult.bytesRead;

    } catch(e) {
      const code = getEmscriptenErrorCode(e as Error);
      throw new Error(code);
    }
  }

  writeSync(fd: number, data: string | ArrayBuffer, offset = 0,  length = 0, encoding = "utf8", position = null) {
    try {
      let fdStr = this._fdStrMap.get(fd);

      let newData = data;
      let newOffset = offset;
      if (typeof data !== "string" && data.byteLength > (10 << 20)) {
        newData = data.slice(offset, offset + length);
        newOffset = 0;
      }
      
      let writeResult = this._fs.writeSync({
        fd:fdStr,
        data: newData, 
        offset: newOffset,
        length,
        encoding,
        position
      });
      return writeResult.bytesWritten;
    } catch(e) {
      const code = getEmscriptenErrorCode(e as Error);
      throw new Error(code);
    }
  }

  closeSync(fd: number) {
    try {
      let fdStr = this._fdStrMap.get(fd);
      this._fs.closeSync({
        fd: fdStr
      });
      this._fdStrMap.delete(fd);
      this._stack.add(fd);
    } catch(e) {
      const code = getEmscriptenErrorCode(e as Error);
      throw new Error(code);
    }
  }

}

/**
 * 适配NodeJS特性
 */
export class WeChatFS implements Partial<NodeFSType> {

  id = 0;
  _fdPathMap = new Map<number, string>();
  
  readonly _fs: WechatMiniprogram.FileSystemManager;
  readonly _symbolicLink: SymbolicLink;
  readonly _stream: WeChatFSStream;

  constructor() {
    this._fs = wx.getFileSystemManager();
    this._symbolicLink = new SymbolicLink(this._fs);
    this._stream = new WeChatFSStream(this._fs);
  }

  get filesystem() {
    return this._fs;
  }

  getAbsolutePath(path: string, noPathTranslate = false) {
    if (path == "." || path == "./.") {
      path = ""
    }
    if (!(/^\//.test(path))) {
      path = "/" + path;
    }
    path = wx.env.USER_DATA_PATH + path;
    let translatedPath = this._symbolicLink.getSymlink(path);
    if (!noPathTranslate && translatedPath) {
      path = translatedPath;
    }
    
    return path;
  }

  getStats(stat: WechatMiniprogram.Stats| WechatMiniprogram.IAnyObject): StatsType {
    return {
      mode: stat.mode as any,
      size: stat.size ?? 4096,
      isDirectory: stat.isDirectory,
      isFile: stat.isFile,
      isSymbolicLink: () => {
        return false;
      },
      atime: new Date(stat.lastAccessedTime),
      ctime: new Date(stat.lastModifiedTime),
      mtime: new Date(stat.lastModifiedTime),
      ino: this.id++,
      blksize: 4096,
      gid: 0,
      uid: 0,
      dev: 0,
      rdev: 0,
      blocks: 8,
      nlink: 1,
    }
  }

  accessSync(path: any, mode?: number | undefined) {
    path = this.getAbsolutePath(path);
    try {
      this._fs.accessSync(path);
    }catch(e) {
      let errCode = getEmscriptenErrorCode(e as Error);
      // @ts-ignore
      throw new FS.ErrnoError(errCode);
    }
    return undefined;
  }

  // @ts-ignore
  lstatSync(path: any) {
    let stats = this.statSync(path);
    if (this._symbolicLink.isSymlink(path)) {
      stats.mode = 41471; // 511 /** 0777 */ | 40960
      stats.size = lengthBytesUTF8(path);
      stats.isSymbolicLink = () => true;
    }
    return stats;
  }

  // @ts-ignore
  fstatSync(fd: number, options?: any) {
    let stat;
    let fdStr = this._stream.getFDStr(fd);
    try {
      stat = (this._fs as any).fstatSync({fd: fdStr});
    } catch(e) {

      // 当前emscripten NODEFS中暂未对read,write,llseek三种方法中的Error类型过滤,暂不能使用`FS.ErrnoError`对象封装错误.
      // 直接抛出原始错误并携带对应错误的code值.
      let errCode = getEmscriptenErrorCode(e as Error);
      // @ts-ignore
      let error = new FS.ErrnoError(errCode);
      error.code = getWechatErrorMessage(errCode);
      throw error;
    }

    let stats = this.getStats(stat);
    
    return stats;
  }
  
  // @ts-ignore
  statSync(path: any, options?: fs.StatSyncOptions) {
    path = this.getAbsolutePath(path);
    let stat;
    try {
      stat = this._fs.statSync(path, false);
    } catch(e) {
      let errCode = getEmscriptenErrorCode(e as Error);
      // @ts-ignore
      throw new FS.ErrnoError(errCode);
    }

    return this.getStats(stat);
  }

  mkdirSync(path: any, options: any = {}) {
    let {recursive = false} = options;
    path = this.getAbsolutePath(path);
    if (DEBUG) console.log("mkdirSync.start", path, options);
    try {
      this._fs.mkdirSync(path, recursive);
    } catch(e) {
      let errCode = getEmscriptenErrorCode(e as Error);
      // @ts-ignore
      throw new FS.ErrnoError(errCode);
    }
    if (DEBUG) console.log("mkdirSync.end");
    return undefined;

  }

  rmdirSync(path: any, options: any = {}) {
    let {recursive = false} = options;

    path = this.getAbsolutePath(path);
    if (DEBUG) console.log("rmdirSync.start", path, options);
    try {
      this._fs.rmdirSync(path, recursive);
    } catch(e: any) {
      let errCode = getEmscriptenErrorCode(e as Error);
      // @ts-ignore
      throw new FS.ErrnoError(errCode);
    }
    if (DEBUG) console.log("rmdirSync.end");
    return undefined;
  }

  readdirSync(path: any) {
    path = this.getAbsolutePath(path);
    if (DEBUG) console.log("readdirSync.start", path);
    try {
      let result = this._fs.readdirSync(path);
      if (DEBUG) console.log("readdirSync.result", result);
      return result;
    } catch(e) {
      var errCode = getEmscriptenErrorCode(e as Error);
      // @ts-ignore
      throw new FS.ErrnoError(errCode);
    }
  }

  readFileSync(path: any, options: any = {}) {
    let {encoding = "utf8"} = options;
    path = this.getAbsolutePath(path);
    if (DEBUG) console.log("readFileSync.start", path, options);
    try {
      let data = this._fs.readFileSync(path, encoding);
      if (DEBUG) console.log("readFileSync.result", typeof data);
      return data as any;
    } catch(e) {
      let errCode = getEmscriptenErrorCode(e as Error);
      // @ts-ignore
      throw new FS.ErrnoError(errCode);
    }
  }
  appendFileSync(path: any, data: any, options: any = {}) {
    let {encoding = "utf8"} = options;
    path = this.getAbsolutePath(path);
    if (DEBUG) console.log("appendFileSync.start", path, options);
    try {
      this._fs.appendFileSync(path, data, encoding);
    } catch(e) {
      let errCode = getEmscriptenErrorCode(e as Error);
      // @ts-ignore
      throw new FS.ErrnoError(errCode);
    }
    if (DEBUG) console.log("appendFileSync.end");
  }
  writeFileSync(path: any, data: any, options: any = {}) {
    let { encoding = 'utf8' } = options;
    path = this.getAbsolutePath(path);
    if (DEBUG) console.log("writeFileSync.start", path, options);
    try {
      this._fs.writeFileSync(path, data, encoding);
    } catch(e) {
      let errCode = getEmscriptenErrorCode(e as Error);
      // @ts-ignore
      throw new FS.ErrnoError(errCode);
    }
    if (DEBUG) console.log("writeFileSync.end");
  }

  unlinkSync(path: any) {
    path = this.getAbsolutePath(path, true);
    if (DEBUG) console.log("unlinkSync.start", path);
    try {
      if (this._symbolicLink.isSymlink(path)) {
        this._symbolicLink.unlink(path);
      }
      this._fs.unlinkSync(path);
    } catch(e) {
      let errCode = getEmscriptenErrorCode(e as Error);
      // @ts-ignore
      throw new FS.ErrnoError(errCode);
    }
    if (DEBUG) console.log("unlinkSync.end");
  }
  renameSync(oldPath: any, newPath: any) {
    oldPath = this.getAbsolutePath(oldPath);
    newPath = this.getAbsolutePath(newPath);
    try {
      this._fs.renameSync(oldPath, newPath);
    } catch(e) {
      let errCode = getEmscriptenErrorCode(e as Error);
      // @ts-ignore
      throw new FS.ErrnoError(errCode);
    }
  }

  /** Not support */
  chmodSync() {}
  /** Not support */
  chownSync() {}
  /** Not support */
  utimesSync() {}

  truncateSync(filePath: any, length: any = 0) {
    filePath = this.getAbsolutePath(filePath);
    try {
      (this._fs as any).truncateSync({filePath, length});
    } catch(e) {
      let errCode = getEmscriptenErrorCode(e as Error);
      // @ts-ignore
      throw new FS.ErrnoError(errCode);
    }
  }

  ftruncateSync(fd: number, length: any = 0) {
    let wechatFd = this._stream.getFDStr(fd);
    try {
      // @ts-ignore
      this._fs.ftruncateSync({
        fd: wechatFd,
        length
      });
    } catch(e) {
      let errCode = getEmscriptenErrorCode(e as Error);
      // @ts-ignore
      throw new FS.ErrnoError(errCode);
    }
  }

  symlinkSync(targetPath: any, newPath: any) {
    targetPath = this.getAbsolutePath(targetPath);
    newPath = this.getAbsolutePath(newPath);
    try {
      this._symbolicLink.symlinkSync(targetPath, newPath);
    } catch(e) {
      let { message } = e as Error;
      // @ts-ignore
      throw new FS.ErrnoError(message);
    }
  }
  readlinkSync(path: any) {
    path = this.getAbsolutePath(path);
    try {
      let data = this._symbolicLink.readlinkSync(path);
      return data as any;
    } catch(e) {
      let { message } = e as Error;
      // @ts-ignore
      throw new FS.ErrnoError(message);
    }
  }

  openSync(filePath: any, flag: any, mode: any) {
    filePath = this.getAbsolutePath(filePath);
    try {
      let flagStr = (StringFlags as any)[flag];
      if (!flagStr) throw new Error("Not found flag mode" + flag);
      return this._stream.openSync(filePath, flagStr);
    } catch(e) {
      let { message } = e as Error;
      // @ts-ignore
      throw new FS.ErrnoError(message);
    }
  }

  // @ts-ignore
  readSync(fd: number, arrayBuffer: any, offset: number, length: number, position = null) {
    let newOffset = 0;
    if (typeof offset === "object") {
      position = offset.position;
    } else {
      newOffset = offset;
    }

    let newBuf = arrayBuffer;
    if (!(arrayBuffer instanceof ArrayBuffer)) {
      newBuf = arrayBuffer.buffer;
      newOffset = arrayBuffer.byteOffset;
      length = arrayBuffer.length;
    }
    try {
      return this._stream.readSync(fd, newBuffer, newOffset, length, position);
    } catch(e) {
      throw e;
      // 当前emscripten NODEFS中暂未对read,write,llseek三种方法中的Error类型过滤,暂不能使用`FS.ErrnoError`对象封装错误.
      // 直接抛出原始错误并携带对应错误的code值.
      // @ts-ignore
      e.code = getWechatErrorMessage(e.message);
      throw e;
      // @ts-ignore
      // throw new FS.ErrnoError(message);
    }
  }

  // @ts-ignore
  writeSync(fd: number, data: any, offset: number, length: number, position = null) {
    if (position === void 0) {
      position = null;
    }
    let newOffset = 0;
    if (typeof offset === "object") {
      position = offset.position;
    } else {
      newOffset = offset;
    }
    let newData = data;
    if (typeof data == "object" && !(data instanceof ArrayBuffer)) {
      newData = data.buffer;
      newOffset = data.byteOffset;
      length = data.length;
    }
    try {
      return this._stream.writeSync(fd, newData, newOffset, length, "utf8", position);
    } catch(e) {
      // 当前emscripten NODEFS中暂未对read,write,llseek三种方法中的Error类型过滤,暂不能使用`FS.ErrnoError`对象封装Error.
      // 直接抛出原始错误并携带对应错误的code值.
      // @ts-ignore
      e.code = getWechatErrorMessage(e.message);
      throw e;
      // // @ts-ignore
      // throw new FS.ErrnoError(message);
    }
  }
  closeSync(fd: number) {
    try {
      return this._stream.closeSync(fd);
    } catch(e) {
      let { message } = e as Error;
      // @ts-ignore
      throw new FS.ErrnoError(message);
    }
  }

}
