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
          { text: 'Functional', link: '/documentation/functionnal/' },
          { text: 'Technical', link: '/documentation/technical/' }
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
      '/documentation/functionnal/': [
        {
          text: 'Functional Documentation',
          items: [
            { text: 'Overview', link: '/documentation/functionnal/' },
            { text: 'Authentication', link: '/documentation/functionnal/1 - Authentication' },
            { text: 'Connect using OAuth2', link: '/documentation/functionnal/1.1 - Connect using OAuth2' },
            { text: 'Tokens', link: '/documentation/functionnal/1.1 - Tokens' },
            { text: 'Authorization', link: '/documentation/functionnal/2 - Authorization' },
            { text: 'End-User Management', link: '/documentation/functionnal/3 - End-User management' },
            { text: 'Claims', link: '/documentation/functionnal/3.1 - Claims' },
            { text: 'Integration', link: '/documentation/functionnal/6 - Integration' },
            { text: 'Well-known Providers', link: '/documentation/functionnal/6.1 - Well-known providers' }
          ]
        }
      ],
      '/documentation/technical/': [
        {
          text: 'Technical Documentation',
          items: [
            { text: 'Overview', link: '/documentation/technical/' },
            { text: 'Configuration', link: '/documentation/technical/1 - Configuration' },
            { text: 'APIs', link: '/documentation/technical/2 - APIs' },
            { text: 'OAuth 2.0', link: '/documentation/technical/2.1 - OAuth 2.0' }
          ]
        }
      ],
      '/documentation/': [
        {
          text: 'Documentation',
          items: [
            { text: 'Overview', link: '/documentation/' },
            { text: 'Functional', link: '/documentation/functionnal/' },
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
