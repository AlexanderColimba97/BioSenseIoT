import { spawnSync } from 'node:child_process';

const productionApiUrl = 'https://biosenseiot-production-e061.up.railway.app';

const result = spawnSync('npx', ['next', 'build'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NEXT_PUBLIC_API_URL: productionApiUrl,
  },
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
