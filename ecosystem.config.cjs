/** @type { import('pm2').StartOptions } */
module.exports = {
  apps: [
    {
      name: 'kaoyan-interviewer',
      cwd: __dirname,
      script: 'node_modules/.bin/next',
      args: 'start',
      env: { NODE_ENV: 'production', PORT: 3001 },
      instances: 1,
      autorestart: true,
      watch: false,
    },
  ],
};
