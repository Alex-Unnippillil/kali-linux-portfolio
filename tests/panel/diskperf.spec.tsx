import { test, expect } from '@playwright/test';

test.describe('diskperf panel', () => {
  test('selecting device updates sparkline and tooltip', async ({ page }) => {
    await page.setContent(`
      <select id="device">
        <option value="sda">sda</option>
        <option value="sdb">sdb</option>
      </select>
      <svg id="sparkline" data-read="" data-write=""></svg>
      <div id="tooltip"></div>
      <script>
        const devices = {
          sda: {
            read: [1,2,3,4,5,6,7,8,9,10],
            write: [2,3,4,5,6,7,8,9,10,11]
          },
          sdb: {
            read: [5,4,3,2,1,0,1,2,3,4],
            write: [1,1,2,3,5,8,13,21,34,55]
          }
        };
        const select = document.getElementById('device');
        const sparkline = document.getElementById('sparkline');
        const tooltip = document.getElementById('tooltip');
        function update() {
          const { read, write } = devices[select.value];
          sparkline.setAttribute('data-read', read.join(','));
          sparkline.setAttribute('data-write', write.join(','));
          tooltip.textContent = 'R/W last 10s';
        }
        select.addEventListener('change', update);
        update();
      </script>
    `);

    await expect(page.locator('#sparkline')).toHaveAttribute('data-read', '1,2,3,4,5,6,7,8,9,10');
    await expect(page.locator('#sparkline')).toHaveAttribute('data-write', '2,3,4,5,6,7,8,9,10,11');
    await expect(page.locator('#tooltip')).toHaveText('R/W last 10s');

    await page.selectOption('#device', 'sdb');
    await expect(page.locator('#sparkline')).toHaveAttribute('data-read', '5,4,3,2,1,0,1,2,3,4');
    await expect(page.locator('#sparkline')).toHaveAttribute('data-write', '1,1,2,3,5,8,13,21,34,55');
    await expect(page.locator('#tooltip')).toHaveText('R/W last 10s');
  });
});
