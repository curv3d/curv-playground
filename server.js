const fs = require('fs');
const { spawn } = require('child_process');
const express = require('express');

const app = express();

app.use(express.static('.'));
app.use(express.text());

app.post('/render-3d', (req, res) => {
  const code = req.body + " >> extrude 0.00000001 >> set_bbox [640, 640, 640]";
  
  const child = spawn(
    'curv',
    ['-o', 'gltf', '-O', 'jit', '-O', 'vsize=0.6', '-']
  );
  child.stdin.write(code);
  child.stdin.end();

  let statusSet = false;
  let contentTypeSet = false;
  let isSuccess = false;
  let skipLines = 0;

  child.stdout.on('data', (data) => {
    res.write(data);
  });
  
  child.stderr.on('data', (data) => {
    if (data.indexOf('ERROR') < 0) { return; }
    if (!statusSet) { res.status(500);  statusSet = true; }
    if (!contentTypeSet) { res.append('Content-Type', 'plain/text'); contentTypeSet = true; }

    res.write(data);
  });

  child.on('close', (code) => {
    res.end();
  });
});

app.listen(9000, () => console.log("Listening"));
