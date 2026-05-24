# ClawReader Android 版

## 项目说明

这是 ClawReader 的 Android 手机版，基于 Capacitor + Vue 3 开发。

## 与桌面版的关系

| 版本 | 位置 | 用途 |
|------|------|------|
| 桌面版 | `C:\Users\17703\Desktop\PDFAI\` | Windows/Mac 桌面应用 |
| Android 版 | `D:\Projects\ClawReader-Android\` | Android 手机应用 |

## 技术栈

- **前端**: Vue 3 + Vite
- **移动端框架**: Capacitor 7
- **构建工具**: Gradle (Android)
- **自动构建**: GitHub Actions

## 开发命令

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建 Web 资源
npm run build

# 同步到 Android 项目
npm run build:android

# 打开 Android Studio
npx cap open android
```

## GitHub Actions 自动构建

推送代码到 GitHub 后自动构建 APK：

1. 访问 GitHub 仓库的 Actions 页面
2. 查看构建状态
3. 构建完成后下载 APK

## 注意事项

- 桌面版代码保留在 `main/`、`preload/`、`scripts/` 目录，不影响手机版
- 手机版使用 `capacitor.config.ts` 配置
- Android 项目代码在 `android/` 目录
