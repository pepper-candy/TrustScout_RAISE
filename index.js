const { spawn } = require('child_process');

const next = spawn('npm', ['run', 'start'], { stdio: 'inherit', shell: true });

next.on('close', (code) => {
  process.exit(code);
});