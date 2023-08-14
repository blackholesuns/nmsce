#!/usr/bin/env node
const path = require('path');
const { createWorker, PSM } = require('Tesseract.js');

const [, , imagePath] = process.argv;
const image = path.resolve(__dirname, (imagePath ||
  'C:/Users/sp/Videos/Empyrion - Galactic Survival/Registry/Empyrion - Galactic Survival Screenshot 2023.08.06 - 17.34.55.04.png'));

console.log(`Recognizing ${image}`);
const rectangle = { left: 1020, top: 190, width: 1000, height: 910 };

(async () => {
  const worker = await createWorker();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
  });
  const { data: { text } } = await worker.recognize(image, { rectangle,preserve_interword_spaces: '1' });
  console.log(text);
  await worker.terminate();
})();

