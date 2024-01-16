var BufferAdapter = /** @class */ (function () {
    function BufferAdapter() {
    }
    BufferAdapter.prototype.alloc = function (bufsize) {
        return new ArrayBuffer(bufsize);
    };
    BufferAdapter.prototype.from = function (buffer) {
        return buffer;
    };
    return BufferAdapter;
}());
var Crypto = /** @class */ (function () {
    function Crypto() {
    }
    Crypto.prototype.getRandomValues = function (arr) {
        for (var i = 0; i < arr.length; i++) {
            arr[i] = (Math.random() * 256) | 0;
        }
    };
    return Crypto;
}());
var platform = wx.getSystemInfoSync().platform;
var NodeProcessAdapter = /** @class */ (function () {
    function NodeProcessAdapter() {
        this.versions = {
            node: "14.9.0"
        };
        this.platform = /dev/.test(platform) ? "windows" : platform;
        this.argv = [];
        this.release = {
            name: "node"
        };
    }
    NodeProcessAdapter.prototype.on = function (eventName, listener) {
        if (eventName == "uncaughtException") {
            wx.onError(listener);
        }
        if (eventName == "unhandledRejection") {
            wx.onUnhandledRejection(listener);
        }
    };
    NodeProcessAdapter.prototype.exit = function (status) {
        console.log("Exit", status);
    };
    /** @todo 需要适配`NODERAWFS`文件系统对此方法的调用 */
    NodeProcessAdapter.prototype.cwd = function () {
        // @ts-ignore
        return FS.currentPath;
    };
    /** @todo 需要适配`NODERAWFS`文件系统对此方法的调用 */
    NodeProcessAdapter.prototype.chdir = function (path) {
        // const lookup = FS.lookupPath(path);
        // if (lookup.node === null) {
        //     throw new FS.ErrnoError(44)
        // }
        // if (!FS.isDir(lookup.node.mode)) {
        //     throw new FS.ErrnoError(54)
        // }
        // FS.currentPath = lookup.path;
    };
    /** @todo 暂未适配 */
    NodeProcessAdapter.prototype.hrtime = function () {
        return [0, 0];
    };
    /** 适配获取NODE文件系统的环境文件操作FLAGS常量 */
    NodeProcessAdapter.prototype.binding = function (variable) {
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
            };
        }
        return "";
    };
    return NodeProcessAdapter;
}());
/**
 * 用来适配node的`path`模块
 * @see [emscripten/src/library_path.js](https://github.com/emscripten-core/emscripten/blob/main/src/library_path.js)
 */
var NodePathAdapter = /** @class */ (function () {
    function NodePathAdapter() {
    }
    NodePathAdapter.prototype.normalize = function (path) {
        var isAbs = this.isAbsolute(path), trailingSlash = path.slice(-1) === '/';
        path = this.normalizeArray(path.split('/').filter(function (p) { return !!p; }), !isAbs).join('/');
        if (!path && !isAbs) {
            path = '.';
        }
        if (path && trailingSlash) {
            path += '/';
        }
        return (isAbs ? '/' : '') + path;
    };
    NodePathAdapter.prototype.dirname = function (path) {
        var result = this.splitPath(path), root = result[0], dir = result[1];
        if (!root && !dir) {
            // No dirname whatsoever
            return '.';
        }
        if (dir) {
            // It has a dirname, strip trailing slash
            dir = dir.slice(0, dir.length - 1);
        }
        return root + dir;
    };
    NodePathAdapter.prototype.isAbsolute = function (path) {
        return path.charAt(0) === '/';
    };
    NodePathAdapter.prototype.splitPath = function (filename) {
        var result = NodePathAdapter.splitPathRe.exec(filename);
        if (!result)
            return filename;
        return result.slice(1);
    };
    NodePathAdapter.prototype.normalizeArray = function (parts, allowAboveRoot) {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
            var last = parts[i];
            if (last === '.') {
                parts.splice(i, 1);
            }
            else if (last === '..') {
                parts.splice(i, 1);
                up++;
            }
            else if (up) {
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
    };
    NodePathAdapter.prototype.basename = function (path) {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/')
            return '/';
        path = this.normalize(path);
        path = path.replace(/\/$/, "");
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1)
            return path;
        return path.substr(lastSlash + 1);
    };
    NodePathAdapter.prototype.join = function () {
        var paths = Array.prototype.slice.call(arguments);
        return this.normalize(paths.join('/'));
    };
    NodePathAdapter.prototype.join2 = function (l, r) {
        return this.normalize(l + '/' + r);
    };
    NodePathAdapter.splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
    return NodePathAdapter;
}());

