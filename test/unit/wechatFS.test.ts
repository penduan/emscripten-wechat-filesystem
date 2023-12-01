import chai, { expect } from "chai";
import automator from "miniprogram-automator";
import { nextTick } from "process";

import type MiniProgram from "miniprogram-automator/out/MiniProgram";
import type Page from "miniprogram-automator/out/Page";
import { 
  SymbolicLink, 
  WeChatFSStream, 
  NumberStack, 
  WeChatFS
} from "src/wechatFS";

let _miniprogram: MiniProgram;
const loadMiniprogram = async () => {
  if (_miniprogram) {
    return _miniprogram;
  }
  _miniprogram = await automator.connect({
    wsEndpoint: "ws://localhost:9420"
  }).catch(async (e) => {
    console.error("connect fail.", e);
    return await loadMiniprogram();
  });
  return _miniprogram;
}

nextTick(async function() {
  let miniprogram = await loadMiniprogram();
  console.log("miniprogram load success");

  let intervalID: any
  await new Promise((resolve) => {

    async function loadPageStack(): Promise<any> {
      return await miniprogram.pageStack()
        .catch(
          async () => await loadPageStack()
        );
    }

    loadPageStack().then(resolve);
  });

  let page = await miniprogram.reLaunch("/testPages/wechatFS");
  console.log("page load success");

  describe("wechatFS.ts", function() {
    
    describe("should have global object", function() {
      
      it("SymbolickLink Class", function(done) {
        miniprogram.evaluate(() => {
          // @ts-ignore
          return typeof globalThis.SymbolicLink;
        }).then((result) => {
          chai.expect(result).equal("function");
          done();
        }).catch(done);    
      });

      it("WeChatFS Class", function(done) {
        miniprogram.evaluate(() => {
          // @ts-ignore
          return typeof globalThis.WeChatFS;
        }).then((result) => {
          chai.expect(result).equal("function");
          done();
        }).catch(done);    
      });

      it("WeChatFSStream Class", function(done) {
        miniprogram.evaluate(() => {
          // @ts-ignore
          return typeof globalThis.WeChatFSStream;
        }).then((result) => {
          chai.expect(result).equal("function");
          done();
        }).catch(done);    
      });

      it("NumberStack Class", function(done) {
        miniprogram.evaluate(() => {
          // @ts-ignore
          return typeof globalThis.NumberStack;
        }).then((result) => {
          chai.expect(result).equal("function");
          done();
        }).catch(done);
      });

    });
    
    describe("SymbolicLink Instance", function() {

      it("instance create", function(done) {
        miniprogram.evaluate(() => {
          // @ts-ignore
          let fs = wx.getFileSystemManager();
          // @ts-ignore
          let symbolicLink = new globalThis.SymbolicLink(fs);
          // @ts-ignore
          return symbolicLink instanceof globalThis.SymbolicLink;
        }).then((result) => {
          chai.expect(result).to.be.true;
          done();
        }).catch(done);
      });

      it("instance method", function(done) {

        miniprogram.evaluate(() => {
          // @ts-ignore
          let fs = wx.getFileSystemManager();
          // @ts-ignore
          let symbolicLink = new SymbolicLink(fs);
          let list:any[] = []

          let id = 0;
          try {
            symbolicLink.symlinkSync("http://usr/link", "http://usr/link1");
          } catch(e) {
            list.push({
              id,
              // @ts-ignore      
              value: e.message ==  "44",
              // @ts-ignore
              message: e.message
            });
          }
          id++;
          try {
            fs.mkdirSync("http://usr/link");
            symbolicLink.symlinkSync("http://usr/link", "http://usr/link1");

            list.push({ id, value: true });

          } catch(e) {
            list.push({
              id,
              value: false,
              // @ts-ignore
              message: e.message
            });
          }

          id++;
          try {
            symbolicLink.symlinkSync("http://usr/link", "http://usr/link1");
          } catch(e) {
            list.push({
              id,
              // @ts-ignore
              value: e.message == "20",
              // @ts-ignore
              message: e.message
            });
          }

          id++;
          try {
            let linkTargetPath = symbolicLink.readlinkSync("http://usr/link1");
            list.push({
              id,
              value: linkTargetPath == "http://usr/link",
              message: linkTargetPath
            });
          } catch(e) {
            list.push({
              id,
              value: false,
              // @ts-ignore
              message: e.message
            });
          }

          id++;
          try {
            symbolicLink.readlinkSync("http://usr/link2");
          } catch(e) {
            list.push({
              id,
              // @ts-ignore
              value: e.message == "44",
              // @ts-ignore
              message: e.message
            });
          }

          id++;
          try {
            symbolicLink.readlinkSync("http://usr/link");
          } catch(e) {
            list.push({
              id,
              // @ts-ignore
              value: e.message == "28",
              // @ts-ignore
              message: e.message
            });
          }

          id++;
          let replacedPath = symbolicLink.getSymlink("http://usr/link1/path");
          list.push({
            id,
            value: replacedPath == "http://usr/link/path",
            message: replacedPath
          });

          id++;
          replacedPath = symbolicLink.getSymlink("http://usr/link11/path");

          list.push({
            id,
            value: replacedPath == false,
            message: replacedPath
          });
          
          return list;
        }).then((list) => {
          list.forEach((item: {id: number, value: boolean, message: string}) => {
            chai.expect(item.value, item.id + item.message).to.be.true;
          });
          done()
        }).catch(done);
      })

    });

    describe("WeChatFSStream Instance", function() {
      
      it("instance create", function(done) {
        miniprogram.evaluate(() => {
          // @ts-ignore
          let fs = wx.getFileSystemManager();
          // @ts-ignore
          let stream = new WeChatFSStream(fs);
          // @ts-ignore
          return stream instanceof WeChatFSStream;
        }).then((result) => {
          chai.expect(result).to.be.true;
          done();
        }).catch(done);
      });

      it("instance method", function(done) {
        miniprogram.evaluate(() => {
          // @ts-ignore
          let fs = wx.getFileSystemManager();
          // @ts-ignore
          let stream = new WeChatFSStream(fs);

          let id = 0;
          let list = [];
          try {
            stream.openSync("http://usr/1", "r");
          } catch(e) {
            list.push({
              id,
              // @ts-ignore
              value: e.message == "44",
              message: "文件应该不存在" 
            });
          }

          id++
          try {
            let fd = stream.openSync("http://usr/1", "w");
            let bytes = stream.writeSync(fd, "Hello World", 0, 0, "utf8");
            list.push({
              id: id++,
              value: bytes > 0,
              message: "Error writeSync."
            });
            bytes = stream.readSync(fd, new ArrayBuffer(12), 0, 12, null);
          } catch(e) {
            list.push({
              id,
              // @ts-ignore
              value: e.message == 8,
              message: "Should return 'Bad file descriptor' error." 
            });
          }

          id++
          try {
            // 已知错误，没有正常读取.
            let fd = stream.openSync("http://usr/1", "w+");
            let bytes = stream.readSync(fd, new ArrayBuffer(12), 0, 11, 0);
            list.push({
              id: id++,
              value: bytes > 0,
              message: "Read error." + bytes
            });
            stream.closeSync(fd);
          } catch(e) {
            list.push({
              id,
              value: false,
              // @ts-ignore
              message: "Read error" + e.message
            });
          }

          id++
          try {
            let fd = stream.openSync("http://usr/1", "wx+");
          } catch(e) {
            list.push({
              id,
              // @ts-ignore
              value: e.message == "20",
              message: "Should return 'EEXIST: file already exists' error"
            });
          }
          return list;
        }).then((list) => {
          list.forEach((item: {id: number, value: boolean, message: string}) => {
            chai.expect(item.value, item.id + item.message).to.be.true;
          });
          done();
        }).catch(done);
      });


      describe("WeChatFS instance", function() {
        
        it("instance create", function(done) {
          miniprogram.evaluate(() => {
            // @ts-ignore
            globalThis.FS = null;
            // @ts-ignore
            let wechatFS = new WeChatFS();
            return wechatFS instanceof WeChatFS;
          }).then((result) => {
            chai.expect(result).to.be.true;
            done();
          }).catch(done);
        });
      })

    });



    after(function() {
      // try {
      //   miniprogram.disconnect();
      // } catch(e) {}
      miniprogram.close();
    });
    
  });

  

  run();
});


