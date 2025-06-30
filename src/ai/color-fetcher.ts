import getColors from 'get-image-colors';

export async function fetchImageColors(imageUrl: string): Promise<number[][]> {
  try {
    // Fetch the image data
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = response.headers.get('content-type');

    if (!mimeType) {
      throw new Error('Could not determine image MIME type.');
    }

    // Extract colors
    const colors = await getColors(buffer, {
      count: 8,
      type: mimeType,
    });
    
    // Convert the color objects to the required RGB array format
    return colors.map(color => color.rgb());

  } catch (error) {
    console.error(`Error fetching color palette for ${imageUrl}:`, error);
    throw error; // Re-throw the error for further handling
  }
}
