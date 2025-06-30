import getColors from 'get-image-colors';
import decode from 'image-decode';

export async function fetchImageColors(imageUrl: string): Promise<number[][]> {
  try {
    // Fetch the image data
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = response.headers.get('content-type') || 'image/jpeg';

    // Decode the image data to get pixel information
    const decodedImage = decode(buffer);
    if (!decodedImage) {
        throw new Error('Failed to decode image data.');
    }

    // Extract colors
    const colors = await getColors(decodedImage.data, {
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
