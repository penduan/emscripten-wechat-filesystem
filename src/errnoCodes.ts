/** emscripten errno codes */
export const ERRNO_CODES = {
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
const ErrorCode = {
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
}

const ERRNO_CODES_REVERSE: Record<number, string> = {}

for (let name in ERRNO_CODES) {
  ERRNO_CODES_REVERSE[(ERRNO_CODES as any)[name]] = name;
}

const errorCodeRegExp = new RegExp(Object.keys(ErrorCode).join("|"));

/**
 * @TODO 小程序内Error对象与Web Error结构并不一致?
 */
export function getEmscriptenErrorCode(err: Error) {
  
  const { message } = err;
  if (!message) throw err;

  const matchResult = message.match(errorCodeRegExp);
  if (!matchResult) throw err;

  // @ts-ignore
  let code = ErrorCode[matchResult[0]];

  // 储存超出限制大小
  if (code == ERRNO_CODES.EXFULL) {
      // @ts-ignore
      if (Reflect.has(Module, "onStorageSizeLimit")) Module.onStorageSizeLimit();
      throw err;
  }
  
  return code;
}

export function getWechatErrorMessage(code: number) {
  if (Reflect.has(ERRNO_CODES_REVERSE, code))
    return ERRNO_CODES_REVERSE[code];
  return null;
}