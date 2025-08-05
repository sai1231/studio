

import { NextRequest, NextResponse } from 'next/server';
import { addContentItem } from '@/services/contentService';
import type { ContentItem } from '@/types';
import { getAdminAuth } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

// This is the new, secure endpoint for the browser extension.
export async function POST(request: NextRequest) {
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const token = authorization.split('Bearer ')[1];

    let userId: string;
    try {
        const decodedToken = await getAdminAuth().verifyIdToken(token);
        userId = decodedToken.uid;
    } catch (error: any) {
         console.error('Token verification failed:', error);
        if (error.code === 'auth/id-token-expired') {
            return NextResponse.json({ error: 'Unauthorized: Token expired' }, { status: 401 });
        }
        if (error.code === 'auth/argument-error') {
            return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Internal Server Error during auth' }, { status: 500 });
    }
        
    try {
        const body = await request.json();
        const { url, title, selection, source } = body;
        
        let contentData: Partial<Omit<ContentItem, 'id' | 'createdAt'>>;

        if (url) {
            // Logic to handle saving a URL
            let metadata = { title: title || '', description: '', faviconUrl: '', imageUrl: '' };
            try {
                // We use the full URL of the currently running app to make the metadata call
                const appUrl = request.nextUrl.origin;
                const metaResponse = await fetch(`${appUrl}/api/scrape-metadata?url=${encodeURIComponent(url)}`);
                if (metaResponse.ok) metadata = await metaResponse.json();
            } catch (e) { console.error("API call to scrape-metadata failed:", e); }
            
            if (!metadata.title) {
                try { metadata.title = new URL(url).hostname.replace(/^www\./, ''); } 
                catch { metadata.title = "Untitled Link"; }
            }
            contentData = {
                type: 'link', url: url, title: metadata.title, description: metadata.description,
                faviconUrl: metadata.faviconUrl, imageUrl: metadata.imageUrl,
                domain: new URL(url).hostname.replace(/^www\./, ''),
            };

        } else if (selection) {
            // Logic to handle saving a text selection as a note
            const generatedTitle = selection.split(/\s+/).slice(0, 5).join(' ') + (selection.split(/\s+/).length > 5 ? '...' : '');
            let description = `> ${selection}`; // Quote the selection
            if (source && source.url) {
                description += `\n\n_Source: [${source.title || source.url}](${source.url})_`;
            }

            contentData = {
                type: 'note', title: generatedTitle, description: description, contentType: 'Note',
            };
        } else {
             return NextResponse.json({ error: 'Invalid payload: must contain a url or selection.' }, { status: 400 });
        }

        const fullContentData: Omit<ContentItem, 'id' | 'createdAt'> = {
            ...contentData,
            userId: userId,
            tags: [], // Start with no tags
            status: 'pending-analysis',
        } as Omit<ContentItem, 'id' | 'createdAt'>;

        const newItem = await addContentItem(fullContentData);

        return NextResponse.json({ success: true, itemId: newItem.id });

    } catch (error: any) {
        console.error('Extension content creation error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
