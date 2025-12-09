// multer.config.ts
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

function ensureDir(path: string) {
	if (!existsSync(path)) {
		mkdirSync(path, { recursive: true });
	}
}

export const multerOptions: any = {
	storage: diskStorage({
		destination: (req, file, cb) => {
			const uploadDir = './uploads';
			ensureDir(uploadDir);
			cb(null, uploadDir);
		},
		filename: (req, file, cb) => {
			const name = file.originalname.split('.')[0];
			const extension = extname(file.originalname); // includes the dot: .png, .jpg, etc.

			const randomName = Array(32)
				.fill(null)
				.map(() => Math.round(Math.random() * 16).toString(16))
				.join('');

			cb(null, `${name}-${randomName}${extension}`);
		},
	}),

	// Allow files up to 5 MB
	limits: {
		fileSize: 5 * 1024 * 1024, // 5 MB
	},

	// Accept all file types (you can restrict to images if you want)
	fileFilter: (req, file, cb) => {
		// Example if you want only images:
		// if (!file.mimetype.startsWith('image/')) {
		//   return cb(new Error('Only image files are allowed!'), false);
		// }
		cb(null, true);
	},
};

export const multerOptionsPdf: any = {
	storage: diskStorage({
		destination: (req, file, cb) => {
			const uploadDir = './uploads/careers';
			ensureDir(uploadDir);
			cb(null, uploadDir);
		},
		filename: (req, file, cb) => {
			const name = file.originalname.split('.')[0];
			const extension = extname(file.originalname);

			const randomName = Array(16)
				.fill(null)
				.map(() => Math.round(Math.random() * 16).toString(16))
				.join('');

			cb(null, `${name}-${randomName}${extension}`);
		},
	}),

	// Allow files up to 5 MB
	limits: {
		fileSize: 5 * 1024 * 1024, // 5 MB
	},

	fileFilter: (req, file, cb) => {
		const allowedTypes = [
			'application/pdf',
			'application/msword',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'image/jpeg',
			'image/png',
		];

		if (allowedTypes.includes(file.mimetype)) {
			cb(null, true);
		} else {
			cb(new Error('Unsupported file type'), false);
		}
	},
};
