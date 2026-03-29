const fs = require('fs');
const path = require('path');
const dir1 = path.join(process.cwd(), 'src/app/runs/[runId]/_components');
const dir2 = path.join(process.cwd(), 'src/app/runs/[runId]');

function fixDir(d) {
  if (!fs.existsSync(d)) return;
  const files = fs.readdirSync(d).filter(f => f.endsWith('.tsx'));
  for (let f of files) {
    let p = path.join(d, f);
    let c = fs.readFileSync(p, 'utf8');
    let old = c;
    c = c.replace(/\\`/g, '`');
    c = c.replace(/\\\$/g, '$');
    if (c !== old) {
      console.log('Fixed', p);
      fs.writeFileSync(p, c);
    }
  }
}

fixDir(dir1);
fixDir(dir2);
