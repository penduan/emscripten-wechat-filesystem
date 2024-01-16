import { ERRNO_CODES } from "./errnoCodes"
// TODO: 仅适配了部分,需要完善
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

export function getSyncErrorCode(err: Error) {
  let { message } = err;
  if (!message) throw err;
  let matchResult = message.match(errorCodeRegExp);
  if (!matchResult) throw err;
  // @ts-ignore
  let code = ErrorCode[matchResult[0]];
  if (code == ERRNO_CODES.EXFULL) {
      // @ts-ignore
      if (findModule("onStorageSizeLimit")) Module.onStorageSizeLimit();
      throw err;
  }
  return code;
}

export function getSyncErrorCodeName(code: number) {
  let result = ERRNO_CODES_REVERSE[code];

  return result ? result : null;
}
