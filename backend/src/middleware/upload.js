'use strict';

const multer = require('multer');
const { fail } = require('../utils/response');

const AUDIO_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
]);

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

function createUpload(mimeTypes, maxSize, fileTypeLabel) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSize },
    fileFilter(req, file, cb) {
      if (!file || !mimeTypes.has(file.mimetype)) {
        const error = new Error(`${fileTypeLabel}文件格式不支持`);
        error.code = 'UPLOAD_INVALID_TYPE';
        return cb(error);
      }
      return cb(null, true);
    },
  });
}

function wrapSingleUpload(uploadInstance, fieldName, sizeLabel) {
  return (req, res, next) => {
    uploadInstance.single(fieldName)(req, res, (err) => {
      if (!err) {
        return next();
      }

      if (err.code === 'LIMIT_FILE_SIZE') {
        return fail(res, 400, `${fieldName} 文件大小不能超过 ${sizeLabel}`, null, 400);
      }

      return fail(res, 400, err.message || '文件上传失败', null, 400);
    });
  };
}

const audioUpload = createUpload(AUDIO_MIME_TYPES, 10 * 1024 * 1024, '音频');
const imageUpload = createUpload(IMAGE_MIME_TYPES, 8 * 1024 * 1024, '图片');

const uploadAudio = wrapSingleUpload(audioUpload, 'audio', '10MB');
const uploadImage = wrapSingleUpload(imageUpload, 'image', '8MB');

module.exports = {
  uploadAudio,
  uploadImage,
};
