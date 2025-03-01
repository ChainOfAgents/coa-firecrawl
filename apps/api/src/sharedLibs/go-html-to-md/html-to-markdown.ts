// Interface for the Go HTML to Markdown converter
export function ConvertHTMLToMarkdown(html: string): string {
  // TODO: Implement the actual Go FFI call
  // For now, return a simple conversion as placeholder
  return html
    .replace(/<h1>(.*?)<\/h1>/g, '# $1')
    .replace(/<p>(.*?)<\/p>/g, '$1\n')
    .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
    .replace(/<em>(.*?)<\/em>/g, '*$1*')
    .replace(/<br\s*\/?>/g, '\n');
}
