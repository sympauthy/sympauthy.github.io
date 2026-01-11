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
      '/documentation/functional/': [
        {
          text: 'Functional Documentation',
          items: [
            { text: 'Overview', link: '/documentation/functional/' },
            { text: 'Authentication', link: '/documentation/functional/1 - Authentication' },
            { text: 'Connect using OAuth2', link: '/documentation/functional/1.1 - Connect using OAuth2' },
            { text: 'Tokens', link: '/documentation/functional/1.1 - Tokens' },
            { text: 'Authorization', link: '/documentation/functional/2 - Authorization' },
            { text: 'End-User Management', link: '/documentation/functional/3 - End-User management' },
            { text: 'Claims', link: '/documentation/functional/3.1 - Claims' },
          ]
        }
      ],
      '/documentation/technical/': [
        {
          text: 'Technical Documentation',
          items: [
            { text: 'Overview', link: '/documentation/technical/' },
            { text: 'Configuration', link: '/documentation/technical/1 - Configuration' },
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
