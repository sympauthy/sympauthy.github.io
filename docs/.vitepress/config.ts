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
      },
      { text: 'Contributing', link: '/contributing/' }
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
            { text: 'Authentication', link: '/functional/authentication' },
            { text: 'Tokens', link: '/functional/tokens' },
            { text: 'Claims', link: '/functional/claims' },
            { text: 'Scopes', link: '/functional/scope' },
            { text: 'User Authorization', link: '/functional/user_authorization' },
            { text: 'Client Authorization', link: '/functional/client_authorization' },
            { text: 'Consent', link: '/functional/consent' },
            { text: 'End-User Management', link: '/functional/end-user_management' },
            { text: 'Client', link: '/functional/client' },
            { text: 'Interactive Flow', link: '/functional/interactive_flow' },
          ]
        }
      ],
      '/technical/': [
        {
          text: 'Technical Documentation',
          items: [
            { text: 'Overview', link: '/technical/' },
            { text: 'Configuration', link: '/technical/configuration' },
            { text: 'OAuth 2.1 & OpenID Compatibility Matrix', link: '/technical/oauth2_compatibility' },
            { text: 'Flow API', link: '/technical/flow_api' },
            { text: 'Client API', link: '/technical/client_api' },
            { text: 'Admin API', link: '/technical/admin_api' },
            { text: 'Security', link: '/technical/security' },
          ]
        }
      ],
      '/contributing/': [
        {
          text: 'Contributing',
          items: [
            { text: 'Overview', link: '/contributing/' },
            { text: 'Design FAQ', link: '/contributing/design_faq' },
            {
              text: 'Backend',
              items: [
                { text: 'How to design an API endpoint', link: '/contributing/backend/how-to-design-an-api-endpoint' },
                { text: 'How to throw an exception', link: '/contributing/backend/how-to-throw-an-exception' },
                { text: 'How to write a business manager', link: '/contributing/backend/how-to-write-a-business-manager' },
                { text: 'How to write a configuration', link: '/contributing/backend/how-to-write-a-configuration' }
              ]
            }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/sympauthy' }
    ]
  }
})
