import fs from 'fs'

const configPath = '/etc/sing-box/config.json'
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

// 1. Add outbound
const proxyEu = {
  type: 'vless',
  tag: 'proxy-eu',
  server: 'de1.privatevp.space',
  server_port: 443,
  uuid: '636c571a-13d5-418a-811c-7bc7bd832432',
  flow: 'xtls-rprx-vision',
  tls: {
    enabled: true,
    server_name: 'apple.com',
    utls: {
      enabled: true,
      fingerprint: 'chrome'
    },
    reality: {
      enabled: true,
      public_key: 'BcHX2gj7JBGVasdeoWkyfM5HiENqiPka6uQpjVuRY3s',
      short_id: '8e70f204859bc060'
    }
  }
}

config.outbounds = config.outbounds.filter((o: any) => o.tag !== 'proxy-eu')
config.outbounds.unshift(proxyEu)

// 2. Update DNS
config.dns = {
  servers: [
    {
      tag: 'remote',
      address: 'https://8.8.8.8/dns-query',
      detour: 'proxy-eu'
    },
    {
      tag: 'local',
      address: '8.8.8.8',
      detour: 'direct'
    }
  ],
  rules: [
    {
      // Ensure specific services use remote DNS
      geosite: [
        'telegram',
        'discord',
        'instagram',
        'facebook',
        'openai',
        'chatgpt'
      ],
      server: 'remote'
    },
    {
       // Critical: Keep GitHub direct for updates and databases
       domain_suffix: [
         'github.com',
         'githubusercontent.com',
         'privatevp.space',
         'microsoft.com',
         'apple.com'
       ],
       server: 'local'
    }
  ],
  strategy: 'ipv4_only',
  independent_cache: true
}

// 3. Update Routing
config.route.rules = [
  {
    geoip: ['private'],
    outbound: 'direct'
  },
  {
     domain_suffix: [
        'github.com',
        'githubusercontent.com',
        'privatevp.space',
        'microsoft.com',
        'apple.com'
     ],
     outbound: 'direct'
  },
  {
    geosite: [
      'telegram',
      'discord',
      'instagram',
      'facebook',
      'openai',
      'chatgpt'
    ],
    outbound: 'proxy-eu'
  },
  {
     geoip: ['ru'],
     geosite: ['ru'],
     outbound: 'direct'
  }
]

fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
console.log('Sing-box config updated successfully')
