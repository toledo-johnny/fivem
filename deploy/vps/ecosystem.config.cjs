module.exports = {
  apps: [
    {
      name: 'portal-api',
      cwd: '/opt/projeto-fivem/bot-discord',
      script: 'src/scripts/runRuntime.js',
      args: '.env.vps ./src/api.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'discord-bot',
      cwd: '/opt/projeto-fivem/bot-discord',
      script: 'src/scripts/runRuntime.js',
      args: '.env.vps ./src/index.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
