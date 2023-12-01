import fs from "fs";
import { createPages, removePages } from "./mock/util";
import "./mock/wechatFS";

export function buildAsset() {
  try {
    fs.mkdirSync("./miniprogram/system");
  } catch(e) {}
  try {
    fs.cpSync("./src/", "./miniprogram/system/", {recursive: true});
  } catch(e) {}

  createPages();
}

export function removeAsset() {
  try {
    fs.rmSync("./minprogram/system/", {recursive: true});
  } catch(e) {}
  removePages();
}