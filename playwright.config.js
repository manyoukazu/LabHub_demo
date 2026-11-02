import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/browser',workers:1,timeout:30000,use:{channel:'chrome',baseURL:'http://127.0.0.1:8787',viewport:{width:1440,height:1040}},reporter:'list'});
