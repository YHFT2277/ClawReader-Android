# ClawReader 代码审查修复脚本
# 运行前请备份重要文件

Write-Host "=== ClawReader 代码修复脚本 ===" -ForegroundColor Green
Write-Host ""

$projectPath = "D:\Projects\ClawReader-Android"
Set-Location $projectPath

# 1. 修复 Android 权限
Write-Host "[1/4] 修复 Android 权限..." -ForegroundColor Yellow
$manifestPath = "android\app\src\main\AndroidManifest.xml"
$manifestContent = @'<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    
    <!-- Android 13+ 权限 -->
    <uses-permission android:name="android.permission.READ_MEDIA_DOCUMENTS" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:requestLegacyExternalStorage="true">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation"
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths"></meta-data>
        </provider>
    </application>
</manifest>
'@

$manifestContent | Out-File -FilePath $manifestPath -Encoding UTF8
Write-Host "✅ AndroidManifest.xml 已更新" -ForegroundColor Green

# 2. 清理重复目录
Write-Host ""
Write-Host "[2/4] 清理重复目录..." -ForegroundColor Yellow

$duplicateDirs = @(
    "renderer\renderer",
    "scripts\scripts",
    "main\main",
    "preload\preload",
    "resources\resources"
)

foreach ($dir in $duplicateDirs) {
    if (Test-Path $dir) {
        Remove-Item -Recurse -Force $dir
        Write-Host "  已删除: $dir" -ForegroundColor Gray
    }
}
Write-Host "✅ 重复目录已清理" -ForegroundColor Green

# 3. 更新 Capacitor 配置
Write-Host ""
Write-Host "[3/4] 更新 Capacitor 配置..." -ForegroundColor Yellow
$capConfigPath = "capacitor.config.ts"
$capConfigContent = @'import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.claw.reader.android',
  appName: 'ClawReader',
  webDir: 'dist-renderer',
  server: {
    androidScheme: 'https'
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    }
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1a2e',
      androidScaleType: 'CENTER_CROP',
    }
  }
};

export default config;
'@

$capConfigContent | Out-File -FilePath $capConfigPath -Encoding UTF8
Write-Host "✅ capacitor.config.ts 已更新" -ForegroundColor Green

# 4. 添加编码检测支持
Write-Host ""
Write-Host "[4/4] 添加编码检测..." -ForegroundColor Yellow
$appVuePath = "renderer\src\App.vue"

# 读取当前内容
$appVueContent = Get-Content $appVuePath -Raw

# 替换文件读取逻辑
$oldCode = @'
    // Convert ArrayBuffer to text
    const decoder = new TextDecoder('utf-8');
    fileContent.value = decoder.decode(result.data);
'@

$newCode = @'
    // Convert ArrayBuffer to text with encoding detection
    let text = '';
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      text = decoder.decode(result.data);
    } catch (e) {
      // Try GBK for Chinese files
      try {
        const decoder = new TextDecoder('gbk');
        text = decoder.decode(result.data);
      } catch (e2) {
        // Fallback to utf-8 without fatal
        const decoder = new TextDecoder('utf-8');
        text = decoder.decode(result.data);
      }
    }
    fileContent.value = text;
'@

$appVueContent = $appVueContent -replace [regex]::Escape($oldCode), $newCode
$appVueContent | Out-File -FilePath $appVuePath -Encoding UTF8
Write-Host "✅ App.vue 编码检测已添加" -ForegroundColor Green

# 完成
Write-Host ""
Write-Host "=== 修复完成 ===" -ForegroundColor Green
Write-Host ""
Write-Host "请手动检查以下事项：" -ForegroundColor Yellow
Write-Host "1. 检查 android/app/build.gradle 中的 SDK 版本" -ForegroundColor White
Write-Host "2. 测试应用功能是否正常" -ForegroundColor White
Write-Host "3. 提交代码到 Git" -ForegroundColor White
Write-Host ""
Write-Host "运行测试：" -ForegroundColor Cyan
Write-Host "  cd android && .\gradlew assembleDebug" -ForegroundColor Gray
