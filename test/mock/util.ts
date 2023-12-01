
import fs from "fs";

const pages:any[] = [];

export function createPageEntries(pagePath: string, json: string, ts: string, wxml: string, wxss: string, isJS = false) {
  let pageData: Record<string, string> = { 
    wxml, 
    json,
    wxss
  }
  if (isJS) pageData.js = ts;
  else pageData.ts = ts;
  pages.push([pagePath, Object.entries(pageData)]);
}

let appStr = fs.readFileSync("./miniprogram/app.json", {encoding: "utf8"});

export function createPages() {
  let appConfig = JSON.parse(appStr);
   
  pages.forEach((pageEntries) => {
    let pagePath = pageEntries[0];
    pageEntries[1].forEach((entry: any) => {
      let parent = pagePath.split("/");
      parent.pop();
      try {
        fs.mkdirSync("./miniprogram/" + parent.join("/"));
      } catch(e) {}
      fs.writeFileSync("./miniprogram/" + pagePath + "." + entry[0], entry[1], {
        encoding: "utf8",

      });
    });
    if (appConfig['pages'].indexOf(pagePath) > -1) return ;
    appConfig['pages'].push(pagePath);
  });

  fs.writeFileSync("./miniprogram/" + "app.json", JSON.stringify(appConfig), "utf8");
}

export function removePages() {
  let appConfig = JSON.parse(appStr);
  pages.forEach((pageEntries) => {
    let pagePath = pageEntries[0];
    pageEntries[1].forEach((entry: any) => {
      try {
        fs.unlinkSync("./miniprogram/" + pagePath + "." + entry[0]);
      } catch(e) {}
    });
  });
  fs.writeFileSync("./miniprogram/" + "app.json", JSON.stringify(appConfig), "utf8");
}