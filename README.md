# Grok反代

使用方式：
- `pnpm install`安装依赖（没有pnpm的话npm应该也行）
- `npm run build`或`pnpm build`生成`config.yml`
- 修改`config.yml`
- 获取cookie并放入`cookies`文件夹（参考 https://gxcgf4l6b2y.feishu.cn/docx/BehUdyFhpo4lx5xgdGXcgdpYnZM ）
- `npm start`或`pnpm start`启动
- 启动后支持继续在`cookies`文件夹中添加或删除cookie，会自动识别

使用方式（Docker）：
- 配置Volume `/data`到一个指定文件夹
- 启动容器后`config.yml`和`cookies`会出现在该文件夹中
- 修改`config.yml`后重启容器生效

调用方式：
- 使用cookie文件名（不加`.txt`后缀）为key调用则会使用对应文件中的cookie
- 不带任何key（或使用`cookies`文件夹中不存在的文件名为key）则随机选择一个cookie
- 模型不管选什么都会调用grok-3