/** emscripten errno codes */
var ERRNO_CODES = {
    'EPERM': 63,
    'ENOENT': 44,
    'ESRCH': 71,
    'EINTR': 27,
    'EIO': 29,
    'ENXIO': 60,
    'E2BIG': 1,
    'ENOEXEC': 45,
    'EBADF': 8,
    'ECHILD': 12,
    'EAGAIN': 6,
    'EWOULDBLOCK': 6,
    'ENOMEM': 48,
    'EACCES': 2,
    'EFAULT': 21,
    'ENOTBLK': 105,
    'EBUSY': 10,
    'EEXIST': 20,
    'EXDEV': 75,
    'ENODEV': 43,
    'ENOTDIR': 54,
    'EISDIR': 31,
    'EINVAL': 28,
    'ENFILE': 41,
    'EMFILE': 33,
    'ENOTTY': 59,
    'ETXTBSY': 74,
    'EFBIG': 22,
    'ENOSPC': 51,
    'ESPIPE': 70,
    'EROFS': 69,
    'EMLINK': 34,
    'EPIPE': 64,
    'EDOM': 18,
    'ERANGE': 68,
    'ENOMSG': 49,
    'EIDRM': 24,
    'ECHRNG': 106,
    'EL2NSYNC': 156,
    'EL3HLT': 107,
    'EL3RST': 108,
    'ELNRNG': 109,
    'EUNATCH': 110,
    'ENOCSI': 111,
    'EL2HLT': 112,
    'EDEADLK': 16,
    'ENOLCK': 46,
    'EBADE': 113,
    'EBADR': 114,
    'EXFULL': 115,
    'ENOANO': 104,
    'EBADRQC': 103,
    'EBADSLT': 102,
    'EDEADLOCK': 16,
    'EBFONT': 101,
    'ENOSTR': 100,
    'ENODATA': 116,
    'ETIME': 117,
    'ENOSR': 118,
    'ENONET': 119,
    'ENOPKG': 120,
    'EREMOTE': 121,
    'ENOLINK': 47,
    'EADV': 122,
    'ESRMNT': 123,
    'ECOMM': 124,
    'EPROTO': 65,
    'EMULTIHOP': 36,
    'EDOTDOT': 125,
    'EBADMSG': 9,
    'ENOTUNIQ': 126,
    'EBADFD': 127,
    'EREMCHG': 128,
    'ELIBACC': 129,
    'ELIBBAD': 130,
    'ELIBSCN': 131,
    'ELIBMAX': 132,
    'ELIBEXEC': 133,
    'ENOSYS': 52,
    'ENOTEMPTY': 55,
    'ENAMETOOLONG': 37,
    'ELOOP': 32,
    'EOPNOTSUPP': 138,
    'EPFNOSUPPORT': 139,
    'ECONNRESET': 15,
    'ENOBUFS': 42,
    'EAFNOSUPPORT': 5,
    'EPROTOTYPE': 67,
    'ENOTSOCK': 57,
    'ENOPROTOOPT': 50,
    'ESHUTDOWN': 140,
    'ECONNREFUSED': 14,
    'EADDRINUSE': 3,
    'ECONNABORTED': 13,
    'ENETUNREACH': 40,
    'ENETDOWN': 38,
    'ETIMEDOUT': 73,
    'EHOSTDOWN': 142,
    'EHOSTUNREACH': 23,
    'EINPROGRESS': 26,
    'EALREADY': 7,
    'EDESTADDRREQ': 17,
    'EMSGSIZE': 35,
    'EPROTONOSUPPORT': 66,
    'ESOCKTNOSUPPORT': 137,
    'EADDRNOTAVAIL': 4,
    'ENETRESET': 39,
    'EISCONN': 30,
    'ENOTCONN': 53,
    'ETOOMANYREFS': 141,
    'EUSERS': 136,
    'EDQUOT': 19,
    'ESTALE': 72,
    'ENOTSUP': 138,
    'ENOMEDIUM': 148,
    'EILSEQ': 25,
    'EOVERFLOW': 61,
    'ECANCELED': 11,
    'ENOTRECOVERABLE': 56,
    'EOWNERDEAD': 62,
    'ESTRPIPE': 135,
};
/**
 * 适配错误码
 * 通过匹配小程序内错误触发的错误信息来获取 `emcripten` 一致的错误码
 */
