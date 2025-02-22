import fs from 'fs';

const initialConfig = fs.readFileSync('config.yml.template').toString();
fs.writeFileSync('config.yml', initialConfig);
