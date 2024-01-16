
export class BufferAdapter {

  alloc(bufsize: number) {
      return new ArrayBuffer(bufsize);
  }

  from(buffer: ArrayBuffer) {
      return buffer;
  }
}

export class Crypto {
  getRandomValues(arr: any) {
      for (var i = 0; i < arr.length; i++) {
        arr[i] = (Math.random() * 256) | 0;
      }
  }
}

const platform = wx.getSystemInfoSync().platform;
export class NodeProcessAdapter {

  versions = {
    node: "14.9.0"
  }

  platform = /dev/.test(platform) ? "windows" : platform;
  argv = [];

  release = {
    name: "node"
  }

  on(eventName: string, listener: any) {
    if (eventName == "uncaughtException") {
      wx.onError(listener);
    }

    if (eventName == "unhandledRejection") {
      wx.onUnhandledRejection(listener);
    }
  }

  exit(status: any) {
    console.log("Exit", status);
  }

  /** @todo 需要适配`NODERAWFS`文件系统对此方法的调用 */
  cwd() {
    // @ts-ignore
    return FS.currentPath;
  }

  /** @todo 需要适配`NODERAWFS`文件系统对此方法的调用 */
  chdir(path: string) {
    // const lookup = FS.lookupPath(path);
    // if (lookup.node === null) {
    //     throw new FS.ErrnoError(44)
    // }
    // if (!FS.isDir(lookup.node.mode)) {
    //     throw new FS.ErrnoError(54)
    // }
    // FS.currentPath = lookup.path;
  }

  /** @todo 暂未适配 */
  hrtime() {
    return [0, 0];
  }

  /** 适配获取NODE文件系统的环境文件操作FLAGS常量 */
  binding(variable: string) {
    if (variable == "constants") {
      return {
        fs: {
          O_RDONLY: 0,
          O_WRONLY: 1,
          O_RDWR: 2,
          O_CREAT: 64,
          O_EXCL: 128,
          O_NOCTTY: 256,
          O_TRUNC: 512,
          O_APPEND: 1024,
          O_DIRECTORY: 65536,
          O_NOATIME: 262144,
          O_NOFOLLOW: 131072,
          O_SYNC: 1052672,
          O_DSYNC: 4096,
          O_DIRECT: 16384,
          O_NONBLOCK: 2048
        }
      }
    }
    return "";
  }
}

/** 
 * 用来适配node的`path`模块
 * @see [emscripten/src/library_path.js](https://github.com/emscripten-core/emscripten/blob/main/src/library_path.js)
 */
export class NodePathAdapter {

  static splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;

  normalize(path: string) {
    var isAbs = this.isAbsolute(path),
        trailingSlash = path.slice(-1) === '/';
    path = this.normalizeArray(path.split('/').filter((p) => !!p), !isAbs).join('/');
    if (!path && !isAbs) {
      path = '.';
    }
    if (path && trailingSlash) {
      path += '/';
    }
    return (isAbs ? '/' : '') + path;
  }

  dirname(path: string) {
    var result = this.splitPath(path),
        root = result[0],
        dir = result[1];
    if (!root && !dir) {
        // No dirname whatsoever
        return '.';
    }
    if (dir) {
        // It has a dirname, strip trailing slash
        dir = dir.slice(0, dir.length - 1);
    }
    return root + dir;
  }

  isAbsolute(path: string) {
    return path.charAt(0) === '/'
  }

  splitPath(filename: string) {
    let result = NodePathAdapter.splitPathRe.exec(filename)
    if (!result) return filename;
    return result.slice(1);
  }

  normalizeArray(parts:string[], allowAboveRoot: boolean) {
    // if the path tries to go above the root, `up` ends up > 0
    var up = 0;
    for (var i = parts.length - 1; i >= 0; i--) {
        var last = parts[i];
        if (last === '.') {
            parts.splice(i, 1);
        } else if (last === '..') {
            parts.splice(i, 1);
            up++;
        } else if (up) {
            parts.splice(i, 1);
            up--;
        }
    }
    // if the path is allowed to go above the root, restore leading ..s
    if (allowAboveRoot) {
      for (; up; up--) {
          parts.unshift('..');
      }
    }
    return parts;
  }

  basename(path: string) {
    // EMSCRIPTEN return '/'' for '/', not an empty string
    if (path === '/') return '/';
    path = this.normalize(path);
    path = path.replace(/\/$/, "");
    var lastSlash = path.lastIndexOf('/');
    if (lastSlash === -1) return path;
    return path.substr(lastSlash + 1);
  }

  join() {
    var paths = Array.prototype.slice.call(arguments);
    return this.normalize(paths.join('/'));
  }

  join2(l: string, r: string) {
    return this.normalize(l + '/' + r);
  }
}
