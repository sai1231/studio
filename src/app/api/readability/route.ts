
import {NextRequest, NextResponse} from 'next/server';
import {JSDOM} from 'jsdom';
import {Readability} from '@mozilla/readability';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({error: 'URL parameter is required'}, {status: 400});
  }

  try {
    const response = await fetch(url, {
      headers: {
        // Some sites might block requests without a common user-agent
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }
    const html = await response.text();
    const doc = new JSDOM(html, {url}); // Providing the URL helps Readability resolve relative links

    // It's good practice to clone the document before passing to Readability
    // as Readability mutates the DOM.
    const reader = new Readability(doc.window.document.cloneNode(true) as Document);
    const article = reader.parse();

    if (article) {
      return NextResponse.json({
        title: article.title,
        content: article.content, // This is the main article HTML
        textContent: article.textContent,
        length: article.length,
        excerpt: article.excerpt,
        byline: article.byline,
        dir: article.dir,
        siteName: article.siteName,
      });
    } else {
      return NextResponse.json({error: 'Could not parse article content'}, {status: 500});
    }
  } catch (error) {
    console.error('Readability API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({error: `Failed to process URL: ${errorMessage}`}, {status: 500});
  }
}
