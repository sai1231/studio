
import {NextRequest, NextResponse} from 'next/server';
import {JSDOM} from 'jsdom';

const knownOembedProviders: { [domain: string]: string } = {
    'youtube.com': 'https://www.youtube.com/oembed',
    'youtu.be': 'https://www.youtube.com/oembed',
    'vimeo.com': 'https://vimeo.com/api/oembed.json',
    'x.com': 'https://publish.twitter.com/oembed',
    'twitter.com': 'https://publish.twitter.com/oembed',
    'soundcloud.com': 'https://soundcloud.com/oembed',
    'flickr.com': 'https://www.flickr.com/services/oembed/',
    'open.spotify.com': 'https://open.spotify.com/oembed',
    'spotify.com': 'https://open.spotify.com/oembed',
};


export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({error: 'URL parameter is required'}, {status: 400});
  }

  // --- Start of new logic ---
  // First, try getting metadata from oEmbed for known providers
  try {
    const urlObj = new URL(url);
    let endpointUrl: string | null = null;
    
    for (const domain in knownOembedProviders) {
        if (urlObj.hostname.includes(domain)) {
            endpointUrl = knownOembedProviders[domain];
            break;
        }
    }

    if (endpointUrl) {
      const oembedRequestUrl = new URL(endpointUrl);
      oembedRequestUrl.searchParams.set('url', url);
      oembedRequestUrl.searchParams.set('format', 'json');
      
      const oembedResponse = await fetch(oembedRequestUrl.toString(), {
          signal: AbortSignal.timeout(5000),
      });

      if (oembedResponse.ok) {
        const data = await oembedResponse.json();
        if (data.title) {
           return NextResponse.json({
              title: data.title,
              description: data.author_name || '', // Use author_name as description
              faviconUrl: null, // oEmbed doesn't provide favicons
              imageUrl: data.thumbnail_url || null,
            });
        }
      }
    }
  } catch (e) {
    console.warn(`oEmbed metadata pre-fetch failed for ${url}, falling back to scraping.`, e);
  }
  // --- End of new logic, fallback to old logic below ---

  // Fallback to HTML scraping if oEmbed fails or is not available
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

    let imageUrl = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
    if (imageUrl) {
      imageUrl = new URL(imageUrl, url).href;
    }

    return NextResponse.json({
      title,
      description,
      faviconUrl,
      imageUrl,
    });
  } catch (error) {
    console.error('Scrape metadata API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({error: `Failed to process URL: ${errorMessage}`}, {status: 500});
  }
}
