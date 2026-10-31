import { defineConfig } from 'vitepress'
import { sympauthyCodeTheme } from './code-theme.ts'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "SympAuthy",
  description: "Documentation site",
  base: '/',
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico', sizes: '32x32' }],
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }],
    ['meta', { name: 'theme-color', content: '#7B1E3A' }]
  ],
  markdown: {
    theme: { light: sympauthyCodeTheme, dark: sympauthyCodeTheme }
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: { src: '/logo.svg', alt: '' },
    siteTitle: 'Symp<span class="wordmark-strong">Authy</span>',

    nav: [
      { text: 'Getting Started', link: '/getting-started/' },
      {
        text: 'Documentation',
        items: [
          { text: 'Overview', link: '/documentation' },
          { text: 'Functional', link: '/functional/' },
          { text: 'Technical', link: '/technical/' },
          { text: 'Testcontainers', link: '/testcontainers/' }
        ]
      }
    ],

    sidebar: {
      '/getting-started/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Overview', link: '/getting-started/' }
          ]
        }
      ],
      '/functional/': [
        {
          text: 'Functional Documentation',
          items: [
            { text: 'Overview', link: '/functional/' },
            { text: 'How it works', link: '/functional/how_it_works' },
            {
              text: 'Clients &amp; Audiences',
              collapsed: false,
              items: [
                { text: 'Audience', link: '/functional/audience' },
                { text: 'Client', link: '/functional/client' },
              ]
            },
            {
              text: 'Authentication',
              collapsed: false,
              items: [
                { text: 'Authentication', link: '/functional/authentication' },
                { text: 'Interactive Flow', link: '/functional/interactive_flow' },
              ]
            },
            {
              text: 'User Accounts',
              collapsed: false,
              items: [
                { text: 'Invitation', link: '/functional/invitation' },
                { text: 'End-User Management', link: '/functional/end-user_management' },
              ]
            },
            {
              text: 'Authorization',
              collapsed: false,
              items: [
                { text: 'Scopes', link: '/functional/scope' },
                { text: 'Consent', link: '/functional/consent' },
                { text: 'User Authorization', link: '/functional/user_authorization' },
                { text: 'Client Authorization', link: '/functional/client_authorization' },
                { text: 'Delegation', link: '/functional/delegation' },
              ]
            },
            {
              text: 'Claims',
              collapsed: false,
              items: [
                { text: 'Overview', link: '/functional/claims' },
                { text: 'Kinds of claims', link: '/functional/claim_kinds' },
                { text: 'Access Control', link: '/functional/claim_access' },
              ]
            },
            {
              text: 'Grants &amp; Tokens',
              collapsed: false,
              items: [
                { text: 'Grant', link: '/functional/grant' },
                { text: 'Tokens', link: '/functional/tokens' },
              ]
            },
          ]
        }
      ],
      '/technical/': [
        {
          text: 'Technical Documentation',
          items: [
            { text: 'Overview', link: '/technical/' },
            {
              text: 'Configuration',
              collapsed: false,
              items: [
                { text: 'Overview', link: '/technical/configuration/' },
                { text: 'Environments', link: '/technical/configuration/environments' },
                { text: 'Database', link: '/technical/configuration/database' },
                { text: 'Mail', link: '/technical/configuration/mail' },
                { text: 'Admin', link: '/technical/configuration/admin' },
                { text: 'Client', link: '/technical/configuration/client' },
                { text: 'Audience', link: '/technical/configuration/audience' },
                { text: 'Authorization', link: '/technical/configuration/authorization' },
                { text: 'Invitation', link: '/technical/configuration/invitation' },
                { text: 'Provider', link: '/technical/configuration/provider' },
                { text: 'Claim', link: '/technical/configuration/claim' },
                { text: 'Scope', link: '/technical/configuration/scope' },
                { text: 'CORS', link: '/technical/configuration/cors' },
                { text: 'Security Context', link: '/technical/configuration/security-context' },
                { text: 'Advanced', link: '/technical/configuration/advanced' },
              ]
            },
            { text: 'OAuth 2.1 & OpenID Compatibility Matrix', link: '/technical/oauth2_compatibility' },
            {
              text: 'API',
              collapsed: false,
              items: [
                { text: 'Overview', link: '/technical/api/' },
                { text: 'Flow API', link: '/technical/api/flow' },
                { text: 'Client API', link: '/technical/api/client' },
                { text: 'Admin API', link: '/technical/api/admin' },
                { text: 'Collections', link: '/technical/api/collections' },
              ]
            },
            { text: 'Authorization Webhook', link: '/technical/authorization_webhook' },
            {
              text: 'Expressions',
              link: '/technical/expressions/',
              collapsed: false,
              items: [
                { text: 'Functions', link: '/technical/expressions/functions' },
              ]
            },
            { text: 'Well-known Providers', link: '/technical/well-known_providers' },
            { text: 'Security', link: '/technical/security' },
            {
              text: 'Monitoring',
              link: '/technical/monitoring/',
              collapsed: false,
              items: [
                { text: 'Logs', link: '/technical/monitoring/logs' },
                { text: 'Conditions', link: '/technical/monitoring/conditions' },
                { text: 'Metrics', link: '/technical/monitoring/metrics' },
                { text: 'Traces', link: '/technical/monitoring/traces' },
              ]
            },
          ]
        }
      ],
      '/testcontainers/': [
        {
          text: 'Testcontainers Documentation',
          items: [
            { text: 'Overview', link: '/testcontainers/' },
            { text: 'Getting started', link: '/testcontainers/getting_started' },
            { text: 'Configuration', link: '/testcontainers/configuration' },
            {
              text: 'Interactive Flow',
              link: '/testcontainers/interactive_flow',
              collapsed: false,
              items: [
                { text: 'Server-initiated Flows', link: '/testcontainers/server_initiated_flows' },
              ]
            },
            { text: 'Clients', link: '/testcontainers/clients' },
            { text: 'Multi-factor Authentication', link: '/testcontainers/mfa' },
            { text: 'Invitation', link: '/testcontainers/invitation' },
            { text: 'Admin API', link: '/testcontainers/admin' },
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/sympauthy' }
    ]
  }
})
