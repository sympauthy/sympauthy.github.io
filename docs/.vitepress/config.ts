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
          { text: 'Overview', link: '/documentation/' },
          { text: 'Functional', link: '/documentation/functional/' },
          { text: 'Technical', link: '/documentation/technical/' }
        ]
      },
      { text: 'Contributing', link: '/documentation/contributing/' }
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
      '/documentation/functional/': [
        {
          text: 'Functional Documentation',
          items: [
            { text: 'Overview', link: '/documentation/functional/' },
            { text: 'How it works', link: '/documentation/functional/how_it_works' },
            { text: 'Authentication', link: '/documentation/functional/authentication' },
            { text: 'Tokens', link: '/documentation/functional/tokens' },
            { text: 'Claims', link: '/documentation/functional/claims' },
            { text: 'Authorization', link: '/documentation/functional/authorization' },
            { text: 'End-User Management', link: '/documentation/functional/end-user_management' },
            { text: 'Client', link: '/documentation/functional/client' },
            { text: 'Interactive Flow', link: '/documentation/functional/interactive_flow' },
          ]
        }
      ],
      '/documentation/technical/': [
        {
          text: 'Technical Documentation',
          items: [
            { text: 'Overview', link: '/documentation/technical/' },
            { text: 'Configuration', link: '/documentation/technical/configuration' },
            { text: 'OAuth 2.0, 2.1 & OpenID Compatibility Matrix', link: '/documentation/technical/oauth2_compatibility' },
            { text: 'Flow API', link: '/documentation/technical/flow_api' },
            { text: 'Client API', link: '/documentation/technical/client_api' },
            { text: 'Admin API', link: '/documentation/technical/admin_api' },
            { text: 'Security', link: '/documentation/technical/security' },
          ]
        }
      ],
      '/documentation/': [
        {
          text: 'Documentation',
          items: [
            { text: 'Overview', link: '/documentation/' },
            { text: 'Functional', link: '/documentation/functional/' },
            { text: 'Technical', link: '/documentation/technical/' },
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/sympauthy' }
    ]
  }
})
