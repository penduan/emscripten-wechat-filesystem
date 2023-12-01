import { createPageEntries } from "./util";

const pageTs = `
import { SymbolicLink, WeChatFSStream, NumberStack, WeChatFS } from "../system/wechatFS";

globalThis.SymbolicLink = SymbolicLink;
globalThis.WeChatFSStream = WeChatFSStream;
globalThis.NumberStack = NumberStack;
globalThis.WeChatFS = WeChatFS;
Page({});
`;
const pageWxml = `<view>WechatFS Testing</view>`;

const pageJson = `
{

}
`;
const pageWxss = `view { color: red;}`;

const wechatFSPagePath = "testPages/wechatFS";

createPageEntries(wechatFSPagePath, pageJson, pageTs, pageWxml, pageWxss);




