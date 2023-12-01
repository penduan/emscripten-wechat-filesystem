import mocha from "mocha";
import { execSync,exec, spawnSync } from "child_process";
import { buildAsset, removeAsset } from "../test/assetBuild";

buildAsset();
execSync("wechat-devtools-cli auto --project /home/mensheng/projects/emscripten-wechat-filesystem --auto-port 9420");

spawnSync("npm", ["run", "test", "--", "--delay"], {
  stdio: "inherit"
});

removeAsset();
