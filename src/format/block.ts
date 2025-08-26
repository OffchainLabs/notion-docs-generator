import { renderRichTexts } from './text'
import { RenderMode } from './format'
import { renderPageLink } from './link'

import type { RichTextItemResponse } from '@notionhq/client/build/src/api-endpoints'
import type { Block } from '../notion'
import type { LinkableTerms } from './link'

export function renderBlock(
  block: Block,
  linkableTerms: LinkableTerms,
  renderMode: RenderMode,
  prevType?: string,
  last = false,
  listIndex = 1
): string {
  const blockResponse = block.block
  let prefix = ''
  let postfix = ''
  
  // Only add HTML list tags when in HTML mode
  if (renderMode === RenderMode.HTML) {
    if (prevType != blockResponse.type) {
      if (prevType == 'numbered_list_item') {
        prefix = '</ol>\n'
      }
      if (prevType == 'bulleted_list_item') {
        prefix = '</ul>\n'
      }
      if (blockResponse.type == 'numbered_list_item') {
        prefix += '<ol>\n'
      }
      if (blockResponse.type == 'bulleted_list_item') {
        prefix += '<ul>\n'
      }
    }
    if (last) {
      if (blockResponse.type == 'numbered_list_item') {
        postfix += '</ol>\n'
      }
      if (blockResponse.type == 'bulleted_list_item') {
        postfix += '</ul>\n'
      }
    }
  }
  const renderRichWithMode = (text: RichTextItemResponse[], mode: RenderMode): string => {
    let child = ''
    if (block.children.length > 0) {
      child = renderBlocks(block.children, linkableTerms, mode)
    }
    return `${renderRichTexts(text, linkableTerms, mode)}${child}`
  }
  const renderRich = (text: RichTextItemResponse[]): string => {
    return renderRichWithMode(text, renderMode)
  }
  const body = (() => {
    switch (blockResponse.type) {
      case 'paragraph': {
        const text = renderRich(blockResponse.paragraph.rich_text)
        if (renderMode === RenderMode.Markdown || renderMode === RenderMode.Plain) {
          return `${text}\n\n`
        }
        return `<p>\n${text}\n</p>\n`
      }
      case 'numbered_list_item': {
        const text = renderRich(blockResponse.numbered_list_item.rich_text)
        if (renderMode === RenderMode.Markdown) {
          return `${listIndex}. ${text}\n`
        } else if (renderMode === RenderMode.Plain) {
          return `${listIndex}. ${text}\n`
        }
        return `<li>${text}</li>`
      }
      case 'bulleted_list_item': {
        const text = renderRich(blockResponse.bulleted_list_item.rich_text)
        if (renderMode === RenderMode.Markdown) {
          return `- ${text}\n`
        } else if (renderMode === RenderMode.Plain) {
          return `• ${text}\n`
        }
        return `<li>${text}</li>`
      }
      case 'code': {
        const text = renderRichWithMode(blockResponse.code.rich_text, RenderMode.Plain)
        if (renderMode === RenderMode.Markdown) {
          return `\`\`\`${blockResponse.code.language}\n${text}\n\`\`\`\n`
        } else if (renderMode === RenderMode.Plain) {
          return `${text}\n`
        }
        return `<pre><code class="language-${blockResponse.code.language}">${text}</code></pre>\n`
      }
      case 'divider': {
        if (renderMode === RenderMode.Markdown) {
          return '---\n\n'
        } else if (renderMode === RenderMode.Plain) {
          return '\n---\n\n'
        }
        return '<hr />'
      }
      case 'link_to_page': {
        const link = blockResponse.link_to_page
        switch (link.type) {
          case 'page_id':
            return renderPageLink(link.page_id, linkableTerms, renderMode)
          default:
            throw new Error(`Unhandled link_to_page type: ${link.type}`)
        }
      }
      case 'heading_1': {
        type Heading = typeof blockResponse.heading_1 & {is_toggleable?: boolean}
        const heading = blockResponse.heading_1 as Heading
        if (!!heading.is_toggleable) {
          return ''
        }
        const text = renderRichWithMode(heading.rich_text, RenderMode.Plain)
        if (renderMode === RenderMode.Markdown) {
          return `\n# ${text}\n\n`
        } else if (renderMode === RenderMode.Plain) {
          return `\n${text}\n${'='.repeat(text.length)}\n\n`
        }
        return `<h1>${text}</h1>\n`
      }
      case 'heading_2': {
        type Heading = typeof blockResponse.heading_2 & {is_toggleable?: boolean}
        const heading = blockResponse.heading_2 as Heading
        if (!!heading.is_toggleable) {
          return ''
        }
        const text = renderRichWithMode(heading.rich_text, RenderMode.Plain)
        if (renderMode === RenderMode.Markdown) {
          return `\n## ${text}\n\n`
        } else if (renderMode === RenderMode.Plain) {
          return `\n${text}\n${'-'.repeat(text.length)}\n\n`
        }
        return `<h2>${text}</h2>\n`
      }
      case 'heading_3': {
        type Heading = typeof blockResponse.heading_3 & {is_toggleable?: boolean}
        const heading = blockResponse.heading_3 as Heading
        if (!!heading.is_toggleable) {
          return ''
        }
        const text = renderRichWithMode(heading.rich_text, RenderMode.Plain)
        if (renderMode === RenderMode.Markdown) {
          return `\n### ${text}\n\n`
        } else if (renderMode === RenderMode.Plain) {
          return `\n${text}\n\n`
        }
        return `<h3>${text}</h3>\n`
      }
      default: {
        console.log(blockResponse)
        throw new Error(`Found block of unknown type ${blockResponse.type}`)
      }
    }
  })()
  return `${prefix}${body}${postfix}`
}

export function renderBlocks(
  blocks: Block[],
  linkableTerms: LinkableTerms,
  renderMode: RenderMode
): string {
  let out = ''
  let prevType: string | undefined
  let i = 0
  let listIndex = 1
  
  for (const block of blocks) {
    // Reset list index when transitioning between list types
    if (prevType !== block.block.type && block.block.type === 'numbered_list_item') {
      listIndex = 1
    }
    
    const renderedBlock = renderBlock(
      block,
      linkableTerms,
      renderMode,
      prevType,
      i == blocks.length - 1,
      listIndex
    )
    out += renderedBlock
    
    // Don't add extra newline in Markdown mode as blocks handle their own spacing
    if (renderMode !== RenderMode.Markdown) {
      out += '\n'
    }
    
    // Increment list index for numbered lists
    if (block.block.type === 'numbered_list_item') {
      listIndex++
    }
    
    prevType = block.block.type
    i++
  }
  return out
}
