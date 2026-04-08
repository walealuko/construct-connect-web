// src/services/uploadService.js
import { Storage } from "aws-amplify";

/**
 * Upload a file to AWS S3 using Amplify Storage
 * @param {File} file - The file object to upload
 * @param {string} folder - Optional folder name in S3 bucket
 * @returns {Promise<string>} - Returns the public URL of the uploaded file
 */
export const uploadFile = async (file, folder = "uploads") => {
  try {
    if (!file) throw new Error("No file provided for upload");

    const fileName = `${folder}/${Date.now()}_${file.name}`;
    const result = await Storage.put(fileName, file, {
      contentType: file.type,
    });

    // Get the public URL
    const fileUrl = await Storage.get(result.key, { level: "public" });
    return fileUrl;
  } catch (error) {
    console.error("File upload failed: - uploadService.js:23", error);
    throw error;
  }
};

/**
 * Delete a file from AWS S3
 * @param {string} key - The S3 key of the file to delete
 * @returns {Promise<void>}
 */
export const deleteFile = async (key) => {
  try {
    await Storage.remove(key);
  } catch (error) {
    console.error("File deletion failed: - uploadService.js:37", error);
    throw error;
  }
};
