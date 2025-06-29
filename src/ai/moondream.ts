import { addLog } from "@/services/loggingService";
// Note: Depending on your environment, you might need 'node-fetch' or just the built-in 'fetch'

export async function generateCaptionFromImage(imageUrl: string): Promise<string> {
  try {
    await addLog('INFO', `Attempting to fetch image from URL: ${imageUrl}`);
    // Fetch the image from the URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const dataUri = `data:${mimeType};base64,${base64Image}`;

    // Call Moondream API

    const moondreamResponse = await fetch('https://api.moondream.ai/v1/caption', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Moondream-Auth': `${process.env.MOONDREAM_API_KEY}`,
        // Add any necessary API key header here if required by Moondream API
      },
      body: JSON.stringify({
        image_url: dataUri,
        length: 'short', // Or 'short'
      }),
      signal: AbortSignal.timeout(15000), // 15-second timeout
    });

    if (!moondreamResponse.ok) {
      const errorBody = await moondreamResponse.text();
      throw new Error(`Moondream API request failed: ${moondreamResponse.status} ${moondreamResponse.statusText} - ${errorBody}`);
    }

    const moondreamData = await moondreamResponse.json();

    // Assuming the API returns the caption in a 'caption' field
    if (moondreamData && moondreamData.caption) {
      await addLog('INFO', `Successfully generated caption from image.`);
      return moondreamData.caption;
    } else {
      await addLog('WARN', 'Moondream API did not return a caption in the expected format:', { result });
      return ''; // Or throw new Error('Caption not found in API response');
    }

  } catch (error) {
    await addLog('ERROR', 'Error generating caption from image:', { error: error.message });
    return ''; // Return empty string or re-throw the error
  }
}