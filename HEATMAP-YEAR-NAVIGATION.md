# 贡献热力图 - 按年份浏览功能

## 🎯 功能概述

热力图现在支持按**自然年份**显示，而不是"过去 365 天"，并提供**翻页功能**查看不同年份的贡献数据。

## ✨ 主要改进

### 1. **按年份组织数据**
- ✅ 显示完整自然年（2026、2025、2024 等）
- ✅ 自动获取最近 3 年的数据
- ✅ 每个年份独立存储和显示

### 2. **翻页导航**
- ✅ 左右箭头按钮切换年份
- ✅ 显示当前年份和该年度总贡献数
- ✅ 到达边界时按钮自动禁用
- ✅ 默认显示最新年份

### 3. **克制的视觉设计**
- ✅ 移除所有入场动画（直接显示）
- ✅ 简化 hover 效果（scale 1.25，无旋转）
- ✅ 移除 tooltip 弹出动画
- ✅ 统一的卡片风格（与其他模块一致）
- ✅ 快速过渡（0.12s ease-out）

## 📂 修改的文件

### 1. **数据获取脚本**
`scripts/fetch-github-data.mjs`
- 新增 `fetchContributionCalendarForYear(year)` - 获取指定年份数据
- 新增 `fetchContributionCalendars()` - 并行获取多个年份
- 修改数据结构：`contributionCalendar` → `contributionCalendars[]`

### 2. **组件更新**
`src/components/ContributionHeatmap.astro`
- 接收 `calendars[]` 数组而不是单个日历
- 渲染多个年份数据（默认隐藏，通过 `.active` 类显示当前年份）
- 添加年份导航控件（上一年/下一年按钮）

`src/components/ActivitySection.astro`
- 更新 Props 接口，接收 `calendars` 数组
- 传递给 ContributionHeatmap

`src/pages/index.astro`
- 更新数据传递：`contributionCalendars` 而不是单独的 `days/monthLabels/total`

### 3. **客户端脚本**
`src/scripts/heatmap.client.ts` (新建)
- 年份切换逻辑
- 按钮状态管理（禁用/启用）
- Tooltip 显示逻辑
- 国际化支持（中英文切换）

### 4. **样式更新**
`src/styles/global.css`
- 新增 `.heatmap-controls` - 导航控件容器
- 新增 `.heatmap-nav-btn` - 箭头按钮样式
- 新增 `.heatmap-year-display` - 年份和总数显示
- 新增 `.heatmap-container` - 年份数据容器
- 新增 `.heatmap-year-data` - 单个年份数据（默认隐藏，`.active` 显示）
- 移除所有动画效果（`animation`, `@keyframes`）
- 简化过渡效果

## 🎨 UI 设计

```
┌─────────────────────────────────────────────────────┐
│ Contribution Activity                               │
│ GitHub activity by year                             │
│                                                     │
│              ◀  2026  1,234 contributions  ▶       │
├─────────────────────────────────────────────────────┤
│ Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct…  │
│ ▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢ │
│ ▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢ │
│ ▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢ │
│ ▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢ │
│ ▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢ │
│ ▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢ │
│ ▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢ │
│                                                     │
│ Less  ▢ ▢ ▢ ▢ ▢  More                              │
└─────────────────────────────────────────────────────┘
```

## 🚀 使用方式

### 用户操作
1. **查看当前年份** - 默认显示最新年份（2026）
2. **切换到上一年** - 点击左箭头 ◀
3. **切换到下一年** - 点击右箭头 ▶
4. **查看详细数据** - Hover 方块显示日期和贡献数

### 自动行为
- 首次加载显示最新年份
- 到达最早/最晚年份时箭头按钮禁用
- 切换年份时平滑淡入淡出（0.3s）
- 贡献总数实时更新

## 📊 数据结构

### GitHub Data JSON
```json
{
  "contributionCalendars": [
    {
      "year": 2026,
      "total": 1234,
      "days": [
        { "date": "2026-01-01", "week": 0, "weekday": 3, "level": 2, "count": 5 }
      ],
      "monthLabels": [
        { "week": 0, "month": 0 }
      ]
    },
    {
      "year": 2025,
      "total": 987,
      "days": [...],
      "monthLabels": [...]
    }
  ]
}
```

## ⚡ 性能优化

### 1. **移除动画开销**
- ❌ 365 个方块入场动画（原 ~2.6 秒）
- ❌ 持续呼吸/脉冲动画（持续 CPU 占用）
- ❌ Tooltip 弹出动画
- ✅ 仅保留必要的 hover 放大（0.12s）

### 2. **高效切换**
- 使用 CSS `display: none` 隐藏非活动年份
- 仅对活动年份应用 `opacity` 过渡
- 避免重排（reflow），仅触发重绘（repaint）

### 3. **按需加载**
- 仅获取最近 3 年数据（可配置）
- 使用 `Promise.allSettled` 并行获取
- 单个年份失败不影响其他年份

## 🔧 配置选项

### 获取更多年份
编辑 `scripts/fetch-github-data.mjs:165`：
```javascript
const years = [currentYear, currentYear - 1, currentYear - 2]; // 改为 4 年
```

### 修改默认显示年份
修改 `src/components/ContributionHeatmap.astro:67`：
```astro
{sortedCalendars.map((cal, index) => {
    // index === 0 显示最新，index === sortedCalendars.length - 1 显示最早
    const isDefault = index === 0; // 改为其他逻辑
})}
```

## 🎯 对比：改进前后

| 特性 | 改进前 | 改进后 |
|------|--------|--------|
| 时间范围 | 过去 365 天（滚动窗口） | 完整自然年（2026、2025 等） |
| 导航方式 | 无，只能看一个时间段 | 左右箭头翻页 |
| 入场动画 | 365 个方块交错入场（~2.6s） | 无动画，直接显示 |
| Hover 效果 | scale(1.4) | scale(1.25) |
| Tooltip | 弹出动画（0.15s） | 即时显示 |
| 数据更新 | 每次构建重新获取 | 多年份一次性获取 |
| 视觉风格 | 装饰性（渐变、阴影、光晕） | 克制简洁（统一设计语言） |

## ✅ 完成状态

- ✅ 按年份获取数据
- ✅ 多年份存储结构
- ✅ 翻页 UI 组件
- ✅ 客户端切换逻辑
- ✅ 移除所有入场动画
- ✅ 简化 hover 效果
- ✅ 统一视觉风格
- ✅ TypeScript 类型安全
- ✅ 响应式设计
- ✅ 国际化支持

---

**访问地址：** http://localhost:4321/coff0xcblog/

刷新浏览器即可看到新的按年份浏览功能！
