import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "SympAuthy",
  description: "Documentation site",
  base: '/',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/getting-started/' },
      {
        text: 'Documentation',
        items: [
          { text: 'Overview', link: '/documentation' },
          { text: 'Functional', link: '/functional/' },
          { text: 'Technical', link: '/technical/' }
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
              text: 'Tokens &amp; Claims',
              collapsed: false,
              items: [
                { text: 'Claims', link: '/functional/claims' },
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
              ]
            },
            { text: 'Authorization Webhook', link: '/technical/authorization_webhook' },
            { text: 'Rule Expressions', link: '/technical/rule_expressions' },
            { text: 'Well-known Providers', link: '/technical/well-known_providers' },
            { text: 'Security', link: '/technical/security' },
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/sympauthy' }
    ]
  }
})