// describe("WeChatFS Instance", function() {
//   const pagePath = "testPages/wechatFS";

//   let appStr: string;
//   let miniprogram: MiniProgram;
//   let page: Page | undefined;
//   this.beforeAll(function(done) {
//     // fs.symlinkSync("../src", "./miniprogram/system");
//     // try {
//     //   fs.mkdirSync("./miniprogram/testPages");
//     // } catch(e) {}

//     // [
//     //   ['ts', pageTs],
//     //   ['wxml', pageWxml],
//     //   ['json', pageJson],
//     //   ['wxss', pageWxss]
//     // ].forEach((item) => {
//     //   fs.writeFileSync("./miniprogram/testPages/wechatFS." + item[0], item[1]);
//     // });

//     // appStr = fs.readFileSync("./miniprogram/app.json", "utf8");
//     // let app = JSON.parse(appStr);
//     // app['pages'].push(pagePath);
//     // fs.writeFileSync("./miniprogram/app.json", JSON.stringify(app), "utf8");

//     automator.connect({
//       wsEndpoint: "ws://localhost:9420"
//     }).then((_miniprogram) => {
//       miniprogram = _miniprogram;
//       miniprogram.reLaunch("/" + pagePath).then(() => {
//         done();
//       }).catch(done);
//     }).catch(console.error.bind(null, "before error"));
//     this.timeout(15000);
//   });

  

//   this.afterAll(function() {
//     this.timeout(15000);
//     fs.unlinkSync("./miniprogram/system");
//     ["ts", "wxml", "json", "wxss"].forEach((ext) => fs.unlinkSync("./miniprogram/testPages/wechatFS." + ext));
//     fs.writeFileSync("./miniprogram/app.json", appStr, "utf8");
//   });

// })


//   // it("SymbolcLink Test", function() {
//   //   let fs = (globalThis as any).wx.getFileSystemManager();

//   //   let mockData = {
//   //     "/link/a": "link/b",
//   //     "test.a": "test.b"
//   //   }

//   //   it("property", function() {
//   //   });

//   //   it("Symlik table initialize", async function(done) {
//   //     fs.writeFile({
//   //       filePath: "http://usr/.symbol",
//   //       data: JSON.stringify(mockData),
//   //       success() {
//   //         let symbolicLink = new SymbolicLink(fs);
//   //         chai.expect(Object.keys(symbolicLink._symlinkMap)).to.be.length(2);
//   //         chai.expect(symbolicLink._symlinkMap['test.a']).to.be.equal("test.a");
//   //         chai.expect(symbolicLink._symlinkRegExp.test("link/a")).to.been.true;
//   //         done();
//   //       }
//   //     })
//   //   })

//   // })