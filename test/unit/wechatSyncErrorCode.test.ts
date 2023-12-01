import { ERRNO_CODES, getEmscriptenErrorCode } from "src/errnoCodes";
import chai from "chai";

describe("getEmscriptenErrorCode()", function() {
  it("Test code return ", function() {
    let mocks = {
      "sync:fail permission denied /a": ERRNO_CODES.EPERM,
      "sync:no such file or directory /a": ERRNO_CODES.ENOENT 
    }

    for (let message in mocks) {
      let error = new Error(message);
      chai.expect(getEmscriptenErrorCode(error) === (mocks as any)[message], "Return code error.")
      chai.expect(getEmscriptenErrorCode(error)).to.be.a('number');
    }

    chai.expect(getEmscriptenErrorCode(new Error("permission denied when open using")) === ERRNO_CODES.EACCES, "Return code error.");
  });

  it("Test no handled error", function() {

    chai.expect(() => getEmscriptenErrorCode(new Error("Hello Word"))).to.throw(Error);
    chai.expect(() => getEmscriptenErrorCode(new Error("Hello Word"))).to.be.throw(Error);
  })
})