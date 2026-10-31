import type { ThemeRegistration } from 'shiki'

// SympAuthy code theme: the code sample of the brand's colour board, on the near-black nav ground in both
// site themes. Keys and keywords in rose, values in gold, punctuation muted.
const ground = '#1f1418' // nav-ground
const text = '#f3d9df' // nav-text
const muted = '#b9a7ae' // nav-muted
const comment = '#9b8c92' // ink-400
const rose = '#e89aae' // primary, dark theme
const gold = '#e9b949' // gold
const added = '#86efac' // tag-green, dark theme
const removed = '#fca5a5' // danger, dark theme

export const sympauthyCodeTheme: ThemeRegistration = {
  name: 'sympauthy',
  type: 'dark',
  colors: {
    'editor.background': ground,
    'editor.foreground': text
  },
  tokenColors: [
    {
      scope: ['punctuation', 'meta.brace', 'keyword.operator'],
      settings: { foreground: muted }
    },
    {
      scope: [
        'keyword',
        'storage',
        'entity.name.tag',
        'entity.other.attribute-name',
        'support.type.property-name',
        'variable.other.property',
        'punctuation.definition.annotation',
        'punctuation.definition.tag',
        'keyword.operator.new'
      ],
      settings: { foreground: rose }
    },
    {
      scope: [
        'string',
        'punctuation.definition.string',
        'constant.numeric',
        'constant.language',
        'constant.character',
        'constant.other',
        'support.constant'
      ],
      settings: { foreground: gold }
    },
    {
      // A shell command's bare arguments are words of the command, not values
      scope: 'string.unquoted.argument',
      settings: { foreground: text }
    },
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: { foreground: comment, fontStyle: 'italic' }
    },
    {
      scope: 'markup.inserted',
      settings: { foreground: added }
    },
    {
      scope: ['markup.deleted', 'invalid'],
      settings: { foreground: removed }
    }
  ]
}