var ErrorCode = {
    "fail permission denied": ERRNO_CODES.EPERM,
    "no such file or directory": ERRNO_CODES.ENOENT,
    "bad file descriptor": ERRNO_CODES.EBADF,
    "Input/output error": ERRNO_CODES.EIO,
    "not a directory": ERRNO_CODES.ENOTDIR,
    "Is a directory": ERRNO_CODES.EISDIR,
    "Invalid argument": ERRNO_CODES.EINVAL,
    "directory not empty": ERRNO_CODES.ENOTEMPTY,
    "system error": ERRNO_CODES.EPROTO,
    "the maximun size of the": ERRNO_CODES.EFBIG,
    "base64 encode error": ERRNO_CODES.EINVAL,
    "data to write is empty": ERRNO_CODES.ENODATA,
    "illegal operation on a directory": ERRNO_CODES.EISDIR,
    "file already exists": ERRNO_CODES.EEXIST,
    "value of length is out of range": ERRNO_CODES.ENOSR,
    "execed max concurrent fd limit": ERRNO_CODES.EXFULL,
    "permission denied when open using": ERRNO_CODES.EACCES,
    "the maximum size of the file storage limit": ERRNO_CODES.EXFULL,
};
var ERRNO_CODES_REVERSE = {};
for (var name_1 in ERRNO_CODES) {
    ERRNO_CODES_REVERSE[ERRNO_CODES[name_1]] = name_1;
}
var errorCodeRegExp = new RegExp(Object.keys(ErrorCode).join("|"));
/**
 * @TODO 小程序内Error对象与Web Error结构并不一致?
 */
function getEmscriptenErrorCode(err) {
    var message = err.message;
    if (!message)
        throw err;
    var matchResult = message.match(errorCodeRegExp);
    if (!matchResult)
        throw err;
    // @ts-ignore
    var code = ErrorCode[matchResult[0]];
    // 储存超出限制大小
    if (code == ERRNO_CODES.EXFULL) {
        // @ts-ignore
        if (Reflect.has(Module, "onStorageSizeLimit"))
            Module.onStorageSizeLimit();
        throw err;
    }
    return code;
}
function getWechatErrorMessage(code) {
    if (Reflect.has(ERRNO_CODES_REVERSE, code))
        return ERRNO_CODES_REVERSE[code];
    return null;
}

var WASM_FILE_PATH = "pages/wasm-test/lg2.wasm.br";
var DEBUG = false;

