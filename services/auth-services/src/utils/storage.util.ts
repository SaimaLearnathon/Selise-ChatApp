import { BlobServiceClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

if (!connectionString) {
  console.warn('AZURE_STORAGE_CONNECTION_STRING is not defined');
}

const blobServiceClient = connectionString 
  ? BlobServiceClient.fromConnectionString(connectionString)
  : null;

const containerClient = blobServiceClient?.getContainerClient('uploads');

export const uploadImage = async (file: Express.Multer.File): Promise<string> => {
  if (!containerClient) {
    throw new Error('Azure Blob Storage is not configured.');
  }

  // Ensure container exists
  await containerClient.createIfNotExists({
    access: 'blob',
  });

  const fileName = `${uuidv4()}-${file.originalname}`;
  const blockBlobClient = containerClient.getBlockBlobClient(fileName);

  await blockBlobClient.uploadData(file.buffer, {
    blobHTTPHeaders: { blobContentType: file.mimetype }
  });

  return blockBlobClient.url; 
};
