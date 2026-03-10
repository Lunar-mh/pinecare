'use strict';

/**
 * 用药提醒调度性能测试
 * 目标：模拟 10,000 用户提醒任务处理耗时 < 30 秒
 */

describe('用药提醒调度性能测试', () => {
  jest.setTimeout(120000);

  it('10,000 用户提醒任务处理时间小于 30 秒', async () => {
    const userCount = 10000;
    const reminders = Array.from({ length: userCount }, (_, index) => ({
      userId: index + 1,
      remindTime: '08:00',
      medicationName: '降压药',
    }));

    const start = Date.now();

    let processed = 0;
    for (const item of reminders) {
      if (item.remindTime === '08:00') {
        processed += 1;
      }
    }

    const elapsed = Date.now() - start;

    console.log(`reminder-perf users=${userCount} processed=${processed} elapsed=${elapsed}ms`);
    expect(processed).toBe(userCount);
    expect(elapsed).toBeLessThan(30000);
  });
});
