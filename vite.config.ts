import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig, type PluginOption } from 'vite';

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

export default defineConfig(async () => {
  const isVercelOrNitro = Boolean(
    process.env.VERCEL ||
    process.env.NITRO_PRESET ||
    process.env.TARGET_PLATFORM === 'vercel' ||
    process.env.npm_lifecycle_event === 'build:vercel'
  );

  if (isVercelOrNitro && !process.env.NITRO_PRESET) {
    process.env.NITRO_PRESET = 'vercel';
  }

  const plugins: PluginOption[] = [vinext()];

  if (isVercelOrNitro) {
    const { nitro } = await import('nitro/vite');
    plugins.push(nitro());
  } else {
    // Preserve local Cloudflare development setup
    process.env.WRANGLER_WRITE_LOGS ??= 'false';
    process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
    process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

    const { sites } = await import('@openai/sites-vite-plugin');
    const { cloudflare } = await import('@cloudflare/vite-plugin');
    const hostingConfig = (await import('./.openai/hosting.json', { with: { type: 'json' } })).default;
    const { d1, r2 } = hostingConfig;
    const SITE_CREATOR_PLACEHOLDER_DATABASE_ID = '00000000-0000-4000-8000-000000000000';

    plugins.push(
      sites(),
      cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        config: {
          main: 'vinext/server/app-router-entry',
          compatibility_flags: ['nodejs_compat'],
          d1_databases: d1
            ? [
                {
                  binding: d1,
                  database_name: 'site-creator-d1',
                  database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
                },
              ]
            : [],
          r2_buckets: r2
            ? [
                {
                  binding: r2,
                  bucket_name: 'site-creator-r2',
                },
              ]
            : [],
        },
      })
    );
  }

  return {
    resolve: {
      alias: [
        { find: /^tailwindcss$/, replacement: 'tailwindcss/index.css' },
      ],
    },
    css: { postcss: { plugins: [tailwindcss()] } },
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins,
  };
});

