import {NextRequest, NextResponse} from 'next/server';
import {JSDOM} from 'jsdom';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({error: 'URL parameter is required'}, {status: 400});
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      signal: AbortSignal.timeout(8000), // 8-second timeout
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }
    const html = await response.text();
    const dom = new JSDOM(html, { url }); // Provide base URL to resolve relative paths
    const doc = dom.window.document;

    const title = doc.querySelector('title')?.textContent || 
                  doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
                  '';
    
    const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') || 
                        doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || 
                        '';

    let faviconUrl = doc.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href') ||
                     doc.querySelector('link[rel="icon"]')?.getAttribute('href') ||
                     doc.querySelector('link[rel="shortcut icon"]')?.getAttribute('href');

    if (faviconUrl) {
      faviconUrl = new URL(faviconUrl, url).href;
    } else {
      // Fallback to trying to get /favicon.ico from the root domain
      try {
        const urlObj = new URL(url);
        const icoUrl = `${urlObj.origin}/favicon.ico`;
        // Check if the fallback icon actually exists before setting it
        const icoCheck = await fetch(icoUrl, { method: 'HEAD', signal: AbortSignal.timeout(2000) });
        if (icoCheck.ok) {
            faviconUrl = icoUrl;
        }
      } catch (e) {
        // Ignore errors trying to fetch fallback
      }
    }

    return NextResponse.json({
      title,
      description,
      faviconUrl,
    });
  } catch (error) {
    console.error('Scrape metadata API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({error: `Failed to process URL: ${errorMessage}`}, {status: 500});
  }
}
