# 年份热力图功能 - 使用说明

## ✅ 功能已完成

贡献热力图现在支持：
- ✅ 按自然年份显示（2026、2025、2024）
- ✅ 左右箭头翻页切换年份
- ✅ 默认显示 2026 年
- ✅ 实时更新年份和贡献总数
- ✅ 克制的动画效果（无入场动画，快速 hover）

## 🎯 当前状态

**开发服务器：** http://localhost:4321/coff0xcblog/

**数据状态：**
- 📦 使用模拟数据（因为网络无法访问 GitHub）
- 📊 已生成 2024-2026 年共 3 年的完整数据
- 🎲 随机生成的贡献数（模拟真实场景）

## 🚀 如何测试

### 1. **刷新浏览器**
访问开发服务器并刷新页面：http://localhost:4321/coff0xcblog/

### 2. **操作年份切换**
- 默认显示 **2026 年**
- 点击 **左箭头 ◀** 切换到 2025 年
- 点击 **右箭头 ▶** 返回 2026 年
- 继续点击左箭头可以查看 2024 年

### 3. **查看控制台日志**
打开浏览器开发者工具（F12），查看控制台：
```
Heatmap initialized with years: [2026, 2025, 2024] currentIndex: 0
Display updated: {year: 2026, total: 1921, ...}
```

点击按钮时会看到：
```
Prev button clicked, currentIndex: 0
Display updated: {year: 2025, total: 1702, ...}
```

## 🔧 网络问题解决方案

由于当前网络无法访问 GitHub（`ETIMEDOUT`），提供了两种方案：

### 方案 A：使用模拟数据（当前方案）

```bash
# 生成模拟数据
node scripts/generate-mock-calendar.js

# 构建（跳过 fetch-data）
npx astro build

# 或开发服务器
npx astro dev
```

### 方案 B：配置代理访问 GitHub

如果有代理，修改环境变量：
```bash
# Windows PowerShell
$env:HTTPS_PROXY="http://your-proxy:port"
npm run fetch-data

# 或在 .env 文件中添加
HTTPS_PROXY=http://your-proxy:port
```

## 📂 相关文件

### 数据文件
- `src/data/github-data.json` - 包含 3 年的贡献数据

### 脚本
- `scripts/generate-mock-calendar.js` - 生成模拟数据
- `scripts/fetch-github-data.mjs` - 从 GitHub 获取真实数据

### 组件
- `src/components/ContributionHeatmap.astro` - 热力图组件
- `src/scripts/heatmap.client.ts` - 客户端交互逻辑

### 样式
- `src/styles/global.css` - 热力图样式（`.heatmap-*` 类）

## 🎨 UI 功能

### 导航控件
```
◀  2026  1,921 contributions  ▶
```

- **左箭头（◀）** - 查看上一年
- **右箭头（▶）** - 查看下一年
- **年份显示** - 当前查看的年份
- **贡献总数** - 该年度的总贡献数

### 热力图
- **365/366 个方块** - 代表全年每一天
- **5 级颜色** - Level 0-4（无贡献到高贡献）
- **Hover 提示** - 显示日期和具体贡献数
- **月份标签** - 顶部显示月份

### 按钮状态
- 在 2026 年时，右箭头禁用
- 在 2024 年时，左箭头禁用
- 禁用按钮半透明显示

## 🐛 故障排查

### 问题 1：按钮点击无响应

**检查控制台：**
```javascript
// 应该看到初始化日志
Heatmap initialized with years: [2026, 2025, 2024]

// 点击按钮应该看到
Prev button clicked, currentIndex: 0
```

**如果没有日志：**
1. 检查脚本是否加载：`<script> import '../scripts/heatmap.client.ts'; </script>`
2. 清除浏览器缓存并刷新
3. 检查元素是否存在：`document.getElementById('heatmap-prev')`

### 问题 2：数据为空

```bash
# 重新生成模拟数据
node scripts/generate-mock-calendar.js

# 检查数据
cat src/data/github-data.json | grep contributionCalendars -A 5
```

### 问题 3：年份不是 2026

检查组件初始化逻辑：
```typescript
// src/components/ContributionHeatmap.astro
const currentYear = 2026;
const defaultIndex = sortedCalendars.findIndex(cal => cal.year === currentYear);
```

## 📊 数据结构

```json
{
  "contributionCalendars": [
    {
      "year": 2026,
      "total": 1921,
      "days": [
        {
          "date": "2026-01-01",
          "week": 0,
          "weekday": 4,
          "level": 2,
          "count": 5
        }
      ],
      "monthLabels": [
        { "week": 0, "month": 0 }
      ]
    }
  ]
}
```

## ✨ 后续优化建议

1. **键盘导航**：添加左右箭头键支持
2. **URL 参数**：支持 `?year=2025` 直接跳转
3. **动画优化**：添加年份切换时的淡入淡出
4. **更多年份**：扩展到 5 年或更多
5. **年份选择器**：下拉菜单快速跳转

---

**当前状态：** ✅ 功能完整，使用模拟数据运行

**访问地址：** http://localhost:4321/coff0xcblog/

**刷新浏览器测试年份切换功能！** 🎉
