const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

async function extract() {
    const filePath = path.join(process.cwd(), '../ed9b3239b1999b90a4a3f8cc4742c0fe4fc3ed85-2.pdf');
    let dataBuffer = fs.readFileSync(filePath);
    
    const data = await pdf(dataBuffer);
    console.log("Number of pages:", data.numpages);
    console.log("Total text length:", data.text.length);
    console.log("First 500 chars:", data.text.substring(0, 500));
}
extract();
