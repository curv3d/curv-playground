const fs = require('fs');
const { spawn } = require('child_process');
const express = require('express');

const app = express();

app.use(express.static('.'));
app.use(express.text());

function* getXDisplayNumber() {
    const startValue = 99;
    let i = startValue;
    while(true) {
        i -= 1;

        // Never hit zero since 0 is usually used by desktop users.
        if (i <= 0) i = startValue;
        yield ':' + i;
    }
}

app.post('/render', (req, res) => {
  const code = req.body;
  const DISPLAY = getXDisplayNumber().next().value;
  
  const xvfbProcess = spawn(
     'Xvfb',
     [DISPLAY, '-ac', '-nocursor', '-screen', '0', '480x500x24'],
  );

  const curvProcess = spawn(
     'curv',
     ['-' ],
    { env: Object.assign({}, process.env, { DISPLAY, PATH: '/usr/local/bin' }) }
  );

  curvProcess.stdin.write(code);
  curvProcess.stdin.end();

  let statusSet = false;
  let contentTypeSet = false;

  curvProcess.stderr.on('data', (buf) => {
    const data = buf.toString('utf8');
    if (data.indexOf('shape') >= 0) {
        if (!statusSet) { res.status(200);  statusSet = true; }
        if (!contentTypeSet) { res.append('Content-Type', 'image/png'); contentTypeSet = true; }

      setTimeout(() => {
        const screenshotProcess = spawn('maim', ['--hidecursor'], { env: { DISPLAY } });
        screenshotProcess.stdout.on('data', (data) => { res.write(data); });
        screenshotProcess.on('close', () => {
          res.end();
          curvProcess.kill();
          xvfbProcess.kill();
        });
      }, 1000);
    }

    if (data.indexOf('ERROR') < 0) { return; }
    curvProcess.kill();
    xvfbProcess.kill();

    if (!statusSet) { res.status(500);  statusSet = true; }
    if (!contentTypeSet) { res.append('Content-Type', 'plain/text'); contentTypeSet = true; }

    res.write(data);
    res.end();
  });
});

app.listen(9000, () => console.log("Listening"));
