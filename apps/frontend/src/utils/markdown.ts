export function renderMarkdown(text: string): string {
  if (!text) return ''

  const lines = text.split(/\r?\n/)
  const blocks: string[] = []
  let paragraph: string[] = []
  let listItems: string[] = []
  let inTable = false
  let tableRows: string[][] = []

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`)
      paragraph = []
    }
  }

  const flushList = () => {
    if (listItems.length) {
      blocks.push(`<ul>${listItems.map(i => `<li>${inlineMarkdown(i)}</li>`).join('')}</ul>`)
      listItems = []
    }
  }

  const flushTable = () => {
    if (tableRows.length) {
      const header = tableRows[0]
      const body = tableRows.slice(1).filter(r => !r.every(c => /^:?-{3,}:?$/.test(c)))
      blocks.push([
        '<table>',
        `<thead><tr>${header.map(c => `<th>${inlineMarkdown(c)}</th>`).join('')}</tr></thead>`,
        '<tbody>',
        body.length
          ? body.map(r => `<tr>${r.map(c => `<td>${inlineMarkdown(c)}</td>`).join('')}</tr>`).join('')
          : `<tr><td colspan="${header.length}">Нет данных</td></tr>`,
        '</tbody>',
        '</table>',
      ].join(''))
      tableRows = []
      inTable = false
    }
  }

  const splitTableRow = (row: string) =>
    row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())

  const isSeparator = (row: string) => {
    const cells = splitTableRow(row).filter(c => c.length > 0)
    return cells.length > 0 && cells.every(c => /^:?-{3,}:?$/.test(c))
  }

  for (let i = 0; i < lines.length; ) {
    const line = lines[i]
    const trimmed = line.trim()
    const nextLine = lines[i + 1]?.trim()

    // Empty line
    if (!trimmed) {
      flushParagraph()
      flushList()
      if (inTable && !nextLine?.startsWith('|')) {
        flushTable()
      }
      i++
      continue
    }

    // Heading
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      flushParagraph()
      flushList()
      if (inTable) flushTable()
      const level = headingMatch[1].length
      blocks.push(`<h${level}>${inlineMarkdown(headingMatch[2])}</h${level}>`)
      i++
      continue
    }

    // Table
    if (trimmed.startsWith('|') && nextLine && isSeparator(nextLine)) {
      flushParagraph()
      flushList()
      if (inTable) flushTable()
      inTable = true
      tableRows.push(splitTableRow(trimmed), splitTableRow(nextLine))
      i += 2
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableRows.push(splitTableRow(lines[i].trim()))
        i++
      }
      flushTable()
      continue
    }

    // Table continuation
    if (inTable && trimmed.startsWith('|')) {
      tableRows.push(splitTableRow(trimmed))
      i++
      continue
    }

    // Bullet list
    const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/)
    if (bulletMatch) {
      flushParagraph()
      if (inTable) flushTable()
      listItems.push(bulletMatch[1])
      i++
      continue
    }

    // Regular paragraph
    flushList()
    if (inTable && !trimmed.startsWith('|')) flushTable()
    paragraph.push(trimmed)
    i++
  }

  flushParagraph()
  flushList()
  if (inTable) flushTable()

  return blocks.join('\n')
}

function inlineMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
}

function escapeHtml(text: string): string {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
