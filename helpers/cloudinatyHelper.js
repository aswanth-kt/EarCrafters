const cloudinary = require('../config/cloudinary');
const fs = require('fs');

// Upload single image to Cloudinary
const uploadSingleImage = async (filePath, folder = 'ecommerce/products') => {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder: folder,
            transformation: [
                { width: 1000, height: 1000, crop: 'limit' },
                { quality: 'auto', fetch_format: 'auto' }
            ]
        });

        // Delete temporary file after upload
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        return {
            success: true,
            url: result.secure_url,
            publicId: result.public_id
        };
    } catch (error) {
        // Delete temporary file even if upload fails
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        return {
            success: false,
            error: error.message
        };
    }
};

// Upload multiple images to Cloudinary
const uploadMultipleImages = async (filePaths, folder = 'ecommerce/products') => {
    try {
        const uploadPromises = filePaths.map(filePath => uploadSingleImage(filePath, folder));
        const results = await Promise.all(uploadPromises);
        
        const successfulUploads = results.filter(result => result.success);
        const failedUploads = results.filter(result => !result.success);
        
        return {
            success: failedUploads.length === 0,
            successfulUploads,
            failedUploads,
            urls: successfulUploads.map(upload => upload.url),
            publicIds: successfulUploads.map(upload => upload.publicId)
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
};

// Delete single image from Cloudinary
const deleteImage = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return { success: true, result };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Delete multiple images from Cloudinary
const deleteMultipleImages = async (publicIds) => {
    try {
        const deletePromises = publicIds.map(publicId => deleteImage(publicId));
        const results = await Promise.all(deletePromises);
        return results;
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Generate optimized URL with transformations
const getOptimizedUrl = (imageUrl, width = 400, height = 400, crop = 'fill') => {
    if (!imageUrl.includes('cloudinary.com')) {
        return imageUrl; // Return original if not Cloudinary URL
    }
    return imageUrl.replace('/upload/', `/upload/c_${crop},w_${width},h_${height},q_auto,f_auto/`);
};

// Generate thumbnail URL
const getThumbnailUrl = (imageUrl, size = 150) => {
    return getOptimizedUrl(imageUrl, size, size, 'thumb');
};

module.exports = {
    uploadSingleImage,
    uploadMultipleImages,
    deleteImage,
    deleteMultipleImages,
    getOptimizedUrl,
    getThumbnailUrl
};