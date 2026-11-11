import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.drankapp.app',
  appName: '喝多少',
  webDir: 'dist',
  backgroundColor: '#14110f',
  plugins: {
    SystemBars: { style: 'DARK' },
  },
}

export default config
