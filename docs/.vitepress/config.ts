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
            { text: 'Authentication', link: '/documentation/functional/authentication' },
            { text: 'Tokens', link: '/documentation/functional/tokens' },
            { text: 'Authorization', link: '/documentation/functional/authorization' },
            { text: 'End-User Management', link: '/documentation/functional/end-user_management' },
            { text: 'Claims', link: '/documentation/functional/claims' },
            { text: 'Connect using OAuth2', link: '/documentation/functional/connect_using_oauth2' },
          ]
        }
      ],
      '/documentation/technical/': [
        {
          text: 'Technical Documentation',
          items: [
            { text: 'Overview', link: '/documentation/technical/' },
            { text: 'Configuration', link: '/documentation/technical/configuration' },
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
