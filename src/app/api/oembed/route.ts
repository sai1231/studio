import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';

// A cache for oEmbed endpoints to avoid re-scraping the same domain repeatedly
const endpointCache = new Map<string, string>();

async function findOembedEndpoint(url: string): Promise<string | null> {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    if (endpointCache.has(domain)) {
        return endpointCache.get(domain)!;
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            signal: AbortSignal.timeout(5000), // 5-second timeout
        });

        if (!response.ok) {
            return null; // Don't cache failures
        }

        const html = await response.text();
        const dom = new JSDOM(html);
        const doc = dom.window.document;

        const oembedLink = doc.querySelector<HTMLLinkElement>('link[type="application/json+oembed"]');
        
        if (oembedLink && oembedLink.href) {
            const endpoint = new URL(oembedLink.href, url).href;
            endpointCache.set(domain, endpoint);
            return endpoint;
        }

        return null;
    } catch (error) {
        console.error(`Error finding oEmbed endpoint for ${url}:`, error);
        return null;
    }
}

// Some providers have well-known endpoints that we can use as a fallback or primary
const knownProviders: { [domain: string]: string } = {
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
        return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    try {
        const urlObj = new URL(url);
        let endpointUrl: string | null = null;
        
        // Check known providers first
        for (const domain in knownProviders) {
            if (urlObj.hostname.includes(domain)) {
                endpointUrl = knownProviders[domain];
                break;
            }
        }
        
        // If not a known provider, try to discover the endpoint
        if (!endpointUrl) {
            endpointUrl = await findOembedEndpoint(url);
        }

        if (!endpointUrl) {
            return NextResponse.json({ error: 'oEmbed endpoint not found for this URL.' }, { status: 404 });
        }
        
        const oembedRequestUrl = new URL(endpointUrl);
        oembedRequestUrl.searchParams.set('url', url);
        oembedRequestUrl.searchParams.set('format', 'json');
        oembedRequestUrl.searchParams.set('maxwidth', '600'); 
        
        const oembedResponse = await fetch(oembedRequestUrl.toString(), {
            signal: AbortSignal.timeout(5000),
        });

        if (!oembedResponse.ok) {
            const errorText = await oembedResponse.text();
            throw new Error(`oEmbed provider responded with ${oembedResponse.status}: ${errorText}`);
        }

        const oembedData = await oembedResponse.json();
        
        if (oembedData.html && (urlObj.hostname.includes('twitter.com') || urlObj.hostname.includes('x.com'))) {
            oembedData.html = `<div class="twitter-embed-wrapper">${oembedData.html}</div>`;
        }

        return NextResponse.json(oembedData);

    } catch (error) {
        console.error('oEmbed API error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ error: `Failed to process oEmbed request: ${errorMessage}` }, { status: 500 });
    }
}
