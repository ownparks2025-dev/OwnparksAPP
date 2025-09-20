import AsyncStorage from '@react-native-async-storage/async-storage';

const IMAGE_STORAGE_KEY = 'parking_lot_images';

export interface StoredImage {
  id: string;
  uri: string;
  parkingLotId: string;
  fileName: string;
  createdAt: Date;
}

// Get all stored images
export const getAllStoredImages = async (): Promise<StoredImage[]> => {
  try {
    const imagesJson = await AsyncStorage.getItem(IMAGE_STORAGE_KEY);
    if (!imagesJson) return [];
    return JSON.parse(imagesJson);
  } catch (error) {
    console.error('Error getting stored images:', error);
    return [];
  }
};

// Store a new image
export const storeImage = async (
  uri: string, 
  parkingLotId: string, 
  fileName: string
): Promise<string> => {
  try {
    const images = await getAllStoredImages();
    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newImage: StoredImage = {
      id: imageId,
      uri,
      parkingLotId,
      fileName,
      createdAt: new Date(),
    };
    
    images.push(newImage);
    await AsyncStorage.setItem(IMAGE_STORAGE_KEY, JSON.stringify(images));
    
    return imageId;
  } catch (error) {
    console.error('Error storing image:', error);
    throw new Error('Failed to store image');
  }
};

// Get images for a specific parking lot
export const getImagesForParkingLot = async (parkingLotId: string): Promise<StoredImage[]> => {
  try {
    const images = await getAllStoredImages();
    return images.filter(img => img.parkingLotId === parkingLotId);
  } catch (error) {
    console.error('Error getting parking lot images:', error);
    return [];
  }
};

// Delete an image
export const deleteImage = async (imageId: string): Promise<void> => {
  try {
    const images = await getAllStoredImages();
    const filteredImages = images.filter(img => img.id !== imageId);
    await AsyncStorage.setItem(IMAGE_STORAGE_KEY, JSON.stringify(filteredImages));
  } catch (error) {
    console.error('Error deleting image:', error);
    throw new Error('Failed to delete image');
  }
};

// Delete all images for a parking lot
export const deleteImagesForParkingLot = async (parkingLotId: string): Promise<void> => {
  try {
    const images = await getAllStoredImages();
    const filteredImages = images.filter(img => img.parkingLotId !== parkingLotId);
    await AsyncStorage.setItem(IMAGE_STORAGE_KEY, JSON.stringify(filteredImages));
  } catch (error) {
    console.error('Error deleting parking lot images:', error);
    throw new Error('Failed to delete parking lot images');
  }
};

// Update parking lot ID for images (useful when editing)
export const updateImagesParkingLotId = async (
  oldParkingLotId: string, 
  newParkingLotId: string
): Promise<void> => {
  try {
    const images = await getAllStoredImages();
    const updatedImages = images.map(img => 
      img.parkingLotId === oldParkingLotId 
        ? { ...img, parkingLotId: newParkingLotId }
        : img
    );
    await AsyncStorage.setItem(IMAGE_STORAGE_KEY, JSON.stringify(updatedImages));
  } catch (error) {
    console.error('Error updating images parking lot ID:', error);
    throw new Error('Failed to update images parking lot ID');
  }
};

// Get storage statistics
export const getImageStorageStats = async () => {
  try {
    const images = await getAllStoredImages();
    const totalImages = images.length;
    const totalSize = images.reduce((acc, img) => acc + (img.uri.length * 2), 0); // Rough size estimation
    
    return {
      totalImages,
      estimatedSizeBytes: totalSize,
      estimatedSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    };
  } catch (error) {
    console.error('Error getting storage stats:', error);
    return {
      totalImages: 0,
      estimatedSizeBytes: 0,
      estimatedSizeMB: '0.00',
    };
  }
};