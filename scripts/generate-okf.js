const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');
const yaml = require('js-yaml');

async function extract() {
    const filePath = path.join(process.cwd(), '../ed9b3239b1999b90a4a3f8cc4742c0fe4fc3ed85-2.pdf');
    let dataBuffer = fs.readFileSync(filePath);
    
    console.log("Extracting text from PDF...");
    const data = await pdf(dataBuffer);
    const text = data.text;
    
    // Chunk the text into roughly 4000 character segments
    // In a real production system we would use LLMs to extract exact chapters
    const chunkSize = 4000;
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.substring(i, i + chunkSize));
    }
    
    const outDir = path.join(process.cwd(), 'okf-bundle');
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir);
    }
    
    console.log(`Generated ${chunks.length} chunks. Writing OKF files...`);
    
    let indexLinks = "";
    
    for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunks[i];
        const title = `Section ${i + 1}`;
        const fileName = `section_${i + 1}.md`;
        
        const frontmatter = {
            type: 'concept',
            title: title,
            description: `Section ${i + 1} of Class 10th English Book`,
            tags: ['english', 'class-10', 'book-content']
        };
        
        const fileContent = `---\n${yaml.dump(frontmatter)}---\n\n# ${title}\n\n${chunkText}`;
        fs.writeFileSync(path.join(outDir, fileName), fileContent);
        
        indexLinks += `- [${title}](./${fileName})\n`;
    }
    
    // Generate index.md
    const indexFrontmatter = {
        type: 'dataset',
        title: 'Class 10th English Book',
        description: 'Complete contents of the Class 10th English book, segmented for OKF.',
        tags: ['index', 'english', 'class-10']
    };
    const indexContent = `---\n${yaml.dump(indexFrontmatter)}---\n\n# Class 10th English Book Index\n\nThis is the root index of the English book OKF bundle.\n\n## Contents\n\n${indexLinks}`;
    fs.writeFileSync(path.join(outDir, 'index.md'), indexContent);
    
    console.log("OKF generation complete.");
}

extract().catch(console.error);
