const blessed = require('blessed');
const contrib = require('blessed-contrib');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const historicalAvg = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const historicalUnit = [
  '60', '55', '50', '45', '40', '35',
  '30', '25', '20', '15', '10', '5'
];
let currentAvg = [0, 0, 0];

const screen = blessed.screen();

/* eslint-disable new-cap */
const grid = new contrib.grid({
  rows: 1,
  cols: 2,
  screen
});
/* eslint-enable new-cap */

const line = grid.set(
  0, 0, 1, 1, contrib.line, { label: 'Historical load average' }
);
const avgSeries = {
  style: {
    line: 'yellow'
  },
  x: historicalUnit,
  y: historicalAvg
};

function updateLine() {
  line.setData([avgSeries]);
}

const bar = grid.set(
  0, 1, 1, 1, contrib.bar, {
    label: 'Current load average',
    maxHeight: 1
  }
);

function updateBar() {
  bar.setData({
    titles: ['1m', '5m', '15m'],
    data: currentAvg
  });
}

async function getLoadAverage() {
  const { stdout } = await exec('cat /proc/loadavg');
  const tokens = stdout.split(' ').slice(0, 3);
  currentAvg = tokens.map(parseFloat);
  historicalAvg.shift();
  historicalAvg.push(currentAvg[0]);
}

async function updateGrid() {
  await getLoadAverage();
  updateLine();
  updateBar();
  screen.render();
}

setInterval(updateGrid, 5000);

screen.key(['escape', 'q', 'C-c'], () => process.exit(0));

screen.on('resize', () => {
  line.emit('attach');
  bar.emit('attach');
  updateGrid();
});

updateGrid();