// import fs from "fs";
var StringFlags = {
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
};
// @ts-nocheck
var SymbolicLink = /** @class */ (function () {
    function SymbolicLink(_fs) {
        this._fs = _fs;
        this.SYMLINK_MAP_PATH = wx.env.USER_DATA_PATH + "/.symbols";
        this._symlinkRegExp = /^/;
        try {
            var data = this._fs.readFileSync(this.SYMLINK_MAP_PATH, "utf8");
            this._symlinkMap = JSON.parse(data);
        }
        catch (e) {
            this._symlinkMap = {};
        }
        this.initialRegExp();
    }
    SymbolicLink.prototype.initialRegExp = function () {
        var linkedPaths = Object.keys(this._symlinkMap).map(function (i) { return i.replace(/./g, "\\."); }).sort(function (a, b) { return b.length - a.length; }).join("|");
        this._symlinkRegExp = new RegExp("^".concat(linkedPaths));
    };
    SymbolicLink.prototype.updateSymlinkTable = function () {
        try {
            this._fs.writeFileSync(this.SYMLINK_MAP_PATH, JSON.stringify(this._symlinkMap), "utf8");
            this.initialRegExp();
        }
        catch (e) {
            console.error("Symlink table not support.");
        }
    };
    SymbolicLink.prototype.addSymlink = function (targetPath, newPath) {
        this._symlinkMap[newPath] = targetPath;
        try {
            this._fs.writeFileSync(newPath, "", "utf8");
            this.updateSymlinkTable();
        }
        catch (e) {
            throw new Error("" + ERRNO_CODES.EBADE);
        }
    };
    SymbolicLink.prototype.isSymlink = function (targetPath) {
        return this._symlinkMap[targetPath];
    };
    SymbolicLink.prototype.getSymlink = function (targetPath) {
        var matchResult = targetPath.match(this._symlinkRegExp);
        if (matchResult && matchResult[0].length > 0) {
            var targetPaths_1 = targetPath.split("/");
            var linkedPaths = matchResult[0].split("/");
            if (linkedPaths.every(function (item, index) { return item == targetPaths_1[index]; })) {
                return targetPath.replace(matchResult[0], this._symlinkMap[matchResult[0]]);
            }
        }
        return false;
    };
    SymbolicLink.prototype.symlinkSync = function (absoluteTargetPath, absoluteNewPath) {
        try {
            // 检查并映射目标文件/文件夹的最终路径，并检查是否存在目标文件/文件夹
            var targetIsLink = this.getSymlink(absoluteTargetPath);
            if (targetIsLink) {
                absoluteTargetPath = targetIsLink;
            }
            var stat = this._fs.statSync(absoluteTargetPath);
        }
        catch (e) {
            throw new Error("" + ERRNO_CODES.ENOENT);
        }
        try {
            // 检查创建的新连接路径是否已经存在文件/文件夹
            var stat = this._fs.statSync(absoluteNewPath);
            throw new Error("" + ERRNO_CODES.EEXIST);
        }
        catch (e) { }
        this.addSymlink(absoluteTargetPath, absoluteNewPath);
    };
    SymbolicLink.prototype.unlink = function (absolutePath) {
        delete this._symlinkMap[absolutePath];
        this.updateSymlinkTable();
    };
    SymbolicLink.prototype.readlinkSync = function (absolutePath) {
        try {
            // 检查是否存在相关路径文件/文件夹
            this._fs.statSync(absolutePath);
        }
        catch (e) {
            // @ts-ignore
            if (DEBUG)
                console.log("SymbolicLink.readlinkSync.error", e.message);
            throw new Error("" + ERRNO_CODES.ENOENT);
        }
        var symlinkPath = this.isSymlink(absolutePath);
        if (!symlinkPath) {
            if (DEBUG)
                console.log("SymbolicLink.nolink.error");
            throw new Error("" + ERRNO_CODES.EINVAL);
        }
        return symlinkPath;
    };
    return SymbolicLink;
}());
var NumberStack = /** @class */ (function () {
    function NumberStack(length, start) {
        if (start === void 0) { start = 0; }
        this.length = length;
        this._stacks = new Array(length).fill(0).map(function (_, index) { return index + start; });
    }
    NumberStack.prototype.free = function () {
        return this._stacks.shift();
    };
    NumberStack.prototype.add = function (stackId) {
        this._stacks.unshift(stackId);
    };
    return NumberStack;
}());
var WeChatFSStream = /** @class */ (function () {
    function WeChatFSStream(fs) {
        this._fdStrMap = new Map();
        this._fdPathMap = new Map();
        this._stack = new NumberStack(1000);
        this._fs = fs;
    }
    WeChatFSStream.prototype.getFDStr = function (fd) {
        return this._fdStrMap.get(fd);
    };
    /** 传入前应该是已经替换的绝对路径（路径中可能是使用了软链接的目标路径） */
    WeChatFSStream.prototype.openSync = function (absoluteFilePath, flag) {
        try {
            var fdStr = this._fs.openSync({ filePath: absoluteFilePath, flag: flag });
            var fd = this._stack.free();
            this._fdStrMap.set(fd, fdStr);
            return fd;
        }
        catch (e) {
            var code = getEmscriptenErrorCode(e);
            throw new Error(code);
        }
    };
    WeChatFSStream.prototype.readSync = function (fd, data, offset, length, position) {
        if (offset === void 0) { offset = 0; }
        if (length === void 0) { length = 0; }
        if (position === void 0) { position = null; }
        try {
            var fdStr = this._fdStrMap.get(fd);
            var newData = data;
            var newOffset = offset;
            // 微信限制写入的单个文件最大10MB?
            if (data.byteLength > (10 << 20)) {
                newData = new ArrayBuffer(length);
                newOffset = 0;
            }
            var readResult = this._fs.readSync({
                fd: fdStr,
                arrayBuffer: newData,
                offset: newOffset,
                length: length,
                position: position
            });
            if (newData !== data) {
                var dataView = new Int8Array(data, offset, length);
                var newDataView = new Int8Array(newData);
                dataView.set(newDataView, 0);
            }
            return readResult.bytesRead;
        }
        catch (e) {
            var code = getEmscriptenErrorCode(e);
            throw new Error(code);
        }
    };
    WeChatFSStream.prototype.writeSync = function (fd, data, offset, length, encoding, position) {
        if (offset === void 0) { offset = 0; }
        if (length === void 0) { length = 0; }
        if (encoding === void 0) { encoding = "utf8"; }
        if (position === void 0) { position = null; }
        try {
            var fdStr = this._fdStrMap.get(fd);
            var newData = data;
            var newOffset = offset;
            if (typeof data !== "string" && data.byteLength > (10 << 20)) {
                newData = data.slice(offset, offset + length);
                newOffset = 0;
            }
            var writeResult = this._fs.writeSync({
                fd: fdStr,
                data: newData,
                offset: newOffset,
                length: length,
                encoding: encoding,
                position: position
            });
            return writeResult.bytesWritten;
        }
        catch (e) {
            var code = getEmscriptenErrorCode(e);
            throw new Error(code);
        }
    };
    WeChatFSStream.prototype.closeSync = function (fd) {
        try {
            var fdStr = this._fdStrMap.get(fd);
            this._fs.closeSync({
                fd: fdStr
            });
            this._fdStrMap.delete(fd);
            this._stack.add(fd);
        }
        catch (e) {
            var code = getEmscriptenErrorCode(e);
            throw new Error(code);
        }
    };
    return WeChatFSStream;
}());
/**
 * 适配NodeJS特性
 */
