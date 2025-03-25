const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const http = require('node:http');

async function downloadImagesFromList(file_path, output_dir = 'images') {
    const data = fs.readFileSync(file_path, 'utf-8');
    const image_urls = data.split('\n').filter(url => url.trim() !== '');

    if (!fs.existsSync(output_dir)) {
        fs.mkdirSync(output_dir);
    }

    for (const url of image_urls) {
        try {
            await downloadImage(url, output_dir);
        } catch (error) {
            console.error('Error reading file or downloading images:', error);
            continue;
        }
    }
}

console.log('All images downloaded successfully!');

async function downloadImage(url, output_dir) {
    return new Promise((resolve, reject) => {
        const file_name = path.basename(new URL(url).pathname);
        const file_path = path.join(output_dir, file_name);
        const file_stream = fs.createWriteStream(file_path);

        const protocol = url.startsWith('https') ? https : http;
        protocol.get(url, (response) => {
            if (response.statusCode !== 200) {
                fs.unlink(file_path, () => { }); // Delete file if exists
                reject(`Failed to download image from ${url}: Status code ${response.statusCode}`);
                return;
            }

            response.pipe(file_stream);

            file_stream.on('finish', () => {
                file_stream.close();
                console.log(`Downloaded ${url} to ${file_path}`);
                resolve();
            });
        }).on('error', (error) => {
            fs.unlink(file_path, () => { }); // Delete file if exists
            reject(`Error downloading image from ${url}: ${error.message}`);
        });
    });
}
// Example usage:
const file_path = 'redditpost.json'; // Path to your file containing image URLs
downloadImagesFromList(file_path);