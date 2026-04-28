// Utility functions for fetching fresh view tokens from MatrixBIM server

export interface FreshTokenResponse {
  success: boolean;
  fileId: string;
  viewToken: string;
  accessToken: string;
  viewerUrl: string;
}

/**
 * Fetches a fresh view token from the MatrixBIM server
 * @param fileId - The file ID to get a fresh view token for
 * @returns Promise<FreshTokenResponse>
 */
export const getFreshViewToken = async (fileId: string | number): Promise<FreshTokenResponse> => {
  try {
    console.log(`Fetching fresh view token for fileId: ${fileId}`);
    
    const response = await fetch(`https://server.matrixtwin.com/api/bimface/getfreshviewtoken/${fileId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: FreshTokenResponse = await response.json();
    
    if (!data.success) {
      throw new Error('Failed to get fresh view token');
    }
    
    console.log(`Fresh view token fetched for fileId ${fileId}:`, data);
    return data;
  } catch (error) {
    console.error(`Error fetching fresh view token for fileId ${fileId}:`, error);
    throw error;
  }
};
