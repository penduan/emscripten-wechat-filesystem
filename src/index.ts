import { NodeProcessAdapter, Crypto, BufferAdapter, NodePathAdapter } from "./nodeAdapter";
import { WeChatFS } from "./wechatFS";

// @ts-ignore
const WebAssembly = WXWebAssembly;
WebAssembly.RuntimeError = Error;

const process = new NodeProcessAdapter;
const crypto = new Crypto;
const Buffer = new BufferAdapter;
const pathAdapter = new NodePathAdapter;

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
    return Promise.resolve(process.env.WASM_FILE_PATH);
}

// 防止摇树把内容摇掉,在构建后需要正则删掉
console.log('tree-shaking', getWeChatFS(), getPathAdapter(), getWasmFilePath());
