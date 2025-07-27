// src/blogs/utils/slugify.ts
export function slugify(text: string): string {
	return text
	  .toString()
	  .toLowerCase()
	  .trim()
	  .replace(/\s+/g, '-')       // Replace spaces with -
	  .replace(/[^\w\-]+/g, '')   // Remove all non-word characters
	  .replace(/\-\-+/g, '-');     // Replace multiple - with single -
  }
  