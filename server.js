const fs = require('fs');
const { spawn } = require('child_process');
const express = require('express');

const app = express();

app.use(express.static('.'));
app.use(express.text());

app.post('/render', (req, res) => {
  const code = req.body;
  
  const xvfbCurvProcess = spawn(
     'xvfb-run',
     [
       '--auto-servernum',
       '-s', '-ac -nocursor -screen 0 640x640x24',
       'curv',
       '-o', 'png',
       '-O', 'xsize=640',
       '-O', 'ysize=640',
       '-'
     ]
  );

  xvfbCurvProcess.stdin.write(code);
  xvfbCurvProcess.stdin.end();

  let statusSet = false;
  let contentTypeSet = false;

  xvfbCurvProcess.stderr.on('data', (buf) => {
    const data = buf.toString('utf8');
    if (data.indexOf('ERROR') < 0) { return; }

    if (!statusSet) { res.status(500);  statusSet = true; }
    if (!contentTypeSet) { res.append('Content-Type', 'plain/text'); contentTypeSet = true; }

    res.write(data);
  });

  xvfbCurvProcess.stdout.on('data', (buf) => {
    if (!statusSet) { res.status(200);  statusSet = true; }
    if (!contentTypeSet) { res.append('Content-Type', 'image/png'); contentTypeSet = true; }

    res.write(buf);
  });

  xvfbCurvProcess.on('close', () => {
    res.end();
    xvfbCurvProcess.kill();
  });
});

app.listen(9000, () => console.log("Listening"));
