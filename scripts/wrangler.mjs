import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
// Keep local logs inside the checkout, including in restricted workspaces.
const child=spawn(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),...process.argv.slice(2)],{stdio:'inherit',env:{...process.env,WRANGLER_LOG_PATH:resolve('.wrangler/logs'),WRANGLER_SEND_METRICS:'false'}});
child.on('exit',code=>process.exit(code??1));
child.on('error',error=>{console.error(error.message);process.exit(1);});
