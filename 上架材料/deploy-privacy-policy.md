# 隐私政策网页部署指南

## 部署方式

### 方式一：GitHub Pages（推荐，免费）

#### 步骤 1：创建仓库
1. 登录 GitHub：https://github.com
2. 创建新仓库：`clawreader-privacy`
3. 设置为 **Public**（公开）

#### 步骤 2：上传文件
```bash
# 克隆仓库
git clone https://github.com/YHFT2277/clawreader-privacy.git
cd clawreader-privacy

# 复制隐私政策文件
cp "D:\Projects\ClawReader-Android\上架材料\privacy-policy.html" index.html

# 提交并推送
git add index.html
git commit -m "Add privacy policy"
git push origin main
```

#### 步骤 3：启用 GitHub Pages
1. 进入仓库 Settings → Pages
2. Source 选择 "Deploy from a branch"
3. Branch 选择 "main"，文件夹选择 "/ (root)"
4. 点击 Save

#### 步骤 4：访问地址
- 等待 1-2 分钟
- 访问：https://yhft2277.github.io/clawreader-privacy

---

### 方式二：Gitee Pages（国内访问快）

#### 步骤 1：创建仓库
1. 登录 Gitee：https://gitee.com
2. 创建新仓库：`clawreader-privacy`
3. 设置为 **公开**

#### 步骤 2：上传文件
```bash
# 克隆仓库
git clone https://gitee.com/YHFT2277/clawreader-privacy.git
cd clawreader-privacy

# 复制隐私政策文件
cp "D:\Projects\ClawReader-Android\上架材料\privacy-policy.html" index.html

# 提交并推送
git add index.html
git commit -m "Add privacy policy"
git push origin master
```

#### 步骤 3：启用 Gitee Pages
1. 进入仓库 → 服务 → Gitee Pages
2. 选择分支 "master"，目录 "/"
3. 点击 "启动"

#### 步骤 4：访问地址
- 访问：https://YHFT2277.gitee.io/clawreader-privacy

---

### 方式三：腾讯云/阿里云静态托管（国内稳定）

#### 腾讯云 COS + CDN
1. 注册腾讯云：https://cloud.tencent.com
2. 创建 COS 存储桶
3. 上传 `privacy-policy.html` 文件
4. 开启静态网站 hosting
5. 配置自定义域名（可选）

费用：约 ¥1-5/月

---

## 推荐方案

| 方案 | 优点 | 缺点 | 费用 |
|------|------|------|------|
| GitHub Pages | 免费、稳定、与项目关联 | 国内访问慢 | 免费 |
| Gitee Pages | 国内访问快、中文界面 | 需实名认证 | 免费 |
| 腾讯云 COS | 国内最快、可绑域名 | 需付费 | ¥1-5/月 |

**建议**：
- 国内上架：用 Gitee Pages
- 海外上架：用 GitHub Pages
- 两者都上：两个都部署

---

## 隐私政策 URL

部署后，在应用信息中填写：

| 平台 | URL 格式 |
|------|---------|
| GitHub Pages | `https://yhft2277.github.io/clawreader-privacy` |
| Gitee Pages | `https://YHFT2277.gitee.io/clawreader-privacy` |

---

## 验证部署成功

1. 打开浏览器访问上述 URL
2. 确认页面显示正常
3. 检查内容完整无乱码
4. 确认是 HTTPS（安全连接）

---

## 更新隐私政策

如需更新：
1. 修改 `privacy-policy.html`
2. 重新提交到仓库
3. GitHub/Gitee Pages 会自动更新
4. 更新应用中的生效日期

---

**部署时间**：5分钟
**优先级**：高（上架必需）
