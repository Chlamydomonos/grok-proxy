import fs from 'fs';

if (!fs.existsSync('config.yml')) {
    const initialConfig = fs.readFileSync('config.yml.template').toString();
    fs.writeFileSync('config.yml', initialConfig);
}
