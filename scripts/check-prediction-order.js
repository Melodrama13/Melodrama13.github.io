import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { validatePredictionScheduleOrderEvents } from '../src/domain/predictionScheduleKeys.js';

const argumentsList = process.argv.slice(2);
const readFileArgument = (name, fallback) => {
  const index = argumentsList.indexOf(name);
  if (index === -1) return fallback;
  const value = argumentsList[index + 1];
  if (!value?.trim() || value.startsWith('--')) throw new Error(`${name} 缺少文件路径。`);
  return value;
};

try {
  const eventsFile = path.resolve(readFileArgument('--events-file', 'public/data/pjsk_events.json'));
  const orderFile = path.resolve(readFileArgument('--order-file', path.join(path.dirname(eventsFile), 'pjsk_prediction_order.json')));
  const [eventsText, orderText] = await Promise.all([
    readFile(eventsFile, 'utf8'),
    readFile(orderFile, 'utf8')
  ]);
  const entries = validatePredictionScheduleOrderEvents(JSON.parse(eventsText), JSON.parse(orderText));
  console.log(`预测顺序检查通过：${entries.length} 个数字活动位置。`);
} catch (error) {
  console.error('预测顺序检查失败：', error.message);
  process.exitCode = 1;
}
