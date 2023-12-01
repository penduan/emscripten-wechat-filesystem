# emscripten-wechat-filesystem
为Emscripten适配了微信小程序的文件管理系统

## 使用方式

在`emcc`构建时使用 `--pre-js ./dist/wechatfs.js`引入或者在粘贴到`emscripten`构建后的模块代码前面

构建时选项`-sENVIRONMENT=node -sNO_DYNAMIC_EXECTION -lnodefs.js`

```bash
# 为emscripten添加适配
sed -i "s/require(.fs.)/getWeChatFS()/g" ./out.js
sed -i "s/require(.path.)/getPathAdapter()/g" ./out.js
sed -i 's/getBinaryPromise()\./getWasmFilePath()./g' ./out.js

# 将`WASM_FILE_PATH`字符串替换为小程序包中的wasm文件路径
sed -i 's/WASM_FILE_PATH/out.wasm/g' ./out.js
```
