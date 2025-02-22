# Grok反代

仍然处于早期阶段

使用方式：
- `pnpm install`安装依赖（没有pnpm的话npm应该也行）
- 修改`config.yml`
- 获取cookie并放入`cookies`文件夹（参考 https://gxcgf4l6b2y.feishu.cn/docx/BehUdyFhpo4lx5xgdGXcgdpYnZM ）
- `npm start`或`pnpm start`启动

调用方式：
- 使用`#<id>`为key调用则会使用第`id`个cookie。如key为`#0`使用第0个
- 不带任何key则随机选择一个cookie