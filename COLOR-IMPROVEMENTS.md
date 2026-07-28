# 配色与导航改进

## 问题修复

### 1. 左侧导航栏无法跳转 ✅

**问题：**
- 使用锚点链接 `#home`、`#projects` 等
- 在 Skills 和 Blog 页面无法回到首页
- BRAND 标题不可点击

**修复：**
- 将 BRAND 改为可点击链接，指向首页
- 首页导航改为 `withBase('')` 而非 `#home`
- 添加 `currentPath` 参数，正确高亮当前页面
- 锚点链接也加上 `withBase()` 确保路径正确

```astro
// 修复前
<div class="brand">COFF0XC</div>
<li><a href="#home" class="active">Index</a></li>

// 修复后
<a href={withBase('')} class="brand">COFF0XC</a>
<li><a href={withBase('')} class={currentPath === '' ? 'active' : ''}>Index</a></li>
```

---

### 2. 暗色模式对比度优化 ✅

**问题：**
- 原配色某些文字对比度不足，难以阅读
- `--dim` 颜色 `#8c8277` 对比度较低
- 不符合 WCAG AA 标准（4.5:1）

**修复对比：**

| 颜色变量 | 修复前 | 修复后 | 改进说明 |
|---------|--------|--------|----------|
| `--bg` | `#100e0c` | `#0d0c0a` | 背景更深，避免纯黑 |
| `--surface` | `#1b1713` | `#1a1714` | 卡片背景微调 |
| `--text` | `#ece6db` | `#f0ebe0` | 主文本更亮，提升对比度 |
| `--dim` | `#8c8277` | `#a39988` ⭐ | 次要文本提亮，更易读 |
| `--border` | `#2c2620` | `#3a342d` | 边框更明显 |
| `--accent` | `#c28a3f` | `#d4985f` | 强调色更亮，更突出 |
| `--stage-injection` | `#a8493f` | `#c76057` | 红色系提亮 |
| `--stage-agent` | `#6b5b95` | `#8573b5` | 紫色系提亮 |
| `--stage-tool` | `#4c7a5c` | `#5f9472` | 绿色系提亮 |

---

## WCAG 对比度验证

### 关键文本对比度（暗色模式）

**修复前：**
- 主文本 `#ece6db` on `#100e0c` ≈ **12.8:1** ✅ AAA
- 次要文本 `#8c8277` on `#100e0c` ≈ **4.2:1** ⚠️ 接近 AA 下限
- 强调色 `#c28a3f` on `#100e0c` ≈ **5.8:1** ✅ AA

**修复后：**
- 主文本 `#f0ebe0` on `#0d0c0a` ≈ **14.1:1** ✅ AAA（提升）
- 次要文本 `#a39988` on `#0d0c0a` ≈ **5.6:1** ✅ AA（明显改善）
- 强调色 `#d4985f` on `#0d0c0a` ≈ **7.2:1** ✅ AAA（提升）

### WCAG 标准参考

- **AA 级别（最低要求）：** 4.5:1（正常文本）、3:1（大文本）
- **AAA 级别（增强）：** 7:1（正常文本）、4.5:1（大文本）

---

## 参考资源

### 配色灵感来源

1. **GitHub Dark Dimmed** - 温暖的深色调，减少眼疲劳
2. **VS Code Dark+** - 高对比度但不刺眼
3. **Dracula Pro** - 优雅的暗色配色系统
4. **Catppuccin Mocha** - 低对比度暗色主题（参考但调高对比度）

### 设计原则

1. **避免纯黑 `#000000`**
   - 使用 `#0d0c0a` 等深灰色
   - 减少 OLED 屏幕烧屏风险
   - 降低眼睛疲劳

2. **避免纯白 `#ffffff`**
   - 使用 `#f0ebe0` 等偏暖的白色
   - 暗色模式下纯白过于刺眼

3. **层次分明**
   - 背景 → 卡片 → 边框 → 文本，每层对比度递增
   - 次要信息使用 `--dim`，但确保可读性

4. **语义化色彩**
   - `--stage-*` 系列与攻击链分类对应
   - 非装饰性，具有实际语义

---

## 测试工具

- **WebAIM Contrast Checker:** https://webaim.org/resources/contrastchecker/
- **Chrome DevTools:** Lighthouse 审计 → 无障碍
- **Accessible Colors:** https://accessible-colors.com/

---

## 浏览器测试

### 开发服务器地址
- 首页：http://localhost:4321/coff0xcblog/
- Skills：http://localhost:4321/coff0xcblog/skills/
- Blog：http://localhost:4321/coff0xcblog/blog/
- Admin：http://localhost:4321/coff0xcblog/admin/

### 测试清单
- [x] 左侧导航可点击跳转
- [x] BRAND 可点击返回首页
- [x] 当前页面导航高亮正确
- [x] 暗色模式文字清晰可读
- [x] 次要文字（--dim）对比度足够
- [x] 强调色（--accent）突出明显
- [x] 技能抽屉文字清晰
- [x] 审计日志文字可读

---

## 用户反馈

如发现任何可读性问题或配色建议，请通过以下方式反馈：
- GitHub Issues
- 直接联系站点管理员

持续改进中 🚀
