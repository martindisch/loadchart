const blessed = require('blessed');
const contrib = require('blessed-contrib');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

/*
 * Global data
 */

const longTerm = process.argv.length >= 3 && process.argv[2] === 'long';
const historicalAvg = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const historicalUnit = longTerm ? [
  '180', '165', '150', '135', '120', '105',
  '90', '75', '60', '45', '30', '15'
] : [
  '60', '55', '50', '45', '40', '35',
  '30', '25', '20', '15', '10', '5'
];


/*
 * Data gathering function
 */

async function getLoadAverage() {
  const { stdout } = await exec('cat /proc/loadavg');
  const tokens = stdout.split(' ').slice(0, 3);
  return tokens.map(parseFloat);
}


/*
 * Screen & grid setup
 */

const screen = blessed.screen();

/* eslint-disable new-cap */
const grid = new contrib.grid({
  rows: 1,
  cols: 4,
  screen
});
/* eslint-enable new-cap */


/*
 * Line chart
 */

const line = grid.set(
  0, 0, 1, 3, contrib.line, { label: 'Historical load average' }
);

const avgSeries = {
  style: {
    line: 'yellow'
  },
  x: historicalUnit,
  y: historicalAvg
};

async function updateLine() {
  const currentAvg = await getLoadAverage();
  historicalAvg.shift();
  historicalAvg.push(longTerm ? currentAvg[2] : currentAvg[0]);
  line.setData([avgSeries]);
  screen.render();
}


/*
 * Bar chart
 */

const bar = grid.set(
  0, 3, 1, 1, contrib.bar, {
    label: 'Current load average',
    maxHeight: 1,
    barWidth: 3,
    xOffset: 1,
    barSpacing: 2
  }
);

async function updateBar() {
  const currentAvg = await getLoadAverage();
  bar.setData({
    titles: ['1m', '5m', '15m'],
    data: currentAvg
  });
  screen.render();
}


/*
 * Screen handling for exiting & resizing
 */

screen.key(['escape', 'q', 'C-c'], () => process.exit(0));

screen.on('resize', () => {
  line.emit('attach');
  bar.emit('attach');
  updateLine();
  updateBar();
});


/*
 * Startup
 */

// Register update functions
setInterval(updateLine, longTerm ? 15 * 60 * 1000 : 5 * 1000);
setInterval(updateBar, 5 * 1000);

// Run them once to draw current state
updateLine();
updateBar();