var WeChatFS = /** @class */ (function () {
    function WeChatFS() {
        this.id = 0;
        this._fdPathMap = new Map();
        this._fs = wx.getFileSystemManager();
        this._symbolicLink = new SymbolicLink(this._fs);
        this._stream = new WeChatFSStream(this._fs);
    }
    Object.defineProperty(WeChatFS.prototype, "filesystem", {
        get: function () {
            return this._fs;
        },
        enumerable: false,
        configurable: true
    });
    WeChatFS.prototype.getAbsolutePath = function (path, noPathTranslate) {
        if (noPathTranslate === void 0) { noPathTranslate = false; }
        if (path == "." || path == "./.") {
            path = "";
        }
        if (!(/^\//.test(path))) {
            path = "/" + path;
        }
        path = wx.env.USER_DATA_PATH + path;
        var translatedPath = this._symbolicLink.getSymlink(path);
        if (!noPathTranslate && translatedPath) {
            path = translatedPath;
        }
        return path;
    };
    WeChatFS.prototype.getStats = function (stat) {
        var _a;
        return {
            mode: stat.mode,
            size: (_a = stat.size) !== null && _a !== void 0 ? _a : 4096,
            isDirectory: stat.isDirectory,
            isFile: stat.isFile,
            isSymbolicLink: function () {
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
        };
    };
    WeChatFS.prototype.accessSync = function (path, mode) {
        path = this.getAbsolutePath(path);
        try {
            this._fs.accessSync(path);
        }
        catch (e) {
            var errCode = getEmscriptenErrorCode(e);
            // @ts-ignore
            throw new FS.ErrnoError(errCode);
        }
        return undefined;
    };
    // @ts-ignore
    WeChatFS.prototype.lstatSync = function (path) {
        var stats = this.statSync(path);
        if (this._symbolicLink.isSymlink(path)) {
            stats.mode = 41471; // 511 /** 0777 */ | 40960
            stats.size = lengthBytesUTF8(path);
            stats.isSymbolicLink = function () { return true; };
        }
        return stats;
    };
    // @ts-ignore
    WeChatFS.prototype.fstatSync = function (fd, options) {
        var stat;
        var fdStr = this._stream.getFDStr(fd);
        try {
            stat = this._fs.fstatSync({ fd: fdStr });
        }
        catch (e) {
            // 当前emscripten NODEFS中暂未对read,write,llseek三种方法中的Error类型过滤,暂不能使用`FS.ErrnoError`对象封装错误.
            // 直接抛出原始错误并携带对应错误的code值.
            var errCode = getEmscriptenErrorCode(e);
            // @ts-ignore
            var error = new FS.ErrnoError(errCode);
            error.code = getWechatErrorMessage(errCode);
            throw error;
        }
        var stats = this.getStats(stat);
        return stats;
    };
    // @ts-ignore
    WeChatFS.prototype.statSync = function (path, options) {
        path = this.getAbsolutePath(path);
        var stat;
        try {
            stat = this._fs.statSync(path, false);
        }
        catch (e) {
            var errCode = getEmscriptenErrorCode(e);
            // @ts-ignore
            throw new FS.ErrnoError(errCode);
        }
        return this.getStats(stat);
    };
    WeChatFS.prototype.mkdirSync = function (path, options) {
        if (options === void 0) { options = {}; }
        var _a = options.recursive, recursive = _a === void 0 ? false : _a;
        path = this.getAbsolutePath(path);
        if (DEBUG)
            console.log("mkdirSync.start", path, options);
        try {
            this._fs.mkdirSync(path, recursive);
        }
        catch (e) {
            var errCode = getEmscriptenErrorCode(e);
            // @ts-ignore
            throw new FS.ErrnoError(errCode);
        }
        if (DEBUG)
            console.log("mkdirSync.end");
        return undefined;
    };
    WeChatFS.prototype.rmdirSync = function (path, options) {
        if (options === void 0) { options = {}; }
        var _a = options.recursive, recursive = _a === void 0 ? false : _a;
        path = this.getAbsolutePath(path);
        if (DEBUG)
            console.log("rmdirSync.start", path, options);
        try {
            this._fs.rmdirSync(path, recursive);
        }
        catch (e) {
            var errCode = getEmscriptenErrorCode(e);
            // @ts-ignore
            throw new FS.ErrnoError(errCode);
        }
        if (DEBUG)
            console.log("rmdirSync.end");
        return undefined;
    };
    WeChatFS.prototype.readdirSync = function (path) {
        path = this.getAbsolutePath(path);
        if (DEBUG)
            console.log("readdirSync.start", path);
        try {
            var result = this._fs.readdirSync(path);
            if (DEBUG)
                console.log("readdirSync.result", result);
            return result;
        }
        catch (e) {
            var errCode = getEmscriptenErrorCode(e);
            // @ts-ignore
            throw new FS.ErrnoError(errCode);
        }
    };
    WeChatFS.prototype.readFileSync = function (path, options) {
        if (options === void 0) { options = {}; }
        var _a = options.encoding, encoding = _a === void 0 ? "utf8" : _a;
        path = this.getAbsolutePath(path);
        if (DEBUG)
            console.log("readFileSync.start", path, options);
        try {
            var data = this._fs.readFileSync(path, encoding);
            if (DEBUG)
                console.log("readFileSync.result", typeof data);
            return data;
        }
        catch (e) {
            var errCode = getEmscriptenErrorCode(e);
            // @ts-ignore
            throw new FS.ErrnoError(errCode);
        }
    };
    WeChatFS.prototype.appendFileSync = function (path, data, options) {
        if (options === void 0) { options = {}; }
        var _a = options.encoding, encoding = _a === void 0 ? "utf8" : _a;
        path = this.getAbsolutePath(path);
        if (DEBUG)
            console.log("appendFileSync.start", path, options);
        try {
            this._fs.appendFileSync(path, data, encoding);
        }
        catch (e) {
            var errCode = getEmscriptenErrorCode(e);
            // @ts-ignore
            throw new FS.ErrnoError(errCode);
        }
        if (DEBUG)
            console.log("appendFileSync.end");
    };
    WeChatFS.prototype.writeFileSync = function (path, data, options) {
        if (options === void 0) { options = {}; }
        var _a = options.encoding, encoding = _a === void 0 ? 'utf8' : _a;
        path = this.getAbsolutePath(path);
        if (DEBUG)
            console.log("writeFileSync.start", path, options);
        try {
            this._fs.writeFileSync(path, data, encoding);
        }
        catch (e) {
            var errCode = getEmscriptenErrorCode(e);
            // @ts-ignore
            throw new FS.ErrnoError(errCode);
        }
        if (DEBUG)
            console.log("writeFileSync.end");
    };
    WeChatFS.prototype.unlinkSync = function (path) {
        path = this.getAbsolutePath(path, true);
        if (DEBUG)
            console.log("unlinkSync.start", path);
        try {
            if (this._symbolicLink.isSymlink(path)) {
                this._symbolicLink.unlink(path);
            }
            this._fs.unlinkSync(path);
        }
        catch (e) {
            var errCode = getEmscriptenErrorCode(e);
            // @ts-ignore
            throw new FS.ErrnoError(errCode);
        }
        if (DEBUG)
            console.log("unlinkSync.end");
    };
    WeChatFS.prototype.renameSync = function (oldPath, newPath) {
        oldPath = this.getAbsolutePath(oldPath);
        newPath = this.getAbsolutePath(newPath);
        try {
            this._fs.renameSync(oldPath, newPath);
        }
        catch (e) {
            var errCode = getEmscriptenErrorCode(e);
            // @ts-ignore
            throw new FS.ErrnoError(errCode);
        }
    };
    /** Not support */
    WeChatFS.prototype.chmodSync = function () { };
    /** Not support */
    WeChatFS.prototype.chownSync = function () { };
    /** Not support */
    WeChatFS.prototype.utimesSync = function () { };
    WeChatFS.prototype.truncateSync = function (filePath, length) {
        if (length === void 0) { length = 0; }
        filePath = this.getAbsolutePath(filePath);
        try {
            this._fs.truncateSync({ filePath: filePath, length: length });
        }
        catch (e) {
            var errCode = getEmscriptenErrorCode(e);
            // @ts-ignore
            throw new FS.ErrnoError(errCode);
        }
    };
    WeChatFS.prototype.ftruncateSync = function (fd, length) {
        if (length === void 0) { length = 0; }
        var wechatFd = this._stream.getFDStr(fd);
        try {
            // @ts-ignore
            this._fs.ftruncateSync({
                fd: wechatFd,
                length: length
            });
        }
        catch (e) {
            var errCode = getEmscriptenErrorCode(e);
            // @ts-ignore
            throw new FS.ErrnoError(errCode);
        }
    };
    WeChatFS.prototype.symlinkSync = function (targetPath, newPath) {
        targetPath = this.getAbsolutePath(targetPath);
        newPath = this.getAbsolutePath(newPath);
        try {
            this._symbolicLink.symlinkSync(targetPath, newPath);
        }
        catch (e) {
            var message = e.message;
            // @ts-ignore
            throw new FS.ErrnoError(message);
        }
    };
    WeChatFS.prototype.readlinkSync = function (path) {
        path = this.getAbsolutePath(path);
        try {
            var data = this._symbolicLink.readlinkSync(path);
            return data;
        }
        catch (e) {
            var message = e.message;
            // @ts-ignore
            throw new FS.ErrnoError(message);
        }
    };
    WeChatFS.prototype.openSync = function (filePath, flag, mode) {
        filePath = this.getAbsolutePath(filePath);
        try {
            var flagStr = StringFlags[flag];
            if (!flagStr)
                throw new Error("Not found flag mode" + flag);
            return this._stream.openSync(filePath, flagStr);
        }
        catch (e) {
            var message = e.message;
            // @ts-ignore
            throw new FS.ErrnoError(message);
        }
    };
    // @ts-ignore
    WeChatFS.prototype.readSync = function (fd, arrayBuffer, offset, length, position) {
        if (position === void 0) { position = null; }
        var newOffset = 0;
        if (typeof offset === "object") {
            position = offset.position;
        }
        else {
            newOffset = offset;
        }
        var newBuf = arrayBuffer;
        if (!(arrayBuffer instanceof ArrayBuffer)) {
            newBuf = arrayBuffer.buffer;
            newOffset = arrayBuffer.byteOffset;
            length = arrayBuffer.length;
        }
        try {
            return this._stream.readSync(fd, newBuffer, newOffset, length, position);
        }
        catch (e) {
            throw e;
            // 当前emscripten NODEFS中暂未对read,write,llseek三种方法中的Error类型过滤,暂不能使用`FS.ErrnoError`对象封装错误.
            // 直接抛出原始错误并携带对应错误的code值.
            // @ts-ignore
            e.code = getWechatErrorMessage(e.message);
            throw e;
            // @ts-ignore
            // throw new FS.ErrnoError(message);
        }
    };
    // @ts-ignore
    WeChatFS.prototype.writeSync = function (fd, data, offset, length, position) {
        if (position === void 0) { position = null; }
        if (position === void 0) {
            position = null;
        }
        var newOffset = 0;
        if (typeof offset === "object") {
            position = offset.position;
        }
        else {
            newOffset = offset;
        }
        var newData = data;
        if (typeof data == "object" && !(data instanceof ArrayBuffer)) {
            newData = data.buffer;
            newOffset = data.byteOffset;
            length = data.length;
        }
        try {
            return this._stream.writeSync(fd, newData, newOffset, length, "utf8", position);
        }
        catch (e) {
            // 当前emscripten NODEFS中暂未对read,write,llseek三种方法中的Error类型过滤,暂不能使用`FS.ErrnoError`对象封装Error.
            // 直接抛出原始错误并携带对应错误的code值.
            // @ts-ignore
            e.code = getWechatErrorMessage(e.message);
            throw e;
            // // @ts-ignore
            // throw new FS.ErrnoError(message);
        }
    };
    WeChatFS.prototype.closeSync = function (fd) {
        try {
            return this._stream.closeSync(fd);
        }
        catch (e) {
            var message = e.message;
            // @ts-ignore
            throw new FS.ErrnoError(message);
        }
    };
    return WeChatFS;
}());

// @ts-ignore
var WebAssembly = WXWebAssembly;
WebAssembly.RuntimeError = Error;
var process = new NodeProcessAdapter;
var crypto = new Crypto;
var Buffer = new BufferAdapter;
var pathAdapter = new NodePathAdapter;
function getWeChatFS() {
    return new WeChatFS();
}
function getPathAdapter() {
    return pathAdapter;
}
/**
 * 替换 Emscripten的`getBinaryPromise`方法
 * 用来适配微信小程序的WASM模块加载模式
 * */
function getWasmFilePath() {
    // @ts-ignore
    return Promise.resolve("WASM_FILE_PATH");
}
// 防止摇树把内容摇掉,在构建后需要正则删掉
console.log('tree-shaking', getWeChatFS(), getPathAdapter(), getWasmFilePath());
