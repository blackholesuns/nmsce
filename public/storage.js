import { ref, uploadBytes, deleteObject, getStorage } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js"
import { App } from "./firebase.js";

// Buckets we want to upload to
const buckets = [
    "gs://nms-bhs.appspot.com",
    "gs://cdn.nmsce.com"
]

const storageInstances = buckets.map(v => getStorage(App, v));

export const baseUrl = "https://cdn.nmsce.com"
export const basePath = "/nmsce"
export const displayPath = `${basePath}/disp`
export const originalPath = `${basePath}/orig`
export const thumbPath = `${basePath}/disp/thumb`

/**
 * Gets the Display path for any given file
 * 
 * @export
 * @param {string} filename 
 * @returns {string} Result Path
 */
export function GetDisplayPath(filename) {
    return `${displayPath}/${filename}`
}
/**
 * Gets the Original path for any given file
 * 
 * @export
 * @param {string} filename 
 * @returns {string} Result Path
 */
export function GetOriginalPath(filename) {
    return `${originalPath}/${filename}`
}
/**
 * Gets the Thumbnail path for any given file
 * 
 * @export
 * @param {string} filename 
 * @returns {string} Result Path
 */
export function GetThumbnailPath(filename) {
    return `${thumbPath}/${filename}`
}

/**
 * Gets the Display Url for any given file
 * 
 * @export
 * @param {string} filename 
 * @returns {string} Result Path
 */
 export function GetDisplayUrl(filename) {
    return `${baseUrl}${displayPath}/${filename}`
}
/**
 * Gets the Original Url for any given file
 * 
 * @export
 * @param {string} filename 
 * @returns {string} Result Path
 */
export function GetOriginalUrl(filename) {
    return `${baseUrl}${originalPath}/${filename}`
}
/**
 * Gets the Thumbnail Url for any given file
 * 
 * @export
 * @param {string} filename 
 * @returns {string} Result Path
 */
export function GetThumbnailUrl(filename) {
    return `${baseUrl}${thumbPath}/${filename}`
}

/**
 * Uploads an image to the Firebase blob storage
 * 
 * @export
 * @param {string} path 
 * @param {Blob} blob 
 */
export async function UploadImage(path, blob) {
    // All Upload Tasks
    const tasks = storageInstances.map(storage => 
        uploadBytes(ref(storage, path), blob)
    );

    await Promise.all(tasks);
}

/**
 * Uploads an array of images to the Firebase blob storage
 * 
 * @export
 * @param {{path: string, blob: Blob}[]} images 
 */
export async function UploadImages(images) {

    // All Upload Tasks
    const tasks = images.map(image => 
        storageInstances.map(storage => 
            uploadBytes(ref(storage, image.path), image.blob)
        )
    ).flat();

    await Promise.all(tasks);
}

/**
 * Deletes an image from the Firebase blob storage
 * 
 * @export
 * @param {string} path 
 */
export async function DeleteImage(path) {
    // All Delete Tasks
    const tasks = storageInstances.map(storage => 
        deleteObject(ref(storage, path))
    );

    await Promise.all(tasks);
}

/**
 * Deletes an array of images from the Firebase blob storage
 * 
 * @export
 * @param {Array<string>} images 
 */
export async function DeleteImages(images) {

    // All Delete Tasks
    const tasks = images.map(image => 
        storageInstances.map(storage => 
            deleteObject(ref(storage, image))
        )
    ).flat();

    await Promise.all(tasks);
}
