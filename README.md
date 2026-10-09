# 明向校园漫游

基于 Babylon.js 与 Vite 的太原理工大学明向校区第三人称校园漫游原型。包含步行、跑步、跳跃、自行车骑行、地图传送、NPC、图书馆阶梯、南广场、钟楼与湖区大同坊。

当前校园体量根据照片和航拍估算，尚未完成全校精确复刻；人物、场景细节和性能仍在优化。

## 公开测试版

游玩地址：https://jiostrider.github.io/mingxiang-campus/ 。推荐使用电脑和键盘鼠标；首次加载需要下载模型与材质，低性能设备可在设置中选择流畅画质。本版本暂无触屏操作。

生产资源按 `/mingxiang-campus/` 路径构建，发布产物存放在 `gh-pages` 分支，GitHub Pages 从该分支根目录提供页面。更新源码后需重新构建并更新发布分支，推送 `main` 不会自动发布。可用 `node tests/published.mjs` 检查线上初始化、移动、地图和资源请求。

## 运行

安装当前受支持的 Node.js LTS，在项目目录执行：

```sh
npm ci
npm run dev
```

浏览器打开 http://127.0.0.1:5173/ 。生产构建：`npm run build`；构建预览：`npm run preview`。

## 操作

WASD 移动，Shift 跑步，Space 跳跃或骑行刹车，E 骑车或下车，M 地图，Esc 释放鼠标。鼠标控制视角，设置菜单可调整画质。

## 目录

- `src/`：场景、人物、骑行、碰撞与界面逻辑。
- `public/assets/`：本地运行所需人物、材质与环境资源，来源及许可见 `public/assets/NOTICE.md`。
- `models/`：早期校园模型与导入工具。
- `references/`：场景核查、参考截图和建模说明；参考资料不等于已获授权的游戏贴图。
- `tools/`：角色转换与参考资料检查工具。
- `tests/`：Playwright 场景检查；先运行开发服务器，然后执行 `npm run test:browser`。其他专项检查可用 `node tests/library-proportions.mjs` 等命令运行。测试浏览器需安装 Microsoft Edge。

## 视频归档

用户参考视频 `references/user-recordings/20261008-1410-05.7911838.mp4` 已在本地保留原件。该文件约123 MB，不随普通 Git 提交上传，原件校验信息和抽帧索引见同目录 README。克隆仓库不包含该原视频；运行游戏不依赖它。
