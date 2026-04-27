import { defaultSchema } from 'rehype-sanitize';

/** 在默认白名单基础上允许代码高亮 class、常见标题与列表，降低 XSS 面。 */
export const markdownSanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      'className',
      'class',
    ],
    pre: [...(defaultSchema.attributes?.pre ?? [])],
    span: [...(defaultSchema.attributes?.span ?? []), 'className', 'class'],
  },
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    'kbd',
    'mark',
    'del',
    'ins',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
  ],
};
