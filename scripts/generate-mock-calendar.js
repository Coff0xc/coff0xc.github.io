// 生成模拟贡献数据用于测试年份切换功能
import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function generateMockCalendar(year) {
  const days = [];
  const monthLabels = [];
  let total = 0;

  // 生成该年度所有日期的贡献数据
  const startDate = new Date(`${year}-01-01`);
  const endDate = new Date(`${year}-12-31`);

  let week = 0;
  let currentDate = new Date(startDate);

  // 找到第一个周日
  while (currentDate.getDay() !== 0) {
    currentDate.setDate(currentDate.getDate() - 1);
  }

  while (currentDate <= endDate || currentDate.getFullYear() === year) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const weekday = currentDate.getDay();

    if (currentDate >= startDate && currentDate <= endDate) {
      // 随机生成贡献数（模拟真实场景）
      const count = Math.random() > 0.3 ? Math.floor(Math.random() * 15) : 0;
      const level = count === 0 ? 0 : Math.min(4, Math.floor(count / 3) + 1);

      days.push({
        date: dateStr,
        week: week,
        weekday: weekday,
        level: level,
        count: count
      });

      total += count;
    }

    currentDate.setDate(currentDate.getDate() + 1);
    if (weekday === 6) week++; // 周六后进入下一周
  }

  // 生成月份标签
  let lastMonth = -1;
  let lastLabelWeek = -Infinity;

  for (let w = 0; w <= week; w++) {
    const daysInWeek = days.filter(d => d.week === w);
    if (daysInWeek.length === 0) continue;

    const firstDay = daysInWeek.sort((a, b) => a.weekday - b.weekday)[0];
    const month = new Date(firstDay.date).getMonth();

    if (month !== lastMonth && w - lastLabelWeek >= 3) {
      monthLabels.push({ week: w, month: month });
      lastMonth = month;
      lastLabelWeek = w;
    }
  }

  return {
    year: year,
    total: total,
    days: days,
    monthLabels: monthLabels
  };
}

const currentYear = new Date().getFullYear();
const calendars = [currentYear, currentYear - 1, currentYear - 2]
  .map(year => generateMockCalendar(year));

// 读取现有数据
const dataPath = join(__dirname, '../src/data/github-data.json');
const data = JSON.parse(readFileSync(dataPath, 'utf-8'));

// 更新 contributionCalendars
data.contributionCalendars = calendars;

data.activity.totalContributions = calendars.find(calendar => calendar.year === currentYear)?.total || 0;

// 写回文件
writeFileSync(dataPath, JSON.stringify(data, null, 2));

console.log('[generate-mock-data] Generated calendars:');
calendars.forEach(cal => {
  console.log(`  - Year ${cal.year}: ${cal.total} contributions, ${cal.days.length} days`);
});
console.log('[generate-mock-data] Updated:', dataPath);
